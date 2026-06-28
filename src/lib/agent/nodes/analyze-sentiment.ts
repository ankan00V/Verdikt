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

import { invokeStructuredLLM } from "../llm";
import { AgentStateType } from "../state";
import { SentimentSchema } from "../schemas";

// ---------------------------------------------------------------------------
// Format news results for the prompt
// ---------------------------------------------------------------------------

function formatNewsContext(state: AgentStateType): string {
  const { newsResults, ticker, companyProfile } = state;
  const companyName = companyProfile?.name ?? state.companyName;

  if (!newsResults || newsResults.length === 0) {
    return `No recent news articles were retrieved for ${companyName}. ` +
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


  // Stagger request slightly to avoid simultaneous NIM hits (retry logic in llm.ts handles 429s)
  await new Promise((resolve) => setTimeout(resolve, 500));

  const newsContext = formatNewsContext(state);
  const companyName = state.companyProfile?.name ?? state.companyName;

  const systemPrompt =
    `You are a financial news analyst specializing in sentiment analysis for investment research. ` +
    `Analyze the provided news articles and assess the market sentiment around the company. ` +
    `Be objective and evidence-based. Distinguish between noise and material developments. ` +
    `Base your analysis ONLY on what is in the provided articles — do not add external information.`;

  const userPrompt =
    `Analyze the sentiment and recent news momentum for ${companyName} (${state.ticker || "Private Company"}).\n\n` +
    `${newsContext}\n\n` +
    `Identify controversies, recent developments, and the overall tone of coverage. ` +
    `Calibrate the sentimentScore numerically (0=very negative, 50=neutral, 100=very positive).`;

  try {
    const prompt = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
    const result = await invokeStructuredLLM(prompt, SentimentSchema, { temperature: 0 });

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
