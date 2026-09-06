'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Timer,
  Camera,
  Clock,
  Footprints,
  RefreshCw,
  Edit3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getPersonTimeline,
  listPeopleDirectory,
  registerOrUpdateVisitor,
} from '@/lib/api/advancedpeopleanalytics';
import { JourneyPathway } from '@/components/people/JourneyPathway';
import { getMediaCropUrl } from '@/lib/apiClient';
import { formatDwellTime } from '@/lib/utils';
import type {
  PersonSummaryItem,
  PersonTimelineResponse,
} from '@/types/advancedpeopleanalytics';

export default function PersonJourneyPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const personId = params?.id as string;
  const personType = (searchParams?.get('type') || 'visitor') as 'employee' | 'visitor';

  const [personInfo, setPersonInfo] = useState<PersonSummaryItem | null>(null);
  const [timelineData, setTimelineData] = useState<PersonTimelineResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Register Modal
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regRole, setRegRole] = useState<'visitor' | 'employee'>('visitor');
  const [regEmpCode, setRegEmpCode] = useState('');
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);

  useEffect(() => {
    if (personId) {
      loadPersonAndJourney();
    }
  }, [personId, personType]);

  const loadPersonAndJourney = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Timeline
      const timelineRes = await getPersonTimeline(personType, personId);
      if (timelineRes?.data) {
        setTimelineData(timelineRes.data);
      }

      // 2. Fetch Person Directory metadata
      const peopleRes = await listPeopleDirectory({ search: personId });
      const found = peopleRes?.data?.find((p) => p.person_id === personId);
      if (found) {
        setPersonInfo(found);
      }
    } catch (err: any) {
      toast.error('Failed to load person journey details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRegistration = async () => {
    if (!regFirstName.trim()) {
      toast.error('Please enter a first name');
      return;
    }
    if (regRole === 'employee' && !regEmpCode.trim()) {
      toast.error('Employee ID code is required');
      return;
    }

    setIsSubmittingReg(true);
    try {
      await registerOrUpdateVisitor({
        identity_id: personId,
        first_name: regFirstName.trim(),
        last_name: regLastName.trim(),
        registration_type: regRole,
        employee_code: regEmpCode.trim() || undefined,
      });
      toast.success('Person identity updated successfully');
      setIsRegisterModalOpen(false);
      loadPersonAndJourney();
    } catch (err: any) {
      toast.error('Failed to update identity');
    } finally {
      setIsSubmittingReg(false);
    }
  };

  if (isLoading && !timelineData) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayName = personInfo?.name || (personType === 'employee' ? 'Staff Member' : `Visitor #${personId.slice(0, 8)}`);
  const isEmployee = personType === 'employee';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back Button */}
      <button
        type="button"
        onClick={() => router.push('/people')}
        className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to People Directory
      </button>

      {/* Person Profile Header */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-border/60 pb-6">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-primary/40 bg-background shadow-md">
              {personInfo?.crop_url ? (
                <img
                  src={getMediaCropUrl(personInfo.crop_url)}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-accent/40 text-muted-foreground">
                  <User className="h-9 w-9" />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                    isEmployee
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {personType.toUpperCase()}
                </span>
                {personInfo?.employee_code && (
                  <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-mono text-foreground font-semibold">
                    ID: {personInfo.employee_code}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground font-mono">UUID: {personId}</p>

              {!isEmployee && (
                <button
                  type="button"
                  onClick={() => {
                    const parts = (personInfo?.name || '').split(' ');
                    setRegFirstName(parts[0] || '');
                    setRegLastName(parts.slice(1).join(' ') || '');
                    setIsRegisterModalOpen(true);
                  }}
                  className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                >
                  <Edit3 className="h-3 w-3" /> Assign Name / Register as Employee
                </button>
              )}
            </div>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl border border-border bg-accent/20 px-3.5 py-2.5">
              <span className="text-[11px] text-muted-foreground block flex items-center gap-1">
                <Timer className="h-3.5 w-3.5 text-primary" /> Total Dwell Time
              </span>
              <span className="text-sm font-bold text-foreground mt-0.5 block">
                {formatDwellTime(personInfo?.total_dwell_seconds || 0)}
              </span>
            </div>

            <div className="rounded-xl border border-border bg-accent/20 px-3.5 py-2.5">
              <span className="text-[11px] text-muted-foreground block flex items-center gap-1">
                <Camera className="h-3.5 w-3.5 text-primary" /> Camera Stops
              </span>
              <span className="text-sm font-bold text-foreground mt-0.5 block">
                {personInfo?.camera_stops_count || timelineData?.events.length || 0} Locations
              </span>
            </div>

            <div className="rounded-xl border border-border bg-accent/20 px-3.5 py-2.5 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-muted-foreground block flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-emerald-400" /> Activity Window
              </span>
              <span className="text-xs font-bold text-foreground mt-0.5 block">
                {personInfo?.first_seen_at
                  ? `${new Date(personInfo.first_seen_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })} ➔ ${new Date(personInfo.last_seen_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Chronological Spatio-Temporal Journey History */}
        <div className="mt-6">
          <div className="mb-5">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Footprints className="h-5 w-5 text-primary" /> Spatio-Temporal Multi-Camera Journey Pathway
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ordered chronological track across camera nodes and spatial transit windows
            </p>
          </div>

          {timelineData ? (
            <JourneyPathway timelineData={timelineData} />
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
              No timeline events recorded.
            </div>
          )}
        </div>
      </div>

      {/* Rename / Convert Modal */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="border-b border-border/60 pb-3">
              <h3 className="text-base font-bold text-foreground">Register / Rename Person</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Assign a permanent identity or promote this visitor to Staff/Employee
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">First Name *</label>
                <input
                  type="text"
                  value={regFirstName}
                  onChange={(e) => setRegFirstName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Last Name</label>
                <input
                  type="text"
                  value={regLastName}
                  onChange={(e) => setRegLastName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Role</label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as any)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="visitor">Visitor (Guest / Recurring)</option>
                  <option value="employee">Employee (Registered Staff)</option>
                </select>
              </div>

              {regRole === 'employee' && (
                <div>
                  <label className="block font-semibold text-foreground mb-1">Employee Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. EMP-1042"
                    value={regEmpCode}
                    onChange={(e) => setRegEmpCode(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingReg}
                onClick={handleSaveRegistration}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Save Identity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
