# Speakerly: Advanced Interaction Concepts

Traditional AAC requires the user to wait until their partner finishes speaking, then begin the laborious cognitive and physical process of assembling a reply. This breaks the natural rhythm of human conversation. 

Neuroscience shows that the brain begins formulating a response *while* listening. We form high-level intentions (e.g., "I agree," "That's funny," "I have a question about X") midway through the incoming sentence, before we figure out the exact words. 

**Speakerly's advanced UI should mimic this cognitive process.**

---

## Concept 1: Intent-First Selection (The "Reaction" Layer)

Instead of immediately jumping from the partner's speech to 4 fully formed sentences, we break the prediction into a two-step micro-interaction.

### How it works:
1.  **Continuous Streaming:** The app streams the partner's speech to the LLM in real-time.
2.  **Intent Extraction:** Before the partner even finishes speaking, the LLM analyzes the trajectory of their sentence and surfaces high-level "Reaction Intents" to the user.
3.  **The UI:** A set of large sliders or color-coded buttons appears on screen immediately.
    *   *Agree (Green) <---> Disagree (Red)*
    *   *Sympathize (Blue) <---> Joke/Sarcastic (Yellow)*
    *   *Quick/Short <---> Detailed/Long*
4.  **User Action:** While the partner is still talking, the user taps "Agree" and "Joke". 
5.  **Evolution:** Armed with this strong intention signal, the LLM refines its generation and instantly presents 3 perfectly tailored, funny, agreeing sentences.

**Why this is powerful:** The user is actively participating in the conversation *while* listening, reducing the "dead air" pause at the speaking turn. It saves the LLM from generating 2 "Yes" options and 2 "No" options — instead, it generates 4 nuanced "Yes" options because it knows the user's intent.

---

## Concept 2: The "Thought Cloud" (Concept Branches)

In complex conversations (e.g., a multi-topic catch-up with a friend), predicting the exact sentence is difficult. Predicting the *topic* the user wants to address is much easier.

### How it works:
1.  The partner says: *"So I went to the doctor, and then my car broke down on the way to pick up the kids."*
2.  Instead of full sentences, the initial UI shows a "Thought Cloud" of 3-4 core concepts extracted from the speech:
    *   `[The Doctor]`
    *   `[The Car]`
    *   `[The Kids]`
    *   `[Sympathy]`
3.  **User Action:** The user taps `[The Car]`. 
4.  **Evolution:** The UI instantly blooms into 4 sentences specifically about the car (e.g., "Oh no, what happened to the car?", "Is it going to be expensive to fix?", "Do you need a ride tomorrow?").

---

## Concept 3: Backchanneling & Interruption Controls

Natural conversation is full of "backchanneling" — small utterances that show you are listening ("Yeah," "Mmhmm," "Wow") or interruptions to grab the floor ("Wait," "Hold on"). AAC users currently cannot do this without disrupting their entire sentence-building process.

### How it works:
1.  **Always-Visible Quick Keys:** A static bar exists at the edge of the screen with 3-4 immediate, ultra-fast responses that bypass the LLM entirely.
    *   `[Mhm / Nod]`
    *   `[Wow / React]`
    *   `[Wait a second]`
    *   `[Let me speak]`
2.  **Parallel Audio:** Tapping these plays a quick soundbite *without* clearing the user's current intent selection or sentence generation state. They can backchannel while the AI is thinking.

---

## Concept 4: Seamless Contextual Hooks

As outlined in the PRD, Context is King. But context should not require manual toggling if we can avoid it.

### How it works:
1.  **Passive Data Ingestion:** With permission, Speakerly reads:
    *   **Location:** (e.g., detected at "Starbucks" or "City Hospital").
    *   **Calendar:** (e.g., "Meeting with John at 2 PM").
    *   **Time of Day:** (e.g., 8:00 AM vs. 11:00 PM).
2.  **UI Impact:** When the user opens the app at Starbucks, the UI bypasses the "Listening" phase momentarily to offer "Contextual Hooks":
    *   `[I'll have my usual iced latte.]`
    *   `[Can I get a glass of water?]`
    *   `[Where is the restroom?]`
3.  If the barista speaks ("What can I get you?"), the STT layer confirms the context and immediately highlights the order option.

---

## Concept 5: Passive Learning & Contextual Memory (The "Long-Term Brain")

While the app listens to conversations to generate immediate responses, it also has a massive opportunity to learn about the user and their conversational partners over time. This passive data collection forms a "Long-Term Brain" that makes future predictions exponentially better.

### How it works:
1.  **Continuous Listening & Logging:** As conversations happen, the app logs the transcripts, the user's selected intents, and the final spoken sentences.
2.  **Periodic Distillation:** At regular intervals (e.g., nightly, or when idle), a background LLM process summarizes this raw log data into structured profiles:
    *   **User Profile:** "Prefers short answers," "Often talks about gardening," "Uses sarcastic humor."
    *   **Partner Profiles:** "When talking to 'John', the tone is warmer and focuses on family updates."
    *   **Shared Histories:** "Last week, discussed a broken car with John."
3.  **Selective Recall (RAG):** During a live conversation, the context engine dynamically injects relevant summaries from this Long-Term Brain into the prompt. If John asks, "Did you get it fixed?", the LLM knows *it* refers to the car, and offers options like, "Yeah, the mechanic finished it yesterday."

---

## Phase 2 Implementation Timeline

To keep the MVP agile (as outlined in the Technical Architecture), these advanced interactions should be layered in sequentially:

*   **v1 (MVP):** Direct to 4-sentence prediction (The baseline).
*   **v2:** Add the Static Backchanneling bar.
*   **v3:** Introduce the Intent-First "Reaction Sliders" based on real-time streaming audio.
*   **v4:** Integrate the passive Contextual Hooks (Location/Calendar).
*   **v5:** The "Memory Loop" - Deploy the vector database and background distillation processes for long-term learning.
