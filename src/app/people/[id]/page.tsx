'use client';

import React, { useState, useEffect, Suspense } from 'react';
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
  UserCheck,
  UserPlus,
  Building2,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getPersonTimeline,
  listPeopleDirectory,
  registerOrUpdateVisitor,
  deleteVisitorIdentity,
} from '@/lib/api/advancedpeopleanalytics';
import { listEmployees, getEmployeePhotoUrl } from '@/lib/api/employees';
import { JourneyPathway } from '@/components/people/JourneyPathway';
import { HourlyDwellChart } from '@/components/people/HourlyDwellChart';
import { getMediaCropUrl } from '@/lib/apiClient';
import { formatDwellTime } from '@/lib/utils';
import type {
  PersonSummaryItem,
  PersonTimelineResponse,
} from '@/types/advancedpeopleanalytics';
import type { Employee } from '@/types/employees';

function PersonJourneyContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const personId = params?.id as string;
  const initialPersonType = (searchParams?.get('type') || 'visitor') as 'employee' | 'visitor';

  const [currentPersonId, setCurrentPersonId] = useState<string>(personId);
  const [currentPersonType, setCurrentPersonType] = useState<'employee' | 'visitor'>(initialPersonType);
  const [personInfo, setPersonInfo] = useState<PersonSummaryItem | null>(null);
  const [timelineData, setTimelineData] = useState<PersonTimelineResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Register Modal
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regRole, setRegRole] = useState<'visitor' | 'employee'>('visitor');
  const [regEmpCode, setRegEmpCode] = useState('');
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingPerson, setIsDeletingPerson] = useState(false);

  const handleDeleteVisitorProfile = async () => {
    setIsDeletingPerson(true);
    try {
      const res = await deleteVisitorIdentity(currentPersonId);
      toast.success(res?.message || 'Visitor profile deleted successfully');
      router.replace('/people');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete visitor profile');
      setIsDeletingPerson(false);
      setIsDeleteConfirmOpen(false);
    }
  };

  useEffect(() => {
    if (personId) setCurrentPersonId(personId);
  }, [personId]);

  useEffect(() => {
    if (searchParams?.get('type')) {
      setCurrentPersonType(searchParams.get('type') as 'employee' | 'visitor');
    }
  }, [searchParams]);

  useEffect(() => {
    if (currentPersonId) {
      loadPersonAndJourney();
    }
    loadEmployees();
  }, [currentPersonId, currentPersonType]);

  const loadEmployees = async () => {
    setIsLoadingEmployees(true);
    try {
      const res = await listEmployees();
      if (res?.data && Array.isArray(res.data)) {
        setEmployeesList(res.data);
      }
    } catch (err) {
      console.error('Failed to load employees', err);
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const loadPersonAndJourney = async (overrideType?: 'employee' | 'visitor', overrideId?: string) => {
    const activeType = overrideType || currentPersonType;
    const activeId = overrideId || currentPersonId;
    setIsLoading(true);
    try {
      // 1. Fetch Timeline
      const timelineRes = await getPersonTimeline(activeType, activeId);
      if (timelineRes?.data) {
        setTimelineData(timelineRes.data);
      }

      // 2. Fetch Person Directory metadata
      const peopleRes = await listPeopleDirectory({ search: activeId });
      let found = peopleRes?.data?.find((p) => p.person_id === activeId || (p as any).identity_id === activeId);
      if (!found && peopleRes?.data && peopleRes.data.length > 0) {
        found = peopleRes.data[0];
      }
      if (found) {
        setPersonInfo(found);
        if (found.person_type) {
          setCurrentPersonType(found.person_type);
        }
      }
    } catch (err: any) {
      toast.error('Failed to load person journey details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenRegisterModal = () => {
    const parts = (personInfo?.name || '').split(' ');
    setRegFirstName(parts[0] || '');
    setRegLastName(parts.slice(1).join(' ') || '');
    setRegRole('employee'); // default to employee role as user is promoting visitor
    setSelectedEmployeeId('');
    setRegEmpCode('');
    setIsRegisterModalOpen(true);
    loadEmployees();
  };

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmployeeId(empId);
    if (empId && empId !== '__NEW__') {
      const emp = employeesList.find((e) => e.id === empId);
      if (emp) {
        setRegFirstName(emp.first_name || '');
        setRegLastName(emp.last_name || '');
        setRegEmpCode(emp.employee_code || '');
      }
    } else if (empId === '__NEW__') {
      const parts = (personInfo?.name || '').split(' ');
      setRegFirstName(parts[0] || '');
      setRegLastName(parts.slice(1).join(' ') || '');
      setRegEmpCode('');
    }
  };

  const handleSaveRegistration = async () => {
    setIsSubmittingReg(true);
    try {
      if (regRole === 'visitor') {
        if (!regFirstName.trim()) {
          toast.error('Please enter a first name');
          setIsSubmittingReg(false);
          return;
        }

        const res = await registerOrUpdateVisitor({
          identity_id: currentPersonId,
          first_name: regFirstName.trim(),
          last_name: regLastName.trim(),
          registration_type: 'visitor',
        });

        const fullName = `${regFirstName.trim()} ${regLastName.trim()}`.trim();
        setPersonInfo((prev) =>
          prev
            ? {
                ...prev,
                name: fullName,
                person_type: 'visitor',
              }
            : null
        );

        setIsRegisterModalOpen(false);
        toast.success(res?.message || 'Visitor updated successfully');
        await loadPersonAndJourney('visitor', currentPersonId);
      } else {
        // Employee
        if (!selectedEmployeeId) {
          toast.error('Please select an existing employee or choose to register a new one');
          setIsSubmittingReg(false);
          return;
        }

        if (selectedEmployeeId === '__NEW__') {
          if (!regFirstName.trim()) {
            toast.error('Please enter a first name');
            setIsSubmittingReg(false);
            return;
          }
          if (!regEmpCode.trim()) {
            toast.error('Employee ID code is required');
            setIsSubmittingReg(false);
            return;
          }

          const res = await registerOrUpdateVisitor({
            identity_id: currentPersonId,
            first_name: regFirstName.trim(),
            last_name: regLastName.trim(),
            registration_type: 'employee',
            employee_code: regEmpCode.trim(),
            retroactive_attendance: true,
          });

          const fullName = `${regFirstName.trim()} ${regLastName.trim()}`.trim();
          const newId = res?.data?.employee_id || currentPersonId;

          setPersonInfo((prev) =>
            prev
              ? {
                  ...prev,
                  name: fullName,
                  person_type: 'employee',
                  person_id: newId,
                  employee_code: regEmpCode.trim(),
                }
              : null
          );

          setCurrentPersonType('employee');
          setCurrentPersonId(newId);
          setIsRegisterModalOpen(false);
          toast.success(res?.message || 'Employee registered successfully');
          router.replace(`/people/${newId}?type=employee`);
          await loadPersonAndJourney('employee', newId);
        } else {
          // Link Existing Employee
          const selectedEmp = employeesList.find((e) => e.id === selectedEmployeeId);
          const res = await registerOrUpdateVisitor({
            identity_id: currentPersonId,
            registration_type: 'link_existing_employee',
            existing_employee_id: selectedEmployeeId,
            retroactive_attendance: true,
            force: true,
          });

          const fullName = selectedEmp
            ? `${selectedEmp.first_name} ${selectedEmp.last_name}`
            : regFirstName;
          const targetId = res?.data?.employee_id || selectedEmployeeId;

          setPersonInfo((prev) =>
            prev
              ? {
                  ...prev,
                  name: fullName,
                  person_type: 'employee',
                  person_id: targetId,
                  employee_code: selectedEmp?.employee_code || prev.employee_code,
                }
              : null
          );

          setCurrentPersonType('employee');
          setCurrentPersonId(targetId);
          setIsRegisterModalOpen(false);
          toast.success(res?.message || 'Visitor linked to employee successfully');
          router.replace(`/people/${targetId}?type=employee`);
          await loadPersonAndJourney('employee', targetId);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update identity');
    } finally {
      setIsSubmittingReg(false);
    }
  };

  if (isLoading && !timelineData && !personInfo) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayName = personInfo?.name || (currentPersonType === 'employee' ? 'Staff Member' : `Visitor #${currentPersonId.slice(0, 8)}`);
  const isEmployee = currentPersonType === 'employee';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Bar: Navigation & Action */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          type="button"
          onClick={() => router.push('/people')}
          className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back to People Directory
        </button>

        {!isEmployee && (
          <button
            type="button"
            onClick={() => setIsDeleteConfirmOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/20 transition-all shadow-sm cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete Visitor Profile
          </button>
        )}
      </div>

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
                  {currentPersonType.toUpperCase()}
                </span>
                {personInfo?.employee_code && (
                  <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-mono text-foreground font-semibold">
                    ID: {personInfo.employee_code}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground font-mono">UUID: {currentPersonId}</p>

              {!isEmployee && (
                <div className="mt-2.5 flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleOpenRegisterModal}
                    className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Assign Name / Register as Employee
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete Profile
                  </button>
                </div>
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

      {/* Hourly Area Dwell Time Bar Chart */}
      <HourlyDwellChart
        personId={currentPersonId}
        personName={displayName}
      />

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

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">Role</label>
                <select
                  value={regRole}
                  onChange={(e) => {
                    const newRole = e.target.value as 'visitor' | 'employee';
                    setRegRole(newRole);
                    if (newRole === 'visitor') {
                      setSelectedEmployeeId('');
                    }
                  }}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="employee">Employee (Registered Staff)</option>
                  <option value="visitor">Visitor (Guest / Recurring)</option>
                </select>
              </div>

              {regRole === 'employee' && (
                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Select Existing Employee *
                  </label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => handleSelectEmployee(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- Choose Existing Employee --</option>
                    <option value="__NEW__">✨ + Register as New Employee...</option>
                    {Array.isArray(employeesList) && employeesList.length > 0 && (
                      <optgroup label="Registered Employees">
                        {employeesList.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.first_name} {emp.last_name} ({emp.employee_code})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>

                  {/* Selected Employee Preview Card */}
                  {selectedEmployeeId && selectedEmployeeId !== '__NEW__' && (
                    <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center gap-3">
                      {(() => {
                        const emp = Array.isArray(employeesList)
                          ? employeesList.find((e) => e.id === selectedEmployeeId)
                          : undefined;
                        return (
                          <>
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-emerald-500/40 bg-background">
                              {emp?.photo_path ? (
                                <img
                                  src={getEmployeePhotoUrl(emp.photo_path)}
                                  alt={emp.first_name || 'Staff'}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-accent text-muted-foreground font-bold text-xs">
                                  {emp?.first_name?.[0] || 'E'}
                                  {emp?.last_name?.[0] || ''}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-foreground truncate">
                                  {emp?.first_name} {emp?.last_name}
                                </p>
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              </div>
                              <p className="text-[11px] text-muted-foreground font-mono">
                                ID: {emp?.employee_code || 'N/A'}
                              </p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* New Employee Fields */}
                  {selectedEmployeeId === '__NEW__' && (
                    <div className="mt-3 space-y-3 p-3 rounded-xl border border-border bg-accent/10">
                      <div>
                        <label className="block font-semibold text-foreground mb-1">First Name *</label>
                        <input
                          type="text"
                          value={regFirstName}
                          placeholder="e.g. Alex"
                          onChange={(e) => setRegFirstName(e.target.value)}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-foreground mb-1">Last Name</label>
                        <input
                          type="text"
                          value={regLastName}
                          placeholder="e.g. Morgan"
                          onChange={(e) => setRegLastName(e.target.value)}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

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
                    </div>
                  )}
                </div>
              )}

              {regRole === 'visitor' && (
                <>
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
                </>
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
                {isSubmittingReg
                  ? 'Saving...'
                  : regRole === 'employee' && selectedEmployeeId && selectedEmployeeId !== '__NEW__'
                  ? 'Link to Employee'
                  : 'Save Identity'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Visitor Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-destructive/30 bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-destructive">
              <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Delete Visitor Profile</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanent action
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete <strong className="text-foreground">{displayName}</strong>? All associated multi-camera tracks, spatio-temporal journey events, and attendance history will be permanently deleted.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                disabled={isDeletingPerson}
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingPerson}
                onClick={handleDeleteVisitorProfile}
                className="rounded-lg bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {isDeletingPerson ? 'Deleting...' : 'Delete Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PersonJourneyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground text-sm font-medium">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            Loading individual journey...
          </div>
        </div>
      }
    >
      <PersonJourneyContent />
    </Suspense>
  );
}
