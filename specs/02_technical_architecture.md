# Speakerly: Technical Architecture & Stack

## 1. Web-First Strategy
To optimize for rapid iteration, easy sharing with colleagues (via simple URLs), and testing various API providers without app store review cycles, the MVP will be built as a **Progressive Web App (PWA)**.

*   **Primary Platform:** Mobile Web (Safari on iOS, Chrome on Android)
*   **Why Web?**
    *   No App Store deployments required for testing.
    *   "Installable" to the home screen as a PWA for a native-like feel.
    *   Immediate cross-platform compatibility (works on tablets, phones, and laptops).
    *   Easier to swap out cloud APIs (OpenAI, Google, ElevenLabs) securely on the backend.
*   **Future Path:** Once the core loop and prompt engineering are proven on the web, the codebase can be ported to a native iOS app (e.g., React Native or Swift/SwiftUI) to unlock fully offline, on-device ML capabilities (WhisperKit, Apple Personal Voice).

## 2. Core Tech Stack (MVP)
*   **Frontend Framework:** Next.js (React) - Allows for both static UI and secure server-side API routes in one repo.
*   **Styling:** Tailwind CSS + Radix UI (or shadcn/ui) - For building a highly accessible, fast, and beautiful interface.
*   **Hosting:** Vercel - Provides instant deployments on every GitHub push, making it trivial to share new iterations with colleagues.
*   **Database (User Profiles, History & RAG):** Supabase (PostgreSQL + pgvector) or Firebase - For storing user settings, and serving as the "Long-Term Brain". This requires vector storage to allow semantic search over past conversations, partner profiles, and distilled personality traits.

## 3. Plug-and-Play API Architecture
Since API cost is not an issue for development, but finding the *best* combination of speed and quality is crucial, the architecture will be designed with abstract interfaces for the three core AI layers. This allows us to easily swap providers via environment variables or settings toggles.

### Layer 1: Speech-to-Text (STT) The "Listener"
*   **Requirement:** Must support real-time streaming or very fast chunked audio transcription to minimize latency.
*   **Primary Implementation:** Deepgram API (Currently the fastest and most accurate streaming STT API available).
*   **Secondary/Fallback:** OpenAI Whisper API.

### Layer 2: LLM (The "Brain")
*   **Requirement:** Lightning-fast inference (< 1 second) and excellent context adherence.
*   **Primary Implementation:** GPT-4o mini via OpenAI API (Unbeatable mix of speed, cost, and instruction-following for prompt engineering).
*   **Secondary/Fallback:** Google Gemini 3.0 Flash.

### Layer 3: Text-to-Speech (TTS) The "Voice"
*   **Requirement:** Human-like intonation, minimal latency, and ideally voice-cloning capabilities.
*   **Primary Implementation:** ElevenLabs API (Turbo v2.5 model) - Currently the gold standard for latency and expressive, human-like AI voices. It supports instant voice cloning, which is a massive selling point for AAC users.
*   **Secondary/Fallback:** OpenAI TTS (tts-1 model).

## 4. The Data Flow (The "Core Loop" & "Memory Loop")

### The Core Loop (Real-Time)
1.  **Listen:** The browser's `MediaRecorder` streams audio chunks via WebSockets to the Deepgram API.
2.  **Context Assembly (RAG):** The frontend sends the transcript + active context to a Next.js API. The backend quickly queries the vector database for relevant past summaries (e.g., recent topics discussed with this specific partner).
3.  **Predict:** The API queries the LLM (e.g., GPT-4o mini) with the combined transcript + retrieved memory context to generate 4 JSON-formatted sentence options.
4.  **Display & Speak:** The UI renders the options. User taps one, triggering the TTS API (ElevenLabs) for immediate playback.

### The Memory Loop (Asynchronous)
1.  **Log:** The system silently logs the partner's transcript, the generated options, and the user's final selection.
2.  **Distill:** At regular intervals (or off-peak hours), an LLM background job reads recent logs to extract new preferences, correct past assumptions, and update the user/partner summaries in the vector database.

## 5. Security & Privacy Considerations
*   HIPAA compliance is not a goal for the initial MVP, but all API keys will be securely stored in Vercel environment variables, never exposed to the client.
*   Audio processing streams must not save recordings to the server without explicit opt-in.
