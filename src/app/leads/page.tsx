import { getOrCreateDefaultWorkspace } from "@/server/services/workspace-service";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ExternalLink, Filter, Phone, MapPin, MessageSquare, Mail } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/async-state";
import { LeadsHeader } from "@/features/leads/components/leads-header";
import { LeadRowActions } from "@/features/leads/components/lead-row-actions";

export const revalidate = 0;

export default async function LeadsPage() {
  const workspace = await getOrCreateDefaultWorkspace();

  const leads = await prisma.business.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    include: {
      websites: {
        include: {
          audits: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
      opportunityAnalyses: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          opportunities: {
            take: 1,
          },
        },
      },
    },
  });

  type LeadItem = (typeof leads)[number];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Discovery Action */}
      <LeadsHeader />

      {/* Filter & Search Bar */}
      <div className="flex items-center gap-3 bg-slate-900/60 p-3 border border-slate-800 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search leads by name, niche, location, or domain..."
            className="pl-9 bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-500 text-sm focus-visible:ring-indigo-500"
          />
        </div>
        <Button variant="outline" size="sm" className="border-slate-800 text-slate-300 gap-2 hover:bg-slate-800">
          <Filter className="h-4 w-4 text-slate-400" />
          <span>Filters</span>
        </Button>
      </div>

      {/* Leads Table */}
      {leads.length === 0 ? (
        <EmptyState
          title="No leads stored in workspace"
          description="Click 'New Lead Discovery' to search official business directories and populate your leads pipeline."
        />
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <Table>
            <TableHeader className="bg-slate-900/80">
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400 text-xs font-semibold uppercase">Business</TableHead>
                <TableHead className="text-slate-400 text-xs font-semibold uppercase">WhatsApp</TableHead>
                <TableHead className="text-slate-400 text-xs font-semibold uppercase">Contact & Channels</TableHead>
                <TableHead className="text-slate-400 text-xs font-semibold uppercase">Location</TableHead>
                <TableHead className="text-slate-400 text-xs font-semibold uppercase">Website</TableHead>
                <TableHead className="text-slate-400 text-xs font-semibold uppercase">AI & Tech</TableHead>
                <TableHead className="text-slate-400 text-xs font-semibold uppercase">Score</TableHead>
                <TableHead className="text-slate-400 text-xs font-semibold uppercase">Outreach Sent</TableHead>
                <TableHead className="text-right text-slate-400 text-xs font-semibold uppercase">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-800/60">
              {leads.map((lead: LeadItem) => {
                const latestAnalysis = lead.opportunityAnalyses[0];
                const topOpportunity = latestAnalysis?.opportunities[0];

                // Parse WhatsApp numbers
                const whatsappList: string[] = lead.whatsappPhone
                  ? lead.whatsappPhone.split(",").map((s) => s.trim()).filter(Boolean)
                  : [];

                // Parse All Phone Numbers (Google Places + Crawled from website)
                let allPhones: string[] = [];
                if (lead.phoneNumbers) {
                  try {
                    const parsed = JSON.parse(lead.phoneNumbers);
                    if (Array.isArray(parsed)) allPhones = parsed;
                  } catch {
                    allPhones = lead.phone ? [lead.phone] : [];
                  }
                } else if (lead.phone) {
                  allPhones = [lead.phone];
                }

                // Parse All Emails
                let allEmails: string[] = [];
                if (lead.emails) {
                  try {
                    const parsed = JSON.parse(lead.emails);
                    if (Array.isArray(parsed)) allEmails = parsed;
                  } catch {
                    allEmails = lead.email ? [lead.email] : [];
                  }
                } else if (lead.email) {
                  allEmails = [lead.email];
                }

                return (
                  <TableRow key={lead.id} className="border-slate-800/60 hover:bg-slate-900/80 transition-colors">
                    <TableCell className="font-medium text-slate-100">
                      <Link href={`/leads/${lead.id}`} className="hover:text-indigo-400 transition-colors font-semibold">
                        {lead.name}
                      </Link>
                      <div className="text-xs text-slate-400">{lead.category || "General"}</div>
                    </TableCell>

                    {/* Dedicated WhatsApp Column */}
                    <TableCell className="text-xs">
                      {whatsappList.length > 0 ? (
                        <div className="flex flex-col gap-1.5 items-start">
                          {whatsappList.map((waNum, idx) => {
                            const waCleanDigits = waNum.replace(/[^\d]/g, "");
                            return (
                              <a
                                key={waNum + idx}
                                href={`https://wa.me/${waCleanDigits}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open WhatsApp Chat directly"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all shadow-xs group"
                              >
                                <MessageSquare className="h-3 w-3 text-emerald-400 group-hover:scale-110 transition-transform" />
                                <span>{waNum}</span>
                                <ExternalLink className="h-2.5 w-2.5 opacity-60 ml-0.5" />
                              </a>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800">
                          Not Detected
                        </span>
                      )}
                    </TableCell>

                    {/* Contact & All Discovered Channels */}
                    <TableCell className="text-slate-300 text-xs space-y-1">
                      {/* All Phone Numbers */}
                      {allPhones.length > 0 ? (
                        <div className="space-y-0.5">
                          {allPhones.map((ph, idx) => (
                            <div key={ph + idx}>
                              <a
                                href={`tel:${ph}`}
                                className="inline-flex items-center gap-1 text-slate-300 hover:text-indigo-400 text-xs"
                                title={idx === 0 ? "Primary phone" : "Extracted from business website"}
                              >
                                <Phone className="h-3 w-3 text-slate-500" />
                                <span>{ph}</span>
                                {idx > 0 && (
                                  <span className="text-[9px] text-indigo-300 bg-indigo-950/60 border border-indigo-800/40 px-1 py-0.2 rounded">
                                    Web
                                  </span>
                                )}
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {/* Extracted Emails */}
                      {allEmails.length > 0 ? (
                        <div className="space-y-0.5 pt-0.5">
                          {allEmails.map((em, idx) => (
                            <div key={em + idx}>
                              <a
                                href={`mailto:${em}`}
                                className="inline-flex items-center gap-1 text-sky-400 hover:underline text-[11px] truncate max-w-[150px]"
                              >
                                <Mail className="h-3 w-3 text-sky-500 shrink-0" />
                                <span className="truncate">{em}</span>
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {allPhones.length === 0 && allEmails.length === 0 && (
                        <span className="text-slate-500 text-xs">No channels yet</span>
                      )}
                    </TableCell>

                    <TableCell className="text-slate-300 text-sm">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-500" />
                        <span>{lead.city || lead.address || "N/A"}</span>
                      </span>
                    </TableCell>

                    <TableCell className="text-sm">
                      {lead.websiteUrl ? (
                        <a
                          href={lead.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:underline inline-flex items-center gap-1"
                        >
                          <span className="truncate max-w-[130px]">{lead.websiteUrl.replace(/^https?:\/\//, '')}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10 text-[10px]">
                          No Website
                        </Badge>
                      )}
                    </TableCell>

                    {/* AI & Tech Capabilities */}
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5">
                        {lead.hasChatbot ? (
                          <span title={`AI Chatbot Active: ${lead.chatbotDetails || 'Yes'}`} className="p-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-medium">
                            Bot ✓
                          </span>
                        ) : (
                          <span title="No AI Chatbot detected (High Pitch Value)" className="p-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
                            No Bot
                          </span>
                        )}

                        {lead.hasBookingSystem ? (
                          <span title={`Booking System: ${lead.bookingDetails || 'Yes'}`} className="p-1 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[10px] font-medium">
                            Book ✓
                          </span>
                        ) : (
                          <span title="No Online Booking detected" className="p-1 rounded bg-slate-800 text-slate-400 text-[10px]">
                            No Book
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="border-slate-700 bg-slate-900 text-slate-200 font-semibold">
                        {lead.score ?? 0} / 100
                      </Badge>
                    </TableCell>

                    {/* Outreach / Follow-Up Stage */}
                    <TableCell>
                      {lead.emailCount > 0 ? (
                        <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px]">
                          {lead.emailCount === 1 ? "1 Email Sent" : `${lead.emailCount} Emails (Follow-Up)`}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500 border-slate-800 text-[11px]">
                          0 Sent (New)
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <LeadRowActions leadId={lead.id} hasWebsite={!!lead.websiteUrl} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
