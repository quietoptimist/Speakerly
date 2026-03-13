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
    // Keep a local ref so event handlers still see the element after currentAudio is nulled by cancelSpeech()
    const audio = new Audio(url);
    currentAudio = audio;

    audio.onplay = () => {
      if (onStart) onStart();
    };

    audio.onended = () => {
      if (onEnd) onEnd();
      currentAudio = null;
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
