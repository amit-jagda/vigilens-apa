'use client';

import React from 'react';
import {
  FileVideo,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Eye,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type { AdvancedAnalyticsSession } from '@/types/advancedpeopleanalytics';
import { getAnnotatedVideoUrl } from '@/lib/api/advancedpeopleanalytics';

interface JobCardProps {
  session: AdvancedAnalyticsSession;
  onViewPeople?: (sessionId: string) => void;
}

export function JobCard({ session, onViewPeople }: JobCardProps) {
  const normStatus = (session.status || '').toUpperCase();
  const isComplete = normStatus === 'COMPLETED';
  const isFailed = normStatus === 'FAILED';
  const isProcessing = !isComplete && !isFailed;
  const progressPct = session.completed_percentage ?? session.progress ?? 0;

  const getStatusBadge = () => {
    switch (normStatus) {
      case 'COMPLETED':
        return (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5" /> Complete
          </span>
        );
      case 'FAILED':
        return (
          <span className="flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-400 border border-rose-500/20">
            <AlertCircle className="h-3.5 w-3.5" /> Failed
          </span>
        );
      case 'SEGMENTING':
        return (
          <span className="flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-400 border border-purple-500/20 animate-pulse">
            <Sparkles className="h-3.5 w-3.5" /> Segmenting Masks
          </span>
        );
      case 'EMBEDDING':
        return (
          <span className="flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20 animate-pulse">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Vectorizing ReID
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20 animate-pulse">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> {session.status}
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/60 text-primary">
            <FileVideo className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground truncate max-w-[280px]">
              {session.video_name}
            </h4>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
              ID: {session.id.slice(0, 12)}...
            </p>
          </div>
        </div>

        <div>{getStatusBadge()}</div>
      </div>

      {/* Progress Bar if processing */}
      {isProcessing && (
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{session.current_step || 'Processing segmentation & spatial tracks...'}</span>
            <span className="font-mono font-bold text-foreground">
              {progressPct}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-accent">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Complete Metrics Summary */}
      {isComplete && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4 text-xs">
          <div className="rounded-xl bg-accent/30 p-2.5">
            <span className="text-[10px] text-muted-foreground block">Total Detections</span>
            <span className="text-sm font-bold text-foreground">
              {session.total_person_count ?? session.total_people_detected ?? 0}
            </span>
          </div>
          <div className="rounded-xl bg-accent/30 p-2.5">
            <span className="text-[10px] text-muted-foreground block">Unique Visitors</span>
            <span className="text-sm font-bold text-amber-400">
              {session.visitor_count ?? session.unique_visitors_count ?? 0}
            </span>
          </div>
          <div className="rounded-xl bg-accent/30 p-2.5">
            <span className="text-[10px] text-muted-foreground block">Staff Confirmed</span>
            <span className="text-sm font-bold text-emerald-400">
              {session.employee_count ?? session.employees_detected_count ?? 0}
            </span>
          </div>
          <div className="rounded-xl bg-accent/30 p-2.5">
            <span className="text-[10px] text-muted-foreground block">Line Crossings</span>
            <span className="text-sm font-bold text-foreground">
              {session.line_crossings_in_count} In / {session.line_crossings_out_count} Out
            </span>
          </div>
        </div>
      )}

      {/* Card Actions */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-muted-foreground">
          {new Date(session.created_at).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>

        <div className="flex items-center gap-2">
          {isComplete && (
            <>
              <a
                href={getAnnotatedVideoUrl(session.id)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent/80 transition-colors"
              >
                <Eye className="h-3.5 w-3.5 text-primary" /> View Video
              </a>
              {onViewPeople && (
                <button
                  type="button"
                  onClick={() => onViewPeople(session.id)}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Users className="h-3.5 w-3.5" /> View People
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
