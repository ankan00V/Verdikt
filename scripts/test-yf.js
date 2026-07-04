const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

async function test() {
  console.log("Testing quoteSummary for 'KOMO'...");
  const start = Date.now();
  try {
    const res = await yahooFinance.quoteSummary('KOMO', { modules: ['price', 'financialData', 'assetProfile'] });
    console.log("Result:", res);
  } catch(e) {
    console.error("Error:", e.message);
  }
  console.log("Time:", Date.now() - start, "ms");
}
test();
