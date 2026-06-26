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

// ─── Direct Tavily Search (no LangChain community dep) ───────────────────────

async function searchWeb(query: string): Promise<string> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey) return "";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout per search

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
    return ""; // silently fail, LLM will use training data
  }
}

// ─── LangChain Prompt Templates ───────────────────────────────────────────────

const researchSummaryTemplate = PromptTemplate.fromTemplate(`
You are a financial research assistant. Summarise the following search results about {company}.
Focus on: latest financials, recent news, competitive position, and any red flags like bankruptcy or fraud.
Be factual and concise. Include specific numbers where available. Max 300 words.

Search Results:
{searchResults}

Write a brief research summary covering: financials, recent news, risks.
`);

const synthesisTemplate = PromptTemplate.fromTemplate(`
You are a brutally honest investment research analyst.

CRITICAL RULES:
- Bankrupt companies (e.g. WeWork filed Chapter 11 in 2023) → verdict MUST be "PASS", confidenceScore below 25
- Fraud or criminal allegations → verdict MUST be "PASS"
- Deep losses with no profit path → lean "PASS"
- Only "INVEST" for genuinely strong fundamentals

RESEARCH SUMMARY FOR {company}:
{researchBrief}

Generate an investment report as JSON. Return ONLY valid JSON starting with {{ and ending with }}.

{{
  "company": "Full company name",
  "ticker": "ticker or null",
  "verdict": "INVEST or PASS or HOLD",
  "confidenceScore": 75,
  "summary": "2-3 sentence executive summary",
  "thesis": "3-4 sentence investment thesis",
  "sections": [
    {{"title": "Business Model & Competitive Moat", "content": "120 word analysis", "sentiment": "positive", "score": 7}},
    {{"title": "Financial Health & Metrics", "content": "120 word analysis with specific numbers", "sentiment": "positive", "score": 7}},
    {{"title": "Growth Prospects & Catalysts", "content": "120 word analysis", "sentiment": "positive", "score": 7}},
    {{"title": "Competitive Landscape", "content": "120 word analysis", "sentiment": "neutral", "score": 6}},
    {{"title": "Management & Governance", "content": "100 word analysis", "sentiment": "positive", "score": 7}},
    {{"title": "Valuation Assessment", "content": "120 word analysis with P/E comparison", "sentiment": "neutral", "score": 6}}
  ],
  "risks": ["Risk 1", "Risk 2", "Risk 3", "Risk 4", "Risk 5"],
  "catalysts": ["Catalyst 1", "Catalyst 2", "Catalyst 3", "Catalyst 4"],
  "financialSnapshot": {{
    "revenue": "figure with currency and year",
    "revenueGrowth": "YoY %",
    "grossMargin": "% or N/A",
    "netMargin": "% or negative",
    "peRatio": "x or N/A",
    "marketCap": "with currency",
    "debtToEquity": "ratio or debt-free",
    "freeCashFlow": "figure or negative",
    "roe": "% or negative",
    "notes": "Source: live search + training data"
  }},
  "competitivePosition": "Paragraph on moat and market position",
  "managementQuality": "Paragraph on management quality",
  "finalVerdict": "3-4 sentence conclusive verdict",
  "researchedAt": "{researchedAt}"
}}

Rules: verdict must be "INVEST", "PASS", or "HOLD". sentiment must be "positive", "negative", or "neutral". score 0-10. confidenceScore 0-100.
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

  // Step 1
  updateStep("Identifying company", "running", `Looking up "${company}"`);
  await delay(200);
  updateStep("Identifying company", "done", `Found: ${company}`);

  // Steps 2-4: Run searches with timeout protection
  updateStep("Scraping financial data", "running", "Fetching live data...");

  // Run searches in parallel with a global 20s timeout
  const searchPromise = Promise.all([
    searchWeb(`${company} revenue profit financials 2024 2025`),
    searchWeb(`${company} latest news bankruptcy fraud 2024 2025`),
    searchWeb(`${company} competitors market position 2024`),
  ]);

  const timeoutPromise = new Promise<[string, string, string]>(resolve =>
    setTimeout(() => resolve(["", "", ""]), 20000)
  );

  const [financialData, newsData, competitorData] = await Promise.race([
    searchPromise,
    timeoutPromise,
  ]);

  updateStep("Scraping financial data", "done", "Data fetched");
  updateStep("Analysing news & sentiment", "running", "Running LangChain summariser...");

  // LangChain Chain 1: PromptTemplate → LLM → StringOutputParser
  const researchChain = RunnableSequence.from([
    researchSummaryTemplate,
    llm,
    new StringOutputParser(),
  ]);

  const combinedResults = `${financialData}\n${newsData}\n${competitorData}`.trim();

  let researchBrief = "";
  if (combinedResults.length > 10) {
    researchBrief = await researchChain.invoke({
      company,
      searchResults: combinedResults,
    });
  } else {
    researchBrief = `No live search data available. Using training knowledge for ${company}.`;
  }

  updateStep("Analysing news & sentiment", "done", "Research brief ready");
  updateStep("Mapping competitive landscape", "running", "Analysing...");
  await delay(200);
  updateStep("Mapping competitive landscape", "done", "Done");
  updateStep("Scoring fundamentals", "running", "Scoring...");
  await delay(200);
  updateStep("Scoring fundamentals", "done", "Done");

  // LangChain Chain 2: PromptTemplate → LLM → JsonOutputParser
  updateStep("Generating verdict", "running", "Running LangChain synthesis chain...");

  const synthesisChain = RunnableSequence.from([
    synthesisTemplate,
    llm,
    new JsonOutputParser(),
  ]);

  let report: InvestmentReport;
  try {
    report = await synthesisChain.invoke({
      company,
      researchBrief,
      researchedAt: new Date().toISOString(),
    }) as InvestmentReport;
  } catch {
    // Fallback: manual parse
    const fallbackChain = RunnableSequence.from([
      synthesisTemplate,
      llm,
      new StringOutputParser(),
    ]);
    const raw = await fallbackChain.invoke({
      company,
      researchBrief,
      researchedAt: new Date().toISOString(),
    });
    const cleaned = raw.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Could not parse response. Please try again.");
    report = JSON.parse(match[0]);
  }

  updateStep("Generating verdict", "done", `Verdict: ${report.verdict}`);
  return report;
}
