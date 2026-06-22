import { fetchFinancialsNode } from "./src/lib/agent/nodes/fetch-financials";

async function run() {
  console.log("=== Testing AAPL ===");
  const aapl = await fetchFinancialsNode({ ticker: "AAPL" } as any);
  console.log("AAPL available:", aapl.financialsAvailable);
  console.log("AAPL profile:", !!aapl.companyProfile);
  
  console.log("=== Testing PLTR ===");
  const pltr = await fetchFinancialsNode({ ticker: "PLTR" } as any);
  console.log("PLTR available:", pltr.financialsAvailable);
  
  console.log("=== Testing TATASTEEL.NS ===");
  const tata = await fetchFinancialsNode({ ticker: "TATASTEEL.NS" } as any);
  console.log("TATA available:", tata.financialsAvailable);
  if (!tata.financialsAvailable) {
    console.log("Errors:", tata.errors);
  } else {
    console.log("TATA profile:", tata.companyProfile?.name);
  }
}
run();
