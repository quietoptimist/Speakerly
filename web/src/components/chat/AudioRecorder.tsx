
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';

interface AudioRecorderProps {
    onTranscription: (text: string) => void;
}

export function AudioRecorder({ onTranscription }: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                await processAudio(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access the microphone. Please check permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const processAudio = async (blob: Blob) => {
        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append('file', blob, 'recording.webm');

            const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Transcription failed');

            const data = await response.json();
            if (data.text) {
                onTranscription(data.text);
            }
        } catch (error) {
            console.error("Error sending audio:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex items-center gap-3 w-full bg-slate-900 border border-slate-800 rounded-lg p-2">
            <div className="flex-1 px-3 text-sm text-slate-400 font-mono">
                {isRecording ? (
                    <span className="flex items-center gap-2 text-red-400">
                        <span className="animate-pulse h-2 w-2 bg-red-500 rounded-full"></span>
                        Listening (Tap stop when partner finishes)...
                    </span>
                ) : isProcessing ? (
                    <span className="flex items-center gap-2 text-cyan-400">
                        <Loader2 className="h-4 w-4 animate-spin" /> Transcribing audio...
                    </span>
                ) : (
                    "Tap microphone to record partner speech"
                )}
            </div>

            {!isRecording ? (
                <Button
                    onClick={startRecording}
                    disabled={isProcessing}
                    variant="secondary"
                    size="icon"
                    className="rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                >
                    <Mic className="h-5 w-5" />
                </Button>
            ) : (
                <Button
                    onClick={stopRecording}
                    variant="destructive"
                    size="icon"
                    className="rounded-full animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                >
                    <Square className="h-5 w-5 fill-current" />
                </Button>
            )}
        </div>
    );
}
