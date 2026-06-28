import { config } from "dotenv";
config({ path: ".env.local" });
import { ChatOpenAI } from "@langchain/openai";
import { FundamentalsSchema } from "./src/lib/agent/schemas";

async function main() {
  const llm = new ChatOpenAI({
    model: "meta/llama-3.3-70b-instruct",
    apiKey: process.env.NVIDIA_NIM_API_KEY,
    configuration: {
      baseURL: process.env.NVIDIA_NIM_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
    },
    temperature: 0.0,
    maxTokens: 600,
  });

  const structuredLlm = llm.withStructuredOutput(FundamentalsSchema, {
    method: "jsonMode",
  });

  const result = await structuredLlm.invoke(`
    You are a financial analyst.
    Please output JSON exactly matching the requested schema.
    Company: PANW.
    Analyze the financials and provide a score.
  `);

  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
