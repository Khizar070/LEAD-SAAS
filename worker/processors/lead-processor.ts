import { Job } from "bullmq";
import { runLeadDiscovery } from "../../src/server/services/lead-discovery-service";
import { prisma } from "../../src/lib/prisma";
import { logger } from "../../src/lib/logger";

export async function processLeadDiscoveryJob(job: Job) {
  const { jobId, niche, location, maxResults } = job.data;
  logger.info(`[Worker] Processing discover_leads job ${job.id}`, { jobId, niche, location });

  if (jobId) {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "RUNNING", startedAt: new Date() },
    });
  }

  try {
    const result = await runLeadDiscovery({ niche, location, maxResults });

    if (jobId) {
      await prisma.job.update({
        where: { id: jobId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }

    return result;
  } catch (error) {
    logger.error(`[Worker] Failed discover_leads job ${job.id}`, { error });
    if (jobId) {
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
    throw error;
  }
}
