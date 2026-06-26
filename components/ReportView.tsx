"use client";
import { InvestmentReport } from "@/lib/agent";
import ScoreRing from "./ScoreRing";

interface ReportViewProps {
  report: InvestmentReport;
  onReset: () => void;
}

const sentimentColor = {
  positive: "#10B981",
  negative: "#EF4444",
  neutral: "#F59E0B",
};

const sentimentBg = {
  positive: "rgba(16,185,129,0.08)",
  negative: "rgba(239,68,68,0.08)",
  neutral: "rgba(245,158,11,0.08)",
};

const sentimentLabel = {
  positive: "Bullish",
  negative: "Bearish",
  neutral: "Neutral",
};

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 h-1.5 rounded-full"
        style={{ background: "var(--muted)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${(score / 10) * 100}%`,
            background: color,
            boxShadow: `0 0 6px ${color}88`,
          }}
        />
      </div>
      <span
        className="text-xs font-mono font-bold w-6 text-right"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

function FinancialCard({ report }: { report: InvestmentReport }) {
  const snap = report.financialSnapshot;
  const metrics = [
    { label: "Revenue", value: snap.revenue },
    { label: "Rev Growth", value: snap.revenueGrowth },
    { label: "Gross Margin", value: snap.grossMargin },
    { label: "Net Margin", value: snap.netMargin },
    { label: "P/E Ratio", value: snap.peRatio },
    { label: "Market Cap", value: snap.marketCap },
    { label: "Debt/Equity", value: snap.debtToEquity },
    { label: "Free Cash Flow", value: snap.freeCashFlow },
    { label: "ROE", value: snap.roe },
  ].filter((m) => m.value);

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <h3
        className="font-display font-bold text-lg mb-4"
        style={{ color: "var(--text)" }}
      >
        📊 Financial Snapshot
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {metrics.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl p-3"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              className="text-xs font-mono uppercase tracking-wider mb-1"
              style={{ color: "var(--dim)" }}
            >
              {label}
            </div>
            <div
              className="font-display font-bold text-sm"
              style={{ color: "var(--text)" }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>
      {snap.notes && (
        <p className="text-xs mt-3" style={{ color: "var(--dim)" }}>
          ⚠️ {snap.notes}
        </p>
      )}
    </div>
  );
}

export default function ReportView({ report, onReset }: ReportViewProps) {
  const verdictColor = {
    INVEST: "#10B981",
    PASS: "#EF4444",
    HOLD: "#F59E0B",
  }[report.verdict];

  const avgSectionScore =
    report.sections.reduce((a, s) => a + (s.score || 5), 0) /
    report.sections.length;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-[fadeIn_0.5s_ease_forwards]">
      {/* Header */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
          {/* Company info */}
          <div className="flex-1">
            <div
              className="text-xs font-mono uppercase tracking-widest mb-2"
              style={{ color: "var(--dim)" }}
            >
              INVESTMENT RESEARCH REPORT
            </div>
            <h1
              className="font-display text-3xl md:text-4xl font-bold"
              style={{ color: "var(--text)" }}
            >
              {report.company}
            </h1>
            {report.ticker && (
              <span
                className="inline-block mt-1 px-2 py-0.5 rounded font-mono text-sm font-bold"
                style={{
                  background: "var(--muted)",
                  color: "var(--dim)",
                }}
              >
                {report.ticker}
              </span>
            )}
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
              {report.summary}
            </p>
            <div
              className="text-xs mt-3 font-mono"
              style={{ color: "var(--dim)", opacity: 0.6 }}
            >
              Researched{" "}
              {new Date(report.researchedAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </div>
          </div>

          {/* Score ring */}
          <div className="flex-shrink-0">
            <ScoreRing
              score={report.confidenceScore}
              size={160}
              verdict={report.verdict}
            />
          </div>
        </div>

        {/* Thesis */}
        <div
          className="mt-5 p-4 rounded-xl"
          style={{
            background: `${verdictColor}0D`,
            border: `1px solid ${verdictColor}33`,
          }}
        >
          <div
            className="text-xs font-mono uppercase tracking-widest mb-2"
            style={{ color: verdictColor }}
          >
            INVESTMENT THESIS
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
            {report.thesis}
          </p>
        </div>
      </div>

      {/* Sections grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {report.sections.map((section, i) => (
          <div
            key={i}
            className="rounded-2xl p-5 space-y-3"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-start justify-between gap-2">
              <h3
                className="font-display font-bold text-base leading-snug"
                style={{ color: "var(--text)" }}
              >
                {section.title}
              </h3>
              <span
                className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-mono font-bold"
                style={{
                  background: sentimentBg[section.sentiment],
                  color: sentimentColor[section.sentiment],
                }}
              >
                {sentimentLabel[section.sentiment]}
              </span>
            </div>

            {section.score !== undefined && (
              <ScoreBar
                score={section.score}
                color={sentimentColor[section.sentiment]}
              />
            )}

            <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
              {section.content}
            </p>
          </div>
        ))}
      </div>

      {/* Financial snapshot */}
      <FinancialCard report={report} />

      {/* Risks & Catalysts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Risks */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h3
            className="font-display font-bold text-lg mb-4 flex items-center gap-2"
            style={{ color: "var(--text)" }}
          >
            <span>⚠️</span> Key Risks
          </h3>
          <ul className="space-y-2">
            {report.risks.map((risk, i) => (
              <li key={i} className="flex items-start gap-2">
                <span
                  className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444" }}
                >
                  {i + 1}
                </span>
                <span className="text-sm" style={{ color: "var(--dim)" }}>
                  {risk}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Catalysts */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h3
            className="font-display font-bold text-lg mb-4 flex items-center gap-2"
            style={{ color: "var(--text)" }}
          >
            <span>🚀</span> Growth Catalysts
          </h3>
          <ul className="space-y-2">
            {report.catalysts.map((cat, i) => (
              <li key={i} className="flex items-start gap-2">
                <span
                  className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "rgba(16,185,129,0.15)", color: "#10B981" }}
                >
                  {i + 1}
                </span>
                <span className="text-sm" style={{ color: "var(--dim)" }}>
                  {cat}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Section scores radar / bar summary */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h3
          className="font-display font-bold text-lg mb-4"
          style={{ color: "var(--text)" }}
        >
          📈 Factor Scores
        </h3>
        <div className="space-y-3">
          {report.sections.map((s, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span style={{ color: "var(--dim)" }}>{s.title}</span>
                <span style={{ color: sentimentColor[s.sentiment] }}>
                  {s.score}/10
                </span>
              </div>
              <ScoreBar
                score={s.score || 5}
                color={sentimentColor[s.sentiment]}
              />
            </div>
          ))}
          <div
            className="mt-3 pt-3"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <div className="flex justify-between text-xs font-mono font-bold">
              <span style={{ color: "var(--text)" }}>Overall Score</span>
              <span style={{ color: verdictColor }}>
                {avgSectionScore.toFixed(1)}/10
              </span>
            </div>
            <ScoreBar
              score={Math.round(avgSectionScore)}
              color={verdictColor}
            />
          </div>
        </div>
      </div>

      {/* Final verdict */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: `${verdictColor}0D`,
          border: `1px solid ${verdictColor}44`,
        }}
      >
        <div
          className="text-xs font-mono uppercase tracking-widest mb-3"
          style={{ color: verdictColor }}
        >
          🎯 FINAL VERDICT
        </div>
        <div
          className="font-display text-4xl font-bold mb-3"
          style={{ color: verdictColor }}
        >
          {report.verdict}
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
          {report.finalVerdict}
        </p>
      </div>

      {/* Disclaimer */}
      <div
        className="rounded-xl px-4 py-3 text-xs"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid var(--border)",
          color: "var(--dim)",
        }}
      >
        ⚠️ <strong>Disclaimer:</strong> This report is AI-generated for informational purposes only and does not constitute financial advice. Always conduct your own due diligence before making investment decisions.
      </div>

      {/* Reset button */}
      <div className="flex justify-center pb-8">
        <button
          onClick={onReset}
          className="px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:opacity-80"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            cursor: "pointer",
          }}
        >
          ← Research Another Company
        </button>
      </div>
    </div>
  );
}
