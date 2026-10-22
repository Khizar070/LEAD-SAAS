"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mail,
  CheckCircle,
  Send,
  Loader2,
  Sparkles,
  Edit3,
  CheckSquare,
  Square,
  SlidersHorizontal,
  Bot,
  Calendar,
  Layers,
  ArrowRight,
  Clock,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { EMAIL_TEMPLATES } from "@/server/services/email-templates";

interface IssueItem {
  id: string;
  ruleCode: string;
  title: string;
  severity: string;
}

interface ExistingDraftProps {
  id: string;
  subject: string;
  body: string;
  status: string;
  templateId?: string | null;
  followUpStage?: number | null;
  recipientEmail?: string | null;
  selectedIssuesJson?: string | null;
}

interface OutreachEditorProps {
  businessId: string;
  existingDraft?: ExistingDraftProps | null;
  availableIssues?: IssueItem[];
  businessEmail?: string | null;
  emailCount?: number;
}

export function OutreachEditor({
  businessId,
  existingDraft,
  availableIssues = [],
  businessEmail,
  emailCount = 0,
}: OutreachEditorProps) {
  const router = useRouter();

  // Generator Configuration State
  const [templateId, setTemplateId] = useState<string>(
    existingDraft?.templateId || "ai-automation"
  );
  const [followUpStage, setFollowUpStage] = useState<number>(
    existingDraft?.followUpStage ?? (emailCount > 0 ? 1 : 0)
  );
  const [recipientEmail, setRecipientEmail] = useState<string>(
    existingDraft?.recipientEmail || businessEmail || ""
  );

  // Issues checklist state
  const defaultIssues = availableIssues.length > 0
    ? availableIssues.slice(0, 3).map((i) => i.title)
    : [
        "No 24/7 AI Chatbot for lead capture",
        "No automated online booking system",
        "Mobile layout & responsiveness optimization needed",
      ];

  const [selectedIssues, setSelectedIssues] = useState<string[]>(() => {
    if (existingDraft?.selectedIssuesJson) {
      try {
        return JSON.parse(existingDraft.selectedIssuesJson);
      } catch {
        return defaultIssues;
      }
    }
    return defaultIssues;
  });

  const [showConfig, setShowConfig] = useState(!existingDraft);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [sending, setSending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [subject, setSubject] = useState(existingDraft?.subject || "");
  const [body, setBody] = useState(existingDraft?.body || "");

  // Toggle problem checkbox
  const toggleIssue = (title: string) => {
    setSelectedIssues((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const handleGenerate = async () => {
    if (selectedIssues.length === 0) {
      toast.error("Please check at least one problem to include in the pitch.");
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch(`/api/leads/${businessId}/generate-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          followUpStage,
          selectedIssues,
          recipientEmail: recipientEmail.trim() || undefined,
        }),
      });

      const resData = await response.json();
      if (!response.ok || resData.error) {
        throw new Error(resData.error?.message || "Draft generation failed.");
      }

      setSubject(resData.data.subject);
      setBody(resData.data.body);
      setIsEditing(false);
      setShowConfig(false);
      toast.success("Generated evidence-backed personalized email!");
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
        body: JSON.stringify({ recipientEmail: recipientEmail.trim() || undefined }),
      });

      const resData = await response.json();
      if (!response.ok || resData.error) {
        throw new Error(resData.error?.message || "Email dispatch failed.");
      }

      toast.success(`Outreach email dispatched to ${recipientEmail || "client contact"}!`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  const currentTemplate = EMAIL_TEMPLATES.find((t) => t.id === templateId) || EMAIL_TEMPLATES[0];
  const status = existingDraft?.status || "DRAFT";

  // List of issues to display for checkboxes
  const displayIssues = availableIssues.length > 0
    ? availableIssues.map((i) => i.title)
    : [
        "No 24/7 AI Chatbot for lead capture",
        "No automated online booking system",
        "Slow server load latency & PageSpeed performance",
        "Missing responsive mobile viewport tag",
        "Missing meta descriptions & SEO titles",
      ];

  return (
    <div className="space-y-6">
      {/* Configuration & Customization Panel */}
      <Card className="bg-slate-900/70 border-slate-800 shadow-xl overflow-hidden">
        <CardHeader className="bg-slate-900/90 py-4 px-6 border-b border-slate-800/80 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="h-5 w-5 text-indigo-400" />
            <div>
              <CardTitle className="text-sm font-bold text-white">
                Personalized Email Generator & Template Engine
              </CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose template, select specific problems to highlight, and set follow-up stage.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-indigo-500/30 text-indigo-300 bg-indigo-950/20 text-xs gap-1">
              <History className="h-3 w-3" />
              <span>Sent: {emailCount} emails</span>
            </Badge>

            {existingDraft && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfig(!showConfig)}
                className="text-xs text-slate-300 hover:text-white"
              >
                {showConfig ? "Hide Options" : "Change Options"}
              </Button>
            )}
          </div>
        </CardHeader>

        {showConfig && (
          <CardContent className="p-6 space-y-6 bg-slate-950/40">
            {/* Step 1: Template Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-400" />
                <span>1. Choose Outreach Template</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {EMAIL_TEMPLATES.map((tpl) => {
                  const isSelected = templateId === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setTemplateId(tpl.id)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? "bg-indigo-950/50 border-indigo-500/80 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/40"
                          : "bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700"
                      }`}
                    >
                      <div className="font-semibold text-xs text-slate-100 flex items-center justify-between">
                        <span>{tpl.name}</span>
                        {isSelected && <span className="h-2 w-2 rounded-full bg-indigo-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug line-clamp-2">
                        {tpl.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Follow-Up Stage & Recipient */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span>2. Outreach Stage / Follow-Up</span>
                </label>
                <select
                  value={followUpStage}
                  onChange={(e) => setFollowUpStage(parseInt(e.target.value, 10))}
                  className="w-full h-9 rounded-md bg-slate-900 border border-slate-800 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={0}>📩 Initial Outreach Email (Stage 0)</option>
                  <option value={1}>🔄 Follow-Up #1 (Gentle Reminder - Stage 1)</option>
                  <option value={2}>⌛ Follow-Up #2 (Final Check-In - Stage 2)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Recipient Email Address</span>
                </label>
                <Input
                  placeholder="contact@business.com (Auto-extracted or custom)"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-slate-200 text-xs h-9 focus-visible:ring-indigo-500"
                />
              </div>
            </div>

            {/* Step 3: Problem Checklist (Checkmark Selection) */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5 text-indigo-400" />
                  <span>3. Select Problems to Highlight in Email ({selectedIssues.length} selected)</span>
                </label>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedIssues(displayIssues)}
                    className="text-indigo-400 hover:text-indigo-300 text-[11px]"
                  >
                    Select All
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedIssues([])}
                    className="text-slate-400 hover:text-slate-300 text-[11px]"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-2 max-h-56 overflow-y-auto">
                {displayIssues.map((issueTitle) => {
                  const isChecked = selectedIssues.includes(issueTitle);
                  return (
                    <div
                      key={issueTitle}
                      onClick={() => toggleIssue(issueTitle)}
                      className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-indigo-950/40 text-slate-100 border border-indigo-500/20"
                          : "hover:bg-slate-850 text-slate-400 border border-transparent"
                      }`}
                    >
                      <button type="button" className="mt-0.5 text-indigo-400">
                        {isChecked ? (
                          <CheckSquare className="h-4 w-4 fill-indigo-600/30 text-indigo-400" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-500" />
                        )}
                      </button>
                      <span className="text-xs font-medium leading-relaxed">{issueTitle}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Generate Trigger Button */}
            <div className="pt-2 flex justify-end">
              <Button
                onClick={handleGenerate}
                disabled={generating || selectedIssues.length === 0}
                className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 font-medium"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Gemini AI Drafting with Selected Items...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Generate Personalized Email Draft</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Generated Email Draft & Dispatch View */}
      {(subject || body) && (
        <Card className="bg-slate-900/70 border-slate-800 shadow-xl space-y-4">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-indigo-400" />
              <CardTitle className="text-sm font-semibold text-white">Generated Outreach Copy</CardTitle>
              <Badge variant="outline" className="border-indigo-500/30 text-indigo-300 text-[10px]">
                {currentTemplate.name}
              </Badge>
              {followUpStage > 0 && (
                <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px]">
                  Stage {followUpStage} (Follow-Up)
                </Badge>
              )}
            </div>

            <div>
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
                  DRAFT (Ready to Review)
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-1">
            {/* Subject Line */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Subject Line
              </label>
              {isEditing ? (
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-100 text-sm font-medium"
                />
              ) : (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-medium">
                  {subject}
                </div>
              )}
            </div>

            {/* Email Body */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Email Body Copy (Personalized with {selectedIssues.length} chosen issues)
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

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowConfig(true)}
                className="text-slate-400 hover:text-slate-200 gap-1.5 text-xs"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Adjust Problems or Template</span>
              </Button>

              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    disabled={sending}
                    className="border-slate-800 text-slate-300 gap-1.5 text-xs"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit Copy</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApprove}
                    disabled={approving || sending}
                    className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40 gap-1.5 text-xs"
                  >
                    {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                    <span>Save & Approve</span>
                  </Button>
                )}

                {status !== "SENT" && (
                  <Button
                    onClick={handleSend}
                    disabled={sending}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 text-xs font-semibold px-4"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Sending to {recipientEmail || "client"}...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Approve & Send Email</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
