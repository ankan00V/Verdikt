"use client";

import { useCallback, useRef, useState } from "react";
import {
  createInitialState,
  type FindingEntry,
  type NodeName,
  type ResearchState,
} from "@/lib/researchTypes";

const NODE_MAP: Record<string, NodeName> = {
  resolve_ticker: "resolve_ticker",
  fetch_financials: "fetch_financials",
  fetch_news: "fetch_news",
  fetch_web_research: "fetch_web_research",
  analyze_fundamentals: "analyze_fundamentals",
  analyze_sentiment: "analyze_sentiment",
  analyze_competitive_position: "analyze_competitive_position",
  synthesize_decision: "synthesize_decision",
};

const MOCK_SUMMARIES: Record<NodeName, string> = {
  resolve_ticker: "Resolved company to ticker symbol.",
  fetch_financials: "Fetched quarterly and annual financials from FMP.",
  fetch_news: "Scanned recent news articles.",
  fetch_web_research: "Fetched analyst consensus and price targets.",
  analyze_fundamentals: "Analyzed fundamental trajectory.",
  analyze_sentiment: "Analyzed news and social sentiment.",
  analyze_competitive_position: "Assessed moat and competitive position.",
  synthesize_decision: "Synthesized final investment decision.",
};

export function useResearch() {
  const [state, setState] = useState<ResearchState | null>(null);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startResearch = useCallback(async (company: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const initial = createInitialState(company);
    initial.nodes = initial.nodes.map(n => n.name === "resolve_ticker" ? { ...n, status: "in-progress" } : n);
    setState(initial);
    setSelectedFindingId(null);

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: company }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.body) throw new Error("No response body stream");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const dataStr = line.replace("data: ", "").trim();
          if (!dataStr) continue;

          const payload = JSON.parse(dataStr);

          if (payload.done) {
            setState((prev) => prev ? { ...prev, status: "complete" } : prev);
            break;
          }

          if (payload.error) {
            setState((prev) => prev ? { ...prev, status: "error" } : prev);
            break;
          }

          if (payload.node && payload.data) {
            const mappedNode = NODE_MAP[payload.node];
            if (!mappedNode) continue;

            const ts = new Date().toISOString();
            const output = payload.data;
            const summary = MOCK_SUMMARIES[mappedNode] || mappedNode;

            const finding: FindingEntry = {
              nodeId: mappedNode,
              timestamp: ts,
              summary,
              output,
            };

            setState((prev) => {
              if (!prev) return prev;
              
              const isSynth = mappedNode === "synthesize_decision";
              let newVerdict = prev.verdict;
              if (isSynth) {
                const finalDecision = output.finalDecision || {};
                const breakdown = finalDecision.reasoningBreakdown || {};
                newVerdict = {
                  decision: finalDecision.verdict || "PASS",
                  confidence: finalDecision.confidenceScore || 0,
                  reasoning: finalDecision.summary || "",
                  keyFactors: [
                    breakdown.fundamentals && `Fundamentals: ${breakdown.fundamentals}`,
                    breakdown.sentiment && `Sentiment: ${breakdown.sentiment}`,
                    breakdown.competitive && `Competitive: ${breakdown.competitive}`,
                    breakdown.risks && `Risks: ${breakdown.risks}`
                  ].filter(Boolean) as string[],
                };
              }

              const newNodes = prev.nodes.map((n) => {
                if (n.name === mappedNode) {
                  return { ...n, status: "complete" as const, output, completedAt: ts };
                }
                return n;
              });

              // Infer in-progress states
              const isComplete = (name: NodeName) => newNodes.find(n => n.name === name)?.status === "complete";
              
              const updatedNodes = newNodes.map(n => {
                if (n.status === "complete" || n.status === "failed") return n;
                let inProgress = false;
                switch (n.name) {
                  case "resolve_ticker": inProgress = !isComplete("resolve_ticker"); break;
                  case "fetch_financials":
                  case "fetch_news":
                  case "fetch_web_research":
                    inProgress = isComplete("resolve_ticker");
                    break;
                  case "analyze_fundamentals": inProgress = isComplete("fetch_financials"); break;
                  case "analyze_sentiment": inProgress = isComplete("fetch_news"); break;
                  case "analyze_competitive_position": inProgress = isComplete("fetch_web_research"); break;
                  case "synthesize_decision": 
                    inProgress = isComplete("analyze_fundamentals") || isComplete("analyze_sentiment") || isComplete("analyze_competitive_position"); 
                    break;
                }
                return { ...n, status: inProgress ? "in-progress" as const : "pending" as const };
              });

              return {
                ...prev,
                ticker: mappedNode === "resolve_ticker" ? output.ticker : prev.ticker,
                nodes: updatedNodes,
                findings: [...prev.findings, finding],
                verdict: newVerdict,
              };
            });

            setSelectedFindingId(mappedNode);
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Research stream error:", err);
        setState((prev) => prev ? { ...prev, status: "error" } : prev);
      }
    }
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState(null);
    setSelectedFindingId(null);
  }, []);

  return { state, selectedFindingId, setSelectedFindingId, startResearch, reset };
}
