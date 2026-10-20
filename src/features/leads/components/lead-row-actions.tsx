"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, FileSearch, Sparkles, Eye, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface LeadRowActionsProps {
  leadId: string;
  hasWebsite: boolean;
}

export function LeadRowActions({ leadId, hasWebsite }: LeadRowActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRunAudit = async () => {
    if (!hasWebsite) {
      toast.error("No website URL found for this lead. Run 'Auto-Find Website' first.");
      return;
    }

    setLoading(true);
    toast.info("Starting website crawl & audit...");

    try {
      const res = await fetch(`/api/leads/${leadId}/audit`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error?.message || "Audit failed.");
      }

      toast.success(`Audit completed! Score: ${data.data?.overallScore ?? "N/A"}/100`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Audit failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnrich = async () => {
    setLoading(true);
    toast.info("Auto-searching Google Maps & Web for website & phone...");

    try {
      const res = await fetch(`/api/leads/${leadId}/enrich`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error?.message || "Enrichment failed.");
      }

      toast.success(data.message || "Lead updated successfully!");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to find details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={loading}
        className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
      >
        {loading ? <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" /> : <MoreVertical className="h-4 w-4" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200">
        <DropdownMenuItem onClick={() => router.push(`/leads/${leadId}`)} className="cursor-pointer flex items-center gap-2">
          <Eye className="h-4 w-4 text-slate-400" />
          <span>View Details</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleEnrich} className="cursor-pointer flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          <span>Auto-Find Website & Phone</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleRunAudit} className="cursor-pointer flex items-center gap-2">
          <FileSearch className="h-4 w-4 text-emerald-400" />
          <span>Run Website Audit</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
