# Verdikt

## Overview

Verdikt is an AI Investment Research Agent that takes a company name, researches it across multiple real data sources, and outputs a structured INVEST or PASS decision with a traceable reasoning chain. The core pipeline utilizes a LangGraph.js multi-node graph that executes a resolve, parallel fetch, analyze, and synthesize workflow. The tech stack is built on Next.js 15, LangGraph.js, NVIDIA NIM (meta/llama-3.1-405b-instruct), Tavily for web and news search, and Financial Modeling Prep for financials. The output provides not just a final verdict, but a visible chain of reasoning across the company's fundamentals, sentiment, and competitive position.

## How to Run It

**Prerequisites**
- Node.js 18+ required
- npm or yarn

**Clone and install**
```bash
git clone <repo-url>
cd verdikt
npm install
```

**Environment variables**
Create a `.env.local` file in the root with these keys:
```
NVIDIA_NIM_API_KEY=your_nvidia_nim_key_here
TAVILY_API_KEY=your_tavily_key_here
FMP_API_KEY=your_fmp_key_here
```

Where to get each key:
- **NVIDIA NIM:** https://integrate.api.nvidia.com — create an account, navigate to API Keys
- **Tavily:** https://tavily.com — free tier available, sign up and copy your API key
- **FMP (Financial Modeling Prep):** https://site.financialmodelingprep.com/developer/docs — free tier gives 250 requests/day, sufficient for development and example runs

**Run locally**
```bash
npm run dev
```
Open http://localhost:3000

**Optional: mock mode (dev only)**
To avoid burning API credits during development, set `USE_MOCK_DATA=true` in `.env.local`. Mock mode replays real captured API responses from fixture files — it does not use invented data. All example runs in this README were produced with mock mode OFF against live APIs.

**Note on API coverage**
Verdikt works best with US-listed public companies. FMP's free tier does not cover all international or OTC-listed companies — if a company returns limited financial data, the agent will note the gap explicitly in its reasoning rather than fabricating figures.

## How It Works

**Backend: LangGraph.js pipeline**

Verdikt uses a multi-node LangGraph.js graph — not a single prompt with a JSON response, but a real directed graph where each node has a distinct role, receives only the state it needs, and passes structured output forward. The graph topology:

```
START
  → resolve_ticker
  → [parallel]
      → fetch_financials   (FMP: income statement, key metrics, ratios, company profile)
      → fetch_news         (Tavily: recent news coverage)
      → fetch_web_research (Tavily: competitive landscape, business model)
  → [fan-in]
  → analyze_fundamentals        (LLM node, structured output via .withStructuredOutput())
  → analyze_sentiment           (LLM node, structured output)
  → analyze_competitive_position (LLM node, structured output)
  → synthesize_decision         (LLM node: INVEST/PASS verdict + confidence score 0–100
                                  + reasoning breakdown citing prior node findings)
END
```

All LLM nodes use NVIDIA NIM's `meta/llama-3.1-405b-instruct` model via LangChain's `ChatOpenAI` wrapper pointed at `https://integrate.api.nvidia.com/v1`. Structured output is enforced via Zod schemas and `.withStructuredOutput()` — not regex-parsed free text.

The final `synthesize_decision` node explicitly references findings from the three analysis nodes — it is not generating a fresh opinion disconnected from the graph's actual research.

**Streaming**
The Next.js API route at `/api/research` runs the graph and streams each node's completion event to the frontend via Server-Sent Events (SSE). The frontend updates in real time as each node finishes — the user sees the research building up live, not a spinner followed by a wall of text.

**Frontend**
Two routes:
- `/` — marketing landing page explaining what Verdikt does and how the pipeline works
- `/research` — the live research console: a 3-pane view (node tracker / findings feed / detail pane) that updates in real time via the SSE stream, ending in the verdict stamp

## Key Decisions & Trade-offs

- **LangGraph.js over a single-prompt approach:** A single LLM prompt with a JSON schema could have produced a structured verdict in one call. LangGraph was chosen because the assignment asks for visible reasoning — a multi-node graph makes each stage of the research independently inspectable (fundamentals analysis is a separate artifact from sentiment analysis), and failure in one stage (e.g., no FMP data) is surfaced explicitly rather than silently absorbed into a black-box response.
- **NVIDIA NIM (meta/llama-3.1-405b-instruct) over OpenAI/Claude:** Most submissions for this type of assignment default to OpenAI or Anthropic. NVIDIA NIM was chosen deliberately: it provides OpenAI-compatible endpoints (no LangChain adapter needed beyond pointing the base URL) and `meta/llama-3.1-405b-instruct` is confirmed to support native tool/function calling and `.withStructuredOutput()`, which the analysis nodes depend on.
- **Tavily over SerpAPI or a raw Google Search scraper:** Tavily is purpose-built for LLM agent pipelines — it returns clean, structured content rather than raw HTML, handles recency filtering natively for news search, and integrates directly with LangChain's `TavilySearchResults` tool. It saved meaningful implementation time compared to building a custom scraper.
- **FMP free tier over Alpha Vantage or Yahoo Finance scraping:** FMP's free tier provides structured JSON endpoints for income statements, key metrics, and ratios for US-listed companies — more reliable and consistently shaped than Alpha Vantage's very thin free tier or Yahoo Finance's unofficial/scraped API. The 250 req/day free limit is sufficient for the use case.
- **No authentication or database:** Verdikt is a stateless research tool — each run is independent, produces a self-contained output, and has no concept of a user account or saved history. Adding auth and a database layer would have consumed real development time with no corresponding value for the use case the assignment describes. This was a deliberate scope decision, not an omission.
- **US-listed public companies only (v1):** FMP's free tier has reliable coverage for US-listed equities. International companies, private companies, and OTC-listed stocks may return partial or no financial data. Rather than silently failing or fabricating figures, the agent explicitly notes data gaps in its reasoning. This limitation is surfaced in the UI at the input stage.
- **No pricing, no authentication, no download CTA on the landing page:** These are all common template features that don't map to anything this product actually does. Removing them was a deliberate choice to keep the surface area matched to the assignment scope.
- **Mock mode uses real captured fixtures, not invented data:** A dev-time mock mode (`USE_MOCK_DATA=true`) was added to manage API quota during iterative development. Critically, mock responses are real JSON captured from live API calls — not hand-written fake data — so the graph is always tested against realistic response shapes, including real-world messiness like missing fields and inconsistent nesting.

## Example Runs

*To be populated once live example runs are completed against the production API.*

Companies planned:
- [Large-cap, clean data — e.g. a well-known US public company]
- [Mid-cap, more ambiguous fundamentals]
- [Edge case: limited news coverage or thin financial data]

Each entry will include: company name, verdict (INVEST/PASS), confidence score, and a summary of the agent's reasoning chain across fundamentals, sentiment, and competitive position.

## What I Would Improve With More Time

- **International company coverage:** Currently limited to US-listed equities due to FMP free tier. A paid FMP tier or an alternative data source (e.g. Alpha Vantage premium, Refinitiv) would extend coverage to global markets.
- **Quantitative scoring model:** The confidence score (0–100) is currently produced by the LLM based on its qualitative synthesis. A more rigorous approach would derive it from a quantitative rubric — e.g., weighted scores across revenue growth rate, debt/equity ratio, news sentiment polarity — so the number is traceable to specific inputs, not an LLM estimate.
- **Historical research persistence:** Each run is currently stateless and ephemeral. A lightweight store (even local storage on the client) could persist past verdicts for comparison — useful if you want to re-research the same company after a news event.
- **Multi-company comparison:** The agent currently researches one company at a time. A comparison mode (e.g., AAPL vs MSFT side-by-side) would be a natural next step for actual investment decision-making.
- **Streaming timeout resilience on Vercel:** The current SSE streaming approach works locally and on Vercel's paid tier with extended function timeouts. On the free Hobby plan, Vercel imposes a 10-second serverless function limit which can be hit by the full sequential LLM pipeline. A production fix would either use Vercel's Edge Runtime with streaming responses, or queue the pipeline server-side and poll from the client.
- **Richer competitive analysis:** The `fetch_web_research` node currently relies on Tavily general search. A dedicated source for industry reports, SEC filings (EDGAR API), or earnings call transcripts would significantly deepen the competitive position analysis.
