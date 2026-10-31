import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultWorkspace } from "@/server/services/workspace-service";
import { crawlWebsite, isMobileOrWhatsappCandidate } from "@/server/services/crawler-service";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const workspace = await getOrCreateDefaultWorkspace();
    let targetBusinessId: string | undefined;

    try {
      const body = await request.json();
      if (body && typeof body.businessId === "string") {
        targetBusinessId = body.businessId;
      }
    } catch {
      // no body passed, scan all workspace leads
    }

    const leads = await prisma.business.findMany({
      where: {
        workspaceId: workspace.id,
        ...(targetBusinessId ? { id: targetBusinessId } : {}),
      },
      take: targetBusinessId ? 1 : 25,
      orderBy: { createdAt: "desc" },
    });

    if (leads.length === 0) {
      return NextResponse.json({
        data: { message: "No leads found to scan.", verifiedCount: 0 },
      });
    }

    let verifiedCount = 0;
    let numbersUpdatedCount = 0;

    for (const lead of leads) {
      const existingPhones: string[] = [];
      if (lead.phoneNumbers) {
        try {
          const parsed = JSON.parse(lead.phoneNumbers);
          if (Array.isArray(parsed)) existingPhones.push(...parsed);
        } catch {
          // ignore
        }
      }
      if (lead.phone && !existingPhones.includes(lead.phone)) {
        existingPhones.push(lead.phone);
      }

      let allPhones = [...existingPhones];
      let crawlWhatsappPhones: string[] = [];
      let discoveredEmails: string[] = [];

      // Crawl website if available to check for WhatsApp and extra numbers
      if (lead.websiteUrl) {
        try {
          const crawl = await crawlWebsite(lead.websiteUrl);
          if (crawl.reachable) {
            if (crawl.extractedPhones && crawl.extractedPhones.length > 0) {
              allPhones = Array.from(new Set([...allPhones, ...crawl.extractedPhones]));
            }
            if (crawl.whatsappPhones && crawl.whatsappPhones.length > 0) {
              crawlWhatsappPhones.push(...crawl.whatsappPhones);
            } else if (crawl.whatsappPhone) {
              crawlWhatsappPhones.push(crawl.whatsappPhone);
            }
            if (crawl.extractedEmails && crawl.extractedEmails.length > 0) {
              discoveredEmails = crawl.extractedEmails;
            }
          }
        } catch (err) {
          logger.debug("Failed checking WhatsApp for lead website", { leadId: lead.id, err });
        }
      }

      // Strict filter for WhatsApp numbers:
      // Must be from explicit WhatsApp links or verified mobile candidates (e.g. +447... / 07...)
      let validWhatsappNumbers: string[] = [];
      if (crawlWhatsappPhones.length > 0) {
        validWhatsappNumbers.push(...crawlWhatsappPhones);
      } else {
        const mobileCandidates = allPhones.filter(isMobileOrWhatsappCandidate);
        if (mobileCandidates.length > 0) {
          validWhatsappNumbers.push(...mobileCandidates);
        }
      }

      // Deduplicate and filter out UK landlines (+441, +442, +443, +448, 01, 02, 03, 08) unless explicitly marked
      validWhatsappNumbers = Array.from(new Set(validWhatsappNumbers)).filter((num) => {
        const d = num.replace(/[^\d]/g, "");
        if (d.startsWith("441") || d.startsWith("442") || d.startsWith("443") || d.startsWith("448")) {
          return crawlWhatsappPhones.includes(num); // only keep landline if explicitly in wa.me link
        }
        if (d.startsWith("01") || d.startsWith("02") || d.startsWith("03") || d.startsWith("08")) {
          return crawlWhatsappPhones.includes(num);
        }
        return true;
      });

      const detectedWhatsapp = validWhatsappNumbers.length > 0 ? validWhatsappNumbers.join(", ") : null;

      const hasChange =
        detectedWhatsapp !== lead.whatsappPhone ||
        allPhones.length > existingPhones.length ||
        (discoveredEmails.length > 0 && !lead.email);

      if (hasChange || detectedWhatsapp) {
        const primaryPhone = lead.phone || allPhones[0];
        const primaryEmail = lead.email || discoveredEmails[0];

        await prisma.business.update({
          where: { id: lead.id },
          data: {
            ...(primaryPhone ? { phone: primaryPhone } : {}),
            phoneNumbers: allPhones.length > 0 ? JSON.stringify(allPhones) : lead.phoneNumbers,
            whatsappPhone: detectedWhatsapp || lead.whatsappPhone,
            ...(primaryEmail ? { email: primaryEmail } : {}),
            emails: discoveredEmails.length > 0 ? JSON.stringify(discoveredEmails) : lead.emails,
          },
        });

        if (detectedWhatsapp) verifiedCount++;
        numbersUpdatedCount++;
      }
    }

    return NextResponse.json({
      data: {
        message: `Scanned ${leads.length} leads. Identified WhatsApp for ${verifiedCount} businesses!`,
        verifiedCount,
        numbersUpdatedCount,
      },
    });
  } catch (error) {
    logger.error("Error in check-whatsapp route", { error });
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to scan WhatsApp numbers.",
        },
      },
      { status: 500 }
    );
  }
}
