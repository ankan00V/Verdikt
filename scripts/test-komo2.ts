import { resolveTickerNode } from "../src/lib/agent/nodes/resolve-ticker";

async function main() {
  console.log("Starting resolveTickerNode...");
  const start = Date.now();
  try {
    const result = await resolveTickerNode({
      companyName: 'KOMO',
      website: 'https://wearkomo.com',
      ticker: null,
      companyProfile: null,
      financials: null,
      financialsAvailable: false,
      newsResults: [],
      webResearchResults: [],
      fundamentalsAnalysis: null,
      sentimentAnalysis: null,
      competitiveAnalysis: null,
      decision: null,
      errors: []
    } as any);
    console.log("Result:", result);
  } catch (e) {
    console.error("Error:", e);
  }
  console.log("Took", Date.now() - start, "ms");
}

main();
