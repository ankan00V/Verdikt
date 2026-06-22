const { default: YahooFinance } = require('yahoo-finance2');
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
async function run() {
  const quote = await yahooFinance.quoteSummary('AAPL', { modules: ['financialData', 'defaultKeyStatistics', 'assetProfile'] });
  console.log("financialData:", Object.keys(quote.financialData));
  console.log("defaultKeyStatistics:", Object.keys(quote.defaultKeyStatistics));
}
run();
