import { z } from "zod";

const envSchema = z.object({
  NVIDIA_NIM_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  FMP_API_KEY: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  USE_MOCK_DATA: z.boolean().default(false),
});

export const getEnv = () => {
  const env = {
    NVIDIA_NIM_API_KEY: process.env.NVIDIA_NIM_API_KEY,
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    FMP_API_KEY: process.env.FMP_API_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    USE_MOCK_DATA: process.env.USE_MOCK_DATA === "true",
  };

  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.format());
    throw new Error("Invalid environment variables. Check your .env.local file.");
  }

  const data = parsed.data;

  // If not using mock data, API keys are strictly required.
  // Fail loudly and early so it doesn't crash mid-request.
  if (!data.USE_MOCK_DATA) {
    const missingKeys = [];
    if (!data.NVIDIA_NIM_API_KEY) missingKeys.push("NVIDIA_NIM_API_KEY");
    if (!data.TAVILY_API_KEY) missingKeys.push("TAVILY_API_KEY");
    if (!data.FMP_API_KEY) missingKeys.push("FMP_API_KEY");

    if (missingKeys.length > 0) {
      throw new Error(`[config] Missing required API keys for live run: ${missingKeys.join(", ")}. Check your .env.local file, or set USE_MOCK_DATA=true for development.`);
    }
  }

  return data as {
    NVIDIA_NIM_API_KEY: string;
    TAVILY_API_KEY: string;
    FMP_API_KEY: string;
    UPSTASH_REDIS_REST_URL?: string;
    UPSTASH_REDIS_REST_TOKEN?: string;
    USE_MOCK_DATA: boolean;
  };
};
