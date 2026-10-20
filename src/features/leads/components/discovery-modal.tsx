"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, MapPin, Briefcase } from "lucide-react";
import { toast } from "sonner";

interface DiscoveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DiscoveryModal({ open, onOpenChange }: DiscoveryModalProps) {
  const router = useRouter();
  const [niche, setNiche] = useState("");
  const [location, setLocation] = useState("");
  const [maxResults, setMaxResults] = useState("10");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche.trim() || !location.trim()) {
      toast.error("Please provide both target Niche and Location.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/leads/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: niche.trim(),
          location: location.trim(),
          maxResults: parseInt(maxResults, 10),
        }),
      });

      const resData = await response.json();

      if (!response.ok || resData.error) {
        throw new Error(resData.error?.message || "Lead discovery failed.");
      }

      const { newlyAdded, totalDiscovered, duplicatesSkipped } = resData.data;

      toast.success(
        `Discovery complete! Discovered ${totalDiscovered} businesses: added ${newlyAdded} new leads (${duplicatesSkipped} duplicates skipped).`
      );

      onOpenChange(false);
      setNiche("");
      setLocation("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to discover leads.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold mb-1">
            <Sparkles className="h-4 w-4" />
            <span>AI Lead Discovery Engine</span>
          </div>
          <DialogTitle className="text-xl font-bold text-white">
            Discover Target Businesses
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Fetch official business listings to audit digital presence & identify service opportunities.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-slate-400" />
              Target Niche / Service Category
            </label>
            <Input
              placeholder="e.g. Dental Clinics, Real Estate, Law Firms"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="bg-slate-900 border-slate-800 text-slate-100 text-sm focus-visible:ring-indigo-500"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              Target Location / City
            </label>
            <Input
              placeholder="e.g. London, Manchester, New York"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-slate-900 border-slate-800 text-slate-100 text-sm focus-visible:ring-indigo-500"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Maximum Leads to Discover
            </label>
            <select
              value={maxResults}
              onChange={(e) => setMaxResults(e.target.value)}
              className="w-full h-9 rounded-md bg-slate-900 border border-slate-800 px-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              disabled={loading}
            >
              <option value="5">5 Leads</option>
              <option value="10">10 Leads (Recommended)</option>
              <option value="20">20 Leads</option>
              <option value="50">50 Leads</option>
            </select>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-800 text-slate-300 hover:bg-slate-900"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Searching Places...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Start Discovery</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
