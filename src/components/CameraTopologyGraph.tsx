'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Camera,
  GitFork,
  ArrowRight,
  ArrowLeftRight,
  Trash2,
  Edit3,
  Plus,
  RefreshCw,
  Move,
  Link as LinkIcon,
  Check,
  X,
  Info,
} from 'lucide-react';
import type { CameraNode, CameraNodeLink } from '@/types/advancedpeopleanalytics';

// Distinct curated color schemes for camera nodes
const NODE_COLORS = [
  { bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', text: 'text-emerald-400', stroke: '#10B981', ring: 'ring-emerald-500' },
  { bg: 'bg-amber-500/15', border: 'border-amber-500/40', text: 'text-amber-400', stroke: '#F59E0B', ring: 'ring-amber-500' },
  { bg: 'bg-indigo-500/15', border: 'border-indigo-500/40', text: 'text-indigo-400', stroke: '#6366F1', ring: 'ring-indigo-500' },
  { bg: 'bg-cyan-500/15', border: 'border-cyan-500/40', text: 'text-cyan-400', stroke: '#06B6D4', ring: 'ring-cyan-500' },
  { bg: 'bg-rose-500/15', border: 'border-rose-500/40', text: 'text-rose-400', stroke: '#F43F5E', ring: 'ring-rose-500' },
  { bg: 'bg-purple-500/15', border: 'border-purple-500/40', text: 'text-purple-400', stroke: '#A855F7', ring: 'ring-purple-500' },
  { bg: 'bg-sky-500/15', border: 'border-sky-500/40', text: 'text-sky-400', stroke: '#0EA5E9', ring: 'ring-sky-500' },
  { bg: 'bg-teal-500/15', border: 'border-teal-500/40', text: 'text-teal-400', stroke: '#14B8A6', ring: 'ring-teal-500' },
];

interface NodePosition {
  x: number;
  y: number;
}

interface CameraTopologyGraphProps {
  cameraNodes: CameraNode[];
  cameraLinks: CameraNodeLink[];
  selectedCameraId?: string;
  onSelectCamera: (cameraId: string) => void;
  onInitiateConnect: (fromCameraId: string, toCameraId: string) => void;
  onDeleteLink: (linkId: string) => void;
  onDeleteCamera?: (node: CameraNode) => void;
  onEditCamera?: (node: CameraNode) => void;
  onAddCameraClick?: () => void;
}

export function CameraTopologyGraph({
  cameraNodes,
  cameraLinks,
  selectedCameraId,
  onSelectCamera,
  onInitiateConnect,
  onDeleteLink,
  onDeleteCamera,
  onEditCamera,
  onAddCameraClick,
}: CameraTopologyGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 420 });
  const [positions, setPositions] = useState<Record<string, NodePosition>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Connecting mode state: when user clicks "Connect Camera" from a selected node
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);

  const NODE_WIDTH = 170;
  const NODE_HEIGHT = 68;

  // Measure container size
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth } = containerRef.current;
        setContainerSize({
          width: Math.max(clientWidth, 600),
          height: 420,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Compute or restore initial layout in an organic circular / elliptical ring
  useEffect(() => {
    if (cameraNodes.length === 0) return;

    setPositions((prev) => {
      const updated: Record<string, NodePosition> = { ...prev };
      const count = cameraNodes.length;
      const centerX = containerSize.width / 2;
      const centerY = containerSize.height / 2;
      const radiusX = Math.min(centerX - 120, 260);
      const radiusY = Math.min(centerY - 70, 130);

      cameraNodes.forEach((node, idx) => {
        if (!updated[node.id]) {
          // If node has saved x,y coordinates
          if (node.x_coord !== undefined && node.y_coord !== undefined) {
            updated[node.id] = { x: node.x_coord, y: node.y_coord };
          } else {
            // Auto arrange evenly in an ellipse
            const angle = (idx / count) * 2 * Math.PI - Math.PI / 2;
            const x = Math.max(20, Math.min(containerSize.width - NODE_WIDTH - 20, centerX + radiusX * Math.cos(angle) - NODE_WIDTH / 2));
            const y = Math.max(20, Math.min(containerSize.height - NODE_HEIGHT - 20, centerY + radiusY * Math.sin(angle) - NODE_HEIGHT / 2));
            updated[node.id] = { x, y };
          }
        }
      });
      return updated;
    });
  }, [cameraNodes, containerSize]);

  // Reset positions to circle
  const handleAutoLayout = () => {
    const count = cameraNodes.length;
    if (count === 0) return;
    const centerX = containerSize.width / 2;
    const centerY = containerSize.height / 2;
    const radiusX = Math.min(centerX - 120, 260);
    const radiusY = Math.min(centerY - 70, 130);

    const updated: Record<string, NodePosition> = {};
    cameraNodes.forEach((node, idx) => {
      const angle = (idx / count) * 2 * Math.PI - Math.PI / 2;
      const x = Math.max(20, Math.min(containerSize.width - NODE_WIDTH - 20, centerX + radiusX * Math.cos(angle) - NODE_WIDTH / 2));
      const y = Math.max(20, Math.min(containerSize.height - NODE_HEIGHT - 20, centerY + radiusY * Math.sin(angle) - NODE_HEIGHT / 2));
      updated[node.id] = { x, y };
    });
    setPositions(updated);
  };

  // Node Dragging Handlers
  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (connectingSourceId) {
      // In connect mode, clicking a node finishes the connection
      if (connectingSourceId !== nodeId) {
        onInitiateConnect(connectingSourceId, nodeId);
        setConnectingSourceId(null);
      }
      return;
    }

    onSelectCamera(nodeId);
    const pos = positions[nodeId] || { x: 0, y: 0 };
    setDraggingNodeId(nodeId);
    setDragOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeId || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    const clampedX = Math.max(10, Math.min(containerRect.width - NODE_WIDTH - 10, newX));
    const clampedY = Math.max(10, Math.min(containerRect.height - NODE_HEIGHT - 10, newY));

    setPositions((prev) => ({
      ...prev,
      [draggingNodeId]: { x: clampedX, y: clampedY },
    }));
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
  };

  // Build Edge Curved Path Data (Deduplicate reciprocal links into a single visual edge)
  const edgePaths = useMemo(() => {
    const processedPairs = new Set<string>();
    const edges: Array<{
      id: string;
      link: CameraNodeLink;
      fromCameraId: string;
      toCameraId: string;
      isBidirectional: boolean;
      path: string;
      midX: number;
      midY: number;
      fromNode?: CameraNode;
      toNode?: CameraNode;
      transitLabel: string;
    }> = [];

    cameraLinks.forEach((link) => {
      const pairKey = [link.from_camera_id, link.to_camera_id].sort().join('__');
      if (processedPairs.has(pairKey)) return;
      processedPairs.add(pairKey);

      // Check if reverse link exists in cameraLinks
      const hasReciprocal = cameraLinks.some(
        (l) =>
          l.id !== link.id &&
          l.from_camera_id === link.to_camera_id &&
          l.to_camera_id === link.from_camera_id
      );
      const isBidirectional = Boolean(link.is_bidirectional || hasReciprocal);

      const fromPos = positions[link.from_camera_id];
      const toPos = positions[link.to_camera_id];
      if (!fromPos || !toPos) return;

      // Node centers
      const x1 = fromPos.x + NODE_WIDTH / 2;
      const y1 = fromPos.y + NODE_HEIGHT / 2;
      const x2 = toPos.x + NODE_WIDTH / 2;
      const y2 = toPos.y + NODE_HEIGHT / 2;

      // Cubic bezier control points with smooth subtle curvature
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const curvature = Math.min(dist * 0.15, 38);

      // Perpendicular offset for organic curve
      const nx = -dy / (dist || 1);
      const ny = dx / (dist || 1);

      const cx1 = x1 + dx * 0.35 + nx * curvature;
      const cy1 = y1 + dy * 0.35 + ny * curvature;
      const cx2 = x1 + dx * 0.65 + nx * curvature;
      const cy2 = y1 + dy * 0.65 + ny * curvature;

      // Midpoint on curve for label
      const midX = 0.125 * x1 + 0.375 * cx1 + 0.375 * cx2 + 0.125 * x2;
      const midY = 0.125 * y1 + 0.375 * cy1 + 0.375 * cy2 + 0.125 * y2;

      const path = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

      const fromNode = cameraNodes.find((c) => c.id === link.from_camera_id);
      const toNode = cameraNodes.find((c) => c.id === link.to_camera_id);

      edges.push({
        id: pairKey,
        link,
        fromCameraId: link.from_camera_id,
        toCameraId: link.to_camera_id,
        isBidirectional,
        path,
        midX,
        midY,
        fromNode,
        toNode,
        transitLabel: `${link.min_transit_time_seconds || 5}s–${link.max_transit_time_seconds || 120}s`,
      });
    });

    return edges;
  }, [cameraLinks, positions, cameraNodes]);

  const activeSelectedCamera = cameraNodes.find((c) => c.id === selectedCameraId);

  return (
    <div className="relative w-full rounded-2xl border border-border bg-card/60 backdrop-blur-md shadow-sm overflow-hidden flex flex-col">
      {/* Graph Interactive Canvas Area */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative w-full h-[450px] bg-dot-grid bg-background/50 overflow-hidden select-none cursor-default"
      >
        {/* Floating Top-Left Stat Pill */}
        <div className="absolute top-3.5 left-3.5 z-30 flex items-center gap-2 rounded-xl border border-border/80 bg-card/85 backdrop-blur-md px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
          <GitFork className="h-3.5 w-3.5 text-primary" />
          <span className="font-bold text-foreground">{cameraNodes.length} Cameras</span>
          <span>•</span>
          <span>{edgePaths.length} Connections</span>
        </div>

        {/* Floating Destination Selector Prompt (When Connecting) */}
        {connectingSourceId && (
          <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-xl bg-primary/25 border border-primary/50 backdrop-blur-md px-3.5 py-1.5 text-xs text-primary shadow-lg animate-pulse">
            <span className="font-semibold">
              Select destination camera for {cameraNodes.find((c) => c.id === connectingSourceId)?.name || 'Camera'}
            </span>
            <button
              type="button"
              onClick={() => setConnectingSourceId(null)}
              className="rounded-full bg-primary text-primary-foreground p-0.5 hover:bg-primary/80 cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Floating Top-Right Refresh / Auto-Layout Button */}
        <button
          type="button"
          onClick={handleAutoLayout}
          title="Rearrange and balance camera nodes"
          className="absolute top-3.5 right-3.5 z-30 flex items-center gap-1.5 rounded-xl border border-border/80 bg-card/85 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-card hover:border-primary/50 shadow-md transition-all cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5 text-primary" />
          <span>Refresh</span>
        </button>

        {/* SVG Bezier Edges Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            <marker
              id="arrowhead-primary"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill="#3B82F6" />
            </marker>
            <marker
              id="arrowhead-muted"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill="#64748B" />
            </marker>
            <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
          </defs>

          {/* Render Single Smooth Edge Path per connected camera pair */}
          {edgePaths.map((edge) => {
            const isHovered = hoveredLinkId === edge.link.id;
            const isConnectedToSelected =
              selectedCameraId &&
              (edge.fromCameraId === selectedCameraId || edge.toCameraId === selectedCameraId);

            return (
              <g key={edge.id} className="transition-all duration-200">
                {/* Wider invisible stroke for easier hover / click */}
                <path
                  d={edge.path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="24"
                  className="pointer-events-auto cursor-pointer"
                  onMouseEnter={() => setHoveredLinkId(edge.link.id)}
                  onMouseLeave={() => setHoveredLinkId(null)}
                />

                {/* Outer glowing line */}
                {(isHovered || isConnectedToSelected) && (
                  <path
                    d={edge.path}
                    fill="none"
                    stroke="#06B6D4"
                    strokeWidth="5"
                    strokeOpacity="0.35"
                    strokeLinecap="round"
                  />
                )}

                {/* Visible curved connector line */}
                <path
                  d={edge.path}
                  fill="none"
                  stroke={
                    isConnectedToSelected
                      ? 'url(#edge-gradient)'
                      : isHovered
                      ? '#38BDF8'
                      : edge.isBidirectional
                      ? '#3B82F6'
                      : '#475569'
                  }
                  strokeWidth={isConnectedToSelected || isHovered ? '2.5' : '2'}
                  markerEnd={
                    edge.isBidirectional
                      ? undefined
                      : isConnectedToSelected
                      ? 'url(#arrowhead-primary)'
                      : 'url(#arrowhead-muted)'
                  }
                  className="transition-all"
                />
              </g>
            );
          })}
        </svg>

        {/* Edge Badges / Midpoint Controls (Transit times, Bidirectional Icon & Delete button) */}
        {edgePaths.map((edge) => {
          const isHovered = hoveredLinkId === edge.link.id;
          const isConnectedToSelected =
            selectedCameraId &&
            (edge.fromCameraId === selectedCameraId || edge.toCameraId === selectedCameraId);

          return (
            <div
              key={`label-${edge.id}`}
              style={{
                transform: `translate(${edge.midX}px, ${edge.midY}px) translate(-50%, -50%)`,
              }}
              onMouseEnter={() => setHoveredLinkId(edge.link.id)}
              onMouseLeave={() => setHoveredLinkId(null)}
              className={`absolute z-10 flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-mono border transition-all shadow-sm ${
                isConnectedToSelected || isHovered
                  ? 'bg-card border-primary text-primary font-bold shadow-primary/20 scale-105 ring-1 ring-primary/40'
                  : edge.isBidirectional
                  ? 'bg-card/95 border-primary/40 text-foreground hover:border-primary'
                  : 'bg-card/90 border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              {edge.isBidirectional ? (
                <span className="flex items-center gap-1 text-cyan-400 font-bold" title="Bidirectional connection (Two-way transit)">
                  <ArrowLeftRight className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center gap-1 text-primary font-bold" title="One-way directed link">
                  <ArrowRight className="h-3 w-3" />
                </span>
              )}
              <span>{edge.transitLabel}</span>

              {/* Quick Delete Edge button on hover */}
              {isHovered && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteLink(edge.link.id);
                  }}
                  title="Remove camera connection"
                  className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* Interactive Camera Nodes */}
        {cameraNodes.map((node, idx) => {
          const pos = positions[node.id] || { x: 50 + idx * 100, y: 50 };
          const isSelected = selectedCameraId === node.id;
          const isConnectingSource = connectingSourceId === node.id;
          const isConnectingTargetCandidate = connectingSourceId !== null && connectingSourceId !== node.id;
          const region = node.location_label || node.location_desc || node.label || node.region;
          const colorTheme = NODE_COLORS[idx % NODE_COLORS.length];

          return (
            <div
              key={node.id}
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px)`,
                width: `${NODE_WIDTH}px`,
                height: `${NODE_HEIGHT}px`,
              }}
              onMouseDown={(e) => handleMouseDown(node.id, e)}
              className={`absolute z-20 flex flex-col justify-between rounded-xl border p-2.5 transition-shadow cursor-grab active:cursor-grabbing select-none backdrop-blur-md ${
                isConnectingSource
                  ? 'border-primary ring-2 ring-primary bg-primary/20 shadow-lg shadow-primary/20 animate-pulse'
                  : isConnectingTargetCandidate
                  ? 'border-primary/70 hover:border-primary ring-2 ring-primary/40 bg-accent/40 shadow-md cursor-pointer scale-105'
                  : isSelected
                  ? 'border-primary bg-card ring-2 ring-primary shadow-lg shadow-primary/20'
                  : 'border-border/90 bg-card/95 hover:border-primary/50 hover:shadow-md'
              }`}
            >
              {/* Header: Icon + Name + Entry Badge */}
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${colorTheme.bg} ${colorTheme.text} border ${colorTheme.border}`}
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-foreground block truncate">
                      {node.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {node.is_entry_point && (
                    <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[8px] font-bold text-emerald-400 uppercase">
                      Entry
                    </span>
                  )}
                  {onEditCamera && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditCamera(node);
                      }}
                      title="Edit camera name and location"
                      className="text-muted-foreground/70 hover:text-primary transition-colors p-1 rounded hover:bg-primary/10 cursor-pointer"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                  )}
                  {onDeleteCamera && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCamera(node);
                      }}
                      title="Delete camera node"
                      className="text-muted-foreground/60 hover:text-destructive transition-colors p-1 rounded hover:bg-destructive/10 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Footer: Region / Location Pill */}
              <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px]">
                <span
                  className={`truncate max-w-[110px] font-medium ${
                    region ? 'text-primary' : 'text-muted-foreground italic'
                  }`}
                  title={region || 'No location set'}
                >
                  📍 {region || 'No location set'}
                </span>

                {isConnectingTargetCandidate ? (
                  <span className="font-bold text-primary flex items-center gap-0.5">
                    <Check className="h-2.5 w-2.5" /> Link
                  </span>
                ) : (
                  <Move className="h-2.5 w-2.5 text-muted-foreground/40" />
                )}
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {cameraNodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <Camera className="h-10 w-10 text-muted-foreground/30 mb-2" />
            <p className="text-sm font-semibold text-foreground">No Camera Nodes Configured</p>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              Click &quot;Add Camera&quot; above to create your physical or virtual CCTV nodes and establish travel paths.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Hint Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-t border-border/60 bg-muted/10 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 text-primary" />
          <span>
            {connectingSourceId
              ? `Click on any other camera to create connection from "${cameraNodes.find((c) => c.id === connectingSourceId)?.name}"`
              : 'Click any camera to select, drag to arrange layout, or hover links to view/delete transit routes.'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Entry Gate
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-primary"></span> Transit Link
          </span>
        </div>
      </div>
    </div>
  );
}
