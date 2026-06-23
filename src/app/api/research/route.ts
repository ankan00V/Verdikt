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

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 300 seconds (5 minutes) for Vercel Pro/Enterprise

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
  // Parse and validate request body
  let companyName: string | null = null;
  try {
    const body = await req.json();
    companyName = validateCompanyName(body?.company);
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body. Expected: { company: string }" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!companyName) {
    return new Response(
      JSON.stringify({ error: "company must be a non-empty string (max 200 chars)" }),
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
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(message)}\n\n`)
          );
        } catch {
          // Controller may be closed if client disconnected
        }
      };

      try {
        const graph = buildGraph();

        // streamEvents v2: emits on_chain_start / on_chain_end for each node
        // We filter by langgraph_node metadata to get per-node events
        const eventStream = graph.streamEvents(
          { companyName },
          { version: "v2" }
        );

        for await (const event of eventStream) {
          const nodeName = event.metadata?.langgraph_node as string | undefined;

          if (!nodeName || !NODE_LABELS[nodeName]) continue;

          // Emit node_start on first on_chain_start for this node
          if (event.event === "on_chain_start" && !startedNodes.has(nodeName)) {
            startedNodes.add(nodeName);
            send({
              type: "node_start",
              node: nodeName,
              label: NODE_LABELS[nodeName],
            });
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
