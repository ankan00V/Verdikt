import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

async function main() {
  try {
    const quote = await yahooFinance.quoteSummary("PANW", {
      modules: ["price", "assetProfile", "financialData", "defaultKeyStatistics", "summaryDetail", "incomeStatementHistory"]
    });
    console.log("Price ok:", !!quote.price);
    console.log("Income statements length:", quote.incomeStatementHistory?.incomeStatementHistory?.length || 0);
    console.log("Financial Data keys:", Object.keys(quote.financialData || {}).length);
  } catch (err) {
    console.error("Error", err);
  }
}
main();
