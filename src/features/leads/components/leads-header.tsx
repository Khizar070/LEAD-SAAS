"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Sparkles } from "lucide-react";
import { DiscoveryModal } from "@/features/leads/components/discovery-modal";
import { toast } from "sonner";

export function LeadsHeader() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [enriching, setEnriching] = useState(false);

  const handleBulkEnrich = async () => {
    setEnriching(true);
    toast.info("Auto-searching websites & contact details for missing leads...");
    try {
      const res = await fetch("/api/leads/re-enrich", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error?.message || "Failed to re-enrich leads.");
      }
      toast.success(data.data?.message || "Leads enriched successfully!");
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Leads Intelligence</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage, audit, score, and draft outreach for target business prospects.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleBulkEnrich}
            disabled={enriching}
            variant="outline"
            className="border-slate-800 text-slate-300 hover:bg-slate-800 gap-2 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${enriching ? "animate-spin text-indigo-400" : "text-slate-400"}`} />
            <span>{enriching ? "Auto-Searching Websites..." : "Auto-Find Missing Websites"}</span>
          </Button>
          <Button onClick={() => setIsOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
            <Plus className="h-4 w-4" />
            <span>New Lead Discovery</span>
          </Button>
        </div>
      </div>

      <DiscoveryModal open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
