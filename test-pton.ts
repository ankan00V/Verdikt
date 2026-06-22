import { config } from "dotenv";
config({ path: ".env.local" });

import { buildGraph } from "./src/lib/agent/graph";

async function main() {
  console.log("Testing Peloton (PTON)...");
  try {
    const graph = buildGraph();
    const result = await graph.invoke({ companyName: "Peloton" });
    console.log("=== RESULTS ===");
    console.log("Final verdict:", result.decision?.verdict);
    console.log("Confidence:", result.decision?.confidence);
    console.log("Reasoning:", result.decision?.oneLineRationale);
    console.log("Fundamentals:", result.decision?.fundamentalsSummary);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
