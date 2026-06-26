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

  const startResearch = useCallback(async (company: string, website: string, activeThreadId?: string, retryCount: number = 0) => {
    if (retryCount === 0) {
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
    }

    try {
      let currentThreadId = activeThreadId;

      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, website, thread_id: currentThreadId }),
        signal: abortControllerRef.current?.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to start research");
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamEndedNormally = false;

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
              
              if (parsed.type === "thread_created") {
                currentThreadId = parsed.thread_id;
                continue;
              }

              if (parsed.type === "done" || parsed.done) {
                streamEndedNormally = true;
                setState((prev) => prev ? { ...prev, status: "complete" } : prev);
                break;
              }

              if (parsed.type === "error") {
                streamEndedNormally = true;
                console.error("Server sent error:", parsed.message);
                setState((prev) => prev ? { ...prev, status: "error", error: parsed.message } : prev);
                break;
              }

              const nodeName = parsed.node as NodeName;
              const ts = new Date().toISOString();

              if (parsed.type === "node_start") {
                setState((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    nodes: prev.nodes.map((n) =>
                      n.name === nodeName ? { ...n, status: "in-progress" } : n
                    ),
                  };
                });
                setSelectedFindingId(nodeName);
              } else if (parsed.type === "node_complete") {
                const outputData = parsed.data || {};

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

                  if (nodeName === "synthesize_decision" && outputData.decision) {
                    const d = outputData.decision;
                    synthVerdict = {
                      decision: d.verdict as any,
                      confidence: d.confidence / 100,
                      reasoning: d.oneLineRationale,
                      keyFactors: [
                        ...(d.keyStrengths || []).map((s: string) => `Strength: ${s}`),
                        ...(d.keyRisks || []).map((r: string) => `Risk: ${r}`),
                      ],
                    };
                  }

                  let newFindings = [...prev.findings];
                  const existingIndex = newFindings.findIndex((f) => f.nodeId === nodeName);
                  if (existingIndex >= 0) {
                    newFindings[existingIndex] = finding;
                  } else {
                    newFindings.push(finding);
                  }

                  return {
                    ...prev,
                    ticker,
                    verdict: synthVerdict,
                    nodes: prev.nodes.map((n) => {
                      if (n.name === nodeName) return { ...n, status: "complete", output: outputData, completedAt: ts };
                      return n;
                    }),
                    findings: newFindings,
                  };
                });
              }
            } catch (e) {
              console.error("Failed to parse SSE JSON", dataStr, e);
            }
          }
        }
      }

      // If the stream closed but we didn't receive a done or error event, it timed out (e.g., Vercel 60s limit)
      if (!streamEndedNormally) {
        if (retryCount < 10) {
          console.log(`[Research] Connection lost. Auto-reconnecting to thread ${currentThreadId}... (Retry ${retryCount + 1}/10)`);
          setTimeout(() => {
            startResearch(company, website, currentThreadId, retryCount + 1);
          }, 2000);
          return;
        } else {
          setState((prev) => {
            if (!prev) return prev;
            if (prev.status !== "complete" && prev.status !== "error") {
              return {
                ...prev,
                status: "error",
                error: "Connection lost permanently after multiple retries. The server could not complete the request.",
              };
            }
            return prev;
          });
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") return;
      console.error("Research stream error", error);
      setState((prev) => prev ? { ...prev, status: "error", error: error.message || "An unexpected error occurred." } : prev);
    }
  }, []);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(null);
    setSelectedFindingId(null);
  }, []);

  return { state, selectedFindingId, setSelectedFindingId, startResearch, reset };
}
