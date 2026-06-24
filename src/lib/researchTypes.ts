"use client";

/** Node names in pipeline execution order */
export const PIPELINE_NODES = [
  "resolve_ticker",
  "fetch_financials",
  "fetch_news",
  "fetch_web_research",
  "analyze_fundamentals",
  "analyze_sentiment",
  "analyze_competitive_position",
  "synthesize_decision",
] as const;

export type NodeName = (typeof PIPELINE_NODES)[number];
export type NodeStatus = "pending" | "in-progress" | "complete" | "failed";

export interface NodeState {
  name: NodeName;
  status: NodeStatus;
  error?: string;
  output?: Record<string, unknown>;
  completedAt?: string; // ISO
}

export interface FindingEntry {
  nodeId: NodeName;
  timestamp: string;
  summary: string;
  output: Record<string, unknown>;
}

export interface ResearchState {
  company: string;
  ticker?: string;
  nodes: NodeState[];
  findings: FindingEntry[];
  verdict?: {
    decision: "INVEST" | "PASS";
    confidence: number;
    reasoning: string;
    keyFactors: string[];
  };
  startedAt: Date;
  status: "running" | "complete" | "error";
  error?: string;
}

export function createInitialState(company: string): ResearchState {
  return {
    company,
    nodes: PIPELINE_NODES.map((name) => ({ name, status: "pending" })),
    findings: [],
    startedAt: new Date(),
    status: "running",
  };
}
