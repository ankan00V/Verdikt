require('dotenv').config();
const { TavilySearch } = require("@langchain/tavily");

async function test() {
  const tool = new TavilySearch({
    maxResults: 8,
    topic: "news",
    searchDepth: "advanced",
    timeRange: "month",
    includeAnswer: false,
    includeRawContent: false,
  });

  const res = await tool.invoke({ query: "Anthropic company news 2025 2026" });
  console.log(res);
}
test();
