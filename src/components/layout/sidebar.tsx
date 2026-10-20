"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileSearch,
  Send,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Audits", href: "/audits", icon: FileSearch },
  { name: "Campaigns", href: "/campaigns", icon: Send },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 border-r border-slate-800 bg-slate-950 text-slate-200 min-h-screen">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-500/20">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-bold text-sm text-white tracking-wide">LEAD INTELLIGENCE</h1>
          <p className="text-[10px] text-indigo-400 font-medium uppercase tracking-wider">
            Personal MVP
          </p>
        </div>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 px-4 py-6 space-y-1.5">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-indigo-400" : "text-slate-500")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Workspace Footer */}
      <div className="p-4 m-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs">
        <div className="font-semibold text-slate-300 mb-0.5">Workspace</div>
        <div className="text-slate-500 truncate">Personal (Single Tenant)</div>
      </div>
    </div>
  );
}
