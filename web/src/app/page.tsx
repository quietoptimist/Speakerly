"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Volume2, Loader2 } from "lucide-react";
import { speakText } from "@/lib/speech";
import { TopBar } from "@/components/layout/TopBar";
import { Transcript, ChatMessage } from "@/components/chat/Transcript";
import { QuickReplies } from "@/components/chat/QuickReplies";
import { ContextHierarchy, ContextNode, ContextSuggestion } from "@/components/chat/ContextHierarchy";
import { ResponseGrid, ResponseItem } from "@/components/chat/ResponseGrid";
import { AudioRecorder } from "@/components/chat/AudioRecorder";
import { WordCloud, SuggestedWord } from "@/components/chat/WordCloud";
import { Input } from "@/components/ui/input";
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { z } from 'zod';

const responseSchema = z.object({
  statementWords: z.array(z.object({ word: z.string() })).optional(),
  questionWords: z.array(z.object({ word: z.string() })).optional(),
  statementResponses: z.array(z.object({ id: z.number().optional(), body: z.string() })).optional(),
  questionResponses: z.array(z.object({ id: z.number().optional(), body: z.string() })).optional(),
  quickReplies: z.array(z.string()).optional()
});

export default function Home() {
  const router = useRouter();
  const [transcript, setTranscript] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [activeContextPath, setActiveContextPath] = useState<ContextNode[]>([]);
  const [contextSuggestions, setContextSuggestions] = useState<ContextSuggestion[]>([]);
  const [isQuestion, setIsQuestion] = useState(false); // Question/Statement
  const [statementResponses, setStatementResponses] = useState<ResponseItem[]>([]);
  const [questionResponses, setQuestionResponses] = useState<ResponseItem[]>([]);

  // Interlocutors State
  const [interlocutors, setInterlocutors] = useState<any[]>([]);
  const [selectedInterlocutorId, setSelectedInterlocutorId] = useState<string | null>(null);

  // Fetch interlocutors on mount
  useEffect(() => {
    fetch('/api/interlocutors').then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        setInterlocutors(data);
        if (data.length > 0) {
            setSelectedInterlocutorId(data[0].id); // Select most recent by default
        }
      }
    }).catch(console.error);
  }, []);

  // Word Cloud States
  const [statementWords, setStatementWords] = useState<SuggestedWord[]>([]);
  const [questionWords, setQuestionWords] = useState<SuggestedWord[]>([]);
  const [dynamicQuickReplies, setDynamicQuickReplies] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [requestedWordCount, setRequestedWordCount] = useState(10);

  const [isLoading, setIsLoading] = useState(false);
  const [isWordsLoading, setIsWordsLoading] = useState(false);
  const [isManualMode, setIsManualMode] = useState(true); // Default to manual mode requested by user
  const [selectedModel, setSelectedModel] = useState("openai");
  const [apiError, setApiError] = useState<string | null>(null);

  // Reply draft state
  const [replyDraft, setReplyDraft] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Streaming AI hook
  const { submit: submitPrediction, isLoading: isPredictLoading, object: predictionObject } = useObject({
    api: "/api/predict",
    schema: responseSchema,
    onError: (err: Error) => {
      console.error("Prediction stream error:", err);
      setApiError("Failed to fetch predictions from AI provider.");
      setIsLoading(false);
    },
    onFinish: () => {
      setIsLoading(false);
    }
  });

  // Sync streamed object into local UI state incrementally
  useEffect(() => {
    if (!predictionObject) return;

    if (predictionObject.statementResponses) {
      setStatementResponses(predictionObject.statementResponses as ResponseItem[]);
    }
    if (predictionObject.questionResponses) {
      setQuestionResponses(predictionObject.questionResponses as ResponseItem[]);
    }
    if (predictionObject.quickReplies) {
      setDynamicQuickReplies(predictionObject.quickReplies as string[]);
    }

    const mergeWords = (prevSuggested: SuggestedWord[], newWords: SuggestedWord[]) => {
      if (!newWords || newWords.length === 0) return prevSuggested;
      const previousSelectedObjects = prevSuggested.filter(w => selectedWords.includes(w.word));
      const allWords = [...previousSelectedObjects, ...newWords];

      const uniqueMap = new Map<string, SuggestedWord>();
      allWords.forEach(w => {
        if (w && w.word && !uniqueMap.has(w.word.toLowerCase())) {
          uniqueMap.set(w.word.toLowerCase(), w);
        }
      });

      return Array.from(uniqueMap.values());
    };

    if (predictionObject.statementWords) {
      setStatementWords(prev => mergeWords(prev, predictionObject.statementWords as SuggestedWord[]));
    }
    if (predictionObject.questionWords) {
      setQuestionWords(prev => mergeWords(prev, predictionObject.questionWords as SuggestedWord[]));
    }
  }, [predictionObject, selectedWords]);
  // Log each message individually to conversation_log + usage_events (fire-and-forget)
  const logUsageEvent = useCallback((role: string, phrase: string, phraseType: string = 'statement') => {
    const contextPath = activeContextPath.map(n => n.name);
    fetch('/api/conversation-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: role === 'partner' ? 'partner' : 'user', text: phrase }],
        context_path: contextPath,
        interlocutor_id: selectedInterlocutorId,
        usage_event: {
          role,
          context_path: contextPath,
          selected_topics: selectedWords,
          phrase_spoken: phrase,
          phrase_type: phraseType,
          interlocutor_id: selectedInterlocutorId
        }
      })
    }).catch(() => {}); // Non-blocking
  }, [activeContextPath, selectedWords, selectedInterlocutorId]);

  // Speak text via browser TTS, add to chat, log, clear draft
  const speakReply = (text: string) => {
    setChatHistory(prev => [...prev, { role: 'user', text }]);
    logUsageEvent('user', text, text.endsWith('?') ? 'question' : 'statement');
    setReplyDraft('');
    setTranscript('');
    setSelectedWords([]);
    
    setIsSpeaking(true);
    speakText(
      text,
      undefined,
      () => setIsSpeaking(false)
    );
  };

  // Auto-regenerate if sliders or contexts change (Auto mode only).
  // In Manual mode, predictions only fire when the user clicks "Generate Now".
  useEffect(() => {
    if (!isManualMode) {
      const delayDebounceFn = setTimeout(() => {
        generatePredictions(transcript, selectedWords);
      }, 1000);
      return () => clearTimeout(delayDebounceFn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, isManualMode, activeContextPath, contextSuggestions, selectedWords, requestedWordCount, chatHistory, selectedModel]);
  // Note: removed isQuestion from dependencies to prevent re-fetching on toggle (instant local switch)

  // When context path changes, clear selected words so the new context's suggestions take priority
  useEffect(() => {
    setSelectedWords([]);
  }, [activeContextPath]);

  // Handle instant bypass for pre-defined context suggestions outside of manual generation constraints
  useEffect(() => {
    const isInitiativeMode = transcript.trim() === "";
    
    // Only apply if user hasn't typed anything and hasn't manually selected words
    if (isInitiativeMode && selectedWords.length === 0) {
      if (contextSuggestions.length > 0) {
        setIsLoading(false);
        setApiError(null);
        
        const words = contextSuggestions.filter(s => s.type === 'keyword').map(s => ({ 
            word: s.text, 
            theme: "Context",
            relatedWords: [] 
        }));
        
        const sentences = contextSuggestions.filter(s => s.type === 'sentence').map((s, i) => ({
            id: Date.now() + i,
            body: s.text,
        }));
        
        const qResponses = sentences.filter(s => s.body.endsWith("?"));
        const sResponses = sentences.filter(s => !s.body.endsWith("?"));

        setStatementWords(words); 
        setQuestionWords(words); 
        setStatementResponses(sResponses);
        setQuestionResponses(qResponses);
        setDynamicQuickReplies(["Yes", "No", "Please", "Thanks", "Sorry"]);
      } else if (activeContextPath.length > 0) {
        // If they clicked a context but it has no suggestions, clear the UI
        setStatementWords([]); 
        setQuestionWords([]); 
        setStatementResponses([]);
        setQuestionResponses([]);
      }
    }
  }, [contextSuggestions, transcript, selectedWords, activeContextPath]);

  const handleNewTranscription = (text: string) => {
    setChatHistory(prev => [...prev, { role: "partner", text }]);
    setTranscript(text);
    logUsageEvent('partner', text, text.endsWith('?') ? 'question' : 'statement');
  };

  const generatePredictions = async (currentTranscript: string, currentSelectedWords: string[]) => {
    if (isManualMode && !currentTranscript && currentSelectedWords.length === 0 && activeContextPath.length === 0 && !selectedInterlocutorId) return;

    setIsLoading(true);
    setApiError(null);

    // Clear old responses so the stream visually fills in the empty slots
    setStatementResponses([]);
    setQuestionResponses([]);
    setDynamicQuickReplies([]);

    submitPrediction({
      transcript: currentTranscript,
      chatHistory,
      isQuestion,
      context: activeContextPath.map(n => n.name),
      selectedWords: currentSelectedWords,
      requestedWordCount,
      model: selectedModel,
      interlocutor_id: selectedInterlocutorId
    });
  };

  const fetchFastWords = async (currentTranscript: string, currentSelectedWords: string[]) => {
    setIsWordsLoading(true);
    try {
      const res = await fetch("/api/predict-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: currentTranscript,
          chatHistory,
          isQuestion,
          context: activeContextPath.map(n => n.name),
          selectedWords: currentSelectedWords,
          requestedWordCount,
          model: selectedModel,
          interlocutor_id: selectedInterlocutorId
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch quick words from AI provider.");
      }
      setApiError(null);

      const mergeWords = (prevSuggested: SuggestedWord[], newWords: SuggestedWord[]) => {
        if (!newWords || newWords.length === 0) return prevSuggested;
        const previousSelectedObjects = prevSuggested.filter(w => currentSelectedWords.includes(w.word));
        const allWords = [...previousSelectedObjects, ...newWords];

        const uniqueMap = new Map<string, SuggestedWord>();
        allWords.forEach(w => {
          if (w && w.word && !uniqueMap.has(w.word.toLowerCase())) {
            uniqueMap.set(w.word.toLowerCase(), w);
          }
        });

        return Array.from(uniqueMap.values());
      };

      if (data.statementWords) {
        setStatementWords(prev => mergeWords(prev, data.statementWords));
      }
      if (data.questionWords) {
        setQuestionWords(prev => mergeWords(prev, data.questionWords));
      }
    } catch (error: any) {
      console.error("Failed to fetch fast words", error);
      setApiError(error.message || "An unknown network error occurred.");
    } finally {
      setIsWordsLoading(false);
    }
  };

  return (
    <main className="flex flex-col h-screen bg-slate-950 text-slate-50 overflow-hidden">
      {/* Tier 1: Top Bar */}
      <TopBar
        isManualMode={isManualMode} setIsManualMode={setIsManualMode}
        onTranscription={handleNewTranscription}
        selectedModel={selectedModel} setSelectedModel={setSelectedModel}
      />

      <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden max-w-4xl mx-auto w-full">
        {/* Interlocutor selector */}
        <div className="shrink-0">
          <select
            value={selectedInterlocutorId || ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'ADD_NEW') {
                router.push('/profile/interlocutors');
              } else {
                setSelectedInterlocutorId(val || null);
              }
            }}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          >
            <option value="">Talking to: Anyone (Unspecified)</option>
            <option value="ADD_NEW">+ Add New Person...</option>
            <optgroup label="My People">
              {interlocutors.map(person => (
                <option key={person.id} value={person.id}>
                  {person.name} {person.relationship ? `(${person.relationship})` : ''}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Transcript History */}
        <div className="shrink-0 h-[12%] min-h-[90px]">
          <Transcript
            messages={chatHistory}
            onClear={() => {
              setChatHistory([]);
              setTranscript("");
              setSelectedWords([]);
            }}
          />
        </div>

        {/* Reply Input Box */}
        <div className="shrink-0 flex gap-2 items-center">
          <input
            type="text"
            value={replyDraft}
            onChange={(e) => setReplyDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && replyDraft.trim()) speakReply(replyDraft.trim()); }}
            placeholder="Type or click a suggestion to build your reply..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-full px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
          <button
            onClick={() => { if (replyDraft.trim()) speakReply(replyDraft.trim()); }}
            disabled={!replyDraft.trim() || isSpeaking}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all active:scale-95"
          >
            {isSpeaking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
            Speak
          </button>
        </div>

        {/* Situational Context */}
        <div className="shrink-0 border-t border-slate-800/50 pt-3">
          <ContextHierarchy
            activeContextPath={activeContextPath}
            setActiveContextPath={setActiveContextPath}
            onSuggestionsChange={setContextSuggestions}
          />
        </div>

        {/* Word Cloud (Split View) */}
        <div className="shrink-0 h-[15%] min-h-[190px] pt-1 border-t border-slate-800/50">
          <WordCloud
            statementWords={statementWords}
            questionWords={questionWords}
            selectedWords={selectedWords}
            requestedCount={requestedWordCount}
            onCountChange={(delta) => setRequestedWordCount(Math.max(10, Math.min(40, requestedWordCount + delta)))}
            isLoading={isLoading}
            isManualMode={isManualMode}
            isWordsLoading={isWordsLoading}
            onUpdateWords={() => fetchFastWords(transcript, selectedWords)}
            onWordToggle={(word) => {
              const newWords = selectedWords.includes(word)
                ? selectedWords.filter(w => w !== word)
                : [...selectedWords, word];
              setSelectedWords(newWords);

              const isQ = questionWords.some(w => w.word === word);
              if (isQ && !isQuestion) setIsQuestion(true);
              if (!isQ && isQuestion && statementWords.some(w => w.word === word)) setIsQuestion(false);

              if (!isManualMode) {
                fetchFastWords(transcript, newWords);
              }
            }}
          />
        </div>

        {/* Quick Backchannels */}
        <div className="shrink-0 pb-1">
          <QuickReplies
            dynamicReplies={dynamicQuickReplies}
            onReplySelect={(text) => {
              setReplyDraft(prev => prev ? `${prev} ${text}` : text);
            }}
            onReplySpeak={(text) => {
              speakReply(text);
            }}
          />
        </div>

        {/* AI Responses — two-column (statements | questions) */}
        <div className="flex-1 overflow-hidden flex flex-col gap-1">
          {isManualMode && (
            <div className="flex justify-end pr-1 mb-1">
              <button
                onClick={() => generatePredictions(transcript, selectedWords)}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/30 px-4 py-1.5 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.1)] hover:bg-cyan-500/20 hover:scale-105 active:scale-95 transition-all h-7"
              >
                Generate Now
              </button>
            </div>
          )}
          <ResponseGrid
            statementResponses={statementResponses}
            questionResponses={questionResponses}
            isLoading={isLoading}
            onResponseSelect={(response) => {
              setReplyDraft(prev => prev ? `${prev} ${response.body}` : response.body);
            }}
            onResponseSpeak={(response) => {
              speakReply(response.body);
            }}
          />
        </div>
      </div>

      {/* Footer / Error Banner */}
      {apiError && (
        <div className="bg-red-500/20 border-t border-red-500/50 p-2 text-red-200 text-xs text-center flex items-center justify-center gap-2 mt-auto shrink-0 z-50">
          <span className="font-semibold">AI Error:</span> {apiError}
        </div>
      )}
    </main>
  );
}



