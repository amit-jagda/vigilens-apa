'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { usePathname } from 'next/navigation';
import { useApaStore } from '@/stores/apaStore';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const mainTab = useApaStore((s) => s.mainTab);
  const activeStep = useApaStore((s) => s.activeStep);
  const topologyViewMode = useApaStore((s) => s.topologyViewMode);

  // When floor plan canvas is active, prevent outer page scrolling so pan & zoom stay 100% inside canvas
  const isCanvasOpen =
    pathname === '/' &&
    mainTab === 'analytics' &&
    activeStep === 1 &&
    topologyViewMode === 'floorplan';

  if (isAuthPage) {
    return <main className="min-h-screen bg-background">{children}</main>;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col h-screen min-w-0 overflow-hidden">
        <Header />
        <main
          className={`flex-1 relative ${
            isCanvasOpen
              ? 'overflow-hidden flex flex-col h-[calc(100vh-3.5rem)]'
              : 'overflow-y-auto'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
