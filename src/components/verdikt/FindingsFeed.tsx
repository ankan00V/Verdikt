"use client";

import type { FindingEntry } from "@/lib/researchTypes";

const NODE_LABELS: Record<string, string> = {
  resolve_ticker: "Ticker resolved",
  fetch_financials: "Financials fetched",
  fetch_news: "News fetched",
  fetch_web_research: "Web research done",
  analyze_fundamentals: "Fundamentals analyzed",
  analyze_sentiment: "Sentiment analyzed",
  analyze_competitive_position: "Competitive position",
  synthesize_decision: "Verdict synthesized",
};

interface FindingsFeedProps {
  findings: FindingEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function FindingsFeed({
  findings,
  selectedId,
  onSelect,
}: FindingsFeedProps) {
  if (findings.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
          <span className="w-3 h-3 rounded-full bg-white/20 pulse-dot" />
        </div>
        <p className="text-xs text-white/30">Waiting for first node…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium">
          Findings
        </p>
      </div>
      <div className="flex-1 overflow-y-auto slim-scroll divide-y divide-white/[0.04]">
        {findings.map((finding) => {
          const isSelected = selectedId === finding.nodeId;
          
          let displaySummary = finding.summary;
          if (finding.nodeId === "fetch_financials" && (finding.output?.financials as Record<string, unknown>)?.available === false) {
            displaySummary = "Financial data unavailable for this company. FMP free tier covers US-listed equities. Proceeding with news and web research.";
          }

          return (
            <button
              key={finding.nodeId}
              onClick={() => onSelect(finding.nodeId)}
              className={`w-full text-left px-4 py-3 transition-colors hover:bg-white/[0.03] ${
                isSelected ? "bg-white/[0.05]" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-white/80 truncate">
                  {NODE_LABELS[finding.nodeId] ?? finding.nodeId}
                </span>
                <span className="text-[10px] font-mono text-white/30 flex-shrink-0 ml-2">
                  {new Date(finding.timestamp).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  })}
                </span>
              </div>
              <p className="text-[11px] text-white/50 leading-[1.5] line-clamp-2">
                {displaySummary}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
