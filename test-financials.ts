import { config } from "dotenv";
config({ path: ".env.local" });

import { fetchFinancialsNode } from "./src/lib/agent/nodes/fetch-financials";

async function main() {
  const result = await fetchFinancialsNode({
    ticker: "PANW",
    companyName: "Palo Alto Networks",
    website: "paloaltonetworks.com"
  } as any);

  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
