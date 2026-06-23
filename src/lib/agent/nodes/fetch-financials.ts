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
import { getCachedData } from "../../redis";

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

  let companyProfile: CompanyProfile | null = state.companyProfile || null;
  let financialsAvailable = false;
  let incomeStatements: IncomeStatement[] = [];
  let keyMetrics: KeyMetrics | null = null;
  let ratios: FinancialRatios | null = null;

  try {
    const quote = await getCachedData(
      `financials_v2:${ticker}`,
      async () => {
        const q = await yahooFinance.quoteSummary(ticker, {
          modules: [
            "assetProfile",
            "price",
            "incomeStatementHistory",
            "defaultKeyStatistics",
            "financialData",
            "summaryDetail",
          ],
        });
        
        // Prevent caching completely empty responses (e.g. rate limit)
        if (!q.price && !q.financialData && !q.assetProfile) {
          throw new Error("Yahoo Finance returned empty data (possible rate limit)");
        }
        
        return q;
      },
      86400 // 24 hours
    );

    // 1. Map Company Profile
    const p = quote.assetProfile;
    const price = quote.price;
    if (p || price) {
      companyProfile = {
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
      };
    }

    // 2. Map Income Statements
    const rawIncome = quote.incomeStatementHistory?.incomeStatementHistory || [];
    const fd = (quote.financialData || {}) as any;
    
    incomeStatements = rawIncome.map((d, i) => {
      const rev = d.totalRevenue ?? null;
      const gp = d.grossProfit ?? null;
      const op = d.operatingIncome ?? null;
      const ni = d.netIncome ?? null;
      
      const calcGpRatio = gp && rev ? gp / rev : null;
      const calcOpRatio = op && rev ? op / rev : null;
      const calcNiRatio = ni && rev ? ni / rev : null;

      return {
        date: d.endDate ? d.endDate.toISOString().split("T")[0] : "",
        revenue: rev,
        grossProfit: gp,
        operatingIncome: op,
        netIncome: ni,
        eps: null,
        grossProfitRatio: calcGpRatio || (i === 0 ? fd.grossMargins ?? null : null),
        operatingIncomeRatio: calcOpRatio || (i === 0 ? fd.operatingMargins ?? null : null),
        netIncomeRatio: calcNiRatio || (i === 0 ? fd.profitMargins ?? null : null),
      };
    });

    // 3. Map Key Metrics
    const ks = (quote.defaultKeyStatistics || {}) as any;
    let revenueGrowthYoY = null;
    if (incomeStatements.length >= 2) {
      const currentRev = incomeStatements[0].revenue;
      const prevRev = incomeStatements[1].revenue;
      if (currentRev !== null && prevRev !== null && prevRev > 0) {
        revenueGrowthYoY = (currentRev - prevRev) / prevRev;
      }
    }

    keyMetrics = {
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
    ratios = {
      grossProfitMargin: fd.grossMargins ?? null,
      operatingProfitMargin: fd.operatingMargins ?? null,
      netProfitMargin: fd.profitMargins ?? null,
      debtEquityRatio: fd.debtToEquity ?? null,
      quickRatio: fd.quickRatio ?? null,
      dividendYield: sd.dividendYield ?? null,
    };

    financialsAvailable = incomeStatements.length > 0 || Object.keys(fd).length > 0;

  } catch (err) {
    console.error("[fetch_financials] Yahoo Finance error:", err);
    financialsAvailable = false;
  }

  if (!financialsAvailable) {
    console.warn(`[fetch_financials] Yahoo Finance failed for ${ticker}. Using LLM fallback via meta/llama-3.1-70b-instruct.`);
    try {
      const { ChatOpenAI } = await import("@langchain/openai");
      const llm = new ChatOpenAI({
        model: "meta/llama-3.1-70b-instruct",
        apiKey: process.env.NVIDIA_FALLBACK_API_KEY || process.env.NVIDIA_NIM_API_KEY,
        configuration: { baseURL: process.env.NVIDIA_NIM_BASE_URL ?? "https://integrate.api.nvidia.com/v1" },
        temperature: 0,
        maxTokens: 1500,
        maxRetries: 0,
      });
      const prompt = `Provide the latest financial data for ${ticker} in JSON format strictly matching this schema:
{
  "incomeStatements": [{"date":"YYYY-MM-DD","revenue":number,"grossProfit":number,"operatingIncome":number,"netIncome":number,"eps":number,"grossProfitRatio":number,"operatingIncomeRatio":number,"netIncomeRatio":number}],
  "keyMetrics": {"peRatio":number,"pbRatio":number,"evToEbitda":number,"debtToEquity":number,"currentRatio":number,"returnOnEquity":number,"returnOnAssets":number,"freeCashFlowPerShare":number,"revenuePerShare":number,"revenueGrowthYoY":number},
  "ratios": {"grossProfitMargin":number,"operatingProfitMargin":number,"netProfitMargin":number,"debtEquityRatio":number,"quickRatio":number,"dividendYield":number}
}
Only output the JSON object. Do not include markdown formatting or explanations. Make sure numbers are accurate according to the latest annual reports. If any value is unknown, use null.`;
      
      const response = await llm.invoke(prompt);
      const text = (response.content as string).trim().replace(/```json/g, "").replace(/```/g, "");
      const fallbackFinancials = JSON.parse(text) as FinancialData;
      
      return {
        companyProfile: companyProfile || state.companyProfile,
        financials: fallbackFinancials,
        financialsAvailable: true,
      };
    } catch (fallbackErr) {
      console.error("[fetch_financials] LLM Fallback failed:", fallbackErr);
      return {
        companyProfile: companyProfile || state.companyProfile,
        financials: null,
        financialsAvailable: false,
        errors: [
          `No financial data found for ${ticker} via Yahoo Finance or Fallback API. ` +
            "This may indicate an inactive or delisted company, or missing fundamental coverage.",
        ],
      };
    }
  }

  const financials: FinancialData = {
    incomeStatements,
    keyMetrics: keyMetrics as KeyMetrics,
    ratios: ratios as FinancialRatios,
  };

  return {
    companyProfile: companyProfile || state.companyProfile,
    financials,
    financialsAvailable: true,
  };
}
