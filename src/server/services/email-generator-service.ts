import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@/lib/env";
import { EMAIL_TEMPLATES } from "./email-templates";

export interface GenerateEmailParams {
  businessId: string;
  templateId?: string;
  selectedIssues?: string[];
  followUpStage?: number; // 0 = initial, 1 = follow-up #1, 2 = follow-up #2
  recipientEmail?: string;
  tone?: "professional" | "consultative" | "direct";
  serviceFocus?: string;
  userNotes?: string;
}

export interface GeneratedEmailResult {
  outreachMessageId: string;
  subject: string;
  body: string;
  recipientEmail?: string;
  templateId?: string;
  followUpStage: number;
}

export async function generateOutreachEmail(params: GenerateEmailParams): Promise<GeneratedEmailResult> {
  const {
    businessId,
    templateId = "ai-automation",
    selectedIssues,
    followUpStage = 0,
    recipientEmail,
    tone = "consultative",
    serviceFocus,
    userNotes,
  } = params;

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      websites: {
        include: {
          audits: {
            orderBy: { createdAt: "desc" },
            include: { issues: true },
          },
        },
      },
      opportunityAnalyses: {
        orderBy: { createdAt: "desc" },
        include: { opportunities: true },
      },
      outreachMessages: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!business) {
    throw new Error(`Business with ID ${businessId} not found`);
  }

  const latestAudit = business.websites[0]?.audits[0];
  const latestAnalysis = business.opportunityAnalyses[0];
  const topOpportunity = latestAnalysis?.opportunities[0];

  const template = EMAIL_TEMPLATES.find((t) => t.id === templateId) || EMAIL_TEMPLATES[0];

  // Pick target service
  const targetService = serviceFocus || template.recommendedService || topOpportunity?.recommendedService || "Website & AI Automation";

  // Filter issues based on user's selected checkboxes!
  let issuesList = "";
  if (selectedIssues && selectedIssues.length > 0) {
    issuesList = selectedIssues.join("; ");
  } else if (latestAudit && latestAudit.issues.length > 0) {
    issuesList = latestAudit.issues.slice(0, 3).map((i) => i.title).join("; ");
  } else {
    issuesList = "Mobile responsive optimization & modern AI customer interaction needed.";
  }

  // Follow-up context
  const previousMessage = business.outreachMessages[0];
  const isFollowUp = followUpStage > 0;

  let defaultSubject = isFollowUp
    ? `Following up on ${business.name}'s website`
    : `Quick question regarding ${business.name}'s website`;

  let body = "";

  if (env.GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" },
      });

      const prompt = `You are a high-performing B2B outreach consultant specializing in Web Development & AI Automation.
Write a cold outreach email to ${business.name}.

SELECTED TEMPLATE: "${template.name}"
TEMPLATE PITCH ANGLE: ${template.pitchAngle}
FOLLOW-UP STAGE: ${
        followUpStage === 0
          ? "Initial Cold Email"
          : followUpStage === 1
          ? "First Follow-Up (friendly reminder referring gently to previous outreach, acknowledging they are busy)"
          : "Second / Final Follow-Up (brief, closing the loop, zero pressure)"
      }

STRICT COMPLIANCE RULES:
1. Length: Keep it under 130 words. Extremely concise, clean and punchy.
2. Grounded & Selected Issues ONLY: Mention ONLY these specific observed findings: [${issuesList}].
   Do NOT invent contact names, fake statistics, or claims that weren't selected.
3. Call To Action (CTA): Exactly ONE low-friction question (e.g., "Would you be open to a 2-minute video walkthrough?", "Are you taking on new clients this month?").
4. Tone: ${tone || template.defaultTone}.
${isFollowUp && previousMessage ? `Note: Previous subject was "${previousMessage.subject}". Acknowledge prior note briefly.` : ""}

Return strictly in JSON format:
{
  "subject": "Clear, curiosity-inducing subject line mentioning business name or observation",
  "body": "Complete email body"
}`;

      const userMessage = `Business Name: ${business.name}
City/Location: ${business.city || "your area"}
Target Service: ${targetService}
Selected Issues to Highlight: ${issuesList}
User Additional Notes: ${userNotes || "None"}`;

      const result = await model.generateContent([{ text: prompt }, { text: userMessage }]);
      const parsed = JSON.parse(result.response.text());

      defaultSubject = parsed.subject || defaultSubject;
      body = parsed.body || "";
    } catch (error) {
      logger.error("Gemini email drafting failed, using structured template fallback", { error });
    }
  }

  if (!body) {
    // Structured Fallback
    if (isFollowUp) {
      body = `Hi ${business.name} Team,

I wanted to quickly follow up on my note last week regarding ${business.name}'s website.

As a quick recap, we noticed a couple of items that might be impacting your customer conversions:
- ${issuesList}

We specialize in ${targetService} to help businesses convert visitors into booked consultations.

Would you be open to a brief 5-minute feedback review this week?

Best regards,

Digital Growth Team`;
    } else {
      body = `Hi ${business.name} Team,

I came across ${business.name} while reviewing local businesses in ${business.city || "your area"}. While taking a look at your website, I noticed a couple of specific items that might be costing you potential customers:

- ${issuesList}

We specialize in ${targetService} to help businesses capture more leads and turn online visitors into booked clients.

Would you be open to a brief 5-minute review where I can share the exact findings with your team?

Best regards,

Digital Growth Team`;
    }
  }

  // Create outreach message record with DRAFT status
  const targetRecipient = recipientEmail || business.email || undefined;

  const message = await prisma.outreachMessage.create({
    data: {
      businessId: business.id,
      subject: defaultSubject,
      body,
      status: "DRAFT",
      templateId,
      followUpStage,
      selectedIssuesJson: selectedIssues ? JSON.stringify(selectedIssues) : undefined,
      recipientEmail: targetRecipient,
    },
  });

  logger.info("Generated outreach email draft", {
    businessId: business.id,
    messageId: message.id,
    templateId,
    followUpStage,
  });

  return {
    outreachMessageId: message.id,
    subject: message.subject,
    body: message.body,
    recipientEmail: targetRecipient,
    templateId,
    followUpStage,
  };
}
