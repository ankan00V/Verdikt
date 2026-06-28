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
  const structuredFallback = fallbackLLM
    ? fallbackLLM.withStructuredOutput(schema)
    : null;

  const timeoutValueMs = options.timeoutMs || 50000;
  const MAX_RETRIES = 3;

  let lastError: any;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    // Alternate between primary and fallback on retries to spread load
    const llm = attempt % 2 === 1 || !structuredFallback
      ? structuredPrimary
      : structuredFallback;
    const label = attempt % 2 === 1 || !structuredFallback ? "primary" : "fallback";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutValueMs);

    try {
      console.log(`[LLM] Structured call attempt ${attempt}/${MAX_RETRIES} (${label}, timeout=${timeoutValueMs}ms)`);
      const result = (await llm.invoke(prompt, { signal: controller.signal })) as T;
      clearTimeout(timeoutId);
      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;

      const isTimeout = error.name === "AbortError" || controller.signal.aborted;
      const is429 = error.status === 429 || error.message?.includes("429");
      const isRetryable = isTimeout || is429 || error.message?.includes("ECONNRESET");

      console.error(
        `[LLM] Structured call attempt ${attempt}/${MAX_RETRIES} failed (${label}):`,
        isTimeout ? `Timeout after ${timeoutValueMs}ms` : error.message?.slice(0, 200)
      );

      if (attempt < MAX_RETRIES && isRetryable) {
        // Exponential backoff: 2s, 4s
        const backoffMs = 2000 * attempt;
        console.log(`[LLM] Retrying in ${backoffMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      // Non-retryable error or last attempt — throw immediately
      if (isTimeout) {
        throw new Error(`LLM API request timed out after ${timeoutValueMs}ms (${MAX_RETRIES} attempts)`);
      }
      throw error;
    }
  }

  throw lastError;
}
