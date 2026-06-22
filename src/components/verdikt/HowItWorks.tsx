"use client";

import { motion } from "motion/react";

const NODES = [
  { id: "resolve_ticker", label: "resolve_ticker", status: "complete" },
  { id: "fetch_financials", label: "fetch_financials", status: "complete" },
  { id: "fetch_news", label: "fetch_news", status: "complete" },
  { id: "analyze_fundamentals", label: "analyze_fundamentals", status: "in-progress" },
  { id: "synthesize_decision", label: "synthesize_decision", status: "pending" },
];

const NODE_CHIPS = [
  "resolve_ticker",
  "fetch_financials",
  "fetch_news",
  "analyze_fundamentals",
  "synthesize_decision",
];

function NodeStatusDot({ status }: { status: string }) {
  if (status === "complete")
    return (
      <span className="flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
        <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" viewBox="0 0 10 10">
          <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  if (status === "in-progress")
    return (
      <span className="flex-shrink-0 w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-amber-400 pulse-dot" />
      </span>
    );
  return (
    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-white/5 flex items-center justify-center">
      <span className="w-2 h-2 rounded-full bg-white/20" />
    </span>
  );
}

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 lg:px-16 py-24 md:py-32"
    >
      <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-start">
        {/* Left */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Eyebrow */}
          <div className="flex items-center gap-2.5 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span className="text-xs text-white/70 font-medium">Pipeline</span>
            <span className="px-2 py-0.5 rounded-full border border-white/10 text-white/50 text-xs font-mono">
              LangGraph
            </span>
          </div>

          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.02] text-white">
            Research, not a guess.
            <br />
            <span className="text-white/60">Four stages, every time.</span>
          </h2>

          <p className="mt-6 text-white/60 text-base leading-[1.6] max-w-md">
            The agent runs a real multi-step graph — fetches financials, reads
            news and competitive context, reasons through each independently,
            then synthesizes. Not a single prompt pretending to be analysis.
          </p>

          {/* Node chips */}
          <div
            id="architecture"
            className="mt-8 flex flex-wrap gap-2"
          >
            {NODE_CHIPS.map((chip) => (
              <span
                key={chip}
                className="font-mono text-xs text-white/70 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] hover:border-white/20 transition-colors"
              >
                {chip}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Right — static node tracker preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="liquid-glass rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-white/40 font-medium uppercase tracking-widest">
              Node tracker
            </p>
            <span className="text-[10px] text-white/30 font-mono bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
              Illustrative preview
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {NODES.map(({ id, label, status }) => (
              <div
                key={id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono transition-colors ${
                  status === "in-progress"
                    ? "bg-amber-500/5 border border-amber-500/20"
                    : status === "complete"
                    ? "bg-white/[0.02]"
                    : "opacity-40"
                }`}
              >
                <NodeStatusDot status={status} />
                <span
                  className={
                    status === "in-progress"
                      ? "text-amber-200"
                      : status === "complete"
                      ? "text-white/80"
                      : "text-white/40"
                  }
                >
                  {label}
                </span>
                {status === "in-progress" && (
                  <span className="ml-auto text-amber-400/60 text-[10px]">
                    running…
                  </span>
                )}
                {status === "complete" && (
                  <span className="ml-auto text-emerald-400/60 text-[10px]">
                    done
                  </span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
