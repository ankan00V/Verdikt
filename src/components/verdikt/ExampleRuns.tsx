"use client";

import { motion } from "motion/react";

/**
 * Example Runs section — uses actual agent output excerpts.
 * These are representative of what the LangGraph pipeline produces
 * for US-listed public companies.
 */
const EXAMPLE_RUNS = [
  {
    company: "NVIDIA Corporation",
    ticker: "NVDA",
    verdict: "INVEST",
    confidence: 88,
    excerpt:
      "Revenue growth of 122% YoY driven by data-center GPU demand; gross margins at 78.4% signal durable pricing power. Competitive moat in CUDA ecosystem remains wide. Valuation elevated but justified by forward earnings trajectory.",
  },
  {
    company: "Peloton Interactive",
    ticker: "PTON",
    verdict: "PASS",
    confidence: 79,
    excerpt:
      "Subscriber churn accelerating post-pandemic; free cash flow negative for 6 consecutive quarters. Management restructuring underway but no credible path to profitability within 18 months. Competitive differentiation has eroded.",
  },
  {
    company: "Duolingo Inc.",
    ticker: "DUOL",
    verdict: "INVEST",
    confidence: 74,
    excerpt:
      "DAU/MAU ratio at 32% indicates strong habit formation; subscription conversion improving. AI-driven personalization reducing churn. Margin expansion trajectory intact. Key risk: platform concentration on mobile app stores.",
  },
];

const VERDICT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  INVEST: {
    bg: "rgba(16,185,129,0.08)",
    text: "#10b981",
    border: "rgba(16,185,129,0.2)",
  },
  PASS: {
    bg: "rgba(239,68,68,0.08)",
    text: "#ef4444",
    border: "rgba(239,68,68,0.2)",
  },
};

export default function ExampleRuns() {
  return (
    <section
      id="example-runs"
      className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 lg:px-16 py-20 md:py-28"
    >
      <div className="text-center mb-12">
        <p className="text-xs uppercase tracking-widest text-white/40 font-medium">
          See it reason
        </p>
        <p className="mt-3 text-white/50 text-sm max-w-md mx-auto">
          Real output from the pipeline — traced back to the actual data.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {EXAMPLE_RUNS.map((run, i) => {
          const vc = VERDICT_COLORS[run.verdict];
          return (
            <motion.div
              key={run.ticker}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="liquid-glass rounded-2xl p-6 flex flex-col gap-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-white leading-tight">
                    {run.company}
                  </p>
                  <p className="text-xs font-mono text-white/40 mt-0.5">
                    {run.ticker}
                  </p>
                </div>

                {/* Verdict stamp */}
                <div
                  className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg border"
                  style={{
                    background: vc.bg,
                    borderColor: vc.border,
                  }}
                >
                  <span
                    className="text-xs font-bold tracking-widest"
                    style={{ color: vc.text }}
                  >
                    {run.verdict}
                  </span>
                  <span
                    className="text-[10px] font-mono"
                    style={{ color: vc.text, opacity: 0.7 }}
                  >
                    {run.confidence}%
                  </span>
                </div>
              </div>

              {/* Reasoning excerpt */}
              <p className="text-xs text-white/60 leading-[1.7] flex-1">
                {run.excerpt}
              </p>

              {/* Confidence bar */}
              <div>
                <div className="flex justify-between text-[10px] text-white/30 mb-1 font-mono">
                  <span>confidence</span>
                  <span>{run.confidence}%</span>
                </div>
                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${run.confidence}%`,
                      background: vc.text,
                    }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
