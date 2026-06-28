import { config } from "dotenv";
config({ path: ".env.local" });

import { TavilySearch } from "@langchain/tavily";

async function run() {
  console.log("TAVILY_API_KEY:", process.env.TAVILY_API_KEY ? "EXISTS" : "MISSING");
  const tool = new TavilySearch({
    maxResults: 3,
    topic: "news",
  });
  try {
    const res = await tool.invoke({ query: "Microsoft MSFT stock news" });
    console.log("Result:", typeof res === "string" ? res.slice(0, 1000) : res);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
