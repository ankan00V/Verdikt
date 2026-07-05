import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage } from "@langchain/core/messages";
import { z } from "zod";

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

function createLLMInstance(isFallback: boolean, options: LLMOptions) {
  const apiKey = isFallback 
    ? (process.env.FALLBACK_API_KEY ?? process.env.NVIDIA_FALLBACK_API_KEY)
    : (process.env.PRIMARY_API_KEY ?? process.env.NVIDIA_NIM_API_KEY);
  
  let baseUrl = isFallback 
    ? (process.env.FALLBACK_BASE_URL ?? process.env.NVIDIA_NIM_BASE_URL) 
    : (process.env.PRIMARY_BASE_URL ?? process.env.NVIDIA_NIM_BASE_URL);
    
  let modelName = isFallback 
    ? (process.env.FALLBACK_MODEL ?? "meta-llama/llama-3.1-8b-instruct") 
    : (process.env.PRIMARY_MODEL ?? "meta-llama/llama-3.1-8b-instruct");
  
  if (!apiKey) return null;

  // If we are using NVIDIA NIM (default base URL), the model prefix must be "meta/" not "meta-llama/"
  const isNvidia = (baseUrl ?? "https://integrate.api.nvidia.com/v1").includes("nvidia");
  if (isNvidia && modelName.startsWith("meta-llama/")) {
    modelName = modelName.replace("meta-llama/", "meta/");
  }

  return new ChatOpenAI({
    model: modelName,
    apiKey: apiKey,
    configuration: {
      baseURL: baseUrl ?? "https://integrate.api.nvidia.com/v1",
    },
    temperature: options.temperature ?? 0,
    maxTokens: options.maxTokens,
    maxRetries: 0,
  });
}

export function createLLMs(options: LLMOptions = {}) {
  const primaryLLM = createLLMInstance(false, options) || new ChatOpenAI({
    model: "meta/llama-3.3-70b-instruct",
    apiKey: "dummy",
    maxRetries: 0
  });

  const fallbackLLM = createLLMInstance(true, options);

  return { primaryLLM, fallbackLLM };
}

export async function invokeStringLLM(
  prompt: any,
  options: LLMOptions = {}
): Promise<string> {
  const { primaryLLM, fallbackLLM } = createLLMs(options);

  const timeoutValueMs = options.timeoutMs || 25000;
  const MAX_RETRIES = 3;

  let lastError: any;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const llm = attempt % 2 === 1 || !fallbackLLM
      ? primaryLLM
      : fallbackLLM;
    const label = attempt % 2 === 1 || !fallbackLLM ? "primary" : "fallback";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutValueMs);

    try {
      console.log(`[LLM] String call attempt ${attempt}/${MAX_RETRIES} (${label}, timeout=${timeoutValueMs}ms)`);
      const response = await llm.invoke(prompt, { signal: controller.signal });
      clearTimeout(timeoutId);
      return (response.content as string).trim();
    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;

      const isTimeout = error.name === "AbortError" || controller.signal.aborted;

      console.error(
        `[LLM] String call attempt ${attempt}/${MAX_RETRIES} failed (${label}):`,
        isTimeout ? `Timeout after ${timeoutValueMs}ms` : error.message?.slice(0, 200)
      );

      // Only retry if it's NOT a timeout (retrying timeouts crashes Vercel's 60s limit)
      if (attempt < MAX_RETRIES && !isTimeout) {
        const backoffMs = 2000 * attempt;
        console.log(`[LLM] Retrying in ${backoffMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      if (isTimeout) {
        throw new Error(`LLM API request timed out after ${timeoutValueMs}ms (${MAX_RETRIES} attempts)`);
      }
      throw error;
    }
  }

  throw lastError;
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

  const timeoutValueMs = options.timeoutMs || 15000;
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

      console.error(
        `[LLM] Structured call attempt ${attempt}/${MAX_RETRIES} failed (${label}):`,
        isTimeout ? `Timeout after ${timeoutValueMs}ms` : error.message?.slice(0, 200)
      );

      // ALWAYS retry up to MAX_RETRIES to ensure we try the fallback LLM even on 401 errors
      // EXCEPT for timeouts, because retrying timeouts crashes Vercel's 60s limit
      if (attempt < MAX_RETRIES && !isTimeout) {
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
