import { MemorySaver } from "@langchain/langgraph-checkpoint";
import type { RunnableConfig } from "@langchain/core/runnables";
import { redis } from "../redis";

/**
 * A custom CheckpointSaver that extends LangGraph's built-in MemorySaver
 * but synchronizes its state to Upstash Redis using their REST API.
 * 
 * This avoids the need to maintain a persistent TCP Redis connection in Vercel Serverless/Edge,
 * while still giving us durable state persistence so workflows can survive 60-second timeouts.
 */
export class UpstashSaver extends MemorySaver {
  
  // Intercept the read path to ensure we pull the latest state from Redis into memory first
  async getTuple(config: RunnableConfig) {
    const threadId = config.configurable?.thread_id;
    
    if (threadId && redis) {
      try {
        const data = await redis.get<any>(`langgraph_thread_${threadId}`);
        if (data) {
          // Restore storage for this thread (decode base64 back to Uint8Array)
          const restoredStorage = Object.create(null);
          if (data.storage) {
            for (const [ns, nsRecord] of Object.entries(data.storage)) {
              restoredStorage[ns] = Object.create(null);
              for (const [checkpointId, tuple] of Object.entries(nsRecord as any)) {
                restoredStorage[ns][checkpointId] = [
                  new Uint8Array(Buffer.from((tuple as any)[0], "base64")),
                  new Uint8Array(Buffer.from((tuple as any)[1], "base64")),
                  (tuple as any)[2]
                ];
              }
            }
          }
          this.storage[threadId] = restoredStorage;
          
          // Restore writes (writes are globally indexed in MemorySaver, so we merge them)
          if (data.writes) {
            for (const [outerKey, innerRecord] of Object.entries(data.writes)) {
              const decodedInner = Object.create(null);
              for (const [innerKey, tuple] of Object.entries(innerRecord as any)) {
                decodedInner[innerKey] = [
                  (tuple as any)[0],
                  (tuple as any)[1],
                  new Uint8Array(Buffer.from((tuple as any)[2], "base64"))
                ];
              }
              this.writes[outerKey] = decodedInner;
            }
          }
        }
      } catch (err) {
        console.error(`[UpstashSaver] Failed to fetch state for thread ${threadId}:`, err);
      }
    }
    
    return super.getTuple(config);
  }

  // Helper to push memory state to Upstash
  private async sync(threadId: string) {
    if (!redis) return;
    
    try {
      const storageData = this.storage[threadId];
      
      // MemorySaver uses Uint8Array for serialized checkpoints. 
      // We MUST convert these to Base64 before sending to Upstash Redis, otherwise 
      // JSON.stringify will turn them into huge objects and crash Node's Buffer.concat
      // when LangGraph tries to decode them later.
      const encodedStorage: Record<string, Record<string, [string, string, string | undefined]>> = {};
      if (storageData) {
        for (const [ns, nsRecord] of Object.entries(storageData)) {
          encodedStorage[ns] = {};
          for (const [checkpointId, tuple] of Object.entries(nsRecord)) {
            encodedStorage[ns][checkpointId] = [
              Buffer.from(tuple[0]).toString("base64"),
              Buffer.from(tuple[1]).toString("base64"),
              tuple[2]
            ];
          }
        }
      }
      
      // Filter writes to only those belonging to this thread and encode them
      // MemorySaver keys are JSON stringified arrays: ["threadId", "namespace", "checkpointId"]
      const encodedWrites: Record<string, Record<string, [string, string, string]>> = {};
      for (const [outerKey, innerRecord] of Object.entries(this.writes)) {
        if (outerKey.startsWith(`["${threadId}"`)) {
          const encodedInner: Record<string, [string, string, string]> = {};
          for (const [innerKey, tuple] of Object.entries(innerRecord)) {
            encodedInner[innerKey] = [
              tuple[0],
              tuple[1],
              Buffer.from(tuple[2]).toString("base64")
            ];
          }
          encodedWrites[outerKey] = encodedInner;
        }
      }
      
      // Store state for 1 hour (3600 seconds) to prevent DB bloat
      await redis.set(
        `langgraph_thread_${threadId}`, 
        { storage: encodedStorage, writes: encodedWrites },
        { ex: 3600 }
      );
    } catch (err) {
      console.error(`[UpstashSaver] Failed to sync state for thread ${threadId}:`, err);
    }
  }

  // Intercept write paths to flush changes to Redis
  async put(config: RunnableConfig, checkpoint: any, metadata: any) {
    const res = await super.put(config, checkpoint, metadata);
    const threadId = config.configurable?.thread_id;
    if (threadId) {
      await this.sync(threadId);
    }
    return res;
  }

  async putWrites(config: RunnableConfig, writes: any, taskId: string) {
    await super.putWrites(config, writes, taskId);
    const threadId = config.configurable?.thread_id;
    if (threadId) {
      await this.sync(threadId);
    }
  }
}
