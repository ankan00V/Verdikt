# LLM Chat Session Transcript & Developer Log

> **Project:** Verdikt — AI Investment Research Agent
> **Lead Developer:** Ankan Ghosh
> **AI Assistant:** AI/LLM
> **Note to Reviewer:** This log captures the raw, unedited development process. My approach was to use the LLM to aggressively generate boilerplate, test scripts, and parse documentation, while I focused entirely on the system architecture, LangGraph state management, and debugging Vercel/API limits. 

---

## Session 1: Scaffolding & Initial Setup

### 🧑 USER [09:15 UTC]
im building an ai investment agent. tech stack is nextjs app router, tailwind, langgraph for the orchestration, and im going to use llama 3.3 70b via nvidia nim. 
scaffold the package.json with the necessary langchain/langgraph packages and give me a basic Next.js folder structure. don't write the app logic yet, just setup.

### 🤖 AGENT [09:16 UTC]
Here is the `package.json` with the required dependencies including `@langchain/core`, `@langchain/langgraph`, `@langchain/openai`, and `zod`. I've also outlined the standard Next.js App Router structure with a dedicated `src/lib/agent` directory for your LangGraph logic.

### 🧑 USER [09:25 UTC]
cool. now I need to figure out how to fetch financial data. I was going to use Financial Modeling Prep (FMP) but I heard they paywalled their income statement endpoints recently?

### 🤖 AGENT [09:26 UTC]
Yes, that's correct. Recently, FMP restricted several key fundamental endpoints (like historical income statements) to their premium tiers. 

### 🧑 USER [09:28 UTC]
okay I'm not dealing with that. let's use the `yahoo-finance2` npm package instead. it scrapes the data so it doesn't need an api key.
I don't have time to read their docs right now. write me a bunch of standalone test scripts I can run in node to test fetching income statements, balance sheets, and key metrics. put them in a `test-yf.js` file.

### 🤖 AGENT [09:29 UTC]
Here are the test scripts using `yahoo-finance2`. You can run these directly via Node.js to verify the data structure. I've included calls for `quoteSummary` requesting the `incomeStatementHistory` and `defaultKeyStatistics` modules.

---

## Session 2: Orchestration & State Management

### 🧑 USER [11:10 UTC]
the yahoo finance test scripts worked. now let's build the actual LangGraph state.
I want a fan-out architecture. `gather_data` should kick off `fetch_financials` and `fetch_news` in parallel.
what's the best way to handle the state object so the parallel nodes don't overwrite each other in javascript?

### 🤖 AGENT [11:11 UTC]
To prevent parallel nodes from overwriting the state, you must use LangGraph's `Annotation.Root` with custom reducers. If both nodes update an array (like `errors` or `logs`), a standard object merge will overwrite the array. 

You should define your state like this:
```typescript
import { Annotation } from "@langchain/langgraph";

export const AgentState = Annotation.Root({
  ticker: Annotation<string>(),
  financials: Annotation<any>(),
  news: Annotation<any>(),
  errors: Annotation<string[]>({
    reducer: (a, b) => a.concat(b),
    default: () => [],
  }),
});
```

### 🧑 USER [11:15 UTC]
makes sense, I'll write the state schema using those reducers. 
now for the LLM nodes. they absolutely have to return structured JSON. no regex parsing hacks. write me the exact syntax for binding a Zod schema to `ChatOpenAI` in langchain js.

### 🤖 AGENT [11:16 UTC]
Here is the exact syntax for enforcing structured output using Zod with `ChatOpenAI`:
```typescript
const structuredModel = model.withStructuredOutput(z.object({
  score: z.enum(["strong", "neutral", "weak"]),
  reasoning: z.string()
}));
```

### 🧑 USER [11:30 UTC]
llama 3.3 keeps wrapping the JSON in markdown code blocks like ```json ... ``` and it's crashing the parser. how do I force it to return raw json only?

### 🤖 AGENT [11:31 UTC]
When using NVIDIA NIM or some open-source models, `withStructuredOutput` might still return markdown. You should pass `name: "json"` to the model configuration or explicitly instruct it in the system prompt: *"Return ONLY valid JSON. Do not include markdown formatting or backticks."*

---

## Session 3: The Vercel Timeout Problem

### 🧑 USER [15:20 UTC]
ran into a huge issue. I deployed to vercel, but because the graph takes like 45 seconds to fetch data, run 3 parallel LLM analyses, and synthesize a final verdict, vercel serverless functions are timing out. it just drops the connection.

### 🤖 AGENT [15:21 UTC]
Vercel's Hobby tier has a 10-second limit, and the Pro tier has a 60-second limit for Serverless Functions. Since an AI agent workflow often exceeds this, you have a few options:
1. Switch to Vercel Edge functions (which have longer timeouts but limited Node.js API support).
2. Use an external task queue (like Inngest or Trigger.dev).
3. Implement a custom LangGraph checkpointer using Redis.

### 🧑 USER [15:25 UTC]
option 3 is best. if I write a custom checkpointer using Upstash Redis, the graph will save its state after every node, right? so if the frontend connection drops, the user can just hit the endpoint again with the same `thread_id` and it'll resume from where it died?

### 🤖 AGENT [15:26 UTC]
Exactly! If you provide a `checkpointer` to your compiled graph, LangGraph automatically saves the state at the end of each superstep. If the Vercel function times out, the next request with the same `thread_id` will fetch the state from Upstash Redis and resume execution exactly where it left off, without re-running completed nodes.

### 🧑 USER [15:35 UTC]
bet. generate the boilerplate for a class that implements `BaseCheckpointSaver` using `@upstash/redis`. I'll handle hooking it into the graph compilation.

### 🤖 AGENT [15:36 UTC]
Here is the boilerplate for `UpstashSaver.ts` extending `BaseCheckpointSaver`...

---

## Session 4: UI & Streaming

### 🧑 USER [10:00 UTC] (Next Day)
backend is solid. redis checkpointer works flawlessly. 
now I'm doing the frontend. I need to stream the updates via Server-Sent Events (SSE) so the user sees exactly what the agent is doing in real time. 
write me a react hook `useResearch(ticker)` that connects to an EventSource, parses the incoming JSON chunks, and updates a state object. handle reconnects automatically in case of vercel timeouts.

### 🤖 AGENT [10:02 UTC]
Here is the `useResearch` React hook using `EventSource`. It includes exponential backoff for reconnections and parses the `data` payloads into a structured React state...

### 🧑 USER [11:45 UTC]
hook works. I just built the UI with framer motion to stagger the feed items as they stream in. it looks incredibly smooth. 
one last thing, `yahoo-finance2` is throwing a 403 forbidden error ONLY on vercel. works perfectly on localhost. im guessing yahoo is blocking vercel datacenter IPs.

### 🤖 AGENT [11:46 UTC]
Yes, Yahoo Finance heavily rate-limits or blocks known datacenter IPs (like AWS/GCP, which Vercel uses). To bypass this in production, you will need to route the requests through a residential proxy. You can use a library like `https-proxy-agent` and pass it to `yahoo-finance2`.

### 🧑 USER [11:50 UTC]
yeah I figured. I grabbed a free proxy URL. write me the snippet to inject `https-proxy-agent` into the `yahooFinance.quoteSummary` call.

### 🤖 AGENT [11:51 UTC]
Here is the snippet...

### 🧑 USER [12:15 UTC]
alright, proxy is in, Vercel build is completely green, SSE is streaming flawlessly. we're done here. packing up the submission now.
