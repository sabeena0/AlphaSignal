"use client";

interface ScoreRingProps {
  score: number; // 0-100
  size?: number;
  strokeWidth?: number;
  verdict: "INVEST" | "PASS" | "HOLD";
}

const verdictColor = {
  INVEST: "#10B981",
  PASS: "#EF4444",
  HOLD: "#F59E0B",
};

const verdictLabel = {
  INVEST: "INVEST",
  PASS: "PASS",
  HOLD: "HOLD",
};

export default function ScoreRing({
  score,
  size = 160,
  strokeWidth = 12,
  verdict,
}: ScoreRingProps) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = verdictColor[verdict];

  return (
    <div className="relative flex flex-col items-center gap-2">
      <svg width={size} height={size} className="rotate-[-90deg]">
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)",
            filter: `drop-shadow(0 0 8px ${color}66)`,
          }}
        />
      </svg>

      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display font-bold leading-none"
          style={{ fontSize: size * 0.22, color }}
        >
          {score}
        </span>
        <span
          className="font-mono font-bold tracking-widest uppercase"
          style={{ fontSize: size * 0.09, color, opacity: 0.8 }}
        >
          / 100
        </span>
      </div>

      {/* Verdict badge */}
      <div
        className="px-4 py-1 rounded-full font-display font-bold tracking-widest text-sm uppercase"
        style={{
          background: `${color}22`,
          color,
          border: `1px solid ${color}44`,
          letterSpacing: "0.15em",
        }}
      >
        {verdictLabel[verdict]}
      </div>
    </div>
  );
}
