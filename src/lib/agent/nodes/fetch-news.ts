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
import { getCachedData } from "../../redis";

export async function fetchNewsNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const { ticker, companyProfile } = state;

  // Build a targeted query: use both company name and ticker for precision
  const companyName = companyProfile?.name ?? state.companyName;
  const query = ticker ? `${companyName} ${ticker} stock news earnings 2025 2026` : `${companyName} company news 2025 2026`;

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

    const rawResults = await getCachedData(
      `news:${ticker}`,
      () => tool.invoke({ query }),
      86400 // 24 hours
    );

    // TavilySearch returns a JSON string of results
    const parsed =
      typeof rawResults === "string" ? JSON.parse(rawResults) : rawResults;

    const resultsArray = Array.isArray(parsed) ? parsed : (parsed.results || []);
    const results: SearchResult[] = resultsArray.map((r: Record<string, unknown>) => ({
      title: (r.title as string) ?? "",
      url: (r.url as string) ?? "",
      content: (r.content as string) ?? "",
      score: typeof r.score === "number" ? r.score : undefined,
      publishedDate:
        typeof r.published_date === "string" ? r.published_date : undefined,
    }));

    // Post-filter to remove noise: article must mention ticker or company name
    const companyFirstWord = companyName.split(" ")[0].toLowerCase();
    const searchTarget = ticker ? ticker.toLowerCase() : companyFirstWord;
    
    const filteredResults = results.filter(r => {
      const text = `${r.title} ${r.content}`.toLowerCase();
      return text.includes(searchTarget) || text.includes(companyFirstWord);
    });

    if (filteredResults.length === 0) {
      throw new Error("No news results found.");
    }

    return { newsResults: filteredResults };
  } catch (err) {
    console.error("[fetch_news] Error:", err);
    console.warn(`[fetch_news] Tavily failed for ${companyName}. Using LLM fallback via meta/llama-3.1-70b-instruct.`);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const { invokeStringLLM } = await import("../llm");
      const prompt = `Recall 3 major real-world news events, recent press releases, or major themes regarding ${ticker} from your training data. Do not make anything up.
Output strictly in this JSON format:
[
  {"title": "string", "url": "string", "content": "string"}
]
Only output the JSON array. Do not include markdown.`;
      const response = await invokeStringLLM(prompt, { maxTokens: 1500, temperature: 0.2 });
      const text = response.replace(/```json/g, "").replace(/```/g, "");
      const fallbackNews = JSON.parse(text) as SearchResult[];
      const companyFirstWord = companyName.split(" ")[0].toLowerCase();
      const searchTarget = ticker ? ticker.toLowerCase() : companyFirstWord;
      const filteredFallback = fallbackNews.filter(r => {
        const txt = `${r.title} ${r.content}`.toLowerCase();
        return txt.includes(searchTarget) || txt.includes(companyFirstWord);
      });
      return { newsResults: filteredFallback };
    } catch (fallbackErr) {
      console.error("[fetch_news] LLM Fallback failed:", fallbackErr);
    }

    return {
      newsResults: [],
      errors: [
        `News search failed: ${err instanceof Error ? err.message : String(err)}. Sentiment analysis will be limited.`,
      ],
    };
  }
}
