/**
 * nodes/resolve-ticker.ts
 *
 * Node 1: Resolve a company name to a stock ticker and fetch its profile.
 *
 * Strategy:
 *   1. FMP /search endpoint (fast, structured, no LLM needed)
 *   2. If FMP search fails or returns nothing, fall back to Tavily search +
 *      a brief LLM extraction call to parse the ticker from web results.
 *
 * On success: sets ticker + companyProfile in state.
 * On failure: sets an error in state.errors and returns without crashing —
 *             the graph degrades gracefully; subsequent nodes check for null ticker.
 *
 * Why FMP first: it's deterministic and doesn't consume LLM tokens for a simple lookup.
 * Why Tavily fallback: handles cases like non-US companies, subsidiaries, or recently
 * renamed companies that FMP search might miss.
 */

import { AgentStateType, CompanyProfile } from "../state";

const FMP_BASE = "https://financialmodelingprep.com/api/v3";

// ---------------------------------------------------------------------------
// FMP search — resolve name → ticker
// ---------------------------------------------------------------------------

async function fmpSearchTicker(query: string): Promise<string | null> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) throw new Error("FMP_API_KEY is not set");

  const url = `${FMP_BASE}/search?query=${encodeURIComponent(query)}&limit=5&exchange=NASDAQ,NYSE,AMEX&apikey=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 0 } });

  if (!res.ok) {
    throw new Error(`FMP search failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as Array<{
    symbol: string;
    name: string;
    exchangeShortName: string;
  }>;

  if (!Array.isArray(data) || data.length === 0) return null;

  // Return the first result — FMP orders by relevance
  return data[0].symbol;
}

// ---------------------------------------------------------------------------
// FMP profile fetch — ticker → CompanyProfile
// ---------------------------------------------------------------------------

async function fmpFetchProfile(ticker: string): Promise<CompanyProfile | null> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) throw new Error("FMP_API_KEY is not set");

  const url = `${FMP_BASE}/profile/${ticker}?apikey=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 0 } });

  if (!res.ok) return null;

  const data = (await res.json()) as Array<Record<string, unknown>>;
  if (!Array.isArray(data) || data.length === 0) return null;

  const p = data[0];
  return {
    ticker: (p.symbol as string) ?? ticker,
    name: (p.companyName as string) ?? "",
    description: (p.description as string) ?? "",
    sector: (p.sector as string) ?? "",
    industry: (p.industry as string) ?? "",
    country: (p.country as string) ?? "",
    exchange: (p.exchangeShortName as string) ?? "",
    marketCap: typeof p.mktCap === "number" ? p.mktCap : null,
    website: (p.website as string) ?? "",
    ceo: (p.ceo as string) ?? "",
  };
}

// ---------------------------------------------------------------------------
// Tavily fallback — used when FMP search returns nothing
// Requires TAVILY_API_KEY env var.
// ---------------------------------------------------------------------------

async function tavilyFallbackTicker(companyName: string): Promise<string | null> {
  const { TavilySearch } = await import("@langchain/tavily");

  const tool = new TavilySearch({
    maxResults: 3,
    topic: "general",
  });

  const query = `${companyName} stock ticker symbol NYSE NASDAQ`;
  const results = await tool.invoke({ query });

  // The results are a JSON string of search results
  const parsed = typeof results === "string" ? JSON.parse(results) : results;
  const content = Array.isArray(parsed)
    ? parsed.map((r: { content: string }) => r.content).join("\n")
    : String(parsed);

  // Extract ticker using a lightweight LLM call
  const { ChatOpenAI } = await import("@langchain/openai");
  const llm = new ChatOpenAI({
    model: "meta/llama-3.1-405b-instruct",
    apiKey: process.env.NVIDIA_NIM_API_KEY,
    configuration: {
      baseURL: process.env.NVIDIA_NIM_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
    },
    temperature: 0,
    maxTokens: 20,
  });

  const response = await llm.invoke(
    `Extract ONLY the stock ticker symbol for "${companyName}" from the text below. ` +
      `Reply with just the ticker (e.g. "AAPL") and nothing else. ` +
      `If no clear ticker is found, reply "UNKNOWN".\n\nText:\n${content.slice(0, 2000)}`
  );

  const ticker = (response.content as string).trim().toUpperCase();
  return ticker === "UNKNOWN" || ticker.length > 6 ? null : ticker;
}

// ---------------------------------------------------------------------------
// Main node function
// ---------------------------------------------------------------------------

export async function resolveTickerNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const { companyName } = state;

  if (!companyName?.trim()) {
    return { errors: ["Company name is required"] };
  }

  // Step 1: Try FMP search
  let ticker: string | null = null;
  try {
    ticker = await fmpSearchTicker(companyName.trim());
  } catch (err) {
    // FMP search errored — proceed to fallback, log the error
    console.warn("[resolve_ticker] FMP search error:", err);
  }

  // Step 2: Tavily fallback if FMP returned nothing
  if (!ticker) {
    try {
      ticker = await tavilyFallbackTicker(companyName.trim());
    } catch (err) {
      console.warn("[resolve_ticker] Tavily fallback error:", err);
    }
  }

  if (!ticker) {
    return {
      errors: [
        `Could not identify a publicly listed company matching this name ("${companyName}"). Please check the spelling or try the ticker symbol directly.`
      ],
    };
  }

  // Step 3: Fetch company profile
  let profile: CompanyProfile | null = null;
  try {
    profile = await fmpFetchProfile(ticker);
  } catch (err) {
    console.warn("[resolve_ticker] Profile fetch error:", err);
    // Non-fatal — we have the ticker, proceed without full profile
  }

  return {
    ticker,
    companyProfile: profile,
  };
}
