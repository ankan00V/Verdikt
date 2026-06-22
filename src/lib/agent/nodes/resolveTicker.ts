import { z } from "zod";
import { AgentStateType } from "../state";
import { getLLM } from "../llm";
import { getCache, setCache } from "../../cache";

const resolutionSchema = z.object({
  ticker: z.string().describe("The official stock ticker symbol of the company. If the company is private or not publicly traded, or cannot be found, return empty string."),
  companyConfirmed: z.boolean().describe("True if the company was successfully resolved to a publicly traded entity, false otherwise."),
  reasoning: z.string().describe("Brief reasoning for the resolution outcome."),
});

export async function resolveTicker(state: AgentStateType) {
  console.log(`[resolveTicker] Resolving ticker for: ${state.companyName}`);
  
  const cacheKey = `verdikt:ticker:${state.companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  const cached = await getCache<{ ticker: string | null; companyConfirmed: boolean; resolutionError: string | null }>(cacheKey);
  
  if (cached) {
    return cached;
  }

  const llm = getLLM();
  const structuredLlm = llm.withStructuredOutput(resolutionSchema, {
    name: "resolve_ticker",
  });

  const prompt = `You are a financial analyst. The user has provided the following company name: "${state.companyName}".
Please identify the primary stock ticker symbol for this company on a major US exchange (NYSE, NASDAQ).
If it's a well-known international company, provide its primary US ADR ticker if available.
If the company is private or you cannot confidently determine the ticker, set companyConfirmed to false and leave the ticker empty.`;

  try {
    const result = await structuredLlm.invoke(prompt);
    const finalResult = {
      ticker: result.ticker || null,
      companyConfirmed: result.companyConfirmed,
      resolutionError: result.companyConfirmed ? null : "Could not confidently resolve a public ticker for this company.",
    };

    // Cache for 7 days (604800 seconds)
    await setCache(cacheKey, finalResult, 604800);

    return finalResult;
  } catch (error: any) {
    console.error(`[resolveTicker] Error:`, error);
    return {
      ticker: null,
      companyConfirmed: false,
      resolutionError: error.message || "Failed to resolve ticker.",
    };
  }
}
