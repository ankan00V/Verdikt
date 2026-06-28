import { config } from "dotenv";
config({ path: ".env.local" });
import { ChatOpenAI } from "@langchain/openai";
import { FundamentalsSchema } from "./src/lib/agent/schemas";
import { zodToJsonSchema } from "zod-to-json-schema";

async function main() {
  const llm = new ChatOpenAI({
    model: "meta/llama-3.3-70b-instruct",
    apiKey: process.env.NVIDIA_NIM_API_KEY,
    configuration: {
      baseURL: process.env.NVIDIA_NIM_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
    },
    temperature: 0.0,
    maxTokens: 1000,
  });

  const structuredLlm = llm.withStructuredOutput(FundamentalsSchema, {
    method: "jsonMode",
  });
  
  const schemaStr = JSON.stringify(zodToJsonSchema(FundamentalsSchema), null, 2);

  const result = await structuredLlm.invoke(`
    You are a financial analyst.
    Company: PANW.
    Analyze the financials and provide a score.
    
    CRITICAL: Output valid JSON exactly matching this schema:
    ${schemaStr}
  `);

  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
