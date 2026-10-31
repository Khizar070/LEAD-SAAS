import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ExternalLink,
  MapPin,
  Phone,
  Star,
  Globe,
  Sparkles,
  FileSearch,
  Mail,
  AlertTriangle,
  Zap,
  MessageSquare,
  Bot,
  CalendarCheck,
  CalendarX,
  Share2,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { AIAnalysisButton } from "@/features/ai/components/ai-analysis-button";
import { OutreachEditor } from "@/features/outreach/components/outreach-editor";
import { LeadDetailHeader } from "@/features/leads/components/lead-detail-header";

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0;

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params;

  const lead = await prisma.business.findUnique({
    where: { id },
    include: {
      websites: {
        include: {
          audits: {
            orderBy: { createdAt: "desc" },
            include: {
              issues: true,
              evidence: true,
            },
          },
        },
      },
      opportunityAnalyses: {
        orderBy: { createdAt: "desc" },
        include: {
          opportunities: true,
        },
      },
      outreachMessages: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!lead) {
    notFound();
  }

  const website = lead.websites[0];
  const audit = website?.audits[0];
  const analysis = lead.opportunityAnalyses[0];
  const emailDraft = lead.outreachMessages[0];

  type AuditIssueItem = NonNullable<typeof audit>["issues"][number];
  type OpportunityItem = NonNullable<typeof analysis>["opportunities"][number];
  type AuditEvidenceItem = NonNullable<typeof audit>["evidence"][number];

  // Parse JSON enriched attributes
  let parsedSocials: Array<{ type: string; url: string }> = [];
  if (lead.socialLinks) {
    try {
      parsedSocials = JSON.parse(lead.socialLinks);
    } catch {
      parsedSocials = [];
    }
  }

  let parsedPhones: string[] = [];
  if (lead.phoneNumbers) {
    try {
      parsedPhones = JSON.parse(lead.phoneNumbers);
    } catch {
      parsedPhones = lead.phone ? [lead.phone] : [];
    }
  } else if (lead.phone) {
    parsedPhones = [lead.phone];
  }

  let parsedEmails: string[] = [];
  if (lead.emails) {
    try {
      parsedEmails = JSON.parse(lead.emails);
    } catch {
      parsedEmails = lead.email ? [lead.email] : [];
    }
  } else if (lead.email) {
    parsedEmails = [lead.email];
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Navigation & Header Controls */}
      <LeadDetailHeader lead={lead} hasAudit={!!audit} />

      {/* Business Overview Header Card */}
      <Card className="bg-slate-900/70 border-slate-800">
        <CardContent className="p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">{lead.name}</h2>
                <Badge variant="outline" className="border-slate-700 bg-slate-950 text-indigo-400 font-semibold">
                  Score: {lead.score ?? 0} / 100
                </Badge>
                {lead.emailCount > 0 ? (
                  <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Contacted ({lead.emailCount} emails)</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-400 border-slate-800 text-xs">
                    Not Contacted Yet
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                {lead.category && (
                  <span className="bg-slate-800 px-2.5 py-1 rounded-md text-slate-300 font-medium">
                    {lead.category}
                  </span>
                )}
                {lead.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" />
                    {lead.address}
                  </span>
                )}
                {lead.rating && (
                  <span className="flex items-center gap-1 text-amber-400 font-medium">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {lead.rating} ({lead.reviewCount || 0} reviews)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {lead.websiteUrl ? (
                <a
                  href={lead.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600/20 rounded-lg text-sm font-medium transition-colors"
                >
                  <Globe className="h-4 w-4" />
                  <span>Visit Website</span>
                  <ExternalLink className="h-3.5 w-3.5 ml-1" />
                </a>
              ) : (
                <div className="text-xs text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20 font-medium">
                  No Website Found
                </div>
              )}
            </div>
          </div>

          {/* Contact Details & Channels Strip */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* WhatsApp direct action buttons */}
              {lead.whatsappPhone?.split(",").map((s) => s.trim()).filter(Boolean).map((waNum, idx) => (
                <a
                  key={waNum + idx}
                  href={`https://wa.me/${waNum.replace(/[^\d]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-semibold transition-all shadow-sm shadow-emerald-500/10"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                  <span>WhatsApp: {waNum}</span>
                  <ExternalLink className="h-3 w-3 ml-0.5 opacity-70" />
                </a>
              ))}

              {/* Primary Phone */}
              {parsedPhones.map((ph, idx) => (
                <a
                  key={ph + idx}
                  href={`tel:${ph}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-indigo-300 rounded-lg text-xs font-medium transition-colors"
                >
                  <Phone className="h-3.5 w-3.5 text-indigo-400" />
                  <span>{ph}</span>
                </a>
              ))}

              {/* Extracted Emails */}
              {parsedEmails.map((em, idx) => (
                <a
                  key={em + idx}
                  href={`mailto:${em}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-950/30 border border-sky-800/40 hover:border-sky-700 text-sky-300 rounded-lg text-xs font-medium transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 text-sky-400" />
                  <span>{em}</span>
                </a>
              ))}

              {parsedPhones.length === 0 && !lead.whatsappPhone && parsedEmails.length === 0 && (
                <span className="text-xs text-slate-500">No contact channels extracted yet. Run website audit to discover emails & numbers.</span>
              )}
            </div>

            {/* Social Media Links */}
            {parsedSocials.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Share2 className="h-3 w-3" />
                  <span>Socials:</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {parsedSocials.map((soc) => (
                    <a
                      key={soc.type}
                      href={soc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-md text-slate-300 hover:text-white capitalize text-[11px] font-medium transition-colors inline-flex items-center gap-1"
                    >
                      <span>{soc.type}</span>
                      <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI & Digital Maturity Capability Banner */}
          <div className="pt-3 border-t border-slate-800/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {/* AI Chatbot Status */}
            <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-[11px] text-slate-400 font-semibold uppercase flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5 text-indigo-400" />
                  <span>AI Chatbot / Support</span>
                </div>
                <div className="text-xs font-medium text-slate-200">
                  {lead.hasChatbot ? (lead.chatbotDetails || "Detected") : "Missing 24/7 AI Bot"}
                </div>
              </div>
              {lead.hasChatbot ? (
                <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px]">Active</Badge>
              ) : (
                <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px]">High Pitch Value</Badge>
              )}
            </div>

            {/* Booking System Status */}
            <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-[11px] text-slate-400 font-semibold uppercase flex items-center gap-1.5">
                  <CalendarCheck className="h-3.5 w-3.5 text-sky-400" />
                  <span>Online Booking System</span>
                </div>
                <div className="text-xs font-medium text-slate-200">
                  {lead.hasBookingSystem ? (lead.bookingDetails || "Detected") : "No Online Booking Tool"}
                </div>
              </div>
              {lead.hasBookingSystem ? (
                <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px]">Active</Badge>
              ) : (
                <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px]">High Pitch Value</Badge>
              )}
            </div>

            {/* Outreach History Status */}
            <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-[11px] text-slate-400 font-semibold uppercase flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Outreach Sent History</span>
                </div>
                <div className="text-xs font-medium text-slate-200">
                  {lead.lastContactedAt ? `Last: ${new Date(lead.lastContactedAt).toLocaleDateString()}` : "Never contacted"}
                </div>
              </div>
              <Badge variant="outline" className="border-slate-700 bg-slate-900 text-slate-300 text-[10px]">
                {lead.emailCount} Dispatched
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Layout */}
      <Tabs defaultValue="audit" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800 p-1">
          <TabsTrigger value="audit" className="gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <FileSearch className="h-4 w-4" />
            <span>Audit Findings</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <Sparkles className="h-4 w-4" />
            <span>AI Opportunity Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="outreach" className="gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <Mail className="h-4 w-4" />
            <span>Outreach Email</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Audit Findings */}
        <TabsContent value="audit" className="space-y-6">
          {!audit ? (
            <Card className="bg-slate-900/50 border-slate-800 p-8 text-center text-slate-400">
              No website audit has been performed for this lead yet. Click "Run Website Audit" above to analyze speed, responsiveness, and SEO.
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Category Scores */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { title: "Performance", score: audit.performanceScore },
                  { title: "SEO", score: audit.seoScore },
                  { title: "Mobile", score: audit.mobileScore },
                  { title: "Technical", score: audit.technicalScore },
                  { title: "Accessibility", score: audit.accessibilityScore },
                  { title: "UX", score: audit.uxScore },
                ].map((item) => (
                  <div key={item.title} className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center">
                    <div className="text-xs text-slate-400 mb-1">{item.title}</div>
                    <div className="text-xl font-bold text-slate-100">{item.score ?? "N/A"}</div>
                  </div>
                ))}
              </div>

              {/* Evidence Metrics Card */}
              {audit.evidence && audit.evidence.length > 0 && (
                <Card className="bg-slate-900/60 border-slate-800">
                  <CardHeader className="py-3">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Speed & Performance Evidence</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4 pt-0">
                    <div className="flex flex-wrap gap-4 text-xs text-slate-300">
                      {audit.evidence.map((ev: AuditEvidenceItem) => (
                        <div key={ev.id} className="bg-slate-950 px-3 py-1.5 border border-slate-800 rounded-md">
                          <span className="text-slate-500 mr-1.5">{ev.key}:</span>
                          <span className="font-semibold text-slate-200">{ev.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Severe Issues List */}
              <Card className="bg-slate-900/60 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span>Identified Audit Violations ({audit.issues.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {audit.issues.length === 0 ? (
                    <div className="text-xs text-slate-500">No major issues identified.</div>
                  ) : (
                    audit.issues.map((issue: AuditIssueItem) => (
                      <div key={issue.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-slate-200">{issue.title}</span>
                          <Badge variant="outline" className="text-[10px] uppercase border-amber-500/30 text-amber-400">
                            {issue.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400">{issue.evidence}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: AI Opportunities */}
        <TabsContent value="ai" className="space-y-6">
          {!analysis ? (
            <Card className="bg-slate-900/50 border-slate-800 p-8 text-center text-slate-400 space-y-4">
              <p>No AI opportunity analysis generated for this lead yet.</p>
              {audit ? (
                <AIAnalysisButton auditId={audit.id} />
              ) : (
                <p className="text-xs text-slate-500">Run a website audit first to enable AI opportunity analysis.</p>
              )}
            </Card>
          ) : (
            <Card className="bg-slate-900/60 border-slate-800">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-white">Summary Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-300 leading-relaxed">{analysis.summary}</p>
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Recommended Opportunities ({analysis.opportunities.length})
                  </h4>
                  {analysis.opportunities.map((opp: OpportunityItem) => (
                    <div key={opp.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-white">{opp.title}</span>
                        <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {opp.recommendedService}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400">{opp.businessImplication}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 3: Outreach Email */}
        <TabsContent value="outreach" className="space-y-6">
          <OutreachEditor
            businessId={lead.id}
            existingDraft={emailDraft}
            availableIssues={
              audit?.issues.map((i) => ({
                id: i.id,
                ruleCode: i.ruleCode,
                title: i.title,
                severity: i.severity,
              })) || []
            }
            businessEmail={lead.email}
            emailCount={lead.emailCount ?? 0}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
