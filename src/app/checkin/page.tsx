/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  UserCheck,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Camera,
  Shirt,
  CheckCircle2,
  Clock,
  User,
  Eye,
  X,
  Layers,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { listDailyCheckins } from '@/lib/api/advancedpeopleanalytics';
import { listEmployees, getEmployeePhotoUrl } from '@/lib/api/employees';
import { DailyCheckinModal } from '@/components/people/DailyCheckinModal';
import type { DailyCheckinRecord } from '@/types/advancedpeopleanalytics';
import type { Employee } from '@/types/employees';

export default function DailyCheckinPage() {
  const [checkins, setCheckins] = useState<DailyCheckinRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter States
  const [dateFilter, setDateFilter] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [anchorTypeFilter, setAnchorTypeFilter] = useState<'all' | 'both' | 'face_only'>('all');

  // Modal States
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

  // Helper date presets
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [checkinRes, empRes] = await Promise.all([
        listDailyCheckins({
          checkin_date: dateFilter || undefined,
          employee_id: selectedEmployeeId !== 'all' ? selectedEmployeeId : undefined,
        }),
        listEmployees()
      ]);

      if (checkinRes?.data) {
        setCheckins(checkinRes.data);
      }
      if (empRes?.data) {
        setEmployees(empRes.data);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch daily check-ins');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateFilter, selectedEmployeeId]);

  // Client-side filtering
  const filteredCheckins = useMemo(() => {
    return checkins.filter((item) => {
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = item.employee_name.toLowerCase().includes(query);
        const codeMatch = item.employee_code?.toLowerCase().includes(query) || false;
        if (!nameMatch && !codeMatch) return false;
      }

      // Anchor type filter
      if (anchorTypeFilter === 'both' && (!item.face_anchored || !item.appearance_anchored)) {
        return false;
      }
      if (anchorTypeFilter === 'face_only' && item.appearance_anchored) {
        return false;
      }

      return true;
    });
  }, [checkins, searchQuery, anchorTypeFilter]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = checkins.length;
    const todayCount = checkins.filter((c) => c.checkin_date === todayStr).length;
    const faceCount = checkins.filter((c) => c.face_anchored).length;
    const outfitCount = checkins.filter((c) => c.appearance_anchored).length;
    return { total, todayCount, faceCount, outfitCount };
  }, [checkins, todayStr]);

  const formatDisplayDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatDisplayTime = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 bg-background text-foreground min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                Daily Appearance Check-Ins
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Daily Anchor Suite
                </span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Browse and verify morning staff face and outfit anchors across all recorded dates
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
            title="Refresh check-in records"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsCheckinModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Anchor Daily Check-In</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Check-Ins */}
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Total Check-Ins</span>
            <Layers className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            Across all recorded dates
          </div>
        </div>

        {/* Checked In Today */}
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Checked In Today</span>
            <Calendar className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{stats.todayCount}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {todayStr}
          </div>
        </div>

        {/* ArcFace Face Anchors */}
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">ArcFace Locks</span>
            <Camera className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-400">{stats.faceCount}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            512-D facial vectors active
          </div>
        </div>

        {/* OSNet Outfit Anchors */}
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Outfit ReID Locks</span>
            <Shirt className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">{stats.outfitCount}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Ceiling camera appearance anchors
          </div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="rounded-2xl border border-border/70 bg-card/40 p-4 backdrop-blur-md space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground mr-1.5 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Date:
            </span>
            <button
              onClick={() => setDateFilter('')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                dateFilter === ''
                  ? 'bg-cyan-500 text-white font-semibold shadow-sm'
                  : 'bg-card border border-border hover:bg-muted text-muted-foreground'
              }`}
            >
              All Dates
            </button>
            <button
              onClick={() => setDateFilter(todayStr)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                dateFilter === todayStr
                  ? 'bg-cyan-500 text-white font-semibold shadow-sm'
                  : 'bg-card border border-border hover:bg-muted text-muted-foreground'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter(yesterdayStr)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                dateFilter === yesterdayStr
                  ? 'bg-cyan-500 text-white font-semibold shadow-sm'
                  : 'bg-card border border-border hover:bg-muted text-muted-foreground'
              }`}
            >
              Yesterday
            </button>
          </div>

          {/* Custom Date Input */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-xs text-muted-foreground hover:text-foreground underline decoration-dotted p-1"
                title="Clear date filter"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/50">
          {/* Employee Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search employee name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-card focus:outline-none focus:border-cyan-500 transition-colors text-foreground"
            />
          </div>

          {/* Employee Dropdown Filter */}
          <div>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card focus:outline-none focus:border-cyan-500 transition-colors text-foreground"
            >
              <option value="all">All Employees ({employees.length})</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} {emp.employee_code ? `(${emp.employee_code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Anchor Type Filter */}
          <div>
            <select
              value={anchorTypeFilter}
              onChange={(e) => setAnchorTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card focus:outline-none focus:border-cyan-500 transition-colors text-foreground"
            >
              <option value="all">All Anchor Types</option>
              <option value="both">Face + Outfit (Complete)</option>
              <option value="face_only">Face Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content: Check-In Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-cyan-500" />
          <p className="text-xs text-muted-foreground font-medium">Loading daily check-in records...</p>
        </div>
      ) : filteredCheckins.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/20 p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <UserCheck className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">No Daily Check-Ins Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              {dateFilter
                ? `No staff appearance check-ins were registered for ${formatDisplayDate(dateFilter)}.`
                : 'No employee daily check-in records found. Start by anchoring an employee for today.'}
            </p>
          </div>
          <button
            onClick={() => setIsCheckinModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Anchor New Check-In</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Showing <strong className="text-foreground">{filteredCheckins.length}</strong> check-in record(s)
            </span>
            {dateFilter && (
              <span className="font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                Filtered: {dateFilter}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCheckins.map((item) => (
              <div
                key={item.id}
                className="group rounded-2xl border border-border/70 bg-card hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/[0.03] transition-all overflow-hidden flex flex-col justify-between"
              >
                {/* Card Header */}
                <div className="p-4 border-b border-border/50 bg-card/70">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative h-11 w-11 shrink-0 rounded-xl overflow-hidden border border-border/80 bg-muted/40 flex items-center justify-center">
                        {item.employee_photo ? (
                          <img
                            src={item.employee_photo.startsWith('http') ? item.employee_photo : `http://localhost:8000/${item.employee_photo.replace(/^[\/\\]+/, '')}`}
                            alt={item.employee_name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              // Fallback icon on image error
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <User className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-foreground group-hover:text-cyan-400 transition-colors">
                          {item.employee_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.employee_code && (
                            <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {item.employee_code}
                            </span>
                          )}
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDisplayTime(item.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Date Badge */}
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium bg-muted/60 text-foreground border border-border/60">
                        <Calendar className="h-3 w-3 text-cyan-400" />
                        {item.checkin_date}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Body: Side-by-side Face & Outfit Previews */}
                <div className="p-4 space-y-3 flex-1">
                  <div className="grid grid-cols-2 gap-3">
                    {/* 1. Face Anchor Image */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-muted-foreground flex items-center gap-1">
                          <Camera className="h-3 w-3 text-cyan-400" /> Face
                        </span>
                        <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
                          ArcFace
                        </span>
                      </div>

                      <div
                        onClick={() =>
                          setPreviewImage({
                            url: item.face_photo_url.startsWith('http')
                              ? item.face_photo_url
                              : `http://localhost:8000/${item.face_photo_url.replace(/^[\/\\]+/, '')}`,
                            title: `${item.employee_name} — Face Anchor`,
                            subtitle: `Recorded on ${item.checkin_date}`
                          })
                        }
                        className="cursor-pointer relative group/img rounded-xl border border-border/80 overflow-hidden bg-black/40 aspect-square flex items-center justify-center hover:border-cyan-500/60 transition-all"
                      >
                        <img
                          src={item.face_photo_url.startsWith('http') ? item.face_photo_url : `http://localhost:8000/${item.face_photo_url.replace(/^[\/\\]+/, '')}`}
                          alt="Face Anchor"
                          className="w-full h-full object-cover transition-transform group-hover/img:scale-105 duration-200"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Eye className="h-5 w-5" />
                        </div>
                      </div>
                    </div>

                    {/* 2. Outfit / Appearance Anchor Image */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-muted-foreground flex items-center gap-1">
                          <Shirt className="h-3 w-3 text-purple-400" /> Outfit
                        </span>
                        <span
                          className={`text-[10px] font-medium px-1 py-0.2 rounded ${
                            item.appearance_anchored
                              ? 'text-purple-400 bg-purple-500/10 border border-purple-500/20'
                              : 'text-muted-foreground bg-muted'
                          }`}
                        >
                          {item.appearance_anchored ? 'OSNet ReID' : 'None'}
                        </span>
                      </div>

                      {item.appearance_photo_url ? (
                        <div
                          onClick={() =>
                            setPreviewImage({
                              url: item.appearance_photo_url!.startsWith('http')
                                ? item.appearance_photo_url!
                                : `http://localhost:8000/${item.appearance_photo_url!.replace(/^[\/\\]+/, '')}`,
                              title: `${item.employee_name} — Outfit Anchor`,
                              subtitle: `Recorded on ${item.checkin_date}`
                            })
                          }
                          className="cursor-pointer relative group/img rounded-xl border border-border/80 overflow-hidden bg-black/40 aspect-square flex items-center justify-center hover:border-purple-500/60 transition-all"
                        >
                          <img
                            src={item.appearance_photo_url.startsWith('http') ? item.appearance_photo_url : `http://localhost:8000/${item.appearance_photo_url.replace(/^[\/\\]+/, '')}`}
                            alt="Outfit Anchor"
                            className="w-full h-full object-cover transition-transform group-hover/img:scale-105 duration-200"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Eye className="h-5 w-5" />
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 aspect-square flex flex-col items-center justify-center text-muted-foreground p-2 text-center">
                          <Shirt className="h-6 w-6 opacity-30 mb-1" />
                          <span className="text-[10px]">No outfit image</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer Status */}
                <div className="p-3 bg-muted/20 border-t border-border/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Active CCTV Anchor</span>
                  </div>

                  <span className="text-[11px] text-muted-foreground font-mono">
                    ID: {item.id.slice(0, 8)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Daily Checkin Modal */}
      <DailyCheckinModal
        isOpen={isCheckinModalOpen}
        onClose={() => setIsCheckinModalOpen(false)}
        onSuccess={() => {
          setIsCheckinModalOpen(false);
          loadData(true);
        }}
      />

      {/* Lightbox Photo Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-150 select-none"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-card border border-border/80 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border/60 bg-card/60">
              <div>
                <h3 className="text-sm font-bold text-foreground">{previewImage.title}</h3>
                {previewImage.subtitle && (
                  <p className="text-xs text-muted-foreground">{previewImage.subtitle}</p>
                )}
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 bg-black/80 flex items-center justify-center max-h-[75vh] overflow-hidden">
              <img
                src={previewImage.url}
                alt="Full Preview"
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
