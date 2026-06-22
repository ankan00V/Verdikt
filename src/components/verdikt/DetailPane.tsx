"use client";

import type { FindingEntry, ResearchState } from "@/lib/researchTypes";

/* ─── Verdict stamp ──────────────────────────────────────────── */
function VerdictStamp({
  verdict,
}: {
  verdict: NonNullable<ResearchState["verdict"]>;
}) {
  const isInvest = verdict.decision === "INVEST";
  const color = isInvest ? "#10b981" : "#ef4444";
  const bgColor = isInvest ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)";
  const borderColor = isInvest
    ? "rgba(16,185,129,0.25)"
    : "rgba(239,68,68,0.25)";

  return (
    <div className="mb-6 pb-6 border-b border-white/[0.06]">
      {/* Stamp */}
      <div
        className="inline-flex flex-col items-center px-6 py-4 rounded-2xl border mb-4"
        style={{ background: bgColor, borderColor }}
      >
        <span
          className="text-3xl font-bold tracking-[0.15em] uppercase"
          style={{ color }}
        >
          {verdict.decision}
        </span>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs font-mono text-white/40">confidence</span>
          <span className="text-xs font-mono font-semibold" style={{ color }}>
            {Math.round(verdict.confidence * 100)}%
          </span>
        </div>
        {/* Confidence bar */}
        <div className="mt-2 w-full h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.round(verdict.confidence * 100)}%`, background: color }}
          />
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
                className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full"
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
    <div className="flex flex-col gap-3">
      {Object.entries(output).map(([key, val]) => (
        <div key={key}>
          <p className="text-[10px] uppercase tracking-widest text-white/30 font-medium mb-1 font-mono">
            {key.replace(/_/g, " ")}
          </p>
          <p className="text-xs text-white/70 leading-[1.6]">
            {typeof val === "object" ? JSON.stringify(val, null, 2) : String(val)}
          </p>
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
}

export default function DetailPane({
  selectedFinding,
  verdict,
  isPipelineComplete,
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

  // If the user selected the synthesize_decision node and we already have a verdict, we don't need to show the raw JSON
  const isSelectedSynth = selectedFinding?.nodeId === "synthesize_decision";
  const shouldShowFindingRaw = selectedFinding && (!isPipelineComplete || !isSelectedSynth);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium">
          {isPipelineComplete && verdict ? "Verdict" : "Detail"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto slim-scroll px-5 py-5">
        {/* Show verdict if pipeline is done */}
        {isPipelineComplete && verdict && <VerdictStamp verdict={verdict} />}

        {/* Show selected finding detail */}
        {shouldShowFindingRaw && (
          <div className={isPipelineComplete && verdict ? "mt-8 pt-8 border-t border-white/[0.06]" : ""}>
            <p className="text-xs font-semibold text-white mb-3 font-mono">
              {selectedFinding.nodeId}
            </p>
            <p className="text-xs text-white/50 mb-4 leading-[1.6]">
              {selectedFinding.summary}
            </p>
            <OutputBlock output={selectedFinding.output} />
          </div>
        )}
      </div>
    </div>
  );
}
