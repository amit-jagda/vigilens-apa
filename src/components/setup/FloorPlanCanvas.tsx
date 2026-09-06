'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  Camera,
  Plus,
  Trash2,
  Move,
  RotateCw,
  Link2,
  MousePointer,
  Sparkles,
  Info,
  Check,
  X,
  Compass,
} from 'lucide-react';
import type { CameraNode, CameraNodeLink } from '@/types/advancedpeopleanalytics';

export type CanvasToolMode = 'select' | 'add' | 'connect';

interface FloorPlanCanvasProps {
  cameras: CameraNode[];
  links?: CameraNodeLink[];
  onAddCameraAtPos?: (x: number, y: number) => void;
  onUpdateCameraPos?: (id: string, x: number, y: number) => void;
  onUpdateCameraAngle?: (id: string, angle: number) => void;
  onSelectCamera?: (camera: CameraNode | null) => void;
  onDeleteCamera?: (id: string) => void;
  onQuickConnect?: (fromId: string, toId: string) => void;
  onDeleteLink?: (linkId: string) => void;
  selectedCameraId?: string;
  floorPlanUrl?: string;
  toolMode?: CanvasToolMode;
  onToolModeChange?: (mode: CanvasToolMode) => void;
}

export function FloorPlanCanvas({
  cameras,
  links = [],
  onAddCameraAtPos,
  onUpdateCameraPos,
  onUpdateCameraAngle,
  onSelectCamera,
  onDeleteCamera,
  onQuickConnect,
  onDeleteLink,
  selectedCameraId,
  floorPlanUrl,
  toolMode: controlledToolMode,
  onToolModeChange,
}: FloorPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalToolMode, setInternalToolMode] = useState<CanvasToolMode>('select');
  const activeMode = controlledToolMode ?? internalToolMode;

  const setMode = (mode: CanvasToolMode) => {
    setInternalToolMode(mode);
    onToolModeChange?.(mode);
    if (mode !== 'connect') {
      setConnectSourceId(null);
    }
  };

  // Dragging camera state
  const [draggingCamId, setDraggingCamId] = useState<string | null>(null);

  // Quick connect state
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);

  // Mouse move / up handlers for drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingCamId || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = ((e.clientX - rect.left) / rect.width) * 100;
      const rawY = ((e.clientY - rect.top) / rect.height) * 100;
      const clampedX = Math.max(3, Math.min(97, Math.round(rawX)));
      const clampedY = Math.max(4, Math.min(96, Math.round(rawY)));
      onUpdateCameraPos?.(draggingCamId, clampedX, clampedY);
    };

    const handleMouseUp = () => {
      if (draggingCamId) {
        setDraggingCamId(null);
      }
    };

    if (draggingCamId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingCamId, onUpdateCameraPos]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingCamId) return;

    if (activeMode === 'add') {
      if (!containerRef.current || !onAddCameraAtPos) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(3, Math.min(97, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
      const y = Math.max(4, Math.min(96, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
      onAddCameraAtPos(x, y);
      // Return to select mode after adding
      setMode('select');
      return;
    }

    if (activeMode === 'select') {
      // Clicked on empty canvas space -> deselect
      onSelectCamera?.(null);
    }
  };

  const handleNodeClick = (e: React.MouseEvent, cam: CameraNode) => {
    e.stopPropagation();

    if (activeMode === 'connect') {
      if (!connectSourceId) {
        setConnectSourceId(cam.id);
      } else if (connectSourceId !== cam.id) {
        onQuickConnect?.(connectSourceId, cam.id);
        setConnectSourceId(null);
        setMode('select');
      }
      return;
    }

    onSelectCamera?.(cam);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, cam: CameraNode) => {
    if (activeMode !== 'select') return;
    if (e.button !== 0) return; // Only left click
    setDraggingCamId(cam.id);
  };

  const handleRotateCam = (e: React.MouseEvent, camId: string, currentAngle: number = 0) => {
    e.stopPropagation();
    const nextAngle = (currentAngle + 45) % 360;
    onUpdateCameraAngle?.(camId, nextAngle);
  };

  // Helper to get camera coordinates
  const getCamCoords = (cam: CameraNode, idx: number) => {
    const x = cam.x_coord !== undefined ? cam.x_coord : 20 + ((idx * 25) % 65);
    const y = cam.y_coord !== undefined ? cam.y_coord : 25 + ((idx * 20) % 55);
    return { x, y };
  };

  // Count links for each camera
  const getCameraLinkCount = (camId: string) => {
    return links.filter((l) => l.from_camera_id === camId || l.to_camera_id === camId).length;
  };

  return (
    <div className="relative flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
      {/* Header with Title & Mode Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
        <div>
          <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" /> Spatial Floor Plan & Camera Layout
          </h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {activeMode === 'select' && 'Select any camera to adjust direction / attributes, or drag to reposition'}
            {activeMode === 'add' && 'Click anywhere on the floor plan grid to place a camera node'}
            {activeMode === 'connect' &&
              (connectSourceId
                ? 'Now click on the destination camera to connect a transit walkway'
                : 'Click on the first camera to begin connecting')}
          </p>
        </div>

        {/* Toolbar Modes */}
        <div className="flex items-center gap-1.5 rounded-xl border border-border bg-accent/40 p-1">
          <button
            type="button"
            onClick={() => setMode('select')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
              activeMode === 'select'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Select, drag, or inspect cameras"
          >
            <MousePointer className="h-3.5 w-3.5 text-primary" />
            <span>Select & Move</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('add')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
              activeMode === 'add'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Click grid to place a new camera"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Place Camera</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('connect')}
            disabled={cameras.length < 2}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all disabled:opacity-40 ${
              activeMode === 'connect'
                ? 'bg-cyan-600 text-white shadow-sm ring-2 ring-cyan-500/30'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Connect cameras with transit walkways"
          >
            <Link2 className="h-3.5 w-3.5" />
            <span>Connect Walkways</span>
          </button>
        </div>
      </div>

      {/* Mode Banner Indicator */}
      {activeMode === 'connect' && (
        <div className="flex items-center justify-between rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-3.5 py-1.5 text-xs text-cyan-300 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-cyan-400 animate-pulse" />
            <span>
              {connectSourceId
                ? `Connecting from "${cameras.find((c) => c.id === connectSourceId)?.name || 'Camera'}" -> Click target camera to link.`
                : 'Select origin camera to connect.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMode('select')}
            className="text-xs underline text-cyan-400 hover:text-cyan-200"
          >
            Cancel
          </button>
        </div>
      )}

      {activeMode === 'add' && (
        <div className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/30 px-3.5 py-1.5 text-xs text-primary animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>Click anywhere on the floor plan area to place your camera pin.</span>
          </div>
          <button
            type="button"
            onClick={() => setMode('select')}
            className="text-xs underline hover:text-primary/80"
          >
            Done Placing
          </button>
        </div>
      )}

      {/* Interactive Floor Plan Area */}
      <div
        ref={containerRef}
        onClick={handleCanvasClick}
        className={`relative h-[420px] w-full overflow-hidden rounded-xl border border-border/80 bg-accent/15 transition-all select-none ${
          activeMode === 'add'
            ? 'cursor-crosshair ring-2 ring-primary/30'
            : activeMode === 'connect'
            ? 'cursor-pointer'
            : 'cursor-default'
        }`}
        style={{
          backgroundImage: floorPlanUrl
            ? `url(${floorPlanUrl})`
            : `radial-gradient(circle at 1px 1px, oklch(0.3 0.02 250) 1px, transparent 0)`,
          backgroundSize: floorPlanUrl ? 'cover' : '24px 24px',
          backgroundPosition: 'center',
        }}
      >
        {/* SVG Overlay for Camera Links */}
        <svg className="absolute inset-0 h-full w-full pointer-events-none z-0">
          <defs>
            <marker
              id="arrow-end"
              viewBox="0 0 10 10"
              refX="16"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#38bdf8" />
            </marker>
          </defs>

          {links.map((link) => {
            const fromCam = cameras.find((c) => c.id === link.from_camera_id);
            const toCam = cameras.find((c) => c.id === link.to_camera_id);
            if (!fromCam || !toCam) return null;

            const fromIdx = cameras.findIndex((c) => c.id === fromCam.id);
            const toIdx = cameras.findIndex((c) => c.id === toCam.id);
            const fromPos = getCamCoords(fromCam, fromIdx);
            const toPos = getCamCoords(toCam, toIdx);

            const midX = (fromPos.x + toPos.x) / 2;
            const midY = (fromPos.y + toPos.y) / 2;

            return (
              <g key={link.id} className="group pointer-events-auto">
                {/* Visible Link Line */}
                <line
                  x1={`${fromPos.x}%`}
                  y1={`${fromPos.y}%`}
                  x2={`${toPos.x}%`}
                  y2={`${toPos.y}%`}
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  strokeOpacity="0.8"
                  markerEnd="url(#arrow-end)"
                  className="transition-all hover:stroke-primary hover:stroke-width-3"
                />

                {/* Transit time label pill in center */}
                <foreignObject
                  x={`calc(${midX}% - 32px)`}
                  y={`calc(${midY}% - 12px)`}
                  width="64"
                  height="24"
                  className="overflow-visible"
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onDeleteLink) {
                        if (confirm(`Remove connection between ${fromCam.name} and ${toCam.name}?`)) {
                          onDeleteLink(link.id);
                        }
                      }
                    }}
                    title="Click to remove connection"
                    className="flex items-center justify-center gap-1 rounded-full bg-slate-900/90 border border-sky-500/50 px-1.5 py-0.5 text-[9px] font-mono font-bold text-sky-300 shadow-md cursor-pointer hover:bg-destructive hover:border-destructive hover:text-white transition-colors"
                  >
                    <span>~{link.avg_transit_time_seconds || 30}s</span>
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>

        {/* Empty Placeholder Guide */}
        {cameras.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-muted-foreground/60">
            <Camera className="h-10 w-10 mb-2 opacity-40 text-primary" />
            <p className="text-xs font-semibold">No cameras added yet</p>
            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
              Click &quot;Place Camera&quot; above or use the Add Camera form to add your first camera node
            </p>
          </div>
        )}

        {/* Camera Pins */}
        {cameras.map((cam, idx) => {
          const isSelected = selectedCameraId === cam.id;
          const isConnectSource = connectSourceId === cam.id;
          const coords = getCamCoords(cam, idx);
          const fovAngle = cam.fov_angle ?? 0;
          const linkCount = getCameraLinkCount(cam.id);
          const isIsolated = linkCount === 0;

          return (
            <div
              key={cam.id}
              onClick={(e) => handleNodeClick(e, cam)}
              onMouseDown={(e) => handleNodeMouseDown(e, cam)}
              style={{
                left: `${coords.x}%`,
                top: `${coords.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className={`absolute group flex cursor-pointer flex-col items-center select-none transition-transform ${
                isSelected ? 'z-30 scale-105' : 'z-20'
              }`}
            >
              {/* Field of View (FOV) Directional Cone */}
              <div
                className={`absolute -top-14 h-20 w-20 pointer-events-none transition-all ${
                  isSelected
                    ? 'opacity-60 text-primary'
                    : cam.is_entry_point
                    ? 'opacity-40 text-emerald-400'
                    : 'opacity-30 text-sky-400 group-hover:opacity-50'
                }`}
                style={{
                  transform: `rotate(${fovAngle}deg)`,
                  transformOrigin: 'bottom center',
                  clipPath: 'polygon(50% 100%, 15% 0%, 85% 0%)',
                  backgroundColor: 'currentColor',
                }}
              />

              {/* Floating Quick Action Bar for Selected Camera */}
              {isSelected && activeMode === 'select' && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute -top-9 flex items-center gap-1 rounded-lg bg-slate-900/95 border border-border px-1.5 py-0.5 shadow-xl backdrop-blur-md z-40 animate-in fade-in zoom-in-95 duration-150"
                >
                  <button
                    type="button"
                    onClick={(e) => handleRotateCam(e, cam.id, fovAngle)}
                    className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                    title={`Rotate FOV +45° (Current: ${fovAngle}°)`}
                  >
                    <RotateCw className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('connect');
                      setConnectSourceId(cam.id);
                    }}
                    className="p-1 rounded text-muted-foreground hover:text-cyan-400 hover:bg-accent transition-colors"
                    title="Connect this camera to another"
                  >
                    <Link2 className="h-3 w-3" />
                  </button>
                  {onDeleteCamera && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete camera "${cam.name}"?`)) {
                          onDeleteCamera(cam.id);
                        }
                      }}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Delete this camera"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Node Icon Circle */}
              <div
                className={`relative flex h-9 w-9 items-center justify-center rounded-xl border-2 shadow-lg transition-all ${
                  isConnectSource
                    ? 'border-cyan-400 bg-cyan-500 text-white ring-4 ring-cyan-400/40 animate-pulse'
                    : isSelected
                    ? 'border-primary bg-primary text-primary-foreground ring-4 ring-primary/30 shadow-primary/20'
                    : cam.is_entry_point
                    ? 'border-emerald-500 bg-emerald-600 text-white hover:border-emerald-400'
                    : 'border-border bg-card text-foreground group-hover:border-primary group-hover:bg-accent/60'
                }`}
              >
                <Camera className="h-4 w-4" />

                {/* Small Direction Arrow Notch */}
                <div
                  className="absolute -top-1.5 h-2 w-2 rounded-full bg-primary border border-background shadow-xs pointer-events-none"
                  style={{
                    transform: `rotate(${fovAngle}deg) translateY(-14px)`,
                  }}
                  title={`Direction: ${fovAngle}°`}
                />
              </div>

              {/* Camera Name Label & Status Badges */}
              <div className="mt-1 flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1 rounded bg-background/90 px-2 py-0.5 text-[10px] font-bold text-foreground shadow-md backdrop-blur-sm border border-border/80 whitespace-nowrap">
                  <span>{cam.name}</span>
                  {cam.is_entry_point && (
                    <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[8px] text-emerald-400 uppercase font-semibold">
                      Entry
                    </span>
                  )}
                </div>

                {/* Connectivity indicator */}
                <span className="text-[9px] text-muted-foreground font-mono bg-card/80 px-1 rounded border border-border/40">
                  {isIsolated ? 'Standalone' : `${linkCount} link${linkCount > 1 ? 's' : ''}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info / Topology Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <strong className="text-foreground">{cameras.length}</strong> Total Cameras
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <strong className="text-foreground">{cameras.filter((c) => c.is_entry_point).length}</strong> Entry Points
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            <strong className="text-foreground">{links.length}</strong> Walkway Links
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-slate-500" />
            <strong className="text-foreground">
              {cameras.filter((c) => getCameraLinkCount(c.id) === 0).length}
            </strong>{' '}
            Isolated (Optional)
          </span>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
          <Compass className="h-3 w-3" />
          <span>Click a camera to direct FOV or connect walkways</span>
        </div>
      </div>
    </div>
  );
}
