import { Worker } from "bullmq";
import { connection } from "../src/server/queue";
import { logger } from "../src/lib/logger";
import { processLeadDiscoveryJob } from "./processors/lead-processor";
import { processAuditJob } from "./processors/audit-processor";
import { processAIAnalysisJob } from "./processors/ai-processor";

logger.info("Initializing background worker process...");

export const leadWorker = new Worker(
  "leads-discovery",
  async (job) => {
    return processLeadDiscoveryJob(job);
  },
  { connection, concurrency: 2 }
);

export const auditWorker = new Worker(
  "website-audits",
  async (job) => {
    return processAuditJob(job);
  },
  { connection, concurrency: 3 }
);

export const aiWorker = new Worker(
  "ai-analysis",
  async (job) => {
    return processAIAnalysisJob(job);
  },
  { connection, concurrency: 2 }
);

leadWorker.on("completed", (job) => {
  logger.info(`[Worker] Job ${job.id} completed in queue leads-discovery`);
});

auditWorker.on("completed", (job) => {
  logger.info(`[Worker] Job ${job.id} completed in queue website-audits`);
});

aiWorker.on("completed", (job) => {
  logger.info(`[Worker] Job ${job.id} completed in queue ai-analysis`);
});

logger.info("Background worker process running and listening to BullMQ queues.");
