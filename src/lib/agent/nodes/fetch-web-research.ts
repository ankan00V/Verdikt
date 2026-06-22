/**
 * nodes/fetch-web-research.ts
 *
 * Parallel node: fetches general web research about the company's business
 * model, competitive position, and strategic context using Tavily.
 *
 * Distinct from fetch_news: this searches for evergreen analysis content
 * (business model breakdowns, competitive landscape articles, investor theses)
 * rather than recent news. The combination gives both recency (news) and depth
 * (web research) to the downstream analysis nodes.
 *
 * Runs in parallel with fetch_financials and fetch_news.
 */

import { TavilySearch } from "@langchain/tavily";
import { AgentStateType, SearchResult } from "../state";

export async function fetchWebResearchNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const { ticker, companyProfile } = state;

  if (!ticker) {
    return { errors: ["Web research skipped — no ticker resolved"] };
  }

  const companyName = companyProfile?.name ?? ticker;
  const sector = companyProfile?.sector ?? "";

  // Query targets business fundamentals rather than breaking news, formulated as a question for better Tavily results
  const query = `What is the business model, competitive advantage, and market position of "${companyName}" (${ticker}) in the ${sector} sector?`;

  try {
    const tool = new TavilySearch({
      maxResults: 8,
      topic: "general",
      searchDepth: "advanced",
      includeAnswer: false,
      includeRawContent: false,
    });

    const rawResults = await tool.invoke({ query });

    const parsed =
      typeof rawResults === "string" ? JSON.parse(rawResults) : rawResults;

    const resultsArray = Array.isArray(parsed) ? parsed : (parsed.results || []);
    const results: SearchResult[] = resultsArray.map((r: Record<string, unknown>) => ({
      title: (r.title as string) ?? "",
      url: (r.url as string) ?? "",
      content: (r.content as string) ?? "",
      score: typeof r.score === "number" ? r.score : undefined,
    }));

    // Post-filter to remove noise: article must actually mention the ticker or company name
    const companyFirstWord = companyName.split(" ")[0].toLowerCase();
    const searchTarget = ticker.toLowerCase();
    
    const filteredResults = results.filter(r => {
      const text = `${r.title} ${r.content}`.toLowerCase();
      return text.includes(searchTarget) || text.includes(companyFirstWord);
    });

    return { webResearchResults: filteredResults };
  } catch (err) {
    console.error("[fetch_web_research] Error:", err);
    return {
      webResearchResults: [],
      errors: [
        `Web research failed: ${err instanceof Error ? err.message : String(err)}. Competitive analysis will be limited.`,
      ],
    };
  }
}
