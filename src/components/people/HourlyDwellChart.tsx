'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getHourlyAreaDwell } from '@/lib/api/advancedpeopleanalytics';
import type { HourlyDwellResponse, HourlyAreaDwellItem } from '@/types/advancedpeopleanalytics';

const AREA_COLORS = [
  '#06b6d4', // cyan-500
  '#6366f1', // indigo-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#8b5cf6', // violet-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#3b82f6', // blue-500
];

function formatAxisDuration(secs: number): string {
  if (secs <= 0) return '0s';
  if (secs < 60) return `${Math.round(secs)}s`;
  const mins = Math.floor(secs / 60);
  const remainingSecs = Math.round(secs % 60);
  if (mins < 60) {
    return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`;
  }
  const hrs = (secs / 3600).toFixed(1);
  return `${hrs.endsWith('.0') ? hrs.slice(0, -2) : hrs}h`;
}

function calculateYAxisScale(maxDwellSec: number) {
  if (maxDwellSec <= 0) {
    return {
      maxSec: 10,
      labels: ['10s', '7s', '5s', '2s', '0s'],
    };
  }

  // Set the max scale slightly above the peak value so the peak bar fills nicely near top (~90-95%)
  let targetCeil: number;
  if (maxDwellSec <= 10) {
    targetCeil = Math.max(Math.ceil(maxDwellSec), 1);
  } else if (maxDwellSec <= 30) {
    targetCeil = Math.ceil(maxDwellSec / 5) * 5;
  } else if (maxDwellSec <= 60) {
    targetCeil = Math.ceil(maxDwellSec / 10) * 10;
  } else if (maxDwellSec <= 300) {
    targetCeil = Math.ceil(maxDwellSec / 30) * 30;
  } else if (maxDwellSec <= 1800) {
    targetCeil = Math.ceil(maxDwellSec / 120) * 120;
  } else if (maxDwellSec <= 3600) {
    targetCeil = Math.ceil(maxDwellSec / 300) * 300;
  } else {
    targetCeil = Math.ceil(maxDwellSec / 900) * 900;
  }

  const labels = [
    formatAxisDuration(targetCeil),
    formatAxisDuration(targetCeil * 0.75),
    formatAxisDuration(targetCeil * 0.5),
    formatAxisDuration(targetCeil * 0.25),
    '0s',
  ];

  return {
    maxSec: targetCeil,
    labels,
  };
}

interface HourlyDwellChartProps {
  personId?: string;
  sessionId?: string;
  initialDate?: string;
  personName?: string;
}

export function HourlyDwellChart({
  personId,
  sessionId,
  initialDate,
  personName,
}: HourlyDwellChartProps) {
  const [data, setData] = useState<HourlyDwellResponse | null>(null);
  const [targetDate, setTargetDate] = useState<string>(
    initialDate || new Date().toISOString().split('T')[0]
  );
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [hoveredHour, setHoveredHour] = useState<HourlyAreaDwellItem | null>(null);
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [targetDate, personId, sessionId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await getHourlyAreaDwell({
        target_date: targetDate,
        person_id: personId,
        session_id: sessionId,
      });
      if (res?.data) {
        setData(res.data);
      }
    } catch (err: any) {
      toast.error('Failed to load hourly dwell analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const areaColorMap: Record<string, string> = {};
  if (data?.all_areas) {
    data.all_areas.forEach((area, idx) => {
      areaColorMap[area] = AREA_COLORS[idx % AREA_COLORS.length];
    });
  }

  const items = data?.hourly_data || [];
  const displayItems = showActiveOnly
    ? items.filter((it) => it.total_dwell_seconds > 0)
    : items;

  // Compute summary stats and dynamic Y-axis auto-scale
  const totalDwellSeconds = items.reduce((acc, curr) => acc + curr.total_dwell_seconds, 0);
  const peakDwellSeconds = items.reduce((max, it) => Math.max(max, it.total_dwell_seconds), 0);
  const yAxisScale = calculateYAxisScale(peakDwellSeconds);

  const peakHour = items.reduce<HourlyAreaDwellItem | null>((prev, curr) => {
    if (!prev || curr.total_dwell_seconds > prev.total_dwell_seconds) return curr;
    return prev;
  }, null);

  const formatSecs = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    if (mins >= 60) {
      const hrs = (mins / 60).toFixed(1);
      return `${hrs}h`;
    }
    return `${mins}m ${s}s`;
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xl transition-all">
      {/* Top Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BarChart3 className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-foreground tracking-tight">
              Hourly Area Dwell Time
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {personName ? `Presence timeline for ${personName}` : 'Area occupancy distribution across the day'}{' '}
            • Auto-scaled Y-axis (Peak: {formatSecs(peakDwellSeconds)})
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Toggle Active Hours */}
          <button
            type="button"
            onClick={() => setShowActiveOnly(!showActiveOnly)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
              showActiveOnly
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                : 'bg-muted/40 text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            {showActiveOnly ? 'Active Hours Only' : 'All 24 Hours'}
          </button>

          {/* Date Picker */}
          <div className="relative">
            <Calendar className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="pl-8 pr-2.5 py-1.5 text-xs rounded-xl border border-border bg-background/50 focus:outline-none focus:border-indigo-500 text-foreground"
            />
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="p-1.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh Dwell Analytics"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-5">
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <span className="text-[11px] font-medium text-muted-foreground">Total Dwell Today</span>
          <p className="text-lg font-bold text-foreground mt-0.5">{formatSecs(totalDwellSeconds)}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <span className="text-[11px] font-medium text-muted-foreground">Peak Presence Hour</span>
          <p className="text-lg font-bold text-indigo-400 mt-0.5">
            {peakHour && peakHour.total_dwell_seconds > 0 ? peakHour.hour : '—'}
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1 rounded-xl border border-border/60 bg-muted/20 p-3">
          <span className="text-[11px] font-medium text-muted-foreground">Monitored Areas</span>
          <p className="text-lg font-bold text-cyan-400 mt-0.5">
            {data?.all_areas?.length || 0} zones
          </p>
        </div>
      </div>

      {/* Area Legend */}
      {data?.all_areas && data.all_areas.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap mb-6 px-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Areas:
          </span>
          {data.all_areas.map((area) => (
            <div
              key={area}
              onMouseEnter={() => setHoveredArea(area)}
              onMouseLeave={() => setHoveredArea(null)}
              className={`flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-opacity ${
                hoveredArea && hoveredArea !== area ? 'opacity-30' : 'opacity-100'
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: areaColorMap[area] }}
              />
              <span className="text-foreground">{area}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main Chart Canvas Area */}
      {isLoading ? (
        <div className="h-72 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
            <span>Calculating area dwell times...</span>
          </div>
        </div>
      ) : displayItems.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center rounded-xl border border-dashed border-border text-center p-6">
          <Clock className="h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="text-xs font-medium text-muted-foreground">
            No dwell time events recorded for this date.
          </p>
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            Ensure processed video sessions have timestamps and camera area associations.
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Tooltip Overlay */}
          {hoveredHour && hoveredHour.total_dwell_seconds > 0 && (
            <div className="absolute top-2 right-2 z-20 rounded-xl border border-border/80 bg-card/95 backdrop-blur-md p-3.5 shadow-2xl min-w-[200px] pointer-events-none animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-2">
                <span className="text-xs font-bold text-foreground">{hoveredHour.hour}</span>
                <span className="text-xs font-mono font-bold text-indigo-400">
                  {hoveredHour.formatted_duration}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground mb-2">
                Dwell duration:{' '}
                <span className="font-semibold text-foreground">
                  {formatSecs(hoveredHour.total_dwell_seconds)}
                  {totalDwellSeconds > 0
                    ? ` (${((hoveredHour.total_dwell_seconds / totalDwellSeconds) * 100).toFixed(1)}% of day)`
                    : ''}
                </span>
              </div>
              <div className="space-y-1.5">
                {Object.entries(hoveredHour.areas).map(([area, secs]) => (
                  <div key={area} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: areaColorMap[area] || '#6366f1' }}
                      />
                      <span className="text-muted-foreground truncate max-w-[110px]">{area}</span>
                    </div>
                    <span className="font-mono text-foreground font-medium">
                      {formatSecs(secs)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chart Graphic */}
          <div className="flex items-end h-72 pt-8 pb-6 pl-12 pr-4 relative select-none">
            {/* Y-Axis Grid Lines & Labels */}
            <div className="absolute left-0 top-8 bottom-6 w-10 flex flex-col justify-between text-right text-[10px] font-mono text-muted-foreground select-none">
              {yAxisScale.labels.map((lbl, idx) => (
                <span key={idx}>{lbl}</span>
              ))}
            </div>

            {/* Grid Line Guides */}
            <div className="absolute left-12 right-4 top-8 bottom-6 flex flex-col justify-between pointer-events-none border-b border-border/60">
              <div className="w-full border-b border-dashed border-border/40" />
              <div className="w-full border-b border-dashed border-border/30" />
              <div className="w-full border-b border-dashed border-border/20" />
              <div className="w-full border-b border-dashed border-border/10" />
              <div className="w-full" />
            </div>

            {/* Bars */}
            <div className="flex-1 h-full flex items-end justify-between gap-1 sm:gap-2 z-10">
              {displayItems.map((item) => {
                const totalPct = yAxisScale.maxSec > 0
                  ? Math.min(100, Math.max(0, (item.total_dwell_seconds / yAxisScale.maxSec) * 100))
                  : 0;
                const isHovered = hoveredHour?.hour_int === item.hour_int;

                return (
                  <div
                    key={item.hour_int}
                    onMouseEnter={() => setHoveredHour(item)}
                    onMouseLeave={() => setHoveredHour(null)}
                    className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer relative"
                  >
                    {/* The Stacked Bar */}
                    <div
                      className={`w-full rounded-t-lg overflow-hidden flex flex-col-reverse transition-all duration-200 ${
                        isHovered ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-card scale-y-[1.02]' : ''
                      }`}
                      style={{
                        height: `${totalPct}%`,
                        minHeight: totalPct > 0 ? '4px' : '0px',
                        backgroundColor: totalPct > 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                      }}
                    >
                      {item.total_dwell_seconds > 0 &&
                        Object.entries(item.areas).map(([area, secs]) => {
                          const segPct = (secs / item.total_dwell_seconds) * 100;
                          const isAreaHighlighted =
                            !hoveredArea || hoveredArea === area;

                          return (
                            <div
                              key={area}
                              style={{
                                height: `${segPct}%`,
                                backgroundColor: areaColorMap[area] || '#6366f1',
                                opacity: isAreaHighlighted ? 1 : 0.25,
                              }}
                              className="w-full transition-opacity duration-150 border-t border-black/10 first:border-t-0"
                            />
                          );
                        })}
                    </div>

                    {/* Bottom X-axis label */}
                    <span
                      className={`absolute -bottom-6 text-[9px] sm:text-[10px] font-mono transition-colors truncate ${
                        isHovered || item.total_dwell_seconds > 0
                          ? 'text-foreground font-bold'
                          : 'text-muted-foreground/60'
                      }`}
                    >
                      {String(item.hour_int).padStart(2, '0')}h
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Info className="h-3 w-3 text-muted-foreground" />
              Hover over bars to inspect per-area dwell breakdown.
            </span>
            <span className="font-mono">X: Hour of Day (00h - 23h)</span>
          </div>
        </div>
      )}
    </div>
  );
}
