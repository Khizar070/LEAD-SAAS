import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@/lib/env";

export interface GenerateEmailParams {
  businessId: string;
  tone?: "professional" | "consultative" | "direct";
  serviceFocus?: string;
  userNotes?: string;
}

export interface GeneratedEmailResult {
  outreachMessageId: string;
  subject: string;
  body: string;
}

export async function generateOutreachEmail(params: GenerateEmailParams): Promise<GeneratedEmailResult> {
  const { businessId, tone = "consultative", serviceFocus, userNotes } = params;

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
    },
  });

  if (!business) {
    throw new Error(`Business with ID ${businessId} not found`);
  }

  const latestAudit = business.websites[0]?.audits[0];
  const latestAnalysis = business.opportunityAnalyses[0];
  const topOpportunity = latestAnalysis?.opportunities[0];

  const targetService = serviceFocus || topOpportunity?.recommendedService || "Website Development";
  const issuesList = latestAudit?.issues.map((i: { title: string }) => i.title).join("; ") || "Mobile responsive & website performance optimization needed.";

  let subject = `Quick question regarding ${business.name}'s website`;
  let body = "";

  if (env.GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" },
      });

      const prompt = `You are a professional B2B outreach consultant. Write a cold outreach email to ${business.name}.

STRICT COMPLIANCE RULES:
1. Concise: 120-160 words total.
2. Grounded: Mention ONLY verified findings (${issuesList}). DO NOT invent contact names, fake statistics, or unverified claims.
3. Call To Action: Include exactly ONE clear, low-friction CTA (e.g., a brief 10-minute call or feedback review).
4. Tone: ${tone}.

Return JSON:
{
  "subject": "Compelling, non-spammy subject line mentioning business name or observation",
  "body": "Complete email body"
}`;

      const userMessage = `Business Name: ${business.name}
City/Location: ${business.city || "your area"}
Target Service: ${targetService}
Observed Audit Issues: ${issuesList}
User Notes: ${userNotes || "None"}`;

      const result = await model.generateContent([{ text: prompt }, { text: userMessage }]);
      const parsed = JSON.parse(result.response.text());

      subject = parsed.subject || subject;
      body = parsed.body || "";
    } catch (error) {
      logger.error("Gemini email drafting failed, using structured evidence template", { error });
    }
  }

  if (!body) {
    // Structured Evidence Fallback Template
    body = `Hi ${business.name} Team,

I recently came across ${business.name} while reviewing businesses in ${business.city || "the area"}. While taking a look at your website, I noticed a couple of specific technical items that might be impacting your mobile visitors:

- ${issuesList}

We specialize in ${targetService} to help local service businesses convert more online visitors into direct calls and bookings.

Would you be open to a brief 10-minute review where I can share the specific audit findings with your team?

Best regards,

Digital Optimization Lead`;
  }

  // Create outreach message record with DRAFT status
  const message = await prisma.outreachMessage.create({
    data: {
      businessId: business.id,
      subject,
      body,
      status: "DRAFT",
    },
  });

  logger.info("Generated outreach email draft", { businessId: business.id, messageId: message.id });

  return {
    outreachMessageId: message.id,
    subject: message.subject,
    body: message.body,
  };
}
