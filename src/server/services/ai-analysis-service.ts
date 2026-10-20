import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { GeminiAIProvider } from "@/server/integrations/gemini-ai";
import { OpportunityLevelType } from "@/server/services/audit-engine-service";

export interface AIAnalysisResult {
  analysisId: string;
  summary: string;
  opportunityLevel: OpportunityLevelType;
  opportunityCount: number;
}

export async function runAIOpportunityAnalysis(auditId: string): Promise<AIAnalysisResult> {
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    include: {
      issues: true,
      evidence: true,
      website: {
        include: {
          business: true,
        },
      },
    },
  });

  if (!audit) {
    throw new Error(`Audit with ID ${auditId} not found`);
  }

  const business = audit.website.business;
  logger.info("Running AI Opportunity Analysis", { auditId, businessId: business.id });

  const aiProvider = new GeminiAIProvider();

  const aiOutput = await aiProvider.analyzeOpportunities({
    businessName: business.name,
    category: business.category || undefined,
    websiteUrl: business.websiteUrl || undefined,
    scores: {
      performance: audit.performanceScore,
      seo: audit.seoScore,
      mobile: audit.mobileScore,
      technical: audit.technicalScore,
      accessibility: audit.accessibilityScore,
      ux: audit.uxScore,
      overall: audit.overallScore,
    },
    issues: audit.issues.map((i: (typeof audit.issues)[number]) => ({
      category: i.category,
      ruleCode: i.ruleCode,
      severity: i.severity,
      title: i.title,
      evidence: i.evidence || "",
    })),
  });

  // Create OpportunityAnalysis record
  const analysis = await prisma.opportunityAnalysis.create({
    data: {
      businessId: business.id,
      auditId: audit.id,
      summary: aiOutput.summary,
      opportunityLevel: aiOutput.opportunityLevel,
      confidence: aiOutput.confidence,
    },
  });

  // Create linked Opportunity records
  if (aiOutput.opportunities.length > 0) {
    await prisma.opportunity.createMany({
      data: aiOutput.opportunities.map((opp) => ({
        analysisId: analysis.id,
        category: opp.category,
        title: opp.title,
        evidence: opp.evidence,
        businessImplication: opp.businessImplication,
        recommendedService: opp.recommendedService,
        priority: opp.priority,
      })),
    });
  }

  // Update Business record opportunity level
  await prisma.business.update({
    where: { id: business.id },
    data: {
      opportunityLevel: aiOutput.opportunityLevel,
    },
  });

  logger.info("Completed AI Opportunity Analysis", {
    analysisId: analysis.id,
    opportunityLevel: aiOutput.opportunityLevel,
    opportunitiesGenerated: aiOutput.opportunities.length,
  });

  return {
    analysisId: analysis.id,
    summary: aiOutput.summary,
    opportunityLevel: aiOutput.opportunityLevel,
    opportunityCount: aiOutput.opportunities.length,
  };
}
