require('dotenv').config();
const { ChatOpenAI } = require("@langchain/openai");

async function testKey(apiKey, name) {
  if (!apiKey) {
    console.log(`${name} is missing`);
    return;
  }
  const llm = new ChatOpenAI({
    model: "meta/llama-3.1-70b-instruct",
    baseUrl: process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1",
    apiKey: apiKey,
    temperature: 0,
    maxTokens: 5
  });
  try {
    const res = await llm.invoke("Hello");
    console.log(`${name} SUCCESS`);
  } catch(e) {
    console.log(`${name} ERROR: ${e.message}`);
  }
}

async function run() {
  await testKey(process.env.NVIDIA_NIM_API_KEY, "Primary Key");
  await testKey(process.env.NVIDIA_FALLBACK_API_KEY, "Fallback Key");
}
run();
