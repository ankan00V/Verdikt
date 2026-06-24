import { config } from "dotenv";
config({ path: ".env.local" });
import { analyzeFundamentalsNode } from "./src/lib/agent/nodes/analyze-fundamentals";
import { fetchFinancialsNode } from "./src/lib/agent/nodes/fetch-financials";

async function main() {
  const finState = await fetchFinancialsNode({
    ticker: "PANW",
    companyName: "Palo Alto Networks",
    website: "paloaltonetworks.com"
  } as any);

  const result = await analyzeFundamentalsNode({
    ticker: "PANW",
    financialsAvailable: finState.financialsAvailable,
    financials: finState.financials,
    companyProfile: finState.companyProfile,
    errors: []
  } as any);

  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
