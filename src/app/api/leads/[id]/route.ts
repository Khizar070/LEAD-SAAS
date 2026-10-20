import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const lead = await prisma.business.findUnique({
      where: { id },
      include: {
        websites: {
          include: {
            audits: {
              orderBy: { createdAt: "desc" },
              include: { issues: true, evidence: true },
            },
          },
        },
        opportunityAnalyses: {
          orderBy: { createdAt: "desc" },
          include: { opportunities: true },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: { message: "Lead not found" } }, { status: 404 });
    }

    return NextResponse.json({ data: lead });
  } catch (error) {
    logger.error("Error fetching lead detail API", { error });
    return NextResponse.json({ error: { message: "Failed to fetch lead" } }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { name, category, websiteUrl, phone, address, city } = body;

    const existing = await prisma.business.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: { message: "Lead not found" } }, { status: 404 });
    }

    let cleanWebsite = websiteUrl !== undefined ? (websiteUrl ? websiteUrl.trim() : null) : existing.websiteUrl;
    if (cleanWebsite && !cleanWebsite.startsWith("http://") && !cleanWebsite.startsWith("https://")) {
      cleanWebsite = `https://${cleanWebsite}`;
    }

    const updated = await prisma.business.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        websiteUrl: cleanWebsite,
      },
    });

    // If websiteUrl was added or changed, create/update website record
    if (cleanWebsite) {
      const normalizedUrl = cleanWebsite.toLowerCase().trim();
      const websiteRecord = await prisma.website.findFirst({
        where: { businessId: id },
      });

      if (!websiteRecord) {
        await prisma.website.create({
          data: {
            businessId: id,
            normalizedUrl,
            crawlStatus: "PENDING",
          },
        });
      } else if (websiteRecord.normalizedUrl !== normalizedUrl) {
        await prisma.website.update({
          where: { id: websiteRecord.id },
          data: { normalizedUrl, crawlStatus: "PENDING" },
        });
      }
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    logger.error("Error updating lead API", { error });
    return NextResponse.json({ error: { message: "Failed to update lead" } }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await prisma.business.delete({ where: { id } });
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    logger.error("Error deleting lead API", { error });
    return NextResponse.json({ error: { message: "Failed to delete lead" } }, { status: 500 });
  }
}
