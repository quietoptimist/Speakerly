"use client";

// Streaming API-based TTS
// Bypasses the highly unreliable local browser Web Speech API in favor of a fast-streaming OpenAI proxy.

let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;

export function cancelSpeech() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

export async function speakText(text: string, onStart?: () => void, onEnd?: () => void) {
  if (!text) {
    onStart?.();
    onEnd?.();
    return;
  }

  cancelSpeech();

  try {
    // POST to avoid URL length limits that truncate long sentences
    const response = await fetch('/api/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      throw new Error(`Speak API error: ${response.status}`);
    }

    const audioBlob = await response.blob();
    const objectUrl = URL.createObjectURL(audioBlob);
    currentObjectUrl = objectUrl;

    const audio = new Audio(objectUrl);
    currentAudio = audio;

    audio.onplay = () => {
      if (onStart) onStart();
    };

    audio.onended = () => {
      if (onEnd) onEnd();
      URL.revokeObjectURL(objectUrl);
      currentAudio = null;
      currentObjectUrl = null;
    };

    audio.onerror = () => {
      // Code 1 = MEDIA_ERR_ABORTED: fired when cancelSpeech() sets src='' — not a real error
      if (audio.error?.code !== MediaError.MEDIA_ERR_ABORTED) {
        console.error("Audio playback error:", audio.error);
      }
      if (onEnd) onEnd();
      currentAudio = null;
    };

    // play() rejects with AbortError when interrupted by cancelSpeech() — not a real error
    audio.play().catch(e => {
      if (e.name !== 'AbortError') {
        console.error("Audio play blocked:", e);
      }
      if (onEnd) onEnd();
      currentAudio = null;
    });

  } catch (err) {
    console.error("Failed to setup audio:", err);
    if (onEnd) onEnd();
  }
}

export function isSpeechSupported(): boolean {
  return typeof Audio !== 'undefined';
}
