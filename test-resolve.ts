import { resolveTickerNode } from "./src/lib/agent/nodes/resolve-ticker";
import { config } from "dotenv";
config({ path: ".env.local" });

async function run() {
  console.log("Testing resolveTickerNode for Palantir...");
  const res = await resolveTickerNode({ companyName: "Palantir" } as any);
  console.log(res);
}
run();
