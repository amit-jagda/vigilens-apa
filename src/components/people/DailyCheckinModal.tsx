'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  Shirt,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  UserCheck,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { listEmployees } from '@/lib/api/employees';
import { dailyEmployeeCheckin } from '@/lib/api/advancedpeopleanalytics';
import type { Employee } from '@/types/employees';
import type { DailyCheckinResponse } from '@/types/advancedpeopleanalytics';

interface DailyCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (res: DailyCheckinResponse) => void;
  initialEmployeeId?: string;
}

export function DailyCheckinModal({
  isOpen,
  onClose,
  onSuccess,
  initialEmployeeId,
}: DailyCheckinModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(initialEmployeeId || '');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [checkinDate, setCheckinDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [facePreview, setFacePreview] = useState<string | null>(null);

  const [appearanceFile, setAppearanceFile] = useState<File | null>(null);
  const [appearancePreview, setAppearancePreview] = useState<string | null>(null);

  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<DailyCheckinResponse | null>(null);

  const faceInputRef = useRef<HTMLInputElement>(null);
  const appearanceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadEmployees();
      if (initialEmployeeId) {
        setSelectedEmployeeId(initialEmployeeId);
      }
    } else {
      resetForm();
    }
  }, [isOpen, initialEmployeeId]);

  const loadEmployees = async () => {
    setIsLoadingEmployees(true);
    try {
      const res = await listEmployees();
      if (res?.data) {
        setEmployees(res.data);
      }
    } catch (err) {
      toast.error('Failed to load active employees');
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const resetForm = () => {
    setSelectedEmployeeId(initialEmployeeId || '');
    setEmployeeSearch('');
    setFaceFile(null);
    setFacePreview(null);
    setAppearanceFile(null);
    setAppearancePreview(null);
    setIsSubmitting(false);
    setResult(null);
  };

  const handleFaceChange = (file: File | null) => {
    if (!file) {
      setFaceFile(null);
      setFacePreview(null);
      return;
    }
    setFaceFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setFacePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleAppearanceChange = (file: File | null) => {
    if (!file) {
      setAppearanceFile(null);
      setAppearancePreview(null);
      return;
    }
    setAppearanceFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setAppearancePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      toast.error('Please select an employee');
      return;
    }
    if (!faceFile) {
      toast.error('Face photo is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('face_image', faceFile);
      if (appearanceFile) {
        formData.append('appearance_image', appearanceFile);
      }
      if (checkinDate) {
        formData.append('checkin_date', checkinDate);
      }

      const res = await dailyEmployeeCheckin(selectedEmployeeId, formData);
      if (res.data) {
        setResult(res.data);
        toast.success(res.data.message || 'Check-in anchored successfully!');
        if (onSuccess) onSuccess(res.data);
      } else {
        toast.error(res.message || 'Failed to submit check-in');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred during check-in');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const filteredEmployees = employees.filter((emp) => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    const code = (emp.employee_code || '').toLowerCase();
    const query = employeeSearch.toLowerCase();
    return fullName.includes(query) || code.includes(query);
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200 select-none overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl transition-all my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Gradient */}
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 p-5 bg-card/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground tracking-tight">
                Daily Appearance Check-In
              </h2>
              <p className="text-xs text-muted-foreground">
                Anchor face & outfit embeddings for top-down ceiling tracking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {result ? (
            /* Success Summary State */
            <div className="space-y-6 py-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-3 shadow-inner">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  Check-In Successfully Anchored!
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  {result.message}
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Employee</span>
                  <span className="font-semibold text-foreground">
                    {result.employee_name} {result.employee_code ? `(${result.employee_code})` : ''}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Date</span>
                  <span className="font-mono text-foreground">{result.checkin_date}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">ArcFace Anchor</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      result.face_registered
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {result.face_registered ? 'Registered' : 'Skipped'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Today's Outfit (OSNet)</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      result.appearance_anchored
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {result.appearance_anchored ? 'Anchored' : 'None Provided'}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  Check In Another Employee
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-cyan-500 shadow-md shadow-cyan-600/20 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Check-In Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Employee Selection */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Select Employee <span className="text-rose-400">*</span>
                </label>
                {isLoadingEmployees ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
                    Loading employees...
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search employee name or code..."
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background/50 focus:outline-none focus:border-cyan-500 transition-colors text-foreground"
                      />
                    </div>
                    <select
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card focus:outline-none focus:border-cyan-500 transition-colors text-foreground"
                    >
                      <option value="">-- Choose Employee --</option>
                      {filteredEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} {emp.employee_code ? `(${emp.employee_code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Checkin Date */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Target Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="date"
                    value={checkinDate}
                    onChange={(e) => setCheckinDate(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-card focus:outline-none focus:border-cyan-500 transition-colors text-foreground"
                  />
                </div>
              </div>

              {/* Two Photo Inputs: Face (Required) & Appearance (Optional) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Face Photo (Required) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5 text-cyan-400" />
                      Face Photo <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[10px] font-medium text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                      Required
                    </span>
                  </div>

                  <input
                    type="file"
                    ref={faceInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFaceChange(e.target.files?.[0] || null)}
                  />

                  {facePreview ? (
                    <div className="relative group rounded-xl border border-border/80 overflow-hidden bg-muted/40 aspect-square flex items-center justify-center">
                      <img
                        src={facePreview}
                        alt="Face Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2 text-white">
                        <p className="text-[11px] font-medium truncate max-w-[90%]">
                          {faceFile?.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleFaceChange(null)}
                          className="px-2.5 py-1 bg-rose-600/80 hover:bg-rose-600 rounded-lg text-[10px] font-semibold transition-colors"
                        >
                          Change Photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => faceInputRef.current?.click()}
                      className="cursor-pointer border-2 border-dashed border-border/80 hover:border-cyan-500/60 rounded-xl p-4 text-center aspect-square flex flex-col items-center justify-center transition-colors bg-muted/20 hover:bg-cyan-500/[0.02]"
                    >
                      <UploadCloud className="h-8 w-8 text-muted-foreground group-hover:text-cyan-400 mb-2" />
                      <p className="text-xs font-medium text-foreground">Click to upload Face</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        High-res frontal face
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. Outfit / Appearance Photo (Optional) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Shirt className="h-3.5 w-3.5 text-indigo-400" />
                      Today's Outfit
                    </label>
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      Optional
                    </span>
                  </div>

                  <input
                    type="file"
                    ref={appearanceInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleAppearanceChange(e.target.files?.[0] || null)}
                  />

                  {appearancePreview ? (
                    <div className="relative group rounded-xl border border-border/80 overflow-hidden bg-muted/40 aspect-square flex items-center justify-center">
                      <img
                        src={appearancePreview}
                        alt="Appearance Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2 text-white">
                        <p className="text-[11px] font-medium truncate max-w-[90%]">
                          {appearanceFile?.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleAppearanceChange(null)}
                          className="px-2.5 py-1 bg-rose-600/80 hover:bg-rose-600 rounded-lg text-[10px] font-semibold transition-colors"
                        >
                          Change Photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => appearanceInputRef.current?.click()}
                      className="cursor-pointer border-2 border-dashed border-border/80 hover:border-indigo-500/60 rounded-xl p-4 text-center aspect-square flex flex-col items-center justify-center transition-colors bg-muted/20 hover:bg-indigo-500/[0.02]"
                    >
                      <Shirt className="h-8 w-8 text-muted-foreground group-hover:text-indigo-400 mb-2" />
                      <p className="text-xs font-medium text-foreground">Click to upload Outfit</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Full-body outfit (OSNet)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Helpful Hint Callout */}
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-cyan-200/90 leading-relaxed">
                  <strong>Daily Bridge:</strong> Uploading the employee's photo anchors today's appearance.
                  Downwards-facing ceiling cameras will recognize them across all zones even when their face is turned away.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedEmployeeId || !faceFile}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-cyan-600/20 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Anchoring Embeddings...
                    </>
                  ) : (
                    'Anchor Daily Appearance'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
