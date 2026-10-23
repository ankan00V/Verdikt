/**
 * agent/llm.ts
 *
 * Resilient inference client for Groq's OpenAI-compatible endpoint
 * (POST {GROQ_BASE_URL}/chat/completions), called with plain fetch.
 *
 * No SDK sits in between on purpose. LangChain's withStructuredOutput sends a
 * strict `json_schema` response_format carrying keywords (maxItems, minimum,
 * maxLength) that Groq rejects, and it only works on the few Groq models that
 * support json_schema at all. Instead, structured calls use JSON mode — which
 * every Groq chat model supports — put the JSON Schema in the system prompt,
 * and validate the reply against the Zod schema here.
 *
 * Resilience:
 *
 *   1. Key rotation. GROQ_API_KEYS holds a comma-separated pool. Each retry
 *      advances to the next key, so a per-key rate limit (429) costs one
 *      attempt rather than failing the whole node.
 *
 *   2. Two genuinely different models. Attempts alternate between a primary
 *      and a fallback from a different family, so a model that refuses a
 *      schema or returns nonsense is followed by a different architecture.
 *
 * Timeouts are deliberately NOT retried: a retried timeout burns the serverless
 * wall-clock budget twice over and almost never succeeds the second time.
 */

import { z } from "zod";
import { toJsonSchema } from "@langchain/core/utils/json_schema";

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

type ChatMessage = { role: string; content: string };
type Prompt = string | ChatMessage[];

const GROQ_BASE_URL = (
  process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1"
).replace(/\/+$/, "");

// Two different model families, so the fallback is a real second opinion.
const PRIMARY_MODEL = process.env.GROQ_PRIMARY_MODEL ?? "openai/gpt-oss-120b";
const FALLBACK_MODEL =
  process.env.GROQ_FALLBACK_MODEL ?? "qwen/qwen3.8-27b";

// Reasoning models (gpt-oss, Qwen in thinking mode) spend tokens on internal
// reasoning BEFORE emitting any content. A tight budget tuned for a
// non-reasoning model gets consumed entirely by that reasoning: the call
// returns finish_reason "length" with content "", which reads downstream as a
// confident empty answer rather than a failure. Enforce a floor so a caller
// asking for a 3-token "YES"/"NO" still leaves room to think.
const REASONING_HEADROOM = 512;

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

/** Even attempts use the primary model, odd attempts the fallback. */
function modelForAttempt(attemptIndex: number): string {
  return attemptIndex % 2 === 0 ? PRIMARY_MODEL : FALLBACK_MODEL;
}

/** Number of attempts: one per key, but at least 2 so the fallback model is always tried. */
function attemptCount(): number {
  return Math.max(2, Math.min(getApiKeys().length, 4));
}

function describeAttempt(attemptIndex: number): string {
  return `key#${attemptIndex % Math.max(getApiKeys().length, 1)} ${modelForAttempt(attemptIndex)}`;
}

function toMessages(prompt: Prompt): ChatMessage[] {
  return typeof prompt === "string"
    ? [{ role: "user", content: prompt }]
    : prompt.map((m) => ({ role: m.role, content: String(m.content) }));
}

/**
 * Drops reasoning a model left inline in its answer. Qwen and DeepSeek emit
 * <think>…</think> in content unless told otherwise, and that text contains
 * the very words ("YES", "[") the callers look for.
 */
function stripReasoning(text: string): string {
  return text.replace(/<think>[\s\S]*?(<\/think>|$)/gi, "").trim();
}

class GroqError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "GroqError";
  }
}

/** One chat-completions request. Returns the assistant's text content. */
async function chatCompletion(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  options: LLMOptions,
  signal: AbortSignal,
  jsonMode: boolean
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? 0,
  };
  if (options.maxTokens) {
    body.max_completion_tokens = Math.max(options.maxTokens, REASONING_HEADROOM);
  }
  if (jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });

  const raw = await res.text();
  if (!res.ok) {
    // Groq returns { error: { message, type, code } }; surface the message so
    // the logs say "invalid API key" or "model not found", not just "400".
    let detail = raw.slice(0, 300);
    try {
      detail = JSON.parse(raw)?.error?.message ?? detail;
    } catch {}
    throw new GroqError(`Groq ${res.status}: ${detail}`, res.status);
  }

  const data = JSON.parse(raw);
  const choice = data?.choices?.[0];
  const content = stripReasoning(choice?.message?.content ?? "");
  if (!content) {
    throw new GroqError(
      `Groq returned an empty answer (finish_reason=${choice?.finish_reason ?? "unknown"})`
    );
  }
  return content;
}

/**
 * Shared retry loop. `run` receives the key and model for this attempt.
 */
async function withRetries<T>(
  label: string,
  options: LLMOptions,
  timeoutDefaultMs: number,
  run: (apiKey: string, model: string, signal: AbortSignal) => Promise<T>
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutValueMs);

    try {
      console.log(
        `[LLM] ${label} attempt ${i + 1}/${maxAttempts} (${describeAttempt(i)}, timeout=${timeoutValueMs}ms)`
      );
      const result = await run(keys[i % keys.length], modelForAttempt(i), controller.signal);
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      const isTimeout =
        (error as Error)?.name === "AbortError" || controller.signal.aborted;

      console.error(
        `[LLM] ${label} attempt ${i + 1}/${maxAttempts} failed (${describeAttempt(i)}):`,
        isTimeout
          ? `Timeout after ${timeoutValueMs}ms`
          : String((error as Error)?.message).slice(0, 300)
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
    : new Error(`LLM ${label} failed after ${maxAttempts} attempts`);
}

export async function invokeStringLLM(
  prompt: Prompt,
  options: LLMOptions = {}
): Promise<string> {
  const messages = toMessages(prompt);
  return withRetries("String call", options, 15000, (apiKey, model, signal) =>
    chatCompletion(apiKey, model, messages, options, signal, false)
  );
}

/** Pulls the JSON object out of a reply, tolerating ``` fences or stray prose. */
function extractJson(text: string): unknown {
  const unfenced = text.replace(/```(?:json)?/gi, "").trim();
  try {
    return JSON.parse(unfenced);
  } catch {
    const start = unfenced.indexOf("{");
    const end = unfenced.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("Reply contained no JSON object");
    return JSON.parse(unfenced.slice(start, end + 1));
  }
}

export async function invokeStructuredLLM<T>(
  prompt: Prompt,
  schema: z.ZodType<T>,
  options: LLMOptions = {}
): Promise<T> {
  const jsonSchema = JSON.stringify(toJsonSchema(schema));
  const instruction =
    `Respond with a single JSON object that conforms to this JSON Schema. ` +
    `Output only the JSON object — no markdown, no commentary. ` +
    `Every property is required; use null where the schema allows it and the value is unknown.\n\n` +
    `JSON Schema:\n${jsonSchema}`;

  // Merge into an existing system message rather than adding a second one —
  // some models weight only the first system message.
  const messages = toMessages(prompt);
  const systemIndex = messages.findIndex((m) => m.role === "system");
  if (systemIndex >= 0) {
    messages[systemIndex] = {
      role: "system",
      content: `${messages[systemIndex].content}\n\n${instruction}`,
    };
  } else {
    messages.unshift({ role: "system", content: instruction });
  }

  return withRetries("Structured call", options, 20000, async (apiKey, model, signal) => {
    const text = await chatCompletion(apiKey, model, messages, options, signal, true);
    const parsed = schema.safeParse(extractJson(text));
    if (!parsed.success) {
      // Thrown, not returned, so the next attempt (different model) gets a go.
      throw new Error(
        `Reply did not match schema: ${parsed.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".") || "(root)"} ${i.message}`)
          .join("; ")}`
      );
    }
    return parsed.data;
  });
}
