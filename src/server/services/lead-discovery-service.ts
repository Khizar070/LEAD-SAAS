import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getOrCreateDefaultWorkspace } from "@/server/services/workspace-service";
import { GooglePlacesProvider, DiscoverParams } from "@/server/integrations/google-places";

export interface DiscoveryResult {
  totalDiscovered: number;
  newlyAdded: number;
  duplicatesSkipped: number;
}

export async function runLeadDiscovery(params: DiscoverParams): Promise<DiscoveryResult> {
  const workspace = await getOrCreateDefaultWorkspace();
  const provider = new GooglePlacesProvider();

  logger.info("Starting lead discovery", { params, workspaceId: workspace.id });

  const discoveredLeads = await provider.discoverLeads(params);

  let newlyAdded = 0;
  let duplicatesSkipped = 0;

  for (const leadData of discoveredLeads) {
    // 1. Check deduplication
    const existing = await prisma.business.findFirst({
      where: {
        workspaceId: workspace.id,
        source: "google_places",
        sourcePlaceId: leadData.sourcePlaceId,
      },
    });

    if (existing) {
      duplicatesSkipped++;
      continue;
    }

    // 2. Initial preliminary score calculation
    let initialScore = 20; // Base discovery score
    if (!leadData.websiteUrl) {
      initialScore += 30; // +30 for no website
    } else {
      initialScore += 10;
    }

    // 3. Create Business record
    const business = await prisma.business.create({
      data: {
        workspaceId: workspace.id,
        source: "google_places",
        sourcePlaceId: leadData.sourcePlaceId,
        name: leadData.name,
        category: leadData.category,
        websiteUrl: leadData.websiteUrl,
        phone: leadData.phone,
        address: leadData.address,
        city: leadData.city,
        country: leadData.country,
        latitude: leadData.latitude,
        longitude: leadData.longitude,
        rating: leadData.rating,
        reviewCount: leadData.reviewCount,
        score: initialScore,
        opportunityLevel: initialScore >= 50 ? "HIGH" : "MEDIUM",
      },
    });

    // 4. Create initial Website tracking record if URL present
    if (leadData.websiteUrl) {
      const normalizedUrl = normalizeUrl(leadData.websiteUrl);
      await prisma.website.create({
        data: {
          businessId: business.id,
          normalizedUrl,
          crawlStatus: "PENDING",
        },
      });
    }

    newlyAdded++;
  }

  logger.info("Completed lead discovery", {
    totalDiscovered: discoveredLeads.length,
    newlyAdded,
    duplicatesSkipped,
  });

  return {
    totalDiscovered: discoveredLeads.length,
    newlyAdded,
    duplicatesSkipped,
  };
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${parsed.pathname.replace(/\/$/, "")}`;
  } catch {
    return url.toLowerCase().trim();
  }
}
