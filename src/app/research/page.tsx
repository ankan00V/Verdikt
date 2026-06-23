"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import ConsoleBar from "@/components/verdikt/ConsoleBar";
import NodeTracker from "@/components/verdikt/NodeTracker";
import FindingsFeed from "@/components/verdikt/FindingsFeed";
import DetailPane from "@/components/verdikt/DetailPane";
import SignalCanvas from "@/components/verdikt/SignalCanvas";
import { useResearch } from "@/lib/useResearch";
import Link from "next/link";

export default function ResearchPage() {
  const [input, setInput] = useState("");
  const [website, setWebsite] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { state, selectedFindingId, setSelectedFindingId, startResearch, reset } =
    useResearch();

  const isPipelineComplete = state?.status === "complete";

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const company = input.trim();
    const url = website.trim();
    if (!company || !url) return;
    startResearch(company, url);
  };

  const handleReset = () => {
    setInput("");
    setWebsite("");
    reset();
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const selectedFinding = state?.findings.find(
    (f) => f.nodeId === selectedFindingId
  ) ?? null;

  return (
    <div className="relative min-h-screen bg-[#0B0E11] text-white flex flex-col overflow-hidden">
      {/* Canvas background */}
      <SignalCanvas />

      <div className="relative z-10 flex flex-col flex-1 h-screen">
        {/* Console bar — always visible */}
        <ConsoleBar startedAt={state?.startedAt ?? null} />

        {/* Back link */}
        <div className="px-6 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <Link
            href="/"
            className="text-xs text-white/40 hover:text-white/70 transition-colors font-mono"
          >
            ← verdikt
          </Link>
          {state && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              New research
            </button>
          )}
        </div>

        {/* Input state — shown when no active research */}
        {!state && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
            <div className="w-full max-w-lg">
              <h1 className="text-2xl font-semibold text-white text-center mb-2 tracking-tight">
                Research a company
              </h1>
              <p className="text-sm text-white/40 text-center mb-8">
                Works best for US-listed public companies.
              </p>

              <form onSubmit={handleSubmit} className="flex gap-3">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter a company name…"
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-5 py-3.5 text-base text-white placeholder-white/25 outline-none focus:border-white/25 focus:bg-white/[0.06] transition-all font-medium"
                />
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="Company website (e.g. apple.com)"
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-5 py-3.5 text-base text-white placeholder-white/25 outline-none focus:border-white/25 focus:bg-white/[0.06] transition-all font-medium"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || !website.trim()}
                  className="flex items-center gap-2 bg-white text-black font-medium text-sm px-5 py-3.5 rounded-xl hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Research
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Recent examples */}
              <div className="mt-6 flex flex-col items-center gap-3">
                <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">Try an example</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    { name: "Apple", url: "apple.com" },
                    { name: "Palantir", url: "palantir.com" },
                    { name: "Nvidia", url: "nvidia.com" },
                    { name: "Shopify", url: "shopify.com" }
                  ].map((ex) => (
                    <button
                      key={ex.name}
                    onClick={() => {
                      setInput(ex.name);
                      setWebsite(ex.url);
                      startResearch(ex.name, ex.url);
                    }}
                    className="text-xs text-white/40 hover:text-white/70 px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 transition-all font-mono"
                  >
                    {ex.name}
                  </button>
                ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active research — 3-pane layout */}
        {state && (
          <div className="flex-1 flex flex-col overflow-hidden px-4 py-4 gap-4">
            {/* Company header */}
            <div className="flex items-center justify-between px-1">
              <div>
                <h1 className="text-lg font-semibold text-white tracking-tight">
                  {state.company}
                </h1>
                {state.ticker && (
                  <p className="text-xs font-mono text-white/40 mt-0.5">
                    {state.ticker}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono px-2.5 py-1 rounded-full border ${
                    isPipelineComplete
                      ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5"
                      : "border-amber-500/30 text-amber-400 bg-amber-500/5"
                  }`}
                >
                  {isPipelineComplete ? "Complete" : "Running…"}
                </span>
              </div>
            </div>

            {/* 3-pane panel */}
            {/* 3-pane panel */}
            <div className="flex-1 overflow-y-auto md:overflow-hidden rounded-2xl border border-white/10 liquid-glass grid grid-cols-1 md:grid-cols-[1fr_2fr] lg:grid-cols-[1fr_1.4fr_1.6fr]">
              {/* Left — node tracker */}
              <div className="md:row-span-2 lg:row-span-1 border-b md:border-b-0 md:border-r border-white/[0.06] overflow-hidden flex flex-col min-h-[250px] md:min-h-0">
                <NodeTracker nodes={state.nodes} />
              </div>

              {/* Middle — findings feed */}
              <div className="border-b lg:border-b-0 lg:border-r border-white/[0.06] overflow-hidden flex flex-col min-h-[350px] md:min-h-0">
                <FindingsFeed
                  findings={state.findings}
                  selectedId={selectedFindingId}
                  onSelect={setSelectedFindingId}
                />
              </div>

              {/* Right — detail / verdict */}
              <div className="overflow-hidden flex flex-col min-h-[400px] md:min-h-0">
                <DetailPane
                  selectedFinding={selectedFinding}
                  verdict={state.verdict}
                  isPipelineComplete={isPipelineComplete}
                  companyProfile={state.findings.find(f => f.nodeId === "fetch_financials")?.output?.companyProfile}
                  onClearSelection={() => setSelectedFindingId(null)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
