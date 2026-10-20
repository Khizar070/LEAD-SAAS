import { NextResponse } from "next/server";
import { approveOutreachMessage } from "@/server/services/outreach-service";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const result = await approveOutreachMessage(id, body.subject, body.body);

    return NextResponse.json({
      data: result,
    });
  } catch (error) {
    logger.error("Error approving outreach message route", { error });
    return NextResponse.json(
      {
        error: {
          code: "APPROVAL_FAILED",
          message: error instanceof Error ? error.message : "Failed to approve outreach message",
        },
      },
      { status: 500 }
    );
  }
}
