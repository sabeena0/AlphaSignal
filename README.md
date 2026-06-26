# AlphaSignal — AI Investment Research Agent

> Enter any company. The AI agent researches it using live web data and delivers a clear **INVEST / PASS / HOLD** verdict with scored analysis, financial snapshot, risks, and catalysts.

---

## Overview

AlphaSignal is a full-stack AI investment research agent built with **Next.js**, **LangChain.js**, and your choice of LLM (Groq Llama 3.3, OpenAI GPT-4o, or Anthropic Claude).

You type in a company name. The agent:

1. **Runs 4 parallel live web searches** using LangChain's `TavilySearchResults` tool — fetching latest financials, news, competitor data, and risk signals
2. **Summarises the raw search data** using a LangChain `RunnableSequence` (Chain 1: PromptTemplate → LLM → StringOutputParser)
3. **Synthesises a structured investment report** using a second LangChain chain (Chain 2: PromptTemplate → LLM → JsonOutputParser)
4. **Delivers a verdict** — INVEST / PASS / HOLD — with a 0–100 confidence score, 6 scored dimensions, financial snapshot, risks, and catalysts
5. **Streams progress** to the UI in real time via Server-Sent Events so you see each step complete live

---

## How to Run

### Prerequisites
- Node.js 18+
- A Groq API key (free) — or OpenAI / Anthropic key
- A Tavily API key (free, 1000 searches/month) — for live web search

### Setup

```bash
# 1. Enter the project directory
cd investment-agent

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Configure environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# 4. Run the development server
npm run dev

# 5. Open http://localhost:3000
```

### Environment Variables (`.env.local`)

```env
# Choose your LLM provider: groq (recommended — free & fast), openai, or anthropic
LLM_PROVIDER=groq

# Groq — free, fast, no credit card needed (https://console.groq.com)
GROQ_API_KEY=gsk_...

# OpenAI (alternative)
# OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4o-mini

# Anthropic (alternative)
# ANTHROPIC_API_KEY=sk-ant-...

# Tavily — live web search (https://tavily.com, free tier: 1000 searches/month)
TAVILY_API_KEY=tvly-...
```

### Getting Free API Keys

| Key | Where | Time |
|---|---|---|
| Groq | console.groq.com → API Keys | 2 minutes |
| Tavily | tavily.com → Sign up | 2 minutes |

### Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
# Add environment variables in Vercel dashboard → Project → Settings → Environment Variables
```

> **Note:** Vercel Pro plan required for `maxDuration = 120` on API routes. Hobby plan has a 10s timeout which is too short for AI research.

---

## How It Works — Architecture

```
User Input (company name)
        │
        ▼
  POST /api/analyze                    Next.js API Route (SSE stream)
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                    LangChain Pipeline                       │
│                                                             │
│  ┌─────────────────────────────────────────────┐           │
│  │  STEP 1 — Parallel Web Research             │           │
│  │  LangChain TavilySearchResults tool ×4      │           │
│  │                                             │           │
│  │  • financials: revenue, margins, metrics    │           │
│  │  • news: earnings, analyst ratings          │           │
│  │  • competitors: market share, landscape     │           │
│  │  • risks: debt, fraud, legal, bankruptcy    │           │
│  └──────────────────┬──────────────────────────┘           │
│                     │ raw search results                    │
│                     ▼                                       │
│  ┌─────────────────────────────────────────────┐           │
│  │  STEP 2 — Chain 1: Research Summariser      │           │
│  │  RunnableSequence:                          │           │
│  │  PromptTemplate → LLM → StringOutputParser  │           │
│  │                                             │           │
│  │  Condenses 4 search results into a          │           │
│  │  structured research brief                  │           │
│  └──────────────────┬──────────────────────────┘           │
│                     │ research brief                        │
│                     ▼                                       │
│  ┌─────────────────────────────────────────────┐           │
│  │  STEP 3 — Chain 2: Synthesis                │           │
│  │  RunnableSequence:                          │           │
│  │  PromptTemplate → LLM → JsonOutputParser    │           │
│  │                                             │           │
│  │  Generates structured InvestmentReport JSON │           │
│  │  with verdict, scores, snapshot, risks      │           │
│  └──────────────────┬──────────────────────────┘           │
└─────────────────────┼───────────────────────────────────────┘
                      │ InvestmentReport JSON
                      ▼
        SSE stream → Frontend React UI
        (ScoreRing, ReportView, StepTracker)
```

### LangChain Components Used

| Component | Purpose |
|---|---|
| `TavilySearchResults` | Live web search tool — fetches real 2024/2025 data |
| `PromptTemplate` | Structured, reusable prompt management |
| `RunnableSequence` | Chains multiple steps into a pipeline |
| `StringOutputParser` | Parses LLM text output in Chain 1 |
| `JsonOutputParser` | Parses structured JSON output in Chain 2 |
| `ChatGroq` | Groq LLM provider (Llama 3.3 70B) |
| `ChatOpenAI` | OpenAI provider (GPT-4o / GPT-4o-mini) |
| `ChatAnthropic` | Anthropic provider (Claude Sonnet) |

### Key Files

| File | Purpose |
|---|---|
| `lib/agent.ts` | Core LangChain pipeline — tools, chains, parsers |
| `app/api/analyze/route.ts` | Streaming SSE API endpoint |
| `app/page.tsx` | Main UI — idle / loading / done / error states |
| `components/StepTracker.tsx` | Real-time step progress during research |
| `components/ReportView.tsx` | Full report renderer with all sections |
| `components/ScoreRing.tsx` | Animated SVG confidence score ring |

---

## Key Decisions & Trade-offs

### LangChain chains over raw API calls
Using `RunnableSequence` with `PromptTemplate` and output parsers makes the pipeline composable, testable, and easy to extend. Swapping the LLM provider is one line. Adding a new chain step is trivial. Raw `fetch()` calls would work but wouldn't be maintainable or extensible.

### Two-chain architecture (research → synthesis)
Separating web search summarisation (Chain 1) from JSON synthesis (Chain 2) produces significantly better results than one giant prompt. Chain 1 is in "gather and summarise" mode; Chain 2 is in "structured analysis" mode. Mixing both into one prompt degrades quality on both dimensions.

### Groq as default LLM (Llama 3.3 70B)
Groq is free, requires no credit card, and runs Llama 3.3 70B at ~500 tokens/second — making it 3-5x faster than OpenAI for the same output quality. Perfect for a demo. The provider abstraction means switching to GPT-4o or Claude is just changing one env variable.

### Parallel web searches
All 4 Tavily searches run in `Promise.all()` — simultaneously, not sequentially. This cuts search time from ~8 seconds to ~2 seconds.

### Server-Sent Events for streaming
SSE gives live step-by-step progress updates to the UI. A 25-second wait feels fast when you watch each step complete. Without streaming, users would stare at a blank spinner for 25 seconds.

### What I left out
- **LangGraph state machine** — the original design used a full LangGraph graph with a tool-calling loop. Removed because it requires a search API to work and is harder to debug; the two-chain pipeline achieves the same result more reliably.
- **Vector DB / RAG** — caching past reports in FAISS or Pinecone for instant re-queries.
- **Portfolio tracking** — saving reports per user, comparing companies over time.
- **Real-time price feeds** — WebSocket live prices for accurate valuation.
- **Authentication** — no user accounts; stateless demo.
- **Rate limiting** — no throttling on the API endpoint.

---

## Example Runs

### Apple Inc — INVEST (Confidence: 87)

**Verdict:** INVEST

**Thesis:** Apple maintains an exceptionally strong competitive moat through its tightly integrated hardware-software-services ecosystem. With $391B in FY2024 revenue and 46% gross margins, the Services segment growing at 13% YoY represents a high-margin, recurring revenue flywheel. The 2.2B+ device installed base creates enormous switching costs. At 32x P/E the valuation is full but justified by quality.

**Financial Snapshot:** Revenue $391B (FY2024) · Gross Margin 46.2% · Net Margin 26.4% · Market Cap $3.4T · FCF $108B

**Key Risks:** iPhone concentration risk (52% of revenue), China manufacturing dependency, Services antitrust scrutiny, Vision Pro adoption uncertainty, slowing hardware upgrade cycles

---

### WeWork — PASS (Confidence: 8)

**Verdict:** PASS

**Thesis:** WeWork filed for Chapter 11 bankruptcy in November 2023, making it uninvestable. The company accumulated over $18B in long-term lease obligations it could not service, with occupancy rates failing to recover post-COVID. The fundamental business model — long-term lease liabilities against short-term flexible memberships — was structurally broken.

**Financial Snapshot:** Revenue $3.4B (FY2022) · Net Loss -$2.3B · Debt/Equity extremely negative · FCF deeply negative

**Key Risks:** Bankruptcy filing Nov 2023, lease liability crisis, management credibility destroyed, brand severely damaged

---

### Reliance Industries — HOLD (Confidence: 64)

**Verdict:** HOLD

**Thesis:** India's largest company by market cap with diversified revenue across O2C, Retail, and Jio Digital. Jio's 5G rollout and Retail expansion are strong long-term tailwinds. However, the ongoing high capex cycle suppresses near-term FCF, and the O2C segment faces global refining margin pressure. Fair-valued at current levels — wait for capex to peak.

**Financial Snapshot:** Revenue ₹10.2L Cr (FY2024) · EBITDA ₹1.8L Cr · Market Cap ₹19L Cr · D/E 0.4x

---

### Byju's — PASS (Confidence: 4)

**Verdict:** PASS

**Thesis:** Byju's represents one of India's most dramatic startup collapses. The company faces $1.2B loan default, auditor resignations, SEBI and ED investigations, and founder control controversy. Revenue recognition irregularities and mounting losses make this uninvestable at any price until governance, cash flow, and regulatory standing are fully restored — which appears unlikely in the near term.

**Key Risks:** Criminal investigations, lender disputes, talent exodus, brand collapse, potential insolvency

---

## What I Would Improve With More Time

1. **Restore LangGraph state machine** — a proper ReAct agent that dynamically decides how many searches to run and can follow up on findings (e.g. if it finds the company is bankrupt, it searches specifically for bankruptcy details).

2. **Persistent report caching** — store reports in Supabase/PlanetScale so repeat queries are instant and shareable via URL.

3. **Source citations** — show which Tavily search result each claim comes from, with clickable links. Critical for credibility.

4. **Multi-company comparison** — side-by-side scoring of 2-3 companies in the same sector.

5. **Better Indian market coverage** — dedicated Screener.in and Moneycontrol scrapers for BSE/NSE listed companies, which Tavily sometimes misses.

6. **Confidence calibration** — back-test verdicts against actual 1-year returns to tune the scoring rubric empirically.

7. **PDF export** — downloadable report with a polished template for sharing.

8. **Rate limiting and auth** — essential before any public deployment.

9. **Portfolio mode** — build a watchlist, track verdict changes over time, get alerts.

10. **LLM cost optimisation** — use a cheaper model for Chain 1 (summarisation) and a stronger model only for Chain 2 (synthesis).

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS |
| Backend | Next.js API Routes, Server-Sent Events |
| AI Orchestration | LangChain.js (chains, tools, parsers) |
| LLM | Groq Llama 3.3 70B / OpenAI GPT-4o / Anthropic Claude |
| Web Search | LangChain TavilySearchResults tool |
| Deployment | Vercel |

---

## Disclaimer

This tool is AI-generated for informational and educational purposes only. It does not constitute financial advice. Always conduct your own due diligence before making any investment decisions.

---

*Built for the InsideIIM × Altuni AI Labs AI Product Development Engineer internship assignment.*
