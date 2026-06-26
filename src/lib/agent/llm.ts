import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage } from "@langchain/core/messages";
import { z } from "zod";

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
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
  
  // Strict kill-switch: abort if LLM takes too long so we don't crash the Vercel 60s limit
  // Increased from 25s to 50s because some parallel nodes have a 6s stagger
  const timeoutMs = options.timeoutMs || 50000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await llm.invoke(prompt, { signal: controller.signal });
    return (response.content as string).trim();
  } catch (error: any) {
    if (error.name === "AbortError" || controller.signal.aborted) {
      throw new Error(`LLM API request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function invokeStructuredLLM<T>(
  prompt: any,
  schema: z.ZodType<T>,
  options: LLMOptions = {}
): Promise<T> {
  const { primaryLLM, fallbackLLM } = createLLMs(options);
  const structuredPrimary = primaryLLM.withStructuredOutput(schema);

  
  let llm = structuredPrimary;
  if (fallbackLLM) {
    const structuredFallback = fallbackLLM.withStructuredOutput(schema);
    llm = structuredPrimary.withFallbacks({ fallbacks: [structuredFallback] });
  }
  
  // Strict kill-switch: abort the underlying fetch so LangGraph doesn't wait for dangling promises
  const timeoutValueMs = options.timeoutMs || 25000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutValueMs);

  try {
    return (await llm.invoke(prompt, { signal: controller.signal })) as T;
  } catch (error: any) {
    if (error.name === "AbortError" || controller.signal.aborted) {
      throw new Error(`LLM API request timed out after ${timeoutValueMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
