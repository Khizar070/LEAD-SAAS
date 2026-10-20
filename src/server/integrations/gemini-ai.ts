import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export interface AIOpportunityItem {
  category: string;
  title: string;
  evidence: string;
  businessImplication: string;
  recommendedService: string;
  priority: "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW";
}

export interface AIOpportunityAnalysisOutput {
  summary: string;
  opportunityLevel: "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
  opportunities: AIOpportunityItem[];
}

export class GeminiAIProvider {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    }
  }

  async analyzeOpportunities(payload: {
    businessName: string;
    category?: string;
    websiteUrl?: string;
    scores: Record<string, number | null>;
    issues: Array<{ category: string; ruleCode: string; severity: string; title: string; evidence: string }>;
  }): Promise<AIOpportunityAnalysisOutput> {
    if (!this.genAI) {
      logger.info("GEMINI_API_KEY is not configured. Returning deterministic evidence fallback.", {
        businessName: payload.businessName,
      });
      return this.getFallbackAnalysis(payload);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const systemPrompt = `You are an expert digital presence and automation consultant analyzing website audit findings for local business web development & AI automation opportunities.

STRICT RULES:
1. Base your recommendations ONLY on the provided deterministic audit issues and evidence.
2. DO NOT invent facts, contact names, fabricated metrics, or unsupported business complaints.
3. Keep recommendations practical and tied directly to services offered: "Website Development", "Performance Optimization", "SEO Optimization", "AI Receptionist / Chatbot", or "AI Workflow Automation".

Return a valid JSON object matching this exact TypeScript structure:
{
  "summary": "Concise 2-sentence summary of the business's digital presence weaknesses and primary service opportunity.",
  "opportunityLevel": "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW",
  "confidence": 0.95,
  "opportunities": [
    {
      "category": "string (e.g. Website Redesign, SEO, Mobile UX, AI Bot)",
      "title": "Short title describing the problem and solution",
      "evidence": "Exact evidence from the audit findings",
      "businessImplication": "Real-world business risk (e.g., losing mobile visitors, missed leads)",
      "recommendedService": "Website Development | Performance Optimization | SEO Optimization | AI Receptionist / Chatbot | AI Workflow Automation",
      "priority": "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW"
    }
  ]
}`;

      const userContent = `Business Name: ${payload.businessName}
Category: ${payload.category || "General Local Business"}
Website URL: ${payload.websiteUrl || "No Website"}
Audit Scores: ${JSON.stringify(payload.scores)}
Verified Audit Violations: ${JSON.stringify(payload.issues)}`;

      const result = await model.generateContent([
        { text: systemPrompt },
        { text: userContent },
      ]);

      const responseText = result.response.text();
      const parsed = JSON.parse(responseText) as AIOpportunityAnalysisOutput;

      return {
        summary: parsed.summary || "Digital presence analysis completed.",
        opportunityLevel: parsed.opportunityLevel || "MEDIUM",
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.85,
        opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : [],
      };
    } catch (error) {
      logger.error("Failed to run Gemini AI analysis, falling back to deterministic analyzer", { error });
      return this.getFallbackAnalysis(payload);
    }
  }

  private getFallbackAnalysis(payload: {
    businessName: string;
    websiteUrl?: string;
    scores: Record<string, number | null>;
    issues: Array<{ category: string; severity: string; title: string; evidence: string }>;
  }): AIOpportunityAnalysisOutput {
    const opportunities: AIOpportunityItem[] = [];

    if (!payload.websiteUrl) {
      opportunities.push({
        category: "Website Development",
        title: "New Modern Website Development Needed",
        evidence: "No official website URL found for business listing",
        businessImplication: "Potential customers searching online cannot locate or contact the business",
        recommendedService: "Website Development",
        priority: "VERY_HIGH",
      });
    }

    payload.issues.forEach((issue) => {
      if (issue.category === "Mobile") {
        opportunities.push({
          category: "Mobile UX",
          title: "Mobile Responsive Layout & Viewport Fix",
          evidence: issue.evidence,
          businessImplication: "Smartphone visitors experience broken layout and leave without converting",
          recommendedService: "Website Development",
          priority: "HIGH",
        });
      } else if (issue.category === "SEO") {
        opportunities.push({
          category: "Local SEO",
          title: "Search Engine Optimization & Meta Tag Structure",
          evidence: issue.evidence,
          businessImplication: "Lower search engine rankings compared to local competitors",
          recommendedService: "SEO Optimization",
          priority: "MEDIUM",
        });
      } else if (issue.category === "UX") {
        opportunities.push({
          category: "AI Automation",
          title: "24/7 AI Receptionist & Click-to-Call Conversion",
          evidence: issue.evidence,
          businessImplication: "Missed after-hours inquiries and slow response time to prospective clients",
          recommendedService: "AI Receptionist / Chatbot",
          priority: "HIGH",
        });
      }
    });

    const level = opportunities.some((o) => o.priority === "VERY_HIGH" || o.priority === "HIGH")
      ? "HIGH"
      : "MEDIUM";

    return {
      summary: `${payload.businessName} has ${opportunities.length} primary digital optimization opportunities based on verified audit findings.`,
      opportunityLevel: level,
      confidence: 0.9,
      opportunities,
    };
  }
}
