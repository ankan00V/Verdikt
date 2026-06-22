# Verdikt

## Overview

Verdikt is an AI Investment Research Agent that takes a company name, researches it across multiple real data sources, and outputs a structured INVEST or PASS decision with a traceable reasoning chain. The core pipeline utilizes a LangGraph.js multi-node graph that executes a resolve, parallel fetch, analyze, and synthesize workflow. The tech stack is built on Next.js 15, LangGraph.js, NVIDIA NIM (meta/llama-3.3-70b-instruct), Tavily for web and news search, and Yahoo Finance for financials. The output provides not just a final verdict, but a visible chain of reasoning across the company's fundamentals, sentiment, and competitive position.

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
```

Where to get each key:
- **NVIDIA NIM:** https://integrate.api.nvidia.com — create an account, navigate to API Keys
- **Tavily:** https://tavily.com — free tier available, sign up and copy your API key

**Run locally**
```bash
npm run dev
```
Open http://localhost:3000

**Optional: mock mode (dev only)**
To avoid burning API credits during development, set `USE_MOCK_DATA=true` in `.env.local`. Mock mode replays real captured API responses from fixture files — it does not use invented data. All example runs in this README were produced with mock mode OFF against live APIs.

**Note on API coverage**
Verdikt works best with public companies. Because we use Yahoo Finance, it natively supports international companies (e.g., TATASTEEL.NS), but private or recently listed companies may return limited financial data. If a company returns limited data, the agent will note the gap explicitly in its reasoning rather than fabricating figures.

## How It Works

**Backend: LangGraph.js pipeline**

Verdikt uses a multi-node LangGraph.js graph — not a single prompt with a JSON response, but a real directed graph where each node has a distinct role, receives only the state it needs, and passes structured output forward. The graph topology:

```
START
  → resolve_ticker
  → [parallel]
      → fetch_financials   (Yahoo Finance: income statement, key metrics, ratios, company profile)
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

All LLM nodes use NVIDIA NIM's `meta/llama-3.3-70b-instruct` model via LangChain's `ChatOpenAI` wrapper pointed at `https://integrate.api.nvidia.com/v1`. Structured output is enforced via Zod schemas and `.withStructuredOutput()` — not regex-parsed free text.

The final `synthesize_decision` node explicitly references findings from the three analysis nodes — it is not generating a fresh opinion disconnected from the graph's actual research.

**Streaming**
The Next.js API route at `/api/research` runs the graph and streams each node's completion event to the frontend via Server-Sent Events (SSE). The frontend updates in real time as each node finishes — the user sees the research building up live, not a spinner followed by a wall of text.

**Frontend**
Two routes:
- `/` — marketing landing page explaining what Verdikt does and how the pipeline works
- `/research` — the live research console: a 3-pane view (node tracker / findings feed / detail pane) that updates in real time via the SSE stream, ending in the verdict stamp

## Key Decisions & Trade-offs

- **LangGraph.js over a single-prompt approach:** A single LLM prompt with a JSON schema could have produced a structured verdict in one call. LangGraph was chosen because the assignment asks for visible reasoning — a multi-node graph makes each stage of the research independently inspectable (fundamentals analysis is a separate artifact from sentiment analysis), and failure in one stage (e.g., missing financial data) is surfaced explicitly rather than silently absorbed into a black-box response.
- **NVIDIA NIM (meta/llama-3.3-70b-instruct) over OpenAI/Claude:** Most submissions for this type of assignment default to OpenAI or Anthropic. NVIDIA NIM was chosen deliberately: it provides OpenAI-compatible endpoints (no LangChain adapter needed beyond pointing the base URL) and `meta/llama-3.3-70b-instruct` is confirmed to support native tool/function calling and `.withStructuredOutput()`, which the analysis nodes depend on.
- **Tavily over SerpAPI or a raw Google Search scraper:** Tavily is purpose-built for LLM agent pipelines — it returns clean, structured content rather than raw HTML, handles recency filtering natively for news search, and integrates directly with LangChain's `TavilySearchResults` tool. It saved meaningful implementation time compared to building a custom scraper.
- **Yahoo Finance (yahoo-finance2) over FMP:** The assignment originally specified FMP's free tier for financial data. However, FMP deprecated free access to all fundamental endpoints (income statements, ratios, key metrics) in August 2025 — after the assignment was written. Rather than fabricating financial data or producing a demo with no real financials, I pivoted to yahoo-finance2, which is completely free, requires no API key, and provides the same data (company profile, income statements, key ratios) through Yahoo Finance's API. The graph architecture, state schema, and node interfaces are unchanged — only the data source within fetch-financials.ts was swapped. This decision is documented here because the original brief explicitly prohibited fabricating data, and maintaining real live financials was more important than strict adherence to a data source that no longer offers free access.
- **No authentication or database:** Verdikt is a stateless research tool — each run is independent, produces a self-contained output, and has no concept of a user account or saved history. Adding auth and a database layer would have consumed real development time with no corresponding value for the use case the assignment describes. This was a deliberate scope decision, not an omission.
- **Global market coverage:** Because we pivoted to Yahoo Finance, Verdikt natively supports international stocks (e.g. `TATASTEEL.NS` or `RELIANCE.NS`) as well as US equities. Private companies and OTC-listed stocks may return partial or no financial data. Rather than silently failing or fabricating figures, the agent explicitly notes data gaps in its reasoning.
- **No pricing, no authentication, no download CTA on the landing page:** These are all common template features that don't map to anything this product actually does. Removing them was a deliberate choice to keep the surface area matched to the assignment scope.
- **Mock mode uses real captured fixtures, not invented data:** A dev-time mock mode (`USE_MOCK_DATA=true`) was added to manage API quota during iterative development. Critically, mock responses are real JSON captured from live API calls — not hand-written fake data — so the graph is always tested against realistic response shapes, including real-world messiness like missing fields and inconsistent nesting.

## Example Runs

Below are real outputs captured by running the agent pipeline against live production APIs.

### Microsoft (MSFT)

A multinational technology company producing computer software, consumer electronics, and personal computers.
**Verdict:** INVEST

**Confidence:** 72%
**Key findings:**

- Fundamentals: Revenue consistently growing from $198.3B (2022) → $211.9B (2023) → $245.1B (2024) → $281.7B (2025), approximately 6.9% then 15.7% then 14.9% YoY. Net margin 34.1% (2023) to 36.7% (2022), most recent 36.1% (2025) — high and stable.

- Sentiment: Neutral tone, neutral momentum.

- Competitive position: Wide moat, market leader, competitors: Amazon, Google, Oracle, Salesforce.
**Reasoning:** Strong fundamentals, neutral sentiment, and a wide competitive moat support an investment in Microsoft Corporation (MSFT). Strengths: strong revenue growth, high and stable net margins, wide competitive moat, leadership position in AI innovation. Risks: intense competition in cloud market, antitrust and regulatory pressure, impact of competitors AI investments.

---

### Peloton Interactive (PTON)

An interactive fitness platform that provides connected fitness products and subscriptions.
**Verdict:** PASS

**Confidence:** 60%
**Key findings:**

- Fundamentals: Revenue declining from $3.6B (2022) → $2.7B (2024) → $2.5B (2025) — consistent downward trend. Gross margin and operating margin data unavailable from yahoo-finance2 for this company.

- Sentiment: Neutral tone, no momentum, key positive: new CFO appointment (Sid Thacker, effective June 22 2026).

- Competitive position: Narrow moat, established player in home fitness, competitors: Nautilus (NLS), Johnson Outdoors (JOUT), Malibu Boats (MBUU), MASTERCRAFT BOAT HOLDINGS (MCFT).
**Reasoning:** While Peloton Interactive has a narrow moat and strong brand recognition, its declining revenue, lack of profitability, and high valuation multiples lead to a cautious investment stance. Strengths: High-quality interactive fitness content, integrated hardware and software platform, strong brand recognition and community engagement. Risks: Declining revenue and lack of profitability, intense competition in connected fitness market, rapidly changing consumer preferences.

## What I Would Improve With More Time

- **International company coverage:** Originally a limitation tied to FMP's free tier, this was naturally resolved by swapping to Yahoo Finance, which opens up broad support for global public companies.
- **Quantitative scoring model:** The confidence score (0–100) is currently produced by the LLM based on its qualitative synthesis. A more rigorous approach would derive it from a quantitative rubric — e.g., weighted scores across revenue growth rate, debt/equity ratio, news sentiment polarity — so the number is traceable to specific inputs, not an LLM estimate.
- **Historical research persistence:** Each run is currently stateless and ephemeral. A lightweight store (even local storage on the client) could persist past verdicts for comparison — useful if you want to re-research the same company after a news event.
- **Multi-company comparison:** The agent currently researches one company at a time. A comparison mode (e.g., AAPL vs MSFT side-by-side) would be a natural next step for actual investment decision-making.
- **Streaming timeout resilience on Vercel:** The current SSE streaming approach works locally and on Vercel's paid tier with extended function timeouts. On the free Hobby plan, Vercel imposes a 10-second serverless function limit which can be hit by the full sequential LLM pipeline. A production fix would either use Vercel's Edge Runtime with streaming responses, or queue the pipeline server-side and poll from the client.
- **Richer competitive analysis:** The `fetch_web_research` node currently relies on Tavily general search. A dedicated source for industry reports, SEC filings (EDGAR API), or earnings call transcripts would significantly deepen the competitive position analysis.
