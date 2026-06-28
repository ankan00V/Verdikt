import { config } from "dotenv";
config({ path: ".env.local" });

import { ChatOpenAI } from "@langchain/openai";

async function main() {
  try {
    const llm = new ChatOpenAI({
      model: "meta/llama-3.1-70b-instruct",
      apiKey: process.env.NVIDIA_FALLBACK_API_KEY || process.env.NVIDIA_NIM_API_KEY,
      configuration: { baseURL: process.env.NVIDIA_NIM_BASE_URL ?? "https://integrate.api.nvidia.com/v1" },
      temperature: 1,
      maxTokens: 4096,
    });
    
    console.log("Using API Key starting with:", (process.env.NVIDIA_FALLBACK_API_KEY || process.env.NVIDIA_NIM_API_KEY).substring(0, 10));

    const prompt = `Provide the latest financial data for PANW in JSON format strictly matching this schema:
{
  "incomeStatements": [{"date":"YYYY-MM-DD","revenue":number,"grossProfit":number,"operatingIncome":number,"netIncome":number,"eps":number,"grossProfitRatio":number,"operatingIncomeRatio":number,"netIncomeRatio":number}],
  "keyMetrics": {"peRatio":number,"pbRatio":number,"evToEbitda":number,"debtToEquity":number,"currentRatio":number,"returnOnEquity":number,"returnOnAssets":number,"freeCashFlowPerShare":number,"revenuePerShare":number,"revenueGrowthYoY":number},
  "ratios": {"grossProfitMargin":number,"operatingProfitMargin":number,"netProfitMargin":number,"debtEquityRatio":number,"quickRatio":number,"dividendYield":number}
}
Only output the JSON object. Do not include markdown formatting or explanations.`;

    const response = await llm.invoke(prompt);
    console.log("Response:", response.content);
  } catch (err) {
    console.error("LLM Fallback failed:", err);
  }
}

main().catch(console.error);
