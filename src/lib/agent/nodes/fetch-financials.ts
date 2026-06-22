/**
 * nodes/fetch-financials.ts
 *
 * Parallel node: fetches financial data from Financial Modeling Prep (FMP).
 *
 * Uses Promise.all to fire three FMP API calls concurrently:
 *   - Income statement (3 years annual)
 *   - Key metrics (latest annual)
 *   - Financial ratios (latest annual)
 *
 * Graceful degradation: if FMP returns empty data (private company, OTC, or
 * insufficient history), sets financialsAvailable = false. The downstream
 * analyze_fundamentals node checks this flag and adjusts its analysis.
 *
 * This node runs in parallel with fetch_news and fetch_web_research.
 * It writes to ticker-specific fields (financials, financialsAvailable),
 * which are non-array fields with last-write-wins reducers — safe for parallel execution.
 */

import {
  AgentStateType,
  FinancialData,
  IncomeStatement,
  KeyMetrics,
  FinancialRatios,
} from "../state";

const FMP_BASE = "https://financialmodelingprep.com/api/v3";

// ---------------------------------------------------------------------------
// Individual fetchers
// ---------------------------------------------------------------------------

async function fetchIncomeStatements(
  ticker: string,
  apiKey: string
): Promise<IncomeStatement[]> {
  const url = `${FMP_BASE}/income-statement/${ticker}?period=annual&limit=3&apikey=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<Record<string, unknown>>;
  if (!Array.isArray(data)) return [];

  return data.map((d) => ({
    date: (d.date as string) ?? "",
    revenue: typeof d.revenue === "number" ? d.revenue : null,
    grossProfit: typeof d.grossProfit === "number" ? d.grossProfit : null,
    operatingIncome: typeof d.operatingIncome === "number" ? d.operatingIncome : null,
    netIncome: typeof d.netIncome === "number" ? d.netIncome : null,
    eps: typeof d.eps === "number" ? d.eps : null,
    grossProfitRatio: typeof d.grossProfitRatio === "number" ? d.grossProfitRatio : null,
    operatingIncomeRatio: typeof d.operatingIncomeRatio === "number" ? d.operatingIncomeRatio : null,
    netIncomeRatio: typeof d.netIncomeRatio === "number" ? d.netIncomeRatio : null,
  }));
}

async function fetchKeyMetrics(
  ticker: string,
  apiKey: string
): Promise<KeyMetrics | null> {
  const url = `${FMP_BASE}/key-metrics/${ticker}?period=annual&limit=1&apikey=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return null;

  const data = (await res.json()) as Array<Record<string, unknown>>;
  if (!Array.isArray(data) || data.length === 0) return null;

  const d = data[0];
  return {
    peRatio: typeof d.peRatio === "number" ? d.peRatio : null,
    pbRatio: typeof d.pbRatio === "number" ? d.pbRatio : null,
    evToEbitda: typeof d.evToEbitda === "number" ? d.evToEbitda : null,
    debtToEquity: typeof d.debtToEquity === "number" ? d.debtToEquity : null,
    currentRatio: typeof d.currentRatio === "number" ? d.currentRatio : null,
    returnOnEquity: typeof d.returnOnEquity === "number" ? d.returnOnEquity : null,
    returnOnAssets: typeof d.returnOnAssets === "number" ? d.returnOnAssets : null,
    freeCashFlowPerShare:
      typeof d.freeCashFlowPerShare === "number" ? d.freeCashFlowPerShare : null,
    revenuePerShare: typeof d.revenuePerShare === "number" ? d.revenuePerShare : null,
  };
}

async function fetchRatios(
  ticker: string,
  apiKey: string
): Promise<FinancialRatios | null> {
  const url = `${FMP_BASE}/ratios/${ticker}?period=annual&limit=1&apikey=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return null;

  const data = (await res.json()) as Array<Record<string, unknown>>;
  if (!Array.isArray(data) || data.length === 0) return null;

  const d = data[0];
  return {
    grossProfitMargin:
      typeof d.grossProfitMargin === "number" ? d.grossProfitMargin : null,
    operatingProfitMargin:
      typeof d.operatingProfitMargin === "number" ? d.operatingProfitMargin : null,
    netProfitMargin: typeof d.netProfitMargin === "number" ? d.netProfitMargin : null,
    debtEquityRatio: typeof d.debtEquityRatio === "number" ? d.debtEquityRatio : null,
    quickRatio: typeof d.quickRatio === "number" ? d.quickRatio : null,
    dividendYield: typeof d.dividendYield === "number" ? d.dividendYield : null,
  };
}

// ---------------------------------------------------------------------------
// Main node function
// ---------------------------------------------------------------------------

export async function fetchFinancialsNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const { ticker, companyProfile } = state;

  // If ticker resolution failed, skip gracefully
  if (!ticker) {
    return {
      financialsAvailable: false,
      errors: ["Financials skipped — no ticker resolved"],
    };
  }

  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return {
      financialsAvailable: false,
      errors: ["FMP_API_KEY is not configured — financial data unavailable"],
    };
  }

  try {
    // Fire all three requests concurrently
    const [incomeStatements, keyMetrics, ratios] = await Promise.all([
      fetchIncomeStatements(ticker, apiKey),
      fetchKeyMetrics(ticker, apiKey),
      fetchRatios(ticker, apiKey),
    ]);

    // Consider data available if we got at least one income statement with valid revenue,
    // and the company is listed on a major US exchange.
    const hasIncomeStatement = incomeStatements.length > 0;
    const latestRevenue = hasIncomeStatement ? incomeStatements[0].revenue : null;
    const hasValidRevenue = latestRevenue !== null && latestRevenue > 0;
    
    const exchange = companyProfile?.exchange?.toUpperCase() || "";
    const isMajorUSExchange = ["NYSE", "NASDAQ", "AMEX"].includes(exchange);

    const financialsAvailable = hasIncomeStatement && hasValidRevenue && isMajorUSExchange;

    if (!financialsAvailable) {
      return {
        financials: {
          available: false,
          reason: "Financial data unavailable for this company. FMP free tier covers US-listed public companies. This analysis will proceed using news and web research only.",
          data: null
        },
        financialsAvailable: false,
      };
    }

    const financials: FinancialData = {
      available: true,
      data: {
        incomeStatements,
        keyMetrics,
        ratios,
      }
    };

    return {
      financials,
      financialsAvailable: true,
    };
  } catch (err) {
    console.error("[fetch_financials] Error:", err);
    return {
      financials: null,
      financialsAvailable: false,
      errors: [
        `Failed to fetch financial data for ${ticker}: ${err instanceof Error ? err.message : String(err)}`,
      ],
    };
  }
}
