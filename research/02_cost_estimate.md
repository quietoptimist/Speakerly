# Speakerly — Cost Estimate & On-Device Analysis

## The Three API Layers

Every Speakerly interaction cycles through three steps:

```
🎤 Listener speaks → [STT] → Context + transcript → [LLM] → Response options → User picks one → [TTS] → 🔊 Spoken
```

---

## Usage Assumptions (1 Hour)

A realistic conversational hour for an AAC user:

| Metric | Light Use | Heavy Use |
|--------|-----------|-----------|
| Conversational turns | 30 | 60 |
| Avg. listener speech to transcribe | 15 sec/turn | 20 sec/turn |
| **Total STT audio** | **~8 min** | **~20 min** |
| LLM calls per turn (generate options) | 1 | 2 (refine) |
| Avg. context prompt (system + history) | ~500 tokens | ~1,000 tokens |
| Avg. response (5 options × 15 words) | ~150 tokens | ~200 tokens |
| **Total LLM tokens** | **~20K in / 5K out** | **~120K in / 12K out** |
| Avg. spoken reply length | 12 words (~60 chars) | 20 words (~100 chars) |
| **Total TTS characters** | **~1,800** | **~6,000** |

---

## Per-Hour Cost Estimates

### Layer 1: Speech-to-Text (STT)

| Provider | Price | Light (8 min) | Heavy (20 min) |
|----------|-------|---------------|----------------|
| **Whisper API** (OpenAI) | $0.006/min | $0.05 | $0.12 |
| **Google Cloud STT** | $0.006/min (enhanced) | $0.05 | $0.12 |
| **Deepgram** | $0.0043/min | $0.03 | $0.09 |
| **On-device (WhisperKit)** | Free | **$0.00** | **$0.00** |

### Layer 2: LLM Response Generation

| Provider | Input / Output (per M tokens) | Light | Heavy |
|----------|-------------------------------|-------|-------|
| **Gemini 2.0 Flash** | $0.10 / $0.40 | $0.004 | $0.017 |
| **GPT-4o mini** | $0.15 / $0.60 | $0.006 | $0.025 |
| **DeepSeek V3** | $0.28 / $0.42 | $0.008 | $0.039 |
| **GPT-4o** (premium quality) | $2.50 / $10.00 | $0.10 | $0.42 |
| **Apple Foundation Model** | Free (on-device, ~3B params) | **$0.00** | **$0.00** |

### Layer 3: Text-to-Speech (TTS)

| Provider | Price | Light (1.8K chars) | Heavy (6K chars) |
|----------|-------|-------|-------|
| **Google WaveNet** | $16/M chars | $0.03 | $0.10 |
| **OpenAI TTS-1** | $15/M chars | $0.03 | $0.09 |
| **ElevenLabs** (Pro plan) | ~$0.20/K chars | $0.36 | $1.20 |
| **Apple AVSpeech** (on-device) | Free | **$0.00** | **$0.00** |

### Total Per-Hour Cost

| Scenario | Budget Stack | Mid Tier | Premium |
|----------|-------------|----------|---------|
| | Deepgram + Gemini Flash + Google WaveNet | Whisper + GPT-4o mini + OpenAI TTS | Whisper + GPT-4o + ElevenLabs |
| **Light use** | **$0.06** | **$0.09** | **$0.51** |
| **Heavy use** | **$0.20** | **$0.23** | **$1.74** |

---

## Subscription Pricing Model

Assuming 2–3 hours of active use per day (realistic for an AAC user):

| Tier | Daily Cost | Monthly Cost | Suggested Price | Margin |
|------|-----------|-------------|-----------------|--------|
| **Budget** (Gemini Flash stack) | $0.12–$0.60 | $3.60–$18 | **$9.99/mo** | Good at light-mid use |
| **Mid** (GPT-4o mini stack) | $0.18–$0.69 | $5.40–$21 | **$14.99/mo** | Healthy |
| **Premium** (GPT-4o + ElevenLabs) | $1.02–$5.22 | $30–$157 | **$29.99/mo** | Tight at heavy use |

> [!TIP]
> The **budget stack using Gemini 2.0 Flash + Google WaveNet** is remarkably cheap. At $0.06–$0.20/hour, a **$9.99/mo subscription supports 50–160 hours of use** — far more than any user would need. This is a game-changer vs. $250+ one-time-purchase competitors.

> [!IMPORTANT]
> These costs are **falling rapidly**. Token prices have dropped ~10× in 2 years. By the time Speakerly has significant users, costs will likely be 50%+ lower.

---

## On-Device Inference: What Can Run Locally?

### ✅ Speech-to-Text — **Excellent on-device fit**

| Solution | Quality | Latency | Offline? |
|----------|---------|---------|----------|
| **WhisperKit** (Swift/CoreML) | Near-API quality with Whisper Small/Medium | Fast on M1+ & A17 Pro+ | ✅ Yes |
| **Apple Speech Framework** | Good for short phrases | Very fast | ✅ Yes |

**Verdict:** STT should run 100% on-device. WhisperKit is production-ready, open source, and free. This eliminates the largest audio data transfer and the most privacy-sensitive layer.

---

### ⚠️ LLM Response Generation — **Partially viable on-device**

| Solution | Quality | Feasibility |
|----------|---------|-------------|
| **Apple Foundation Models** (~3B params) | Good for simple tasks | Free via WWDC25 framework, but quality may not match GPT-4o mini for nuanced conversation prediction |
| **Quantized Llama/Mistral** via mlx or llama.cpp | Decent at 4-bit, ~3–7B models | Runs on M1+ iPads, slower on A-series iPhones |
| **Cloud LLM API** (Gemini Flash / GPT-4o mini) | Best quality | Requires internet, ~$0.004–0.025/hr |

**Verdict:** Hybrid approach is best. Use on-device models for quick, simple predictions (yes/no, common phrases, greetings) and cloud LLM for rich contextual predictions. This gives offline capability + premium quality when connected.

---

### ✅ Text-to-Speech — **Good on-device fit**

| Solution | Quality | Special Feature |
|----------|---------|----------------|
| **AVSpeechSynthesizer** (Premium voices) | Good — not amazing | Free, offline, ~100MB voice download |
| **Apple Personal Voice** | Sounds like the user! | User records 150 sentences → on-device ML creates their voice clone |
| **Cloud TTS** (Google WaveNet / ElevenLabs) | Excellent quality | Requires internet |

**Verdict:** Apple Personal Voice is a **killer feature** for AAC users — they can speak in their own voice (or a voice that sounds like they did before losing speech). This should be the primary TTS path for native iOS, with cloud TTS as a premium option for the web version.

---

## Recommended Hybrid Architecture

```
┌─────────────────────────────────────────────────┐
│                   SPEAKERLY                      │
├─────────────────────────────────────────────────┤
│                                                  │
│  🎤 STT: On-device (WhisperKit)          FREE   │
│     └─ Fallback: Whisper API if needed          │
│                                                  │
│  🧠 LLM: Hybrid                                 │
│     ├─ On-device (Apple 3B / small model)       │
│     │   → Quick replies, offline, common phrases│
│     └─ Cloud (Gemini Flash / GPT-4o mini)       │
│         → Rich contextual predictions    CHEAP  │
│                                                  │
│  🔊 TTS: On-device (Personal Voice)      FREE   │
│     └─ Fallback: Google WaveNet / ElevenLabs    │
│                                                  │
├─────────────────────────────────────────────────┤
│  Estimated cloud cost: $0.004–0.025/hour        │
│  On-device-only cost: $0.00/hour                │
│  Recommended price:   $9.99/mo (or free tier!)  │
└─────────────────────────────────────────────────┘
```

> [!NOTE]
> With the hybrid approach, the **cloud costs are so low** ($0.004/hr at light use) that Speakerly could viably offer a **free tier** with limited daily interactions, upgrading to premium for heavy users. This would be revolutionary in a market where apps cost $250+.

---

## Key Takeaways

1. **Cloud costs are surprisingly low** — a $9.99/mo subscription comfortably covers even heavy use
2. **STT and TTS can run 100% on-device** — eliminating the two most expensive and privacy-sensitive layers
3. **Apple Personal Voice is a game-changer** for AAC — users can speak in their own voice, for free
4. **The LLM layer is the only real cloud cost**, and it's pennies per hour with Gemini Flash
5. **Costs are falling fast** — this pricing equation only gets better over time
6. **Cross-platform note:** On-device advantages are strongest on Apple. For Android/web, cloud APIs would be the primary path, keeping costs at the "budget stack" level (~$0.06–0.20/hr)
