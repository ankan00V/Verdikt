/**
 * nodes/fetch-news.ts
 *
 * Parallel node: fetches recent news about the company using Tavily.
 *
 * Uses @langchain/tavily's TavilySearch with topic: "news" and a 1-month
 * time range to surface material recent coverage.
 *
 * This node runs in parallel with fetch_financials and fetch_web_research.
 * Results are written to state.newsResults — which uses an array concat reducer,
 * so parallel writes are safe.
 */

import { TavilySearch } from "@langchain/tavily";
import { AgentStateType, SearchResult } from "../state";

export async function fetchNewsNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const { ticker, companyProfile } = state;

  if (!ticker) {
    return { errors: ["News search skipped — no ticker resolved"] };
  }

  // Build a targeted query: use both company name and ticker for precision
  const companyName = companyProfile?.name ?? ticker;
  const query = `${companyName} ${ticker} latest news earnings analyst investment`;

  try {
    const tool = new TavilySearch({
      maxResults: 8,
      topic: "news",
      searchDepth: "advanced",
      // 1-month time range keeps results relevant; avoids stale articles
      timeRange: "month",
      includeAnswer: false,
      includeRawContent: false,
    });

    const rawResults = await tool.invoke({ query });

    // TavilySearch returns a JSON string of results
    const parsed =
      typeof rawResults === "string" ? JSON.parse(rawResults) : rawResults;

    const results: SearchResult[] = Array.isArray(parsed)
      ? parsed.map((r: Record<string, unknown>) => ({
          title: (r.title as string) ?? "",
          url: (r.url as string) ?? "",
          content: (r.content as string) ?? "",
          score: typeof r.score === "number" ? r.score : undefined,
          publishedDate:
            typeof r.published_date === "string" ? r.published_date : undefined,
        }))
      : [];

    return { newsResults: results };
  } catch (err) {
    console.error("[fetch_news] Error:", err);
    return {
      newsResults: [],
      errors: [
        `News search failed: ${err instanceof Error ? err.message : String(err)}. Sentiment analysis will be limited.`,
      ],
    };
  }
}
