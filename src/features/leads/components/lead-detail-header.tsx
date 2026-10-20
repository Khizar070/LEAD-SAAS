"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sparkles, Edit, RefreshCw, Globe, Phone, MapPin, ExternalLink, Mail } from "lucide-react";
import { AuditButton } from "@/features/audits/components/audit-button";
import { toast } from "sonner";

interface LeadDetailHeaderProps {
  lead: {
    id: string;
    name: string;
    category?: string | null;
    websiteUrl?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    rating?: number | null;
    reviewCount?: number | null;
    score?: number | null;
  };
  hasAudit: boolean;
}

export function LeadDetailHeader({ lead, hasAudit }: LeadDetailHeaderProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState(lead.websiteUrl || "");
  const [phone, setPhone] = useState(lead.phone || "");
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl, phone }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error?.message || "Failed to update lead details.");
      }

      toast.success("Lead details updated successfully!");
      setIsEditOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleAutoEnrich = async () => {
    setEnriching(true);
    toast.info("Auto-searching Google Places & Web for missing website & phone...");

    try {
      const res = await fetch(`/api/leads/${lead.id}/enrich`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error?.message || "Enrichment failed.");
      }

      toast.success(data.message || "Lead details updated!");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enrichment failed.");
    } finally {
      setEnriching(false);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/leads")}
            className="text-slate-400 hover:text-slate-200"
          >
            ← Back to Leads
          </Button>
          <span className="text-slate-700">|</span>
          <h1 className="text-xl font-bold text-white truncate max-w-[300px] sm:max-w-none">{lead.name}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleAutoEnrich}
            disabled={enriching}
            variant="outline"
            size="sm"
            className="border-slate-800 text-slate-300 hover:bg-slate-800 gap-1.5 text-xs"
          >
            <Sparkles className={`h-3.5 w-3.5 ${enriching ? "animate-spin text-indigo-400" : "text-indigo-400"}`} />
            <span>{enriching ? "Auto-Searching..." : "Auto-Find Website"}</span>
          </Button>

          <Button
            onClick={() => setIsEditOpen(true)}
            variant="outline"
            size="sm"
            className="border-slate-800 text-slate-300 hover:bg-slate-800 gap-1.5 text-xs"
          >
            <Edit className="h-3.5 w-3.5 text-slate-400" />
            <span>Edit Info</span>
          </Button>

          <AuditButton businessId={lead.id} label={hasAudit ? "Re-Audit Website" : "Run Website Audit"} />
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Edit Lead Details</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-slate-400" />
                Website URL
              </label>
              <Input
                placeholder="https://example.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="bg-slate-900 border-slate-800 text-slate-100 text-sm focus-visible:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                Phone Number
              </label>
              <Input
                placeholder="+1 555-0199"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-slate-900 border-slate-800 text-slate-100 text-sm focus-visible:ring-indigo-500"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="border-slate-800 text-slate-300"
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
