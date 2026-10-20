import { NextResponse } from "next/server";
import { sendOutreachMessage } from "@/server/services/outreach-service";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    let recipientEmail: string | undefined = undefined;

    try {
      const body = await request.json();
      if (body && typeof body.recipientEmail === "string") {
        recipientEmail = body.recipientEmail;
      }
    } catch {
      // Body may be empty on simple POST trigger
    }

    const result = await sendOutreachMessage(id, recipientEmail);

    return NextResponse.json({
      data: result,
    });
  } catch (error) {
    logger.error("Error sending outreach message route", { error });
    return NextResponse.json(
      {
        error: {
          code: "SEND_FAILED",
          message: error instanceof Error ? error.message : "Failed to send outreach email",
        },
      },
      { status: 500 }
    );
  }
}
