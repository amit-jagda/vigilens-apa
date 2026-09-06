'use client';

import React from 'react';
import { User, Timer, Camera, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import type { PersonSummaryItem } from '@/types/advancedpeopleanalytics';
import { getMediaCropUrl } from '@/lib/apiClient';
import { formatDwellTime } from '@/lib/utils';

interface PersonCardProps {
  person: PersonSummaryItem;
  onViewJourney: (person: PersonSummaryItem) => void;
}

export function PersonCard({ person, onViewJourney }: PersonCardProps) {
  const isEmployee = person.person_type === 'employee';

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md">
      <div>
        {/* Top: Avatar & Name */}
        <div className="flex items-start gap-3.5">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-border bg-background shadow-inner">
            {person.crop_url ? (
              <img
                src={getMediaCropUrl(person.crop_url)}
                alt={person.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-accent/40 text-muted-foreground">
                <User className="h-7 w-7" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-sm text-foreground truncate">{person.name}</h3>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                  isEmployee
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {person.person_type.toUpperCase()}
              </span>
            </div>

            {person.employee_code && (
              <span className="inline-block rounded bg-accent px-1.5 py-0.5 text-[10px] font-mono text-foreground font-semibold mt-1">
                ID: {person.employee_code}
              </span>
            )}

            <p className="text-[10px] text-muted-foreground font-mono truncate mt-1">
              UUID: {person.person_id.slice(0, 14)}...
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border border-border/80 bg-accent/20 p-2.5">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Timer className="h-3 w-3 text-primary" /> Total Dwell
            </span>
            <span className="font-bold text-foreground mt-0.5 block">
              {formatDwellTime(person.total_dwell_seconds)}
            </span>
          </div>

          <div className="rounded-xl border border-border/80 bg-accent/20 p-2.5">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Camera className="h-3 w-3 text-primary" /> Locations
            </span>
            <span className="font-bold text-foreground mt-0.5 block">
              {person.camera_stops_count} Camera{person.camera_stops_count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Cameras Visited tags */}
        {person.cameras_visited && person.cameras_visited.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {person.cameras_visited.slice(0, 3).map((cam, idx) => (
              <span
                key={idx}
                className="rounded bg-accent/60 border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground font-medium"
              >
                📷 {cam}
              </span>
            ))}
            {person.cameras_visited.length > 3 && (
              <span className="rounded bg-accent/60 border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground font-medium">
                +{person.cameras_visited.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer: Activity Window & Button */}
      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
        <span className="text-[10px] text-muted-foreground">
          {new Date(person.first_seen_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </span>

        <button
          type="button"
          onClick={() => onViewJourney(person)}
          className="flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-bold text-primary transition-all hover:bg-primary hover:text-primary-foreground"
        >
          <span>View Journey</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
