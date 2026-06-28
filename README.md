# Verdikt — AI Investment Research Agent

> **Live Demo:** [verdikt-ashy.vercel.app](https://verdikt-ashy.vercel.app)  
> **GitHub:** [github.com/ankan00V/Verdikt](https://github.com/ankan00V/Verdikt)

---

## Overview

Verdikt is an AI-powered investment research platform that takes a company name, autonomously researches it across multiple real-time data sources (financial data, news, web research), and delivers a structured **INVEST or PASS** verdict with a fully traceable reasoning chain.

Unlike a single-prompt "ask the LLM" approach, Verdikt implements a **real multi-node LangGraph.js pipeline** — a directed acyclic graph where each stage (resolve ticker → fetch data → analyze → synthesize) has a distinct role, receives only the data it needs, and produces structured output that flows forward. Every stage of the reasoning is independently inspectable by the user in real time via a live-updating research console.

**Key Capabilities:**
- **Real financial data** from Yahoo Finance (income statements, key metrics, ratios, company profiles)
- **Live news analysis** via Tavily (recent headlines, sentiment, controversies)
- **Competitive landscape research** via Tavily web search (moat assessment, market position, key competitors)
- **Structured LLM analysis** using NVIDIA NIM (Llama 3.3 70B) with Zod schema enforcement
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
git clone https://github.com/ankan00V/Verdikt.git
cd Verdikt
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

# Dev only — mock mode (replays real captured API responses)
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

```
┌─────────────────────────────────────────────────────────────────┐
│                        LANGGRAPH PIPELINE                       │
│                                                                 │
│  START                                                          │
│    │                                                            │
│    ▼                                                            │
│  resolve_ticker  ────────── LLM: maps company name → ticker     │
│    │                                                            │
│    ├──────────────────────┬───────────────────┐                  │
│    ▼                      ▼                   ▼                  │
│  fetch_financials    fetch_news      fetch_web_research          │
│  (Yahoo Finance)     (Tavily)        (Tavily)                   │
│    │                      │                   │                  │
│    └──────────────────────┴───────────────────┘                  │
│                           │                                     │
│                           ▼                                     │
│                      gather_data  ──── fan-in sync point         │
│                           │                                     │
│    ┌──────────────────────┼───────────────────┐                  │
│    ▼                      ▼                   ▼                  │
│  analyze_fundamentals  analyze_sentiment  analyze_competitive    │
│  (LLM + Zod Schema)   (LLM + Zod)       (LLM + Zod)           │
│    │                      │                   │                  │
│    └──────────────────────┴───────────────────┘                  │
│                           │                                     │
│                           ▼                                     │
│                  synthesize_decision                             │
│                  (LLM: INVEST/PASS + confidence + reasoning)    │
│                           │                                     │
│                           ▼                                     │
│                          END                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 16 (App Router) | Full-stack React with API routes |
| **Agent Pipeline** | LangGraph.js (StateGraph) | DAG execution, parallel fan-out/fan-in, checkpointing |
| **LLM** | NVIDIA NIM — `meta/llama-3.3-70b-instruct` | Structured output via `.withStructuredOutput()` + Zod schemas |
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
- **50-second timeout** per attempt (matching Vercel's serverless limit)
- **3 automatic retries** with exponential backoff (2s, 4s delays)
- **API key rotation** — alternates between primary and fallback NVIDIA keys on each retry
- **Smart retry classification** — only retries on timeouts, 429 rate limits, and connection resets

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
| **NVIDIA NIM (Llama 3.3 70B) over OpenAI/Claude** | Deliberate choice to avoid the most common submission approach. NIM provides OpenAI-compatible endpoints, supports native structured output via tool-calling, and is free-tier accessible. |
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

All examples below were captured from the live production deployment at [verdikt-ashy.vercel.app](https://verdikt-ashy.vercel.app) with real-time API calls.

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
│   ├── PipelineTracker.tsx         # Left pane: node status tracker
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
