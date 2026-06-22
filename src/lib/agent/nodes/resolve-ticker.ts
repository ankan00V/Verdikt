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

async function tavilyResolveTicker(companyName: string): Promise<string | null> {
  const { TavilySearch } = await import("@langchain/tavily");

  const tool = new TavilySearch({
    maxResults: 3,
    topic: "general",
  });

  const query = `${companyName} stock ticker symbol Yahoo Finance`;
  const results = await tool.invoke({ query });

  // The results might be a JSON string, an array, or an object with a "results" array
  const parsed = typeof results === "string" ? JSON.parse(results) : results;
  const resultsArray = Array.isArray(parsed) ? parsed : (parsed.results || []);
  const content = resultsArray.map((r: any) => r.content || "").join("\n");

  // Extract ticker using a lightweight LLM call
  const { ChatOpenAI } = await import("@langchain/openai");
  const llm = new ChatOpenAI({
    model: "meta/llama-3.3-70b-instruct",
    apiKey: process.env.NVIDIA_NIM_API_KEY,
    configuration: {
      baseURL: process.env.NVIDIA_NIM_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
    },
    temperature: 0,
    maxTokens: 20,
  });

  const prompt = `Extract ONLY the stock ticker symbol (specifically the Yahoo Finance ticker symbol, e.g., AAPL, TATASTEEL.NS, 005930.KS) for "${companyName}" from the text below. 
Reply with just the ticker and nothing else.
If no clear ticker is found, reply "UNKNOWN".

Text:
${content.slice(0, 2000)}`;

  try {
    const response = await llm.invoke(prompt);
    const ticker = (response.content as string).trim().toUpperCase();

    return ticker === "UNKNOWN" || ticker.length > 15 ? null : ticker;
  } catch (error) {
    console.error("[resolve_ticker] LLM extraction error:", error);
    return null;
  }
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
