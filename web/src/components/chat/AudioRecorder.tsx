import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';

interface AudioRecorderProps {
    onTranscription: (text: string) => void;
}

export function AudioRecorder({ onTranscription }: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const samplesRef = useRef<Float32Array[]>([]);
    const sampleRateRef = useRef<number>(44100);

    const startRecording = async () => {
        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                alert("Microphone access is not available. Make sure the page is served over HTTPS or localhost.");
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Use ScriptProcessorNode to capture raw PCM samples directly.
            // This completely bypasses MediaRecorder and its mp4 fragmentation behaviour in Safari,
            // where each speech burst (separated by a pause) is emitted as an independent mp4 file
            // — making clean concatenation impossible. Raw PCM has no such issue.
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioContext;
            sampleRateRef.current = audioContext.sampleRate;

            const source = audioContext.createMediaStreamSource(stream);
            sourceRef.current = source;

            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            samplesRef.current = [];

            processor.onaudioprocess = (e) => {
                // Capture a copy of the mono input channel
                const input = e.inputBuffer.getChannelData(0);
                samplesRef.current.push(new Float32Array(input));
            };

            source.connect(processor);
            // Connect to destination to keep the audio graph running (required in some browsers)
            processor.connect(audioContext.destination);

            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access the microphone. Please check permissions.");
        }
    };

    const stopRecording = () => {
        if (!isRecording) return;

        sourceRef.current?.disconnect();
        processorRef.current?.disconnect();
        audioContextRef.current?.close();
        streamRef.current?.getTracks().forEach(t => t.stop());

        setIsRecording(false);

        const samples = samplesRef.current;
        if (samples.length > 0) {
            processAudio(encodeWav(samples, sampleRateRef.current));
        }
    };

    // Encode captured PCM chunks directly to a 16-bit mono WAV blob
    const encodeWav = (chunks: Float32Array[], sampleRate: number): Blob => {
        const totalSamples = chunks.reduce((n, c) => n + c.length, 0);
        const buf = new ArrayBuffer(44 + totalSamples * 2);
        const view = new DataView(buf);

        const str = (offset: number, s: string) => {
            for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
        };

        str(0, 'RIFF');
        view.setUint32(4, 36 + totalSamples * 2, true);
        str(8, 'WAVE');
        str(12, 'fmt ');
        view.setUint32(16, 16, true);           // chunk size
        view.setUint16(20, 1, true);            // PCM
        view.setUint16(22, 1, true);            // mono
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true); // byte rate
        view.setUint16(32, 2, true);            // block align
        view.setUint16(34, 16, true);           // bits per sample
        str(36, 'data');
        view.setUint32(40, totalSamples * 2, true);

        let offset = 44;
        for (const chunk of chunks) {
            for (let i = 0; i < chunk.length; i++) {
                const s = Math.max(-1, Math.min(1, chunk[i]));
                view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
                offset += 2;
            }
        }

        return new Blob([buf], { type: 'audio/wav' });
    };

    const processAudio = async (wavBlob: Blob) => {
        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append('file', wavBlob, 'recording.wav');

            const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Transcription failed');
            }

            const data = await response.json();
            if (data.text) {
                onTranscription(data.text);
            }
        } catch (error) {
            console.error("Transcription error:", error);
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
