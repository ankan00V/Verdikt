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

function formatCurrency(val: number | undefined) {
  if (val === undefined || val === null) return "N/A";
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  return `$${val.toLocaleString()}`;
}

function FindingContent({ finding }: { finding: FindingEntry }) {
  const { nodeId, output } = finding;

  if (!output) return <p className="text-[11px] text-white/50 leading-[1.5]">{finding.summary}</p>;

  try {
    switch (nodeId) {
      case "resolve_ticker": {
        const data = output as any;
        if (!data.companyConfirmed) {
          return <p className="text-[11px] text-red-400/80 leading-[1.5] mt-1">Could not resolve a public ticker.</p>;
        }
        return <p className="text-[11px] text-emerald-400/80 leading-[1.5] font-mono mt-1">{String(data.ticker)} confirmed</p>;
      }
      
      case "fetch_financials": {
        const financials = output.financials as any;
        if (financials?.available === false) {
          return <p className="text-[11px] text-[#C9A227]/90 leading-[1.5] mt-1">⚠ Financial data unavailable. FMP free tier covers US-listed equities. Proceeding with news and web research.</p>;
        }
        const data = financials?.data;
        if (!data || !data.incomeStatements || data.incomeStatements.length === 0) {
          return <p className="text-[11px] text-white/50 leading-[1.5] mt-1">No financial data found.</p>;
        }
        const recent = data.incomeStatements[0];
        const metrics = data.keyMetrics || {};
        return (
          <ul className="text-[11px] text-white/60 space-y-0.5 mt-2">
            <li><span className="text-white/40">Revenue:</span> {formatCurrency(recent.revenue)}</li>
            <li><span className="text-white/40">Net Income:</span> {formatCurrency(recent.netIncome)}</li>
            <li><span className="text-white/40">Gross Margin:</span> {recent.grossProfitRatio ? `${(recent.grossProfitRatio * 100).toFixed(1)}%` : "N/A"}</li>
            <li><span className="text-white/40">Debt/Equity:</span> {metrics.debtToEquity ? metrics.debtToEquity.toFixed(2) : "N/A"}</li>
          </ul>
        );
      }

      case "fetch_news": {
        const data = output as any;
        const news = data.news?.results as any[] | undefined;
        if (!news || news.length === 0) return <p className="text-[11px] text-white/50 leading-[1.5] mt-1">No recent news found.</p>;
        return (
          <ul className="text-[11px] text-white/60 space-y-1 mt-2 list-disc pl-3 marker:text-white/20">
            {news.slice(0, 3).map((n, i) => {
              const domain = n.url ? new URL(n.url).hostname.replace('www.', '') : 'News';
              return (
                <li key={i} className="line-clamp-2 leading-[1.4]">
                  {n.title} <span className="text-white/30">— {domain}</span>
                </li>
              );
            })}
          </ul>
        );
      }

      case "fetch_web_research": {
        const data = output as any;
        const web = data.web?.results as any[] | undefined;
        if (!web || web.length === 0) return <p className="text-[11px] text-white/50 leading-[1.5] mt-1">No web research found.</p>;
        return (
          <ul className="text-[11px] text-white/60 space-y-1 mt-2 list-disc pl-3 marker:text-white/20">
            {web.slice(0, 2).map((w, i) => (
              <li key={i} className="line-clamp-2 leading-[1.4]">{w.title}</li>
            ))}
          </ul>
        );
      }

      case "analyze_fundamentals": {
        const fund = output.fundamentalsAnalysis as any;
        if (!fund || fund.error) return <p className="text-[11px] text-white/50 leading-[1.5] mt-1">{fund?.error || "Analysis failed"}</p>;
        return (
          <ul className="text-[11px] text-white/60 space-y-1 mt-2">
            <li className="line-clamp-2"><span className="text-white/40">Growth:</span> {fund.revenueGrowthAssessment}</li>
            <li className="line-clamp-2"><span className="text-white/40">Margins:</span> {fund.marginQuality}</li>
            <li className="line-clamp-2"><span className="text-white/40">Balance Sheet:</span> {fund.balanceSheetHealth}</li>
          </ul>
        );
      }

      case "analyze_sentiment": {
        const sent = output.sentimentAnalysis as any;
        if (!sent || sent.error) return <p className="text-[11px] text-white/50 leading-[1.5] mt-1">Sentiment analysis unavailable.</p>;
        return (
          <ul className="text-[11px] text-white/60 space-y-0.5 mt-2">
            <li><span className="text-white/40">Tone:</span> <span className="text-emerald-400/80">{sent.overallTone}</span></li>
            <li><span className="text-white/40">Momentum:</span> {sent.momentumSignal}</li>
            {sent.controversies?.length > 0 && (
              <li className="text-red-400/70 line-clamp-1 mt-1"><span className="text-red-400/40">Risk:</span> {sent.controversies[0]}</li>
            )}
          </ul>
        );
      }

      case "analyze_competitive_position": {
        const comp = output.competitiveAnalysis as any;
        if (!comp || comp.error) return <p className="text-[11px] text-white/50 leading-[1.5] mt-1">Competitive analysis unavailable.</p>;
        return (
          <ul className="text-[11px] text-white/60 space-y-1 mt-2">
            <li className="line-clamp-2"><span className="text-white/40">Position:</span> {comp.marketPosition}</li>
            <li><span className="text-white/40">Moat:</span> {comp.moatAssessment}</li>
            <li className="line-clamp-1"><span className="text-white/40">Competitors:</span> {comp.keyCompetitors?.join(", ")}</li>
          </ul>
        );
      }

      case "synthesize_decision": {
        const dec = output.finalDecision as any;
        if (!dec) return <p className="text-[11px] text-white/50 leading-[1.5] mt-1">{finding.summary}</p>;
        const color = dec.verdict === "INVEST" ? "text-emerald-400/80" : "text-red-400/80";
        return (
          <p className="text-[11px] text-white/60 leading-[1.5] mt-2 font-mono">
            Verdict synthesized → <span className={color}>{dec.verdict}</span> ({Math.round((dec.confidence || 0) * 100)}% confidence)
          </p>
        );
      }

      default:
        return <p className="text-[11px] text-white/50 leading-[1.5] line-clamp-2 mt-1">{finding.summary}</p>;
    }
  } catch (err) {
    return <p className="text-[11px] text-white/50 leading-[1.5] line-clamp-2 mt-1">{finding.summary}</p>;
  }
}

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
          return (
            <button
              key={finding.nodeId}
              onClick={() => onSelect(finding.nodeId)}
              className={`w-full text-left px-4 py-3 transition-colors hover:bg-white/[0.03] ${
                isSelected ? "bg-white/[0.05] border-l-[2px] border-white/20" : "border-l-[2px] border-transparent"
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
              <FindingContent finding={finding} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
