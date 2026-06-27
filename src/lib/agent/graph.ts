/**
 * agent/graph.ts
 *
 * Assembles the Verdikt LangGraph pipeline.
 *
 * Graph structure:
 *
 *   START
 *     → resolve_ticker
 *     → [parallel fan-out]
 *         → fetch_financials   ─┐
 *         → fetch_news          ├→ gather_data (fan-in)
 *         → fetch_web_research ─┘
 *     → analyze_fundamentals
 *     → analyze_sentiment
 *     → analyze_competitive
 *     → synthesize_decision
 *   END
 *
 * The three parallel fetch nodes run in the same LangGraph super-step,
 * executing concurrently. gather_data acts as a fan-in synchronization point
 * — LangGraph will not advance to analyze_fundamentals until all three
 * parallel nodes have completed.
 *
 * Each node writes to its own dedicated state keys with appropriate reducers,
 * preventing INVALID_CONCURRENT_GRAPH_UPDATE errors during parallel execution.
 *
 * Decision to use StateGraph vs. MessageGraph:
 * StateGraph is correct here because we're accumulating typed research findings,
 * not a conversational message history. The state schema is the source of truth
 * for what the agent has learned.
 */

import { StateGraph, START, END } from "@langchain/langgraph";
import { AgentState } from "./state";
import { resolveTickerNode } from "./nodes/resolve-ticker";
import { fetchFinancialsNode } from "./nodes/fetch-financials";
import { fetchNewsNode } from "./nodes/fetch-news";
import { fetchWebResearchNode } from "./nodes/fetch-web-research";
import { gatherDataNode } from "./nodes/gather-data";
import { analyzeFundamentalsNode } from "./nodes/analyze-fundamentals";
import { analyzeSentimentNode } from "./nodes/analyze-sentiment";
import { analyzeCompetitiveNode } from "./nodes/analyze-competitive";
import { synthesizeDecisionNode } from "./nodes/synthesize-decision";
import { withNodeCache } from "../redis";

/**
 * Builds and compiles the research graph.
 *
 * Called once per request in the API route — the compiled graph is not a
 * singleton because Next.js serverless functions are stateless. If this were
 * a long-running server, we'd memoize the compiled graph.
 */
export function buildGraph(checkpointer?: any) {
  const graph = new StateGraph(AgentState)
    // -------------------------------------------------------------------------
    // Node registrations — each node is wrapped with withNodeCache so that
    // even if LangGraph re-runs a completed node after a Vercel timeout,
    // the cached result is returned in <100ms instead of re-doing LLM work.
    // -------------------------------------------------------------------------
    .addNode("resolve_ticker", withNodeCache("resolve_ticker", resolveTickerNode))
    .addNode("fetch_financials", withNodeCache("fetch_financials", fetchFinancialsNode))
    .addNode("fetch_news", withNodeCache("fetch_news", fetchNewsNode))
    .addNode("fetch_web_research", withNodeCache("fetch_web_research", fetchWebResearchNode))
    .addNode("gather_data", withNodeCache("gather_data", gatherDataNode))
    .addNode("analyze_fundamentals", withNodeCache("analyze_fundamentals", analyzeFundamentalsNode))
    .addNode("analyze_sentiment", withNodeCache("analyze_sentiment", analyzeSentimentNode))
    .addNode("analyze_competitive_position", withNodeCache("analyze_competitive_position", analyzeCompetitiveNode))
    .addNode("synthesize_decision", withNodeCache("synthesize_decision", synthesizeDecisionNode))

    // -------------------------------------------------------------------------
    // Edge definitions — these declare the execution order
    // -------------------------------------------------------------------------

    // Entry point
    .addEdge(START, "resolve_ticker")

    // Fan-out: resolve_ticker → three parallel nodes in the same super-step
    .addEdge("resolve_ticker", "fetch_financials")
    .addEdge("resolve_ticker", "fetch_news")
    .addEdge("resolve_ticker", "fetch_web_research")

    // Fan-in: all three parallel fetch nodes → gather_data (convergence point)
    // CRITICAL FIX: Pass as an array to wait for all three, rather than triggering gather_data 3 separate times
    .addEdge(["fetch_financials", "fetch_news", "fetch_web_research"], "gather_data")
    
    // Fan-out: from gather_data to parallel analysis nodes
    .addEdge("gather_data", "analyze_fundamentals")
    .addEdge("gather_data", "analyze_sentiment")
    .addEdge("gather_data", "analyze_competitive_position")

    // Fan-in: all three parallel analysis nodes → synthesize_decision
    // CRITICAL FIX: Pass as an array to wait for all three, rather than triggering synthesize_decision 3 separate times
    .addEdge(["analyze_fundamentals", "analyze_sentiment", "analyze_competitive_position"], "synthesize_decision")

    // Terminal edge
    .addEdge("synthesize_decision", END);

  return graph.compile({ checkpointer });
}

// Export the node name list for use in the streaming API route
// so we can map LangGraph event node names to human-readable labels
export const NODE_LABELS: Record<string, string> = {
  resolve_ticker: "Resolving ticker",
  fetch_financials: "Fetching financials",
  fetch_news: "Fetching news",
  fetch_web_research: "Researching competitive landscape",
  gather_data: "Gathering data",
  analyze_fundamentals: "Analyzing fundamentals",
  analyze_sentiment: "Analyzing sentiment",
  analyze_competitive_position: "Analyzing competitive position",
  synthesize_decision: "Synthesizing verdict",
};

