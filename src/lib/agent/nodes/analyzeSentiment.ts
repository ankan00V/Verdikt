import { z } from "zod";
import { AgentStateType } from "../state";
import { getLLM } from "../llm";

const sentimentSchema = z.object({
  newsTone: z.enum(["Very Positive", "Positive", "Neutral", "Negative", "Very Negative"]).describe("The prevailing tone of recent news coverage."),
  keyDevelopments: z.array(z.string()).describe("List of 2-3 major recent developments or events."),
  controversies: z.array(z.string()).describe("List of any controversies, legal issues, or significant risks mentioned in the news. Empty if none."),
  momentum: z.string().describe("Brief commentary on the perceived momentum of the company based on news."),
});

export async function analyzeSentiment(state: AgentStateType) {
  if (!state.newsData) {
    return {
      sentimentAnalysis: {
        error: "No news data available to analyze.",
        newsTone: "Neutral",
      }
    };
  }

  console.log(`[analyzeSentiment] Analyzing sentiment for ${state.companyName}`);
  const llm = getLLM();
  const structuredLlm = llm.withStructuredOutput(sentimentSchema, {
    name: "analyze_sentiment",
  });

  const prompt = `You are a financial analyst evaluating recent news sentiment for ${state.companyName}.
Based on the following news headlines and snippets fetched from web search, provide a structured analysis of the sentiment and key events.

News Data:
${JSON.stringify(state.newsData).substring(0, 8000)}
`;

  try {
    const result = await structuredLlm.invoke(prompt);
    return {
      sentimentAnalysis: result
    };
  } catch (error: any) {
    console.error(`[analyzeSentiment] Error:`, error);
    return {
      sentimentAnalysis: {
        error: "Failed to parse sentiment analysis.",
        newsTone: "Neutral"
      }
    };
  }
}
