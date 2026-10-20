import { getOrCreateDefaultWorkspace } from "@/server/services/workspace-service";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileSearch, ExternalLink, ArrowRight, ShieldCheck, Zap, Search, Smartphone } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/async-state";

export const revalidate = 0;

export default async function AuditsPage() {
  const workspace = await getOrCreateDefaultWorkspace();

  // Query all website audits in current workspace
  const audits = await prisma.audit.findMany({
    where: {
      website: {
        business: {
          workspaceId: workspace.id,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      website: {
        include: {
          business: true,
        },
      },
    },
  });

  type AuditItem = (typeof audits)[number];

  const totalAudits = audits.length;
  const completedAudits = audits.filter((a: AuditItem) => a.status === "COMPLETED").length;
  const avgOverall = completedAudits > 0
    ? Math.round(audits.reduce((acc: number, a: AuditItem) => acc + (a.overallScore || 0), 0) / completedAudits)
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FileSearch className="h-6 w-6 text-indigo-400" />
            <span>Website Audits</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Automated 6-category website health, performance, and SEO diagnostics across workspace leads.
          </p>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Audits
            </CardTitle>
            <FileSearch className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalAudits}</div>
            <p className="text-xs text-slate-400 mt-1">Diagnostics performed across leads</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Completed Audits
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{completedAudits}</div>
            <p className="text-xs text-slate-400 mt-1">Fully evaluated site reports</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Avg Overall Score
            </CardTitle>
            <Zap className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">{avgOverall} / 100</div>
            <p className="text-xs text-slate-400 mt-1">Average health rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Audits Table */}
      {audits.length === 0 ? (
        <EmptyState
          title="No website audits found"
          description="Go to the Leads section and click 'Run Website Audit' on any business to generate automated technical diagnostics."
        />
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <Table>
            <TableHeader className="bg-slate-900/80">
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400 text-xs font-semibold uppercase">Business & Domain</TableHead>
                <TableHead className="text-slate-400 text-xs font-semibold uppercase">Overall Score</TableHead>
                <TableHead className="text-slate-400 text-xs font-semibold uppercase">Performance</TableHead>
                <TableHead className="text-slate-400 text-xs font-semibold uppercase">SEO</TableHead>
                <TableHead className="text-slate-400 text-xs font-semibold uppercase">Mobile</TableHead>
                <TableHead className="text-slate-400 text-xs font-semibold uppercase">Status</TableHead>
                <TableHead className="text-right text-slate-400 text-xs font-semibold uppercase">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-800/60">
              {audits.map((audit: AuditItem) => {
                const business = audit.website.business;

                return (
                  <TableRow key={audit.id} className="border-slate-800/60 hover:bg-slate-900/80 transition-colors">
                    <TableCell className="font-medium text-slate-100">
                      <div>{business.name}</div>
                      <a
                        href={audit.website.normalizedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-400 hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        <span>{audit.website.normalizedUrl.replace(/^https?:\/\//, "")}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="border-slate-700 bg-slate-950 text-slate-100 font-semibold px-2.5 py-1">
                        {audit.overallScore ?? 0} / 100
                      </Badge>
                    </TableCell>

                    <TableCell className="text-sm">
                      <span className="inline-flex items-center gap-1 text-slate-300">
                        <Zap className="h-3.5 w-3.5 text-amber-400" />
                        <span>{audit.performanceScore ?? 0}%</span>
                      </span>
                    </TableCell>

                    <TableCell className="text-sm">
                      <span className="inline-flex items-center gap-1 text-slate-300">
                        <Search className="h-3.5 w-3.5 text-sky-400" />
                        <span>{audit.seoScore ?? 0}%</span>
                      </span>
                    </TableCell>

                    <TableCell className="text-sm">
                      <span className="inline-flex items-center gap-1 text-slate-300">
                        <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                        <span>{audit.mobileScore ?? 0}%</span>
                      </span>
                    </TableCell>

                    <TableCell>
                      {audit.status === "COMPLETED" ? (
                        <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          COMPLETED
                        </Badge>
                      ) : audit.status === "RUNNING" ? (
                        <Badge className="bg-sky-500/15 text-sky-300 border border-sky-500/30">
                          RUNNING
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400 border-slate-800">
                          {audit.status}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <Link
                        href={`/leads/${business.id}`}
                        className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                      >
                        <span>View Lead Details</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
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
