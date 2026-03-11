"use client";

// Streaming API-based TTS
// Bypasses the highly unreliable local browser Web Speech API in favor of a fast-streaming OpenAI proxy.

let currentAudio: HTMLAudioElement | null = null;

export function cancelSpeech() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio.src = ''; // Force unload
    currentAudio = null;
  }
}

export function speakText(text: string, onStart?: () => void, onEnd?: () => void) {
  if (!text) {
    onStart?.();
    onEnd?.();
    return;
  }

  cancelSpeech();

  try {
    const url = `/api/speak?text=${encodeURIComponent(text)}`;
    currentAudio = new Audio(url);

    currentAudio.onplay = () => {
      if (onStart) onStart();
    };

    currentAudio.onended = () => {
      if (onEnd) onEnd();
      currentAudio = null;
    };

    currentAudio.onerror = (e) => {
      console.error("Audio playback error:", e);
      if (onEnd) onEnd();
      currentAudio = null;
    };

    // The play() method returns a Promise which can reject if auto-play is blocked.
    currentAudio.play().catch(e => {
      console.error("Audio play blocked:", e);
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
