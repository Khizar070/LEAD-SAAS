import { getOrCreateDefaultWorkspace } from "@/server/services/workspace-service";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, FileSearch, Sparkles, Send, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/async-state";

export const revalidate = 0; // Dynamic server page

export default async function DashboardPage() {
  const workspace = await getOrCreateDefaultWorkspace();

  let totalLeads = 0;
  let auditedCount = 0;
  let highOpportunityCount = 0;
  let draftEmailsCount = 0;
  let recentLeads: Array<{ id: string; name: string; category: string | null; address: string | null; city: string | null; score: number | null }> = [];
  let dbError = false;

  try {
    const [
      totalRes,
      auditedRes,
      highOppRes,
      draftRes,
      recentRes,
    ] = await Promise.all([
      prisma.business.count({ where: { workspaceId: workspace.id } }),
      prisma.business.count({
        where: {
          workspaceId: workspace.id,
          websites: { some: { audits: { some: { status: "COMPLETED" } } } },
        },
      }),
      prisma.business.count({
        where: {
          workspaceId: workspace.id,
          opportunityLevel: { in: ["HIGH", "VERY_HIGH"] },
        },
      }),
      prisma.outreachMessage.count({
        where: { business: { workspaceId: workspace.id }, status: "DRAFT" },
      }),
      prisma.business.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    totalLeads = totalRes;
    auditedCount = auditedRes;
    highOpportunityCount = highOppRes;
    draftEmailsCount = draftRes;
    recentLeads = recentRes;
  } catch {
    dbError = true;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {dbError && (
        <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-200 text-sm space-y-1">
          <div className="font-semibold text-amber-300">⚠️ MySQL Database Not Connected</div>
          <div>
            Please ensure MySQL server is running on <code className="bg-amber-950 px-1 rounded">localhost:3306</code> and run <code className="bg-amber-950 px-1 rounded">npx prisma db push</code> to initialize database tables.
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard Overview</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time lead research metrics and automated outreach status.
          </p>
        </div>
        <Link href="/leads">
          <Button variant="outline" size="sm" className="border-slate-800 text-slate-300 hover:bg-slate-900 gap-2">
            <span>View All Leads</span>
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Leads
            </CardTitle>
            <Users className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{totalLeads}</div>
            <p className="text-xs text-slate-500 mt-1">Discovered businesses</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Audited Websites
            </CardTitle>
            <FileSearch className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{auditedCount}</div>
            <p className="text-xs text-slate-500 mt-1">Technical & SEO checked</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              High Opportunity
            </CardTitle>
            <Sparkles className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-400">{highOpportunityCount}</div>
            <p className="text-xs text-slate-500 mt-1">Prime service prospects</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Draft Emails
            </CardTitle>
            <Send className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-400">{draftEmailsCount}</div>
            <p className="text-xs text-slate-500 mt-1">Awaiting review & approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent High Priority Leads Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Discoveries</h2>
          <Link href="/leads" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
            Explore All $\rightarrow$
          </Link>
        </div>

        {recentLeads.length === 0 ? (
          <EmptyState
            title="No leads discovered yet"
            description="Start by entering a target niche and location to discover potential business opportunities."
            actionLabel="Discover Leads Now"
            onAction={undefined}
          />
        ) : (
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80">
            {recentLeads.map((lead) => (
              <div key={lead.id} className="p-4 flex items-center justify-between hover:bg-slate-900/80 transition-colors">
                <div>
                  <div className="font-medium text-slate-100 text-sm">{lead.name}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{lead.category || "General Business"}</span>
                    <span>•</span>
                    <span>{lead.city || lead.address || "Location unavailable"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="border-slate-700 bg-slate-900 text-slate-300 text-xs">
                    Score: {lead.score ?? 0}
                  </Badge>
                  <Link href={`/leads/${lead.id}`}>
                    <Button size="sm" variant="ghost" className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
