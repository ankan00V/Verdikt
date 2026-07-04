require('dotenv').config();
const { ChatOpenAI } = require("@langchain/openai");

async function test() {
  const llm = new ChatOpenAI({
    model: "meta/llama-3.1-70b-instruct",
    baseUrl: process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1",
    apiKey: process.env.NVIDIA_NIM_API_KEY,
    temperature: 0,
    maxTokens: 50
  });

  const content = "Palantir Technologies Inc. is a public American software company that specializes in big data analytics. Headquartered in Denver, Colorado, it was founded by Peter Thiel, Nathan Gettings, Joe Lonsdale, Stephen Cohen, and Alex Karp in 2003.";
  
  const prompt = `Extract up to 3 stock ticker symbols for the company operating at the website: palantir.com. The user referred to them as "Palantir", but the website is the absolute source of truth. Rely on the website URL over the provided name. 
CRITICAL RULES:
1. If the company has a US listing (NASDAQ/NYSE), put it first.
2. If it is an international company, include its international tickers (e.g., ["TATASTEEL.NS"]).
3. Reply ONLY with a valid JSON array of strings, e.g., ["PANW", "PANW.TO"] or ["AAPL"].
4. If no clear ticker is found, reply ["UNKNOWN"].

Text:
${content.slice(0, 2000)}`;

  try {
    const res = await llm.invoke([{ role: "user", content: prompt }]);
    console.log(res.content);
  } catch(e) {
    console.log("LLM error", e);
  }
}
test();
