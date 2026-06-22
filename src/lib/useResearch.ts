"use client";

import { useCallback, useRef, useState } from "react";
import {
  createInitialState,
  type FindingEntry,
  type NodeName,
  type ResearchState,
} from "@/lib/researchTypes";

const NODE_SUMMARIES: Record<string, string> = {
  resolve_ticker: "Identified and verified public market trading symbol.",
  fetch_financials: "Extracted income statement, balance sheet, and key metrics.",
  fetch_news: "Scanned breaking news and recent press releases.",
  fetch_web_research: "Aggregated market consensus and competitive data.",
  analyze_fundamentals: "Evaluated balance sheet health and growth metrics.",
  analyze_sentiment: "Quantified market tone and identified controversies.",
  analyze_competitive_position: "Assessed economic moat and industry positioning.",
  synthesize_decision: "Aggregated signals into final investment verdict.",
};

const NODES_IN_ORDER: NodeName[] = [
  "resolve_ticker",
  "fetch_financials",
  "fetch_news",
  "fetch_web_research",
  "analyze_fundamentals",
  "analyze_sentiment",
  "analyze_competitive_position",
  "synthesize_decision",
];

export function useResearch() {
  const [state, setState] = useState<ResearchState | null>(null);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startResearch = useCallback(async (company: string) => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const initial = createInitialState(company);
    setState(initial);
    setSelectedFindingId(null);

    // Set first node to in-progress immediately
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.name === "resolve_ticker" ? { ...n, status: "in-progress" } : n
        ),
      };
    });

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: company }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;
            
            try {
              const parsed = JSON.parse(dataStr);
              
              if (parsed.done) {
                setState((prev) => prev ? { ...prev, status: "complete" } : prev);
                break;
              }

              const nodeName = parsed.node as NodeName;
              const outputData = parsed.data;
              const ts = new Date().toISOString();

              const finding: FindingEntry = {
                nodeId: nodeName,
                timestamp: ts,
                summary: NODE_SUMMARIES[nodeName] || `Completed ${nodeName}`,
                output: outputData,
              };

              setState((prev) => {
                if (!prev) return prev;
                
                let synthVerdict = prev.verdict;
                let ticker = prev.ticker;
                
                if (nodeName === "resolve_ticker" && outputData.ticker) {
                  ticker = outputData.ticker;
                }

                if (nodeName === "synthesize_decision" && outputData.finalDecision) {
                  const fd = outputData.finalDecision;
                  synthVerdict = {
                    decision: fd.verdict as any,
                    confidence: fd.confidenceScore,
                    reasoning: fd.summary,
                    keyFactors: fd.reasoningBreakdown 
                      ? Object.entries(fd.reasoningBreakdown).map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)
                      : [],
                  };
                }

                const nextNodeName = NODES_IN_ORDER[NODES_IN_ORDER.indexOf(nodeName) + 1];

                return {
                  ...prev,
                  ticker,
                  verdict: synthVerdict,
                  nodes: prev.nodes.map((n) => {
                    if (n.name === nodeName) return { ...n, status: "complete", output: outputData, completedAt: ts };
                    if (n.name === nextNodeName) return { ...n, status: "in-progress" };
                    return n;
                  }),
                  findings: [...prev.findings, finding],
                };
              });

              setSelectedFindingId(nodeName);
            } catch (e) {
              console.error("Failed to parse SSE JSON", dataStr, e);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") return;
      console.error("Research stream error", error);
      setState((prev) => prev ? { ...prev, status: "error" } : prev);
    }
  }, []);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(null);
    setSelectedFindingId(null);
  }, []);

  return { state, selectedFindingId, setSelectedFindingId, startResearch, reset };
}
