"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, CheckCircle, Send, Loader2, Sparkles, Edit3 } from "lucide-react";
import { toast } from "sonner";

interface ExistingDraftProps {
  id: string;
  subject: string;
  body: string;
  status: string;
}

interface OutreachEditorProps {
  businessId: string;
  existingDraft?: ExistingDraftProps | null;
}

export function OutreachEditor({ businessId, existingDraft }: OutreachEditorProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [sending, setSending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [subject, setSubject] = useState(existingDraft?.subject || "");
  const [body, setBody] = useState(existingDraft?.body || "");
  const [recipientEmail, setRecipientEmail] = useState("");

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await fetch(`/api/leads/${businessId}/generate-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone: "consultative" }),
      });

      const resData = await response.json();
      if (!response.ok || resData.error) {
        throw new Error(resData.error?.message || "Draft generation failed.");
      }

      setSubject(resData.data.subject);
      setBody(resData.data.body);
      setIsEditing(false);
      toast.success("Generated evidence-backed email draft!");

      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate draft.");
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!existingDraft) return;
    setApproving(true);
    try {
      const response = await fetch(`/api/outreach/${existingDraft.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });

      const resData = await response.json();
      if (!response.ok || resData.error) {
        throw new Error(resData.error?.message || "Approval failed.");
      }

      setIsEditing(false);
      toast.success("Outreach email approved!");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve email.");
    } finally {
      setApproving(false);
    }
  };

  const handleSend = async () => {
    if (!existingDraft) return;
    setSending(true);
    try {
      // Approve first if editing
      if (isEditing || existingDraft.status === "DRAFT") {
        await fetch(`/api/outreach/${existingDraft.id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, body }),
        });
      }

      const response = await fetch(`/api/outreach/${existingDraft.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail: recipientEmail || undefined }),
      });

      const resData = await response.json();
      if (!response.ok || resData.error) {
        throw new Error(resData.error?.message || "Email dispatch failed.");
      }

      toast.success("Outreach email sent successfully!");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  if (!existingDraft && !subject) {
    return (
      <Card className="bg-slate-900/50 border-slate-800 p-8 text-center text-slate-400 space-y-4">
        <div className="p-3 bg-slate-800/80 text-indigo-400 rounded-full inline-block">
          <Mail className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-white">No Email Draft Available</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Generate an evidence-grounded outreach email based on verified website audit violations.
        </p>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Drafting Email...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Generate Personalized Draft</span>
            </>
          )}
        </Button>
      </Card>
    );
  }

  const status = existingDraft?.status || "DRAFT";

  return (
    <Card className="bg-slate-900/60 border-slate-800 space-y-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800/80">
        <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
          <Mail className="h-4 w-4 text-indigo-400" />
          <span>Outreach Email Draft</span>
        </CardTitle>
        <div className="flex items-center gap-2">
          {status === "SENT" ? (
            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              SENT
            </Badge>
          ) : status === "APPROVED" ? (
            <Badge className="bg-sky-500/20 text-sky-300 border border-sky-500/30">
              APPROVED
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-950/20">
              DRAFT (Awaiting Approval)
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        {/* Recipient Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Recipient Email Address (Optional Override)
          </label>
          <Input
            placeholder="client@example.com (Leave blank to use default lead contact)"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className="bg-slate-950 border-slate-800 text-slate-100 text-sm"
            disabled={status === "SENT"}
          />
        </div>

        {/* Subject */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Subject Line
          </label>
          {isEditing ? (
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="bg-slate-950 border-slate-800 text-slate-100 text-sm"
            />
          ) : (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-medium">
              {subject}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Email Body Copy
          </label>
          {isEditing ? (
            <textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-sm font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
            />
          ) : (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
              {body}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleGenerate}
            disabled={generating || sending}
            className="text-slate-400 hover:text-slate-200 gap-1.5"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            <span>Regenerate Draft</span>
          </Button>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                disabled={sending}
                className="border-slate-800 text-slate-300 gap-1.5"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleApprove}
                disabled={approving || sending}
                className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40 gap-1.5"
              >
                {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                <span>Save & Approve</span>
              </Button>
            )}

            {status !== "SENT" && (
              <Button
                onClick={handleSend}
                disabled={sending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Approve & Send</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
