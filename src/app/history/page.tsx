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
} from 'lucide-react';
import {
  listAnalyticsSessions,
  deleteAdvancedSession,
  resetAnalyticsData,
} from '@/lib/api/advancedpeopleanalytics';
import type { AdvancedAnalyticsSession } from '@/types/advancedpeopleanalytics';

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<AdvancedAnalyticsSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
    <div className="max-w-6xl mx-auto space-y-6">
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
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 shadow-sm"
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
        <div className="grid grid-cols-1 gap-4">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3 transition-all hover:border-primary/40"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Video className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{s.video_name}</h3>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {s.created_at ? new Date(s.created_at).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase ${
                      (s.status || '').toUpperCase() === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : (s.status || '').toUpperCase() === 'PROCESSING'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {s.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => router.push(`/?sessionId=${s.id}`)}
                    className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-sm"
                  >
                    <Eye className="h-3.5 w-3.5" /> View Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionToDelete(s)}
                    className="rounded-xl border border-destructive/30 bg-destructive/10 p-2 text-destructive hover:bg-destructive/20 shadow-sm"
                    title="Delete session"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-xl bg-accent/20 p-2.5">
                  <span className="text-muted-foreground block text-[11px] flex items-center gap-1">
                    <Users className="h-3 w-3 text-primary" /> Total Detections
                  </span>
                  <span className="font-bold text-foreground text-sm mt-0.5 block">
                    {s.total_person_count ?? s.total_people_detected ?? 0}
                  </span>
                </div>

                <div className="rounded-xl bg-accent/20 p-2.5">
                  <span className="text-muted-foreground block text-[11px] flex items-center gap-1">
                    <UserCheck className="h-3 w-3 text-emerald-400" /> Employees
                  </span>
                  <span className="font-bold text-emerald-400 text-sm mt-0.5 block">
                    {s.employee_count ?? s.employees_detected_count ?? 0}
                  </span>
                </div>

                <div className="rounded-xl bg-accent/20 p-2.5">
                  <span className="text-muted-foreground block text-[11px] flex items-center gap-1">
                    <UserPlus className="h-3 w-3 text-amber-400" /> Visitors
                  </span>
                  <span className="font-bold text-amber-400 text-sm mt-0.5 block">
                    {s.visitor_count ?? s.unique_visitors_count ?? 0}
                  </span>
                </div>

                <div className="rounded-xl bg-accent/20 p-2.5">
                  <span className="text-muted-foreground block text-[11px] flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-sky-400" /> Gate In / Out
                  </span>
                  <span className="font-bold text-foreground text-sm mt-0.5 block">
                    {s.entry_count ?? s.line_crossings_in_count ?? 0} / {s.exit_count ?? s.line_crossings_out_count ?? 0}
                  </span>
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
