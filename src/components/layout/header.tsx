"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ShieldCheck } from "lucide-react";
import { DiscoveryModal } from "@/features/leads/components/discovery-modal";

export function Header() {
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Evidence-Based AI Engine Active</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={() => setIsDiscoveryOpen(true)}
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 shadow-md shadow-indigo-600/20"
        >
          <Plus className="h-4 w-4" />
          <span>Discover Leads</span>
        </Button>
      </div>

      <DiscoveryModal open={isDiscoveryOpen} onOpenChange={setIsDiscoveryOpen} />
    </header>
  );
}
