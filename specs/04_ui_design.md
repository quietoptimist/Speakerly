# Speakerly: UI Layout & Component Design

The user interface for Speakerly must balance density (showing enough options) with cognitive ease (not overwhelming the user). Based on the cognitive speech formulation research and the user's suggestions, we will adopt a **5-tier vertical layout** optimized for tablets and mobile devices.

## The 5-Tier Vertical Layout

### 1. Top Bar (System & Context)
*   **Placement:** Fixed at the top.
*   **Contents:**
    *   **Hamburger Menu:** Access to deeper settings, user profile, and memory logs.
    *   **Listening Toggle:** A clear, pulsing visual indicator (e.g., a glowing microphone or subtle waveform) to show the app is actively listening. Tap to pause/resume.
    *   **Active Context Pills:** Small, selectable pills showing the current detected context (e.g., `[📍 Cafe]`, `[🗣️ Talking to: Doctor]`). Tapping these opens a quick-select menu to manually override the context without leaving the main screen.

### 2. The Transcript (Confirmation Layer)
*   **Placement:** Just below the top bar, taking up ~15-20% of the vertical space.
*   **Design:** A scrollable, conversational text box. 
*   **Why it's needed:** Crucial for the user to verify that the STT engine heard the partner correctly. It grounds the LLM predictions.
*   **Visuals:** Low contrast (gray text) so it doesn't distract from the primary action areas below. Current/live speech should fade in smoothly.

### 3. Quick Backchannels (Immediate Action)
*   **Placement:** A horizontal, scrollable row (or static grid) immediately below the transcript.
*   **Contents:** 4-6 large, static buttons for instant audio playback that bypass the LLM.
    *   *Yeah / Mhm / Nod*
    *   *No / Disagree*
    *   *Wait / Hold on*
    *   *Question / What?*
    *   *Laugh / React*
*   **Behavior:** These *do not* change with every sentence to build muscle memory. They only change if the overarching Context (Tier 1) changes drastically (e.g., "Cafe" mode might swap "Wait" for "Thank you").

### 4. Intent & Sentiment Sliders (The Steering Wheel)
*   **Placement:** The middle of the screen. This is the primary interactive area while the partner is speaking.
*   **Concept:** Instead of overwhelming the user with shifting buttons, we use sticky, persistent sliders or grouped toggle buttons that the user can set *mid-conversation*.
*   **Dimensions (Examples):**
    *   **Tone:** `Serious <------------> Humorous`
    *   **Length:** `Brief <------------> Detailed`
    *   **Stance:** `Agree <------------> Disagree`
    *   **Goal:** `Explain <------------> Ask/Inquire`
*   **Best Practice:** Do not change the axes of these sliders frequently. Consistency allows the user to tap them without looking (motor planning). Changing them should instantly trigger a re-generation of Tier 5.

### 5. Long-Form Replies (The Output)
*   **Placement:** The bottom 30-40% of the screen. This is the final destination before speech.
*   **Layout:** Instead of wide horizontal sentences (which are hard to track visually), use a **2x2 grid of square or tall-rectangular tiles**.
*   **Formatting Tricks for Readability:**
    *   **Keyword Bolding:** The LLM should wrap the core noun/verb in bold markdown so the eye can scan instantly.
        *   *Example:* "I think we should get **pizza** for **dinner** tonight."
    *   **Color Coding:** Subtly tint the tile background based on the sentiment (e.g., a green tint for an agreeing phrase, blue for a question).
    *   **Progressive Disclosure:** Give the tile a clear, short title (the "Gist"), with the full sentence slightly smaller below it.
        *   *Tile Header:* **Get Pizza**
        *   *Tile Body:* "I think we should order a pizza for dinner tonight, I'm starving."

---

## Initiative Mode (Starting a Conversation)

The 5-Tier layout above is optimized for *Reaction Mode* (when someone else is talking to the user). However, the user must also be able to initiate a conversation effortlessly.

### The "Home" State
When the app is opened, or after a period of silence, the UI defaults to **Initiative Mode**:
*   **The Transcript (Tier 2) is hidden.**
*   **The 2x2 Response Grid (Tier 5) is replaced by "Conversation Starters."**
    *   These starters are generated based on the current context (Location, Time, Calendar) and passive memory.
    *   *Example (Morning at Home):* "Good morning," "What's the plan for today?", "I'd like some coffee."
    *   *Example (At Doctor's Office):* "I'm here for my 2 PM appointment," "My throat has been hurting," "I need a prescription refill."

Once the user speaks a starter, or the microphone detects the partner speaking, the UI fluidly transitions back into the standard 5-Tier *Reaction Mode*.

---

## Smart Contextual Inputs (Dynamic UI Swaps)

In conversations requiring specific factual information (e.g., "What's your phone number?", "When is your birthday?", "Which grandchild is visiting?"), typing is too slow, and LLM sentence prediction is unreliable because it doesn't know the exact answer.

### How it works:
1.  **Question Detection:** The LLM analyzes the incoming transcript. If it detects a request for specific data (Time, Date, Number, Known Entity), it triggers a UI override.
2.  **Component Injection:** Instead of showing the standard 2x2 grid of sentences, Tier 5 is temporarily replaced by a highly optimized, native-feeling input component:
    *   *Question:* "How much pain are you in on a scale of 1 to 10?"
        *   *UI Injected:* A large 1-10 number dial or scale. User taps "7", and it instantly speaks: "I'm at about a 7 right now."
    *   *Question:* "When are they arriving?"
        *   *UI Injected:* A fast-scrolling date/time picker.
    *   *Question:* "Which restaurant do you want to go to?"
        *   *UI Injected:* A visual list of the user's top 5 favorite saved restaurants (pulled from their profile memory).

This ensures the user never has to painstakingly type out "My phone number is 5-5-5..." on a QWERTY keyboard.

---

## The Keyboard / "Escape Hatch"

*   **Trigger:** A persistent, floating action button (FAB) in the bottom right corner (the standard iOS/Android pattern).
*   **Behavior:** Tapping it slides up a keyboard, pushing Tiers 3, 4, and 5 out of the way, but keeping the STT Transcript (Tier 2) visible for reference while typing. As the user types, standard predictive text appears above the keyboard.

---

## Visual Design Language (Aesthetics)
The system prompt emphasizes "Rich Aesthetics" and "Premium Designs." An AAC app does not need to look like a medical device.

*   **Color Palette:** Deep, calming dark mode by default (e.g., Slate/Indigo backgrounds) with vibrant, high-contrast neon accents for interactive elements (cyan, purple, emerald). 
*   **Typography:** Modern, highly legible sans-serif (e.g., *Inter* or *Outfit*). Large font sizes (Base 18px minimum) with generous line height for accessibility.
*   **Micro-animations:** 
    *   Smooth expansion when tapping a "Thought Cloud" topic.
    *   A gentle, fluid pulse on the generated sentence tiles to indicate they have just refreshed.
    *   Subtle haptic feedback when tapping sliders or quick replies.
