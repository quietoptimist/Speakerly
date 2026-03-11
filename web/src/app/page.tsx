"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Transcript, ChatMessage } from "@/components/chat/Transcript";
import { QuickReplies } from "@/components/chat/QuickReplies";
import { ContextHierarchy, ContextNode, ContextSuggestion } from "@/components/chat/ContextHierarchy";
import { ResponseGrid, ResponseItem } from "@/components/chat/ResponseGrid";
import { AudioRecorder } from "@/components/chat/AudioRecorder";
import { WordCloud, SuggestedWord } from "@/components/chat/WordCloud";
import { Input } from "@/components/ui/input";

export default function Home() {
  const [transcript, setTranscript] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [activeContextPath, setActiveContextPath] = useState<ContextNode[]>([]);
  const [contextSuggestions, setContextSuggestions] = useState<ContextSuggestion[]>([]);
  const [isQuestion, setIsQuestion] = useState(false); // Question/Statement
  const [statementResponses, setStatementResponses] = useState<ResponseItem[]>([]);
  const [questionResponses, setQuestionResponses] = useState<ResponseItem[]>([]);

  // Word Cloud States
  const [statementWords, setStatementWords] = useState<SuggestedWord[]>([]);
  const [questionWords, setQuestionWords] = useState<SuggestedWord[]>([]);
  const [dynamicQuickReplies, setDynamicQuickReplies] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [requestedWordCount, setRequestedWordCount] = useState(20);

  const [isLoading, setIsLoading] = useState(false);
  const [isWordsLoading, setIsWordsLoading] = useState(false);
  const [isManualMode, setIsManualMode] = useState(true); // Default to manual mode requested by user
  const [selectedModel, setSelectedModel] = useState("openai");
  const [apiError, setApiError] = useState<string | null>(null);

  const lastHistoryLength = useRef(0);

  // Log a usage event and conversation snapshot to the backend (fire-and-forget)
  const logUsageEvent = useCallback((role: string, phrase: string, phraseType: string = 'statement') => {
    const contextPath = activeContextPath.map(n => n.name);
    const currentMessages = [...chatHistory, { role: role === 'partner' ? 'partner' : 'user', text: phrase }];
    fetch('/api/conversation-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: currentMessages,
        context_path: contextPath,
        usage_event: {
          role,
          context_path: contextPath,
          selected_topics: selectedWords,
          phrase_spoken: phrase,
          phrase_type: phraseType
        }
      })
    }).catch(() => {}); // Non-blocking
  }, [activeContextPath, selectedWords, chatHistory]);

  // Archive conversation on session end (page unload)
  useEffect(() => {
    const handleUnload = () => {
      if (chatHistory.length > 0) {
        const contextPath = activeContextPath.map(n => n.name);
        const blob = new Blob([JSON.stringify({
          messages: chatHistory,
          context_path: contextPath
        })], { type: 'application/json' });
        navigator.sendBeacon('/api/conversation-log', blob);
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [chatHistory, activeContextPath]);

  // Auto-regenerate if sliders or contexts change (Auto mode only), or ALWAYS if new conversation turn.
  useEffect(() => {
    const isNewTurn = chatHistory.length !== lastHistoryLength.current;
    lastHistoryLength.current = chatHistory.length;

    if (!isManualMode || isNewTurn) {
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
        
        const sentences = contextSuggestions.filter(s => s.type === 'sentence').map((s, i) => {
            const isQ = s.text.endsWith("?");
            return {
                id: Date.now() + i,
                title: s.text.length > 30 ? s.text.substring(0, 30) + "..." : s.text,
                body: s.text,
                color: (isQ ? "cyan" : "emerald") as any
            };
        });
        
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
    if (isManualMode && !currentTranscript && currentSelectedWords.length === 0 && activeContextPath.length === 0) return;

    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: currentTranscript,
          chatHistory,
          isQuestion,
          context: activeContextPath.map(n => n.name),
          selectedWords,
          requestedWordCount,
          model: selectedModel
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch predictions from AI provider.");
      }
      setApiError(null); // Clear previous errors on success

      if (data.statementResponses) {
        setStatementResponses(data.statementResponses);
      }
      if (data.questionResponses) {
        setQuestionResponses(data.questionResponses);
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

        return Array.from(uniqueMap.values()).sort((a, b) => a.theme.localeCompare(b.theme));
      };

      if (data.statementWords) {
        setStatementWords(prev => mergeWords(prev, data.statementWords));
      }
      if (data.questionWords) {
        setQuestionWords(prev => mergeWords(prev, data.questionWords));
      }
      if (data.quickReplies) {
        setDynamicQuickReplies(data.quickReplies);
      }
    } catch (error: any) {
      console.error("Failed to generate responses", error);
      setApiError(error.message || "An unknown network error occurred.");
    } finally {
      setIsLoading(false);
    }
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
          model: selectedModel
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

        return Array.from(uniqueMap.values()).sort((a, b) => a.theme.localeCompare(b.theme));
      };

      if (data.words) {
        if (isQuestion) setQuestionWords(prev => mergeWords(prev, data.words));
        else setStatementWords(prev => mergeWords(prev, data.words));
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

      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden max-w-4xl mx-auto w-full">
        {/* Tier 1.5: Context Hierarchy */}
        <div className="shrink-0">
          <ContextHierarchy 
             activeContextPath={activeContextPath}
             setActiveContextPath={setActiveContextPath}
             onSuggestionsChange={setContextSuggestions}
          />
        </div>

        {/* Tier 2: Transcript History */}
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

        {/* Tier 4.5: Word Cloud */}
        <div className="shrink-0 h-[15%] min-h-[110px] pt-2 border-t border-slate-800/50">
          <WordCloud
            words={isQuestion ? questionWords : statementWords}
            selectedWords={selectedWords}
            requestedCount={requestedWordCount}
            onCountChange={(delta) => setRequestedWordCount(Math.max(10, Math.min(40, requestedWordCount + delta)))}
            isLoading={isLoading}
            isQuestion={isQuestion}
            setIsQuestion={setIsQuestion}
            isManualMode={isManualMode}
            isWordsLoading={isWordsLoading}
            onUpdateWords={() => fetchFastWords(transcript, selectedWords)}
            onWordToggle={(word) => {
              const newWords = selectedWords.includes(word)
                ? selectedWords.filter(w => w !== word)
                : [...selectedWords, word];
              setSelectedWords(newWords);

              if (!isManualMode) {
                // Instantly fetch new words when clicked in Auto Mode
                fetchFastWords(transcript, newWords);
              }
            }}
          />
        </div>

        {/* Tier 3: Quick Backchannels */}
        <div className="shrink-0 pt-2 pb-2">
          <QuickReplies
            dynamicReplies={dynamicQuickReplies}
            onReplySelect={(text) => {
              setChatHistory(prev => [...prev, { role: "user", text }]);
              logUsageEvent('user', text, 'statement');
            }}
          />
        </div>

        {/* Tier 5: Long-Form Replies (2x2 Grid) */}
        <div className="flex-1 overflow-hidden flex flex-col gap-2">
          {isManualMode && (
            <div className="flex justify-end pr-1">
              <button
                onClick={() => generatePredictions(transcript, selectedWords)}
                className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/30 px-4 py-1.5 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.2)] hover:bg-cyan-500/20 hover:scale-105 active:scale-95 transition-all"
              >
                Generate Now
              </button>
            </div>
          )}
          <ResponseGrid
            responses={isQuestion ? questionResponses : statementResponses}
            isLoading={isLoading}
            onResponseSelect={(response) => {
              setChatHistory(prev => [...prev, { role: "user", text: response.body }]);
              logUsageEvent('user', response.body, response.body.endsWith('?') ? 'question' : 'statement');
              setTranscript(""); // Resets to Initiative Mode
              setSelectedWords([]);
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



