'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Scissors,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface VideoTimeRangeTrimmerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoPreviewUrl: string;
  enableTimeRange: boolean;
  setEnableTimeRange: (val: boolean) => void;
  startTimeSec: number | null;
  setStartTimeSec: (val: number | null) => void;
  endTimeSec: number | null;
  setEndTimeSec: (val: number | null) => void;
  formatSecondsToTime: (sec: number | null | undefined) => string;
  parseTimeToSeconds: (val: string) => number | null;
}

export function VideoTimeRangeTrimmer({
  videoRef,
  videoPreviewUrl,
  enableTimeRange,
  setEnableTimeRange,
  startTimeSec,
  setStartTimeSec,
  endTimeSec,
  setEndTimeSec,
  formatSecondsToTime,
  parseTimeToSeconds,
}: VideoTimeRangeTrimmerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [videoDuration, setVideoDuration] = useState<number>(30);
  const [currentPlayhead, setCurrentPlayhead] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'playhead' | null>(null);

  // Sync duration and playhead from preview video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration) && video.duration > 0) {
        setVideoDuration(video.duration);
        if (endTimeSec === null || endTimeSec > video.duration) {
          setEndTimeSec(Math.ceil(video.duration));
        }
      }
    };

    const handleTimeUpdate = () => {
      setCurrentPlayhead(video.currentTime || 0);
    };

    if (video.duration && !isNaN(video.duration) && video.duration > 0) {
      setVideoDuration(video.duration);
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoRef, videoPreviewUrl]);

  const isAtStart = startTimeSec === null || startTimeSec <= 0.2;
  const isAtEnd = endTimeSec === null || (videoDuration > 0 && endTimeSec >= Math.floor(videoDuration));

  const effectiveStart = isAtStart ? 0 : Math.max(0, Math.min(startTimeSec, videoDuration));
  const effectiveEnd = isAtEnd ? videoDuration : Math.max(effectiveStart + 0.5, Math.min(endTimeSec, videoDuration));
  const subclipDuration = isAtStart && isAtEnd ? Math.round(videoDuration) : Math.max(0, Math.round(effectiveEnd - effectiveStart));

  const startPercent = isAtStart ? 0 : (videoDuration > 0 ? (effectiveStart / videoDuration) * 100 : 0);
  const endPercent = isAtEnd ? 100 : (videoDuration > 0 ? (effectiveEnd / videoDuration) * 100 : 100);

  // Handle pointer down / drag calculations
  const handlePointerMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const xOffset = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const ratio = rect.width > 0 ? xOffset / rect.width : 0;
      const newTime = Math.round(ratio * videoDuration);

      if (isDragging === 'start') {
        const isDraggingToFarLeft = ratio <= 0.03 || xOffset <= 8;
        const boundedStart = isDraggingToFarLeft
          ? 0
          : Math.max(0, Math.min(newTime, Math.floor(effectiveEnd) - 1));
        setStartTimeSec(isDraggingToFarLeft ? 0 : boundedStart);
        if (videoRef.current) {
          videoRef.current.currentTime = boundedStart;
        }
      } else if (isDragging === 'end') {
        const isDraggingToFarRight = ratio >= 0.96 || (rect.width > 0 && xOffset >= rect.width - 10);
        const boundedEnd = isDraggingToFarRight
          ? Math.ceil(videoDuration)
          : Math.max(Math.ceil(effectiveStart) + 1, Math.min(newTime, Math.ceil(videoDuration)));
        setEndTimeSec(isDraggingToFarRight ? Math.ceil(videoDuration) : boundedEnd);
        if (videoRef.current) {
          videoRef.current.currentTime = isDraggingToFarRight ? videoDuration : boundedEnd;
        }
      }
    },
    [isDragging, videoDuration, effectiveStart, effectiveEnd, setStartTimeSec, setEndTimeSec, videoRef]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove);
      window.addEventListener('touchend', handlePointerUp);
    }
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    const clickTime = Math.round(ratio * videoDuration);

    if (videoRef.current) {
      videoRef.current.currentTime = clickTime;
    }
  };

  const handleApplyPreset = (durationSec: number) => {
    setEnableTimeRange(true);
    setStartTimeSec(0);
    const targetEnd = Math.min(Math.ceil(videoDuration), durationSec);
    setEndTimeSec(targetEnd);
    toast.success(`Sub-clip set to 00:00 - ${formatSecondsToTime(targetEnd)}`);
  };

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card/80 p-5 shadow-sm space-y-4">
      {/* Header with Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Scissors className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">Video Timeline / Sub-Clip Trimmer</span>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/20">
                Custom Range
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Drag the golden handles on the filmstrip to analyze only a specific section of the video
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-muted-foreground">
            {enableTimeRange ? 'Sub-Clip Active' : 'Analyze Entire Video'}
          </span>
          <button
            type="button"
            onClick={() => {
              const nextState = !enableTimeRange;
              setEnableTimeRange(nextState);
              if (nextState && endTimeSec === null) {
                setEndTimeSec(Math.ceil(videoDuration));
              }
            }}
            className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
              enableTimeRange ? 'bg-amber-500' : 'bg-muted-foreground/30'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                enableTimeRange ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {enableTimeRange && (
        <div className="space-y-4 pt-1 animate-in fade-in duration-200">
          {/* VISUAL TIMELINE FILMSTRIP TRIMMER */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-mono text-[11px] flex items-center gap-1">
                <span>00:00</span>
                <span className="text-muted-foreground/60">•</span>
                <span>Total: {formatSecondsToTime(videoDuration)}</span>
              </span>

              {/* Dynamic Live Sub-Clip Duration Pill */}
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 text-amber-950 px-3 py-0.5 text-xs font-black shadow-md">
                <span>✂️ Trimmed: {subclipDuration}s ({formatSecondsToTime(subclipDuration)})</span>
              </div>
            </div>

            {/* Filmstrip Bar Container */}
            <div
              ref={trackRef}
              onClick={handleTrackClick}
              className="relative h-14 w-full select-none rounded-xl bg-slate-950 border-2 border-slate-700/80 cursor-pointer group shadow-inner"
            >
              {/* Inner clipping layer for filmstrip ticks and dimmed regions */}
              <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
                {/* Simulated Filmstrip Frame Ticks / Grid */}
                <div className="absolute inset-0 flex items-center justify-between px-1 opacity-25">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="h-full border-r border-dashed border-white/40 flex-1 flex flex-col justify-between py-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/30 self-center" />
                      <div className="w-1.5 h-1.5 rounded-full bg-white/30 self-center" />
                    </div>
                  ))}
                </div>

                {/* Dimmed Left Overlay (Excluded Region Before Start) */}
                <div
                  className="absolute top-0 bottom-0 left-0 bg-black/80 backdrop-blur-[1px] border-r border-amber-500/60 transition-all duration-75"
                  style={{ width: `${startPercent}%` }}
                />

                {/* Dimmed Right Overlay (Excluded Region After End) */}
                <div
                  className="absolute top-0 bottom-0 right-0 bg-black/80 backdrop-blur-[1px] border-l border-amber-500/60 transition-all duration-75"
                  style={{ width: `${100 - endPercent}%` }}
                />
              </div>

              {/* ACTIVE SELECTION WINDOW (Golden Frame with Integrated Handles) */}
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-10"
                style={{
                  left: `${startPercent}%`,
                  width: `${Math.max(0, endPercent - startPercent)}%`,
                }}
              >
                {/* Connecting Golden Borders & Highlight Region strictly between handles */}
                <div className="absolute top-0 bottom-0 left-6.5 right-6.5 border-y-2 border-amber-400 bg-amber-400/20 shadow-[0_0_16px_rgba(245,158,11,0.35)]" />

                {/* LEFT DRAG HANDLE ( < ) */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsDragging('start');
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    setIsDragging('start');
                  }}
                  className="absolute top-0 bottom-0 left-0 z-20 flex w-6.5 items-center justify-center rounded-l-[10px] bg-amber-400 text-amber-950 shadow-md cursor-ew-resize hover:bg-amber-300 active:bg-amber-200 pointer-events-auto transition-colors"
                  title="Drag to adjust Start Time"
                >
                  <ChevronLeft className="h-4 w-4 stroke-[3.5] shrink-0" />
                </div>

                {/* Duration Floating Tag Inside Window */}
                {subclipDuration > 0 && (
                  <div className="absolute top-1 left-8 rounded bg-black/85 px-1.5 py-0.5 text-[10px] font-mono font-bold text-amber-300 border border-amber-400/40 pointer-events-none shadow whitespace-nowrap z-25">
                    {subclipDuration}s
                  </div>
                )}

                {/* RIGHT DRAG HANDLE ( > ) */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsDragging('end');
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    setIsDragging('end');
                  }}
                  className="absolute top-0 bottom-0 right-0 z-20 flex w-6.5 items-center justify-center rounded-r-[10px] bg-amber-400 text-amber-950 shadow-md cursor-ew-resize hover:bg-amber-300 active:bg-amber-200 pointer-events-auto transition-colors"
                  title="Drag to adjust End Time"
                >
                  <ChevronRight className="h-4 w-4 stroke-[3.5] shrink-0" />
                </div>
              </div>
            </div>
          </div>

          {/* PRECISE INPUTS & QUICK ACTION SHORTCUTS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {/* Start Time Box */}
            <div className="rounded-xl border border-border bg-card p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span>Start Timestamp</span>
                </label>
                {videoPreviewUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      if (videoRef.current) {
                        const cur = Math.floor(videoRef.current.currentTime);
                        setStartTimeSec(cur);
                        toast.success(`Start set to ${formatSecondsToTime(cur)}`);
                      }
                    }}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="h-2.5 w-2.5 fill-current" /> Set Current
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="00:00"
                  value={formatSecondsToTime(effectiveStart)}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      setStartTimeSec(0);
                    } else {
                      const secs = parseTimeToSeconds(val);
                      if (secs !== null) {
                        setStartTimeSec(Math.min(secs, effectiveEnd - 1));
                      }
                    }
                  }}
                  className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
            </div>

            {/* End Time Box */}
            <div className="rounded-xl border border-border bg-card p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span>End Timestamp</span>
                </label>
                {videoPreviewUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      if (videoRef.current) {
                        const cur = Math.ceil(videoRef.current.currentTime);
                        setEndTimeSec(cur);
                        toast.success(`End set to ${formatSecondsToTime(cur)}`);
                      }
                    }}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="h-2.5 w-2.5 fill-current" /> Set Current
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="05:00"
                  value={formatSecondsToTime(effectiveEnd)}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      setEndTimeSec(Math.ceil(videoDuration));
                    } else {
                      const secs = parseTimeToSeconds(val);
                      if (secs !== null) {
                        setEndTimeSec(Math.max(effectiveStart + 1, Math.min(secs, Math.ceil(videoDuration))));
                      }
                    }
                  }}
                  className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
            </div>

            {/* Quick Trim Preset Chips */}
            <div className="sm:col-span-2 lg:col-span-1 rounded-xl border border-border bg-accent/20 p-3 space-y-1.5 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Quick Trim Presets
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleApplyPreset(30)}
                  className="rounded-lg bg-card border border-border/80 px-2 py-1 text-[11px] font-semibold text-foreground hover:border-amber-400 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  First 30s
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(60)}
                  className="rounded-lg bg-card border border-border/80 px-2 py-1 text-[11px] font-semibold text-foreground hover:border-amber-400 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  First 1m
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(180)}
                  className="rounded-lg bg-card border border-border/80 px-2 py-1 text-[11px] font-semibold text-foreground hover:border-amber-400 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  First 3m
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStartTimeSec(0);
                    setEndTimeSec(Math.ceil(videoDuration));
                    toast.success('Reset to entire footage');
                  }}
                  className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-2 py-1 text-[11px] font-bold text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" /> Full Video
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
