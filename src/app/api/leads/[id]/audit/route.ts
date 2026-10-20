import { NextResponse } from "next/server";
import { runWebsiteAudit } from "@/server/services/audit-engine-service";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const result = await runWebsiteAudit(id);

    return NextResponse.json({
      data: result,
    });
  } catch (error) {
    logger.error("Error triggering website audit API", { error });
    return NextResponse.json(
      {
        error: {
          code: "AUDIT_FAILED",
          message: error instanceof Error ? error.message : "Failed to run website audit",
        },
      },
      { status: 500 }
    );
  }
}
