import yahooFinance from "yahoo-finance2";
yahooFinance.quoteSummary("PANW", { modules: ["price"] })
  .then(res => console.log("Success", res))
  .catch(err => console.error("Yahoo Error", err));
