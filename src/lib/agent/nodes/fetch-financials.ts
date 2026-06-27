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
import { z } from "zod";
import { HttpsProxyAgent } from "https-proxy-agent";

const FallbackFinancialsSchema = z.object({
  incomeStatements: z.array(
    z.object({
      date: z.string(),
      revenue: z.number().nullable(),
      grossProfit: z.number().nullable(),
      operatingIncome: z.number().nullable(),
      netIncome: z.number().nullable(),
      eps: z.number().nullable(),
      grossProfitRatio: z.number().nullable(),
      operatingIncomeRatio: z.number().nullable(),
      netIncomeRatio: z.number().nullable(),
    })
  ),
  keyMetrics: z.object({
    peRatio: z.number().nullable(),
    pbRatio: z.number().nullable(),
    evToEbitda: z.number().nullable(),
    debtToEquity: z.number().nullable(),
    currentRatio: z.number().nullable(),
    returnOnEquity: z.number().nullable(),
    returnOnAssets: z.number().nullable(),
    freeCashFlowPerShare: z.number().nullable(),
    revenuePerShare: z.number().nullable(),
    revenueGrowthYoY: z.number().nullable(),
  }),
  ratios: z.object({
    grossProfitMargin: z.number().nullable(),
    operatingProfitMargin: z.number().nullable(),
    netProfitMargin: z.number().nullable(),
    debtEquityRatio: z.number().nullable(),
    quickRatio: z.number().nullable(),
    dividendYield: z.number().nullable(),
  }),
});

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// Build a proxy agent once at module load time if YAHOO_PROXY_URL is set
const proxyAgent = process.env.YAHOO_PROXY_URL
  ? new HttpsProxyAgent(process.env.YAHOO_PROXY_URL)
  : undefined;

if (proxyAgent) {
  console.log("[fetch_financials] Yahoo Finance is routing through a proxy.");
}

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
        // Build fetchOptions with proxy if available
        // yahoo-finance2 v3 accepts fetchOptions per-call via the third argument (moduleOptions)
        const moduleOptions = proxyAgent
          ? { fetchOptions: { agent: proxyAgent } }
          : {};

        const q = await yahooFinance.quoteSummary(
          ticker,
          {
            modules: [
              "assetProfile",
              "price",
              "incomeStatementHistory",
              "defaultKeyStatistics",
              "financialData",
              "summaryDetail",
            ],
          },
          // @ts-expect-error - moduleOptions typing varies across versions
          moduleOptions
        );
        
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

    // 2. Map Income Statements (Limit to last 3 years to save LLM context/processing time)
    const rawIncome = (quote.incomeStatementHistory?.incomeStatementHistory || []).slice(0, 3);
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
      const { invokeStructuredLLM } = await import("../llm");
      const prompt = `Provide the latest financial data for ${ticker}. 
      Make sure numbers are accurate according to the latest annual reports. 
      If any value is unknown, use null.`;
      
      const fallbackFinancials = await invokeStructuredLLM(
        [{ role: "user", content: prompt }],
        FallbackFinancialsSchema,
        { temperature: 0 }
      );
      
      return {
        companyProfile: companyProfile || state.companyProfile,
        financials: fallbackFinancials as FinancialData,
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
