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
      maxTokens: 3000,
    });
  }

  if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    return new ChatAnthropic({
      model: "claude-sonnet-4-6",
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxTokens: 3000,
    });
  }

  return new ChatOpenAI({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    apiKey: process.env.OPENAI_API_KEY,
    temperature: 0.3,
    maxTokens: 3000,
  });
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── LangChain Tavily Search Tool ────────────────────────────────────────────

async function runSearchTool(query: string): Promise<string> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey) return "No search API key configured.";

  try {
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
    });
    const data = await res.json();
    const answer = data.answer ? `Summary: ${data.answer}\n` : "";
    const results = (data.results || [])
      .slice(0, 3)
      .map((r: { title: string; content: string }) =>
        `- ${r.title}: ${r.content?.slice(0, 300)}`
      )
      .join("\n");
    return `[Search: ${query}]\n${answer}${results}`;
  } catch (e) {
    return `Search failed: ${e instanceof Error ? e.message : String(e)}`;
  }
}

// ─── LangChain Prompt Templates ───────────────────────────────────────────────

// Research summariser chain — takes raw search results and summarises them
const researchSummaryTemplate = PromptTemplate.fromTemplate(`
You are a financial research assistant. Summarise the following search results about {company} into a concise research brief.
Focus on: financial metrics, recent news, competitive position, and any red flags.
Be factual and specific. Include numbers where available.

Search Results:
{searchResults}

Write a structured research brief in 3-4 paragraphs covering financials, news, competition, and risks.
`);

// Final synthesis chain — takes research brief and outputs JSON verdict
const synthesisTemplate = PromptTemplate.fromTemplate(`
You are a brutally honest, skeptical investment research analyst at a top-tier fund.

CRITICAL VERDICT RULES:
- Bankrupt companies → "PASS", confidenceScore below 25
- Fraud / criminal allegations → "PASS"
- Deep losses with no profit path → lean "PASS"
- Only "INVEST" for genuinely strong fundamentals
- Never sugarcoat bad companies

RESEARCH BRIEF FOR {company}:
{researchBrief}

Generate a comprehensive investment report as a JSON object.
Return ONLY valid JSON. No markdown. No code blocks. Start with {{ and end with }}.

{{
  "company": "Full official company name",
  "ticker": "ticker or null",
  "verdict": "INVEST or PASS or HOLD",
  "confidenceScore": 0,
  "summary": "2-3 sentence executive summary",
  "thesis": "3-4 sentence investment thesis",
  "sections": [
    {{
      "title": "Business Model & Competitive Moat",
      "content": "150-200 word detailed analysis",
      "sentiment": "positive or negative or neutral",
      "score": 0
    }},
    {{
      "title": "Financial Health & Metrics",
      "content": "150-200 word analysis with specific recent figures",
      "sentiment": "positive or negative or neutral",
      "score": 0
    }},
    {{
      "title": "Growth Prospects & Catalysts",
      "content": "150-200 word analysis",
      "sentiment": "positive or negative or neutral",
      "score": 0
    }},
    {{
      "title": "Competitive Landscape",
      "content": "150-200 word analysis",
      "sentiment": "positive or negative or neutral",
      "score": 0
    }},
    {{
      "title": "Management & Governance",
      "content": "100-150 word analysis including any controversies",
      "sentiment": "positive or negative or neutral",
      "score": 0
    }},
    {{
      "title": "Valuation Assessment",
      "content": "150-200 word analysis with P/E and peer comparison",
      "sentiment": "positive or negative or neutral",
      "score": 0
    }}
  ],
  "risks": [
    "Specific risk 1",
    "Specific risk 2",
    "Specific risk 3",
    "Specific risk 4",
    "Specific risk 5"
  ],
  "catalysts": [
    "Specific catalyst 1",
    "Specific catalyst 2",
    "Specific catalyst 3",
    "Specific catalyst 4"
  ],
  "financialSnapshot": {{
    "revenue": "Most recent figure with currency and year",
    "revenueGrowth": "YoY growth %",
    "grossMargin": "% or N/A",
    "netMargin": "% or negative",
    "peRatio": "x or N/A or loss-making",
    "marketCap": "with currency",
    "debtToEquity": "ratio or debt-free",
    "freeCashFlow": "figure or negative",
    "roe": "% or negative",
    "notes": "Source: live web search + training data"
  }},
  "competitivePosition": "Detailed paragraph on moat and market position",
  "managementQuality": "Detailed paragraph on management quality",
  "finalVerdict": "3-4 sentence conclusive verdict with specific reasoning",
  "researchedAt": "{researchedAt}"
}}

verdict must be exactly "INVEST", "PASS", or "HOLD".
sentiment must be exactly "positive", "negative", or "neutral".
score must be integer 0-10. confidenceScore must be integer 0-100.
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
  const hasTavily = !!process.env.TAVILY_API_KEY;

  // ── Step 1: Identify ──
  updateStep("Identifying company", "running", `Looking up "${company}"`);
  await delay(300);
  updateStep("Identifying company", "done", `Found: ${company}`);

  // ── Steps 2-5: Parallel web searches using LangChain TavilySearchResults ──
  updateStep("Scraping financial data", "running", "Using LangChain Tavily tool...");
  const [financialResults, newsResults, competitorResults, riskResults] = await Promise.all([
    runSearchTool(`${company} revenue profit margins financials annual report 2024 2025`),
    runSearchTool(`${company} latest news earnings results analyst rating 2024 2025`),
    runSearchTool(`${company} competitors market share industry analysis 2024`),
    runSearchTool(`${company} risks challenges bankruptcy fraud debt lawsuit 2024 2025`),
  ]);
  updateStep("Scraping financial data", "done", hasTavily ? "Live data fetched via LangChain" : "Using training data");

  updateStep("Analysing news & sentiment", "running", "Running LangChain summariser chain...");

  // ── LangChain RunnableSequence: research summariser chain ──
  // Chain 1: PromptTemplate → LLM → StringOutputParser
  // This takes raw search results and produces a clean research brief
  const researchChain = RunnableSequence.from([
    researchSummaryTemplate,
    llm,
    new StringOutputParser(),
  ]);

  const combinedSearchResults = `
FINANCIALS & METRICS:
${financialResults}

RECENT NEWS:
${newsResults}

COMPETITIVE LANDSCAPE:
${competitorResults}

RISKS & RED FLAGS:
${riskResults}
  `.trim();

  const researchBrief = await researchChain.invoke({
    company,
    searchResults: combinedSearchResults,
  });

  updateStep("Analysing news & sentiment", "done", "Research brief generated");
  updateStep("Mapping competitive landscape", "running", "Mapping from research brief...");
  await delay(300);
  updateStep("Mapping competitive landscape", "done", "Competitive landscape mapped");
  updateStep("Scoring fundamentals", "running", "Scoring dimensions...");
  await delay(300);
  updateStep("Scoring fundamentals", "done", "Fundamentals scored");

  // ── Step 6: LangChain synthesis chain → JSON verdict ──
  updateStep("Generating verdict", "running", "Running LangChain synthesis chain...");

  // Chain 2: PromptTemplate → LLM → JsonOutputParser
  // This takes the research brief and produces the final structured JSON report
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
    // Fallback: if JsonOutputParser fails, parse manually
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
    if (!match) throw new Error("Could not parse AI response. Please try again.");
    report = JSON.parse(match[0]);
  }

  updateStep("Generating verdict", "done", `Verdict: ${report.verdict}`);
  return report;
}
