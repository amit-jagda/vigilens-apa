'use client';

import React from 'react';
import { Eye, Shield, Cpu, Zap, ShieldCheck } from 'lucide-react';

function AnimatedFeed() {
  const feeds = [
    {
      label: 'CAM 01 — ENTRANCE',
      boxes: [
        { top: '20%', left: '15%', w: '40%', h: '45%', tag: 'person 96%' },
        { top: '55%', left: '55%', w: '30%', h: '30%', tag: 'person 91%' },
      ],
    },
    {
      label: 'CAM 02 — CAFETERIA',
      boxes: [
        { top: '30%', left: '25%', w: '35%', h: '40%', tag: 'person 94%' },
      ],
    },
    {
      label: 'CAM 03 — MEETING CORRIDOR',
      boxes: [
        { top: '25%', left: '10%', w: '45%', h: '50%', tag: 'person 88%' },
        { top: '60%', left: '50%', w: '25%', h: '25%', tag: 'person 82%' },
      ],
    },
    {
      label: 'CAM 04 — MAIN LOBBY',
      boxes: [
        { top: '35%', left: '30%', w: '38%', h: '42%', tag: 'person 95%' },
      ],
    },
  ];

  return (
    <div className="mx-auto w-full max-w-sm space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {feeds.map((feed) => (
          <div
            key={feed.label}
            className="relative aspect-video overflow-hidden rounded-xl border border-border/80 bg-accent/20"
          >
            <span className="absolute top-1 left-1 z-10 rounded bg-background/90 px-1 font-mono text-[8px] text-muted-foreground">
              {feed.label}
            </span>
            {feed.boxes.map((box, i) => (
              <div
                key={i}
                className="absolute rounded border border-primary animate-pulse"
                style={{
                  top: box.top,
                  left: box.left,
                  width: box.w,
                  height: box.h,
                }}
              >
                <span className="absolute -top-3.5 left-0 rounded bg-primary/90 px-1 text-[7px] font-bold text-primary-foreground">
                  {box.tag}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-xl border border-border/80 bg-accent/20 px-3 py-2 text-[10px] text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">Multi-Camera</span> Spatial ReID
        </span>
        <span>·</span>
        <span>
          <span className="font-semibold text-emerald-400">YOLOv8-Seg</span> Masking
        </span>
        <span>·</span>
        <span>
          <span className="font-semibold text-primary">RAG</span> AI Assistant
        </span>
      </div>
    </div>
  );
}

const badges = [
  { icon: Shield, label: 'Secure JWT' },
  { icon: Cpu, label: 'YOLOv8 Segmentation' },
  { icon: Zap, label: 'Multi-Camera ReID' },
];

export function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left Visual Panel */}
      <div className="hidden w-[52%] flex-col border-r border-border bg-sidebar p-10 lg:flex">
        <div className="mb-auto flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-base font-bold text-foreground tracking-tight">
              Vigilens <span className="text-primary font-black">APA</span>
            </span>
            <span className="block text-[10px] text-muted-foreground">Advanced People & Spatial Analytics</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-12">
          <h2 className="mb-6 text-center text-3xl font-extrabold leading-tight text-foreground">
            See what your
            <br />
            <span className="text-primary">cameras see.</span>
          </h2>
          <AnimatedFeed />
        </div>

        <div className="mt-auto flex justify-center gap-6 pt-8 border-t border-border/40">
          {badges.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className="h-3.5 w-3.5 text-primary" />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex flex-1 items-center justify-center bg-background p-6">
        <div className="w-full max-w-[380px]">{children}</div>
      </div>
    </div>
  );
}
