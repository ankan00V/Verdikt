/**
 * nodes/analyze-sentiment.ts
 *
 * LLM node: analyzes news sentiment from the fetch_news results.
 *
 * Injects the full news article titles and content snippets into the prompt.
 * The SentimentSchema's .describe() fields guide the model on what each output
 * field means and how to calibrate the sentimentScore.
 *
 * If no news was found, the node still produces a valid output noting the gap.
 */

import { ChatOpenAI } from "@langchain/openai";
import { AgentStateType } from "../state";
import { SentimentSchema } from "../schemas";

// ---------------------------------------------------------------------------
// Format news results for the prompt
// ---------------------------------------------------------------------------

function formatNewsContext(state: AgentStateType): string {
  const { newsResults, ticker, companyProfile } = state;
  const companyName = companyProfile?.name ?? ticker ?? "the company";

  if (!newsResults || newsResults.length === 0) {
    return `No recent news articles were retrieved for ${companyName} (${ticker}). ` +
      "This may be due to low media coverage, a search failure, or the company being less covered by financial media.";
  }

  const articles = newsResults
    .slice(0, 8)
    .map(
      (r, i) =>
        `[${i + 1}] ${r.publishedDate ? `(${r.publishedDate}) ` : ""}${r.title}\n` +
        `Source: ${r.url}\n` +
        `${r.content.slice(0, 600)}`
    )
    .join("\n\n---\n\n");

  return `RECENT NEWS ARTICLES (${newsResults.length} found):\n\n${articles}`;
}

// ---------------------------------------------------------------------------
// Main node function
// ---------------------------------------------------------------------------

export async function analyzeSentimentNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  if (!state.ticker) {
    return { errors: ["Sentiment analysis skipped — no ticker resolved"] };
  }

  // Stagger request by 1s to prevent NVIDIA NIM HTTP 429 Too Many Requests from concurrent limits
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const llm = new ChatOpenAI({
    model: "meta/llama-3.1-70b-instruct",
    apiKey: process.env.NVIDIA_NIM_API_KEY,
    configuration: {
      baseURL: process.env.NVIDIA_NIM_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
    },
    temperature: 0.0,
    maxTokens: 600,
    timeout: 45000,
  });

  const structuredLlm = llm.withStructuredOutput(SentimentSchema, {
    method: "jsonSchema",
  });

  const newsContext = formatNewsContext(state);
  const companyName = state.companyProfile?.name ?? state.ticker;

  const systemPrompt =
    `You are a financial news analyst specializing in sentiment analysis for investment research. ` +
    `Analyze the provided news articles and assess the market sentiment around the company. ` +
    `Be objective and evidence-based. Distinguish between noise and material developments. ` +
    `Base your analysis ONLY on what is in the provided articles — do not add external information.`;

  const userPrompt =
    `Analyze the sentiment and recent news momentum for ${companyName} (${state.ticker}).\n\n` +
    `${newsContext}\n\n` +
    `Identify controversies, recent developments, and the overall tone of coverage. ` +
    `Calibrate the sentimentScore numerically (0=very negative, 50=neutral, 100=very positive).`;

  try {
    const result = await structuredLlm.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], { signal: AbortSignal.timeout(45000) });

    return { sentimentAnalysis: result };
  } catch (err) {
    console.error("[analyze_sentiment] Error:", err);
    return {
      sentimentAnalysis: {
        overallTone: "neutral",
        momentumSignal: "Analysis failed due to a technical error.",
        controversies: [],
        recentDevelopments: [],
        sentimentScore: 50,
      },
      errors: [`Sentiment analysis error: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}
