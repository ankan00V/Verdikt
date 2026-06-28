const yahooFinance = require('yahoo-finance2').default;
async function test() {
  try {
    const quote = await yahooFinance.quoteSummary('AAPL', { modules: ['price'] });
    console.log("Success:", quote.price.shortName);
    
    // Check if we can extract crumb/cookie
    console.log("Crumb:", await yahooFinance._getCrumb());
  } catch (e) {
    console.error("Error:", e.message);
  }
}
test();
