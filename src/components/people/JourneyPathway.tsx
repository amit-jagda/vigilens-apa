'use client';

import React, { useState } from 'react';
import {
  Footprints,
  Calendar,
  Clock,
  Camera,
  ArrowRight,
  ShieldCheck,
  Timer,
  CheckCircle2,
} from 'lucide-react';
import type { TimelineEventItem, PersonTimelineResponse } from '@/types/advancedpeopleanalytics';
import { formatDwellTime } from '@/lib/utils';

interface JourneyPathwayProps {
  timelineData: PersonTimelineResponse;
}

export function JourneyPathway({ timelineData }: JourneyPathwayProps) {
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');

  const events = timelineData.events || [];

  // Group events by YYYY-MM-DD
  const distinctDates = Array.from(
    new Set(events.map((e) => new Date(e.started_at).toISOString().split('T')[0])),
  )
    .sort()
    .reverse();

  const filteredDates = selectedDateFilter === 'all' ? distinctDates : [selectedDateFilter];

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-accent/10 p-8 text-center">
        <Footprints className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground font-medium">
          No chronological timeline events recorded for this person.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Switcher Pills */}
      <div className="flex items-center gap-2 flex-wrap border-b border-border/60 pb-3">
        <button
          type="button"
          onClick={() => setSelectedDateFilter('all')}
          className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
            selectedDateFilter === 'all'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-accent text-muted-foreground hover:text-foreground hover:bg-accent/80'
          }`}
        >
          All Recorded Days ({events.length} Stops)
        </button>
        {distinctDates.map((dStr) => {
          const count = events.filter(
            (e) => new Date(e.started_at).toISOString().split('T')[0] === dStr,
          ).length;
          const formattedLabel = new Date(`${dStr}T00:00:00Z`).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
          });

          return (
            <button
              key={dStr}
              type="button"
              onClick={() => setSelectedDateFilter(dStr)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                selectedDateFilter === dStr
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-accent text-muted-foreground hover:text-foreground hover:bg-accent/80'
              }`}
            >
              <Calendar className="h-3 w-3" /> {formattedLabel} ({count})
            </button>
          );
        })}
      </div>

      {/* Render Each Day's Pathway */}
      <div className="space-y-8">
        {filteredDates.map((dStr) => {
          const dayEvents = events.filter(
            (e) => new Date(e.started_at).toISOString().split('T')[0] === dStr,
          );
          if (dayEvents.length === 0) return null;

          const formattedDayTitle = new Date(`${dStr}T00:00:00Z`).toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
          });
          const dayDwellSec = dayEvents.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
          const dayFirstSeen = dayEvents[0]?.started_at;
          const dayLastSeen = dayEvents[dayEvents.length - 1]?.ended_at;

          return (
            <div key={dStr} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              {/* Day Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-2.5 text-primary border border-primary/20">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{formattedDayTitle}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Activity Window:{' '}
                      <span className="font-semibold text-foreground">
                        {new Date(dayFirstSeen).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        ➔{' '}
                        {new Date(dayLastSeen).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-foreground">
                    {dayEvents.length} Camera Stop{dayEvents.length !== 1 ? 's' : ''}
                  </span>
                  <span className="rounded-md bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-semibold text-primary">
                    Day Dwell: {formatDwellTime(dayDwellSec)}
                  </span>
                </div>
              </div>

              {/* Vertical Ordered Pathway */}
              <div className="relative border-l-2 border-primary/40 ml-4 pl-6 space-y-6">
                {/* Deduplicate identical consecutive records if re-analyzed */}
                {(() => {
                  const uniqueDayEvents = dayEvents.filter((evt, i, arr) => {
                    if (i === 0) return true;
                    const prev = arr[i - 1];
                    return !(
                      prev.camera_name === evt.camera_name &&
                      prev.started_at === evt.started_at &&
                      prev.ended_at === evt.ended_at &&
                      prev.tracker_id === evt.tracker_id
                    );
                  });

                  const cleanCameraName = (raw: string) => {
                    const base = raw.replace(/\.(mp4|avi|mov|mkv)$/i, '');
                    return base.replace(/-t$/i, '').replace(/_/g, ' ').replace(/([a-zA-Z]+)(\d+)/, '$1 $2');
                  };

                  return uniqueDayEvents.map((evt, idx) => {
                    const nextEvt = uniqueDayEvents[idx + 1];
                    let transitSeconds: number | null = null;
                    if (nextEvt) {
                      const curEnd = new Date(evt.ended_at).getTime();
                      const nextStart = new Date(nextEvt.started_at).getTime();
                      const diff = Math.round((nextStart - curEnd) / 1000);
                      if (diff >= 0 && diff <= 7200) {
                        transitSeconds = diff;
                      }
                    }

                    const displayCamName = cleanCameraName(evt.camera_name);
                    const displayArea = evt.zone_name || `${displayCamName} Location`;

                    return (
                      <div key={`${evt.id}-${idx}`} className="relative group">
                        {/* Timeline node dot */}
                        <span className="absolute -left-[31px] top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-primary text-[11px] font-bold text-primary-foreground shadow-md ring-4 ring-primary/20">
                          {idx + 1}
                        </span>

                        <div className="rounded-xl border border-border bg-accent/10 p-5 shadow-sm transition-all hover:border-primary/50 hover:bg-accent/20">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
                            <div>
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="text-base font-bold text-foreground flex items-center gap-1.5">
                                  📹 {displayCamName}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 text-xs font-semibold text-cyan-400">
                                  📍 Area: <b className="text-foreground ml-0.5">{displayArea}</b>
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Detected Event: <span className="font-semibold text-foreground uppercase">{evt.event_type}</span>
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                                {evt.identity_source === 'face'
                                  ? 'Face Match'
                                  : evt.identity_source === 'reid'
                                  ? 'ReID Transfer'
                                  : evt.identity_source}{' '}
                                ({Math.round(evt.identity_confidence * 100)}%)
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="text-muted-foreground block text-[11px]">Arrival Time</span>
                              <span className="font-bold text-foreground">
                                {new Date(evt.started_at).toLocaleTimeString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[11px]">Departure Time</span>
                              <span className="font-bold text-foreground">
                                {new Date(evt.ended_at).toLocaleTimeString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[11px]">Dwell on Camera</span>
                              <span className="font-bold text-primary">
                                {formatDwellTime(evt.duration_seconds)}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[11px]">Track ID</span>
                              <span className="font-mono text-foreground font-semibold">
                                #{evt.tracker_id}
                              </span>
                            </div>
                          </div>

                          {/* Associated / Carried Objects */}
                          {evt.associated_objects && evt.associated_objects.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-medium text-muted-foreground">Carried Objects:</span>
                              {evt.associated_objects.map((obj) => {
                                const objIcons: Record<string, string> = {
                                  backpack: '🎒',
                                  handbag: '👜',
                                  suitcase: '🧳',
                                  umbrella: '☂️',
                                  laptop: '💻',
                                  mouse: '🖱️',
                                  keyboard: '⌨️',
                                  'cell phone': '📱',
                                  remote: '📺',
                                  bottle: '💧',
                                  cup: '☕',
                                  book: '📖',
                                };
                                const icon = objIcons[obj.toLowerCase()] || '📦';
                                return (
                                  <span
                                    key={obj}
                                    className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[11px] font-semibold text-amber-400 capitalize"
                                  >
                                    <span>{icon}</span> {obj}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Transit Connector between cameras */}
                        {transitSeconds !== null && (
                          <div className="my-2 ml-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <ArrowRight className="h-4 w-4 text-primary animate-pulse" />
                            <span className="rounded-full bg-primary/10 border border-primary/30 px-3 py-0.5 text-primary text-[11px] font-semibold">
                              {transitSeconds}s transit travel to next location
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
