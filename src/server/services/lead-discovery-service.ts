import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getOrCreateDefaultWorkspace } from "@/server/services/workspace-service";
import { GooglePlacesProvider, DiscoverParams } from "@/server/integrations/google-places";
import { crawlWebsite, isMobileOrWhatsappCandidate } from "@/server/services/crawler-service";

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

    // 2. Multi-channel & WhatsApp discovery from website
    let allPhones: string[] = leadData.phone ? [leadData.phone] : [];
    let detectedWhatsapp: string | undefined = undefined;
    let discoveredEmails: string[] = [];
    let hasChatbot = false;
    let chatbotDetails: string | undefined = undefined;
    let hasBookingSystem = false;
    let bookingDetails: string | undefined = undefined;

    if (leadData.websiteUrl) {
      try {
        const crawl = await crawlWebsite(leadData.websiteUrl);
        if (crawl.reachable) {
          // Combine Google Places phone + all phones on the website
          if (crawl.extractedPhones && crawl.extractedPhones.length > 0) {
            allPhones = Array.from(new Set([...allPhones, ...crawl.extractedPhones]));
          }

          // Detect WhatsApp
          if (crawl.whatsappPhone) {
            detectedWhatsapp = crawl.whatsappPhone;
          } else if (crawl.whatsappPhones && crawl.whatsappPhones.length > 0) {
            detectedWhatsapp = crawl.whatsappPhones.join(", ");
          } else {
            // Check if any extracted mobile number is a candidate
            const mobileMatches = allPhones.filter(isMobileOrWhatsappCandidate);
            if (mobileMatches.length > 0 && (crawl.html?.toLowerCase().includes("whatsapp") || crawl.html?.includes("wa.me"))) {
              detectedWhatsapp = mobileMatches.join(", ");
            }
          }

          if (crawl.extractedEmails && crawl.extractedEmails.length > 0) {
            discoveredEmails = crawl.extractedEmails;
          }

          hasChatbot = crawl.hasChatbot ?? false;
          chatbotDetails = crawl.chatbotDetails;
          hasBookingSystem = crawl.hasBookingSystem ?? false;
          bookingDetails = crawl.bookingDetails;
        }
      } catch (err) {
        logger.debug("Quick crawl during discovery skipped or timed out", { url: leadData.websiteUrl, err });
      }
    }

    // 3. Initial preliminary score calculation
    let initialScore = 20; // Base discovery score
    if (!leadData.websiteUrl) {
      initialScore += 30; // +30 for no website
    } else {
      initialScore += 10;
    }

    const primaryPhone = allPhones[0] || leadData.phone;
    const primaryEmail = discoveredEmails[0];

    // 4. Create Business record with all discovered phones & WhatsApp
    const business = await prisma.business.create({
      data: {
        workspaceId: workspace.id,
        source: "google_places",
        sourcePlaceId: leadData.sourcePlaceId,
        name: leadData.name,
        category: leadData.category,
        websiteUrl: leadData.websiteUrl,
        phone: primaryPhone,
        phoneNumbers: allPhones.length > 0 ? JSON.stringify(allPhones) : null,
        whatsappPhone: detectedWhatsapp || null,
        email: primaryEmail || null,
        emails: discoveredEmails.length > 0 ? JSON.stringify(discoveredEmails) : null,
        hasChatbot,
        chatbotDetails,
        hasBookingSystem,
        bookingDetails,
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
