const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

async function test() {
  try {
    const quote = await yahooFinance.quoteSummary('PLTR', { modules: ["price"] });
    console.log(quote.price);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
