import { config } from "dotenv";
config({ path: ".env.local" });

import { buildGraph } from "./src/lib/agent/graph";

async function main() {
  const company = process.argv[2];
  if (!company) {
    console.error("Please provide a company name.");
    process.exit(1);
  }
  console.log(`Testing ${company}...`);
  try {
    const graph = buildGraph();
    const result = await graph.invoke({ companyName: company });
    console.log("=== RESULTS ===");
    console.log("Verdict:", result.decision?.verdict);
    console.log("Confidence:", result.decision?.confidence);
    console.log("Reasoning:", result.decision?.oneLineRationale);
    console.log("Fundamentals:", result.decision?.fundamentalsSummary);
    console.log("Sentiment:", result.decision?.sentimentSummary);
    console.log("Competitive:", result.decision?.competitiveSummary);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
