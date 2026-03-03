"use client";

import { useState, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Transcript } from "@/components/chat/Transcript";
import { QuickReplies } from "@/components/chat/QuickReplies";
import { IntentGrids } from "@/components/chat/IntentGrids";
import { ResponseGrid, ResponseItem } from "@/components/chat/ResponseGrid";
import { AudioRecorder } from "@/components/chat/AudioRecorder";
import { Input } from "@/components/ui/input";

export default function Home() {
  const [transcript, setTranscript] = useState("");
  const [grid1, setGrid1] = useState({ x: 2, y: 2 }); // Brevity/Seriousness
  const [grid2, setGrid2] = useState({ x: 2, y: 2 }); // Stance/Understanding
  const [grid3, setGrid3] = useState({ x: 2, y: 2 }); // Time/Urgency
  const [isQuestion, setIsQuestion] = useState(false); // Question/Statement
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false); // Feature requested in PRD

  // Auto-regenerate if sliders move AND we have a valid transcript AND not in manual mode
  useEffect(() => {
    if (!isManualMode && transcript.length > 3) {
      const delayDebounceFn = setTimeout(() => {
        generatePredictions(transcript);
      }, 800);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [grid1, grid2, grid3, isQuestion, isManualMode]);

  const handleNewTranscription = (text: string) => {
    setTranscript(text);
    generatePredictions(text);
  };

  const generatePredictions = async (currentTranscript: string) => {
    if (!currentTranscript) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: currentTranscript,
          grid1,
          grid2,
          grid3,
          isQuestion,
          context: ["Cafe", "Barista"]
        }),
      });
      const data = await res.json();
      if (data.responses) {
        setResponses(data.responses);
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
      <TopBar isManualMode={isManualMode} setIsManualMode={setIsManualMode} />

      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden max-w-4xl mx-auto w-full">
        {/* Tier 2: Transcript */}
        <div className="shrink-0 h-[15%] min-h-[100px]">
          <Transcript text={transcript} />
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
            isQuestion={isQuestion} setIsQuestion={setIsQuestion}
          />
        </div>

        {/* Tier 5: Long-Form Replies (2x2 Grid) */}
        <div className="flex-1 overflow-hidden">
          <ResponseGrid
            responses={responses}
            isLoading={isLoading}
            onResponseSelect={() => {
              setGrid2({ x: 2, y: 2 });
              setGrid3({ x: 2, y: 2 });
            }}
          />
        </div>

        {/* Real STT Input Area */}
        <div className="shrink-0 pt-2 flex flex-col gap-2">
          <div className="flex justify-between items-end">
            <p className="text-xs text-slate-500">Audio Input</p>
            {isManualMode && (
              <button
                onClick={() => generatePredictions(transcript)}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-500/10 px-2 py-1 rounded"
              >
                Generate Now
              </button>
            )}
          </div>
          <AudioRecorder onTranscription={handleNewTranscription} />

          {/* Keep debug input for dev testing without breaking microphone */}
          <div className="opacity-30 hover:opacity-100 transition-opacity flex items-center gap-2 mt-4">
            <span className="text-[10px] text-slate-600 whitespace-nowrap">Keyboard Debug:</span>
            <Input
              value={transcript}
              onChange={(e) => {
                setTranscript(e.target.value);
                if (!isManualMode && e.target.value.length > 5) {
                  // Lazy debounce for debug typing
                  const delay = setTimeout(() => generatePredictions(e.target.value), 1000);
                  return () => clearTimeout(delay);
                }
              }}
              className="bg-slate-900 border-slate-800 text-slate-500 h-6 text-xs"
              placeholder="Type to bypass mic..."
            />
          </div>
        </div>
      </div>
    </main>
  );
}



