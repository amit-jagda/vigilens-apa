'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Search,
  Calendar,
  X,
  RefreshCw,
  UserCheck2,
  Timer,
  Camera,
  Filter,
  BarChart3,
  UserCheck,
} from 'lucide-react';
import { usePeopleStore } from '@/stores/peopleStore';
import { PersonCard } from '@/components/people/PersonCard';
import { DailyCheckinModal } from '@/components/people/DailyCheckinModal';
import { ReviewQueueBanner } from '@/components/people/ReviewQueueBanner';
import { HourlyDwellChart } from '@/components/people/HourlyDwellChart';
import type { PersonSummaryItem } from '@/types/advancedpeopleanalytics';

export default function PeopleDirectoryPage() {
  const router = useRouter();
  const {
    people,
    isLoading,
    roleFilter,
    dateFilter,
    searchQuery,
    showHourlyAnalytics,
    isDailyCheckinOpen,
    setRoleFilter,
    setDateFilter,
    setSearchQuery,
    setShowHourlyAnalytics,
    setIsDailyCheckinOpen,
    fetchPeople,
    deleteVisitor,
  } = usePeopleStore();

  const handleDeleteVisitor = async (person: PersonSummaryItem) => {
    await deleteVisitor(person.person_id);
  };

  useEffect(() => {
    fetchPeople();
  }, [roleFilter, dateFilter]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      fetchPeople(true);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner & Metric Badges */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> People & Journeys Directory
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Explore individuals detected across camera nodes, total dwell times, and multi-camera pathways
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="rounded-xl border border-border bg-accent/30 px-3 py-2 text-xs">
            <span className="text-[10px] text-muted-foreground block font-semibold">Total People</span>
            <span className="text-sm font-bold text-foreground">{people.length}</span>
          </div>
          <div className="rounded-xl border border-border bg-accent/30 px-3 py-2 text-xs">
            <span className="text-[10px] text-muted-foreground block font-semibold">Staff Confirmed</span>
            <span className="text-sm font-bold text-emerald-400">
              {people.filter((p) => p.person_type === 'employee').length}
            </span>
          </div>
          <div className="rounded-xl border border-border bg-accent/30 px-3 py-2 text-xs">
            <span className="text-[10px] text-muted-foreground block font-semibold">Tracked Visitors</span>
            <span className="text-sm font-bold text-amber-400">
              {people.filter((p) => p.person_type === 'visitor').length}
            </span>
          </div>

          {/* Action Buttons */}
          <button
            type="button"
            onClick={() => setShowHourlyAnalytics(!showHourlyAnalytics)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
              showHourlyAnalytics
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                : 'border-border bg-accent/20 text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart3 className="h-4 w-4" /> Hourly Dwell
          </button>

          <button
            type="button"
            onClick={() => setIsDailyCheckinOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-cyan-500 shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
          >
            <UserCheck className="h-4 w-4" /> Daily Check-In
          </button>
        </div>
      </div>

      {/* Human-in-the-Loop Review Queue */}
      <ReviewQueueBanner targetDate={dateFilter} onReconciled={fetchPeople} />

      {/* Area Hourly Dwell Distribution Chart (collapsible) */}
      {showHourlyAnalytics && (
        <div className="animate-in fade-in duration-200">
          <HourlyDwellChart initialDate={dateFilter} />
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search input */}
          <div className="relative flex items-center md:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, ID, or UUID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full rounded-xl border border-input bg-background pl-9 pr-9 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  fetchPeople(true);
                }}
                className="absolute right-3 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Roles (Staff & Visitors)</option>
              <option value="employee">Staff / Employees Only</option>
              <option value="visitor">Visitors Only</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="relative flex items-center">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-xl border border-input bg-background pl-9 pr-8 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="absolute right-3 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* People Grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : people.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {people.map((person) => (
            <PersonCard
              key={`${person.person_type}-${person.person_id}`}
              person={person}
              onViewJourney={(p) =>
                router.push(`/people/${p.person_id}?type=${p.person_type}`)
              }
              onDelete={handleDeleteVisitor}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-accent/10 p-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-foreground">No Person Profiles Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            No visitors or staff match your current filters. Try changing your search query or uploading new footage.
          </p>
        </div>
      )}

      {/* Daily Appearance & Face Check-In Modal */}
      <DailyCheckinModal
        isOpen={isDailyCheckinOpen}
        onClose={() => setIsDailyCheckinOpen(false)}
        onSuccess={() => fetchPeople()}
      />
    </div>
  );
}
