/**
 * nodes/resolve-ticker.ts
 *
 * First node in the graph: takes the user's free-text company name input
 * and attempts to resolve it to a standard stock ticker.
 *
 * On success: sets ticker in state.
 * On failure: sets an error in state.errors and returns without crashing —
 *             the graph degrades gracefully; subsequent nodes check for null ticker.
 */

import { AgentStateType } from "../state";

// ---------------------------------------------------------------------------

import yahooFinance from "yahoo-finance2";

async function tavilyResolveTicker(companyName: string): Promise<string | null> {
  const { TavilySearch } = await import("@langchain/tavily");

  const tool = new TavilySearch({
    maxResults: 3,
    topic: "general",
  });

  const query = `${companyName} stock ticker symbol Yahoo Finance`;
  let results;
  try {
    results = await tool.invoke({ query });
  } catch (e) {
    console.warn("Tavily search failed in resolve_ticker, proceeding with LLM fallback", e);
    results = [];
  }

  const parsed = typeof results === "string" ? JSON.parse(results) : results;
  const resultsArray = Array.isArray(parsed) ? parsed : (parsed.results || []);
  const content = resultsArray.map((r: any) => r.content || "").join("\n");

  const { ChatOpenAI } = await import("@langchain/openai");
  const llm = new ChatOpenAI({
    model: "meta/llama-3.3-70b-instruct",
    apiKey: process.env.NVIDIA_NIM_API_KEY,
    configuration: {
      baseURL: process.env.NVIDIA_NIM_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
    },
    temperature: 0,
    maxTokens: 50,
  });

  const prompt = `Extract up to 3 stock ticker symbols for "${companyName}" from the text below. 
CRITICAL RULES:
1. Prioritize PRIMARY US listings (NASDAQ or NYSE) as the first items in the array.
2. Reply ONLY with a valid JSON array of strings, e.g., ["PANW", "PANW.TO"] or ["AAPL"].
3. If no clear ticker is found, reply ["UNKNOWN"].

Text:
${content.slice(0, 2000)}`;

  let candidates: string[] = [];
  try {
    const response = await llm.invoke(prompt);
    const contentStr = (response.content as string).trim();
    // Parse JSON array
    const match = contentStr.match(/\[[\s\S]*\]/);
    if (match) {
      candidates = JSON.parse(match[0]);
    } else {
      candidates = [contentStr.replace(/[^A-Za-z0-9.]/g, "")];
    }
  } catch (error) {
    console.error("[resolve_ticker] LLM extraction error:", error);
    return null;
  }

  // Silent Background Compensation: Verify with Yahoo Finance
  for (const ticker of candidates) {
    if (!ticker || ticker === "UNKNOWN" || ticker.length > 15) continue;
    try {
      const quote = await yahooFinance.quoteSummary(ticker.toUpperCase(), { modules: ["price"] }) as any;
      // If we got a valid price response, this ticker is real and active!
      if (quote.price && quote.price.regularMarketPrice) {
        return ticker.toUpperCase();
      }
    } catch (e) {
      console.warn(`[resolve_ticker] Candidate ${ticker} failed Yahoo validation. Trying next...`);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------

export async function resolveTickerNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const { companyName } = state;
  let ticker: string | null = null;

  try {
    // Resolve ticker using Tavily
    ticker = await tavilyResolveTicker(companyName.trim());

    if (!ticker) {
      return {
        errors: [
          `Could not resolve a stock ticker for "${companyName}". This may be a private company, or the name may be misspelled.`,
        ],
      };
    }

    return {
      ticker,
      // Pass companyName so UI can render it before fetch_financials completes
      companyName: companyName.trim(),
      // Company profile will be fetched alongside financials in fetch-financials.ts
      companyProfile: null, 
    };
  } catch (err) {
    console.error("[resolve_ticker] Error:", err);
    return {
      errors: [
        `Ticker resolution failed for "${companyName}": ${
          err instanceof Error ? err.message : String(err)
        }`,
      ],
    };
  }
}
