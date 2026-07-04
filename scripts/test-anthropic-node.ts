import { analyzeFundamentalsNode } from "../src/lib/agent/nodes/analyze-fundamentals";
import { AgentStateType } from "../src/lib/agent/state";

async function test() {
  const state: AgentStateType = {
    companyName: "Anthropic",
    website: "anthropic.com",
    ticker: null,
    financialsAvailable: false,
    financials: null,
    companyProfile: null,
    newsResults: [],
    webResearchResults: [],
    errors: ["No specific error recorded."],
  } as unknown as AgentStateType;

  console.log("Testing analyzeFundamentalsNode...");
  const result = await analyzeFundamentalsNode(state);
  console.log(JSON.stringify(result, null, 2));
}

test();
