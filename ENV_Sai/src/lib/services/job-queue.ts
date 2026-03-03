/**
 * Job Queue Service
 *
 * Uses Redis for production, in-memory Map for development.
 * Handles async AI generation jobs with status polling.
 */

import { redis } from "@/lib/db/redis";
import { logger } from "@/lib/logger";

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export interface JobData {
  id: string;
  status: JobStatus;
  payload: Record<string, unknown>;
  result?: unknown;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory fallback
const memoryJobs = new Map<string, JobData>();

export class JobQueue {
  private queueName: string;

  constructor(queueName: string) {
    this.queueName = queueName;
  }

  async enqueue(jobId: string, payload: Record<string, unknown>): Promise<void> {
    const now = new Date().toISOString();
    const job: JobData = {
      id: jobId,
      status: "queued",
      payload,
      createdAt: now,
      updatedAt: now,
    };

    if (redis) {
      await redis.set(`job:${this.queueName}:${jobId}`, JSON.stringify(job), "EX", 3600);
      await redis.lpush(`queue:${this.queueName}`, jobId);
      logger.info("Job enqueued to Redis", { queueName: this.queueName, jobId });
    } else {
      memoryJobs.set(jobId, job);
      logger.info("Job enqueued to memory", { queueName: this.queueName, jobId });
    }
  }

  async getJob(jobId: string): Promise<JobData | null> {
    if (redis) {
      const data = await redis.get(`job:${this.queueName}:${jobId}`);
      return data ? (JSON.parse(data) as JobData) : null;
    }
    return memoryJobs.get(jobId) || null;
  }

  async updateJob(
    jobId: string,
    update: Partial<Pick<JobData, "status" | "result" | "error">>
  ): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) return;

    const updated: JobData = {
      ...job,
      ...update,
      updatedAt: new Date().toISOString(),
    };

    if (redis) {
      await redis.set(
        `job:${this.queueName}:${jobId}`,
        JSON.stringify(updated),
        "EX",
        3600
      );
    } else {
      memoryJobs.set(jobId, updated);
    }
  }

  async dequeue(): Promise<string | null> {
    if (redis) {
      return redis.rpop(`queue:${this.queueName}`);
    }
    // Memory fallback: find first queued job
    for (const [id, job] of memoryJobs) {
      if (job.status === "queued") {
        return id;
      }
    }
    return null;
  }
}

// ─── Singleton Queues ───

export const aiJobQueue = new JobQueue("ai-suggestions");
