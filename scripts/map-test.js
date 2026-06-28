const { default: YahooFinance } = require('yahoo-finance2');
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

async function run() {
  const quote = await yahooFinance.quoteSummary('AAPL', {
    modules: ['assetProfile', 'price', 'incomeStatementHistory', 'defaultKeyStatistics', 'financialData']
  });

  const p = quote.assetProfile;
  const price = quote.price;
  const companyProfile = {
    ticker: 'AAPL',
    name: price?.shortName || '',
    description: p?.longBusinessSummary || '',
    sector: p?.sector || '',
    industry: p?.industry || '',
    country: p?.country || '',
    exchange: price?.exchangeName || '',
    marketCap: price?.marketCap || null,
    website: p?.website || '',
    ceo: p?.companyOfficers?.[0]?.name || ''
  };
  console.log("Profile mapped:", companyProfile);
  
  const rawIncome = quote.incomeStatementHistory?.incomeStatementHistory || [];
  const incomeStatements = rawIncome.map(d => ({
    date: d.endDate ? d.endDate.toISOString().split('T')[0] : "",
    revenue: d.totalRevenue ?? null,
    grossProfit: d.grossProfit ?? null,
    operatingIncome: d.operatingIncome ?? null,
    netIncome: d.netIncome ?? null,
    eps: null, // YF doesn't put EPS in incomeStatementHistory
    grossProfitRatio: (d.grossProfit && d.totalRevenue) ? d.grossProfit / d.totalRevenue : null,
    operatingIncomeRatio: (d.operatingIncome && d.totalRevenue) ? d.operatingIncome / d.totalRevenue : null,
    netIncomeRatio: (d.netIncome && d.totalRevenue) ? d.netIncome / d.totalRevenue : null,
  }));
  console.log("Income statements mapped:", incomeStatements);
  
  const fd = quote.financialData || {};
  const ks = quote.defaultKeyStatistics || {};
  const keyMetrics = {
    peRatio: ks.forwardPE ?? null,
    pbRatio: ks.priceToBook ?? null,
    evToEbitda: ks.enterpriseToEbitda ?? null,
    debtToEquity: fd.debtToEquity ?? null,
    currentRatio: fd.currentRatio ?? null,
    returnOnEquity: fd.returnOnEquity ?? null,
    returnOnAssets: fd.returnOnAssets ?? null,
    freeCashFlowPerShare: fd.freeCashflow ? (fd.freeCashflow / (ks.sharesOutstanding || 1)) : null,
    revenuePerShare: fd.revenuePerShare ?? null,
  };
  console.log("Key metrics mapped:", keyMetrics);
  
  const ratios = {
    grossProfitMargin: fd.grossMargins ?? null,
    operatingProfitMargin: fd.operatingMargins ?? null,
    netProfitMargin: fd.profitMargins ?? null,
    debtEquityRatio: fd.debtToEquity ?? null,
    quickRatio: fd.quickRatio ?? null,
    dividendYield: null, // wait, YF puts dividendYield in summaryDetail
  };
  console.log("Ratios mapped:", ratios);
}
run();
