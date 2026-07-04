require('dotenv').config();
const { ChatOpenAI } = require("@langchain/openai");

async function test() {
  const llm = new ChatOpenAI({
    model: "meta/llama-3.3-70b-instruct",
    apiKey: process.env.NVIDIA_NIM_API_KEY,
    configuration: {
      baseURL: process.env.NVIDIA_NIM_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
    },
    maxRetries: 0
  });

  console.log("Invoking 3.3...");
  const start = Date.now();
  try {
    const res = await llm.invoke("Say hi");
    console.log("3.3 Result:", res.content);
  } catch (e) {
    console.error("3.3 Error:", e.message);
  }
  console.log("3.3 Time:", Date.now() - start, "ms");
}
test();
