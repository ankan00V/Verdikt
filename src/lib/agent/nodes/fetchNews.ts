import { AgentStateType } from "../state";
import { AgentStateType } from "../state";
import { getEnv } from "../../config";
import { loadFixture, saveFixture } from "../fixtureUtils";
import { getCache, setCache } from "../../cache";

export async function fetchNews(state: AgentStateType) {
  if (!state.companyConfirmed) {
    return {};
  }

  const env = getEnv();
  const query = `${state.companyName} ${state.ticker || ''} recent news and developments`.trim();
  // Create a safe filename using ticker or company name
  const safeName = (state.ticker || state.companyName).replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const fixtureName = `tavily-news-${safeName}`;

  if (env.USE_MOCK_DATA) {
    const mockData = loadFixture(fixtureName);
    if (mockData) {
      return { newsData: mockData };
    }
    console.warn(`[fetchNews] Mock mode is ON but no fixture found for ${fixtureName}. Falling back to live API and saving fixture.`);
  }

  const cacheKey = `verdikt:news:${query.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  const cached = await getCache<any>(cacheKey);
  
  if (cached) {
    return { newsData: cached };
  }

  console.log(`[fetchNews] Fetching live news for query: "${query}"`);
  const apiKey = env.TAVILY_API_KEY;

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: "advanced",
        include_raw_content: false,
        topic: "news",
        days: 30,
        max_results: 5,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API responded with status ${response.status}`);
    }

    const data = await response.json();

    if (env.USE_MOCK_DATA || process.env.NODE_ENV === "development") {
      saveFixture(fixtureName, data);
    }

    // Cache for 6 hours (21600 seconds)
    await setCache(cacheKey, data, 21600);

    return { newsData: data };
  } catch (error: any) {
    console.error(`[fetchNews] Error:`, error);
    return {
      dataFetchErrors: { news: error.message || "Failed to fetch news data." }
    };
  }
}
