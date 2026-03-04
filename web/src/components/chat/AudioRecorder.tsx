
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
        <div className="flex items-center gap-3">
            <div className="text-xs text-slate-400 font-mono text-right w-32">
                {isRecording ? (
                    <span className="flex items-center gap-2 text-red-400 justify-end">
                        Listening <span className="animate-pulse h-2 w-2 bg-red-500 rounded-full"></span>
                    </span>
                ) : isProcessing ? (
                    <span className="flex items-center gap-2 text-cyan-400 justify-end">
                        <Loader2 className="h-3 w-3 animate-spin" /> Transcribing
                    </span>
                ) : null}
            </div>

            {!isRecording ? (
                <Button
                    onClick={startRecording}
                    disabled={isProcessing}
                    variant="secondary"
                    size="icon"
                    className="w-14 h-14 rounded-full bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border-2 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all hover:scale-110 active:scale-95"
                >
                    <Mic className="h-7 w-7" />
                </Button>
            ) : (
                <Button
                    onClick={stopRecording}
                    variant="destructive"
                    size="icon"
                    className="w-14 h-14 rounded-full animate-pulse shadow-[0_0_25px_rgba(239,68,68,0.6)] border-2 border-red-400 hover:scale-110 active:scale-95"
                >
                    <Square className="h-6 w-6 fill-current" />
                </Button>
            )}
        </div>
    );
}
