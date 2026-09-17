'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Camera, UserCheck, SlidersHorizontal } from 'lucide-react';
import { useApaStore } from '@/stores/apaStore';

export function Header() {
  const pathname = usePathname();
  const setIsSearchByPhotoOpen = useApaStore((s) => s.setIsSearchByPhotoOpen);
  const setIsDailyCheckinOpen = useApaStore((s) => s.setIsDailyCheckinOpen);

  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  const getPageTitle = () => {
    if (pathname.startsWith('/settings')) return 'Backend & Engine Settings';
    if (pathname.startsWith('/setup')) return 'Workspace & Camera Setup';
    if (pathname.startsWith('/upload')) return 'Footage Upload & Processing';
    if (pathname.startsWith('/people')) return 'People & Journey Intelligence';
    if (pathname.startsWith('/history')) return 'Analyzed Footage History';
    if (pathname.startsWith('/staff')) return 'Staff Enrollment & Face Directory';
    if (pathname.startsWith('/assistant')) return 'AI Assistant (Natural Language Q&A)';
    return 'Advanced People & Spatial Analytics';
  };

  const isMainDashboard = pathname === '/';

  return (
    <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between border-b border-border/80 bg-background/95 px-6 md:px-8 backdrop-blur-md">
      <div className="flex items-center gap-3 min-w-0">
        <h2 className="text-sm sm:text-base font-bold text-foreground truncate">{getPageTitle()}</h2>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {isMainDashboard && (
          <>
            <button
              type="button"
              onClick={() => setIsSearchByPhotoOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Camera className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search by Photo</span>
              <span className="px-1 py-0.2 rounded text-[9px] bg-white/20 uppercase tracking-wide font-mono">
                Vector DB
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsDailyCheckinOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-foreground text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Daily Check-in</span>
            </button>
          </>
        )}

        <a
          href="/settings"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-xs transition-all cursor-pointer ${
            pathname.startsWith('/settings')
              ? 'border-primary/50 bg-primary/15 text-primary'
              : 'border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground'
          }`}
          title="System & Engine Parameters"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
          <span className="hidden sm:inline">Settings</span>
        </a>

        <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="hidden md:inline">Live Vision Engine Online</span>
          <span className="inline md:hidden">Live</span>
        </div>
      </div>
    </header>
  );
}

