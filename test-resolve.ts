import { resolveTicker } from "./src/lib/agent/nodes/resolveTicker";
import { getEnv } from "./src/lib/config";

async function main() {
  const result = await resolveTicker({ companyName: "Tesla" } as any);
  console.log("Tesla result:", result);
}
main().catch(console.error);
