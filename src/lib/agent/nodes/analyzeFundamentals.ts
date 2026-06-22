import { z } from "zod";
import { AgentStateType } from "../state";
import { getLLM } from "../llm";

const fundamentalsSchema = z.object({
  growth: z.string().describe("Analysis of revenue and earnings growth trends."),
  margins: z.string().describe("Analysis of profitability margins (gross, operating, net)."),
  balanceSheetHealth: z.string().describe("Analysis of debt, liquidity, and overall balance sheet health."),
  keyMetrics: z.string().describe("Commentary on any other key financial metrics (e.g., P/E, ROE)."),
  overallHealth: z.enum(["Strong", "Stable", "Weak"]).describe("Overall assessment of fundamental health."),
});

export async function analyzeFundamentals(state: AgentStateType) {
  if (!state.financialData) {
    return {
      fundamentalsAnalysis: {
        error: "No financial data available to analyze.",
        overallHealth: "Unknown"
      }
    };
  }

  console.log(`[analyzeFundamentals] Analyzing fundamentals for ${state.companyName}`);
  const llm = getLLM();
  const structuredLlm = llm.withStructuredOutput(fundamentalsSchema, {
    name: "analyze_fundamentals",
  });

  const prompt = `You are a financial analyst evaluating the fundamentals of ${state.companyName} (${state.ticker}).
Based on the following financial data fetched from Financial Modeling Prep, provide a structured analysis.
Be objective and concise.

Financial Data:
${JSON.stringify(state.financialData).substring(0, 8000)} // Truncating to avoid token limits if too large
`;

  try {
    const result = await structuredLlm.invoke(prompt);
    return {
      fundamentalsAnalysis: result
    };
  } catch (error: any) {
    console.error(`[analyzeFundamentals] Error:`, error);
    return {
      fundamentalsAnalysis: {
        error: "Failed to parse fundamental analysis.",
        overallHealth: "Unknown"
      }
    };
  }
}
