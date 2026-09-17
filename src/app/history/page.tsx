'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  History,
  Calendar,
  Eye,
  Trash2,
  RefreshCw,
  Video,
  Users,
  UserCheck,
  UserPlus,
  TrendingUp,
  AlertTriangle,
  Play,
} from 'lucide-react';
import {
  listAnalyticsSessions,
  deleteAdvancedSession,
  resetAnalyticsData,
  rerunAdvancedSession,
  getAnnotatedVideoUrl,
} from '@/lib/api/advancedpeopleanalytics';
import type { AdvancedAnalyticsSession } from '@/types/advancedpeopleanalytics';

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<AdvancedAnalyticsSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [rerunningId, setRerunningId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<AdvancedAnalyticsSession | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const res = await listAnalyticsSessions();
      if (res?.data) {
        setSessions(res.data);
      }
    } catch {
      toast.error('Failed to load past sessions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRerun = async (session: AdvancedAnalyticsSession) => {
    setRerunningId(session.id);
    try {
      const res = await rerunAdvancedSession(session.id);
      if (res?.data) {
        toast.success(`Rerunning analysis for "${session.video_name}"...`);
        router.push(`/?sessionId=${session.id}`);
      } else {
        toast.error(res?.message || 'Failed to rerun analysis');
      }
    } catch {
      toast.error('Failed to rerun analysis');
    } finally {
      setRerunningId(null);
    }
  };

  const handleDelete = async () => {
    if (!sessionToDelete) return;
    const id = sessionToDelete.id;
    setDeletingId(id);
    try {
      await deleteAdvancedSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setSessionToDelete(null);
      toast.success('Session deleted');
    } catch {
      toast.error('Failed to delete session');
    } finally {
      setDeletingId(null);
    }
  };

  const handleResetAll = async () => {
    setIsResetting(true);
    try {
      await resetAnalyticsData();
      setSessions([]);
      setIsResetConfirmOpen(false);
      toast.success('All analytics data cleared');
    } catch {
      toast.error('Failed to clear analytics data');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
            <History className="h-6 w-6 text-primary" /> Analyzed Video Sessions History
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            View, inspect, or manage all past video analytics jobs across your camera network
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchSessions}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent shadow-sm cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 shadow-sm cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear All Data
          </button>
        </div>
      </div>

      {/* Sessions Grid / Table */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : sessions.length > 0 ? (
        <div className="grid grid-cols-1 gap-5">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-border bg-card shadow-sm transition-all hover:border-primary/40 overflow-hidden flex flex-col md:flex-row"
            >
              {/* Left Side: 32-38% Video Thumbnail / Preview */}
              <div 
                onClick={() => router.push(`/?sessionId=${s.id}`)}
                className="w-full md:w-[35%] min-h-[170px] md:min-h-[195px] relative bg-black flex items-center justify-center overflow-hidden group border-b md:border-b-0 md:border-r border-border/60 cursor-pointer shrink-0"
              >
                <video
                  src={`${getAnnotatedVideoUrl(s.id)}#t=0.5`}
                  preload="metadata"
                  muted
                  playsInline
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onLoadedMetadata={(e) => {
                    try {
                      (e.target as HTMLVideoElement).currentTime = 0.5;
                    } catch {}
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 pointer-events-none" />
                
                {/* Floating Play Button */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="h-11 w-11 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110">
                    <Play className="h-5 w-5 fill-current ml-0.5" />
                  </div>
                </div>

                {/* Video Title & Date Overlay on Thumbnail */}
                <div className="absolute bottom-2.5 left-3 right-3 pointer-events-none">
                  <p className="text-xs font-bold text-white truncate drop-shadow-md flex items-center gap-1.5">
                    <Video className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">{s.video_name}</span>
                  </p>
                  <span className="text-[11px] text-white/80 flex items-center gap-1 drop-shadow-sm mt-0.5">
                    <Calendar className="h-3 w-3" />
                    {s.created_at ? new Date(s.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Right Side: 65% Info, Employees/Visitors Metrics & Actions */}
              <div className="w-full md:w-[65%] p-4 sm:p-5 flex flex-col justify-between space-y-4">
                {/* Top Row: Title, Status, Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                        (s.status || '').toUpperCase() === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : (s.status || '').toUpperCase() === 'PROCESSING'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {s.status}
                    </span>
                    <span className="text-xs font-semibold text-foreground truncate max-w-[220px]">
                      {s.video_name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleRerun(s)}
                      disabled={rerunningId === s.id || (s.status || '').toUpperCase() === 'PROCESSING'}
                      className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                      title="Rerun video analytics with same parameters"
                    >
                      <Play className={`h-3.5 w-3.5 ${rerunningId === s.id ? 'animate-spin' : 'fill-primary'}`} />
                      {rerunningId === s.id ? 'Rerunning...' : 'Rerun'}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/?sessionId=${s.id}`)}
                      className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" /> {(s.status || '').toUpperCase() === 'COMPLETED' ? 'View Dashboard' : 'View Processing'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSessionToDelete(s)}
                      className="rounded-xl border border-destructive/30 bg-destructive/10 p-2 text-destructive hover:bg-destructive/20 shadow-sm cursor-pointer"
                      title="Delete session"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Metrics Grid: Prominent Employees & Visitors */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                    <span className="text-emerald-400 font-semibold block text-[11px] flex items-center gap-1">
                      <UserCheck className="h-3.5 w-3.5 text-emerald-400" /> Employees
                    </span>
                    <span className="font-extrabold text-emerald-400 text-lg mt-0.5 block">
                      {s.employee_count ?? s.employees_detected_count ?? 0}
                    </span>
                  </div>

                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                    <span className="text-amber-400 font-semibold block text-[11px] flex items-center gap-1">
                      <UserPlus className="h-3.5 w-3.5 text-amber-400" /> Visitors
                    </span>
                    <span className="font-extrabold text-amber-400 text-lg mt-0.5 block">
                      {s.visitor_count ?? s.unique_visitors_count ?? 0}
                    </span>
                  </div>

                  <div className="rounded-xl bg-accent/20 border border-border/40 p-3">
                    <span className="text-muted-foreground block text-[11px] flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-primary" /> Total People
                    </span>
                    <span className="font-bold text-foreground text-base mt-0.5 block">
                      {s.total_person_count ?? s.total_people_detected ?? 0}
                    </span>
                  </div>

                  <div className="rounded-xl bg-accent/20 border border-border/40 p-3">
                    <span className="text-muted-foreground block text-[11px] flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5 text-sky-400" /> Gate In / Out
                    </span>
                    <span className="font-bold text-foreground text-base mt-0.5 block">
                      {s.entry_count ?? s.line_crossings_in_count ?? 0} / {s.exit_count ?? s.line_crossings_out_count ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-xs text-muted-foreground">
          No analyzed video sessions in history yet. Launch your first video analysis from the main page.
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-foreground flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Delete Analyzed Session?
            </h4>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to delete &quot;{sessionToDelete.video_name}&quot;? All associated ReID detections and dwell events will be permanently removed.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={Boolean(deletingId)}
                className="rounded-lg bg-destructive px-4 py-1.5 text-xs font-semibold text-white hover:bg-destructive/90 shadow-sm"
              >
                {deletingId ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-destructive/40 bg-card p-6 shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Reset All Analytics Data?
            </h4>
            <p className="text-xs text-muted-foreground">
              This will wipe all sessions, timeline occurrences, and visitor records from the database. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetAll}
                disabled={isResetting}
                className="rounded-lg bg-destructive px-4 py-1.5 text-xs font-semibold text-white hover:bg-destructive/90 shadow-sm"
              >
                {isResetting ? 'Clearing...' : 'Clear All Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
