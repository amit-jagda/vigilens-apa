'use client';

import React from 'react';
import Link from 'next/navigation';
import { usePathname } from 'next/navigation';
import {
  Video,
  Users,
  History,
  Sparkles,
  UserCheck2,
  Building2,
  LogOut,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
} from 'lucide-react';
import { logoutUser } from '@/lib/api/auth';
import { useApaStore } from '@/stores/apaStore';

const NAV_ITEMS = [
  {
    name: 'Video Analytics',
    href: '/',
    icon: Video,
    description: 'Topology & Footage Analysis',
  },
  {
    name: 'People & Journeys',
    href: '/people',
    icon: Users,
    description: 'Directory & Multi-Camera Pathways',
  },
  {
    name: 'History',
    href: '/history',
    icon: History,
    description: 'Past Analyzed Video Sessions',
  },
  {
    name: 'Staff Directory',
    href: '/staff',
    icon: UserCheck2,
    description: 'Staff Face Enrollment',
  },
  {
    name: 'Daily Check-Ins',
    href: '/checkin',
    icon: ShieldCheck,
    description: 'Daily Appearance & Outfit Anchors',
  },
  {
    name: 'AI Assistant',
    href: '/assistant',
    icon: Sparkles,
    description: 'Natural Language Intelligence',
    badge: 'AI',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const mainTab = useApaStore((s) => s.mainTab);
  const activeStep = useApaStore((s) => s.activeStep);
  const topologyViewMode = useApaStore((s) => s.topologyViewMode);
  const isSidebarCollapsed = useApaStore((s) => s.isSidebarCollapsed);
  const setIsSidebarCollapsed = useApaStore((s) => s.setIsSidebarCollapsed);

  // Automatically shrink to icon rail when on the Floor Plan Canvas to give canvas maximum screen width
  const isCanvasOpen =
    pathname === '/' &&
    mainTab === 'analytics' &&
    activeStep === 1 &&
    topologyViewMode === 'floorplan';
  const isCollapsed = isSidebarCollapsed !== null ? isSidebarCollapsed : isCanvasOpen;

  // Hide sidebar on login/register pages
  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  return (
    <aside
      className={`sticky top-0 flex h-screen flex-col justify-between border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out shrink-0 z-40 ${
        isCollapsed ? 'w-16 px-1.5 py-3 items-center' : 'w-64 px-3 py-4'
      }`}
    >
      {/* Brand Header */}
      <div className="w-full">
        {isCollapsed ? (
          <div className="flex flex-col items-center py-1">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25 transition-transform hover:scale-105 cursor-pointer"
              title="Vigilens APA — Spatial & People Analytics"
              onClick={() => setIsSidebarCollapsed(false)}
            >
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-sidebar-foreground">
                VIGILENS <span className="text-primary font-black">APA</span>
              </h1>
              <p className="text-[10px] text-muted-foreground">Spatial & People Analytics</p>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className={`mt-5 space-y-1.5 w-full ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));

            if (isCollapsed) {
              return (
                <a
                  key={item.name}
                  href={item.href}
                  title={`${item.name} — ${item.description}`}
                  className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/25 ring-2 ring-primary/40'
                      : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5 transition-transform group-hover:scale-110" />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground shadow-xs">
                      {item.badge}
                    </span>
                  )}
                  {/* Floating tooltip on hover */}
                  <span className="pointer-events-none absolute left-full ml-3 hidden rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1 text-xs font-semibold text-white shadow-2xl whitespace-nowrap group-hover:block z-50">
                    {item.name}
                  </span>
                </a>
              );
            }

            return (
              <a
                key={item.name}
                href={item.href}
                className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 transition-colors ${
                      isActive
                        ? 'text-primary-foreground'
                        : 'text-muted-foreground group-hover:text-primary'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge ? (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      isActive
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-primary/10 text-primary border border-primary/20'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : (
                  <ChevronRight
                    className={`h-3.5 w-3.5 opacity-0 transition-all group-hover:opacity-100 ${
                      isActive ? 'opacity-100 text-primary-foreground' : 'text-muted-foreground'
                    }`}
                  />
                )}
              </a>
            );
          })}
        </nav>
      </div>

      {/* Footer / Workspace Switcher & Collapse Toggle */}
      <div className={`space-y-2 border-t border-sidebar-border/80 pt-3 w-full ${isCollapsed ? 'flex flex-col items-center px-0' : 'px-1'}`}>
        {isCollapsed ? (
          <>
            {/* Workspace Icon */}
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-accent/40 text-primary hover:bg-sidebar-accent transition-colors"
              title="Main HQ Campus (Default Tenant)"
            >
              <Building2 className="h-4 w-4" />
            </div>

            {/* Logout Button Icon */}
            <button
              type="button"
              onClick={logoutUser}
              title="Sign Out"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>

            {/* Expand Toggle */}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(false)}
              title="Expand Sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            {/* Workspace pill */}
            <div className="flex items-center justify-between rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-2.5">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <div className="truncate">
                  <span className="block text-[11px] font-bold text-sidebar-foreground truncate">
                    Main HQ Campus
                  </span>
                  <span className="block text-[9px] text-muted-foreground font-mono">
                    Tenant: Default
                  </span>
                </div>
              </div>
            </div>

            {/* User Account / Logout */}
            <div className="flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={logoutUser}
                className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer flex-1"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>

              {/* Collapse button */}
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(true)}
                title="Shrink sidebar to icons list"
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3 w-3" />
                <span>Shrink</span>
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
