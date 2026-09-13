'use client';

import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Camera,
  Layers,
  Sparkles,
  Loader2,
  ArrowRight,
  Clock,
  X,
  Trash2,
  ZoomIn,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getReviewQueue,
  reconcileIdentity,
  deleteVisitorIdentity,
} from '@/lib/api/advancedpeopleanalytics';
import { listEmployees } from '@/lib/api/employees';
import { getMediaCropUrl } from '@/lib/apiClient';
import type { ReviewQueueCandidate } from '@/types/advancedpeopleanalytics';
import type { Employee } from '@/types/employees';

interface ReviewQueueBannerProps {
  targetDate?: string;
  onReconciled?: () => void;
}

export function ReviewQueueBanner({ targetDate, onReconciled }: ReviewQueueBannerProps) {
  const [candidates, setCandidates] = useState<ReviewQueueCandidate[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Photo Zoom Preview Modal State
  const [previewPhotoCandidate, setPreviewPhotoCandidate] = useState<ReviewQueueCandidate | null>(null);
  const [isDiscardingId, setIsDiscardingId] = useState<string | null>(null);

  // Reconcile modal/popover state
  const [activeCandidate, setActiveCandidate] = useState<ReviewQueueCandidate | null>(null);
  const [reconcileMode, setReconcileMode] = useState<'employee' | 'visitor'>('employee');
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [visitorName, setVisitorName] = useState<string>('');
  const [autoMerge, setAutoMerge] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleDiscardCandidate = async (identityId: string) => {
    setIsDiscardingId(identityId);
    try {
      await deleteVisitorIdentity(identityId);
      toast.success('Candidate dismissed from review queue');
      setCandidates((prev) => prev.filter((c) => c.identity_id !== identityId));
      if (previewPhotoCandidate?.identity_id === identityId) {
        setPreviewPhotoCandidate(null);
      }
      if (onReconciled) onReconciled();
    } catch (err: any) {
      toast.error('Failed to dismiss candidate');
    } finally {
      setIsDiscardingId(null);
    }
  };

  useEffect(() => {
    loadQueue();
    loadEmployees();
  }, [targetDate]);

  const loadQueue = async () => {
    setIsLoading(true);
    try {
      const res = await getReviewQueue(targetDate);
      if (res?.data) {
        setCandidates(res.data);
      }
    } catch (err) {
      // quiet fail or subtle error
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await listEmployees();
      if (res?.data) {
        setEmployees(res.data);
      }
    } catch (err) {
      // quiet
    }
  };

  const openReconcile = (candidate: ReviewQueueCandidate, mode: 'employee' | 'visitor') => {
    setActiveCandidate(candidate);
    setReconcileMode(mode);
    setSelectedEmpId(candidate.suggested_employee_id || '');
    setVisitorName('');
    setAutoMerge(true);
  };

  const handleReconcileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCandidate) return;

    if (reconcileMode === 'employee' && !selectedEmpId) {
      toast.error('Please select an employee');
      return;
    }
    if (reconcileMode === 'visitor' && !visitorName.trim()) {
      toast.error('Please provide a visitor name');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        target_employee_id: reconcileMode === 'employee' ? selectedEmpId : undefined,
        or_visitor_name: reconcileMode === 'visitor' ? visitorName.trim() : undefined,
        auto_merge_similar: autoMerge,
        similarity_threshold: 0.65,
      };

      const res = await reconcileIdentity(activeCandidate.identity_id, payload);
      if (res?.data) {
        const mergedCount = res.data.merged_identities_count || 0;
        const eventsCount = res.data.updated_events_count || 0;
        toast.success(
          `Reconciled! Merged ${mergedCount} similar visitor card(s) & updated ${eventsCount} event(s) across cameras.`
        );
        setActiveCandidate(null);
        await loadQueue();
        if (onReconciled) onReconciled();
      } else {
        toast.error(res?.message || 'Failed to reconcile identity');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to reconcile');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoading && candidates.length === 0) {
    return null;
  }

  return (
    <>
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 shadow-lg mb-8 transition-all">
        {/* Banner Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-inner">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  Human-in-the-Loop Review Queue
                </h3>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-400 border border-amber-500/30">
                  {candidates.length} Candidate{candidates.length !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Unconfirmed visitor cards detected across cameras. Assign or name them to automatically merge fragmented cards.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-muted transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" /> Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" /> Expand
              </>
            )}
          </button>
        </div>

        {/* Expandable Candidate Grid */}
        {isExpanded && (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-200">
            {candidates.map((cand) => {
              const crop = cand.crop_url ? getMediaCropUrl(cand.crop_url) : null;
              const hasSuggestion =
                cand.suggested_employee_name && cand.suggested_similarity;

              return (
                <div
                  key={cand.identity_id}
                  className="rounded-xl border border-border/80 bg-card/90 backdrop-blur-sm p-4 flex flex-col justify-between hover:border-amber-500/40 transition-all shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    {/* Face / Person Crop - Clickable to Zoom */}
                    <div
                      onClick={() => setPreviewPhotoCandidate(cand)}
                      className="group relative h-14 w-14 rounded-xl border border-border overflow-hidden bg-muted/40 shrink-0 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                      title="Click to view full photo"
                    >
                      {crop ? (
                        <img
                          src={crop}
                          alt="Candidate"
                          className="h-full w-full object-cover transition-transform group-hover:scale-110"
                        />
                      ) : (
                        <UserCheck className="h-6 w-6 text-muted-foreground/50" />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn className="h-4 w-4 text-white drop-shadow" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Camera className="h-3 w-3 text-cyan-400 shrink-0" />
                        <span className="truncate">
                          {cand.cameras_visited?.length
                            ? cand.cameras_visited.join(', ')
                            : '1 Camera'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                        <Clock className="h-3 w-3 text-amber-400 shrink-0" />
                        <span>{cand.camera_stops_count} stops</span>
                      </div>

                      {/* AI Suggestion Chip */}
                      {hasSuggestion && (
                        <div className="mt-1.5 inline-flex items-center gap-1 rounded bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300">
                          <Sparkles className="h-2.5 w-2.5 text-indigo-400" />
                          <span className="truncate max-w-[100px]">
                            {cand.suggested_employee_name}
                          </span>
                          <span className="font-mono text-indigo-400">
                            {Math.round((cand.suggested_similarity || 0) * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openReconcile(cand, 'employee')}
                      className="flex-1 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 px-2 py-1.5 text-[11px] font-semibold text-indigo-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <UserCheck className="h-3 w-3" />
                      Assign Emp
                    </button>
                    <button
                      type="button"
                      onClick={() => openReconcile(cand, 'visitor')}
                      className="flex-1 rounded-lg border border-border hover:bg-muted px-2 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <UserPlus className="h-3 w-3" />
                      Name
                    </button>
                    <button
                      type="button"
                      disabled={isDiscardingId === cand.identity_id}
                      onClick={() => handleDiscardCandidate(cand.identity_id)}
                      className="p-1.5 rounded-lg border border-border/80 hover:border-destructive/50 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                      title="Discard / Dismiss candidate from review queue"
                    >
                      {isDiscardingId === cand.identity_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Photo Zoom Preview Modal */}
      {previewPhotoCandidate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200 select-none"
          onClick={() => setPreviewPhotoCandidate(null)}
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/60 p-4 bg-card/60">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Candidate Footage Crop</h3>
              </div>
              <button
                onClick={() => setPreviewPhotoCandidate(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Large Image Container */}
              <div className="relative max-h-[60vh] min-h-[220px] w-full overflow-hidden rounded-xl bg-black/90 flex items-center justify-center border border-border">
                {previewPhotoCandidate.crop_url ? (
                  <img
                    src={getMediaCropUrl(previewPhotoCandidate.crop_url)}
                    alt="Candidate Full Preview"
                    className="max-h-[60vh] w-full object-contain"
                  />
                ) : (
                  <div className="text-muted-foreground text-xs p-8 text-center">
                    No crop photo available
                  </div>
                )}
              </div>

              {/* Info Badges */}
              <div className="flex items-center justify-between text-xs text-muted-foreground bg-accent/30 p-2.5 rounded-xl border border-border/60">
                <div className="flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="font-medium text-foreground">
                    {previewPhotoCandidate.cameras_visited?.join(', ') || 'Camera 01'}
                  </span>
                  <span>• {previewPhotoCandidate.camera_stops_count} stops</span>
                </div>
                {previewPhotoCandidate.suggested_employee_name && (
                  <span className="text-[11px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                    AI Match: {previewPhotoCandidate.suggested_employee_name} ({Math.round((previewPhotoCandidate.suggested_similarity || 0) * 100)}%)
                  </span>
                )}
              </div>

              {/* Action Buttons in Modal */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => {
                    const cand = previewPhotoCandidate;
                    setPreviewPhotoCandidate(null);
                    openReconcile(cand, 'employee');
                  }}
                  className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <UserCheck className="h-4 w-4" />
                  Assign Employee
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cand = previewPhotoCandidate;
                    setPreviewPhotoCandidate(null);
                    openReconcile(cand, 'visitor');
                  }}
                  className="flex-1 rounded-xl border border-border bg-accent/60 hover:bg-accent text-foreground px-3 py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  Name Visitor
                </button>
                <button
                  type="button"
                  disabled={isDiscardingId === previewPhotoCandidate.identity_id}
                  onClick={() => handleDiscardCandidate(previewPhotoCandidate.identity_id)}
                  className="rounded-xl border border-destructive/30 bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground text-destructive px-3 py-2 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  title="Discard candidate"
                >
                  {isDiscardingId === previewPhotoCandidate.identity_id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span>Discard</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reconcile Modal */}
      {activeCandidate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200 select-none"
          onClick={() => setActiveCandidate(null)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-indigo-500 to-cyan-500" />

            <div className="flex items-center justify-between border-b border-border/60 p-5 bg-card/50">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Reconcile Identity & Merge Cards
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Confirm identity and auto-merge duplicate cards
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveCandidate(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleReconcileSubmit} className="p-6 space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted/40 border border-border">
                <button
                  type="button"
                  onClick={() => setReconcileMode('employee')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    reconcileMode === 'employee'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Existing Employee
                </button>
                <button
                  type="button"
                  onClick={() => setReconcileMode('visitor')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    reconcileMode === 'visitor'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Name as Visitor
                </button>
              </div>

              {reconcileMode === 'employee' ? (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Assign To Employee
                  </label>
                  <select
                    value={selectedEmpId}
                    onChange={(e) => setSelectedEmpId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card focus:outline-none focus:border-indigo-500 text-foreground"
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} {emp.employee_code ? `(${emp.employee_code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Visitor Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Guest Alex"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card focus:outline-none focus:border-indigo-500 text-foreground"
                  />
                </div>
              )}

              {/* Auto-Merge Checkbox */}
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoMerge}
                    onChange={(e) => setAutoMerge(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-foreground">
                      Automatic Cascading Re-Evaluation
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      Automatically sweeps all unassigned cards with similarity ≥ 0.65 across all cameras and merges them into this identity.
                    </p>
                  </div>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveCandidate(null)}
                  disabled={isSubmitting}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-md shadow-indigo-600/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Merging Cards...
                    </>
                  ) : (
                    'Confirm & Re-evaluate'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
