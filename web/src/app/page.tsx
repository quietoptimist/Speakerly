"use client";

import { useState, useEffect, useRef } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Transcript, ChatMessage } from "@/components/chat/Transcript";
import { QuickReplies } from "@/components/chat/QuickReplies";
import { IntentGrids } from "@/components/chat/IntentGrids";
import { ResponseGrid, ResponseItem } from "@/components/chat/ResponseGrid";
import { AudioRecorder } from "@/components/chat/AudioRecorder";
import { WordCloud, SuggestedWord } from "@/components/chat/WordCloud";
import { Input } from "@/components/ui/input";

export default function Home() {
  const [transcript, setTranscript] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [activeContexts, setActiveContexts] = useState<string[]>(["📍 Cafe", "🗣️ Barista"]); // Dynamic contexts
  const [grid1, setGrid1] = useState({ x: 2, y: 2 }); // Brevity/Seriousness
  const [grid2, setGrid2] = useState({ x: 2, y: 2 }); // Stance/Understanding
  const [grid3, setGrid3] = useState({ x: 2, y: 2 }); // Time/Urgency
  const [isQuestion, setIsQuestion] = useState(false); // Question/Statement
  const [responses, setResponses] = useState<ResponseItem[]>([]);

  // Word Cloud States
  const [suggestedWords, setSuggestedWords] = useState<SuggestedWord[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [requestedWordCount, setRequestedWordCount] = useState(20);

  const [isLoading, setIsLoading] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false); // Feature requested in PRD
  const [selectedModel, setSelectedModel] = useState("openai");

  const lastHistoryLength = useRef(0);

  // Auto-regenerate if sliders or contexts change (Auto mode only), or ALWAYS if new conversation turn.
  useEffect(() => {
    const isNewTurn = chatHistory.length !== lastHistoryLength.current;
    lastHistoryLength.current = chatHistory.length;

    if (!isManualMode || isNewTurn) {
      const delayDebounceFn = setTimeout(() => {
        generatePredictions(transcript);
      }, 800);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [transcript, grid1, grid2, grid3, isQuestion, isManualMode, activeContexts, selectedWords, requestedWordCount, chatHistory, selectedModel]);

  const handleNewTranscription = (text: string) => {
    setChatHistory(prev => [...prev, { role: "partner", text }]);
    setTranscript(text);
  };

  const generatePredictions = async (currentTranscript: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: currentTranscript,
          chatHistory,
          grid1,
          grid2,
          grid3,
          isQuestion,
          context: activeContexts,
          selectedWords,
          requestedWordCount,
          model: selectedModel
        }),
      });
      const data = await res.json();
      if (data.responses) {
        setResponses(data.responses);
      }
      if (data.words) {
        setSuggestedWords((prevSuggested) => {
          // Ensure previously selected words remain in the list so they can be deselected
          const previousSelectedObjects = prevSuggested.filter(w => selectedWords.includes(w.word));
          const allWords = [...previousSelectedObjects, ...(data.words as SuggestedWord[])];

          // Deduplicate words (case-insensitive) to prevent React key errors
          const uniqueMap = new Map<string, SuggestedWord>();
          allWords.forEach(w => {
            if (w && w.word && !uniqueMap.has(w.word.toLowerCase())) {
              uniqueMap.set(w.word.toLowerCase(), w);
            }
          });

          // Sort words by theme to keep them relatively stable visually
          return Array.from(uniqueMap.values()).sort((a, b) => a.theme.localeCompare(b.theme));
        });
      } else {
        console.warn("API did not return a words array. Payload received:", data);
      }
    } catch (error) {
      console.error("Failed to generate responses", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col h-screen bg-slate-950 text-slate-50 overflow-hidden">
      {/* Tier 1: Top Bar */}
      <TopBar
        isManualMode={isManualMode} setIsManualMode={setIsManualMode}
        activeContexts={activeContexts} setActiveContexts={setActiveContexts}
        onTranscription={handleNewTranscription}
        selectedModel={selectedModel} setSelectedModel={setSelectedModel}
      />

      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden max-w-4xl mx-auto w-full">
        {/* Tier 2: Transcript History */}
        <div className="shrink-0 h-[15%] min-h-[100px]">
          <Transcript
            messages={chatHistory}
            onClear={() => {
              setChatHistory([]);
              setTranscript("");
              setSelectedWords([]);
            }}
          />
        </div>

        {/* Tier 3: Quick Backchannels */}
        <div className="shrink-0">
          <QuickReplies />
        </div>

        {/* Tier 4: Intent & Sentiment Grids */}
        <div className="shrink-0 pt-4 pb-2 border-y border-slate-800/50">
          <IntentGrids
            grid1={grid1} setGrid1={setGrid1}
            grid2={grid2} setGrid2={setGrid2}
            grid3={grid3} setGrid3={setGrid3}
          />
        </div>

        {/* Tier 4.5: Word Cloud */}
        <div className="shrink-0 h-[20%] min-h-[120px]">
          <WordCloud
            words={suggestedWords}
            selectedWords={selectedWords}
            requestedCount={requestedWordCount}
            onCountChange={(delta) => setRequestedWordCount(Math.max(10, Math.min(40, requestedWordCount + delta)))}
            isLoading={isLoading}
            isQuestion={isQuestion}
            setIsQuestion={setIsQuestion}
            onWordToggle={(word) => {
              setSelectedWords(prev =>
                prev.includes(word) ? prev.filter(w => w !== word) : [...prev, word]
              );
            }}
          />
        </div>

        {/* Tier 5: Long-Form Replies (2x2 Grid) */}
        <div className="flex-1 overflow-hidden flex flex-col gap-2">
          {isManualMode && (
            <div className="flex justify-end pr-1">
              <button
                onClick={() => generatePredictions(transcript)}
                className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/30 px-4 py-1.5 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.2)] hover:bg-cyan-500/20 hover:scale-105 active:scale-95 transition-all"
              >
                Generate Now
              </button>
            </div>
          )}
          <ResponseGrid
            responses={responses}
            isLoading={isLoading}
            onResponseSelect={(response) => {
              setChatHistory(prev => [...prev, { role: "user", text: response.body }]);
              setTranscript(""); // Resets to Initiative Mode
              setGrid2({ x: 2, y: 2 });
              setGrid3({ x: 2, y: 2 });
              setSelectedWords([]);
            }}
          />
        </div>
      </div>
    </main>
  );
}



