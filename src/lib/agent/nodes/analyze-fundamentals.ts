/**
 * nodes/analyze-fundamentals.ts
 *
 * LLM node: analyzes the company's financial fundamentals.
 *
 * Uses ChatOpenAI pointed at NVIDIA NIM with .withStructuredOutput(FundamentalsSchema).
 * The method: "jsonSchema" option is required for NIM compatibility — some NIM
 * endpoints do not support the "strict" tool-calling format.
 *
 * Critically: the prompt injects the actual financial data from state, and the
 * FundamentalsSchema's .describe() annotations act as field-level instructions.
 * If financialsAvailable is false, the node still produces valid output but
 * explicitly marks the data gap in overallScore and dataLimitationNote.
 */

import { ChatOpenAI } from "@langchain/openai";
import { AgentStateType } from "../state";
import { FundamentalsSchema } from "../schemas";

// ---------------------------------------------------------------------------
// Helper: format financial data into a readable prompt context
// ---------------------------------------------------------------------------

function formatFinancialContext(state: AgentStateType): string {
  if (!state.financialsAvailable || !state.financials) {
    const errors = state.errors
      .filter((e) => e.includes("financial") || e.includes("Yahoo Finance"))
      .join("; ");
    return `FINANCIAL DATA STATUS: Unavailable. ${errors || "No specific error recorded."}`;
  }

  const { incomeStatements, keyMetrics } = state.financials;
  const profile = state.companyProfile;

  // Format revenue figures for readability
  const formatNum = (n: number | null, prefix = ""): string => {
    if (n === null) return "N/A";
    const abs = Math.abs(n);
    if (abs >= 1e9) return `${prefix}${(n / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `${prefix}${(n / 1e6).toFixed(1)}M`;
    return `${prefix}${n.toFixed(2)}`;
  };

  const formatPct = (n: number | null): string =>
    n === null ? "N/A" : `${(n * 100).toFixed(1)}%`;

  const incomeLines = incomeStatements
    .slice(0, 2)
    .map(
      (stmt) =>
        `  ${stmt.date}: Revenue=${formatNum(stmt.revenue, "$")}, ` +
        `GrossMargin=${formatPct(stmt.grossProfitRatio)}, ` +
        `OperatingMargin=${formatPct(stmt.operatingIncomeRatio)}, ` +
        `NetMargin=${formatPct(stmt.netIncomeRatio)}, ` +
        `EPS=${stmt.eps !== null ? `$${stmt.eps.toFixed(2)}` : "N/A"}`
    )
    .join("\n");

  const metricsText = keyMetrics
    ? `P/E=${keyMetrics.peRatio?.toFixed(1) ?? "N/A"}, ` +
      `P/B=${keyMetrics.pbRatio?.toFixed(2) ?? "N/A"}, ` +
      `EV/EBITDA=${keyMetrics.evToEbitda?.toFixed(1) ?? "N/A"}, ` +
      `D/E=${keyMetrics.debtToEquity?.toFixed(2) ?? "N/A"}, ` +
      `ROE=${formatPct(keyMetrics.returnOnEquity)}, ` +
      `ROA=${formatPct(keyMetrics.returnOnAssets)}, ` +
      `FCF/share=${keyMetrics.freeCashFlowPerShare !== null ? `$${keyMetrics.freeCashFlowPerShare.toFixed(2)}` : "N/A"}, ` +
      `RevenueGrowthYoY=${formatPct(keyMetrics.revenueGrowthYoY)}`
    : "Key metrics: Not available";

  return (
    `Company: ${profile?.name ?? state.ticker} (${state.ticker})\n` +
    `Sector: ${profile?.sector ?? "Unknown"} | Industry: ${profile?.industry ?? "Unknown"}\n` +
    `Market Cap: ${formatNum(profile?.marketCap ?? null, "$")}\n\n` +
    `INCOME STATEMENTS (annual):\n${incomeLines}\n\n` +
    `VALUATION & EFFICIENCY METRICS:\n${metricsText}`
  );
}

// ---------------------------------------------------------------------------
// Main node function
// ---------------------------------------------------------------------------

export async function analyzeFundamentalsNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  if (!state.ticker) {
    return { errors: ["Fundamentals analysis skipped — no ticker resolved"] };
  }

  const llm = new ChatOpenAI({
    model: "meta/llama-3.1-70b-instruct",
    apiKey: process.env.NVIDIA_NIM_API_KEY,
    configuration: {
      baseURL: process.env.NVIDIA_NIM_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
    },
    temperature: 0.0,
    maxTokens: 2500,
    timeout: 45000,
    maxRetries: 0,
  });

  const structuredLlm = llm.withStructuredOutput(FundamentalsSchema, {
    method: "jsonSchema",
  });

  const financialContext = formatFinancialContext(state);

  const systemPrompt =
    `You are a senior equity research analyst. Your task is to analyze the financial fundamentals ` +
    `of a company and produce a structured assessment. ` +
    `Base your analysis ONLY on the data provided. DO NOT HALLUCINATE OR CALCULATE NUMBERS. ` +
    `Use only the explicitly provided percentages (e.g. RevenueGrowthYoY, margins). ` +
    `If data fields show N/A or are missing, explicitly state 'Unavailable' rather than inventing or estimating numbers.`;

  const userPrompt =
    `Analyze the financial fundamentals for ${state.ticker} based on the data below.\n\n` +
    `${financialContext}\n\n` +
    `Provide a rigorous, specific assessment. Reference actual numbers in your analysis.`;

  try {
    const result = await structuredLlm.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], { signal: AbortSignal.timeout(45000) });

    return { fundamentalsAnalysis: result };
  } catch (err) {
    console.error("[analyze_fundamentals] Error:", err);
    // Return a degraded output rather than crashing the graph
    return {
      financialsAvailable: false,
      fundamentalsAnalysis: {
        available: false,
        flag: "ERROR",
        revenueGrowthAssessment: "Fundamental data analysis could not be completed for this company.",
        marginQuality: "Data analysis unavailable.",
        balanceSheetHealth: "Data analysis unavailable.",
        valuationComment: "Data analysis unavailable.",
        overallScore: "unavailable",
        keyNumbers: [],
        dataLimitationNote: "Insufficient data for fundamental analysis.",
      },
      errors: [`Fundamentals analysis error: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}
