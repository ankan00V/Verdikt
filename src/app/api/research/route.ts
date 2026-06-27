/**
 * app/api/research/route.ts
 *
 * SSE streaming endpoint for the Verdikt research pipeline.
 *
 * Contract:
 *   POST /api/research
 *   Body: { company: string }
 *   Response: text/event-stream
 *
 * SSE message types:
 *   { type: "node_start",    node: string, label: string }
 *   { type: "node_complete", node: string, label: string, data: object }
 *   { type: "error",         message: string }
 *   { type: "done" }
 *
 * Why SSE over WebSockets: SSE is simpler (HTTP), supported on Vercel's free
 * tier, and sufficient for a unidirectional server→client stream. WebSockets
 * are not supported on Vercel serverless functions.
 *
 * Why ReadableStream + fetch (not native EventSource): native EventSource only
 * supports GET requests. Since we need to POST a body (the company name), we
 * use fetch on the client side and parse SSE lines from the ReadableStream.
 *
 * Streaming pattern: ALL async work (graph.streamEvents) goes INSIDE
 * ReadableStream's start(controller) function. Anything awaited before
 * `return new Response(stream, ...)` would be buffered by Next.js, defeating
 * the point of streaming.
 *
 * Vercel limit: 300 seconds (5 min) on Hobby tier. Set maxDuration accordingly.
 */

import { NextRequest } from "next/server";
import { buildGraph, NODE_LABELS } from "@/lib/agent/graph";
import { ratelimit } from "@/lib/ratelimit";
import { UpstashSaver } from "@/lib/agent/upstash-saver";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds — Vercel Hobby plan maximum

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

function validateCompanyName(company: unknown): string | null {
  if (typeof company !== "string") return null;
  const trimmed = company.trim();
  if (trimmed.length < 1 || trimmed.length > 200) return null;
  return trimmed;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<Response> {
  // Rate limiting check
  if (ratelimit) {
    // Extract IP from standard proxy headers
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const { success } = await ratelimit.limit(ip);
    
    if (!success) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Maximum 10 research requests per hour." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // Parse and validate request body
  let companyName: string | null = null;
  let website: string | null = null;
  let threadId: string | null = null;
  try {
    const body = await req.json();
    companyName = validateCompanyName(body?.company);
    website = typeof body?.website === "string" ? body.website.trim() : null;
    threadId = typeof body?.thread_id === "string" ? body.thread_id.trim() : null;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body. Expected: { company: string, website: string, thread_id?: string }" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!companyName || !website) {
    return new Response(
      JSON.stringify({ error: "company and website must be non-empty strings" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Check required env vars early — surface the error clearly
  const missingEnvVars: string[] = [];
  if (!process.env.NVIDIA_NIM_API_KEY) missingEnvVars.push("NVIDIA_NIM_API_KEY");
  if (!process.env.TAVILY_API_KEY) missingEnvVars.push("TAVILY_API_KEY");

  if (missingEnvVars.length > 0) {
    return new Response(
      JSON.stringify({
        error: `Missing required environment variables: ${missingEnvVars.join(", ")}. See .env.example.`,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();

  // Track which nodes have started (for deduplication of start events)
  const startedNodes = new Set<string>();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (message: object): void => {
        try {
          const payload = `data: ${JSON.stringify(message)}\n\n`;
          // Vercel Serverless (Node.js runtime) aggressively buffers small chunks.
          // By appending a large SSE comment (which is ignored by EventSource clients),
          // we force the buffer to flush immediately to the client.
          const padding = `: ${" ".repeat(1024)}\n\n`;
          controller.enqueue(encoder.encode(payload + padding));
        } catch {
          // Controller may be closed if client disconnected
        }
      };

      try {
        const checkpointer = new UpstashSaver();
        const graph = buildGraph(checkpointer);
        
        // If the frontend didn't pass a thread_id, we create a new one
        const activeThreadId = threadId || crypto.randomUUID();
        
        // Let the frontend know the thread ID so it can reconnect if disconnected
        send({ type: "thread_created", thread_id: activeThreadId });

        // streamEvents v2: emits on_chain_start / on_chain_end for each node
        // We filter by langgraph_node metadata to get per-node events
        const eventStream = graph.streamEvents(
          { companyName, website },
          { 
            version: "v2", 
            configurable: { thread_id: activeThreadId }
          }
        );

        for await (const event of eventStream) {
          const nodeName = event.metadata?.langgraph_node as string | undefined;

          if (!nodeName || !NODE_LABELS[nodeName]) continue;

          // Filter out internal runnables (like LLM calls) that inherit the langgraph_node tag.
          // We only want the events where the runnable name exactly matches the node name.
          if (event.name !== nodeName) continue;

          // Emit node_start on first on_chain_start for this node
          if (event.event === "on_chain_start" && !startedNodes.has(nodeName)) {
            startedNodes.add(nodeName);
            send({
              type: "node_start",
              node: nodeName,
              label: NODE_LABELS[nodeName],
            });
          }

          // Handle node failures immediately
          if (event.event === "on_chain_error") {
            const error = event.data?.error;
            // Throw it so the outer catch block handles it and closes the stream
            throw error || new Error(`Error in node ${nodeName}`);
          }

          // Emit node_complete with the node's output on on_chain_end
          if (event.event === "on_chain_end") {
            const output = event.data?.output;
            send({
              type: "node_complete",
              node: nodeName,
              label: NODE_LABELS[nodeName],
              data: output ?? {},
            });
          }
        }

        send({ type: "done" });
      } catch (err) {
        console.error("[/api/research] Stream error:", err);
        send({
          type: "error",
          message:
            err instanceof Error
              ? err.message
              : "An unexpected error occurred during research.",
        });
      } finally {
        controller.close();
      }
    },

    cancel() {
      // Client disconnected — nothing to clean up since we have no persistent state
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disables nginx/proxy buffering — ensures chunks reach the client immediately
      "X-Accel-Buffering": "no",
    },
  });
}
