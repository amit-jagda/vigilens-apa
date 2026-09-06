'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Activity, Radio, ShieldCheck } from 'lucide-react';

export function Header() {
  const pathname = usePathname();

  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  const getPageTitle = () => {
    if (pathname.startsWith('/setup')) return 'Workspace & Camera Setup';
    if (pathname.startsWith('/upload')) return 'Footage Upload & Processing';
    if (pathname.startsWith('/people')) return 'People & Journey Intelligence';
    if (pathname.startsWith('/assistant')) return 'AI Assistant (Natural Language Q&A)';
    if (pathname.startsWith('/staff')) return 'Staff Enrollment & Face Directory';
    return 'Advanced People Analytics';
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/80 bg-background/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-bold text-foreground">{getPageTitle()}</h2>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live Vision Engine Online
        </div>
      </div>
    </header>
  );
}
