import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { crawlWebsite } from "@/server/services/crawler-service";
import { PageSpeedProvider } from "@/server/integrations/pagespeed";

export type IssueSeverityType = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
export type OpportunityLevelType = "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW";

export interface AuditEngineResult {
  auditId: string;
  websiteId: string;
  overallScore: number;
  issueCount: number;
}

export async function runWebsiteAudit(businessId: string): Promise<AuditEngineResult> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { websites: true },
  });

  if (!business) {
    throw new Error(`Business with ID ${businessId} not found`);
  }

  // Get or create website record
  let website = business.websites[0];
  if (!website) {
    if (!business.websiteUrl) {
      throw new Error(`Business ${business.name} has no website URL to audit`);
    }
    website = await prisma.website.create({
      data: {
        businessId: business.id,
        normalizedUrl: business.websiteUrl.toLowerCase().trim(),
        crawlStatus: "PENDING",
      },
    });
  }

  logger.info("Starting website audit", { businessId, websiteId: website.id, url: website.normalizedUrl });

  // 1. Crawl Website
  const crawl = await crawlWebsite(website.normalizedUrl);

  // Update website record
  await prisma.website.update({
    where: { id: website.id },
    data: {
      finalUrl: crawl.finalUrl || website.normalizedUrl,
      httpStatus: crawl.httpStatus,
      https: crawl.isHttps,
      reachable: crawl.reachable,
      crawlStatus: crawl.reachable ? "COMPLETED" : "FAILED",
      lastCrawledAt: new Date(),
    },
  });

  // 2. Performance Analysis
  const pageSpeed = new PageSpeedProvider();
  const perfMetrics = await pageSpeed.analyzePerformance(
    website.normalizedUrl,
    crawl.html,
    crawl.responseTimeMs
  );

  // Initialize Audit Record
  const audit = await prisma.audit.create({
    data: {
      websiteId: website.id,
      status: "RUNNING",
      startedAt: new Date(),
    },
  });

  const issues: {
    category: string;
    ruleCode: string;
    severity: IssueSeverityType;
    title: string;
    description: string;
    evidence: string;
    recommendation: string;
    source: string;
  }[] = [];

  const evidenceRecords: { type: string; key: string; value: string; source: string }[] = [];

  // Category Scores
  let seoScore = 100;
  let mobileScore = 100;
  let technicalScore = crawl.isHttps ? 100 : 70;
  let accessibilityScore = 100;
  let uxScore = 100;

  // If business is missing phone number but crawler extracted one from website, auto-enrich!
  if (!business.phone && crawl.extractedPhones && crawl.extractedPhones.length > 0) {
    const discoveredPhone = crawl.extractedPhones[0];
    await prisma.business.update({
      where: { id: business.id },
      data: { phone: discoveredPhone },
    });
    business.phone = discoveredPhone;
  }

  if (!crawl.reachable || !crawl.html) {
    // Unreachable Website Audit
    issues.push({
      category: "Technical",
      ruleCode: "TECH_WEBSITE_UNREACHABLE",
      severity: "CRITICAL",
      title: "Website Unreachable",
      description: "The website server did not respond to HTTP requests.",
      evidence: crawl.errorMessage || `HTTP Status: ${crawl.httpStatus || "No response"}`,
      recommendation: "Verify web hosting, domain DNS settings, and server availability.",
      source: "HTTP Crawl",
    });

    seoScore = 0;
    mobileScore = 0;
    technicalScore = 0;
    accessibilityScore = 0;
    uxScore = 0;
  } else {
    const html = crawl.html;

    // Save Evidence
    if (crawl.responseTimeMs) {
      evidenceRecords.push({
        type: "Performance",
        key: "response_time_ms",
        value: `${crawl.responseTimeMs} ms`,
        source: "Crawler HTTP Request",
      });
    }
    if (crawl.htmlSizeBytes) {
      evidenceRecords.push({
        type: "Performance",
        key: "html_size_kb",
        value: `${(crawl.htmlSizeBytes / 1024).toFixed(1)} KB`,
        source: "DOM Payload",
      });
    }

    // --- Performance & Speed Checks ---
    if (crawl.responseTimeMs && crawl.responseTimeMs > 2500) {
      issues.push({
        category: "Performance",
        ruleCode: "PERF_SLOW_RESPONSE",
        severity: "HIGH",
        title: "Slow Server Response Time",
        description: "Website took over 2.5 seconds to deliver initial HTML.",
        evidence: `Initial HTTP latency is ${crawl.responseTimeMs} ms`,
        recommendation: "Upgrade web hosting, implement server Caching, or use a Content Delivery Network (CDN).",
        source: "HTTP Latency",
      });
    }

    // --- Technical Checks ---
    if (!crawl.isHttps) {
      issues.push({
        category: "Technical",
        ruleCode: "TECH_HTTPS_MISSING",
        severity: "HIGH",
        title: "Missing HTTPS Encryption",
        description: "Website is served over HTTP instead of secure HTTPS.",
        evidence: `URL protocol is ${new URL(crawl.finalUrl || website.normalizedUrl).protocol}`,
        recommendation: "Install an SSL/TLS certificate to secure user traffic and improve search ranking.",
        source: "HTTP Headers",
      });
      technicalScore -= 30;
    }

    if (!html.includes('rel="icon"') && !html.includes('rel="shortcut icon"')) {
      issues.push({
        category: "Technical",
        ruleCode: "TECH_FAVICON_MISSING",
        severity: "LOW",
        title: "Missing Favicon",
        description: "No favicon icon link detected in document head.",
        evidence: "<link rel='icon'> tag not found",
        recommendation: "Add a favicon.ico or PNG icon to enhance browser tab branding.",
        source: "HTML Head",
      });
      technicalScore -= 10;
    }

    // --- SEO Checks ---
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;

    if (!title) {
      issues.push({
        category: "SEO",
        ruleCode: "SEO_TITLE_MISSING",
        severity: "CRITICAL",
        title: "Missing Page Title Tag",
        description: "The HTML document has no <title> element.",
        evidence: "<title> tag missing in head",
        recommendation: "Add a descriptive <title> tag containing primary business keywords and city.",
        source: "HTML Head",
      });
      seoScore -= 40;
    } else {
      evidenceRecords.push({ type: "SEO", key: "page_title", value: title, source: "HTML Head" });
      if (title.length < 10) {
        issues.push({
          category: "SEO",
          ruleCode: "SEO_TITLE_SHORT",
          severity: "LOW",
          title: "Page Title Too Short",
          description: "Title tag is shorter than 10 characters.",
          evidence: `Title length is ${title.length} characters ("${title}")`,
          recommendation: "Expand title tag to 30-60 characters incorporating local SEO keywords.",
          source: "HTML Head",
        });
        seoScore -= 10;
      }
    }

    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    if (!metaDescMatch) {
      issues.push({
        category: "SEO",
        ruleCode: "SEO_META_DESC_MISSING",
        severity: "HIGH",
        title: "Missing Meta Description",
        description: "No search engine meta description tag found.",
        evidence: '<meta name="description"> tag missing',
        recommendation: "Add a compelling 120-160 character meta description summarizing services.",
        source: "HTML Head",
      });
      seoScore -= 30;
    }

    const h1Matches = html.match(/<h1[^>]*>[\s\S]*?<\/h1>/gi) || [];
    if (h1Matches.length === 0) {
      issues.push({
        category: "SEO",
        ruleCode: "SEO_H1_MISSING",
        severity: "HIGH",
        title: "Missing H1 Heading",
        description: "No top-level <h1> heading element found on homepage.",
        evidence: "0 <h1> tags found in DOM",
        recommendation: "Include a single, clear <h1> heading describing primary service offerings.",
        source: "DOM Structure",
      });
      seoScore -= 20;
    } else if (h1Matches.length > 1) {
      issues.push({
        category: "SEO",
        ruleCode: "SEO_H1_MULTIPLE",
        severity: "MEDIUM",
        title: "Multiple H1 Headings",
        description: "Page contains multiple <h1> heading tags.",
        evidence: `${h1Matches.length} <h1> tags found`,
        recommendation: "Restrict <h1> to one per page and use <h2> for sub-sections.",
        source: "DOM Structure",
      });
      seoScore -= 10;
    }

    // --- Mobile & Responsiveness Checks ---
    if (!crawl.hasMobileViewport) {
      issues.push({
        category: "Mobile",
        ruleCode: "MOBILE_VIEWPORT_MISSING",
        severity: "CRITICAL",
        title: "Missing Responsive Viewport Tag",
        description: "Page lacks meta viewport tag, causing poor display and zooming issues on smartphones.",
        evidence: '<meta name="viewport"> tag missing',
        recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> tag.',
        source: "HTML Head",
      });
      mobileScore -= 45;
    }

    if (crawl.hasFixedWidthContainer) {
      issues.push({
        category: "Mobile",
        ruleCode: "MOBILE_FIXED_WIDTH",
        severity: "HIGH",
        title: "Fixed Desktop Width Container",
        description: "Layout uses rigid fixed pixel widths which overflow smartphone screens.",
        evidence: "Inline CSS container width > 1000px without responsive max-width",
        recommendation: "Convert fixed pixel widths to fluid percentages (100% / max-width).",
        source: "CSS Styling",
      });
      mobileScore -= 25;
    }

    if (!crawl.hasResponsiveDesign) {
      issues.push({
        category: "Mobile",
        ruleCode: "MOBILE_NOT_RESPONSIVE",
        severity: "HIGH",
        title: "Lacks Mobile Responsive CSS Rules",
        description: "No media queries or modern responsive CSS grid/flexbox detected.",
        evidence: "Absence of CSS @media queries or responsive framework utilities",
        recommendation: "Implement a modern responsive mobile-first stylesheet.",
        source: "CSS Analysis",
      });
      mobileScore -= 20;
    }

    // --- Accessibility Checks ---
    const imgMatches = html.match(/<img[^>]*>/gi) || [];
    const imgsWithoutAlt = imgMatches.filter((img) => !img.includes("alt="));

    if (imgsWithoutAlt.length > 0) {
      issues.push({
        category: "Accessibility",
        ruleCode: "A11Y_ALT_MISSING",
        severity: "MEDIUM",
        title: "Images Missing Alt Text",
        description: "Image elements lack descriptive alt attributes for screen readers.",
        evidence: `${imgsWithoutAlt.length} out of ${imgMatches.length} <img> tags missing alt attribute`,
        recommendation: "Add descriptive alt attributes to all informational images.",
        source: "DOM Images",
      });
      accessibilityScore -= Math.min(40, imgsWithoutAlt.length * 10);
    }

    // --- UX / Conversion Checks ---
    const hasPhoneTel = /href=["']tel:/i.test(html);
    const hasContactPath = /contact|book|appointment|quote|pricing|schedule/i.test(html);

    if (!hasPhoneTel && business.phone) {
      issues.push({
        category: "UX",
        ruleCode: "UX_PHONE_NOT_CLICKABLE",
        severity: "MEDIUM",
        title: "Phone Number Not Click-to-Call",
        description: "Phone number is listed in text but lacks a click-to-call tel: link.",
        evidence: `Phone ${business.phone} not wrapped in <a href="tel:...">`,
        recommendation: 'Wrap phone numbers in click-to-call <a href="tel:..."> links for mobile visitors.',
        source: "HTML DOM",
      });
      uxScore -= 20;
    }

    if (!hasContactPath) {
      issues.push({
        category: "UX",
        ruleCode: "UX_CTA_MISSING",
        severity: "HIGH",
        title: "Weak Call-To-Action / Booking Path",
        description: "No clear online booking, appointment, or contact path detected.",
        evidence: "Primary CTA keywords (book, contact, quote, schedule) absent in navigation",
        recommendation: "Implement a prominent booking widget or contact CTA button above the fold.",
        source: "Navigation DOM",
      });
      uxScore -= 30;
    }

    // --- AI Automation & Chatbot Checks ---
    if (!crawl.hasChatbot) {
      issues.push({
        category: "AI Automation",
        ruleCode: "AI_CHATBOT_MISSING",
        severity: "HIGH",
        title: "No 24/7 AI Lead Capture Chatbot",
        description: "The website does not have an automated AI chat assistant to answer client inquiries or capture leads after hours.",
        evidence: "No interactive chat widget or script detected",
        recommendation: "Deploy a custom 24/7 AI chatbot trained on business FAQs to capture contact details and convert visitors into booked appointments.",
        source: "HTML DOM",
      });
      uxScore -= 15;
    } else {
      evidenceRecords.push({
        type: "AI & Tech",
        key: "ai_chatbot",
        value: `Detected (${crawl.chatbotDetails || "Active"})`,
        source: "HTML DOM",
      });
    }

    // --- Booking System Checks ---
    if (!crawl.hasBookingSystem) {
      issues.push({
        category: "Conversion",
        ruleCode: "BOOKING_SYSTEM_MISSING",
        severity: "HIGH",
        title: "No Automated Booking / Scheduling System",
        description: "Visitors cannot self-schedule appointments or consultations online, creating friction and leading to dropped bookings.",
        evidence: "No direct scheduling widget (Calendly, Acuity, Cal.com) found",
        recommendation: "Implement an automated self-scheduling calendar widget to let prospective customers book consultations 24/7 directly.",
        source: "HTML DOM",
      });
      uxScore -= 20;
    } else {
      evidenceRecords.push({
        type: "AI & Tech",
        key: "booking_system",
        value: `Detected (${crawl.bookingDetails || "Active"})`,
        source: "HTML DOM",
      });
    }

    if (crawl.hasVoiceAgent) {
      evidenceRecords.push({
        type: "AI & Tech",
        key: "voice_agent",
        value: `Detected (${crawl.voiceAgentDetails || "Active"})`,
        source: "HTML DOM",
      });
    }
  }

  // Calculate Overall Weighted Score (0-100)
  const performanceScore = perfMetrics.score;
  seoScore = Math.max(0, seoScore);
  mobileScore = Math.max(0, mobileScore);
  technicalScore = Math.max(0, technicalScore);
  accessibilityScore = Math.max(0, accessibilityScore);
  uxScore = Math.max(0, uxScore);

  const overallScore = Math.round(
    performanceScore * 0.2 +
      seoScore * 0.2 +
      mobileScore * 0.2 +
      technicalScore * 0.15 +
      accessibilityScore * 0.1 +
      uxScore * 0.15
  );

  // Update Audit Record in MySQL
  const updatedAudit = await prisma.audit.update({
    where: { id: audit.id },
    data: {
      status: "COMPLETED",
      performanceScore,
      seoScore,
      mobileScore,
      technicalScore,
      accessibilityScore,
      uxScore,
      overallScore,
      completedAt: new Date(),
    },
  });

  // Save Issues
  if (issues.length > 0) {
    await prisma.auditIssue.createMany({
      data: issues.map((issue) => ({
        auditId: updatedAudit.id,
        ...issue,
      })),
    });
  }

  // Save Evidence Records
  if (evidenceRecords.length > 0) {
    await prisma.auditEvidence.createMany({
      data: evidenceRecords.map((ev) => ({
        auditId: updatedAudit.id,
        ...ev,
      })),
    });
  }

  // Calculate Lead Score & Opportunity Tier
  let leadScore = 20;
  if (!crawl.reachable) {
    leadScore += 50; // High score for unreachable site
  } else {
    if (mobileScore < 60) leadScore += 25;
    if (performanceScore < 50) leadScore += 20;
    if (seoScore < 60) leadScore += 15;
    if (uxScore < 60) leadScore += 20;
  }

  const cappedScore = Math.min(100, leadScore);
  const opportunityLevel: OpportunityLevelType =
    cappedScore >= 70 ? "VERY_HIGH" : cappedScore >= 50 ? "HIGH" : cappedScore >= 30 ? "MEDIUM" : "LOW";

  // Update Business Record with enriched details
  const emailDiscovered = crawl.extractedEmails && crawl.extractedEmails.length > 0 ? crawl.extractedEmails[0] : undefined;
  const emailsJson = crawl.extractedEmails && crawl.extractedEmails.length > 0 ? JSON.stringify(crawl.extractedEmails) : undefined;
  const phoneDiscovered = crawl.extractedPhones && crawl.extractedPhones.length > 0 ? crawl.extractedPhones[0] : undefined;
  const phonesJson = crawl.extractedPhones && crawl.extractedPhones.length > 0 ? JSON.stringify(crawl.extractedPhones) : undefined;
  const socialsJson = crawl.extractedSocials && crawl.extractedSocials.length > 0 ? JSON.stringify(crawl.extractedSocials) : undefined;

  await prisma.business.update({
    where: { id: business.id },
    data: {
      score: cappedScore,
      opportunityLevel,
      ...(business.phone ? {} : (phoneDiscovered ? { phone: phoneDiscovered } : {})),
      ...(phonesJson ? { phoneNumbers: phonesJson } : {}),
      ...(business.email ? {} : (emailDiscovered ? { email: emailDiscovered } : {})),
      ...(emailsJson ? { emails: emailsJson } : {}),
      ...(crawl.whatsappPhone ? { whatsappPhone: crawl.whatsappPhone } : {}),
      ...(socialsJson ? { socialLinks: socialsJson } : {}),
      hasChatbot: crawl.hasChatbot ?? false,
      chatbotDetails: crawl.chatbotDetails,
      hasBookingSystem: crawl.hasBookingSystem ?? false,
      bookingDetails: crawl.bookingDetails,
      hasVoiceAgent: crawl.hasVoiceAgent ?? false,
      voiceAgentDetails: crawl.voiceAgentDetails,
    },
  });

  logger.info("Completed website audit", {
    businessId,
    auditId: updatedAudit.id,
    overallScore,
    issuesFound: issues.length,
    leadScore: cappedScore,
  });

  return {
    auditId: updatedAudit.id,
    websiteId: website.id,
    overallScore,
    issueCount: issues.length,
  };
}
