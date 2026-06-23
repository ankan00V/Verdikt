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
import { getCachedData } from "../../redis";

export async function fetchWebResearchNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const { ticker, companyProfile } = state;

  if (!ticker) {
    return { errors: ["Web research skipped — no ticker resolved"] };
  }

  const companyName = state.companyProfile?.name ?? state.ticker ?? state.companyName;
  const website = state.website;
  const sector = companyProfile?.sector ?? "";

  // Query targets business fundamentals rather than breaking news, formulated as a question for better Tavily results
  // Emphasize the website as the main anchor
  const query = `What is the business model, competitive advantage, and market position of the company operating at ${website} (ticker: ${ticker}, name: "${companyName}") in the ${sector} sector?`;

  try {
    const tool = new TavilySearch({
      maxResults: 8,
      topic: "general",
      searchDepth: "advanced",
      includeAnswer: false,
      includeRawContent: false,
    });

    const rawResults = await getCachedData(
      `webresearch:${ticker}`,
      () => tool.invoke({ query }),
      86400 // 24 hours
    );

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

    if (filteredResults.length === 0) {
      throw new Error("No web research results found.");
    }

    return { webResearchResults: filteredResults };
  } catch (err) {
    console.error("[fetch_web_research] Error:", err);
    console.warn(`[fetch_web_research] Tavily failed for ${ticker}. Using LLM fallback via meta/llama-3.1-70b-instruct.`);
    try {
      await new Promise(resolve => setTimeout(resolve, 4000));
      const { ChatOpenAI } = await import("@langchain/openai");
      const llm = new ChatOpenAI({
        model: "meta/llama-3.1-70b-instruct",
        apiKey: process.env.NVIDIA_FALLBACK_API_KEY || process.env.NVIDIA_NIM_API_KEY,
        configuration: { baseURL: process.env.NVIDIA_NIM_BASE_URL ?? "https://integrate.api.nvidia.com/v1" },
        temperature: 0.2,
        maxTokens: 1500,
        maxRetries: 0,
      });
      const prompt = `Recall actual real-world facts about the business model, competitive advantage, and market position of ${ticker} from your training data. Do not hallucinate.
Output strictly in this JSON format:
[
  {"title": "string", "url": "string", "content": "string"}
]
Only output the JSON array. Do not include markdown.`;
      const response = await llm.invoke(prompt);
      const text = (response.content as string).trim().replace(/```json/g, "").replace(/```/g, "");
      const fallbackWeb = JSON.parse(text) as SearchResult[];
      return { webResearchResults: fallbackWeb };
    } catch (fallbackErr) {
      console.error("[fetch_web_research] LLM Fallback failed:", fallbackErr);
    }

    return {
      webResearchResults: [],
      errors: [
        `Web research failed: ${err instanceof Error ? err.message : String(err)}. Competitive analysis will be limited.`,
      ],
    };
  }
}
