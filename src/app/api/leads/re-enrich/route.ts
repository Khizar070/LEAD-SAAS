import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultWorkspace } from "@/server/services/workspace-service";
import { GooglePlacesProvider } from "@/server/integrations/google-places";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export async function POST() {
  try {
    const workspace = await getOrCreateDefaultWorkspace();
    const leadsToEnrich = await prisma.business.findMany({
      where: {
        workspaceId: workspace.id,
        OR: [{ websiteUrl: null }, { phone: null }],
      },
    });

    if (leadsToEnrich.length === 0) {
      return NextResponse.json({
        data: { enrichedCount: 0, message: "All leads already have websites and phone numbers." },
      });
    }

    const provider = new GooglePlacesProvider();
    const apiKey = env.GOOGLE_MAPS_API_KEY;
    let enrichedCount = 0;

    for (const lead of leadsToEnrich) {
      let discoveredWebsite: string | undefined = lead.websiteUrl || undefined;
      let discoveredPhone: string | undefined = lead.phone || undefined;

      // 1. Google Place Details
      if (apiKey && lead.sourcePlaceId && !lead.sourcePlaceId.startsWith("mock_")) {
        const details = await provider.fetchPlaceDetails(lead.sourcePlaceId, apiKey);
        if (details) {
          if (!discoveredWebsite && details.website) discoveredWebsite = details.website;
          if (!discoveredPhone && details.phone) discoveredPhone = details.phone;
        }
      }

      // 2. DuckDuckGo Web Search Fallback
      if (!discoveredWebsite) {
        discoveredWebsite = await provider.searchWebsiteFallback(
          lead.name,
          lead.city || lead.address || ""
        );
      }

      if (discoveredWebsite || discoveredPhone) {
        let cleanWebsite = discoveredWebsite?.trim();
        if (cleanWebsite && !cleanWebsite.startsWith("http://") && !cleanWebsite.startsWith("https://")) {
          cleanWebsite = `https://${cleanWebsite}`;
        }

        await prisma.business.update({
          where: { id: lead.id },
          data: {
            websiteUrl: cleanWebsite || lead.websiteUrl,
            phone: discoveredPhone || lead.phone,
          },
        });

        if (cleanWebsite) {
          const normalizedUrl = cleanWebsite.toLowerCase().trim();
          const existingWeb = await prisma.website.findFirst({ where: { businessId: lead.id } });
          if (!existingWeb) {
            await prisma.website.create({
              data: {
                businessId: lead.id,
                normalizedUrl,
                crawlStatus: "PENDING",
              },
            });
          } else {
            await prisma.website.update({
              where: { id: existingWeb.id },
              data: { normalizedUrl, crawlStatus: "PENDING" },
            });
          }
        }

        enrichedCount++;
      }
    }

    logger.info("Completed bulk re-enrichment of leads", {
      totalTargeted: leadsToEnrich.length,
      enrichedCount,
    });

    return NextResponse.json({
      data: {
        totalTargeted: leadsToEnrich.length,
        enrichedCount,
        message: `Successfully enriched ${enrichedCount} leads with website & contact details!`,
      },
    });
  } catch (error) {
    logger.error("Error running bulk lead re-enrichment", { error });
    return NextResponse.json(
      { error: { message: "Failed to re-enrich leads" } },
      { status: 500 }
    );
  }
}
