"use client";

import { useState, useRef, FormEvent } from "react";
import { InvestmentReport, ResearchStep } from "@/lib/agent";
import StepTracker from "@/components/StepTracker";
import ReportView from "@/components/ReportView";

const EXAMPLE_COMPANIES = [
  "Apple Inc",
  "Reliance Industries",
  "Nvidia",
  "Zomato",
  "Tesla",
  "HDFC Bank",
  "Amazon",
  "Infosys",
];

type AppState = "idle" | "loading" | "done" | "error";

export default function Home() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<AppState>("idle");
  const [steps, setSteps] = useState<ResearchStep[]>([]);
  const [company, setCompany] = useState("");
  const [report, setReport] = useState<InvestmentReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = async (e: FormEvent | null, override?: string) => {
    if (e) e.preventDefault();
    const companyName = override || query.trim();
    if (!companyName) return;

    // Abort previous request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState("loading");
    setCompany(companyName);
    setSteps([
      { step: "Identifying company", status: "running", detail: `Looking up "${companyName}"` },
      { step: "Scraping financial data", status: "pending" },
      { step: "Analysing news & sentiment", status: "pending" },
      { step: "Mapping competitive landscape", status: "pending" },
      { step: "Scoring fundamentals", status: "pending" },
      { step: "Generating verdict", status: "pending" },
    ]);
    setReport(null);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: companyName }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Server error: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));

            if (payload.type === "step") {
              setSteps((prev) => {
                const existing = prev.findIndex((s) => s.step === payload.step.step);
                if (existing >= 0) {
                  return prev.map((s, i) => (i === existing ? payload.step : s));
                }
                return [...prev, payload.step];
              });
            } else if (payload.type === "report") {
              setReport(payload.report);
            } else if (payload.type === "done") {
              setState("done");
            } else if (payload.type === "error") {
              throw new Error(payload.error);
            }
          } catch (parseErr) {
            // skip malformed lines
            console.warn("Parse error:", parseErr);
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      setState("error");
    }
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setState("idle");
    setQuery("");
    setReport(null);
    setError(null);
    setSteps([]);
  };

  return (
    <main className="min-h-screen px-4 py-8">
      {/* ── Idle state: Landing / Search ── */}
      {state === "idle" && (
        <div className="max-w-2xl mx-auto">
          {/* Logo / brand */}
          <div className="text-center mb-12 pt-12">
            <div
              className="inline-block px-3 py-1 rounded-full text-xs font-mono mb-6"
              style={{
                background: "var(--accent-dim)",
                color: "var(--accent)",
                border: "1px solid rgba(0,212,170,0.2)",
              }}
            >
              POWERED BY LANGGRAPH · AI RESEARCH AGENT
            </div>
            <h1
              className="font-display text-5xl md:text-6xl font-extrabold tracking-tight mb-4"
              style={{ color: "var(--text)", letterSpacing: "-0.02em" }}
            >
              Alpha<span style={{ color: "var(--accent)" }}>Signal</span>
            </h1>
            <p
              className="text-lg max-w-md mx-auto leading-relaxed"
              style={{ color: "var(--dim)" }}
            >
              Enter any company. Our AI agent researches it end-to-end and delivers a
              clear{" "}
              <span style={{ color: "#10B981" }}>INVEST</span> /{" "}
              <span style={{ color: "#EF4444" }}>PASS</span> /{" "}
              <span style={{ color: "#F59E0B" }}>HOLD</span> verdict with reasoning.
            </p>
          </div>

          {/* Search form */}
          <form onSubmit={handleSubmit} className="relative mb-6">
            <div
              className="flex items-center rounded-2xl overflow-hidden"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                boxShadow: "0 0 0 0px rgba(0,212,170,0)",
                transition: "box-shadow 0.2s",
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  "0 0 0 2px rgba(0,212,170,0.3)";
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  "0 0 0 0px rgba(0,212,170,0)";
              }}
            >
              <span className="pl-5 text-xl" style={{ color: "var(--dim)" }}>
                🔍
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter company name (e.g. Reliance Industries, Apple, Zomato)"
                className="flex-1 bg-transparent px-4 py-5 text-base outline-none"
                style={{ color: "var(--text)" }}
                autoFocus
              />
              <button
                type="submit"
                disabled={!query.trim()}
                className="m-2 px-6 py-3 rounded-xl font-display font-bold text-sm transition-all duration-200"
                style={{
                  background: query.trim() ? "var(--accent)" : "var(--muted)",
                  color: query.trim() ? "#0A0B0E" : "var(--dim)",
                  cursor: query.trim() ? "pointer" : "not-allowed",
                }}
              >
                Analyse →
              </button>
            </div>
          </form>

          {/* Example chips */}
          <div className="flex flex-wrap gap-2 justify-center mb-16">
            <span
              className="text-xs font-mono mr-1"
              style={{ color: "var(--dim)" }}
            >
              Try:
            </span>
            {EXAMPLE_COMPANIES.map((co) => (
              <button
                key={co}
                onClick={() => {
                  setQuery(co);
                  handleSubmit(null, co);
                }}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 hover:opacity-80"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--dim)",
                  cursor: "pointer",
                }}
              >
                {co}
              </button>
            ))}
          </div>

          {/* How it works */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h2
              className="font-display font-bold text-lg mb-5"
              style={{ color: "var(--text)" }}
            >
              How AlphaSignal works
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: "🌐",
                  title: "Deep Research",
                  desc: "LangGraph agent uses web search tools to gather financials, news, competitor analysis, and management data.",
                },
                {
                  icon: "⚖️",
                  title: "Structured Analysis",
                  desc: "6 scored dimensions: Business Model, Financials, Growth, Competitive Landscape, Management, and Valuation.",
                },
                {
                  icon: "🎯",
                  title: "Clear Verdict",
                  desc: "A confidence-scored INVEST / PASS / HOLD decision with detailed reasoning and risk/catalyst breakdown.",
                },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="space-y-2">
                  <div className="text-2xl">{icon}</div>
                  <div
                    className="font-display font-bold text-sm"
                    style={{ color: "var(--text)" }}
                  >
                    {title}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Loading state ── */}
      {state === "loading" && (
        <div className="max-w-2xl mx-auto pt-16">
          <StepTracker steps={steps} company={company} />
          <div className="text-center mt-8">
            <button
              onClick={handleReset}
              className="text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-70"
              style={{
                color: "var(--dim)",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Error state ── */}
      {state === "error" && (
        <div className="max-w-lg mx-auto pt-24 text-center space-y-4">
          <div className="text-5xl">⚠️</div>
          <h2
            className="font-display text-2xl font-bold"
            style={{ color: "var(--text)" }}
          >
            Research Failed
          </h2>
          <p className="text-sm" style={{ color: "var(--dim)" }}>
            {error || "An unexpected error occurred."}
          </p>
          <p className="text-xs" style={{ color: "var(--dim)" }}>
            Make sure your API keys are configured correctly in <code>.env.local</code>
          </p>
          <button
            onClick={handleReset}
            className="px-6 py-3 rounded-xl font-medium"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* ── Done state ── */}
      {state === "done" && report && (
        <ReportView report={report} onReset={handleReset} />
      )}
    </main>
  );
}
