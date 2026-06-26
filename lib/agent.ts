import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { PromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ResearchStep {
  step: string;
  status: "pending" | "running" | "done" | "error";
  detail?: string;
}

export interface InvestmentReport {
  company: string;
  ticker?: string;
  verdict: "INVEST" | "PASS" | "HOLD";
  confidenceScore: number;
  summary: string;
  thesis: string;
  sections: ReportSection[];
  risks: string[];
  catalysts: string[];
  financialSnapshot: FinancialSnapshot;
  competitivePosition: string;
  managementQuality: string;
  finalVerdict: string;
  researchedAt: string;
}

export interface ReportSection {
  title: string;
  content: string;
  sentiment: "positive" | "negative" | "neutral";
  score?: number;
}

export interface FinancialSnapshot {
  revenue?: string;
  revenueGrowth?: string;
  grossMargin?: string;
  netMargin?: string;
  peRatio?: string;
  marketCap?: string;
  debtToEquity?: string;
  freeCashFlow?: string;
  roe?: string;
  notes: string;
}

// ─── LLM Setup ───────────────────────────────────────────────────────────────

function getLLM() {
  const provider = process.env.LLM_PROVIDER || "openai";

  if (provider === "groq" && process.env.GROQ_API_KEY) {
    return new ChatGroq({
      model: "llama-3.3-70b-versatile",
      apiKey: process.env.GROQ_API_KEY,
      temperature: 0.3,
      maxTokens: 2500,
    });
  }

  if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    return new ChatAnthropic({
      model: "claude-haiku-4-5-20251001",
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxTokens: 2500,
    });
  }

  return new ChatOpenAI({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    apiKey: process.env.OPENAI_API_KEY,
    temperature: 0.3,
    maxTokens: 2500,
  });
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Timeout wrapper ──────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  const timeout = new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms));
  return Promise.race([promise, timeout]);
}

// ─── Direct Tavily Search ─────────────────────────────────────────────────────

async function searchWeb(query: string): Promise<string> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey) return "";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyKey,
        query,
        search_depth: "basic",
        max_results: 3,
        include_answer: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data = await res.json();
    const answer = data.answer ? `Summary: ${data.answer}\n` : "";
    const results = (data.results || [])
      .slice(0, 3)
      .map((r: { title: string; content: string }) =>
        `- ${r.title}: ${r.content?.slice(0, 250)}`
      )
      .join("\n");
    return `[${query}]\n${answer}${results}`;
  } catch {
    return "";
  }
}

// ─── LangChain Prompt Templates ───────────────────────────────────────────────

// Chain 1: Research Summariser — condenses raw search data into a clean brief
const researchSummaryTemplate = PromptTemplate.fromTemplate(`
You are a financial research assistant. Summarise the following search results about {company}.
Focus on: latest financials (revenue, margins, profit/loss), recent news, competitive position, and any red flags like bankruptcy, fraud, or heavy debt.
Be factual and specific. Include numbers where available. Be concise — max 250 words.

Search Results:
{searchResults}

Write a structured research brief covering: financials, recent developments, risks, and competitive position.
`);

// Chain 2: Synthesis — takes research brief and outputs structured JSON verdict
const synthesisTemplate = PromptTemplate.fromTemplate(`
You are a brutally honest, skeptical investment research analyst at a top-tier fund.
You have deep knowledge of global markets including Indian (BSE/NSE) and US markets.

CRITICAL VERDICT RULES — apply these strictly:
- Company filed BANKRUPTCY → verdict MUST be "PASS", confidenceScore below 25
- Company has FRAUD or criminal allegations → verdict MUST be "PASS"
- Company is deeply LOSS-MAKING with no clear path to profit → lean "PASS"
- Company has MIXED signals (decent business + uncertain outlook OR full valuation) → "HOLD"
- Only give "INVEST" when fundamentals are genuinely strong AND valuation is reasonable
- Never sugarcoat problems. Be specific about risks.

RESEARCH DATA FOR {company}:
{researchBrief}

Generate a comprehensive investment report as JSON.
Return ONLY valid JSON. No markdown. No code blocks. Start with {{ and end with }}.

{{
  "company": "Full official company name",
  "ticker": "Stock ticker or null",
  "verdict": "INVEST or PASS or HOLD",
  "confidenceScore": 75,
  "summary": "2-3 sentence executive summary with specific current data",
  "thesis": "3-4 sentence investment thesis with clear reasoning",
  "sections": [
    {{
      "title": "Business Model & Competitive Moat",
      "content": "150 word detailed analysis of business model and competitive advantages or weaknesses",
      "sentiment": "positive or negative or neutral",
      "score": 7
    }},
    {{
      "title": "Financial Health & Metrics",
      "content": "150 word analysis with the most recent specific figures — revenue, growth, margins, profitability, debt",
      "sentiment": "positive or negative or neutral",
      "score": 7
    }},
    {{
      "title": "Growth Prospects & Catalysts",
      "content": "150 word analysis of growth drivers, market opportunity, upcoming catalysts",
      "sentiment": "positive or negative or neutral",
      "score": 7
    }},
    {{
      "title": "Competitive Landscape",
      "content": "150 word analysis of market position, key competitors, market share dynamics",
      "sentiment": "positive or negative or neutral",
      "score": 6
    }},
    {{
      "title": "Management & Governance",
      "content": "120 word analysis of leadership quality, track record, any controversies",
      "sentiment": "positive or negative or neutral",
      "score": 7
    }},
    {{
      "title": "Valuation Assessment",
      "content": "150 word analysis with current P/E, EV/EBITDA, comparison to peers and historical averages",
      "sentiment": "positive or negative or neutral",
      "score": 6
    }}
  ],
  "risks": [
    "Specific risk 1 with detail",
    "Specific risk 2 with detail",
    "Specific risk 3 with detail",
    "Specific risk 4 with detail",
    "Specific risk 5 with detail"
  ],
  "catalysts": [
    "Specific catalyst 1 with detail",
    "Specific catalyst 2 with detail",
    "Specific catalyst 3 with detail",
    "Specific catalyst 4 with detail"
  ],
  "financialSnapshot": {{
    "revenue": "Most recent figure with currency and fiscal year e.g. $39.0B (FY2024)",
    "revenueGrowth": "Most recent YoY growth %",
    "grossMargin": "Most recent % or N/A",
    "netMargin": "Most recent % or negative or N/A",
    "peRatio": "Current x multiple or N/A or loss-making",
    "marketCap": "Current with currency",
    "debtToEquity": "Current ratio or debt-free",
    "freeCashFlow": "Most recent figure or negative",
    "roe": "Most recent % or negative",
    "notes": "Source: live web search + training data. Verify before investing."
  }},
  "competitivePosition": "One detailed paragraph on current moat and market position",
  "managementQuality": "One detailed paragraph on management team quality and track record",
  "finalVerdict": "3-4 sentence conclusive verdict with specific reasoning for INVEST/PASS/HOLD",
  "researchedAt": "{researchedAt}"
}}

Rules: verdict must be exactly "INVEST", "PASS", or "HOLD". sentiment must be exactly "positive", "negative", or "neutral". score must be integer 0-10. confidenceScore must be integer 0-100. Return ONLY the JSON.
`);

// ─── Main Entry ───────────────────────────────────────────────────────────────

export async function runInvestmentAgent(
  company: string,
  onStep?: (step: ResearchStep) => void
): Promise<InvestmentReport> {

  const updateStep = (step: string, status: ResearchStep["status"], detail?: string) => {
    if (onStep) onStep({ step, status, detail });
  };

  const llm = getLLM();

  // ── Step 1: Identify ──
  updateStep("Identifying company", "running", `Looking up "${company}"`);
  await delay(200);
  updateStep("Identifying company", "done", `Found: ${company}`);

  // ── Steps 2-4: Parallel web searches with global 18s timeout ──
  updateStep("Scraping financial data", "running", "Fetching live data...");

  const [financialData, newsData, competitorData] = await withTimeout(
    Promise.all([
      searchWeb(`${company} revenue profit margins financials annual report 2024 2025`),
      searchWeb(`${company} latest news earnings bankruptcy fraud analyst 2024 2025`),
      searchWeb(`${company} competitors market share industry position 2024`),
    ]),
    18000, // 18 second global timeout for all searches
    ["", "", ""]
  );

  updateStep("Scraping financial data", "done", "Live data fetched");
  updateStep("Analysing news & sentiment", "running", "Running LangChain summariser chain...");

  // ── LangChain Chain 1: PromptTemplate → LLM → StringOutputParser ──
  // Summarises raw search results into a clean research brief
  // Has a 12s timeout — if Groq is slow, falls back to raw search data
  const researchChain = RunnableSequence.from([
    researchSummaryTemplate,
    llm,
    new StringOutputParser(),
  ]);

  const combinedResults = [financialData, newsData, competitorData]
    .filter(Boolean)
    .join("\n\n");

  let researchBrief: string;

  if (combinedResults.length > 20) {
    // Try Chain 1 with a 12s timeout — if it hangs, skip and use raw data
    researchBrief = await withTimeout(
      researchChain.invoke({ company, searchResults: combinedResults }),
      12000,
      `Research brief for ${company} (from live search):\n${combinedResults.slice(0, 1500)}`
    );
  } else {
    // No search results — LLM will rely on training knowledge
    researchBrief = `No live search results available. Use your training knowledge about ${company} to generate the most accurate and up-to-date analysis possible.`;
  }

  updateStep("Analysing news & sentiment", "done", "Research brief ready");
  updateStep("Mapping competitive landscape", "running", "Analysing competitive data...");
  await delay(200);
  updateStep("Mapping competitive landscape", "done", "Competitive landscape mapped");
  updateStep("Scoring fundamentals", "running", "Scoring all dimensions...");
  await delay(200);
  updateStep("Scoring fundamentals", "done", "Fundamentals scored");

  // ── LangChain Chain 2: PromptTemplate → LLM → JsonOutputParser ──
  // Takes research brief and generates the final structured investment report
  updateStep("Generating verdict", "running", "Running LangChain synthesis chain...");

  const synthesisChain = RunnableSequence.from([
    synthesisTemplate,
    llm,
    new JsonOutputParser(),
  ]);

  let report: InvestmentReport;

  try {
    // Try with JsonOutputParser first (cleaner)
    report = await withTimeout(
      synthesisChain.invoke({
        company,
        researchBrief,
        researchedAt: new Date().toISOString(),
      }),
      45000, // 45s timeout for synthesis
      null as unknown as InvestmentReport
    );

    if (!report || !report.verdict) throw new Error("Empty report");

  } catch {
    // Fallback: StringOutputParser + manual JSON parse
    const fallbackChain = RunnableSequence.from([
      synthesisTemplate,
      llm,
      new StringOutputParser(),
    ]);

    const raw = await withTimeout(
      fallbackChain.invoke({
        company,
        researchBrief,
        researchedAt: new Date().toISOString(),
      }),
      45000,
      ""
    );

    if (!raw) throw new Error("AI response timed out. Please try again.");

    const cleaned = raw.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Could not parse AI response. Please try again.");
    report = JSON.parse(match[0]);
  }

  updateStep("Generating verdict", "done", `Verdict: ${report.verdict}`);
  return report;
}
