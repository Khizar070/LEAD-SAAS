import { NextResponse } from "next/server";
import { runAIOpportunityAnalysis } from "@/server/services/ai-analysis-service";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const result = await runAIOpportunityAnalysis(id);

    return NextResponse.json({
      data: result,
    });
  } catch (error) {
    logger.error("Error triggering AI analysis API", { error });
    return NextResponse.json(
      {
        error: {
          code: "ANALYSIS_FAILED",
          message: error instanceof Error ? error.message : "Failed to run AI opportunity analysis",
        },
      },
      { status: 500 }
    );
  }
}
