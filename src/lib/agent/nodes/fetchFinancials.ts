import { AgentStateType } from "../state";
import { getEnv } from "../../config";
import { loadFixture, saveFixture } from "../fixtureUtils";
import { getCache, setCache } from "../../cache";

export async function fetchFinancials(state: AgentStateType) {
  if (!state.ticker || !state.companyConfirmed) {
    return {};
  }

  const env = getEnv();
  const ticker = state.ticker;
  const fixtureName = `fmp-financials-${ticker}`;

  if (env.USE_MOCK_DATA) {
    const mockData = loadFixture(fixtureName);
    if (mockData) {
      return { financialData: mockData };
    }
    console.warn(`[fetchFinancials] Mock mode is ON but no fixture found for ${fixtureName}. Falling back to live API and saving fixture.`);
  }

  const cacheKey = `verdikt:financials:${ticker}`;
  const cached = await getCache<any>(cacheKey);
  
  if (cached) {
    return { financialData: cached };
  }

  console.log(`[fetchFinancials] Fetching live data for ${ticker}`);
  const apiKey = env.FMP_API_KEY;

  try {
    const [profileRes, metricsRes, incomeRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/stable/profile?symbol=${ticker}&apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/stable/key-metrics?symbol=${ticker}&limit=1&apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/stable/income-statement?symbol=${ticker}&limit=2&apikey=${apiKey}`),
    ]);

    const profile = await profileRes.json();
    const metrics = await metricsRes.json();
    const income = await incomeRes.json();

    if (!profile || profile.length === 0) {
      return {
        dataFetchErrors: { financials: "No profile found for ticker." }
      };
    }

    const data = {
      profile: profile[0],
      keyMetrics: metrics[0] || {},
      incomeStatement: income || [],
    };

    if (env.USE_MOCK_DATA || process.env.NODE_ENV === "development") {
      saveFixture(fixtureName, data);
    }

    // Cache for 24 hours (86400 seconds)
    await setCache(cacheKey, data, 86400);

    return { financialData: data };
  } catch (error: any) {
    console.error(`[fetchFinancials] Error:`, error);
    return {
      dataFetchErrors: { financials: error.message || "Failed to fetch financial data." }
    };
  }
}
