import { NextResponse } from "next/server";
import { z } from "zod";
import { runLeadDiscovery } from "@/server/services/lead-discovery-service";
import { logger } from "@/lib/logger";

const discoverSchema = z.object({
  niche: z.string().min(2, "Niche must be at least 2 characters"),
  location: z.string().min(2, "Location must be at least 2 characters"),
  maxResults: z.number().int().min(1).max(50).optional().default(10),
  sortOrder: z.enum(["bottom-to-top", "top-to-bottom", "lowest-reviews"]).optional().default("bottom-to-top"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = discoverSchema.parse(body);

    const result = await runLeadDiscovery({
      niche: validated.niche,
      location: validated.location,
      maxResults: validated.maxResults,
      sortOrder: validated.sortOrder,
    });

    return NextResponse.json({
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid discovery parameters",
            details: error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    logger.error("Error executing lead discovery route", { error });
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to discover leads",
        },
      },
      { status: 500 }
    );
  }
}
