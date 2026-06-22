/**
 * nodes/fetch-financials.ts
 *
 * Parallel node: fetches financial data using yahoo-finance2.
 *
 * Uses yahooFinance.quoteSummary to fetch:
 *   - Income statement history (up to 4 years)
 *   - Key statistics and financial data
 *   - Company Profile
 *
 * Graceful degradation: if yahoo-finance returns empty data, sets financialsAvailable = false.
 * The downstream analyze_fundamentals node checks this flag and adjusts its analysis.
 *
 * This node runs in parallel with fetch_news and fetch_web_research.
 */

import {
  AgentStateType,
  FinancialData,
  IncomeStatement,
  KeyMetrics,
  FinancialRatios,
  CompanyProfile,
} from "../state";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export async function fetchFinancialsNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const { ticker } = state;

  // If ticker resolution failed, skip gracefully
  if (!ticker) {
    return {
      financialsAvailable: false,
      errors: ["Financials skipped — no ticker resolved"],
    };
  }

  try {
    const quote = await yahooFinance.quoteSummary(ticker, {
      modules: [
        "assetProfile",
        "price",
        "incomeStatementHistory",
        "defaultKeyStatistics",
        "financialData",
        "summaryDetail",
      ],
    });

    // 1. Map Company Profile
    const p = quote.assetProfile;
    const price = quote.price;
    const companyProfile: CompanyProfile | null =
      p || price
        ? {
            ticker: ticker,
            name: price?.shortName || ticker,
            description: p?.longBusinessSummary || "",
            sector: p?.sector || "",
            industry: p?.industry || "",
            country: p?.country || "",
            exchange: price?.exchangeName || "",
            marketCap: price?.marketCap || null,
            website: p?.website || "",
            ceo: p?.companyOfficers?.[0]?.name || "",
          }
        : null;

    // 2. Map Income Statements
    const rawIncome = quote.incomeStatementHistory?.incomeStatementHistory || [];
    const incomeStatements: IncomeStatement[] = rawIncome.map((d) => {
      const rev = d.totalRevenue ?? null;
      const gp = d.grossProfit ?? null;
      const op = d.operatingIncome ?? null;
      const ni = d.netIncome ?? null;
      return {
        date: d.endDate ? d.endDate.toISOString().split("T")[0] : "",
        revenue: rev,
        grossProfit: gp,
        operatingIncome: op,
        netIncome: ni,
        eps: null, // yahooFinance2 puts this elsewhere, omitted here
        grossProfitRatio: gp && rev ? gp / rev : null,
        operatingIncomeRatio: op && rev ? op / rev : null,
        netIncomeRatio: ni && rev ? ni / rev : null,
      };
    });

    // 3. Map Key Metrics
    const fd = (quote.financialData || {}) as any;
    const ks = (quote.defaultKeyStatistics || {}) as any;
    // Calculate YoY Revenue Growth
    let revenueGrowthYoY = null;
    if (incomeStatements.length >= 2) {
      const currentRev = incomeStatements[0].revenue;
      const prevRev = incomeStatements[1].revenue;
      if (currentRev !== null && prevRev !== null && prevRev > 0) {
        revenueGrowthYoY = (currentRev - prevRev) / prevRev;
      }
    }

    const keyMetrics: KeyMetrics = {
      peRatio: ks.forwardPE ?? null,
      pbRatio: ks.priceToBook ?? ks.pbRatio ?? null,
      evToEbitda: ks.enterpriseToEbitda ?? null,
      debtToEquity: fd.debtToEquity ?? null,
      currentRatio: fd.currentRatio ?? null,
      returnOnEquity: fd.returnOnEquity ?? null,
      returnOnAssets: fd.returnOnAssets ?? null,
      freeCashFlowPerShare:
        fd.freeCashflow && ks.sharesOutstanding
          ? fd.freeCashflow / ks.sharesOutstanding
          : null,
      revenuePerShare: fd.revenuePerShare ?? null,
      revenueGrowthYoY: revenueGrowthYoY,
    };

    // 4. Map Ratios
    const sd = (quote.summaryDetail || {}) as any;
    const ratios: FinancialRatios = {
      grossProfitMargin: fd.grossMargins ?? null,
      operatingProfitMargin: fd.operatingMargins ?? null,
      netProfitMargin: fd.profitMargins ?? null,
      debtEquityRatio: fd.debtToEquity ?? null,
      quickRatio: fd.quickRatio ?? null,
      dividendYield: sd.dividendYield ?? null,
    };

    const financialsAvailable = incomeStatements.length > 0 || Object.keys(fd).length > 0;

    if (!financialsAvailable) {
      return {
        companyProfile: companyProfile || state.companyProfile,
        financials: null,
        financialsAvailable: false,
        errors: [
          `No financial data found for ${ticker} via Yahoo Finance. ` +
            "This may indicate an inactive or delisted company, or missing fundamental coverage.",
        ],
      };
    }

    const financials: FinancialData = {
      incomeStatements,
      keyMetrics,
      ratios,
    };

    return {
      companyProfile: companyProfile || state.companyProfile,
      financials,
      financialsAvailable: true,
    };
  } catch (err) {
    console.error("[fetch_financials] Error:", err);
    return {
      financials: null,
      financialsAvailable: false,
      errors: [
        `Failed to fetch financial data for ${ticker}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      ],
    };
  }
}
