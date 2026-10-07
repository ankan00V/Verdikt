/**
 * agent/llm.ts
 *
 * Resilient inference client, backed by Groq's OpenAI-compatible endpoint.
 *
 * Two things make this more than a wrapper around an API call:
 *
 *   1. Key rotation. GROQ_API_KEYS holds a comma-separated pool. Each retry
 *      advances to the next key, so a per-key rate limit (429) costs one
 *      attempt rather than failing the whole node.
 *
 *   2. Two genuinely different models. Attempts alternate between a primary
 *      and a structurally different fallback model — not the same model called
 *      twice. If one model refuses a schema or returns nonsense, the next
 *      attempt is a different architecture, not a retry of the same thing.
 *
 * Timeouts are deliberately NOT retried: a retried timeout burns the serverless
 * wall-clock budget twice over and almost never succeeds the second time.
 */

import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

const GROQ_BASE_URL =
  process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1";

// Two different model families, so the fallback is a real second opinion.
const PRIMARY_MODEL =
  process.env.GROQ_PRIMARY_MODEL ?? "openai/gpt-oss-120b";
const FALLBACK_MODEL =
  process.env.GROQ_FALLBACK_MODEL ?? "qwen/qwen3.8-27b";

/**
 * Reads the key pool. Accepts either GROQ_API_KEYS (comma-separated) or a
 * single GROQ_API_KEY, so a one-key deployment needs no special casing.
 */
export function getApiKeys(): string[] {
  const raw = process.env.GROQ_API_KEYS ?? process.env.GROQ_API_KEY ?? "";
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

/**
 * Builds the client for a given attempt. Even attempts use the primary model,
 * odd attempts the fallback; the key advances every attempt independently, so
 * with 4 keys and 2 models no two attempts repeat the same pair.
 */
function createLLMForAttempt(attemptIndex: number, options: LLMOptions) {
  const keys = getApiKeys();
  if (keys.length === 0) return null;

  const apiKey = keys[attemptIndex % keys.length];
  const model = attemptIndex % 2 === 0 ? PRIMARY_MODEL : FALLBACK_MODEL;

  // Reasoning models (gpt-oss, and Qwen in thinking mode) spend tokens on
  // internal reasoning BEFORE emitting any content. A tight budget tuned for a
  // non-reasoning model gets consumed entirely by that reasoning: the call
  // returns finish_reason "length" with content "", which reads downstream as a
  // confident empty answer rather than a failure. Enforce a floor so a caller
  // asking for a 3-token "YES"/"NO" still leaves room to think.
  const REASONING_HEADROOM = 512;
  const maxTokens = options.maxTokens
    ? Math.max(options.maxTokens, REASONING_HEADROOM)
    : undefined;

  return new ChatOpenAI({
    model,
    apiKey,
    configuration: { baseURL: GROQ_BASE_URL },
    temperature: options.temperature ?? 0,
    maxTokens,
    maxRetries: 0, // retries are orchestrated here, not inside the SDK
  });
}

/** Number of attempts: one per key, but at least 2 so the fallback model is always tried. */
function attemptCount(): number {
  return Math.max(2, Math.min(getApiKeys().length, 4));
}

function describeAttempt(attemptIndex: number): string {
  const model = attemptIndex % 2 === 0 ? PRIMARY_MODEL : FALLBACK_MODEL;
  return `key#${attemptIndex % Math.max(getApiKeys().length, 1)} ${model}`;
}

/**
 * Shared retry loop. `run` receives a configured client and returns the result.
 */
async function withRetries<T>(
  label: string,
  options: LLMOptions,
  timeoutDefaultMs: number,
  run: (llm: ChatOpenAI, signal: AbortSignal) => Promise<T>
): Promise<T> {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new Error(
      "No Groq API key configured. Set GROQ_API_KEYS (comma-separated) or GROQ_API_KEY."
    );
  }

  const timeoutValueMs = options.timeoutMs ?? timeoutDefaultMs;
  const maxAttempts = attemptCount();
  let lastError: unknown;

  for (let i = 0; i < maxAttempts; i++) {
    const llm = createLLMForAttempt(i, options);
    if (!llm) break;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutValueMs);

    try {
      console.log(
        `[LLM] ${label} attempt ${i + 1}/${maxAttempts} (${describeAttempt(i)}, timeout=${timeoutValueMs}ms)`
      );
      const result = await run(llm, controller.signal);
      clearTimeout(timeoutId);
      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;

      const isTimeout =
        error?.name === "AbortError" || controller.signal.aborted;

      console.error(
        `[LLM] ${label} attempt ${i + 1}/${maxAttempts} failed (${describeAttempt(i)}):`,
        isTimeout
          ? `Timeout after ${timeoutValueMs}ms`
          : String(error?.message).slice(0, 200)
      );

      // A timeout means we are out of wall-clock budget, not that the key is
      // bad. Retrying spends the budget again for the same likely outcome.
      if (isTimeout) {
        throw new Error(
          `LLM request timed out after ${timeoutValueMs}ms (attempt ${i + 1}/${maxAttempts})`
        );
      }

      if (i < maxAttempts - 1) {
        // Short backoff only — the next attempt uses a different key, so we are
        // not waiting out a rate limit on the key that just failed.
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`LLM ${label} failed after ${attemptCount()} attempts`);
}

/** Back-compat helper: some call sites still construct clients directly. */
export function createLLMs(options: LLMOptions = {}) {
  return {
    primaryLLM: createLLMForAttempt(0, options),
    fallbackLLM: createLLMForAttempt(1, options),
  };
}

export async function invokeStringLLM(
  prompt: any,
  options: LLMOptions = {}
): Promise<string> {
  return withRetries("String call", options, 15000, async (llm, signal) => {
    const response = await llm.invoke(prompt, { signal });
    return (response.content as string).trim();
  });
}

export async function invokeStructuredLLM<T>(
  prompt: any,
  schema: z.ZodType<T>,
  options: LLMOptions = {}
): Promise<T> {
  return withRetries("Structured call", options, 20000, async (llm, signal) => {
    const structured = llm.withStructuredOutput(schema);
    return (await structured.invoke(prompt, { signal })) as T;
  });
}
