/**
 * nodes/gather-data.ts
 *
 * Fan-in synchronization node.
 *
 * This node exists purely as an architectural convergence point for the three
 * parallel fetch nodes (fetch_financials, fetch_news, fetch_web_research).
 * LangGraph will not advance past this node until ALL predecessors have
 * completed — giving us fan-in semantics without any special framework APIs.
 *
 * It does no computation. It returns an empty partial state update.
 *
 * Why a dedicated node instead of multiple edges directly to analyze_fundamentals?
 * Because LangGraph's fan-in semantics require all edges to converge at the same
 * node. A single downstream node with 3 inbound edges IS the fan-in point.
 * Having gather_data explicitly in the graph makes the architecture visible
 * in code and in LangGraph's trace output.
 */

import { AgentStateType } from "../state";

export async function gatherDataNode(): Promise<Partial<AgentStateType>> {
  // All parallel data is now in state. Nothing to compute here.
  return {};
}
