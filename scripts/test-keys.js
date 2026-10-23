// Checks every key in GROQ_API_KEYS against both configured models.
// Usage: node --env-file=.env.local scripts/test-keys.js
const BASE_URL = (process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, "");
const MODELS = [
  process.env.GROQ_PRIMARY_MODEL || "openai/gpt-oss-120b",
  process.env.GROQ_FALLBACK_MODEL || "llama-3.3-70b-versatile",
];

async function testKey(apiKey, name) {
  for (const model of MODELS) {
    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Reply with the word OK." }],
          max_completion_tokens: 512,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) console.log(`${name} ${model}: SUCCESS`);
      else console.log(`${name} ${model}: ERROR ${res.status} ${body?.error?.message ?? ""}`);
    } catch (e) {
      console.log(`${name} ${model}: ERROR ${e.message}`);
    }
  }
}

async function run() {
  const keys = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  if (keys.length === 0) {
    console.log("No keys found. Set GROQ_API_KEYS (comma-separated) or GROQ_API_KEY.");
    return;
  }
  for (let i = 0; i < keys.length; i++) await testKey(keys[i], `key#${i}`);
}
run();
