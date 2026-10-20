import { Job } from "bullmq";
import { runWebsiteAudit } from "../../src/server/services/audit-engine-service";
import { prisma } from "../../src/lib/prisma";
import { logger } from "../../src/lib/logger";

export async function processAuditJob(job: Job) {
  const { jobId, businessId } = job.data;
  logger.info(`[Worker] Processing run_page_audit job ${job.id}`, { jobId, businessId });

  if (jobId) {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "RUNNING", startedAt: new Date() },
    });
  }

  try {
    const result = await runWebsiteAudit(businessId);

    if (jobId) {
      await prisma.job.update({
        where: { id: jobId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }

    return result;
  } catch (error) {
    logger.error(`[Worker] Failed run_page_audit job ${job.id}`, { error });
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
