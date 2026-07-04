require('dotenv').config();

async function test() {
  const { TavilySearch } = require("@langchain/tavily");
  const tool = new TavilySearch({
    maxResults: 3,
    topic: "general",
  });

  const query = `What is the stock ticker symbol for the company operating at palantir.com (also known as "Palantir")? Yahoo Finance`;
  let results = await tool.invoke({ query });
  
  const parsed = typeof results === "string" ? JSON.parse(results) : results;
  const resultsArray = Array.isArray(parsed) ? parsed : (parsed.results || []);
  const content = resultsArray.map((r) => r.content || "").join("\n");
  console.log("Tavily content length:", content.length);
  console.log("Tavily content:", content);
}
test();
