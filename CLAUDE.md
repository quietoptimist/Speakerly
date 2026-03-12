# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

```
/Speakerly
├── web/      # Next.js 16 app — all development happens here
├── specs/    # Product requirements and architecture docs (reference only)
└── research/ # Competitive analysis (reference only)
```

All commands below should be run from `web/`.

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm run lint     # ESLint
npx vitest       # Run all tests
npx vitest run <path>  # Run a single test file
```

Tests use **Vitest** + **@testing-library/react** with jsdom. There are currently no test files — the config is in place but tests haven't been written yet.

## Architecture

### Core Interaction Loop

The app's main page (`src/app/page.tsx`) orchestrates the full AAC loop:

1. Partner speaks → `AudioRecorder` → `POST /api/transcribe` (Whisper STT)
2. Transcript + context → `POST /api/predict` → streams structured JSON via `useObject()` hook
3. User taps a predicted sentence → added to draft, spoken via `/api/speak` (OpenAI TTS)
4. Every phrase is fire-and-forget logged to Supabase (`usage_events`, `conversation_log`)

### AI Streaming Pattern

All prediction endpoints use the Vercel AI SDK streaming pattern:

```typescript
// Backend (route.ts): streamObject() with a Zod schema
const result = await streamObject({ model, schema, prompt });
return result.toTextStreamResponse();

// Frontend (page.tsx): useObject() hook receives incremental updates
const { submit, object, isLoading } = useObject({ api: "/api/predict", schema });
```

The response schema (defined in `predict/route.ts`) produces both a `wordCloud` (vocabulary suggestions) and `responses` (6 full sentences) in a single streaming call.

### LLM Provider Abstraction

All three providers (OpenAI, Google Gemini, Anthropic) are supported. The active model is selected at runtime via the TopBar model selector and passed to `predict/route.ts`. Prompts live entirely in `src/lib/prompts.ts` — modify prompts there, not inline in routes.

### Persona & Learning System

- Each user has a `user_personas` row with `profile_md` (manually written) and `learned_md` (AI-written via distillation)
- Each conversation partner (`interlocutors`) has the same two fields
- `POST /api/distill` runs an LLM job over recent `conversation_log` + `usage_events` and updates `learned_md`
- Both profiles are injected into the `/api/predict` prompt to personalise predictions

### Context Hierarchy

Contexts are stored in Supabase (`contexts` table) as a tree. The `ContextHierarchy` component lets users navigate and select their current situation (e.g. Home → Living Room). The selected path is passed to `/api/predict` to bias suggestions. Default contexts are seeded from `seed_contexts.sql`.

### Manual vs. Auto Generation Modes

- **Manual (default)**: user explicitly triggers generation via "Generate Now" / "Update Words" buttons
- **Auto**: `useEffect` watches transcript, selected words, and context path — debounced 1s — and calls `submit()` automatically

### Auth

Supabase email/password auth. Server actions in `app/login/actions.ts`. Middleware at `src/utils/supabase/middleware.ts` protects all routes except `/login`. Always use `src/utils/supabase/server.ts` in API routes and server components; use `src/utils/supabase/client.ts` only in client components.

### UI Conventions

- Tailwind CSS v4 + shadcn/ui (primitive components in `src/components/ui/`)
- Dark theme: `slate-950` background, accent colours are cyan, emerald, and purple
- Add new shadcn components with: `npx shadcn@latest add <component>` from `web/`
