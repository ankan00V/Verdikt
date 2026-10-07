# Verdikt — AI Investment Research Agent

> **Live Demo:** [verdikt-ashy.vercel.app/research](https://verdikt-ashy.vercel.app/research)  
> **GitHub:** [github.com/ankan00V/Verdikt1](https://github.com/ankan00V/Verdikt1)  
> **Demo video:** [loom.com/share/93450b55…](https://www.loom.com/share/93450b55bd7d4414ae6ade2cabcb828b)  
> **Full submission document:** [SUBMISSION.md](./SUBMISSION.md) — architecture diagram, cost model, failure log, and the five questions

---

## Overview

Verdikt is an AI-powered investment research platform that takes a company name, autonomously researches it across multiple real-time data sources (financial data, news, web research), and delivers a structured **INVEST or PASS** verdict with a fully traceable reasoning chain.

Unlike a single-prompt "ask the LLM" approach, Verdikt implements a **real multi-node LangGraph.js pipeline** — a directed acyclic graph where each stage (resolve ticker → fetch data → analyze → synthesize) has a distinct role, receives only the data it needs, and produces structured output that flows forward. Every stage of the reasoning is independently inspectable by the user in real time via a live-updating research console.

**Key Capabilities:**
- **Real financial data** from Yahoo Finance (income statements, key metrics, ratios, company profiles)
- **Live news analysis** via Tavily (recent headlines, sentiment, controversies)
- **Competitive landscape research** via Tavily web search (moat assessment, market position, key competitors)
- **Structured LLM analysis** using NVIDIA NIM (Llama 3.1 70B) with Zod schema enforcement
- **Real-time streaming UI** — the user watches each research stage complete live via Server-Sent Events
- **Automatic retry with exponential backoff** — production-grade resilience against API timeouts and rate limits
- **Persistent checkpointing via Upstash Redis** — survives Vercel's 60-second serverless timeout
- **Per-node result caching** — even if the pipeline re-runs after a timeout, completed nodes return cached results in <100ms

---

## How to Run It

### Prerequisites
- **Node.js 18+** (tested on Node 20 and 25)
- **npm** (comes with Node.js)

### Step 1: Clone and Install

```bash
git clone https://github.com/ankan00V/Verdikt1.git
cd Verdikt1
npm install
```

### Step 2: Set Up Environment Variables

Create a `.env.local` file in the project root:

```env
# Required — NVIDIA NIM API Keys (LLM inference)
NVIDIA_NIM_API_KEY=your_nvidia_nim_key_here
NVIDIA_FALLBACK_API_KEY=your_second_nvidia_nim_key_here   # Optional, for retry resilience

# Required — Tavily API Key (web & news search)
TAVILY_API_KEY=your_tavily_key_here

# Optional — Upstash Redis (persistent checkpointing for Vercel deployment)
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# Optional — Yahoo Finance Proxy (needed on Vercel to bypass IP blocks)
YAHOO_PROXY_URL=http://username:password@proxy_ip:port

# Reserved — mock mode flag. Declared but NOT yet implemented (see SUBMISSION.md §13.8)
USE_MOCK_DATA=false
```

**Where to get each key:**
| Key | Source | Notes |
|-----|--------|-------|
| `NVIDIA_NIM_API_KEY` | [integrate.api.nvidia.com](https://integrate.api.nvidia.com) | Free tier available. Create account → API Keys |
| `TAVILY_API_KEY` | [tavily.com](https://tavily.com) | Free tier: 1000 searches/month |
| `UPSTASH_REDIS_REST_URL/TOKEN` | [upstash.com](https://upstash.com) | Free tier: 10K commands/day. Only needed for Vercel deployment |
| `YAHOO_PROXY_URL` | [webshare.io](https://webshare.io) | Free: 10 proxies. Only needed for Vercel (Yahoo blocks shared IPs) |

### Step 3: Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Step 4: Deploy to Vercel (Optional)

```bash
npx vercel --prod
```

> **Note:** On Vercel, you must set all environment variables in the Vercel Dashboard → Settings → Environment Variables, and add `YAHOO_PROXY_URL` to route Yahoo Finance requests through a proxy (Yahoo blocks Vercel's shared IPs).

---

## How It Works

### Architecture Overview

Verdikt uses a **multi-node LangGraph.js StateGraph** — not a single LLM prompt, but a real directed graph where each node has a specific role.

```mermaid
flowchart TD

subgraph group_client["Research UI"]
  node_landing["Landing page<br/>Next.js page<br/>[page.tsx]"]
  node_console["Research console<br/>Next.js page<br/>[page.tsx]"]
  node_research_hook["SSE research hook<br/>client stream hook<br/>[useResearch.ts]"]
  node_console_views["Result views<br/>console components<br/>[NodeTracker.tsx]"]
  node_client_types["Research types<br/>shared frontend types<br/>[researchTypes.ts]"]
end

subgraph group_api["Server Runtime"]
  node_research_api{{"Research SSE route<br/>Next.js API route<br/>[route.ts]"}}
  node_redis_cache[("Redis cache<br/>result cache<br/>[redis.ts]")]
  node_checkpoint_saver[("Upstash checkpoint saver<br/>LangGraph persistence<br/>[upstash-saver.ts]")]
end

subgraph group_pipeline["Agent Pipeline"]
  node_graph{{"Research StateGraph<br/>LangGraph orchestration<br/>[graph.ts]"}}
  node_state["Shared graph state<br/>typed state<br/>[state.ts]"]
  node_resolve_ticker["Resolve ticker<br/>agent node<br/>[resolve-ticker.ts]"]
  node_financials["Fetch financials<br/>retrieval node"]
  node_news["Fetch news<br/>retrieval node<br/>[fetch-news.ts]"]
  node_web_research["Fetch web research<br/>retrieval node"]
  node_gather{{"Gather data<br/>fan-in node<br/>[gather-data.ts]"}}
  node_fundamentals["Analyze fundamentals<br/>LLM analysis node"]
  node_sentiment["Analyze sentiment<br/>LLM analysis node"]
  node_competitive["Analyze competitive<br/>LLM analysis node"]
  node_decision{{"Synthesize decision<br/>LLM synthesis node"}}
  node_schemas["Output schemas<br/>Zod contracts<br/>[schemas.ts]"]
  node_llm["LLM gateway<br/>resilient inference client<br/>[llm.ts]"]
end

subgraph group_services["External Services"]
  node_market_sources["Yahoo Finance<br/>market data service"]
  node_tavily["Tavily<br/>search service"]
  node_nim["NVIDIA NIM / Llama<br/>model provider"]
end

node_landing -->|"opens research"| node_console
node_console -->|"starts and monitors run"| node_research_hook
node_research_hook -->|"SSE request"| node_research_api
node_research_hook -->|"streamed updates"| node_console_views
node_client_types -.->|"types"| node_research_hook
node_client_types -.->|"types"| node_console_views
node_research_api -->|"execute or resume"| node_graph
node_research_api -->|"load/save checkpoints"| node_checkpoint_saver
node_graph -->|"reads and updates"| node_state
node_graph -->|"first stage"| node_resolve_ticker
node_resolve_ticker -->|"ticker fan-out"| node_financials
node_resolve_ticker -->|"ticker fan-out"| node_news
node_resolve_ticker -->|"ticker fan-out"| node_web_research
node_financials -->|"live company data"| node_market_sources
node_news -->|"recent news search"| node_tavily
node_web_research -->|"competitive web search"| node_tavily
node_financials -->|"financial evidence"| node_gather
node_news -->|"news evidence"| node_gather
node_web_research -->|"web evidence"| node_gather
node_gather -->|"analyze"| node_fundamentals
node_gather -->|"analyze"| node_sentiment
node_gather -->|"analyze"| node_competitive
node_fundamentals -->|"fundamental assessment"| node_decision
node_sentiment -->|"sentiment assessment"| node_decision
node_competitive -->|"competitive assessment"| node_decision
node_fundamentals -->|"structured inference"| node_llm
node_sentiment -->|"structured inference"| node_llm
node_competitive -->|"structured inference"| node_llm
node_decision -->|"structured synthesis"| node_llm
node_llm -->|"model invocation"| node_nim
node_llm -->|"validates outputs"| node_schemas
node_graph -.->|"cache node results"| node_redis_cache
node_decision -->|"verdict and state events"| node_research_api

click node_landing "https://github.com/ankan00V/Verdikt1/blob/main/src/app/page.tsx"
click node_console "https://github.com/ankan00V/Verdikt1/blob/main/src/app/research/page.tsx"
click node_research_hook "https://github.com/ankan00V/Verdikt1/blob/main/src/lib/useResearch.ts"
click node_console_views "https://github.com/ankan00V/Verdikt1/blob/main/src/components/verdikt/NodeTracker.tsx"
click node_client_types "https://github.com/ankan00V/Verdikt1/blob/main/src/lib/researchTypes.ts"
click node_research_api "https://github.com/ankan00V/Verdikt1/blob/main/src/app/api/research/route.ts"
click node_graph "https://github.com/ankan00V/Verdikt1/blob/main/src/lib/agent/graph.ts"
click node_state "https://github.com/ankan00V/Verdikt1/blob/main/src/lib/agent/state.ts"
click node_resolve_ticker "https://github.com/ankan00V/Verdikt1/blob/main/src/lib/agent/nodes/resolve-ticker.ts"
click node_financials "https://github.com/ankan00V/Verdikt1/blob/main/src/lib/agent/nodes/fetch-financials.ts"
click node_news "https://github.com/ankan00V/Verdikt1/blob/main/src/lib/agent/nodes/fetch-news.ts"
click node_web_research "https://github.com/ankan00V/Verdikt1/blob/main/src/lib/agent/nodes/fetch-web-research.ts"
click node_gather "https://github.com/ankan00V/Verdikt1/blob/main/src/lib/agent/nodes/gather-data.ts"
click node_fundamentals "https://github.com/ankan00V/Verdikt1/blob/main/src/lib/agent/nodes/analyze-fundamentals.ts"
click node_sentiment "https://github.com/ankan00V/Verdikt1/blob/main/src/lib/agent/nodes/analyze-sentiment.ts"
click node_competitive "https://github.com/ankan00V/Verdikt1/blob/main/src/lib/agent/nodes/analyze-competitive.ts"
click node_decision "https://github.com/ankan00V/Verdikt1/blob/main/src/lib/agent/nodes/synthesize-decision.ts"
click node_schemas "https://github.com/ankan00V/Verdikt1/blob/main/src/lib/agent/schemas.ts"
click node_llm "https://github.com/ankan00V/Verdikt1/blob/main/src/lib/agent/llm.ts"
click node_redis_cache "https://github.com/ankan00V/Verdikt1/blob/main/src/lib/redis.ts"
click node_checkpoint_saver "https://github.com/ankan00V/Verdikt1/blob/main/src/lib/agent/upstash-saver.ts"

classDef toneNeutral fill:#f8fafc,stroke:#334155,stroke-width:1.5px,color:#0f172a
classDef toneBlue fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#172554
classDef toneAmber fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#78350f
classDef toneMint fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d
classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
classDef toneIndigo fill:#e0e7ff,stroke:#4f46e5,stroke-width:1.5px,color:#312e81
classDef toneTeal fill:#ccfbf1,stroke:#0f766e,stroke-width:1.5px,color:#134e4a
class node_landing,node_console,node_research_hook,node_console_views,node_client_types toneBlue
class node_research_api,node_redis_cache,node_checkpoint_saver toneAmber
class node_graph,node_state,node_resolve_ticker,node_financials,node_news,node_web_research,node_gather,node_fundamentals,node_sentiment,node_competitive,node_decision,node_schemas,node_llm toneMint
class node_market_sources,node_tavily,node_nim toneRose
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 16 (App Router) | Full-stack React with API routes |
| **Agent Pipeline** | LangGraph.js (StateGraph) | DAG execution, parallel fan-out/fan-in, checkpointing |
| **LLM** | NVIDIA NIM — `meta/llama-3.1-70b-instruct` | Structured output via `.withStructuredOutput()` + Zod schemas |
| **Financial Data** | `yahoo-finance2` | Income statements, key metrics, ratios, company profiles |
| **News & Web Search** | Tavily API | Recent news, competitive landscape research |
| **Schema Validation** | Zod v3 | Enforced structured output from all LLM nodes |
| **State Persistence** | Upstash Redis + custom `UpstashSaver` | Durable checkpoints that survive Vercel 60s timeouts |
| **Streaming** | Server-Sent Events (SSE) | Real-time pipeline progress updates to the frontend |
| **Styling** | Tailwind CSS + Framer Motion | Dark theme, micro-animations, glassmorphism |
| **Deployment** | Vercel | Auto-deploy on push, serverless functions |

### Key Implementation Details

**1. Structured Output via Zod Schemas**
Every LLM analysis node uses `ChatOpenAI.withStructuredOutput(ZodSchema)` — not regex parsing of free text. The LLM is constrained to output valid JSON matching the exact schema. For example, `FundamentalsSchema` enforces `overallScore` as `enum("strong", "adequate", "weak", "unavailable")` — the LLM cannot return anything else.

**2. Production-Grade Retry Logic**
The `invokeStructuredLLM` function implements:
- **45-second timeout** per structured attempt (25s for the small string calls), sized against Vercel's 60s function limit
- **3 attempts** with exponential backoff (2s, 4s delays)
- **API key rotation** — alternates between primary and fallback NVIDIA keys on each attempt
- **Smart retry classification** — retries 429s, connection resets and auth failures, but **never retries a timeout**: three attempts at a 45s timeout is 135s inside a 60s budget, which kills the whole function instead of one node

**3. Checkpoint Persistence (Vercel Timeout Survival)**
Vercel serverless functions have a 60-second execution limit. The full Verdikt pipeline takes ~90-120 seconds. To handle this:
- A custom `UpstashSaver` extends LangGraph's `MemorySaver` and syncs state to Upstash Redis after every node completion
- The frontend automatically reconnects when the SSE stream drops (Vercel timeout)
- On reconnect, `UpstashSaver` restores the checkpoint from Redis and the pipeline resumes from where it stopped
- Per-node Redis caching (`withNodeCache`) ensures that even if a node is re-run, it returns the cached result in <100ms

**4. Real-Time Streaming Frontend**
The research console is a 3-pane layout:
- **Left:** Pipeline tracker — shows each node's status (pending → in-progress → complete/failed)
- **Center:** Findings feed — displays each node's output as it completes
- **Right:** Detail pane — shows deep-dive into the selected node's structured output, or the final verdict

---

## Key Decisions & Trade-offs

### What I Chose and Why

| Decision | Rationale |
|----------|-----------|
| **LangGraph.js over a single-prompt approach** | A single LLM prompt could produce a verdict in one call. But the assignment asks for visible reasoning. A multi-node graph makes each stage independently inspectable — fundamentals analysis is a separate artifact from sentiment analysis. Failures are surfaced explicitly, not absorbed into a black box. |
| **NVIDIA NIM (Llama 3.1 70B) over OpenAI/Claude** | Deliberate choice to avoid the most common submission approach. NIM provides OpenAI-compatible endpoints, supports native structured output via tool-calling, and is free-tier accessible. |
| **Yahoo Finance over FMP** | FMP deprecated free access to all fundamental endpoints (income statements, ratios, key metrics) in August 2025 — after the original assignment was written. Rather than fabricating data, I pivoted to `yahoo-finance2` (free, no API key needed, same data). The graph architecture is unchanged. |
| **Tavily over SerpAPI** | Tavily is purpose-built for LLM agents — returns clean structured content, handles recency filtering natively for news, and integrates directly with LangChain. |
| **Custom UpstashSaver over LangSmith Cloud** | Vercel's 60s timeout kills the pipeline mid-execution. Rather than using a paid LangSmith deployment, I built a custom `UpstashSaver` that extends `MemorySaver`, serializes checkpoint state with zlib compression, and persists to free-tier Upstash Redis. |
| **Per-node Redis caching** | Even with checkpointing, LangGraph occasionally re-runs completed nodes after a timeout. Wrapping every node with `withNodeCache` makes re-runs effectively free (<100ms). |
| **Proxy for Yahoo Finance on Vercel** | Yahoo blocks Vercel's shared datacenter IPs. Rather than abandoning Yahoo, I integrated `https-proxy-agent` with free Webshare proxies. |

### What I Left Out (Deliberate Scope Decisions)

- **No authentication or user accounts** — Verdikt is a stateless research tool. Each run is independent. Auth adds complexity without value for the use case.
- **No database** — Results are ephemeral by design. Adding persistence would be a natural next step but wasn't necessary for the assignment scope.
- **No pricing page** — This is a research tool, not a SaaS product. Template features that don't map to functionality were removed.

---

## Example Runs

All examples below were captured from the live production deployment at [verdikt-ashy.vercel.app](https://verdikt-ashy.vercel.app/research) with real-time API calls.

### NVIDIA (NVDA) — Verdict: INVEST

| Field | Value |
|-------|-------|
| **Verdict** | INVEST |
| **Confidence** | 72% |
| **Revenue** | $26,294 → Revenue growth of 61.0% YoY |
| **Margins** | Gross Margin 60.0%, Operating Margin 40.6%, Net Margin 37.0% |
| **Balance Sheet** | Debt/Equity ratio of 0.04 — very healthy |
| **Moat** | Wide — leader in visual computing and data center markets |
| **Competitors** | AMD, Google, Amazon, Apple |
| **Sentiment** | Neutral tone, recent news about 10% price decline despite record revenue |
| **Key Strengths** | Strong revenue growth, high margins, wide competitive moat, AI leadership |
| **Key Risks** | Intense competition, regulatory headwinds, cyclicality of semiconductor demand |

---

### Palantir Technologies (PLTR) — Verdict: INVEST

| Field | Value |
|-------|-------|
| **Verdict** | INVEST |
| **Confidence** | 65% |
| **Revenue** | Year-over-year revenue growth of 66.2% |
| **Margins** | Gross margin at 84.1%, indicating high-margin business |
| **Balance Sheet** | D/E ratio of 2.48 — higher leverage noted |
| **Moat** | Wide — leader in AI Enterprise Leadership |
| **Competitors** | Snowflake (SNOW), Zscaler (ZS) |
| **Sentiment** | Neutral, +145% rally noted in stock analysis |
| **Key Strengths** | Significant revenue growth, high gross margins, AI leadership position |
| **Key Risks** | High valuation, government contract dependency, limited profitability history |

---

### Microsoft (MSFT) — Verdict: INVEST

| Field | Value |
|-------|-------|
| **Verdict** | INVEST |
| **Confidence** | 72% |
| **Revenue** | $198.3B → $211.9B → $245.1B → $281.7B (consistent 15%+ growth) |
| **Margins** | Net margin 34-37% — high and stable |
| **Moat** | Wide — ecosystem lock-in across Office, Azure, Windows |
| **Competitors** | Amazon, Google, Oracle, Salesforce |
| **Key Strengths** | Strong revenue growth, high stable margins, wide moat, AI leadership |
| **Key Risks** | Antitrust pressure, intense cloud competition, AI investment uncertainty |

---

### Peloton Interactive (PTON) — Verdict: PASS

| Field | Value |
|-------|-------|
| **Verdict** | PASS |
| **Confidence** | 60% |
| **Revenue** | $3.6B → $2.7B → $2.5B — consistent decline |
| **Margins** | Gross/operating margin data partially unavailable |
| **Moat** | Narrow — brand recognition but vulnerable |
| **Sentiment** | Neutral, new CFO appointment noted |
| **Key Risks** | Declining revenue, lack of profitability, intense competition, changing consumer preferences |

---

## What I Would Improve With More Time

1. **Quantitative scoring model** — The confidence score is currently LLM-generated. A more rigorous approach would derive it from a weighted rubric (revenue growth rate × 0.3 + margin quality × 0.25 + ...) so the number is traceable to specific inputs.

2. **Historical research persistence** — Each run is stateless. A lightweight store could persist past verdicts for comparison — useful for re-researching after a news event.

3. **Multi-company comparison** — Side-by-side analysis (AAPL vs MSFT) would be a natural next step for actual investment decisions.

4. **SEC filings integration** — Adding EDGAR API for 10-K/10-Q filings and earnings call transcripts would significantly deepen the fundamental and competitive analysis.

5. **Streaming optimization** — Implementing WebSocket-based streaming instead of SSE would eliminate the reconnection overhead on Vercel timeouts.

6. **Better error recovery UI** — While the backend gracefully degrades on node failures, the frontend could show more informative error states with retry buttons.

7. **Rate limit pooling** — Instead of alternating between 2 API keys, a proper key pool with round-robin and health tracking would improve throughput for high-usage scenarios.

---

## BONUS: LLM Chat Session Transcript

This entire project was built collaboratively with an AI coding assistant (Google Gemini / AI/LLM). The full chat transcript documenting every decision, debugging session, and iterative improvement is included in this submission:

📁 **`llm_chat_logs/`** — Contains the complete conversation transcript

The transcript reveals the real development process including:
- Initial architecture design decisions
- Debugging Yahoo Finance integration issues (FMP deprecation → Yahoo Finance pivot)
- Solving Vercel's 60-second timeout with custom checkpointing
- Implementing proxy support when Yahoo blocked Vercel IPs
- Building retry logic with exponential backoff for production resilience
- Iterative UI improvements based on live testing feedback
- Real-time debugging of state management issues with LangGraph

This wasn't a clean, pre-planned build — it was an iterative, messy, real development process with the AI assistant helping debug, architect, and implement solutions to problems as they were discovered in production.

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── research/page.tsx           # Research console
│   ├── api/research/route.ts       # SSE streaming API endpoint
│   ├── layout.tsx                  # Root layout with SEO
│   └── globals.css                 # Global styles + animations
├── components/verdikt/
│   ├── DetailPane.tsx              # Right pane: node detail + verdict stamp
│   ├── FindingsFeed.tsx            # Center pane: live findings
│   ├── NodeTracker.tsx                 # Left pane: node status tracker
│   ├── Hero.tsx                    # Landing page hero section
│   ├── FinalCTA.tsx                # Landing page CTA
│   └── ...
└── lib/
    ├── agent/
    │   ├── graph.ts                # LangGraph pipeline definition
    │   ├── state.ts                # AgentState with typed Annotations
    │   ├── schemas.ts              # Zod schemas for all LLM outputs
    │   ├── llm.ts                  # LLM abstraction with retry logic
    │   ├── upstash-saver.ts        # Custom checkpoint saver for Redis
    │   └── nodes/
    │       ├── resolve-ticker.ts
    │       ├── fetch-financials.ts  # Yahoo Finance + proxy support
    │       ├── fetch-news.ts        # Tavily news search
    │       ├── fetch-web-research.ts # Tavily web research
    │       ├── gather-data.ts       # Fan-in synchronization
    │       ├── analyze-fundamentals.ts
    │       ├── analyze-sentiment.ts
    │       ├── analyze-competitive.ts
    │       └── synthesize-decision.ts
    ├── redis.ts                    # Redis client + withNodeCache wrapper
    ├── researchTypes.ts            # Frontend type definitions
    └── useResearch.ts              # React hook for SSE consumption
```

---

## License

MIT
