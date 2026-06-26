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
          // Restore storage for this thread
          this.storage[threadId] = data.storage || Object.create(null);
          
          // Restore writes (writes are globally indexed in MemorySaver, so we merge them)
          if (data.writes) {
            for (const key of Object.keys(data.writes)) {
              this.writes[key] = data.writes[key];
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
      
      // Filter writes to only those belonging to this thread
      // MemorySaver keys are JSON stringified arrays: ["threadId", "namespace", "checkpointId"]
      const writesData: any = {};
      for (const key of Object.keys(this.writes)) {
        if (key.startsWith(`["${threadId}"`)) {
          writesData[key] = this.writes[key];
        }
      }
      
      // Store state for 1 hour (3600 seconds) to prevent DB bloat
      await redis.set(
        `langgraph_thread_${threadId}`, 
        { storage: storageData, writes: writesData },
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
