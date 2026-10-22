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
import { Send, CheckCircle, Clock, Mail, ExternalLink, ArrowRight } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/async-state";

export const revalidate = 0;

export default async function CampaignsPage() {
  const workspace = await getOrCreateDefaultWorkspace();

  // Query all outreach messages across businesses in current workspace
  const messages = await prisma.outreachMessage.findMany({
    where: {
      business: {
        workspaceId: workspace.id,
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      business: true,
    },
  });

  type MessageItem = (typeof messages)[number];

  const totalMessages = messages.length;
  const sentCount = messages.filter((m: MessageItem) => m.status === "SENT").length;
  const approvedCount = messages.filter((m: MessageItem) => m.status === "APPROVED").length;
  const draftCount = messages.filter((m: MessageItem) => m.status === "DRAFT").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Send className="h-6 w-6 text-indigo-400" />
            <span>Outreach & Campaigns</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Human-in-the-loop cold email lifecycle, approval queue, and real email dispatch logs.
          </p>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Drafts
            </CardTitle>
            <Mail className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalMessages}</div>
            <p className="text-xs text-slate-400 mt-1">AI-generated email copies</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Awaiting Approval
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">{draftCount}</div>
            <p className="text-xs text-slate-400 mt-1">Drafts pending review</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Approved
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-sky-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-400">{approvedCount}</div>
            <p className="text-xs text-slate-400 mt-1">Ready for dispatch</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Dispatched Emails
            </CardTitle>
            <Send className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{sentCount}</div>
            <p className="text-xs text-slate-400 mt-1">Sent via Resend / SendGrid</p>
          </CardContent>
        </Card>
      </div>

      {/* Messages Table */}
      {messages.length === 0 ? (
        <EmptyState
          title="No outreach messages generated yet"
          description="Go to any lead detail page after running an AI analysis and click 'Generate Personalized Draft' to start your outreach campaign."
        />
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <Table>
            <TableHeader className="bg-slate-900/80">
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400 text-xs font-semibold uppercase">Lead Business</TableHead>
                <TableHead className="text-slate-400 text-xs font-semibold uppercase">Recipient</TableHead>
                <TableHead className="text-slate-400 text-xs font-semibold uppercase">Subject & Follow-Up Stage</TableHead>
                <TableHead className="text-slate-400 text-xs font-semibold uppercase">Status</TableHead>
                <TableHead className="text-slate-400 text-xs font-semibold uppercase">Sent At</TableHead>
                <TableHead className="text-right text-slate-400 text-xs font-semibold uppercase">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-800/60">
              {messages.map((message: MessageItem) => {
                return (
                  <TableRow key={message.id} className="border-slate-800/60 hover:bg-slate-900/80 transition-colors">
                    <TableCell className="font-medium text-slate-100">
                      <div>{message.business.name}</div>
                      <div className="text-xs text-slate-400">{message.business.category || "General"}</div>
                    </TableCell>

                    <TableCell className="text-xs text-slate-300">
                      {message.recipientEmail || message.business.email ? (
                        <span className="text-sky-300 font-medium">{message.recipientEmail || message.business.email}</span>
                      ) : (
                        <span className="text-slate-500">Contact Email</span>
                      )}
                    </TableCell>

                    <TableCell className="text-slate-200 text-sm max-w-xs font-medium space-y-1">
                      <div className="truncate">{message.subject}</div>
                      <div className="flex items-center gap-1.5">
                        {message.followUpStage && message.followUpStage > 0 ? (
                          <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px]">
                            Follow-Up #{message.followUpStage}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 border-slate-800 text-[10px]">
                            Initial Outreach
                          </Badge>
                        )}
                        {message.templateId && (
                          <span className="text-[10px] text-indigo-400 bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-900/40">
                            {message.templateId}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      {message.status === "SENT" ? (
                        <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          SENT
                        </Badge>
                      ) : message.status === "APPROVED" ? (
                        <Badge className="bg-sky-500/15 text-sky-300 border border-sky-500/30">
                          APPROVED
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-950/20">
                          DRAFT
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-slate-400">
                      {message.sentAt ? new Date(message.sentAt).toLocaleString() : "Not sent yet"}
                    </TableCell>

                    <TableCell className="text-right">
                      <Link
                        href={`/leads/${message.businessId}`}
                        className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                      >
                        <span>Open Editor</span>
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
