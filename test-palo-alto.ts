import { config } from "dotenv";
config({ path: ".env.local" });

import { graph } from "./src/lib/agent/graph";

async function main() {
  const companyName = "Palo Alto";
  const website = "paloaltonetworks.in";
  console.log(`Starting pipeline for: ${companyName} (${website})`);

  const stream = await graph.streamEvents(
    { companyName, website },
    { version: "v2" }
  );

  let finalState: any = null;

  for await (const event of stream) {
    if (event.event === "on_chain_end" && event.name === "LangGraph") {
      finalState = event.data.output;
    }
    if (event.event === "on_chain_start") {
      console.log(`\n[Node Start] ${event.name}`);
    }
  }

  console.log("\n==============================================");
  console.log("FINAL PIPELINE STATE:");
  console.log(JSON.stringify(finalState, null, 2));
}

main().catch(console.error);
