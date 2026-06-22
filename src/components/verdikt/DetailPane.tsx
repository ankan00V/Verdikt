"use client";

import type { FindingEntry, ResearchState } from "@/lib/researchTypes";

/* ─── Verdict stamp ──────────────────────────────────────────── */
function VerdictStamp({
  verdict,
  hasFinancialWarning,
}: {
  verdict: NonNullable<ResearchState["verdict"]>;
  hasFinancialWarning?: boolean;
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

      {hasFinancialWarning && verdict.confidence <= 0.55 && (
        <div className="mb-6 px-4 py-3 rounded-xl border border-[#C9A227]/30 bg-[#C9A227]/10 flex items-start gap-3">
          <span className="text-[#C9A227] text-sm mt-0.5">⚠</span>
          <p className="text-xs text-[#C9A227]/90 leading-[1.5]">
            <strong className="font-semibold block mb-0.5 text-[#C9A227]">Limited analysis</strong>
            Financial data was unavailable for this company. Confidence score has been capped.
          </p>
        </div>
      )}

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

/* ─── Generic output renderer ────────────────────────────────── */
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
  hasFinancialWarning?: boolean;
  onClearSelection: () => void;
}

export default function DetailPane({
  selectedFinding,
  verdict,
  isPipelineComplete,
  hasFinancialWarning,
  onClearSelection,
}: DetailPaneProps) {
  if (!selectedFinding && !isPipelineComplete) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-xs text-white/25">
          Select a finding to see its full output
        </p>
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
        {showVerdict && verdict && <VerdictStamp verdict={verdict} hasFinancialWarning={hasFinancialWarning} />}

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
              <OutputBlock output={selectedFinding.output} />
            ) : (
              <p className="text-xs text-white/40 italic">No structured output returned for this node.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
