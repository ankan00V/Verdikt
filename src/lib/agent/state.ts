/**
 * agent/state.ts
 *
 * Defines the AgentState that flows through the entire LangGraph pipeline.
 * All fields are typed; fields written by parallel nodes use array reducers
 * to prevent LangGraph's INVALID_CONCURRENT_GRAPH_UPDATE error.
 *
 * Architecture note: We use LangGraph's Annotation API (not a plain interface)
 * because the graph runtime needs to know how to merge concurrent state updates.
 */

import { Annotation } from "@langchain/langgraph";

// ---------------------------------------------------------------------------
// Sub-type definitions (data shapes from external APIs / LLM nodes)
// ---------------------------------------------------------------------------

export interface CompanyProfile {
  ticker: string;
  name: string;
  description: string;
  sector: string;
  industry: string;
  country: string;
  exchange: string;
  marketCap: number | null;
  website: string;
  ceo: string;
}

export interface FinancialData {
  incomeStatements: IncomeStatement[];
  keyMetrics: KeyMetrics | null;
  ratios: FinancialRatios | null;
}

export interface IncomeStatement {
  date: string;
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  eps: number | null;
  grossProfitRatio: number | null;
  operatingIncomeRatio: number | null;
  netIncomeRatio: number | null;
}

export interface KeyMetrics {
  peRatio: number | null;
  pbRatio: number | null;
  evToEbitda: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  freeCashFlowPerShare: number | null;
  revenuePerShare: number | null;
  revenueGrowthYoY: number | null;
}

export interface FinancialRatios {
  grossProfitMargin: number | null;
  operatingProfitMargin: number | null;
  netProfitMargin: number | null;
  debtEquityRatio: number | null;
  quickRatio: number | null;
  dividendYield: number | null;
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
  publishedDate?: string;
}

// Structured output types from LLM analysis nodes
export interface FundamentalsOutput {
  available: boolean;
  flag: string | null;
  revenueGrowthAssessment: string | null;
  marginQuality: string | null;
  balanceSheetHealth: string | null;
  valuationComment: string | null;
  overallScore: "strong" | "adequate" | "weak" | "unavailable";
  keyNumbers: string[] | null;
  dataLimitationNote: string | null;
}

export interface SentimentOutput {
  overallTone: "positive" | "neutral" | "negative" | "mixed";
  momentumSignal: string;
  controversies: string[];
  recentDevelopments: string[];
  sentimentScore: number; // 0-100
}

export interface CompetitiveOutput {
  moatAssessment: string;
  marketPosition: string;
  keyCompetitors: string[];
  competitiveRisks: string[];
  differentiators: string[];
  moatScore: "wide" | "narrow" | "none" | "unclear";
}

export interface DecisionOutput {
  verdict: "INVEST" | "PASS";
  confidence: number; // 0-100
  oneLineRationale: string;
  fundamentalsSummary: string;
  sentimentSummary: string;
  competitiveSummary: string;
  keyRisks: string[];
  keyStrengths: string[];
  dataQualityNote: string | null;
}

// ---------------------------------------------------------------------------
// AgentState — the graph's shared state object
// ---------------------------------------------------------------------------

export const AgentState = Annotation.Root({
  // Input
  companyName: Annotation<string>,
  website: Annotation<string>,

  // Resolved by resolve_ticker
  ticker: Annotation<string | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),
  companyProfile: Annotation<CompanyProfile | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),

  // Fetched by fetch_financials (parallel node)
  financials: Annotation<FinancialData | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),
  financialsAvailable: Annotation<boolean>({
    reducer: (_, b) => b,
    default: () => false,
  }),

  // Fetched by parallel fetch nodes — array reducers for concurrent writes
  newsResults: Annotation<SearchResult[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  webResearchResults: Annotation<SearchResult[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),

  // LLM analysis outputs
  fundamentalsAnalysis: Annotation<FundamentalsOutput | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),
  sentimentAnalysis: Annotation<SentimentOutput | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),
  competitiveAnalysis: Annotation<CompetitiveOutput | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),

  // Final decision
  decision: Annotation<DecisionOutput | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),

  // Non-fatal errors accumulate across nodes — reducer concatenates
  errors: Annotation<string[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
});

export type AgentStateType = typeof AgentState.State;
