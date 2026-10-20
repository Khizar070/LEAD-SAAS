import { Queue } from "bullmq";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

function parseRedisUrl(redisUrl: string) {
  try {
    const url = new URL(redisUrl);
    return {
      host: url.hostname || "localhost",
      port: parseInt(url.port || "6379", 10),
      password: url.password || undefined,
    };
  } catch {
    return { host: "localhost", port: 6379 };
  }
}

export const connection = parseRedisUrl(env.REDIS_URL);

export const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 2000,
  },
  removeOnComplete: 100,
  removeOnFail: 200,
};

export const leadsQueue = new Queue("leads-discovery", {
  connection,
  defaultJobOptions,
});

export const auditQueue = new Queue("website-audits", {
  connection,
  defaultJobOptions,
});

export const aiQueue = new Queue("ai-analysis", {
  connection,
  defaultJobOptions,
});

export async function enqueueJob(type: string, payload: Record<string, unknown>) {
  try {
    // 1. Create DB job tracking record
    const dbJob = await prisma.job.create({
      data: {
        type,
        status: "PENDING",
        payloadJson: JSON.stringify(payload),
      },
    });

    // 2. Add to BullMQ queue
    const queueMap: Record<string, Queue> = {
      discover_leads: leadsQueue,
      run_page_audit: auditQueue,
      run_ai_analysis: aiQueue,
    };

    const targetQueue = queueMap[type] || leadsQueue;
    await targetQueue.add(type, { ...payload, jobId: dbJob.id }, { jobId: dbJob.id });

    logger.info("Enqueued job successfully", { jobId: dbJob.id, type });
    return dbJob;
  } catch (error) {
    logger.error("Failed to enqueue job", { type, payload, error });
    throw error;
  }
}
