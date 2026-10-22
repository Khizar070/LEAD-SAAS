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
import { Search, ExternalLink, Filter, Phone, MapPin } from "lucide-react";
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

                return (
                  <TableRow key={lead.id} className="border-slate-800/60 hover:bg-slate-900/80 transition-colors">
                    <TableCell className="font-medium text-slate-100">
                      <Link href={`/leads/${lead.id}`} className="hover:text-indigo-400 transition-colors font-semibold">
                        {lead.name}
                      </Link>
                      <div className="text-xs text-slate-400">{lead.category || "General"}</div>
                    </TableCell>

                    <TableCell className="text-slate-300 text-xs space-y-1">
                      {/* WhatsApp Direct Badge */}
                      {lead.whatsappPhone && (
                        <div>
                          <a
                            href={`https://wa.me/${lead.whatsappPhone.replace(/[^\d]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 hover:bg-emerald-500/20"
                          >
                            <span>WhatsApp: {lead.whatsappPhone}</span>
                          </a>
                        </div>
                      )}

                      {/* Primary Phone */}
                      {lead.phone && (
                        <div>
                          <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 text-slate-300 hover:text-indigo-400">
                            <Phone className="h-3 w-3 text-slate-500" />
                            <span>{lead.phone}</span>
                          </a>
                        </div>
                      )}

                      {/* Extracted Email */}
                      {lead.email && (
                        <div>
                          <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1 text-sky-400 hover:underline text-[11px] truncate max-w-[150px]">
                            <span>{lead.email}</span>
                          </a>
                        </div>
                      )}

                      {!lead.whatsappPhone && !lead.phone && !lead.email && (
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
