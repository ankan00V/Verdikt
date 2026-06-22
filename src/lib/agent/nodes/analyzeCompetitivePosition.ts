import { z } from "zod";
import { AgentStateType } from "../state";
import { getLLM } from "../llm";

const competitiveSchema = z.object({
  marketPosition: z.string().describe("The company's current position in its primary markets (e.g., leader, challenger, niche)."),
  economicMoat: z.enum(["Wide", "Narrow", "None"]).describe("Assessment of the company's economic moat (sustainable competitive advantage)."),
  moatDrivers: z.array(z.string()).describe("Factors contributing to the economic moat (e.g., network effects, switching costs, brand)."),
  keyCompetitors: z.array(z.string()).describe("List of 2-4 main competitors."),
  industryRisks: z.string().describe("Major secular or industry-specific risks the company faces."),
});

export async function analyzeCompetitivePosition(state: AgentStateType) {
  if (!state.webData) {
    return {
      competitiveAnalysis: {
        error: "No web research data available to analyze.",
        economicMoat: "None"
      }
    };
  }

  console.log(`[analyzeCompetitivePosition] Analyzing competitive position for ${state.companyName}`);
  const llm = getLLM();
  const structuredLlm = llm.withStructuredOutput(competitiveSchema, {
    name: "analyze_competitive_position",
  });

  const prompt = `You are a financial analyst evaluating the competitive landscape and economic moat of ${state.companyName}.
Based on the following general web research data, provide a structured analysis.

Web Research Data:
${JSON.stringify(state.webData).substring(0, 8000)}
`;

  try {
    const result = await structuredLlm.invoke(prompt);
    return {
      competitiveAnalysis: result
    };
  } catch (error: any) {
    console.error(`[analyzeCompetitivePosition] Error:`, error);
    return {
      competitiveAnalysis: {
        error: "Failed to parse competitive analysis.",
        economicMoat: "None"
      }
    };
  }
}
