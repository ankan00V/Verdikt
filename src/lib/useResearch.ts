"use client";

import { useCallback, useRef, useState } from "react";
import {
  createInitialState,
  type FindingEntry,
  type NodeName,
  type ResearchState,
} from "@/lib/researchTypes";

/**
 * useResearch — drives the research pipeline via SSE.
 *
 * The SSE endpoint at /api/research streams JSON events of shape:
 *   { type: "node_start" | "node_complete" | "node_error" | "done", payload: {...} }
 *
 * Until the real backend is wired up, this hook also contains a
 * mock-streaming simulation so the UI works end-to-end in demo mode.
 */
export function useResearch() {
  const [state, setState] = useState<ResearchState | null>(null);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const startResearch = useCallback((company: string) => {
    // Close any existing connection
    esRef.current?.close();

    const initial = createInitialState(company);
    setState(initial);
    setSelectedFindingId(null);

    /* ── Demo/mock mode ──────────────────────────────────────────
       Replace this block with a real EventSource pointing to
       /api/research?company=... once the backend is wired.
    ────────────────────────────────────────────────────────────── */
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

    const MOCK_OUTPUTS: Partial<Record<NodeName, Record<string, unknown>>> = {
      resolve_ticker: {
        ticker: company.toUpperCase().slice(0, 5).replace(/\s/g, ""),
        exchange: "NASDAQ",
        full_name: company,
      },
      fetch_financials: {
        revenue_growth_yoy: "34.2%",
        gross_margin: "67.1%",
        free_cash_flow: "$4.2B",
        debt_to_equity: "0.41",
        pe_ratio: "28.3",
      },
      fetch_news: {
        sentiment: "Mildly positive",
        top_story:
          "Company beats Q2 earnings expectations; raises full-year guidance.",
        articles_scanned: 24,
      },
      fetch_web_research: {
        analyst_consensus: "Buy (14 analysts)",
        price_target_avg: "$312",
        recent_insider_activity: "Neutral",
      },
      analyze_fundamentals: {
        revenue_quality: "High — recurring SaaS model, low churn",
        margin_trajectory: "Expanding — 200bps improvement YoY",
        balance_sheet: "Strong — net cash position, no near-term maturities",
        fcf_conversion: "89% — well above sector median",
      },
      analyze_sentiment: {
        news_score: 0.72,
        social_score: 0.61,
        analyst_revision_trend: "Upward over past 90 days",
        earnings_surprise_history: "Beat 6 of last 8 quarters",
      },
      analyze_competitive_position: {
        moat_assessment: "Narrow-to-wide switching costs and network effects",
        market_share_trend: "Gaining — +3pp over past 2 years",
        key_risks: "Platform concentration, macro slowdown sensitivity",
      },
      synthesize_decision: {
        decision: "INVEST",
        confidence: 81,
        reasoning:
          "Strong fundamental trajectory with durable competitive advantages. Revenue quality is high, margins expanding, and analyst sentiment is constructive. Valuation is not stretched relative to forward growth. Key risk is macro sensitivity, which we view as manageable given the balance sheet strength.",
        key_factors: [
          "FCF conversion at 89% — well above sector median",
          "Analyst consensus: Buy across 14 coverage desks",
          "Gross margin expansion of 200bps YoY signals pricing power",
          "Net cash position removes near-term financing risk",
        ],
      },
    };

    const MOCK_SUMMARIES: Partial<Record<NodeName, string>> = {
      resolve_ticker: `Resolved "${company}" to ticker symbol.`,
      fetch_financials:
        "Fetched quarterly and annual financials from FMP. Revenue growth strong, margins healthy.",
      fetch_news:
        "Scanned 24 recent articles. Sentiment mildly positive — earnings beat drove coverage.",
      fetch_web_research:
        "Analyst consensus: Buy. Price target average $312. Insider activity neutral.",
      analyze_fundamentals:
        "Fundamentals solid — high FCF conversion, expanding margins, strong balance sheet.",
      analyze_sentiment:
        "Sentiment favorable across news and analyst revision trends.",
      analyze_competitive_position:
        "Narrow-to-wide moat. Gaining market share. Key risk: platform concentration.",
      synthesize_decision:
        "INVEST — 81% confidence. Strong fundamentals and favorable competitive dynamics outweigh macro risks.",
    };

    let nodeIndex = 0;

    const processNextNode = () => {
      if (nodeIndex >= NODES_IN_ORDER.length) return;
      const nodeName = NODES_IN_ORDER[nodeIndex];
      const delay = 900 + Math.random() * 600;

      // Mark as in-progress
      setState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          nodes: prev.nodes.map((n) =>
            n.name === nodeName ? { ...n, status: "in-progress" } : n
          ),
        };
      });

      // Simulate node work then complete
      setTimeout(() => {
        const output = MOCK_OUTPUTS[nodeName] ?? {};
        const summary = MOCK_SUMMARIES[nodeName] ?? nodeName;
        const ts = new Date().toISOString();

        const finding: FindingEntry = {
          nodeId: nodeName,
          timestamp: ts,
          summary,
          output,
        };

        setState((prev) => {
          if (!prev) return prev;
          const isLast = nodeIndex === NODES_IN_ORDER.length - 1;
          const synth =
            nodeName === "synthesize_decision"
              ? (output as {
                  decision: "INVEST" | "PASS";
                  confidence: number;
                  reasoning: string;
                  key_factors: string[];
                })
              : null;

          return {
            ...prev,
            nodes: prev.nodes.map((n) =>
              n.name === nodeName
                ? { ...n, status: "complete", output, completedAt: ts }
                : n
            ),
            findings: [...prev.findings, finding],
            status: isLast ? "complete" : "running",
            verdict: synth
              ? {
                  decision: synth.decision,
                  confidence: synth.confidence,
                  reasoning: synth.reasoning,
                  keyFactors: synth.key_factors ?? [],
                }
              : prev.verdict,
          };
        });

        // Auto-select last finding
        setSelectedFindingId(nodeName);

        nodeIndex++;
        if (nodeIndex < NODES_IN_ORDER.length) {
          setTimeout(processNextNode, 200);
        }
      }, delay);
    };

    processNextNode();
    /* ── End demo mode ── */
  }, []);

  const reset = useCallback(() => {
    esRef.current?.close();
    setState(null);
    setSelectedFindingId(null);
  }, []);

  return { state, selectedFindingId, setSelectedFindingId, startResearch, reset };
}
