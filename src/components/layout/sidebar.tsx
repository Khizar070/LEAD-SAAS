"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  GalleryVerticalEnd,
  Settings2,
  ChevronsUpDown,
  ChevronRight,
  LayoutDashboard,
  Users,
  FileSearch,
  Send,
  Sparkles,
  Plus,
  User,
  CreditCard,
  Bell,
  LogOut,
  Check,
  Building2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/layout/sidebar-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Workspace {
  name: string;
  plan: string;
  logo: React.ElementType;
}

const workspaces: Workspace[] = [
  { name: "Acme Inc", plan: "Enterprise", logo: GalleryVerticalEnd },
  { name: "Lead Intelligence", plan: "Personal MVP", logo: Sparkles },
  { name: "Next Gen Labs", plan: "Pro Plan", logo: Building2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, isMobileOpen, setMobileOpen } = useSidebar();

  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>(workspaces[0]);

  // Core apps routes
  const appRoutes = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Leads", href: "/leads", icon: Users },
    { name: "Audits", href: "/audits", icon: FileSearch },
    { name: "Campaigns", href: "/campaigns", icon: Send },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "relative flex flex-col h-full bg-[#0d0d10] border-r border-neutral-800/80 transition-all duration-300 ease-in-out select-none z-40",
          // Collapsed vs Expanded width
          isCollapsed ? "w-[68px]" : "w-[260px]",
          // Mobile responsive slide-over drawer
          "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:shadow-2xl",
          !isMobileOpen && "max-md:-translate-x-full"
        )}
      >
        {/* Mobile close button */}
        <div className="md:hidden absolute right-3 top-3">
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* 1. TOP HEADER: Workspace / Organization Switcher */}
        <div className="p-2 border-b border-neutral-800/60">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-3 p-1.5 rounded-lg text-left transition-colors cursor-pointer outline-none",
                    "hover:bg-neutral-800/70 focus-visible:ring-1 focus-visible:ring-neutral-700",
                    isCollapsed ? "justify-center" : "justify-between"
                  )}
                />
              }
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Blue square icon badge */}
                <div className="size-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
                  <activeWorkspace.logo className="size-5" />
                </div>

                {/* Workspace Title & Plan (visible only when expanded) */}
                {!isCollapsed && (
                  <div className="flex flex-col min-w-0 text-left">
                    <span className="font-semibold text-sm text-neutral-100 truncate leading-tight tracking-tight">
                      {activeWorkspace.name}
                    </span>
                    <span className="text-xs text-neutral-400 font-normal truncate leading-tight">
                      {activeWorkspace.plan}
                    </span>
                  </div>
                )}
              </div>

              {!isCollapsed && (
                <ChevronsUpDown className="size-4 text-neutral-400 shrink-0 ml-auto" />
              )}
            </DropdownMenuTrigger>

            <DropdownMenuContent
              side={isCollapsed ? "right" : "bottom"}
              align="start"
              sideOffset={8}
              className="w-56 bg-[#16161a] border border-neutral-800 text-neutral-200 shadow-2xl rounded-xl p-1.5"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-2 py-1">
                  Workspaces
                </DropdownMenuLabel>
                {workspaces.map((workspace) => {
                  const Icon = workspace.logo;
                  const isSelected = activeWorkspace.name === workspace.name;
                  return (
                    <DropdownMenuItem
                      key={workspace.name}
                      onClick={() => setActiveWorkspace(workspace)}
                      className={cn(
                        "flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-pointer text-sm transition-colors",
                        isSelected
                          ? "bg-neutral-800/80 text-white font-medium"
                          : "text-neutral-300 hover:text-white hover:bg-neutral-800/40"
                      )}
                    >
                      <div className="size-7 rounded-md bg-neutral-800 flex items-center justify-center text-neutral-300">
                        <Icon className="size-4" />
                      </div>
                      <div className="flex flex-col text-left flex-1 min-w-0">
                        <span className="truncate">{workspace.name}</span>
                        <span className="text-[11px] text-neutral-400">{workspace.plan}</span>
                      </div>
                      {isSelected && <Check className="size-4 text-blue-400 ml-auto" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-neutral-800 my-1" />
              <DropdownMenuItem className="flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-pointer text-sm text-neutral-400 hover:text-white hover:bg-neutral-800/40">
                <div className="size-7 rounded-md border border-dashed border-neutral-700 flex items-center justify-center">
                  <Plus className="size-3.5" />
                </div>
                <span>Add workspace</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 2. MAIN NAVIGATION SECTION */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-4 scrollbar-none">
          {/* Main Navigation */}
          <div>
            {!isCollapsed && (
              <div className="px-2.5 pb-1 text-xs font-medium text-neutral-400 tracking-normal select-none">
                Platform
              </div>
            )}

            <div className="space-y-1">
              {appRoutes.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="block"
                  >
                    <SidebarItem
                      icon={item.icon}
                      label={item.name}
                      isCollapsed={isCollapsed}
                      isActive={isActive}
                    />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Section: Settings */}
          <div className="pt-2 border-t border-neutral-800/50">
            {!isCollapsed && (
              <div className="px-2.5 pb-1 text-xs font-medium text-neutral-400 tracking-normal select-none">
                Settings
              </div>
            )}

            <div className="space-y-1">
              <Link
                href="/settings"
                onClick={() => setMobileOpen(false)}
                className="block"
              >
                <SidebarItem
                  icon={Settings2}
                  label="Settings"
                  isCollapsed={isCollapsed}
                  isActive={pathname === "/settings" || pathname.startsWith("/settings")}
                />
              </Link>
            </div>
          </div>
        </div>

        {/* 3. FOOTER: User Profile Card */}
        <div className="p-2 border-t border-neutral-800/60 mt-auto">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-3 p-1.5 rounded-lg text-left transition-colors cursor-pointer outline-none",
                    "hover:bg-neutral-800/70 focus-visible:ring-1 focus-visible:ring-neutral-700",
                    isCollapsed ? "justify-center" : "justify-between"
                  )}
                />
              }
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Avatar with retro cyberpunk picture */}
                <div className="relative size-8 rounded-full overflow-hidden shrink-0 border border-neutral-700/80 bg-neutral-800">
                  <Image
                    src="/avatar.jpg"
                    alt="User Avatar"
                    fill
                    className="object-cover"
                    sizes="32px"
                    priority
                  />
                </div>

                {/* Name & Email (visible only when expanded) */}
                {!isCollapsed && (
                  <div className="flex flex-col min-w-0 text-left">
                    <span className="font-semibold text-sm text-neutral-100 truncate leading-tight">
                      shadcn
                    </span>
                    <span className="text-xs text-neutral-400 font-normal truncate leading-tight">
                      m@example.com
                    </span>
                  </div>
                )}
              </div>

              {!isCollapsed && (
                <ChevronsUpDown className="size-4 text-neutral-400 shrink-0 ml-auto" />
              )}
            </DropdownMenuTrigger>

            <DropdownMenuContent
              side={isCollapsed ? "right" : "top"}
              align="start"
              sideOffset={10}
              className="w-56 bg-[#16161a] border border-neutral-800 text-neutral-200 shadow-2xl rounded-xl p-1.5"
            >
              <div className="flex items-center gap-3 p-2 border-b border-neutral-800/70 mb-1">
                <div className="relative size-8 rounded-full overflow-hidden shrink-0 border border-neutral-700">
                  <Image
                    src="/avatar.jpg"
                    alt="User Avatar"
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                </div>
                <div className="flex flex-col min-w-0 text-left">
                  <span className="font-semibold text-sm text-white truncate leading-tight">
                    shadcn
                  </span>
                  <span className="text-xs text-neutral-400 truncate leading-tight">
                    m@example.com
                  </span>
                </div>
              </div>

              <DropdownMenuGroup>
                <DropdownMenuItem className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm text-neutral-300 hover:text-white hover:bg-neutral-800/50">
                  <Sparkles className="size-4 text-amber-400" />
                  <span>Upgrade to Pro</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-neutral-800 my-1" />
              <DropdownMenuGroup>
                <DropdownMenuItem className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm text-neutral-300 hover:text-white hover:bg-neutral-800/50">
                  <User className="size-4" />
                  <span>Account</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm text-neutral-300 hover:text-white hover:bg-neutral-800/50">
                  <CreditCard className="size-4" />
                  <span>Billing</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm text-neutral-300 hover:text-white hover:bg-neutral-800/50">
                  <Bell className="size-4" />
                  <span>Notifications</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-neutral-800 my-1" />
              <DropdownMenuItem className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10">
                <LogOut className="size-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  isCollapsed: boolean;
  isActive?: boolean;
  hasChevron?: boolean;
  hasChildren?: boolean;
  isOpen?: boolean;
  onClick?: () => void;
}

function SidebarItem({
  icon: Icon,
  label,
  isCollapsed,
  isActive = false,
  hasChevron = false,
  hasChildren = false,
  isOpen = false,
  onClick,
}: SidebarItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full flex items-center gap-3 rounded-lg transition-colors cursor-pointer group outline-none",
          isCollapsed
            ? "justify-center size-10 mx-auto"
            : "px-2.5 py-2 justify-between",
          isActive
            ? "bg-neutral-800/90 text-white font-medium"
            : "text-neutral-300 hover:text-white hover:bg-neutral-800/60"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon
            className={cn(
              "size-4 shrink-0 transition-colors",
              isActive
                ? "text-white"
                : "text-neutral-400 group-hover:text-neutral-200"
            )}
          />
          {!isCollapsed && (
            <span className="text-sm font-medium truncate text-left">
              {label}
            </span>
          )}
        </div>

        {!isCollapsed && (hasChevron || hasChildren) && (
          <ChevronRight
            className={cn(
              "size-4 text-neutral-400 shrink-0 transition-transform duration-200",
              isOpen && "rotate-90"
            )}
          />
        )}
      </button>

      {/* Floating Tooltip in Collapsed Rail Mode */}
      {isCollapsed && isHovered && (
        <div className="fixed left-[76px] z-50 px-2.5 py-1 text-xs font-medium text-neutral-100 bg-[#1a1a1e] border border-neutral-700/80 rounded-md shadow-xl whitespace-nowrap pointer-events-none animate-in fade-in-0 zoom-in-95">
          {label}
        </div>
      )}
    </div>
  );
}
