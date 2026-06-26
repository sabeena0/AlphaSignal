"use client";
import { ResearchStep } from "@/lib/agent";

const ICONS: Record<string, string> = {
  "Identifying company": "🔍",
  "Scraping financial data": "📊",
  "Analysing news & sentiment": "📰",
  "Mapping competitive landscape": "🏆",
  "Scoring fundamentals": "⚖️",
  "Generating verdict": "🎯",
  "Research Complete": "✅",
  "Synthesis Complete": "✅",
};

interface StepTrackerProps {
  steps: ResearchStep[];
  company: string;
}

export default function StepTracker({ steps, company }: StepTrackerProps) {
  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-6 text-center">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-3"
          style={{
            background: "var(--accent-dim)",
            color: "var(--accent)",
            border: "1px solid rgba(0,212,170,0.2)",
          }}
        >
          <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" style={{ background: "var(--accent)" }} />
          AGENT RUNNING
        </div>
        <h2
          className="font-display text-2xl font-bold"
          style={{ color: "var(--text)" }}
        >
          Researching{" "}
          <span style={{ color: "var(--accent)" }}>{company}</span>
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--dim)" }}>
          AI agent is gathering and analysing data…
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500"
            style={{
              background:
                step.status === "running"
                  ? "rgba(0,212,170,0.07)"
                  : step.status === "done"
                  ? "rgba(255,255,255,0.02)"
                  : "transparent",
              border:
                step.status === "running"
                  ? "1px solid rgba(0,212,170,0.2)"
                  : "1px solid transparent",
              opacity: step.status === "pending" ? 0.35 : 1,
            }}
          >
            {/* Status icon */}
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
              {step.status === "running" ? (
                <svg
                  className="animate-spin"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="var(--muted)"
                    strokeWidth="3"
                  />
                  <path
                    d="M12 2a10 10 0 0 1 10 10"
                    stroke="var(--accent)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              ) : step.status === "done" ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle cx="12" cy="12" r="10" fill="rgba(16,185,129,0.15)" />
                  <path
                    d="M7 12l4 4 6-7"
                    stroke="#10B981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : step.status === "error" ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="rgba(239,68,68,0.15)" />
                  <path
                    d="M12 8v4m0 4h.01"
                    stroke="#EF4444"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <div
                  className="w-5 h-5 rounded-full border-2"
                  style={{ borderColor: "var(--muted)" }}
                />
              )}
            </div>

            {/* Step info */}
            <div className="flex-1 min-w-0">
              <div
                className="text-sm font-medium"
                style={{
                  color:
                    step.status === "running"
                      ? "var(--accent)"
                      : step.status === "done"
                      ? "var(--text)"
                      : "var(--dim)",
                }}
              >
                {ICONS[step.step] && (
                  <span className="mr-1.5">{ICONS[step.step]}</span>
                )}
                {step.step}
              </div>
              {step.detail && step.status !== "pending" && (
                <div
                  className="text-xs mt-0.5 truncate"
                  style={{ color: "var(--dim)" }}
                >
                  {step.detail}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Scanning line animation */}
      <div
        className="mt-6 h-px w-full overflow-hidden rounded-full"
        style={{ background: "var(--border)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: "30%",
            background: `linear-gradient(90deg, transparent, var(--accent), transparent)`,
            animation: "scan-h 1.8s linear infinite",
          }}
        />
      </div>
      <style>{`
        @keyframes scan-h {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(430%); }
        }
      `}</style>
    </div>
  );
}
