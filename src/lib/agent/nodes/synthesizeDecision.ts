import { z } from "zod";
import { AgentStateType } from "../state";
import { getLLM } from "../llm";
import { getCache, setCache } from "../../cache";

const decisionSchema = z.object({
  verdict: z.enum(["INVEST", "PASS"]).describe("The final binary decision on whether to invest."),
  confidenceScore: z.number().min(0).max(100).describe("Confidence score in the verdict from 0 to 100."),
  summary: z.string().describe("A concise 2-3 sentence summary of the investment thesis or rejection rationale."),
  reasoningBreakdown: z.object({
    fundamentals: z.string().describe("Specific rationale citing the fundamentals analysis."),
    sentiment: z.string().describe("Specific rationale citing the sentiment analysis."),
    competitive: z.string().describe("Specific rationale citing the competitive position analysis."),
    risks: z.string().describe("The primary risks that could invalidate this thesis."),
  }).describe("Detailed breakdown of the reasoning, explicitly citing findings from the prior nodes."),
});

export async function synthesizeDecision(state: AgentStateType) {
  if (!state.companyConfirmed) {
    return {
      finalDecision: {
        verdict: "PASS",
        confidenceScore: 0,
        summary: state.resolutionError || "Company not publicly traded or found.",
        reasoningBreakdown: {
          fundamentals: "N/A",
          sentiment: "N/A",
          competitive: "N/A",
          risks: "Company resolution failed.",
        }
      }
    };
  }

  console.log(`[synthesizeDecision] Generating final decision for ${state.ticker}`);

  const cacheKey = `verdikt:decision:${state.ticker}`;
  const cached = await getCache<any>(cacheKey);
  
  if (cached) {
    return { finalDecision: cached };
  }

  const llm = getLLM();
  const structuredLlm = llm.withStructuredOutput(decisionSchema, {
    name: "synthesize_decision",
  });

  const prompt = `You are a lead portfolio manager making a final investment decision on ${state.companyName} (${state.ticker}).
You must synthesize the reports from your analysts (Fundamentals, Sentiment, Competitive Position) and issue a final verdict of INVEST or PASS.
Your reasoning must explicitly reference the findings from these reports.

=== Fundamentals Analyst Report ===
${JSON.stringify(state.fundamentalsAnalysis || {})}

=== Sentiment Analyst Report ===
${JSON.stringify(state.sentimentAnalysis || {})}

=== Competitive Analyst Report ===
${JSON.stringify(state.competitiveAnalysis || {})}

=== Fetch Errors (If any) ===
${JSON.stringify(state.dataFetchErrors || {})}

Synthesize this information. Determine if the business quality, growth, sentiment, and moat justify an INVEST rating, or if the risks and weaknesses warrant a PASS. Provide a confidence score and a detailed breakdown.`;

  try {
    const result = await structuredLlm.invoke(prompt);
    
    // Cache for 6 hours (21600 seconds)
    await setCache(cacheKey, result, 21600);

    return { finalDecision: result };
  } catch (error: any) {
    console.error(`[synthesizeDecision] Error:`, error);
    return {
      finalDecision: {
        verdict: "PASS",
        confidenceScore: 0,
        summary: "An error occurred during the final synthesis.",
        reasoningBreakdown: {
          fundamentals: "Error",
          sentiment: "Error",
          competitive: "Error",
          risks: error.message || "Unknown error",
        }
      }
    };
  }
}
