import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const job = await prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: `Job with ID ${id} not found`,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        id: job.id,
        type: job.type,
        status: job.status,
        attempts: job.attempts,
        errorMessage: job.errorMessage,
        payload: job.payloadJson ? JSON.parse(job.payloadJson) : null,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
      },
    });
  } catch (error) {
    logger.error("Error fetching job status route", { error });
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch job status",
        },
      },
      { status: 500 }
    );
  }
}
