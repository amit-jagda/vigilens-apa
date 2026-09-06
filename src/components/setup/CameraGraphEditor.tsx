'use client';

import React, { useState } from 'react';
import {
  GitFork,
  ArrowRight,
  ArrowLeftRight,
  Plus,
  Trash2,
  Link2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Zap,
} from 'lucide-react';
import type { CameraNode, CameraNodeLink } from '@/types/advancedpeopleanalytics';

interface CameraGraphEditorProps {
  cameras: CameraNode[];
  links: CameraNodeLink[];
  onCreateLink: (data: {
    from_camera_id: string;
    to_camera_id: string;
    min_transit_time_seconds: number;
    avg_transit_time_seconds: number;
    max_transit_time_seconds: number;
    is_bidirectional: boolean;
  }) => Promise<void>;
  onDeleteLink: (linkId: string) => Promise<void>;
}

export function CameraGraphEditor({
  cameras,
  links,
  onCreateLink,
  onDeleteLink,
}: CameraGraphEditorProps) {
  const [fromCameraId, setFromCameraId] = useState('');
  const [toCameraId, setToCameraId] = useState('');
  const [minTransit, setMinTransit] = useState(5);
  const [avgTransit, setAvgTransit] = useState(30);
  const [maxTransit, setMaxTransit] = useState(120);
  const [isBidirectional, setIsBidirectional] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromCameraId || !toCameraId || fromCameraId === toCameraId) return;

    setIsSubmitting(true);
    try {
      await onCreateLink({
        from_camera_id: fromCameraId,
        to_camera_id: toCameraId,
        min_transit_time_seconds: Number(minTransit),
        avg_transit_time_seconds: Number(avgTransit),
        max_transit_time_seconds: Number(maxTransit),
        is_bidirectional: isBidirectional,
      });
      setToCameraId('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCameraName = (id: string) => cameras.find((c) => c.id === id)?.name || id.slice(0, 8);

  // Group connected and isolated cameras
  const connectedCameraIds = new Set<string>();
  links.forEach((l) => {
    connectedCameraIds.add(l.from_camera_id);
    connectedCameraIds.add(l.to_camera_id);
  });

  const connectedCameras = cameras.filter((c) => connectedCameraIds.has(c.id));
  const isolatedCameras = cameras.filter((c) => !connectedCameraIds.has(c.id));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div>
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <GitFork className="h-4 w-4 text-primary" /> Camera Walkway Graph & Transit Windows
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Optionally connect cameras that share physical footpaths. Isolated cameras without links are fully supported.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-sky-500/10 border border-sky-500/30 px-2.5 py-1 text-xs font-semibold text-sky-400">
            {links.length} Active Link{links.length === 1 ? '' : 's'}
          </span>
          <span className="rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {isolatedCameras.length} Isolated
          </span>
        </div>
      </div>

      {/* Add Path Form */}
      <form onSubmit={handleAddLink} className="rounded-xl border border-border bg-accent/20 p-4 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <Link2 className="h-4 w-4 text-primary" /> Connect Two Cameras
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">From Camera (Origin)</label>
            <select
              value={fromCameraId}
              onChange={(e) => setFromCameraId(e.target.value)}
              required
              className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select origin...</option>
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  📷 {c.name} {c.is_entry_point ? '(Entry Point)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">To Camera (Destination)</label>
            <select
              value={toCameraId}
              onChange={(e) => setToCameraId(e.target.value)}
              required
              className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select destination...</option>
              {cameras
                .filter((c) => c.id !== fromCameraId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    📷 {c.name} {c.is_entry_point ? '(Entry Point)' : ''}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Avg Transit Time</label>
            <div className="flex items-center">
              <input
                type="number"
                min={1}
                value={avgTransit}
                onChange={(e) => setAvgTransit(Number(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-[11px] text-muted-foreground ml-1.5">sec</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Max Transit Window</label>
            <div className="flex items-center">
              <input
                type="number"
                min={1}
                value={maxTransit}
                onChange={(e) => setMaxTransit(Number(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-[11px] text-muted-foreground ml-1.5">sec</span>
            </div>
          </div>

          <div className="flex flex-col justify-end gap-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="bidi"
                checked={isBidirectional}
                onChange={(e) => setIsBidirectional(e.target.checked)}
                className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
              />
              <label htmlFor="bidi" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                Two-way (Bidirectional)
              </label>
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !fromCameraId || !toCameraId}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 shadow-md shadow-primary/20"
            >
              <Plus className="h-3.5 w-3.5" /> Add Connection
            </button>
          </div>
        </div>
      </form>

      {/* Active Paths Grid */}
      <div className="space-y-3">
        <h5 className="text-xs font-bold text-foreground flex items-center justify-between">
          <span>Connected Walkway Paths ({links.length})</span>
          {links.length > 0 && (
            <span className="text-[11px] text-muted-foreground font-normal">
              Click the trash icon to disconnect any link
            </span>
          )}
        </h5>

        {links.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {links.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-xs transition-all hover:border-sky-500/40"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">📷 {getCameraName(link.from_camera_id)}</span>
                  {link.is_bidirectional ? (
                    <ArrowLeftRight className="h-3.5 w-3.5 text-sky-400" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5 text-sky-400" />
                  )}
                  <span className="font-bold text-foreground">📷 {getCameraName(link.to_camera_id)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-sky-300 font-mono bg-sky-500/20 px-1.5 py-0.5 rounded">
                    ~{link.avg_transit_time_seconds || 30}s
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteLink(link.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded hover:bg-destructive/10"
                    title="Remove connection"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-accent/10 p-5 text-center text-xs text-muted-foreground">
            No camera walkways linked yet. All cameras will function as standalone / isolated nodes.
          </div>
        )}
      </div>

      {/* Standalone / Isolated Cameras Status */}
      {isolatedCameras.length > 0 && (
        <div className="rounded-xl border border-border bg-accent/20 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <h5 className="text-xs font-bold text-foreground">
              Isolated / Standalone Cameras ({isolatedCameras.length})
            </h5>
          </div>
          <p className="text-[11px] text-muted-foreground">
            These cameras are not connected to other walkways. They will track people and extract ReID identities independently. Links are completely optional.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {isolatedCameras.map((cam) => (
              <span
                key={cam.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground"
              >
                <span>📷 {cam.name}</span>
                {cam.is_entry_point && (
                  <span className="rounded bg-emerald-500/20 px-1 text-[8px] text-emerald-400 font-bold uppercase">
                    Entry
                  </span>
                )}
                <span className="rounded bg-slate-700/50 px-1 text-[8px] text-slate-300 font-mono">
                  Standalone
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
