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
                <TableHead className="text-slate-400 text-xs font-semibold uppercase">Contact / Phone</TableHead>
                <TableHead className="text-slate-400 text-xs font-semibold uppercase">Location</TableHead>
                <TableHead className="text-slate-400 text-xs font-semibold uppercase">Website</TableHead>
                <TableHead className="text-slate-400 text-xs font-semibold uppercase">Score</TableHead>
                <TableHead className="text-slate-400 text-xs font-semibold uppercase">Opportunity</TableHead>
                <TableHead className="text-slate-400 text-xs font-semibold uppercase">Service Match</TableHead>
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
                      <div className="text-xs text-slate-400">{lead.category || "N/A"}</div>
                    </TableCell>

                    <TableCell className="text-slate-300 text-xs">
                      {lead.phone ? (
                        <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-slate-300 hover:text-indigo-400">
                          <Phone className="h-3 w-3 text-slate-500" />
                          <span>{lead.phone}</span>
                        </a>
                      ) : (
                        <span className="text-slate-500 text-xs">No Phone</span>
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
                          <span className="truncate max-w-[140px]">{lead.websiteUrl.replace(/^https?:\/\//, '')}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10 text-[10px]">
                          No Website
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="border-slate-700 bg-slate-900 text-slate-200 font-semibold">
                        {lead.score ?? 0} / 100
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {lead.opportunityLevel === "VERY_HIGH" || lead.opportunityLevel === "HIGH" ? (
                        <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          High Opportunity
                        </Badge>
                      ) : lead.opportunityLevel === "MEDIUM" ? (
                        <Badge className="bg-sky-500/15 text-sky-300 border border-sky-500/30">
                          Medium Opportunity
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400 border-slate-800">
                          Low / Unaudited
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-sm text-slate-300">
                      {topOpportunity?.recommendedService || "Pending Audit"}
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
