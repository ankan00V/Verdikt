"use client";

import type { NodeState, NodeStatus } from "@/lib/researchTypes";

function StatusDot({ status, isWarning }: { status: NodeStatus; isWarning?: boolean }) {
  if (status === "complete") {
    if (isWarning) {
      return (
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#C9A227]/15 flex items-center justify-center">
          <span className="text-[10px]" style={{ color: '#C9A227' }}>⚠</span>
        </span>
      );
    }
    return (
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
        <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 12 12">
          <path
            d="M2.5 6l2.5 2.5 5-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (status === "in-progress")
    return (
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/15 flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-amber-400 pulse-dot" />
      </span>
    );
  if (status === "failed")
    return (
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/15 flex items-center justify-center">
        <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 12 12">
          <path
            d="M3 3l6 6M9 3l-6 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  // pending
  return (
    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/5 flex items-center justify-center">
      <span className="w-2 h-2 rounded-full bg-white/20" />
    </span>
  );
}

interface NodeTrackerProps {
  nodes: NodeState[];
}

export default function NodeTracker({ nodes }: NodeTrackerProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium">
          Pipeline
        </p>
      </div>
      <div className="flex-1 overflow-y-auto slim-scroll px-3 py-3 flex flex-col gap-1">
        {nodes.map((node) => {
          const isWarning =
            node.name === "fetch_financials" &&
            node.status === "complete" &&
            (node.output?.financials as Record<string, unknown>)?.available === false;

          return (
            <div
              key={node.name}
              className={`flex items-start gap-2.5 px-2.5 py-2 rounded-lg transition-colors ${
                node.status === "in-progress"
                  ? "bg-amber-500/5 border border-amber-500/15"
                  : node.status === "complete"
                  ? isWarning
                    ? "bg-[#C9A227]/[0.05]"
                    : "bg-emerald-500/[0.03]"
                  : node.status === "failed"
                  ? "bg-red-500/5 border border-red-500/15"
                  : "opacity-40"
              }`}
            >
              <StatusDot status={node.status} isWarning={isWarning} />
              <div className="flex-1 min-w-0">
                <p
                  className={`font-mono text-[11px] leading-tight truncate ${
                    node.status === "in-progress"
                      ? "text-amber-200"
                      : node.status === "complete"
                      ? isWarning
                        ? "text-[#C9A227]/90"
                        : "text-emerald-300/80"
                      : node.status === "failed"
                      ? "text-red-300"
                      : "text-white/30"
                  }`}
                >
                  {node.name}
                </p>
              {node.status === "failed" && node.error && (
                <p className="text-[10px] text-red-400/70 mt-0.5 leading-tight">
                  {node.error}
                </p>
              )}
              {node.status === "complete" && node.completedAt && (
                <p className="text-[10px] text-white/25 mt-0.5 font-mono">
                  {new Date(node.completedAt).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  })}
                </p>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
