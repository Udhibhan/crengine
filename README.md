# Reflective Cognition Engine (RCE)

> A long-term cognitive mirror. It maps your beliefs, finds contradictions, and speaks back without mercy.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Auth + Database | Supabase (free tier) |
| AI Engine | Anthropic Claude (claude-haiku for extraction, claude-sonnet for dialogue) |
| Deployment | Vercel (free tier) |

---

## Local Setup

### 1. Clone and install

```bash
git clone <your-repo>
cd reflective-cognition-engine
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Go to **SQL Editor** and paste the entire contents of `supabase/schema.sql`, then click **Run**
5. Go to **Authentication → Settings** and optionally **disable email confirmation** for easier local dev

### 3. Get Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. Add credit to your account (very cheap — ~$0.01 per request)

### 4. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ANTHROPIC_API_KEY=sk-ant-your-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

---

## Deployment to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repo
3. Add environment variables in Vercel project settings (same as `.env.local`)
4. Deploy — Vercel auto-detects Next.js

Update `NEXT_PUBLIC_APP_URL` to your Vercel production URL after first deploy.

---

## Features

### Thought Input
Write anything freely. The AI extracts discrete beliefs, assigns confidence scores, and categorizes them automatically.

### Contradiction Detection
Every new belief is compared against your entire history. Contradictions are scored and surfaced immediately.

### Belief Graph
Interactive D3-powered visualization of your belief network. Nodes = beliefs, edges = relationships (supports/contradicts/evolves).

### The Mirror (AI Dialogue)
A Socratic AI that has read all your beliefs and will challenge them with precision. Streaming responses, no validation, no flattery.

### Insights Engine
Periodic analysis of your full belief system detects cognitive biases, blind spots, and recurring patterns.

### Action Plan
Personalized behavioral recommendations generated from your specific belief patterns.

---

## Cost Estimate

For personal use, Anthropic API costs are minimal:
- Belief extraction: ~$0.001 per submission (Haiku model)
- Contradiction detection: ~$0.002 per submission
- Dialogue turn: ~$0.01 per message (Sonnet model)
- Insights generation: ~$0.02 per run

Typical monthly cost for regular personal use: **< $2**

---

## Architecture Notes

- All AI calls go through `lib/ai.ts` — single source of truth for the AI engine
- Supabase Row Level Security (RLS) is enabled — users can only access their own data
- Streaming dialogue uses `ReadableStream` and Anthropic's streaming API
- The belief graph uses `react-force-graph-2d` with dynamic import (SSR disabled) to avoid canvas issues
- Auth is handled entirely by Supabase SSR — no custom JWT logic needed
