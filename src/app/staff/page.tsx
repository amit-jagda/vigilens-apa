/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import {
  Users,
  Loader2,
  RotateCcw,
  X,
  UserPlus,
  CalendarDays,
  Pencil,
  Trash2,
  Camera,
  UserCircle2,
  Eye,
  Clock,
} from 'lucide-react';
import {
  getEmployeePhotoUrl,
} from '@/lib/api/employees';
import type { AttendanceLog, Employee } from '@/types/employees';
import { useAttendanceStore } from '@/stores/attendanceStore';

// ─────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatDateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function formatTimeOnly(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function formatGroupDateHeader(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDwell(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  }
  return `${m}m ${s}s`;
}

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0 && m === 0) {
    return '< 1m';
  }
  if (h > 0) {
    return `${h}h ${m}`;
  }
  return `${m}m`;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ─────────────────────────────────────────────
// Page tabs (Employees & Attendance Logs only)
// ─────────────────────────────────────────────

type Tab = 'employees' | 'logs';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'logs', label: 'Attendance Logs', icon: CalendarDays },
];

// ─────────────────────────────────────────────
// EMPLOYEES TAB
// ─────────────────────────────────────────────

function EmployeesTab() {
  const {
    employees,
    employeesLoading,
    employeeSearch,
    drawerOpen,
    editTarget,
    saving,
    deleteConfirm,
    firstName,
    lastName,
    empCode,
    photoPreview,
    setEmployeeSearch,
    setDrawerOpen,
    setDeleteConfirm,
    setFirstName,
    setLastName,
    setEmpCode,
    setPhotoFile,
    fetchEmployees,
    openRegister,
    openEdit,
    saveEmployee,
    deleteEmployee,
    todayLogs,
  } = useAttendanceStore();

  const [previewEmp, setPreviewEmp] = useState<Employee | null>(null);

  const { getRootProps: getPhotoRootProps, getInputProps: getPhotoInputProps } =
    useDropzone({
      accept: {
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/webp': ['.webp'],
        'image/heic': ['.heic'],
        'image/heif': ['.heif'],
      },
      maxFiles: 1,
      onDrop: ([file]) => {
        if (!file) return;
        setPhotoFile(file, URL.createObjectURL(file));
      },
    });

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const filtered = employees.filter((e) =>
    `${e.first_name} ${e.last_name} ${e.employee_code}`
      .toLowerCase()
      .includes(employeeSearch.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <input
          value={employeeSearch}
          onChange={(e) => setEmployeeSearch(e.target.value)}
          placeholder="Search by name or code…"
          className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary"
        />
        <button
          onClick={openRegister}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
        >
          <UserPlus className="h-4 w-4" />
          Register Employee
        </button>
        <button
          onClick={fetchEmployees}
          className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
          title="Refresh"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Grid */}
      {employeesLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card">
          <Users className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {employees.length === 0
              ? 'No employees registered yet.'
              : 'No results match your search.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-accent/20 text-xs font-semibold text-muted-foreground">
                <th className="w-16 px-6 py-4">Photo</th>
                <th className="px-6 py-4">Full Name</th>
                <th className="px-6 py-4">Employee Code</th>
                <th className="px-6 py-4">Hours Today</th>
                <th className="px-6 py-4">Date Registered</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {filtered.map((emp) => (
                <tr
                  key={emp.id}
                  className="group transition-colors hover:bg-accent/30"
                >
                  <td className="px-6 py-3 whitespace-nowrap">
                    <button
                      onClick={() => emp.photo_path && setPreviewEmp(emp)}
                      disabled={!emp.photo_path}
                      className={cn(
                        'group relative block h-10 w-10 overflow-hidden rounded-full border border-border bg-accent/40 text-left transition-all outline-none',
                        emp.photo_path
                          ? 'cursor-pointer hover:border-primary/60 hover:shadow-md'
                          : 'cursor-default',
                      )}
                    >
                      {emp.photo_path ? (
                        <>
                          <img
                            src={getEmployeePhotoUrl(emp.photo_path)}
                            alt={`${emp.first_name} ${emp.last_name}`}
                            className="h-full w-full object-cover object-top"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                            <Eye className="h-4 w-4 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <UserCircle2 className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 font-semibold whitespace-nowrap text-foreground">
                    {emp.first_name} {emp.last_name}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs whitespace-nowrap text-primary font-bold">
                    {emp.employee_code}
                  </td>
                  <td className="px-6 py-4 text-xs whitespace-nowrap text-foreground">
                    {(() => {
                      const empLogs = todayLogs.filter(
                        (log) => log.employee.id === emp.id,
                      );
                      if (empLogs.length === 0)
                        return <span className="text-muted-foreground">—</span>;
                      const totalSeconds = empLogs.reduce(
                        (sum, log) => sum + (log.dwell_time || 0),
                        0,
                      );
                      return (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-400">
                          {formatHours(totalSeconds)}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 text-xs whitespace-nowrap text-muted-foreground">
                    {formatDateOnly(emp.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(emp)}
                        className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary cursor-pointer"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(emp)}
                        className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Register / Edit Drawer */}
      <>
        <div
          className={cn(
            'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
            drawerOpen
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0',
          )}
          onClick={() => setDrawerOpen(false)}
        />
        <div
          className={cn(
            'fixed top-0 right-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-border bg-card shadow-2xl transition-transform duration-300 ease-in-out',
            drawerOpen ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                <UserPlus className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {editTarget ? 'Edit Employee' : 'Register Employee'}
              </p>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {/* Photo upload */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Face Photo (Required for ReID)
              </label>
              <div
                {...getPhotoRootProps()}
                className="relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-4 transition-colors hover:border-primary/50 hover:bg-accent/20"
              >
                <input {...getPhotoInputProps()} />
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="h-24 w-24 rounded-full border-2 border-primary/40 object-cover"
                  />
                ) : (
                  <>
                    <Camera className="h-8 w-8 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground text-center">
                      Click or drag a clear portrait face photo
                    </p>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                First Name
              </label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. John"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Last Name
              </label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Doe"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Employee Code
              </label>
              <input
                value={empCode}
                onChange={(e) => setEmpCode(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary font-mono"
                placeholder="e.g. EMP101"
              />
            </div>
          </div>

          <div className="border-t border-border p-5">
            <button
              onClick={saveEmployee}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editTarget ? 'Save Changes' : 'Register Employee'}
            </button>
          </div>
        </div>
      </>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-destructive/30 bg-card shadow-2xl">
            <div className="h-1 bg-gradient-to-r from-rose-600 to-rose-400" />
            <div className="space-y-4 p-6">
              <p className="font-semibold text-foreground">Delete Employee?</p>
              <p className="text-sm text-muted-foreground">
                This will permanently remove{' '}
                <strong className="text-foreground">
                  {deleteConfirm.first_name} {deleteConfirm.last_name}
                </strong>{' '}
                and their face embeddings.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteEmployee(deleteConfirm)}
                  className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Photo Preview Modal */}
      {previewEmp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setPreviewEmp(null)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1 bg-gradient-to-r from-primary to-primary/60" />
            <div className="relative flex flex-col items-center gap-4 p-6">
              <button
                onClick={() => setPreviewEmp(null)}
                className="absolute top-3 right-3 cursor-pointer rounded-lg p-1.5 text-muted-foreground outline-none hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="flex w-full items-center gap-2 self-start border-b border-border pb-2 text-sm font-bold text-foreground">
                <Eye className="h-4 w-4 text-primary" />
                Employee Profile Photo
              </h3>

              <div className="relative h-48 w-48 overflow-hidden rounded-2xl border-4 border-border bg-background shadow-2xl">
                <img
                  src={getEmployeePhotoUrl(previewEmp.photo_path || '')}
                  alt={`${previewEmp.first_name} ${previewEmp.last_name}`}
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="w-full space-y-2 rounded-xl border border-border bg-accent/20 p-4 text-xs">
                <div className="flex items-center justify-between gap-4">
                  <span className="shrink-0 text-muted-foreground">Full Name:</span>
                  <span className="w-full truncate text-right font-semibold text-foreground">
                    {previewEmp.first_name} {previewEmp.last_name}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="shrink-0 text-muted-foreground">
                    Employee Code:
                  </span>
                  <span className="text-right font-mono font-semibold text-foreground select-all">
                    {previewEmp.employee_code}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date Registered:</span>
                  <span className="text-foreground">
                    {formatDateOnly(previewEmp.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ATTENDANCE LOGS TAB
// ─────────────────────────────────────────────

function AttendanceLogsTab() {
  const {
    startDate,
    endDate,
    logs,
    logsLoading: loading,
    setStartDate,
    setEndDate,
    fetchLogs,
  } = useAttendanceStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [lastFetchedRange, setLastFetchedRange] = useState({
    start: startDate,
    end: endDate,
  });
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const today = toDateInputValue(new Date());

  useEffect(() => {
    const initFetch = async () => {
      await fetchLogs();
      setHasFetchedOnce(true);
      setLastFetchedRange({ start: startDate, end: endDate });
    };
    initFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchLogs]);

  const isDirty =
    startDate !== lastFetchedRange.start || endDate !== lastFetchedRange.end;
  const isDateInvalid = Boolean(startDate && endDate && startDate > endDate);
  const isButtonEnabled = (!hasFetchedOnce || isDirty) && !isDateInvalid;

  const handleFetch = async () => {
    if (isDateInvalid) return;
    await fetchLogs();
    setHasFetchedOnce(true);
    setLastFetchedRange({ start: startDate, end: endDate });
  };

  const filteredLogs = logs.filter((log) => {
    const fullName =
      `${log.employee?.first_name || ''} ${log.employee?.last_name || ''}`.toLowerCase();
    const code = (log.employee?.employee_code || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || code.includes(query);
  });

  // Group filtered logs date-wise (descending by date and entry time)
  const groupedLogs = useMemo(() => {
    const groups: {
      [dateKey: string]: {
        dateStr: string;
        logs: AttendanceLog[];
        totalDwell: number;
        uniqueEmployees: Set<string>;
      };
    } = {};

    const sorted = [...filteredLogs].sort((a, b) => {
      const timeA = new Date(a.employee_entry_timestamp).getTime();
      const timeB = new Date(b.employee_entry_timestamp).getTime();
      return timeB - timeA;
    });

    sorted.forEach((log) => {
      const entryDate = log.employee_entry_timestamp
        ? log.employee_entry_timestamp.split('T')[0]
        : 'Unknown Date';
      if (!groups[entryDate]) {
        groups[entryDate] = {
          dateStr: entryDate,
          logs: [],
          totalDwell: 0,
          uniqueEmployees: new Set(),
        };
      }
      groups[entryDate].logs.push(log);
      groups[entryDate].totalDwell += log.dwell_time || 0;
      if (log.employee?.id) {
        groups[entryDate].uniqueEmployees.add(log.employee.id);
      }
    });

    return Object.values(groups);
  }, [filteredLogs]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Start Date
            </label>
            <input
              type="date"
              max={today}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={cn(
                'rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none',
                isDateInvalid
                  ? 'border-destructive focus:border-destructive'
                  : 'border-border focus:border-primary',
              )}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              End Date
            </label>
            <input
              type="date"
              max={today}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={cn(
                'rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none',
                isDateInvalid
                  ? 'border-destructive focus:border-destructive'
                  : 'border-border focus:border-primary',
              )}
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">
              Search Employee
            </label>
            <input
              type="text"
              placeholder="Search by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={handleFetch}
            disabled={!isButtonEnabled || loading}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors cursor-pointer',
              isButtonEnabled
                ? 'bg-primary hover:bg-primary/90'
                : 'cursor-not-allowed bg-accent text-muted-foreground',
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarDays className="h-4 w-4" />
            )}
            Fetch Logs
          </button>
        </div>

        {/* Validation & Sync Messages */}
        {(isDateInvalid || (isDirty && !isDateInvalid)) && (
          <div className="text-xs">
            {isDateInvalid && (
              <span className="font-medium text-destructive">
                ⚠️ Start date cannot be after end date.
              </span>
            )}
            {isDirty && !isDateInvalid && (
              <span className="animate-pulse font-medium text-amber-400">
                ⚠️ Date range modified. Click &quot;Fetch Logs&quot; to update
                results.
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-semibold text-muted-foreground">
            Attendance Logs ({filteredLogs.length} Records across {groupedLogs.length} Days)
          </p>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center rounded-xl border border-border bg-card">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-xl border border-border bg-card">
            <p className="text-sm text-muted-foreground">
              No attendance records match your search criteria.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedLogs.map((group) => (
              <div
                key={group.dateStr}
                className="rounded-xl border border-border bg-card overflow-hidden shadow-sm"
              >
                {/* Date Group Header Banner */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-accent/30 px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                      <CalendarDays className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-foreground">
                        {formatGroupDateHeader(group.dateStr)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-md bg-accent/80 px-2 py-0.5 font-medium text-muted-foreground border border-border/80">
                      👥 {group.uniqueEmployees.size}{' '}
                      {group.uniqueEmployees.size === 1 ? 'Employee' : 'Employees'}
                    </span>
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-400 border border-emerald-500/20">
                      ⏱ Total: {formatDwell(group.totalDwell)}
                    </span>
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 font-bold text-primary border border-primary/20">
                      {group.logs.length}{' '}
                      {group.logs.length === 1 ? 'Check-in' : 'Check-ins'}
                    </span>
                  </div>
                </div>

                {/* Date Group Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-accent/10">
                        {[
                          'Employee',
                          'Code',
                          'Entry Time',
                          'Exit Time',
                          'Dwell Time',
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-2.5 text-left font-semibold text-muted-foreground"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {group.logs.map((log) => (
                        <tr
                          key={log.id}
                          className="transition-colors hover:bg-accent/30"
                        >
                          <td className="px-4 py-3 font-semibold text-foreground">
                            <div className="flex items-center gap-2">
                              {log.employee?.photo_path ? (
                                <img
                                  src={getEmployeePhotoUrl(log.employee.photo_path)}
                                  alt=""
                                  className="h-6 w-6 rounded-full object-cover border border-border shrink-0"
                                />
                              ) : (
                                <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                                  {log.employee?.first_name?.[0] || 'E'}
                                </div>
                              )}
                              <span>
                                {log.employee?.first_name || '—'}{' '}
                                {log.employee?.last_name || ''}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-muted-foreground font-semibold">
                            {log.employee?.employee_code || '—'}
                          </td>
                          <td className="px-4 py-3 font-mono font-medium text-foreground">
                            <span className="inline-flex items-center gap-1 rounded bg-accent/60 px-1.5 py-0.5 border border-border/60">
                              <Clock className="h-2.5 w-2.5 text-primary" />
                              {formatTimeOnly(log.employee_entry_timestamp)}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-foreground">
                            {log.employee_exit_timestamp ? (
                              <span className="inline-flex items-center gap-1 rounded bg-accent/60 px-1.5 py-0.5 border border-border/60">
                                <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                                {formatTimeOnly(log.employee_exit_timestamp)}
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-[11px] border border-emerald-500/20">
                                Present
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-primary font-bold">
                            {formatDwell(log.dwell_time)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN DASHBOARD PAGE
// ─────────────────────────────────────────────

export default function StaffPage() {
  const [tab, setTab] = useState<Tab>('employees');

  return (
    <div className="w-full space-y-6 max-w-7xl mx-auto p-6 md:p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Staff & Attendance Directory</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage employee profiles, enroll face templates for ReID matching, and track daily attendance logs.
          </p>
        </div>
      </div>

      {/* Tab Bar (Only Employees and Attendance Logs) */}
      <div className="flex gap-1 rounded-xl border border-border bg-card p-1 max-w-md">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id as Tab)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all cursor-pointer',
              tab === id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {tab === 'employees' && <EmployeesTab />}
      {tab === 'logs' && <AttendanceLogsTab />}
    </div>
  );
}
