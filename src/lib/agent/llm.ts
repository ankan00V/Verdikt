import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage } from "@langchain/core/messages";
import { z } from "zod";

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
}

export function createLLMs(options: LLMOptions = {}) {
  const primaryLLM = new ChatOpenAI({
    model: "meta/llama-3.3-70b-instruct",
    apiKey: process.env.NVIDIA_NIM_API_KEY,
    configuration: {
      baseURL: process.env.NVIDIA_NIM_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
    },
    temperature: options.temperature ?? 0,
    maxTokens: options.maxTokens,
    maxRetries: 0,
  });

  let fallbackLLM: ChatOpenAI | null = null;
  if (process.env.NVIDIA_FALLBACK_API_KEY) {
    fallbackLLM = new ChatOpenAI({
      model: "meta/llama-3.3-70b-instruct",
      apiKey: process.env.NVIDIA_FALLBACK_API_KEY,
      configuration: {
        baseURL: process.env.NVIDIA_NIM_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
      },
      temperature: options.temperature ?? 0,
      maxTokens: options.maxTokens,
      maxRetries: 0,
    });
  }

  return { primaryLLM, fallbackLLM };
}

export async function invokeStringLLM(
  prompt: any,
  options: LLMOptions = {}
): Promise<string> {
  const { primaryLLM, fallbackLLM } = createLLMs(options);
  const llm = fallbackLLM ? primaryLLM.withFallbacks({ fallbacks: [fallbackLLM] }) : primaryLLM;
  const response = await llm.invoke(prompt);
  return (response.content as string).trim();
}

export async function invokeStructuredLLM<T>(
  prompt: any,
  schema: z.ZodType<T>,
  options: LLMOptions = {}
): Promise<T> {
  const { primaryLLM, fallbackLLM } = createLLMs(options);
  const structuredPrimary = primaryLLM.withStructuredOutput(schema);
  
  if (fallbackLLM) {
    const structuredFallback = fallbackLLM.withStructuredOutput(schema);
    const llm = structuredPrimary.withFallbacks({ fallbacks: [structuredFallback] });
    return (await llm.invoke(prompt)) as T;
  }
  
  return (await structuredPrimary.invoke(prompt)) as T;
}
