# AlphaSignal — AI Investment Research Agent

> An autonomous AI agent that researches any company end-to-end and delivers a clear **INVEST / PASS / HOLD** verdict with scored analysis, financial snapshot, risks, and catalysts — in under 2 minutes.

---

## Overview

AlphaSignal is a full-stack AI investment research agent built with **Next.js**, **LangGraph.js**, and your choice of LLM (OpenAI GPT-4o or Anthropic Claude). 

You type in a company name. The agent:

1. **Searches the web** across multiple queries — financials, news, competitor landscape, management quality
2. **Fetches structured financial data** via Alpha Vantage (if API key provided)
3. **Aggregates news sentiment** using Tavily's news search
4. **Synthesises everything** into a structured research report with 6 scored dimensions
5. **Delivers a verdict** — INVEST / PASS / HOLD — with a 0–100 confidence score

The entire pipeline is built as a **LangGraph state machine** with tool-calling loops, streaming server-sent events to the frontend for real-time progress updates.

---

## How to Run

### Prerequisites
- Node.js 18+
- At minimum: an OpenAI or Anthropic API key
- Recommended: a Tavily API key for web search (free tier: 1,000 searches/month)

### Setup

```bash
# 1. Clone / unzip and enter the directory
cd investment-agent

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Edit .env.local with your API keys (see below)

# 4. Run the development server
npm run dev

# 5. Open http://localhost:3000
```

### Environment Variables (`.env.local`)

```env
# Required — choose your LLM:
LLM_PROVIDER=openai           # or "anthropic"
OPENAI_API_KEY=sk-...         # if using OpenAI
OPENAI_MODEL=gpt-4o           # gpt-4o-mini works too (faster, cheaper)

# OR
ANTHROPIC_API_KEY=sk-ant-...  # if using Anthropic

# Strongly recommended — web search:
TAVILY_API_KEY=tvly-...       # https://tavily.com (free tier available)

# Optional — structured financial data:
ALPHA_VANTAGE_KEY=...         # https://alphavantage.co (free tier available)
```

> **Without Tavily or Serper:** the agent falls back to DuckDuckGo instant answers, which are very limited. The report quality degrades significantly. Get a free Tavily key — it takes 30 seconds.

### Deploying to Vercel

```bash
npm install -g vercel
vercel --prod
# Set environment variables in the Vercel dashboard under Project → Settings → Environment Variables
```

---

## How It Works — Architecture

```
User Input (company name)
        │
        ▼
  POST /api/analyze                          Next.js API Route
        │ (Server-Sent Events stream)
        ▼
  ┌─────────────────────────────────────────────────────┐
  │              LangGraph State Machine                │
  │                                                     │
  │  __start__                                          │
  │      │                                              │
  │      ▼                                              │
  │  [research node]  ←──────────────────────┐          │
  │      │ LLM with tools bound              │          │
  │      │                                   │          │
  │      ├── tool_calls? ──→ [tool node] ────┘          │
  │      │                   (web_search /               │
  │      │                    get_financial_data /       │
  │      │                    get_news_sentiment)        │
  │      │                                              │
  │      └── no more calls ──→ [synthesis node]         │
  │                               │ LLM (no tools)      │
  │                               │ Structured JSON out │
  │                               ▼                     │
  │                             __end__                 │
  └─────────────────────────────────────────────────────┘
        │
        ▼
  InvestmentReport (JSON)
        │
        ▼
  Frontend renders report with ScoreRing, section cards,
  factor bar chart, financial snapshot, risks & catalysts
```

### Key Components

| File | Purpose |
|---|---|
| `lib/agent.ts` | Core LangGraph graph, tool definitions, LLM config |
| `app/api/analyze/route.ts` | Streaming SSE API endpoint |
| `app/page.tsx` | Main UI — idle/loading/done/error states |
| `components/StepTracker.tsx` | Real-time step progress during research |
| `components/ReportView.tsx` | Full report renderer |
| `components/ScoreRing.tsx` | Animated SVG confidence score ring |

### LangGraph State Machine

The graph has **3 nodes**:

- **`research`** — LLM with tools bound. Makes multiple tool calls in sequence (web search, financial data, news). Loops through `tools` node until no more calls needed.
- **`tools`** — Standard LangGraph `ToolNode` that executes tool calls and returns results.
- **`synthesis`** — LLM without tools. Takes all gathered research and outputs a structured JSON report with verdict, scores, and analysis.

**Tools available to the research node:**
1. `web_search` — Tavily / Serper / DuckDuckGo fallback
2. `get_financial_data` — Alpha Vantage (P/E, revenue, margins, etc.)
3. `get_news_sentiment` — Tavily news-specific search

---

## Key Decisions & Trade-offs

### LangGraph over a simple chain
A ReAct-style loop in LangGraph lets the agent dynamically decide *how many* searches to do and *which* tools to use based on what it finds. A simple sequential chain would miss this adaptability — e.g., if the company is private, the agent skips the ticker-based financial tool and searches harder via web.

### Two-phase prompting (research → synthesis)
Separating research (tool-calling) from synthesis (structured JSON output) produces far better results than one big prompt. The research phase can be messy and iterative; the synthesis phase has a clean, strict schema to fill in.

### Server-Sent Events for streaming
Instead of polling, SSE gives the UI live step-by-step updates as the agent runs. This is critical for UX — 60–90 second waits feel fine when you see progress happening.

### DuckDuckGo fallback
Without any search API key, the agent falls back to DuckDuckGo's free instant-answer API. Quality is significantly worse (no full article text), but the app doesn't crash — it just produces a lower-confidence report.

### What I left out
- **Vector DB / RAG** — adding a FAISS or Pinecone store for caching past reports would speed up repeat queries, but adds significant complexity for a demo.
- **Portfolio tracking** — saving reports per user, comparing across companies.
- **Real-time price data** — a WebSocket feed for live prices would make valuations more accurate.
- **PDF export** — would be a nice-to-have for sharing.
- **Authentication** — no user accounts; this is a stateless demo app.
- **Rate limiting** — no throttling on the API endpoint; add this before production.

---

## Example Runs

### Apple Inc — INVEST (Confidence: 84)

> Apple maintains an exceptionally strong competitive moat through its tightly integrated hardware-software-services ecosystem. With $394B in revenue, 46% gross margins, and $108B in free cash flow, it combines financial strength with a sticky installed base of 2B+ devices. The Services segment growing at 14% YoY represents a high-margin flywheel. At 32x P/E it's not cheap, but the quality justifies a premium. **INVEST** for long-term holders with a 3–5 year horizon.

Key factors: Business Model 9/10 · Financials 9/10 · Growth 8/10 · Competitive 10/10 · Management 8/10 · Valuation 6/10

---

### Byju's — PASS (Confidence: 91)

> Once India's most valuable startup, Byju's has been engulfed in a financial crisis — auditor resignations, $1.2B loan default, regulatory probes, and founder control controversy. Revenue recognition issues, mounting losses, and a collapsing valuation make this uninvestable at any price until governance and cash flow are restored. **PASS** with strong conviction.

Key Risks: Governance failure, regulatory action, lender disputes, talent exodus, brand damage.

---

### Reliance Industries — HOLD (Confidence: 72)

> India's largest company by market cap. Jio's 5G rollout and Retail's expansion are strong tailwinds, but O2C (Oil-to-Chemicals) headwinds and high capital expenditure cycle weigh on near-term FCF. Fair-valued at current levels. **HOLD** — wait for capex cycle to peak before adding.

---

### Nvidia — INVEST (Confidence: 92)

> Nvidia is the defining infrastructure play of the AI era. With $60B+ in data-center GPU revenue, 70%+ gross margins, and near-monopoly in AI training compute (CUDA ecosystem moat), the company sits at the centre of a multi-year capex supercycle. At 40x forward earnings, valuation is full but not irrational given the growth trajectory. **INVEST** with a long-term view.

---

## What I Would Improve with More Time

1. **Persistent report caching** — store reports in a database (Supabase/PlanetScale) so repeated queries are instant and can be shared via URL.
2. **Multi-company comparison** — side-by-side scoring of 2–3 companies in the same sector.
3. **Portfolio mode** — build a watchlist, track verdict changes over time.
4. **Deeper financial data** — integrate SEC EDGAR filings parser for 10-K/10-Q deep-dives for US companies; BSE/NSE filing scraper for Indian companies.
5. **Confidence calibration** — back-test the agent's INVEST/PASS verdicts against actual 1-year returns to tune the scoring rubric.
6. **Better Indian market coverage** — dedicated tools for Screener.in, Moneycontrol, BSE/NSE APIs for Indian equities.
7. **LLM cost optimisation** — use a cheaper model (GPT-4o-mini) for the research loop and GPT-4o only for synthesis to cut costs by ~70%.
8. **PDF export** with a polished report template.
9. **Rate limiting and auth** before any public deployment.

---

## LLM Session Transcript

*See `LLM_CHAT_TRANSCRIPT.md` for the full Claude conversation used to build this project — covering architecture decisions, component design, debugging sessions, and iterative refinements.*

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), React, Tailwind CSS |
| Backend | Next.js API Routes, Server-Sent Events |
| AI Orchestration | LangGraph.js, LangChain.js |
| LLM | OpenAI GPT-4o or Anthropic Claude Sonnet |
| Web Search | Tavily AI / Serper / DuckDuckGo |
| Financial Data | Alpha Vantage |
| Deployment | Vercel |

---

*Built by [Your Name] for the InsideIIM × Altuni AI Labs take-home assignment.*
