# Speakerly: Product Requirements Document (PRD)

## 1. Vision & Purpose
**Speakerly** is an AI-powered conversational assistant for individuals who have lost their ability to speak. Current Augmentative and Alternative Communication (AAC) apps force users to construct sentences word-by-word, removing the fluidity and natural pacing of human conversation.

**The Speakerly approach:** Shift the burden from the user to the AI. Speakerly listens to the conversation, considers the surrounding context (location, time, relationship to conversation partner), and uses a personalized AI model to predict what the user wants to say next, offering rich, complete sentences to select with a single tap.

## 2. Target Audience
*   **Primary:** Adults and teenagers with speech impairments (e.g., ALS, Cerebral Palsy, Stroke recovery, Parkinson's) who have reliable motor control (can tap a tablet/phone) and want to engage in fast, natural conversations.
*   **Secondary:** Caregivers, family members, and friends who want to communicate more fluidly with their loved ones.

## 3. Product Principles
1.  **Speed over precision:** It is better to offer 5 fast, contextually accurate sentence options than force the user to perfectly type a custom sentence.
2.  **Personality matters:** The app must capture the user's humor, tone, and relationship-specific communication styles.
3.  **Context is king:** The UI should dynamically change based on whether the user is at a doctor's appointment, ordering coffee, or bantering with a sibling. Longer term use google maps information, or calendar info (with permissions) to provide context with minimal friction.
4.  **Learn from user:** The app should learn the user's communication style and preferences over time and adjust its suggestions accordingly. Log options and what was selected, and distill at regular intervals to update the user's profile.

## 4. MVP Features (Web-First Prototype)

### A. Core Conversational Loop
*   **Always-Listening STT:** The web app continuously transcribes what the other person is saying.
*   **Smart Predictions:** An LLM predicts 3–5 full-sentence responses based on the transcript, recent history, and context.
*   **One-Tap TTS:** The user taps a prediction, and the browser speaks it aloud immediately.

### B. Initiative Mode & Smart Inputs
*   **Conversation Starters:** When no one is speaking, the app displays context-aware conversation starters to allow the user to initiate interactions (e.g., "Good morning," "I'm here for my appointment").
*   **Smart Contextual Inputs:** When the incoming transcript asks for specific data (numbers, dates, names from a known list), the UI dynamically swaps the sentence options for large, native-style input components (e.g., a number dial, a date picker, or a list of favorite restaurants) to avoid manual typing.

### C. Context & Personality Engine
*   **"Who am I talking to?" Selector:** Quick toggle to set the conversation partner (e.g., Doctor, Wife, Stranger, Barista) to adjust the LLM's tone.
*   **Location/Mode Selector:** Quick toggle for context (e.g., Home, Hospital, Cafe, Urgent).
*   **Personality Slider:** Ability to adjust tone on the fly (e.g., Serious <--> Sarcastic/Funny).

### D. The "Escape Hatch" (Manual Entry)
*   **Quick Type:** A sleek keyboard interface for when the AI guesses wrong.
*   **Live Completion:** As the user types, the AI instantly attempts to finish the sentence (like Google Smart Compose, but for speech).

### D. Setup & Onboarding
*   **Initial Interview:** A conversational web form where the user (or caregiver) inputs basic details: name, personality traits, key relationships, common needs.

## 5. Non-Goals for MVP
*   Eye-tracking or switch control access (focus on touch first).
*   On-device inference (use cloud APIs for the web MVP to maximize speed of development).
*   Perfect voice cloning (start with high-quality generic TTS, integrate Apple Personal Voice/ElevenLabs later).

## 6. Success Metrics for Prototype Phase
*   **Time-to-Response:** How long does it take a user to select and speak a reply? (Target: < 3 seconds).
*   **Prediction Accuracy:** How often does the user select an AI-generated option vs. resorting to manual typing? (Target: > 60%).
