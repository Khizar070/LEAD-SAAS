import { NextResponse } from "next/server";
import { generateOutreachEmail } from "@/server/services/email-generator-service";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const result = await generateOutreachEmail({
      businessId: id,
      templateId: body.templateId,
      selectedIssues: body.selectedIssues,
      followUpStage: body.followUpStage ?? 0,
      recipientEmail: body.recipientEmail,
      tone: body.tone,
      serviceFocus: body.serviceFocus,
      userNotes: body.userNotes,
    });

    return NextResponse.json({
      data: result,
    });
  } catch (error) {
    logger.error("Error generating email draft route", { error });
    return NextResponse.json(
      {
        error: {
          code: "GENERATION_FAILED",
          message: error instanceof Error ? error.message : "Failed to generate outreach email",
        },
      },
      { status: 500 }
    );
  }
}
