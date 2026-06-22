"use client";

import type { FindingEntry, ResearchState } from "@/lib/researchTypes";

/* ─── Verdict stamp ──────────────────────────────────────────── */
function VerdictStamp({
  verdict,
}: {
  verdict: NonNullable<ResearchState["verdict"]>;
}) {
  const isInvest = verdict.decision === "INVEST";
  
  // Stamp specific styling
  const stampBgColor = isInvest ? "#1A5F3F" : "#8B2635";
  const stampBorderColor = isInvest ? "#237A52" : "#A72E40";
  const stampRotation = isInvest ? "rotate-2" : "-rotate-2";
  
  const color = isInvest ? "#10b981" : "#ef4444";

  return (
    <div className="mb-6 pb-6 border-b border-white/[0.06]">
      {/* Stamp Card container */}
      <div
        className="flex flex-col items-center px-6 py-6 rounded-2xl border mb-6 shadow-xl bg-white/[0.02]"
        style={{ borderColor: "rgba(255,255,255,0.05)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
      >
        {/* Rotated Stamp Word */}
        <div 
          className={`px-5 py-2 rounded-lg border-2 ${stampRotation} shadow-lg mb-5 flex items-center justify-center`}
          style={{ backgroundColor: stampBgColor, borderColor: stampBorderColor }}
        >
          <span className="text-4xl font-black tracking-[0.15em] uppercase text-white shadow-sm">
            {verdict.decision}
          </span>
        </div>

        {/* Confidence bar */}
        <div className="w-full px-2">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-mono text-white/40">confidence</span>
            <span className="text-xs font-mono font-semibold" style={{ color }}>
              {Math.round(verdict.confidence * 100)}%
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.round(verdict.confidence * 100)}%`, background: color }}
            />
          </div>
        </div>
      </div>

      {/* Reasoning */}
      <p className="text-sm text-white/70 leading-[1.7]">{verdict.reasoning}</p>

      {/* Key factors */}
      {verdict.keyFactors && verdict.keyFactors.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {verdict.keyFactors.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-white/55">
              <span
                className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full"
                style={{ background: color }}
              />
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── Output renderers ───────────────────────────────────────── */
function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "N/A";
  if (Math.abs(num) >= 1e9) {
    return `$${(num / 1e9).toFixed(2)}B`;
  }
  if (Math.abs(num) >= 1e6) {
    return `$${(num / 1e6).toFixed(2)}M`;
  }
  return `$${num.toFixed(2)}`;
}

function getHostname(urlStr: string) {
  try {
    return new URL(urlStr).hostname;
  } catch {
    return urlStr;
  }
}

function Section({ title, content }: { title: string; content: any }) {
  if (!content || (Array.isArray(content) && content.length === 0)) return null;
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 mb-4">
      <h4 className="text-[10px] uppercase tracking-widest text-white/40 font-medium mb-2 font-mono">{title}</h4>
      <div className="text-xs text-white/70 leading-[1.6]">{content}</div>
    </div>
  );
}

function renderFindingDetail(nodeId: string, output: Record<string, any>) {
  switch (nodeId) {
    case "resolve_ticker": {
      const p = output.companyProfile;
      const t = output.ticker;
      return (
        <div className="flex flex-col gap-4">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4">
                <span className="text-xs text-white/40 font-mono w-20">Ticker:</span>
                <span className="text-sm font-semibold">{p?.ticker || t || "N/A"}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-white/40 font-mono w-20">Company:</span>
                <span className="text-sm">{p?.name || output.companyName || "Resolved successfully"}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-white/40 font-mono w-20">Exchange:</span>
                <span className="text-sm">{p?.exchange || "Pending details"}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    case "fetch_financials": {
      const p = output.companyProfile;
      const inc = output.financials?.incomeStatements?.[0] || {};
      const metrics = output.financials?.keyMetrics || {};
      return (
        <div className="flex flex-col gap-4">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40 font-mono">Revenue (TTM):</span>
                <span className="text-sm">{formatNumber(inc.revenue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40 font-mono">Net Income:</span>
                <span className="text-sm">{formatNumber(inc.netIncome)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40 font-mono">Gross Margin:</span>
                <span className="text-sm">
                  {inc.grossProfitRatio !== null && inc.grossProfitRatio !== undefined
                    ? `${(inc.grossProfitRatio * 100).toFixed(1)}%`
                    : "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40 font-mono">Debt / Equity:</span>
                <span className="text-sm">
                  {metrics.debtToEquity !== null && metrics.debtToEquity !== undefined
                    ? metrics.debtToEquity.toFixed(2)
                    : "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40 font-mono">Market Cap:</span>
                <span className="text-sm">{formatNumber(p?.marketCap)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40 font-mono">Sector:</span>
                <span className="text-sm">{p?.sector || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40 font-mono">Exchange:</span>
                <span className="text-sm">{p?.exchange || "N/A"}</span>
              </div>
            </div>
            {p?.description && (
              <p className="text-xs text-white/50 leading-relaxed border-t border-white/5 pt-4">
                {p.description}
              </p>
            )}
          </div>
        </div>
      );
    }
    case "fetch_news":
    case "fetch_web_research": {
      const results = output.newsResults || output.webResearchResults || [];
      if (!results.length) return <p className="text-sm text-white/40 italic">No results found.</p>;
      return (
        <div className="flex flex-col gap-4">
          {results.map((r: any, i: number) => (
            <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 flex flex-col gap-2">
              <h4 className="text-sm font-semibold text-white/90 leading-snug">{r.title}</h4>
              <p className="text-[10px] font-mono text-emerald-400/80">
                {getHostname(r.url)} {r.publishedDate ? `· ${new Date(r.publishedDate).toLocaleDateString()}` : ""}
              </p>
              <p className="text-xs text-white/60 leading-relaxed mt-1">
                {r.content.length > 250 ? `${r.content.substring(0, 250)}...` : r.content}
              </p>
            </div>
          ))}
        </div>
      );
    }
    case "analyze_fundamentals": {
      const f = output.fundamentalsAnalysis || {};
      return (
        <div className="flex flex-col">
          <Section title="GROWTH" content={f.revenueGrowthAssessment} />
          <Section title="MARGINS" content={f.marginQuality} />
          <Section title="BALANCE SHEET" content={f.balanceSheetHealth} />
          <Section title="VALUATION" content={f.valuationComment} />
          <Section title="KEY RISKS" content={
            <ul className="list-disc pl-4 space-y-1">
              {(f.keyNumbers || []).map((n: string, i: number) => <li key={i}>{n}</li>)}
            </ul>
          } />
        </div>
      );
    }
    case "analyze_sentiment": {
      const s = output.sentimentAnalysis || {};
      return (
        <div className="flex flex-col">
          <Section title="OVERALL TONE" content={<span className="capitalize font-semibold">{s.overallTone || "Unknown"}</span>} />
          <Section title="MOMENTUM" content={s.momentumSignal} />
          <Section title="KEY POSITIVE SIGNALS" content={
            <ul className="list-disc pl-4 space-y-1">
              {(s.recentDevelopments || []).map((d: string, i: number) => <li key={i}>{d}</li>)}
            </ul>
          } />
          <Section title="KEY RISK SIGNALS" content={
            <ul className="list-disc pl-4 space-y-1">
              {(s.controversies || []).map((c: string, i: number) => <li key={i}>{c}</li>)}
            </ul>
          } />
        </div>
      );
    }
    case "analyze_competitive_position": {
      const c = output.competitiveAnalysis || {};
      return (
        <div className="flex flex-col">
          <Section title="ECONOMIC MOAT" content={c.moatAssessment} />
          <Section title="MARKET POSITION" content={c.marketPosition} />
          <Section title="KEY COMPETITORS" content={
            <ul className="list-disc pl-4 space-y-1">
              {(c.keyCompetitors || []).map((comp: string, i: number) => <li key={i}>{comp}</li>)}
            </ul>
          } />
          <Section title="COMPETITIVE RISKS" content={
            <ul className="list-disc pl-4 space-y-1">
              {(c.competitiveRisks || []).map((risk: string, i: number) => <li key={i}>{risk}</li>)}
            </ul>
          } />
        </div>
      );
    }
    case "gather_data":
      return <p className="text-xs text-emerald-400/80 font-mono mt-4">Pipeline synchronization complete.</p>;
    case "synthesize_decision":
      return (
        <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
          <p className="text-sm text-white/80">
            Verdict: <span className="font-bold">{output.decision?.verdict || "N/A"}</span> · Confidence: {output.decision?.confidence || 0}%
          </p>
          <p className="text-xs text-white/50 mt-2">See verdict pane for full reasoning.</p>
        </div>
      );
    default:
      return <OutputBlock output={output} />;
  }
}

function OutputBlock({ output }: { output: Record<string, unknown> }) {
  return (
    <div className="flex flex-col gap-4">
      {Object.entries(output).map(([key, val]) => (
        <div key={key} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium mb-2 font-mono">
            {key.replace(/_/g, " ")}
          </p>
          {typeof val === "object" ? (
            <pre className="text-xs text-white/70 leading-[1.6] overflow-x-auto font-mono whitespace-pre-wrap">
              {JSON.stringify(val, null, 2)}
            </pre>
          ) : (
            <p className="text-xs text-white/70 leading-[1.6]">
              {String(val)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Detail pane ────────────────────────────────────────────── */
interface DetailPaneProps {
  selectedFinding: FindingEntry | null;
  verdict: ResearchState["verdict"] | undefined;
  isPipelineComplete: boolean;
  onClearSelection: () => void;
}

export default function DetailPane({
  selectedFinding,
  verdict,
  isPipelineComplete,
  onClearSelection,
}: DetailPaneProps) {
  if (!selectedFinding && !isPipelineComplete) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center h-full">
        <div className="relative flex items-center justify-center w-16 h-16 mb-2">
          {/* Outer rotating ring */}
          <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500/40 border-r-2 border-transparent animate-spin" style={{ animationDuration: '3s' }} />
          {/* Inner rotating ring (reverse) */}
          <div className="absolute inset-2 rounded-full border-b-2 border-emerald-400/30 border-l-2 border-transparent animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
          {/* Center pulse */}
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
        </div>
        <p className="text-sm text-emerald-400/80 font-mono tracking-widest uppercase animate-pulse">
          Verdikt is analyzing
        </p>
        <div className="text-xs text-white/40 mt-2 max-w-[260px] leading-relaxed">
          The AI is currently processing financial data, news, and market sentiment...
          <div className="mt-4 text-white/25 italic">
            Click any finding on the left to inspect its output while you wait.
          </div>
        </div>
      </div>
    );
  }

  const isSelectedSynth = selectedFinding?.nodeId === "synthesize_decision";
  
  // Determine what to show in the right pane.
  // If the pipeline is complete, and no finding is selected (or synthesize_decision is selected), show the Verdict.
  // Otherwise, show the selected finding's raw output.
  const showVerdict = isPipelineComplete && verdict && (!selectedFinding || isSelectedSynth);
  const showFindingDetail = selectedFinding && !showVerdict;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium">
          {showVerdict ? "Verdict" : "Detail"}
        </p>
        
        {/* Back/Close button when viewing a node detail after completion */}
        {showFindingDetail && isPipelineComplete && (
          <button 
            onClick={onClearSelection}
            className="text-[10px] font-mono text-white/40 hover:text-white/80 transition-colors flex items-center gap-1"
          >
            ← Verdict
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto slim-scroll px-5 py-5">
        {/* Show verdict */}
        {showVerdict && verdict && <VerdictStamp verdict={verdict} />}

        {/* Show selected finding detail */}
        {showFindingDetail && selectedFinding && (
          <div>
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-white mb-2 font-mono">
                {selectedFinding.nodeId}
              </h3>
              <p className="text-xs text-white/50 leading-[1.6]">
                {selectedFinding.summary}
              </p>
            </div>
            
            {selectedFinding.output ? (
              renderFindingDetail(selectedFinding.nodeId, selectedFinding.output)
            ) : (
              <p className="text-xs text-white/40 italic">No structured output returned for this node.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
