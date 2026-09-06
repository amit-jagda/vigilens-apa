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
  ShieldCheck,
} from 'lucide-react';
import { logoutUser } from '@/lib/api/auth';

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
    name: 'AI Assistant',
    href: '/assistant',
    icon: Sparkles,
    description: 'Natural Language Intelligence',
    badge: 'AI',
  },
];

export function Sidebar() {
  const pathname = usePathname();

  // Hide sidebar on login/register pages
  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col justify-between border-r border-sidebar-border bg-sidebar px-3 py-4 text-sidebar-foreground">
      {/* Brand Header */}
      <div>
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

        {/* Navigation Links */}
        <nav className="mt-6 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));

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

      {/* Footer / Workspace Switcher & Logout */}
      <div className="space-y-3 border-t border-sidebar-border/80 pt-3 px-1">
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
        <button
          type="button"
          onClick={logoutUser}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <div className="flex items-center gap-2.5">
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </div>
        </button>
      </div>
    </aside>
  );
}
