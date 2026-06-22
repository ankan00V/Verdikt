import { NextRequest } from "next/server";
import { investmentAgentGraph } from "../../../lib/agent/graph";

export const maxDuration = 60; // Set Vercel function timeout to 60s (requires Pro tier for > 10s, but Next.js App Router defaults to 15s on Hobby, setting to 60s is standard for agents).
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { companyName } = await req.json();

    if (!companyName) {
      return new Response(JSON.stringify({ error: "Company name is required." }), { status: 400 });
    }

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send a padding comment to force Next.js to flush the buffer immediately
          controller.enqueue(encoder.encode(`: ${" ".repeat(2048)}\n\n`));

          const config = { configurable: { thread_id: Date.now().toString() } };
          const initialState = { companyName };

          // Stream events from the graph
          const stream = await investmentAgentGraph.stream(initialState, config);

          for await (const chunk of stream) {
            // chunk is an object where keys are the node names and values are the state updates
            const chunkRecord = chunk as Record<string, any>;
            const nodeName = Object.keys(chunkRecord)[0];
            const stateUpdate = chunkRecord[nodeName];

            // Send a progress event
            const data = JSON.stringify({
              node: nodeName,
              data: stateUpdate,
            });
            
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          // Send a final done event
          controller.enqueue(encoder.encode(`data: {"done": true}\n\n`));
          controller.close();
        } catch (error: any) {
          console.error("Stream error:", error);
          controller.enqueue(encoder.encode(`data: {"error": "${error.message || "Unknown error occurred"}"}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        "Content-Encoding": "none",
      },
    });

  } catch (error: any) {
    console.error("API error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
