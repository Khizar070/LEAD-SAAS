import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GooglePlacesProvider } from "@/server/integrations/google-places";
import { crawlWebsite, CrawlResult } from "@/server/services/crawler-service";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const lead = await prisma.business.findUnique({
      where: { id },
    });

    if (!lead) {
      return NextResponse.json({ error: { message: "Lead not found" } }, { status: 404 });
    }

    const provider = new GooglePlacesProvider();
    const apiKey = env.GOOGLE_MAPS_API_KEY;

    let discoveredWebsite: string | undefined = lead.websiteUrl || undefined;
    let discoveredPhone: string | undefined = lead.phone || undefined;

    // 1. Try Google Place Details if sourcePlaceId exists & starts with place_ or real ID
    if (apiKey && lead.sourcePlaceId && !lead.sourcePlaceId.startsWith("mock_")) {
      const details = await provider.fetchPlaceDetails(lead.sourcePlaceId, apiKey);
      if (details) {
        if (!discoveredWebsite && details.website) discoveredWebsite = details.website;
        if (!discoveredPhone && details.phone) discoveredPhone = details.phone;
      }
    }

    // 2. If website still missing, run Web Search Fallback
    if (!discoveredWebsite) {
      discoveredWebsite = await provider.searchWebsiteFallback(
        lead.name,
        lead.city || lead.address || ""
      );
    }

    if (!discoveredWebsite && !discoveredPhone) {
      return NextResponse.json({
        data: lead,
        message: "No additional website or phone details could be automatically found for this business.",
      });
    }

    let cleanWebsite = discoveredWebsite?.trim();
    if (cleanWebsite && !cleanWebsite.startsWith("http://") && !cleanWebsite.startsWith("https://")) {
      cleanWebsite = `https://${cleanWebsite}`;
    }

    // 3. Deep website crawl to extract WhatsApp, emails, socials, chatbot, and booking tools
    let crawlData: CrawlResult | null = null;
    if (cleanWebsite) {
      try {
        crawlData = await crawlWebsite(cleanWebsite);
      } catch {
        // ignore crawl error
      }
    }

    const emailDiscovered = crawlData?.extractedEmails && crawlData.extractedEmails.length > 0 ? crawlData.extractedEmails[0] : undefined;
    const emailsJson = crawlData?.extractedEmails && crawlData.extractedEmails.length > 0 ? JSON.stringify(crawlData.extractedEmails) : undefined;
    const phoneDiscovered = crawlData?.extractedPhones && crawlData.extractedPhones.length > 0 ? crawlData.extractedPhones[0] : discoveredPhone;
    const phonesJson = crawlData?.extractedPhones && crawlData.extractedPhones.length > 0 ? JSON.stringify(crawlData.extractedPhones) : undefined;
    const socialsJson = crawlData?.extractedSocials && crawlData.extractedSocials.length > 0 ? JSON.stringify(crawlData.extractedSocials) : undefined;

    const updated = await prisma.business.update({
      where: { id },
      data: {
        websiteUrl: cleanWebsite || lead.websiteUrl,
        phone: phoneDiscovered || lead.phone,
        ...(phonesJson ? { phoneNumbers: phonesJson } : {}),
        ...(emailDiscovered ? { email: emailDiscovered } : {}),
        ...(emailsJson ? { emails: emailsJson } : {}),
        ...(crawlData?.whatsappPhone ? { whatsappPhone: crawlData.whatsappPhone } : {}),
        ...(socialsJson ? { socialLinks: socialsJson } : {}),
        ...(crawlData?.hasChatbot !== undefined ? { hasChatbot: crawlData.hasChatbot, chatbotDetails: crawlData.chatbotDetails } : {}),
        ...(crawlData?.hasBookingSystem !== undefined ? { hasBookingSystem: crawlData.hasBookingSystem, bookingDetails: crawlData.bookingDetails } : {}),
      },
    });

    if (cleanWebsite) {
      const normalizedUrl = cleanWebsite.toLowerCase().trim();
      const existingWeb = await prisma.website.findFirst({ where: { businessId: id } });
      if (!existingWeb) {
        await prisma.website.create({
          data: {
            businessId: id,
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

    logger.info("Successfully enriched lead details", {
      leadId: id,
      websiteUrl: cleanWebsite,
      phone: discoveredPhone,
    });

    return NextResponse.json({
      data: updated,
      message: "Lead details enriched successfully!",
    });
  } catch (error) {
    logger.error("Error enriching lead details", { error });
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : "Failed to enrich lead" } },
      { status: 500 }
    );
  }
}
