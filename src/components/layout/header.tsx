"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ShieldCheck, PanelLeft } from "lucide-react";
import { DiscoveryModal } from "@/features/leads/components/discovery-modal";
import { useSidebar } from "@/components/layout/sidebar-context";

export function Header() {
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const { toggleSidebar, isCollapsed, setMobileOpen } = useSidebar();

  const handleToggle = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileOpen(true);
    } else {
      toggleSidebar();
    }
  };

  return (
    <header className="h-14 border-b border-neutral-800/80 bg-[#0d0d10]/90 backdrop-blur-md px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 transition-all">
      <div className="flex items-center gap-3">
        {/* Sidebar Toggle Button [|] matching user screenshot */}
        <button
          type="button"
          onClick={handleToggle}
          className="size-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-neutral-700"
          title={`Toggle Sidebar (Ctrl+B) - currently ${isCollapsed ? "collapsed" : "expanded"}`}
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="size-4.5" />
        </button>

        <div className="h-4 w-px bg-neutral-800 hidden sm:block" />

        <div className="flex items-center gap-2 text-xs text-neutral-400 bg-neutral-900 border border-neutral-800/80 px-3 py-1.5 rounded-full">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Evidence-Based AI Engine Active</span>
          <span className="sm:hidden">AI Active</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={() => setIsDiscoveryOpen(true)}
          size="sm"
          className="bg-blue-600 hover:bg-blue-500 text-white gap-2 shadow-sm cursor-pointer font-medium"
        >
          <Plus className="h-4 w-4" />
          <span>Discover Leads</span>
        </Button>
      </div>

      <DiscoveryModal open={isDiscoveryOpen} onOpenChange={setIsDiscoveryOpen} />
    </header>
  );
}
