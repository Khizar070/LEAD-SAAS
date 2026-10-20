import { Job } from "bullmq";
import { runAIOpportunityAnalysis } from "../../src/server/services/ai-analysis-service";
import { prisma } from "../../src/lib/prisma";
import { logger } from "../../src/lib/logger";

export async function processAIAnalysisJob(job: Job) {
  const { jobId, auditId } = job.data;
  logger.info(`[Worker] Processing run_ai_analysis job ${job.id}`, { jobId, auditId });

  if (jobId) {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "RUNNING", startedAt: new Date() },
    });
  }

  try {
    const result = await runAIOpportunityAnalysis(auditId);

    if (jobId) {
      await prisma.job.update({
        where: { id: jobId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }

    return result;
  } catch (error) {
    logger.error(`[Worker] Failed run_ai_analysis job ${job.id}`, { error });
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
