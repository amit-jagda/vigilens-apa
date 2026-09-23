'use client';

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Camera,
  Plus,
  Trash2,
  Move,
  RotateCw,
  RotateCcw,
  Link2,
  MousePointer,
  Mouse,
  Info,
  Check,
  X,
  Compass,
  Save,
  Undo2,
  Redo2,
  Ruler,
  Footprints,
  Layers,
  Sparkles,
  Loader2,
  ShieldCheck,
  Square,
  Tag,
  Hand,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  CameraNode,
  CameraNodeLink,
  SpatialLine,
  FloorPlan,
  SaveLayoutRequest,
} from '@/types/advancedpeopleanalytics';

export type CanvasToolMode = 'select' | 'pan' | 'add' | 'draw_wall' | 'draw_corridor' | 'draw_zone' | 'connect';

export const BASE_WORLD_WIDTH = 2400;
export const BASE_WORLD_HEIGHT = 1500;

export interface SpatialZone {
  id: string;
  name: string;
  zone_type?: 'office' | 'meeting' | 'lobby' | 'corridor' | 'restricted' | 'other';
  x1: number; // 0..1 (min x)
  y1: number; // 0..1 (min y)
  x2: number; // 0..1 (max x)
  y2: number; // 0..1 (max y)
  color?: string; // e.g. 'purple' | 'emerald' | 'sky' | 'amber' | 'rose'
}

export type ZoneHandleType = 'nw' | 'ne' | 'se' | 'sw';

export const MIN_ZONE_SEPARATION = 0.002; // As wide as the wall edge stroke (~4.8px at 2400px width), allowing adjacent rooms to touch flush without gap

export interface BoxBounds {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Checks if two rectangular boxes overlap, taking into account a minimum separation gap.
 */
export function doBoxesOverlap(
  a: BoxBounds,
  b: BoxBounds,
  separation: number = MIN_ZONE_SEPARATION
): boolean {
  const axMin = Math.min(a.x1, a.x2);
  const axMax = Math.max(a.x1, a.x2);
  const ayMin = Math.min(a.y1, a.y2);
  const ayMax = Math.max(a.y1, a.y2);

  const bxMin = Math.min(b.x1, b.x2);
  const bxMax = Math.max(b.x1, b.x2);
  const byMin = Math.min(b.y1, b.y2);
  const byMax = Math.max(b.y1, b.y2);

  return (
    axMin < bxMax + separation &&
    axMax > bxMin - separation &&
    ayMin < byMax + separation &&
    ayMax > byMin - separation
  );
}

/**
 * Resolves translation movement for a box, sliding smoothly along obstacles without overlapping
 * and maintaining the minimum separation gap so wall lines stay separated.
 */
export function resolveZoneTranslation(
  proposedX1: number,
  proposedY1: number,
  w: number,
  h: number,
  origX1: number,
  origY1: number,
  otherZones: SpatialZone[],
  separation: number = MIN_ZONE_SEPARATION
): { x1: number; y1: number; x2: number; y2: number } {
  const minCanvasX = 0.01;
  const maxCanvasX = 0.99 - w;
  const minCanvasY = 0.01;
  const maxCanvasY = 0.99 - h;

  const clampedPropX = Math.max(minCanvasX, Math.min(maxCanvasX, proposedX1));
  const clampedPropY = Math.max(minCanvasY, Math.min(maxCanvasY, proposedY1));

  if (otherZones.length === 0) {
    return {
      x1: clampedPropX,
      y1: clampedPropY,
      x2: clampedPropX + w,
      y2: clampedPropY + h,
    };
  }

  const directCandidate = {
    x1: clampedPropX,
    y1: clampedPropY,
    x2: clampedPropX + w,
    y2: clampedPropY + h,
  };

  const hasDirectCollision = otherZones.some((z) =>
    doBoxesOverlap(directCandidate, z, separation)
  );

  if (!hasDirectCollision) {
    return directCandidate;
  }

  // Slide along obstacle boundaries:
  // Candidate 1: Move X first, then Y
  let cand1X = clampedPropX;
  for (const obs of otherZones) {
    const obsMinY = Math.min(obs.y1, obs.y2);
    const obsMaxY = Math.max(obs.y1, obs.y2);
    const obsMinX = Math.min(obs.x1, obs.x2);
    const obsMaxX = Math.max(obs.x1, obs.x2);

    if (origY1 < obsMaxY + separation && origY1 + h > obsMinY - separation) {
      if (origX1 + w + separation <= obsMinX) {
        cand1X = Math.min(cand1X, obsMinX - separation - w);
      } else if (origX1 >= obsMaxX + separation) {
        cand1X = Math.max(cand1X, obsMaxX + separation);
      }
    }
  }
  cand1X = Math.max(minCanvasX, Math.min(maxCanvasX, cand1X));

  let cand1Y = clampedPropY;
  for (const obs of otherZones) {
    const obsMinX = Math.min(obs.x1, obs.x2);
    const obsMaxX = Math.max(obs.x1, obs.x2);
    const obsMinY = Math.min(obs.y1, obs.y2);
    const obsMaxY = Math.max(obs.y1, obs.y2);

    if (cand1X < obsMaxX + separation && cand1X + w > obsMinX - separation) {
      if (origY1 + h + separation <= obsMinY) {
        cand1Y = Math.min(cand1Y, obsMinY - separation - h);
      } else if (origY1 >= obsMaxY + separation) {
        cand1Y = Math.max(cand1Y, obsMaxY + separation);
      }
    }
  }
  cand1Y = Math.max(minCanvasY, Math.min(maxCanvasY, cand1Y));

  const candidate1 = {
    x1: cand1X,
    y1: cand1Y,
    x2: cand1X + w,
    y2: cand1Y + h,
  };
  const cand1Valid = !otherZones.some((z) => doBoxesOverlap(candidate1, z, separation));

  // Candidate 2: Move Y first, then X
  let cand2Y = clampedPropY;
  for (const obs of otherZones) {
    const obsMinX = Math.min(obs.x1, obs.x2);
    const obsMaxX = Math.max(obs.x1, obs.x2);
    const obsMinY = Math.min(obs.y1, obs.y2);
    const obsMaxY = Math.max(obs.y1, obs.y2);

    if (origX1 < obsMaxX + separation && origX1 + w > obsMinX - separation) {
      if (origY1 + h + separation <= obsMinY) {
        cand2Y = Math.min(cand2Y, obsMinY - separation - h);
      } else if (origY1 >= obsMaxY + separation) {
        cand2Y = Math.max(cand2Y, obsMaxY + separation);
      }
    }
  }
  cand2Y = Math.max(minCanvasY, Math.min(maxCanvasY, cand2Y));

  let cand2X = clampedPropX;
  for (const obs of otherZones) {
    const obsMinY = Math.min(obs.y1, obs.y2);
    const obsMaxY = Math.max(obs.y1, obs.y2);
    const obsMinX = Math.min(obs.x1, obs.x2);
    const obsMaxX = Math.max(obs.x1, obs.x2);

    if (cand2Y < obsMaxY + separation && cand2Y + h > obsMinY - separation) {
      if (origX1 + w + separation <= obsMinX) {
        cand2X = Math.min(cand2X, obsMinX - separation - w);
      } else if (origX1 >= obsMaxX + separation) {
        cand2X = Math.max(cand2X, obsMaxX + separation);
      }
    }
  }
  cand2X = Math.max(minCanvasX, Math.min(maxCanvasX, cand2X));

  const candidate2 = {
    x1: cand2X,
    y1: cand2Y,
    x2: cand2X + w,
    y2: cand2Y + h,
  };
  const cand2Valid = !otherZones.some((z) => doBoxesOverlap(candidate2, z, separation));

  if (cand1Valid && cand2Valid) {
    const dist1 =
      Math.pow(cand1X - clampedPropX, 2) + Math.pow(cand1Y - clampedPropY, 2);
    const dist2 =
      Math.pow(cand2X - clampedPropX, 2) + Math.pow(cand2Y - clampedPropY, 2);
    return dist1 <= dist2 ? candidate1 : candidate2;
  }
  if (cand1Valid) return candidate1;
  if (cand2Valid) return candidate2;

  return {
    x1: origX1,
    y1: origY1,
    x2: origX1 + w,
    y2: origY1 + h,
  };
}

/**
 * Resolves zone resizing, preventing handles from expanding into adjacent rooms
 * and keeping perimeter lines separated.
 */
export function resolveZoneResize(
  handle: ZoneHandleType,
  proposedX1: number,
  proposedY1: number,
  proposedX2: number,
  proposedY2: number,
  origin: { origX1: number; origY1: number; origX2: number; origY2: number },
  otherZones: SpatialZone[],
  separation: number = MIN_ZONE_SEPARATION
): { x1: number; y1: number; x2: number; y2: number } {
  const minDim = 0.02;
  let newX1 = Math.max(0.01, proposedX1);
  let newY1 = Math.max(0.01, proposedY1);
  let newX2 = Math.min(0.99, proposedX2);
  let newY2 = Math.min(0.99, proposedY2);

  for (const obs of otherZones) {
    const obsMinX = Math.min(obs.x1, obs.x2);
    const obsMaxX = Math.max(obs.x1, obs.x2);
    const obsMinY = Math.min(obs.y1, obs.y2);
    const obsMaxY = Math.max(obs.y1, obs.y2);

    const overlapsY = newY1 < obsMaxY + separation && newY2 > obsMinY - separation;
    const overlapsX = newX1 < obsMaxX + separation && newX2 > obsMinX - separation;

    if (handle === 'nw') {
      if (overlapsY && origin.origX1 >= obsMaxX + separation) {
        newX1 = Math.max(newX1, obsMaxX + separation);
      }
      if (overlapsX && origin.origY1 >= obsMaxY + separation) {
        newY1 = Math.max(newY1, obsMaxY + separation);
      }
    } else if (handle === 'ne') {
      if (overlapsY && origin.origX2 <= obsMinX - separation) {
        newX2 = Math.min(newX2, obsMinX - separation);
      }
      if (overlapsX && origin.origY1 >= obsMaxY + separation) {
        newY1 = Math.max(newY1, obsMaxY + separation);
      }
    } else if (handle === 'se') {
      if (overlapsY && origin.origX2 <= obsMinX - separation) {
        newX2 = Math.min(newX2, obsMinX - separation);
      }
      if (overlapsX && origin.origY2 <= obsMinY - separation) {
        newY2 = Math.min(newY2, obsMinY - separation);
      }
    } else if (handle === 'sw') {
      if (overlapsY && origin.origX1 >= obsMaxX + separation) {
        newX1 = Math.max(newX1, obsMaxX + separation);
      }
      if (overlapsX && origin.origY2 <= obsMinY - separation) {
        newY2 = Math.min(newY2, obsMinY - separation);
      }
    }
  }

  if (handle === 'nw' || handle === 'sw') {
    newX1 = Math.min(origin.origX2 - minDim, newX1);
  }
  if (handle === 'ne' || handle === 'se') {
    newX2 = Math.max(origin.origX1 + minDim, newX2);
  }
  if (handle === 'nw' || handle === 'ne') {
    newY1 = Math.min(origin.origY2 - minDim, newY1);
  }
  if (handle === 'sw' || handle === 'se') {
    newY2 = Math.max(origin.origY1 + minDim, newY2);
  }

  const cand = { x1: newX1, y1: newY1, x2: newX2, y2: newY2 };
  if (otherZones.some((z) => doBoxesOverlap(cand, z, separation))) {
    return {
      x1: origin.origX1,
      y1: origin.origY1,
      x2: origin.origX2,
      y2: origin.origY2,
    };
  }

  return cand;
}

/**
 * Computes the 4 closed perimeter wall segments for an axis-aligned rectangular zone.
 */
export function computeZonePerimeterWalls(
  zoneId: string,
  zoneName: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): SpatialLine[] {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  return [
    {
      id: `${zoneId}-wall-north`,
      x1: minX,
      y1: minY,
      x2: maxX,
      y2: minY,
      line_type: 'wall',
      label: `${zoneName} (North Wall)`,
    },
    {
      id: `${zoneId}-wall-east`,
      x1: maxX,
      y1: minY,
      x2: maxX,
      y2: maxY,
      line_type: 'wall',
      label: `${zoneName} (East Wall)`,
    },
    {
      id: `${zoneId}-wall-south`,
      x1: maxX,
      y1: maxY,
      x2: minX,
      y2: maxY,
      line_type: 'wall',
      label: `${zoneName} (South Wall)`,
    },
    {
      id: `${zoneId}-wall-west`,
      x1: minX,
      y1: maxY,
      x2: minX,
      y2: minY,
      line_type: 'wall',
      label: `${zoneName} (West Wall)`,
    },
  ];
}

/**
 * Updates spatial lines by replacing or updating the 4 perimeter walls of a zone.
 */
export function applyZoneWallsToLines(
  lines: SpatialLine[],
  zoneId: string,
  zoneName: string,
  newWalls: SpatialLine[]
): SpatialLine[] {
  const wallMap = new Map<string, SpatialLine>();
  newWalls.forEach((w) => {
    if (w.id) wallMap.set(w.id, w);
  });

  let replacedCount = 0;
  const updated = lines.map((l) => {
    if (l.id && wallMap.has(l.id)) {
      replacedCount++;
      return wallMap.get(l.id)!;
    }
    if (l.label && (l.label.startsWith(zoneName) || l.label.toLowerCase().startsWith(zoneName.toLowerCase()))) {
      replacedCount++;
      if (l.label.includes('North Wall')) return { ...newWalls[0], id: l.id || newWalls[0].id };
      if (l.label.includes('East Wall')) return { ...newWalls[1], id: l.id || newWalls[1].id };
      if (l.label.includes('South Wall')) return { ...newWalls[2], id: l.id || newWalls[2].id };
      if (l.label.includes('West Wall')) return { ...newWalls[3], id: l.id || newWalls[3].id };
    }
    return l;
  });

  if (replacedCount < 4) {
    const filtered = updated.filter(
      (l) => !l.id?.startsWith(zoneId) && !l.label?.toLowerCase().startsWith(zoneName.toLowerCase())
    );
    return [...filtered, ...newWalls];
  }
  return updated;
}

/**
 * Resolves the parent spatial zone for any given line, checking by ID, label, or perimeter edge geometry.
 */
export function findParentZoneForLine(
  line: SpatialLine,
  zones: SpatialZone[]
): SpatialZone | undefined {
  if (!line || !zones || zones.length === 0) return undefined;

  // A. Check by line.id (e.g. "zone-12345-wall-north" or "zone-12345")
  if (line.id) {
    if (line.id.includes('-wall-')) {
      const zoneId = line.id.split('-wall-')[0];
      const found = zones.find((z) => z.id === zoneId);
      if (found) return found;
    }
    const foundById = zones.find((z) => line.id?.startsWith(z.id));
    if (foundById) return foundById;
  }

  // B. Check by line.label (e.g. "Meeting Room A (North Wall)", "Zone 1 (South Wall)", "Meeting Room A")
  if (line.label) {
    const wallLabelMatch = line.label.match(/^(.*?)\s*\((North|East|South|West)\s+Wall\)$/i);
    const targetName = (wallLabelMatch ? wallLabelMatch[1] : line.label).trim().toLowerCase();
    const foundByName = zones.find((z) => z.name.trim().toLowerCase() === targetName);
    if (foundByName) return foundByName;

    const foundByPrefix = zones.find((z) => line.label!.toLowerCase().startsWith(z.name.toLowerCase()));
    if (foundByPrefix) return foundByPrefix;
  }

  // C. Check by Geometry (if line segment matches any of the 4 perimeter walls of a zone)
  const lx1 = line.x1;
  const ly1 = line.y1;
  const lx2 = line.x2;
  const ly2 = line.y2;
  const minLX = Math.min(lx1, lx2);
  const maxLX = Math.max(lx1, lx2);
  const minLY = Math.min(ly1, ly2);
  const maxLY = Math.max(ly1, ly2);

  for (const z of zones) {
    const zx1 = z.x1 > 1 ? z.x1 / 100 : z.x1;
    const zy1 = z.y1 > 1 ? z.y1 / 100 : z.y1;
    const zx2 = z.x2 > 1 ? z.x2 / 100 : z.x2;
    const zy2 = z.y2 > 1 ? z.y2 / 100 : z.y2;
    const minZX = Math.min(zx1, zx2);
    const maxZX = Math.max(zx1, zx2);
    const minZY = Math.min(zy1, zy2);
    const maxZY = Math.max(zy1, zy2);

    // North wall: y ≈ minZY, x in [minZX..maxZX]
    const isNorth = Math.abs(minLY - minZY) < 0.005 && Math.abs(maxLY - minZY) < 0.005 && Math.abs(minLX - minZX) < 0.008 && Math.abs(maxLX - maxZX) < 0.008;
    // South wall: y ≈ maxZY, x in [minZX..maxZX]
    const isSouth = Math.abs(minLY - maxZY) < 0.005 && Math.abs(maxLY - maxZY) < 0.005 && Math.abs(minLX - minZX) < 0.008 && Math.abs(maxLX - maxZX) < 0.008;
    // West wall: x ≈ minZX, y in [minZY..maxZY]
    const isWest = Math.abs(minLX - minZX) < 0.005 && Math.abs(maxLX - minZX) < 0.005 && Math.abs(minLY - minZY) < 0.008 && Math.abs(maxLY - maxZY) < 0.008;
    // East wall: x ≈ maxZX, y in [minZY..maxZY]
    const isEast = Math.abs(minLX - maxZX) < 0.005 && Math.abs(maxLX - maxZX) < 0.005 && Math.abs(minLY - minZY) < 0.008 && Math.abs(maxLY - maxZY) < 0.008;

    if (isNorth || isSouth || isWest || isEast) {
      return z;
    }
  }

  return undefined;
}

/**
 * Automatically reconstructs or syncs spatial zones from spatial lines.
 * Any closed 4-wall perimeter lines sharing a zone name (e.g. 'Zone 1 (North Wall)', etc.)
 * are unified into a rectangular SpatialZone so hover highlights, dimensions, and names work seamlessly.
 */
export function reconstructZonesFromLines(
  lines: SpatialLine[],
  existingZones: SpatialZone[] = []
): SpatialZone[] {
  if (!lines || lines.length === 0) return existingZones;

  const zoneMap = new Map<string, { name: string; lines: SpatialLine[] }>();

  // Extract from line labels like "Zone 1 (North Wall)" or "Meeting Room (South Wall)"
  for (const line of lines) {
    if (!line.label) continue;
    const match = line.label.match(/^(.*?)\s*\((North|East|South|West)\s+Wall\)$/i);
    if (match) {
      const zoneName = match[1].trim();
      const existing = zoneMap.get(zoneName.toLowerCase());
      if (existing) {
        existing.lines.push(line);
      } else {
        zoneMap.set(zoneName.toLowerCase(), { name: zoneName, lines: [line] });
      }
    }
  }

  const result: SpatialZone[] = [];
  const processedNames = new Set<string>();

  // 1. First preserve / update any existing zones that match the lines
  for (const ez of existingZones) {
    const key = ez.name.toLowerCase();
    const group = zoneMap.get(key);
    if (group && group.lines.length >= 2) {
      const allX: number[] = [];
      const allY: number[] = [];
      group.lines.forEach((l) => {
        allX.push(l.x1 > 1 ? l.x1 / 100 : l.x1, l.x2 > 1 ? l.x2 / 100 : l.x2);
        allY.push(l.y1 > 1 ? l.y1 / 100 : l.y1, l.y2 > 1 ? l.y2 / 100 : l.y2);
      });
      result.push({
        ...ez,
        x1: Math.min(...allX),
        y1: Math.min(...allY),
        x2: Math.max(...allX),
        y2: Math.max(...allY),
      });
      processedNames.add(key);
    } else {
      result.push(ez);
      processedNames.add(key);
    }
  }

  // 2. Add any zones detected from lines that weren't in existingZones (e.g. loaded from backend)
  zoneMap.forEach((group, key) => {
    if (processedNames.has(key)) return;
    const allX: number[] = [];
    const allY: number[] = [];
    group.lines.forEach((l) => {
      allX.push(l.x1 > 1 ? l.x1 / 100 : l.x1, l.x2 > 1 ? l.x2 / 100 : l.x2);
      allY.push(l.y1 > 1 ? l.y1 / 100 : l.y1, l.y2 > 1 ? l.y2 / 100 : l.y2);
    });
    if (allX.length >= 2 && allY.length >= 2) {
      const minX = Math.min(...allX);
      const maxX = Math.max(...allX);
      const minY = Math.min(...allY);
      const maxY = Math.max(...allY);
      const cleanSlug = group.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      result.push({
        id: `zone-${cleanSlug || Date.now()}`,
        name: group.name,
        zone_type: 'office',
        x1: minX,
        y1: minY,
        x2: maxX,
        y2: maxY,
        color: 'purple',
      });
      processedNames.add(key);
    }
  });

  return result;
}

export interface AttachedCameraInfo {
  camera: CameraNode;
  wallAttachment: 'west' | 'east' | 'north' | 'south' | 'interior';
  origNormX: number;
  origNormY: number;
  origPctX: number;
  origPctY: number;
  relU: number; // 0..1 relative horizontal position along zone: (normX - zx1) / w
  relV: number; // 0..1 relative vertical position along zone: (normY - zy1) / h
}

/**
 * Determines which spatial zone (if any) owns a camera pin.
 * When two room edges are close, adjacent, or flush, evaluates:
 * 1. Monitored space / FOV direction: camera FOV cone points into the room whose space it monitors.
 * 2. Probe point: the area directly in front of the lens must be contained inside the room.
 * 3. Interior containment: camera contact point within room boundary.
 * 4. Location label match.
 * Prevents adjacent or touching rooms from stealing or moving cameras that don't belong to them.
 */
export function findOwningZoneForCamera(
  cam: CameraNode,
  allZones: SpatialZone[]
): SpatialZone | null {
  if (!allZones || allZones.length === 0) return null;
  if (cam.x_coord == null || cam.y_coord == null) return null;

  const rawX = Number(cam.x_coord);
  const rawY = Number(cam.y_coord);
  if (isNaN(rawX) || isNaN(rawY)) return null;

  const normX = rawX > 1.0 ? rawX / 100 : rawX;
  const normY = rawY > 1.0 ? rawY / 100 : rawY;

  const camLabel = (cam.location_label || cam.location_desc || '').toLowerCase();

  let bestZone: SpatialZone | null = null;
  let bestScore = -Infinity;

  for (const z of allZones) {
    const zx1 = z.x1 > 1 ? z.x1 / 100 : z.x1;
    const zy1 = z.y1 > 1 ? z.y1 / 100 : z.y1;
    const zx2 = z.x2 > 1 ? z.x2 / 100 : z.x2;
    const zy2 = z.y2 > 1 ? z.y2 / 100 : z.y2;
    const minX = Math.min(zx1, zx2);
    const maxX = Math.max(zx1, zx2);
    const minY = Math.min(zy1, zy2);
    const maxY = Math.max(zy1, zy2);

    const wallMargin = 0.035; // 3.5% proximity to wall line

    const dWest = Math.abs(normX - minX);
    const dEast = Math.abs(normX - maxX);
    const dNorth = Math.abs(normY - minY);
    const dSouth = Math.abs(normY - maxY);

    const isNearY = normY >= minY - wallMargin && normY <= maxY + wallMargin;
    const isNearX = normX >= minX - wallMargin && normX <= maxX + wallMargin;

    let distToWall = Infinity;
    if (isNearY) distToWall = Math.min(distToWall, dWest, dEast);
    if (isNearX) distToWall = Math.min(distToWall, dNorth, dSouth);

    const isInside =
      normX >= minX - 0.005 &&
      normX <= maxX + 0.005 &&
      normY >= minY - 0.005 &&
      normY <= maxY + 0.005;

    // If completely outside the wall margin and not inside, skip this zone
    if (distToWall > wallMargin && !isInside) {
      continue;
    }

    let score = 0;

    // Proximity to wall score (up to 40 pts)
    if (distToWall <= wallMargin) {
      score += (wallMargin - distToWall) * 1000;
    }

    // Interior score
    if (isInside) {
      score += 25;
    }

    // FOV Aiming & Space Containment Evaluation
    if (cam.fov_angle !== undefined && cam.fov_angle !== null) {
      const rad = (cam.fov_angle * Math.PI) / 180;
      const dirX = Math.sin(rad);
      const dirY = -Math.cos(rad);

      // Vector to center of room
      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;
      const toCenterX = midX - normX;
      const toCenterY = midY - normY;
      const dot = dirX * toCenterX + dirY * toCenterY;

      if (dot > 0) {
        score += 50; // Camera FOV is aimed into this room
      } else {
        score -= 100; // Camera FOV is aimed AWAY from this room (towards adjacent room or exterior)
      }

      // Probe point 20px inside the FOV direction (the monitored interior area)
      const probeX = normX + dirX * 0.015;
      const probeY = normY + dirY * 0.015;
      const isProbeInside =
        probeX >= minX - 0.005 &&
        probeX <= maxX + 0.005 &&
        probeY >= minY - 0.005 &&
        probeY <= maxY + 0.005;

      if (isProbeInside) {
        score += 70; // Monitored area is inside this room!
      } else {
        score -= 50; // Monitored area is outside this room!
      }
    }

    // Location label matching
    if (camLabel && z.name) {
      if (camLabel.includes(z.name.toLowerCase())) {
        score += 150;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestZone = z;
    }
  }

  // Only assign ownership if the score is clearly positive (the room genuinely contains the camera)
  return bestScore > 0 ? bestZone : null;
}

/**
 * Identifies all cameras mounted on the perimeter walls of a zone or situated within it,
 * computing their relative offsets so they stay sticked to the shape when moved or resized.
 * If edges of multiple zones are close together, only attaches the camera if this zone
 * actually contains the camera and its monitored space inside.
 */
export function getAttachedCamerasForZone(
  zone: SpatialZone,
  cameras: CameraNode[],
  allZones: SpatialZone[] = []
): AttachedCameraInfo[] {
  const zx1 = zone.x1 > 1 ? zone.x1 / 100 : zone.x1;
  const zy1 = zone.y1 > 1 ? zone.y1 / 100 : zone.y1;
  const zx2 = zone.x2 > 1 ? zone.x2 / 100 : zone.x2;
  const zy2 = zone.y2 > 1 ? zone.y2 / 100 : zone.y2;
  const minX = Math.min(zx1, zx2);
  const maxX = Math.max(zx1, zx2);
  const minY = Math.min(zy1, zy2);
  const maxY = Math.max(zy1, zy2);
  const w = Math.max(0.0001, maxX - minX);
  const h = Math.max(0.0001, maxY - minY);

  const wallMargin = 0.035; // ~3.5% normalized proximity to wall edge
  const results: AttachedCameraInfo[] = [];

  const effectiveZones = allZones.length > 0 ? allZones : [zone];

  for (const cam of cameras) {
    if (cam.x_coord == null || cam.y_coord == null) continue;
    const rawX = Number(cam.x_coord);
    const rawY = Number(cam.y_coord);
    if (isNaN(rawX) || isNaN(rawY)) continue;

    // Disambiguate if edges are close: only the zone that genuinely contains the camera owns it
    const owner = findOwningZoneForCamera(cam, effectiveZones);
    if (owner && owner.id !== zone.id) {
      // This camera belongs to an adjacent/different room; DO NOT attach to this zone!
      continue;
    }
    if (!owner && allZones.length > 0) {
      // Camera does not belong to any room (e.g. outside or pointing away)
      continue;
    }

    const normX = rawX > 1.0 ? rawX / 100 : rawX;
    const normY = rawY > 1.0 ? rawY / 100 : rawY;
    const pctX = rawX > 1.0 ? rawX : rawX * 100;
    const pctY = rawY > 1.0 ? rawY : rawY * 100;

    // Wall edge distances
    const dWest = Math.abs(normX - minX);
    const dEast = Math.abs(normX - maxX);
    const dNorth = Math.abs(normY - minY);
    const dSouth = Math.abs(normY - maxY);

    const isNearY = normY >= minY - wallMargin && normY <= maxY + wallMargin;
    const isNearX = normX >= minX - wallMargin && normX <= maxX + wallMargin;

    const isWest = dWest <= wallMargin && isNearY;
    const isEast = dEast <= wallMargin && isNearY;
    const isNorth = dNorth <= wallMargin && isNearX;
    const isSouth = dSouth <= wallMargin && isNearX;

    // Determine primary wall attachment (closest wall segment)
    let wallAttachment: 'west' | 'east' | 'north' | 'south' | 'interior' = 'interior';
    const wallCandidates: { wall: 'west' | 'east' | 'north' | 'south'; dist: number }[] = [];
    if (isWest) wallCandidates.push({ wall: 'west', dist: dWest });
    if (isEast) wallCandidates.push({ wall: 'east', dist: dEast });
    if (isNorth) wallCandidates.push({ wall: 'north', dist: dNorth });
    if (isSouth) wallCandidates.push({ wall: 'south', dist: dSouth });

    if (wallCandidates.length > 0) {
      wallCandidates.sort((a, b) => a.dist - b.dist);
      wallAttachment = wallCandidates[0].wall;
    } else {
      wallAttachment = 'interior';
    }

    const relU = Math.max(0, Math.min(1, (normX - minX) / w));
    const relV = Math.max(0, Math.min(1, (normY - minY) / h));

    results.push({
      camera: cam,
      wallAttachment,
      origNormX: normX,
      origNormY: normY,
      origPctX: pctX,
      origPctY: pctY,
      relU,
      relV,
    });
  }

  return results;
}

export interface WallSnapResult {
  x: number; // percentage (0..100)
  y: number; // percentage (0..100)
  angle: number; // degrees 0..359 pointing inward
  snapped: boolean;
  wallLine?: SpatialLine;
  distancePx: number;
}

/**
 * Calculates projection of a cursor coordinate onto wall segments.
 * If within snapDistancePx, snaps to closest point on wall and calculates
 * the inward perpendicular normal angle (0° = UP, 90° = RIGHT, 180° = DOWN, 270° = LEFT).
 */
export function calculateWallSnap(
  normX: number, // 0..1
  normY: number, // 0..1
  lines: SpatialLine[],
  canvasWidth: number,
  canvasHeight: number,
  snapDistancePx: number = Infinity,
  zones?: SpatialZone[]
): WallSnapResult {
  // 1. Gather all candidate lines (walls, corridors, boundaries) and normalize coordinates to 0..1
  const candidateLines: SpatialLine[] = [];

  for (const l of lines) {
    candidateLines.push({
      ...l,
      x1: l.x1 > 1 ? l.x1 / 100 : l.x1,
      y1: l.y1 > 1 ? l.y1 / 100 : l.y1,
      x2: l.x2 > 1 ? l.x2 / 100 : l.x2,
      y2: l.y2 > 1 ? l.y2 / 100 : l.y2,
    });
  }

  // 2. Synthesize perimeter walls from active zones if not already present in candidateLines
  if (zones && zones.length > 0) {
    for (const z of zones) {
      const zx1 = z.x1 > 1 ? z.x1 / 100 : z.x1;
      const zy1 = z.y1 > 1 ? z.y1 / 100 : z.y1;
      const zx2 = z.x2 > 1 ? z.x2 / 100 : z.x2;
      const zy2 = z.y2 > 1 ? z.y2 / 100 : z.y2;
      const minX = Math.min(zx1, zx2);
      const maxX = Math.max(zx1, zx2);
      const minY = Math.min(zy1, zy2);
      const maxY = Math.max(zy1, zy2);

      const hasWalls = candidateLines.some((l) => l.id?.startsWith(z.id));
      if (!hasWalls) {
        candidateLines.push(
          { id: `${z.id}-wall-north`, x1: minX, y1: minY, x2: maxX, y2: minY, line_type: 'wall', label: `${z.name} (North Wall)` },
          { id: `${z.id}-wall-east`, x1: maxX, y1: minY, x2: maxX, y2: maxY, line_type: 'wall', label: `${z.name} (East Wall)` },
          { id: `${z.id}-wall-south`, x1: maxX, y1: maxY, x2: minX, y2: maxY, line_type: 'wall', label: `${z.name} (South Wall)` },
          { id: `${z.id}-wall-west`, x1: minX, y1: maxY, x2: minX, y2: minY, line_type: 'wall', label: `${z.name} (West Wall)` }
        );
      }
    }
  }

  // Prioritize wall lines; fall back to all candidate lines if no walls
  const wallLines = candidateLines.filter((l) => l.line_type === 'wall');
  const candidates = wallLines.length > 0 ? wallLines : candidateLines;

  let bestDistPx = Infinity;
  let bestX = normX;
  let bestY = normY;
  let bestAngle = 0;
  let bestLine: SpatialLine | undefined = undefined;

  for (const line of candidates) {
    const x1 = line.x1;
    const y1 = line.y1;
    const x2 = line.x2;
    const y2 = line.y2;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) continue;

    // Scalar projection t onto segment
    let t = ((normX - x1) * dx + (normY - y1) * dy) / lenSq;
    // Clamp slightly inside segment endpoints so camera does not slide off edge
    t = Math.max(0.04, Math.min(0.96, t));

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;

    // Distance in screen pixels
    const distXPx = (normX - projX) * canvasWidth;
    const distYPx = (normY - projY) * canvasHeight;
    const distPx = Math.sqrt(distXPx * distXPx + distYPx * distYPx);

    if (distPx < bestDistPx) {
      bestDistPx = distPx;
      bestX = projX;
      bestY = projY;
      bestLine = line;

      // Two candidate normals perpendicular to wall segment: (-dy, dx) and (dy, -dx)
      const n1x = -dy;
      const n1y = dx;
      const n2x = dy;
      const n2y = -dx;

      // Determine interior direction: if wall belongs to a room zone, always point into room center!
      const parentZone = zones ? findParentZoneForLine(line, zones) : undefined;

      let testX: number;
      let testY: number;

      if (parentZone) {
        const pzx1 = parentZone.x1 > 1 ? parentZone.x1 / 100 : parentZone.x1;
        const pzy1 = parentZone.y1 > 1 ? parentZone.y1 / 100 : parentZone.y1;
        const pzx2 = parentZone.x2 > 1 ? parentZone.x2 / 100 : parentZone.x2;
        const pzy2 = parentZone.y2 > 1 ? parentZone.y2 / 100 : parentZone.y2;
        const roomMidX = (pzx1 + pzx2) / 2;
        const roomMidY = (pzy1 + pzy2) / 2;
        testX = roomMidX - projX;
        testY = roomMidY - projY;
      } else {
        const toCursorX = normX - projX;
        const toCursorY = normY - projY;
        testX = Math.abs(toCursorX) > 0.0005 ? toCursorX : 0.5 - projX;
        testY = Math.abs(toCursorY) > 0.0005 ? toCursorY : 0.5 - projY;
      }

      // Select normal having positive dot product with interior vector
      const dot1 = n1x * testX + n1y * testY;
      const chosenNx = dot1 >= 0 ? n1x : n2x;
      const chosenNy = dot1 >= 0 ? n1y : n2y;

      // In screen coordinates: 0° is UP (-y), 90° is RIGHT (+x), 180° is DOWN (+y), 270° is LEFT (-x)
      const rad = Math.atan2(chosenNy, chosenNx);
      let deg = Math.round((rad * 180) / Math.PI + 90);
      deg = ((deg % 360) + 360) % 360;
      // Snap inward angle to closest 30-degree increment
      bestAngle = ((Math.round(deg / 30) * 30 % 360) + 360) % 360;
    }
  }

  // If ANY wall exists, the camera MUST stick to the closest wall!
  if (bestLine) {
    return {
      x: Math.round(bestX * 1000) / 10,
      y: Math.round(bestY * 1000) / 10,
      angle: bestAngle,
      snapped: true,
      wallLine: bestLine,
      distancePx: Math.round(bestDistPx),
    };
  }

  return {
    x: Math.max(3, Math.min(97, Math.round(normX * 100))),
    y: Math.max(4, Math.min(96, Math.round(normY * 100))),
    angle: 0,
    snapped: false,
    distancePx: Math.round(bestDistPx),
  };
}

interface FloorPlanCanvasProps {
  cameras: CameraNode[];
  links?: CameraNodeLink[];
  floorPlan?: FloorPlan | null;
  initialLines?: SpatialLine[];
  initialZones?: SpatialZone[];
  onAddCameraAtPos?: (x: number, y: number, angle?: number) => void;
  onUpdateCameraPos?: (id: string, x: number, y: number) => void;
  onUpdateCameraAngle?: (id: string, angle: number) => void;
  onSelectCamera?: (camera: CameraNode | null) => void;
  onDeleteCamera?: (id: string) => void;
  onQuickConnect?: (fromId: string, toId: string) => void;
  onDeleteLink?: (linkId: string) => void;
  onSaveLayout?: (layoutData: SaveLayoutRequest) => Promise<void>;
  selectedCameraId?: string;
  floorPlanUrl?: string;
  toolMode?: CanvasToolMode;
  onToolModeChange?: (mode: CanvasToolMode) => void;
}

interface HistorySnapshot {
  cameras: CameraNode[];
  lines: SpatialLine[];
  zones: SpatialZone[];
}

export function FloorPlanCanvas({
  cameras,
  links = [],
  floorPlan,
  initialLines = [],
  initialZones = [],
  onAddCameraAtPos,
  onUpdateCameraPos,
  onUpdateCameraAngle,
  onSelectCamera,
  onDeleteCamera,
  onQuickConnect,
  onDeleteLink,
  onSaveLayout,
  selectedCameraId,
  floorPlanUrl,
  toolMode: controlledToolMode,
  onToolModeChange,
}: FloorPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalToolMode, setInternalToolMode] = useState<CanvasToolMode>('select');
  const activeMode = controlledToolMode ?? internalToolMode;

  const setMode = useCallback(
    (mode: CanvasToolMode) => {
      setInternalToolMode(mode);
      onToolModeChange?.(mode);
      if (mode !== 'connect') {
        setConnectSourceId(null);
      }
      setDrawingStart(null);
      setDrawingCurrent(null);
      setDrawingShapeType(null);
      setSelectedLineIndex(null);
      setSelectedZoneId(null);
      setHoveredZoneId(null);
      setHoveredLineIndex(null);
      setDraggingLineIndex(null);
      setDraggingEndpoint(null);
      setDraggingZoneId(null);
      setDraggingZoneHandle(null);
      setAddHoverSnap(null);
      setSnappedWallId(null);
    },
    [onToolModeChange]
  );

  // Local state for interactive positioning & lines before bulk saving
  const [localCameras, setLocalCameras] = useState<CameraNode[]>(cameras);
  const [localLines, setLocalLines] = useState<SpatialLine[]>(initialLines);
  const [localZones, setLocalZones] = useState<SpatialZone[]>(() =>
    reconstructZonesFromLines(initialLines, initialZones)
  );
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Stamped zone pending naming modal (Option B: Rectangle / Zone Stamp)
  const [pendingZone, setPendingZone] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    widthMeters: number;
    heightMeters: number;
    areaSqm: number;
  } | null>(null);
  const [zoneModalName, setZoneModalName] = useState('');
  const [zoneModalType, setZoneModalType] = useState<
    'office' | 'meeting' | 'lobby' | 'corridor' | 'restricted' | 'other'
  >('meeting');
  const [zoneModalColor, setZoneModalColor] = useState<string>('purple');

  // Link deletion confirmation modal state
  const [linkToDelete, setLinkToDelete] = useState<{ id: string; fromName: string; toName: string } | null>(null);

  // Wall snapping hover preview state (for 'add' mode)
  const [addHoverSnap, setAddHoverSnap] = useState<WallSnapResult | null>(null);
  // Highlighted wall line during camera drag or add mode
  const [snappedWallId, setSnappedWallId] = useState<string | null>(null);

  // Undo / Redo History Stack
  const [past, setPast] = useState<HistorySnapshot[]>([]);
  const [future, setFuture] = useState<HistorySnapshot[]>([]);

  // Push snapshot into history before modifying state
  const pushHistorySnapshot = useCallback(
    (prevCameras: CameraNode[], prevLines: SpatialLine[], prevZones: SpatialZone[] = localZones) => {
      setPast((prev) => [...prev.slice(-30), { cameras: prevCameras, lines: prevLines, zones: prevZones }]);
      setFuture([]);
    },
    [localZones]
  );

  const handleUndo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast((p) => p.slice(0, p.length - 1));
    setFuture((f) => [{ cameras: localCameras, lines: localLines, zones: localZones }, ...f]);
    setLocalCameras(previous.cameras);
    setLocalLines(previous.lines);
    setLocalZones(previous.zones);
    setIsDirty(true);
    setSelectedLineIndex(null);
    setSelectedZoneId(null);
    setDraggingLineIndex(null);
    setDraggingEndpoint(null);
  }, [past, localCameras, localLines, localZones]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, { cameras: localCameras, lines: localLines, zones: localZones }]);
    setLocalCameras(next.cameras);
    setLocalLines(next.lines);
    setLocalZones(next.zones);
    setIsDirty(true);
    setSelectedLineIndex(null);
    setSelectedZoneId(null);
    setDraggingLineIndex(null);
    setDraggingEndpoint(null);
  }, [future, localCameras, localLines, localZones]);

  // Sync props when external cameras change (adding newly created cameras, removing deleted ones, and preserving local drag if dirty)
  useEffect(() => {
    setLocalCameras((prev) => {
      const activeIds = new Set(cameras.map((c) => c.id));
      const prevIds = new Set(prev.map((c) => c.id));

      // 1. Keep existing local cameras that are still in active cameras
      const existing = prev.filter((c) => activeIds.has(c.id));

      // 2. Add any newly created cameras from props that aren't yet in local state
      const newlyAdded = cameras.filter((c) => !prevIds.has(c.id));

      if (newlyAdded.length === 0 && existing.length === prev.length) {
        if (!isDirty) {
          return cameras;
        }
        return prev;
      }

      return [...existing, ...newlyAdded];
    });
  }, [cameras, isDirty]);

  useEffect(() => {
    if (!isDirty && initialLines) {
      setLocalLines(initialLines);
      setLocalZones((prev) => reconstructZonesFromLines(initialLines, prev));
    }
  }, [initialLines, isDirty]);

  // Dragging camera state
  const [draggingCamId, setDraggingCamId] = useState<string | null>(null);
  const camDragInitialRef = useRef<CameraNode[] | null>(null);

  // Line translation drag state
  const [draggingLineIndex, setDraggingLineIndex] = useState<number | null>(null);
  const lineDragOriginRef = useRef<{
    mouseStartX: number;
    mouseStartY: number;
    origX1: number;
    origY1: number;
    origX2: number;
    origY2: number;
    initialLinesSnapshot: SpatialLine[];
  } | null>(null);

  // Line endpoint handle drag state: point 1 (x1, y1) or point 2 (x2, y2)
  const [draggingEndpoint, setDraggingEndpoint] = useState<{
    lineIndex: number;
    point: 1 | 2;
  } | null>(null);
  const endpointDragInitialRef = useRef<SpatialLine[] | null>(null);

  // Zone translation drag state (moving whole rectangle)
  const [draggingZoneId, setDraggingZoneId] = useState<string | null>(null);
  const zoneDragOriginRef = useRef<{
    mouseStartX: number;
    mouseStartY: number;
    origX1: number;
    origY1: number;
    origX2: number;
    origY2: number;
    initialLinesSnapshot: SpatialLine[];
    initialZonesSnapshot: SpatialZone[];
    initialCamerasSnapshot: CameraNode[];
    attachedCameras: AttachedCameraInfo[];
  } | null>(null);

  // Zone 4-corner resizing drag state
  const [draggingZoneHandle, setDraggingZoneHandle] = useState<{
    zoneId: string;
    handle: ZoneHandleType;
  } | null>(null);
  const zoneHandleDragOriginRef = useRef<{
    mouseStartX: number;
    mouseStartY: number;
    origX1: number;
    origY1: number;
    origX2: number;
    origY2: number;
    initialLinesSnapshot: SpatialLine[];
    initialZonesSnapshot: SpatialZone[];
    initialCamerasSnapshot: CameraNode[];
    attachedCameras: AttachedCameraInfo[];
  } | null>(null);

  // Quick connect state
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);

  // Shape/Line drawing in-progress rubberband state
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null);
  const [drawingCurrent, setDrawingCurrent] = useState<{ x: number; y: number } | null>(null);
  const [drawingShapeType, setDrawingShapeType] = useState<'zone' | 'wall' | 'corridor' | null>(null);

  // Selected line for inspection, editing handles, or deletion
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);

  // Scale: default to 0.04 meters per pixel (approx 25 px per meter) or use floorPlan config
  const scaleMetersPerPx = floorPlan?.scale_meters_per_px || 0.04;

  // Virtual World Canvas Dimensions: Expansive blueprint plane (default 2400 x 1500)
  const baseWorldWidth = floorPlan?.canvas_width_px || BASE_WORLD_WIDTH;
  const baseWorldHeight = floorPlan?.canvas_height_px || BASE_WORLD_HEIGHT;
  const canvasDimensions = useMemo(
    () => ({ width: baseWorldWidth, height: baseWorldHeight }),
    [baseWorldWidth, baseWorldHeight]
  );

  // Viewport Zoom & Pan state (Figma / Infinite Canvas style)
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  // Scroll sensitivity multiplier: 0.25 (gentle) → 1.0 (default) → 2.0 (fast)
  const [zoomSensitivity, setZoomSensitivity] = useState(1.0);
  const zoomSensitivityRef = useRef(1.0);
  const panStartRef = useRef<{
    startX: number;
    startY: number;
    initialPanX: number;
    initialPanY: number;
    hasMoved: boolean;
  } | null>(null);
  const didPanDragRef = useRef(false);
  const hasInitializedViewRef = useRef(false);

  // Unified Screen (clientX, clientY) -> Virtual World (normX, normY) transformation
  const getWorldCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) {
        return { normX: 0.5, normY: 0.5, rawX: 50, rawY: 50, worldPxX: baseWorldWidth / 2, worldPxY: baseWorldHeight / 2 };
      }
      const rect = containerRef.current.getBoundingClientRect();
      const containerX = clientX - rect.left;
      const containerY = clientY - rect.top;
      const worldPxX = (containerX - pan.x) / zoom;
      const worldPxY = (containerY - pan.y) / zoom;
      const normX = worldPxX / baseWorldWidth;
      const normY = worldPxY / baseWorldHeight;
      return {
        normX,
        normY,
        rawX: normX * 100,
        rawY: normY * 100,
        worldPxX,
        worldPxY,
      };
    },
    [pan.x, pan.y, zoom, baseWorldWidth, baseWorldHeight]
  );

  // Smooth Non-Passive Mouse Wheel Zoom centered at cursor & Touchpad Pan
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      if (e.ctrlKey || (Math.abs(e.deltaY) > 0 && Math.abs(e.deltaX) === 0)) {
        // Base zoom-in / zoom-out factors, scaled by current sensitivity
        const sens = zoomSensitivityRef.current;
        const zoomInFactor = 1 + (0.12 * sens);
        const zoomOutFactor = 1 - (0.11 * sens);
        const zoomFactor = e.deltaY < 0 ? zoomInFactor : zoomOutFactor;
        setZoom((prevZoom) => {
          const nextZoom = Math.max(0.2, Math.min(3.5, Math.round(prevZoom * zoomFactor * 100) / 100));
          if (nextZoom === prevZoom) return prevZoom;
          setPan((prevPan) => ({
            x: cursorX - (cursorX - prevPan.x) * (nextZoom / prevZoom),
            y: cursorY - (cursorY - prevPan.y) * (nextZoom / prevZoom),
          }));
          return nextZoom;
        });
      } else {
        setPan((prevPan) => ({
          x: prevPan.x - e.deltaX,
          y: prevPan.y - e.deltaY,
        }));
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheel);
    };
  }, []);

  const handleZoomIn = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setZoom((prevZoom) => {
      const nextZoom = Math.min(3.5, Math.round(prevZoom * 1.25 * 100) / 100);
      if (nextZoom === prevZoom) return prevZoom;
      setPan((prevPan) => ({
        x: centerX - (centerX - prevPan.x) * (nextZoom / prevZoom),
        y: centerY - (centerY - prevPan.y) * (nextZoom / prevZoom),
      }));
      return nextZoom;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setZoom((prevZoom) => {
      const nextZoom = Math.max(0.2, Math.round(prevZoom * 0.8 * 100) / 100);
      if (nextZoom === prevZoom) return prevZoom;
      setPan((prevPan) => ({
        x: centerX - (centerX - prevPan.x) * (nextZoom / prevZoom),
        y: centerY - (centerY - prevPan.y) * (nextZoom / prevZoom),
      }));
      return nextZoom;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setZoom((prevZoom) => {
      const nextZoom = 1.0;
      setPan((prevPan) => ({
        x: centerX - (centerX - prevPan.x) * (nextZoom / prevZoom),
        y: centerY - (centerY - prevPan.y) * (nextZoom / prevZoom),
      }));
      return nextZoom;
    });
  }, []);

  const handleFitView = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const allPointsX: number[] = [];
    const allPointsY: number[] = [];

    localCameras.forEach((c) => {
      if (c.x_coord !== undefined && c.y_coord !== undefined) {
        allPointsX.push((c.x_coord / 100) * baseWorldWidth);
        allPointsY.push((c.y_coord / 100) * baseWorldHeight);
      }
    });

    localZones.forEach((z) => {
      allPointsX.push(Math.min(z.x1, z.x2) * baseWorldWidth, Math.max(z.x1, z.x2) * baseWorldWidth);
      allPointsY.push(Math.min(z.y1, z.y2) * baseWorldHeight, Math.max(z.y1, z.y2) * baseWorldHeight);
    });

    localLines.forEach((l) => {
      allPointsX.push(l.x1 * baseWorldWidth, l.x2 * baseWorldWidth);
      allPointsY.push(l.y1 * baseWorldHeight, l.y2 * baseWorldHeight);
    });

    if (allPointsX.length > 0 && allPointsY.length > 0) {
      const minX = Math.min(...allPointsX);
      const maxX = Math.max(...allPointsX);
      const minY = Math.min(...allPointsY);
      const maxY = Math.max(...allPointsY);

      const padding = 80;
      const contentW = Math.max(100, maxX - minX + padding * 2);
      const contentH = Math.max(100, maxY - minY + padding * 2);

      const fitZoom = Math.max(0.2, Math.min(1.6, Math.min(rect.width / contentW, rect.height / contentH)));
      const roundedZoom = Math.round(fitZoom * 100) / 100;

      const midContentX = (minX + maxX) / 2;
      const midContentY = (minY + maxY) / 2;

      const nextPanX = rect.width / 2 - midContentX * roundedZoom;
      const nextPanY = rect.height / 2 - midContentY * roundedZoom;

      setZoom(roundedZoom);
      setPan({ x: Math.round(nextPanX), y: Math.round(nextPanY) });
    } else {
      const defaultZoom = Math.max(0.3, Math.min(0.7, Math.min(rect.width / baseWorldWidth, rect.height / baseWorldHeight) * 0.95));
      const roundedZoom = Math.round(defaultZoom * 100) / 100;
      setZoom(roundedZoom);
      setPan({
        x: Math.round((rect.width - baseWorldWidth * roundedZoom) / 2),
        y: Math.round((rect.height - baseWorldHeight * roundedZoom) / 2),
      });
    }
  }, [localCameras, localZones, localLines, baseWorldWidth, baseWorldHeight]);

  useEffect(() => {
    if (!containerRef.current || hasInitializedViewRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      hasInitializedViewRef.current = true;
      handleFitView();
    }
  }, [handleFitView]);

  // Compute live drawing length in meters and pixels
  const liveLineMetrics = useMemo(() => {
    if (
      !drawingStart ||
      !drawingCurrent ||
      (drawingShapeType !== 'wall' && drawingShapeType !== 'corridor')
    )
      return null;
    const dxPx = ((drawingCurrent.x - drawingStart.x) / 100) * canvasDimensions.width;
    const dyPx = ((drawingCurrent.y - drawingStart.y) / 100) * canvasDimensions.height;
    const distPx = Math.sqrt(dxPx * dxPx + dyPx * dyPx);
    const distMeters = distPx * scaleMetersPerPx;
    return {
      distPx: Math.round(distPx),
      distMeters: Math.round(distMeters * 10) / 10,
      midX: (drawingStart.x + drawingCurrent.x) / 2,
      midY: (drawingStart.y + drawingCurrent.y) / 2,
    };
  }, [drawingStart, drawingCurrent, drawingShapeType, canvasDimensions, scaleMetersPerPx]);

  // Compute live rubberband rectangle metrics for zone stamping (Option B)
  const liveZoneMetrics = useMemo(() => {
    if (!drawingStart || !drawingCurrent || drawingShapeType !== 'zone') return null;
    const minX = Math.min(drawingStart.x, drawingCurrent.x);
    const maxX = Math.max(drawingStart.x, drawingCurrent.x);
    const minY = Math.min(drawingStart.y, drawingCurrent.y);
    const maxY = Math.max(drawingStart.y, drawingCurrent.y);

    const widthPct = Math.max(0.1, maxX - minX);
    const heightPct = Math.max(0.1, maxY - minY);

    const widthPx = (widthPct / 100) * canvasDimensions.width;
    const heightPx = (heightPct / 100) * canvasDimensions.height;

    const widthMeters = Math.round(widthPx * scaleMetersPerPx * 10) / 10;
    const heightMeters = Math.round(heightPx * scaleMetersPerPx * 10) / 10;
    const areaSqm = Math.round(widthMeters * heightMeters * 10) / 10;

    const isOverlapping = localZones.some((z) =>
      doBoxesOverlap(
        { x1: minX / 100, y1: minY / 100, x2: maxX / 100, y2: maxY / 100 },
        z,
        MIN_ZONE_SEPARATION
      )
    );

    return {
      minX,
      maxX,
      minY,
      maxY,
      widthPct,
      heightPct,
      midX: (minX + maxX) / 2,
      midY: (minY + maxY) / 2,
      widthMeters,
      heightMeters,
      areaSqm,
      isOverlapping,
    };
  }, [drawingStart, drawingCurrent, drawingShapeType, canvasDimensions, scaleMetersPerPx, localZones]);

  // Delete an entire stamped zone along with its generated perimeter walls
  const handleDeleteZone = useCallback(
    (zoneId: string) => {
      pushHistorySnapshot(localCameras, localLines, localZones);

      const zoneToDelete = localZones.find((z) => z.id === zoneId);
      const zoneName = zoneToDelete?.name;

      // Cleanly remove the 4 perimeter walls created for this zone
      setLocalLines((prev) =>
        prev.filter(
          (l) =>
            !l.id?.startsWith(`${zoneId}-wall`) &&
            (!zoneName || !l.label?.startsWith(zoneName))
        )
      );
      setLocalZones((prev) => prev.filter((z) => z.id !== zoneId));
      setSelectedZoneId(null);
      setSelectedLineIndex(null);
      setIsDirty(true);
      toast.success(`Deleted zone "${zoneName || 'Area'}"`);
    },
    [localZones, localCameras, localLines, pushHistorySnapshot]
  );

  // Commit pending zone from modal into localZones and create 4 closed perimeter wall segments
  const handleSaveZoneModal = useCallback(() => {
    if (!pendingZone) return;

    if (localZones.some((z) => doBoxesOverlap(pendingZone, z, MIN_ZONE_SEPARATION))) {
      toast.error('Cannot save: zone overlaps an existing room. Keep boxes separated.');
      return;
    }

    const finalName = zoneModalName.trim() || `Zone ${localZones.length + 1}`;
    const zoneId = `zone-${Date.now()}`;

    const newZone: SpatialZone = {
      id: zoneId,
      name: finalName,
      zone_type: zoneModalType,
      x1: pendingZone.x1,
      y1: pendingZone.y1,
      x2: pendingZone.x2,
      y2: pendingZone.y2,
      color: zoneModalColor,
    };

    // 4 Perimeter closed wall lines with IDs for instant camera wall-snapping on any edge
    const perimeterWalls = computeZonePerimeterWalls(
      zoneId,
      finalName,
      pendingZone.x1,
      pendingZone.y1,
      pendingZone.x2,
      pendingZone.y2
    );

    pushHistorySnapshot(localCameras, localLines, localZones);
    const updatedZones = [...localZones, newZone];
    const updatedLines = [...localLines, ...perimeterWalls];
    setLocalZones(updatedZones);
    setLocalLines(updatedLines);
    setIsDirty(true);
    setPendingZone(null);
    setMode('select');
    setSelectedZoneId(zoneId);
  }, [
    pendingZone,
    zoneModalName,
    localZones,
    zoneModalType,
    zoneModalColor,
    pushHistorySnapshot,
    localCameras,
    localLines,
    setMode,
  ]);

  // Global Keyboard listener for Undo (Ctrl+Z), Redo (Ctrl+Y / Ctrl+Shift+Z), Space-pan, Shortcuts & Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;

      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
        return;
      }

      if (!isCtrl && (e.key.toLowerCase() === 'h')) {
        setMode('pan');
        return;
      }

      if (!isCtrl && (e.key.toLowerCase() === 'v')) {
        setMode('select');
        return;
      }

      if (isCtrl && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
        return;
      }

      if (isCtrl && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        handleZoomOut();
        return;
      }

      if (isCtrl && e.key === '0') {
        e.preventDefault();
        handleResetZoom();
        return;
      }

      if (isCtrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (isCtrl && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedZoneId !== null) {
          e.preventDefault();
          handleDeleteZone(selectedZoneId);
        } else if (selectedLineIndex !== null) {
          e.preventDefault();
          const idxToDelete = selectedLineIndex;
          const lineToDelete = localLines[idxToDelete];
          if (lineToDelete?.id && lineToDelete.id.includes('-wall-')) {
            const matchedZoneId = lineToDelete.id.split('-wall-')[0];
            handleDeleteZone(matchedZoneId);
            return;
          }
          pushHistorySnapshot(localCameras, localLines, localZones);
          setLocalLines((prev) => prev.filter((_, idx) => idx !== idxToDelete));
          setSelectedLineIndex(null);
          setIsDirty(true);
        } else if (selectedCameraId && onDeleteCamera) {
          e.preventDefault();
          onDeleteCamera(selectedCameraId);
        }
      } else if (e.key === 'Escape') {
        setMode('select');
        setSelectedLineIndex(null);
        setSelectedZoneId(null);
        setAddHoverSnap(null);
        setPendingZone(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    handleUndo,
    handleRedo,
    selectedZoneId,
    selectedLineIndex,
    selectedCameraId,
    onDeleteCamera,
    localCameras,
    localLines,
    localZones,
    pushHistorySnapshot,
    handleDeleteZone,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    setMode,
  ]);

  // Unified MouseMove / MouseUp Window Listener for Drags (Camera, Line Body, Line Endpoints, Line Drawing, Viewport Panning)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      // 0. Viewport Pan Dragging
      if (isPanning && panStartRef.current) {
        const dx = e.clientX - panStartRef.current.startX;
        const dy = e.clientY - panStartRef.current.startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          panStartRef.current.hasMoved = true;
          didPanDragRef.current = true;
        }
        setPan({
          x: panStartRef.current.initialPanX + dx,
          y: panStartRef.current.initialPanY + dy,
        });
        return;
      }

      // 1. Camera Node Dragging (with Wall-Snap and Inward FOV Auto-Orientation)
      if (draggingCamId) {
        const { normX, normY } = getWorldCoords(e.clientX, e.clientY);

        const snap = calculateWallSnap(
          normX,
          normY,
          localLines,
          canvasDimensions.width,
          canvasDimensions.height,
          65,
          localZones
        );

        const targetX = snap.snapped ? snap.x : Math.max(0.5, Math.min(99.5, Math.round(normX * 100)));
        const targetY = snap.snapped ? snap.y : Math.max(0.5, Math.min(99.5, Math.round(normY * 100)));

        setLocalCameras((prev) =>
          prev.map((c) => {
            if (c.id !== draggingCamId) return c;
            return {
              ...c,
              x_coord: targetX,
              y_coord: targetY,
              fov_angle: snap.snapped ? snap.angle : (c.fov_angle ?? 0),
            };
          })
        );
        setSnappedWallId(snap.snapped ? (snap.wallLine?.id || 'snapped') : null);
        setIsDirty(true);
        onUpdateCameraPos?.(draggingCamId, targetX, targetY);
        if (snap.snapped) {
          onUpdateCameraAngle?.(draggingCamId, snap.angle);
        }
        return;
      }

      // 2. Line Body Translation Dragging
      if (draggingLineIndex !== null && lineDragOriginRef.current) {
        const origin = lineDragOriginRef.current;
        const { normX: currentNormX, normY: currentNormY } = getWorldCoords(e.clientX, e.clientY);
        const deltaX = currentNormX - origin.mouseStartX;
        const deltaY = currentNormY - origin.mouseStartY;

        let newX1 = origin.origX1 + deltaX;
        let newY1 = origin.origY1 + deltaY;
        let newX2 = origin.origX2 + deltaX;
        let newY2 = origin.origY2 + deltaY;

        // Keep entire line inside canvas [0.005, 0.995]
        const minX = Math.min(newX1, newX2);
        const maxX = Math.max(newX1, newX2);
        const minY = Math.min(newY1, newY2);
        const maxY = Math.max(newY1, newY2);

        if (minX < 0.005) {
          const shift = 0.005 - minX;
          newX1 += shift;
          newX2 += shift;
        }
        if (maxX > 0.995) {
          const shift = maxX - 0.995;
          newX1 -= shift;
          newX2 -= shift;
        }
        if (minY < 0.005) {
          const shift = 0.005 - minY;
          newY1 += shift;
          newY2 += shift;
        }
        if (maxY > 0.995) {
          const shift = maxY - 0.995;
          newY1 -= shift;
          newY2 -= shift;
        }

        setLocalLines((prev) =>
          prev.map((l, i) =>
            i === draggingLineIndex
              ? {
                  ...l,
                  x1: Math.round(newX1 * 1000) / 1000,
                  y1: Math.round(newY1 * 1000) / 1000,
                  x2: Math.round(newX2 * 1000) / 1000,
                  y2: Math.round(newY2 * 1000) / 1000,
                }
              : l
          )
        );
        setIsDirty(true);
        return;
      }

      // 3. Line Endpoint Handle Dragging
      if (draggingEndpoint) {
        const { normX, normY } = getWorldCoords(e.clientX, e.clientY);
        const clampedNormX = Math.max(0.005, Math.min(0.995, normX));
        const clampedNormY = Math.max(0.005, Math.min(0.995, normY));

        setLocalLines((prev) =>
          prev.map((l, i) => {
            if (i !== draggingEndpoint.lineIndex) return l;
            if (draggingEndpoint.point === 1) {
              return {
                ...l,
                x1: Math.round(clampedNormX * 1000) / 1000,
                y1: Math.round(clampedNormY * 1000) / 1000,
              };
            } else {
              return {
                ...l,
                x2: Math.round(clampedNormX * 1000) / 1000,
                y2: Math.round(clampedNormY * 1000) / 1000,
              };
            }
          })
        );
        setIsDirty(true);
        return;
      }

      // 3B. Zone Body Translation Dragging (Move Whole Rectangle)
      if (draggingZoneId && zoneDragOriginRef.current) {
        const origin = zoneDragOriginRef.current;
        const { normX: currentNormX, normY: currentNormY } = getWorldCoords(e.clientX, e.clientY);
        const deltaX = currentNormX - origin.mouseStartX;
        const deltaY = currentNormY - origin.mouseStartY;

        const w = origin.origX2 - origin.origX1;
        const h = origin.origY2 - origin.origY1;

        const otherZones = localZones.filter((z) => z.id !== draggingZoneId);

        const resolved = resolveZoneTranslation(
          origin.origX1 + deltaX,
          origin.origY1 + deltaY,
          w,
          h,
          origin.origX1,
          origin.origY1,
          otherZones,
          MIN_ZONE_SEPARATION
        );

        const roundedX1 = Math.round(resolved.x1 * 1000) / 1000;
        const roundedY1 = Math.round(resolved.y1 * 1000) / 1000;
        const roundedX2 = Math.round(resolved.x2 * 1000) / 1000;
        const roundedY2 = Math.round(resolved.y2 * 1000) / 1000;

        setLocalZones((prev) =>
          prev.map((z) =>
            z.id === draggingZoneId
              ? { ...z, x1: roundedX1, y1: roundedY1, x2: roundedX2, y2: roundedY2 }
              : z
          )
        );

        const targetZone = localZones.find((z) => z.id === draggingZoneId);
        if (targetZone) {
          const updatedWalls = computeZonePerimeterWalls(
            targetZone.id,
            targetZone.name,
            roundedX1,
            roundedY1,
            roundedX2,
            roundedY2
          );
          setLocalLines((prev) =>
            applyZoneWallsToLines(prev, targetZone.id, targetZone.name, updatedWalls)
          );
        }

        // Live shift all attached cameras so they stay sticked to the shape's walls in real time
        const shiftX = resolved.x1 - origin.origX1;
        const shiftY = resolved.y1 - origin.origY1;

        if (origin.attachedCameras && origin.attachedCameras.length > 0) {
          const attachedMap = new Map(origin.attachedCameras.map((a) => [a.camera.id, a]));
          // Compute updated positions OUTSIDE the state updater (pure computation only inside setLocalCameras)
          const cameraUpdates: { id: string; x: number; y: number }[] = [];
          setLocalCameras((prev) => {
            const next = prev.map((c) => {
              const att = attachedMap.get(c.id);
              if (!att) return c;
              const newNormX = Math.max(0.005, Math.min(0.995, att.origNormX + shiftX));
              const newNormY = Math.max(0.005, Math.min(0.995, att.origNormY + shiftY));
              const newPctX = Math.round(newNormX * 1000) / 10;
              const newPctY = Math.round(newNormY * 1000) / 10;
              cameraUpdates.push({ id: c.id, x: newPctX, y: newPctY });
              return {
                ...c,
                x_coord: newPctX,
                y_coord: newPctY,
              };
            });
            return next;
          });
          // Notify parent AFTER state update, not during the updater
          cameraUpdates.forEach(({ id, x, y }) => onUpdateCameraPos?.(id, x, y));
        }

        setIsDirty(true);
        return;
      }

      // 3C. Zone 4-Corner Resizing Dragging
      if (draggingZoneHandle && zoneHandleDragOriginRef.current) {
        const { zoneId, handle } = draggingZoneHandle;
        const origin = zoneHandleDragOriginRef.current;
        const { normX: currentNormX, normY: currentNormY } = getWorldCoords(e.clientX, e.clientY);

        const targetZone = localZones.find((z) => z.id === zoneId);
        if (!targetZone) return;

        const deltaX = currentNormX - origin.mouseStartX;
        const deltaY = currentNormY - origin.mouseStartY;

        let proposedX1 = origin.origX1;
        let proposedY1 = origin.origY1;
        let proposedX2 = origin.origX2;
        let proposedY2 = origin.origY2;

        const minDim = 0.02; // minimum ~16px size

        switch (handle) {
          case 'nw':
            proposedX1 = Math.min(origin.origX2 - minDim, origin.origX1 + deltaX);
            proposedY1 = Math.min(origin.origY2 - minDim, origin.origY1 + deltaY);
            break;
          case 'ne':
            proposedX2 = Math.max(origin.origX1 + minDim, origin.origX2 + deltaX);
            proposedY1 = Math.min(origin.origY2 - minDim, origin.origY1 + deltaY);
            break;
          case 'se':
            proposedX2 = Math.max(origin.origX1 + minDim, origin.origX2 + deltaX);
            proposedY2 = Math.max(origin.origY1 + minDim, origin.origY2 + deltaY);
            break;
          case 'sw':
            proposedX1 = Math.min(origin.origX2 - minDim, origin.origX1 + deltaX);
            proposedY2 = Math.max(origin.origY1 + minDim, origin.origY2 + deltaY);
            break;
        }

        const otherZones = localZones.filter((z) => z.id !== zoneId);
        const resolved = resolveZoneResize(
          handle,
          proposedX1,
          proposedY1,
          proposedX2,
          proposedY2,
          origin,
          otherZones,
          MIN_ZONE_SEPARATION
        );

        const roundedX1 = Math.round(resolved.x1 * 1000) / 1000;
        const roundedY1 = Math.round(resolved.y1 * 1000) / 1000;
        const roundedX2 = Math.round(resolved.x2 * 1000) / 1000;
        const roundedY2 = Math.round(resolved.y2 * 1000) / 1000;

        setLocalZones((prev) =>
          prev.map((z) =>
            z.id === zoneId
              ? { ...z, x1: roundedX1, y1: roundedY1, x2: roundedX2, y2: roundedY2 }
              : z
          )
        );

        const updatedWalls = computeZonePerimeterWalls(
          targetZone.id,
          targetZone.name,
          roundedX1,
          roundedY1,
          roundedX2,
          roundedY2
        );
        setLocalLines((prev) =>
          applyZoneWallsToLines(prev, targetZone.id, targetZone.name, updatedWalls)
        );

        // Live reposition all attached cameras along the edges as room dimensions change
        if (origin.attachedCameras && origin.attachedCameras.length > 0) {
          const newW = Math.max(0.001, roundedX2 - roundedX1);
          const newH = Math.max(0.001, roundedY2 - roundedY1);
          const attachedMap = new Map(origin.attachedCameras.map((a) => [a.camera.id, a]));
          // Compute updated positions OUTSIDE the state updater (pure computation only inside setLocalCameras)
          const cameraUpdates: { id: string; x: number; y: number }[] = [];
          setLocalCameras((prev) => {
            const next = prev.map((c) => {
              const att = attachedMap.get(c.id);
              if (!att) return c;
              let newNormX = roundedX1 + att.relU * newW;
              let newNormY = roundedY1 + att.relV * newH;
              if (att.wallAttachment === 'west') {
                newNormX = roundedX1;
                newNormY = roundedY1 + att.relV * newH;
              } else if (att.wallAttachment === 'east') {
                newNormX = roundedX2;
                newNormY = roundedY1 + att.relV * newH;
              } else if (att.wallAttachment === 'north') {
                newNormX = roundedX1 + att.relU * newW;
                newNormY = roundedY1;
              } else if (att.wallAttachment === 'south') {
                newNormX = roundedX1 + att.relU * newW;
                newNormY = roundedY2;
              }
              const clampedNormX = Math.max(0.005, Math.min(0.995, newNormX));
              const clampedNormY = Math.max(0.005, Math.min(0.995, newNormY));
              const newPctX = Math.round(clampedNormX * 1000) / 10;
              const newPctY = Math.round(clampedNormY * 1000) / 10;
              cameraUpdates.push({ id: c.id, x: newPctX, y: newPctY });
              return {
                ...c,
                x_coord: newPctX,
                y_coord: newPctY,
              };
            });
            return next;
          });
          // Notify parent AFTER state update, not during the updater
          cameraUpdates.forEach(({ id, x, y }) => onUpdateCameraPos?.(id, x, y));
        }

        setIsDirty(true);
        return;
      }

      // 4. Drawing New Line Rubberband
      if (drawingStart) {
        const { rawX, rawY } = getWorldCoords(e.clientX, e.clientY);
        const clampedX = Math.max(0.5, Math.min(99.5, Math.round(rawX * 10) / 10));
        const clampedY = Math.max(0.5, Math.min(99.5, Math.round(rawY * 10) / 10));
        setDrawingCurrent({ x: clampedX, y: clampedY });
        return;
      }
    };

    const handleMouseUp = () => {
      // 0. Finish Viewport Panning
      if (isPanning) {
        const hadMoved = panStartRef.current?.hasMoved ?? false;
        setIsPanning(false);
        panStartRef.current = null;

        // If user tapped left click on empty canvas without dragging and not in add mode, clear selections
        if (!hadMoved && activeMode !== 'add') {
          setSelectedLineIndex(null);
          setSelectedZoneId(null);
          onSelectCamera?.(null);
        }
      }

      // 1. Finish Camera Drag
      if (draggingCamId) {
        if (camDragInitialRef.current) {
          pushHistorySnapshot(camDragInitialRef.current, localLines);
          camDragInitialRef.current = null;
        }
        setDraggingCamId(null);
        setSnappedWallId(null);
      }

      // 2. Finish Line Body Drag
      if (draggingLineIndex !== null) {
        if (lineDragOriginRef.current) {
          pushHistorySnapshot(localCameras, lineDragOriginRef.current.initialLinesSnapshot);
          lineDragOriginRef.current = null;
        }
        setDraggingLineIndex(null);
      }

      // 3. Finish Endpoint Handle Drag
      if (draggingEndpoint) {
        if (endpointDragInitialRef.current) {
          pushHistorySnapshot(localCameras, endpointDragInitialRef.current);
          endpointDragInitialRef.current = null;
        }
        setDraggingEndpoint(null);
      }

      // 3B. Finish Zone Body Drag
      if (draggingZoneId) {
        if (zoneDragOriginRef.current) {
          pushHistorySnapshot(
            zoneDragOriginRef.current.initialCamerasSnapshot,
            zoneDragOriginRef.current.initialLinesSnapshot,
            zoneDragOriginRef.current.initialZonesSnapshot
          );
          zoneDragOriginRef.current = null;
        }
        setDraggingZoneId(null);
      }

      // 3C. Finish Zone Handle Resizing / Rotating
      if (draggingZoneHandle) {
        if (zoneHandleDragOriginRef.current) {
          pushHistorySnapshot(
            zoneHandleDragOriginRef.current.initialCamerasSnapshot,
            zoneHandleDragOriginRef.current.initialLinesSnapshot,
            zoneHandleDragOriginRef.current.initialZonesSnapshot
          );
          zoneHandleDragOriginRef.current = null;
        }
        setDraggingZoneHandle(null);
      }

      // 4. Finish Stamping Zone (Option B)
      if (drawingShapeType === 'zone' && drawingStart && drawingCurrent) {
        const minX = Math.min(drawingStart.x, drawingCurrent.x);
        const maxX = Math.max(drawingStart.x, drawingCurrent.x);
        const minY = Math.min(drawingStart.y, drawingCurrent.y);
        const maxY = Math.max(drawingStart.y, drawingCurrent.y);

        const cand = {
          x1: Math.round((minX / 100) * 1000) / 1000,
          y1: Math.round((minY / 100) * 1000) / 1000,
          x2: Math.round((maxX / 100) * 1000) / 1000,
          y2: Math.round((maxY / 100) * 1000) / 1000,
        };

        const overlaps = localZones.some((z) => doBoxesOverlap(cand, z, MIN_ZONE_SEPARATION));
        if (overlaps) {
          toast.error('Boxes cannot overlap, lines should stay separated.');
          setDrawingStart(null);
          setDrawingCurrent(null);
          setDrawingShapeType(null);
          return;
        }

        const widthPx = ((maxX - minX) / 100) * canvasDimensions.width;
        const heightPx = ((maxY - minY) / 100) * canvasDimensions.height;

        if (widthPx >= 15 && heightPx >= 15) {
          const widthMeters = Math.round(widthPx * scaleMetersPerPx * 10) / 10;
          const heightMeters = Math.round(heightPx * scaleMetersPerPx * 10) / 10;
          const areaSqm = Math.round(widthMeters * heightMeters * 10) / 10;

          setPendingZone({
            ...cand,
            widthMeters,
            heightMeters,
            areaSqm,
          });
          setZoneModalName(`Zone ${localZones.length + 1}`);
          setZoneModalType('meeting');
          setZoneModalColor('purple');
        }

        setDrawingStart(null);
        setDrawingCurrent(null);
        setDrawingShapeType(null);
        return;
      }

      // 5. Finish New Line Drawing (Wall or Corridor)
      if ((drawingShapeType === 'wall' || drawingShapeType === 'corridor') && drawingStart && drawingCurrent) {
        const dxPx = ((drawingCurrent.x - drawingStart.x) / 100) * canvasDimensions.width;
        const dyPx = ((drawingCurrent.y - drawingStart.y) / 100) * canvasDimensions.height;
        const distPx = Math.sqrt(dxPx * dxPx + dyPx * dyPx);

        if (distPx >= 10) {
          const normX1 = Math.round((drawingStart.x / 100) * 1000) / 1000;
          const normY1 = Math.round((drawingStart.y / 100) * 1000) / 1000;
          const normX2 = Math.round((drawingCurrent.x / 100) * 1000) / 1000;
          const normY2 = Math.round((drawingCurrent.y / 100) * 1000) / 1000;

          // Prevent standalone wall lines from penetrating through existing room boxes
          const midX = (normX1 + normX2) / 2;
          const midY = (normY1 + normY2) / 2;
          const penetratesZone = localZones.some((z) => {
            const zMinX = Math.min(z.x1, z.x2) + 0.005;
            const zMaxX = Math.max(z.x1, z.x2) - 0.005;
            const zMinY = Math.min(z.y1, z.y2) + 0.005;
            const zMaxY = Math.max(z.y1, z.y2) - 0.005;

            const pt1Inside = normX1 > zMinX && normX1 < zMaxX && normY1 > zMinY && normY1 < zMaxY;
            const pt2Inside = normX2 > zMinX && normX2 < zMaxX && normY2 > zMinY && normY2 < zMaxY;
            const midInside = midX > zMinX && midX < zMaxX && midY > zMinY && midY < zMaxY;
            return (pt1Inside && pt2Inside) || midInside;
          });

          if (penetratesZone) {
            toast.error('Wall lines cannot cut through rooms. Lines should stay separated.');
            setDrawingStart(null);
            setDrawingCurrent(null);
            setDrawingShapeType(null);
            return;
          }

          const newLineType = drawingShapeType === 'corridor' ? 'corridor' : 'wall';
          const newLine: SpatialLine = {
            x1: normX1,
            y1: normY1,
            x2: normX2,
            y2: normY2,
            line_type: newLineType,
            label: newLineType === 'corridor' ? 'Corridor' : 'Wall',
          };

          pushHistorySnapshot(localCameras, localLines, localZones);
          const nextLines = [...localLines, newLine];
          setLocalLines(nextLines);
          setSelectedLineIndex(nextLines.length - 1);
          setIsDirty(true);

          // Auto-switch to 'select' mode so clicking does not draw another line
          setMode('select');
        }

        setDrawingStart(null);
        setDrawingCurrent(null);
        setDrawingShapeType(null);
      } else if (drawingStart) {
        setDrawingStart(null);
        setDrawingCurrent(null);
        setDrawingShapeType(null);
      }
    };

    const isEngaged =
      isPanning ||
      Boolean(draggingCamId) ||
      draggingLineIndex !== null ||
      Boolean(draggingEndpoint) ||
      Boolean(draggingZoneId) ||
      Boolean(draggingZoneHandle) ||
      Boolean(drawingStart);

    if (isEngaged) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    isPanning,
    draggingCamId,
    draggingLineIndex,
    draggingEndpoint,
    draggingZoneId,
    draggingZoneHandle,
    drawingStart,
    drawingCurrent,
    drawingShapeType,
    activeMode,
    canvasDimensions,
    scaleMetersPerPx,
    localCameras,
    localLines,
    localZones,
    pushHistorySnapshot,
    onUpdateCameraPos,
    onUpdateCameraAngle,
    getWorldCoords,
    setMode,
  ]);

  // Handle canvas mouse down (Left click: Pan canvas by default; Right click: Drag to draw shape / line)
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    // 1. Right-Click (Button 2): Draw Shape (Rectangle / Zone) or Line (Wall / Corridor)
    if (e.button === 2) {
      e.preventDefault();
      const { normX, normY } = getWorldCoords(e.clientX, e.clientY);

      let shapeType: 'zone' | 'wall' | 'corridor' = 'zone';
      if (activeMode === 'draw_wall') {
        shapeType = 'wall';
      } else if (activeMode === 'draw_corridor') {
        shapeType = 'corridor';
      } else {
        shapeType = 'zone';
      }

      if (shapeType === 'zone') {
        const isInside = localZones.some((z) => {
          const zMinX = Math.min(z.x1, z.x2) - MIN_ZONE_SEPARATION;
          const zMaxX = Math.max(z.x1, z.x2) + MIN_ZONE_SEPARATION;
          const zMinY = Math.min(z.y1, z.y2) - MIN_ZONE_SEPARATION;
          const zMaxY = Math.max(z.y1, z.y2) + MIN_ZONE_SEPARATION;
          return normX >= zMinX && normX <= zMaxX && normY >= zMinY && normY <= zMaxY;
        });
        if (isInside) {
          toast.error('Cannot create zone inside an existing room. Right-click and drag in empty floor space.');
          return;
        }
      }

      const x = Math.max(0.5, Math.min(99.5, Math.round(normX * 1000) / 10));
      const y = Math.max(0.5, Math.min(99.5, Math.round(normY * 1000) / 10));
      setDrawingShapeType(shapeType);
      setDrawingStart({ x, y });
      setDrawingCurrent({ x, y });
      setSelectedLineIndex(null);
      setSelectedZoneId(null);
      onSelectCamera?.(null);
      return;
    }

    // 2. Left-Click (Button 0) or Middle-Click (Button 1): Viewport Pan (Grabbing Hand by default)
    if (e.button === 0 || e.button === 1 || isSpacePressed || activeMode === 'pan') {
      didPanDragRef.current = false;
      setIsPanning(true);
      panStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialPanX: pan.x,
        initialPanY: pan.y,
        hasMoved: false,
      };
      return;
    }
  };

  // Hover over canvas to track hovered zone and calculate live Wall-Snap guide in 'add' mode
  const handleCanvasMouseMoveOver = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const { normX, normY } = getWorldCoords(e.clientX, e.clientY);

    // Dynamic hover detection for room shapes so edge dimensions illuminate seamlessly
    const hoveredZ = localZones.find((z) => {
      const minX = Math.min(z.x1, z.x2);
      const maxX = Math.max(z.x1, z.x2);
      const minY = Math.min(z.y1, z.y2);
      const maxY = Math.max(z.y1, z.y2);
      return (
        normX >= minX - 0.005 &&
        normX <= maxX + 0.005 &&
        normY >= minY - 0.005 &&
        normY <= maxY + 0.005
      );
    });

    if (hoveredZ) {
      if (hoveredZoneId !== hoveredZ.id) {
        setHoveredZoneId(hoveredZ.id);
      }
    } else if (hoveredZoneId !== null && !draggingZoneId && !draggingZoneHandle) {
      setHoveredZoneId(null);
    }

    if (activeMode !== 'add') {
      if (addHoverSnap) setAddHoverSnap(null);
      return;
    }

    const snap = calculateWallSnap(
      normX,
      normY,
      localLines,
      canvasDimensions.width,
      canvasDimensions.height,
      65,
      localZones
    );
    setAddHoverSnap(snap);
  };

  // Handle canvas click (placing camera pin in 'add' mode with Wall-Snap)
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (didPanDragRef.current) {
      didPanDragRef.current = false;
      return;
    }
    if (isPanning || draggingCamId || draggingLineIndex !== null || draggingEndpoint) return;

    if (activeMode === 'add') {
      if (!containerRef.current) return;
      const { normX, normY } = getWorldCoords(e.clientX, e.clientY);

      // Snap to nearest wall line and calculate inward FOV angle
      const snap = calculateWallSnap(
        normX,
        normY,
        localLines,
        canvasDimensions.width,
        canvasDimensions.height,
        65,
        localZones
      );

      if (onAddCameraAtPos) {
        onAddCameraAtPos(snap.x, snap.y, snap.angle);
      }
      setIsDirty(true);
      setAddHoverSnap(null);
      setMode('select');
      return;
    }
  };

  // Zone Interaction: Start Moving Whole Rectangle (Translation)
  const handleZoneBodyMouseDown = (e: React.MouseEvent, zone: SpatialZone) => {
    if (e.button === 2) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    if (activeMode !== 'select') return;
    if (e.button !== 0) return;
    e.stopPropagation();

    setSelectedZoneId(zone.id);
    setSelectedLineIndex(null);
    onSelectCamera?.(null);

    if (!containerRef.current) return;
    const { normX: currentNormX, normY: currentNormY } = getWorldCoords(e.clientX, e.clientY);

    const attachedCameras = getAttachedCamerasForZone(zone, localCameras, localZones);

    zoneDragOriginRef.current = {
      mouseStartX: currentNormX,
      mouseStartY: currentNormY,
      origX1: Math.min(zone.x1, zone.x2),
      origY1: Math.min(zone.y1, zone.y2),
      origX2: Math.max(zone.x1, zone.x2),
      origY2: Math.max(zone.y1, zone.y2),
      initialLinesSnapshot: [...localLines],
      initialZonesSnapshot: [...localZones],
      initialCamerasSnapshot: [...localCameras],
      attachedCameras,
    };
    setDraggingZoneId(zone.id);
  };

  // Zone Interaction: Start Dragging one of 8 Resize Handles or Rotation Handle
  const handleZoneHandleMouseDown = (
    e: React.MouseEvent,
    zone: SpatialZone,
    handle: ZoneHandleType
  ) => {
    if (e.button === 2) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    if (activeMode !== 'select') return;
    if (e.button !== 0) return;
    e.stopPropagation();

    setSelectedZoneId(zone.id);
    setSelectedLineIndex(null);
    onSelectCamera?.(null);

    if (!containerRef.current) return;
    const { normX: currentNormX, normY: currentNormY } = getWorldCoords(e.clientX, e.clientY);

    const attachedCameras = getAttachedCamerasForZone(zone, localCameras, localZones);

    zoneHandleDragOriginRef.current = {
      mouseStartX: currentNormX,
      mouseStartY: currentNormY,
      origX1: Math.min(zone.x1, zone.x2),
      origY1: Math.min(zone.y1, zone.y2),
      origX2: Math.max(zone.x1, zone.x2),
      origY2: Math.max(zone.y1, zone.y2),
      initialLinesSnapshot: [...localLines],
      initialZonesSnapshot: [...localZones],
      initialCamerasSnapshot: [...localCameras],
      attachedCameras,
    };
    setDraggingZoneHandle({ zoneId: zone.id, handle });
  };

  // Line Interaction: Start Moving Whole Line
  const handleLineMouseDown = (e: React.MouseEvent, index: number) => {
    if (e.button === 2) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    if (activeMode !== 'select') return;
    if (e.button !== 0) return;
    e.stopPropagation();

    const line = localLines[index];
    if (!line) return;

    // SOLID SHAPE RULE: If line belongs to any zone, dragging it drags the WHOLE SOLID SHAPE!
    const matchedZone = findParentZoneForLine(line, localZones);
    if (matchedZone) {
      handleZoneBodyMouseDown(e, matchedZone);
      return;
    }

    setSelectedLineIndex(index);
    setSelectedZoneId(null);
    onSelectCamera?.(null);

    if (!containerRef.current) return;
    const { normX: currentNormX, normY: currentNormY } = getWorldCoords(e.clientX, e.clientY);
    lineDragOriginRef.current = {
      mouseStartX: currentNormX,
      mouseStartY: currentNormY,
      origX1: line.x1,
      origY1: line.y1,
      origX2: line.x2,
      origY2: line.y2,
      initialLinesSnapshot: [...localLines],
    };
    setDraggingLineIndex(index);
  };

  // Line Interaction: Start Dragging Endpoint Handle 1 or 2
  const handleEndpointMouseDown = (e: React.MouseEvent, lineIndex: number, point: 1 | 2) => {
    if (e.button === 2) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    if (activeMode !== 'select') return;
    if (e.button !== 0) return;
    e.stopPropagation();

    const line = localLines[lineIndex];
    if (!line) return;

    // SOLID SHAPE RULE: Never allow pulling individual endpoints on zone perimeter walls!
    const matchedZone = findParentZoneForLine(line, localZones);
    if (matchedZone) {
      handleZoneBodyMouseDown(e, matchedZone);
      return;
    }

    endpointDragInitialRef.current = [...localLines];
    setDraggingEndpoint({ lineIndex, point });
    setSelectedLineIndex(lineIndex);
  };

  // Node Interaction: Click (select or connect)
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
    setSelectedLineIndex(null);
  };

  // Node Interaction: Start Dragging Camera Pin
  const handleNodeMouseDown = (e: React.MouseEvent, cam: CameraNode) => {
    if (e.button === 2) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    if (activeMode !== 'select') return;
    if (e.button !== 0) return;
    e.stopPropagation();

    camDragInitialRef.current = [...localCameras];
    setDraggingCamId(cam.id);
    onSelectCamera?.(cam);
    setSelectedLineIndex(null);
  };

  // Rotate Camera Field of View in 30° span increments (supports +30° or -30°)
  const handleRotateCam = (
    e: React.MouseEvent,
    camId: string,
    currentAngle: number = 0,
    delta: number = 30
  ) => {
    e.stopPropagation();
    pushHistorySnapshot(localCameras, localLines, localZones);
    const roundedCurrent = Math.round(currentAngle / 30) * 30;
    const nextAngle = (((roundedCurrent + delta) % 360) + 360) % 360;
    setLocalCameras((prev) =>
      prev.map((c) => (c.id === camId ? { ...c, fov_angle: nextAngle } : c))
    );
    setIsDirty(true);
    onUpdateCameraAngle?.(camId, nextAngle);
  };

  // Helper to get camera coordinates (pops right in the middle of canvas if unset, null, or on corner)
  const getCamCoords = (cam: CameraNode, idx: number) => {
    const rawX = cam.x_coord;
    const rawY = cam.y_coord;

    // Check if both coordinates are valid numbers (not null, not undefined, not NaN)
    const hasValidX = rawX != null && !isNaN(Number(rawX));
    const hasValidY = rawY != null && !isNaN(Number(rawY));

    if (!hasValidX || !hasValidY) {
      // Pop right in the middle of the canvas (50%, 50%), with slight stagger for multiple unpositioned cameras
      const offsetX = ((idx % 3) - 1) * 8;
      const offsetY = (Math.floor(idx / 3) % 3 - 1) * 8;
      return {
        x: Math.round(Math.max(15, Math.min(85, 50 + offsetX))),
        y: Math.round(Math.max(15, Math.min(85, 50 + offsetY))),
      };
    }

    let numX = Number(rawX);
    let numY = Number(rawY);

    // Convert from normalized float (0..1] to percentage (0..100] if saved normalized
    if (numX > 0 && numX <= 1.0) {
      numX = numX * 100;
    }
    if (numY > 0 && numY <= 1.0) {
      numY = numY * 100;
    }

    // Always clamp safely inside visible canvas bounds so camera is 100% visible and never cut off
    const clampedX = Math.round(Math.max(0.5, Math.min(99.5, numX)));
    const clampedY = Math.round(Math.max(0.5, Math.min(99.5, numY)));
    return { x: clampedX, y: clampedY };
  };

  // Count links for each camera
  const getCameraLinkCount = (camId: string) => {
    return links.filter((l) => l.from_camera_id === camId || l.to_camera_id === camId).length;
  };

  // Delete a drawn spatial line
  const handleDeleteLine = (index: number) => {
    const lineToDelete = localLines[index];
    if (lineToDelete) {
      const matchedZone = findParentZoneForLine(lineToDelete, localZones);
      if (matchedZone) {
        handleDeleteZone(matchedZone.id);
        return;
      }
    }
    pushHistorySnapshot(localCameras, localLines, localZones);
    setLocalLines((prev) => prev.filter((_, idx) => idx !== index));
    setSelectedLineIndex(null);
    setIsDirty(true);
  };

  // Bulk Save Layout Trigger
  const handleSaveLayoutClick = async () => {
    if (!onSaveLayout) return;
    setIsSaving(true);
    try {
      const isUuid = (val?: string | null) =>
        Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val));

      const payload: SaveLayoutRequest = {
        camera_nodes: localCameras.map((c) => {
          let x = c.x_coord;
          let y = c.y_coord;
          if (x !== undefined && x !== null) {
            x = x > 1 ? x / 100 : x;
          }
          if (y !== undefined && y !== null) {
            y = y > 1 ? y / 100 : y;
          }
          return {
            id: c.id,
            x_coord: x,
            y_coord: y,
            fov_angle: c.fov_angle ?? 0.0,
          };
        }),
        lines: localLines.map((l) => ({
          ...l,
          id: isUuid(l.id) ? l.id : undefined,
        })),
      };
      await onSaveLayout(payload);
      setIsDirty(false);
      setPast([]);
      setFuture([]);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative flex flex-col flex-1 h-full min-h-0 rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-sm space-y-2.5 overflow-hidden">
      {/* Header with Title, Mode Controls, Undo/Redo & Save Layout Button */}
      {/* Header with Title, Status Badges & Save Layout Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-2.5 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" /> Spatial Floor Plan & Camera Layout
            </h4>
            {floorPlan?.name && (
              <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-semibold text-primary">
                {floorPlan.name}
              </span>
            )}
            {isDirty && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Unsaved Changes
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {activeMode === 'select' && 'Select / drag pins, lines & zones. Cameras snap magnetically onto walls with inward-facing FOV (30° span)'}
            {activeMode === 'add' && 'Hover near any wall to preview snap & inward angle, then click to mount CCTV pin'}
            {activeMode === 'draw_zone' && 'Click & drag across the canvas to stamp a closed rectangular room or zone with live area'}
            {activeMode === 'draw_wall' && 'Click & drag across the canvas to draw solid walls. Live dimensions update continuously'}
            {activeMode === 'draw_corridor' && 'Click & drag across the canvas to draw walking corridors with live dimension measurement'}
            {activeMode === 'connect' &&
              (connectSourceId
                ? 'Now click on destination camera to connect a transit walkway'
                : 'Click origin camera to begin connecting')}
          </p>
        </div>

        {/* Right Header Controls: Counts & Save Button */}
        <div className="flex items-center gap-2">
          {onSaveLayout && (
            <button
              type="button"
              onClick={handleSaveLayoutClick}
              disabled={isSaving || !isDirty}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-md ${
                isDirty
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500 ring-2 ring-emerald-500/40 shadow-emerald-500/20 cursor-pointer'
                  : 'bg-muted text-muted-foreground opacity-60 cursor-not-allowed'
              }`}
              title={isDirty ? 'Persist all camera coordinates and lines to database' : 'No changes to save'}
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>{isSaving ? 'Saving...' : isDirty ? 'Save Layout' : 'Saved'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Studio Layout: Left Vertical Toolbar + Right Large Canvas */}
      <div className="flex flex-row items-stretch gap-3 w-full flex-1 min-h-0 h-full overflow-hidden">
        {/* Left Sleek Vertical CAD/Studio Toolbar */}
        <div className="flex flex-col items-center justify-between w-13 shrink-0 rounded-2xl border border-border/80 bg-slate-950/80 p-1.5 shadow-xl backdrop-blur-md">
          {/* Main Drawing & Placement Tools */}
          <div className="flex flex-col items-center gap-1.5 w-full">
            {/* 1. Select & Move */}
            <button
              type="button"
              onClick={() => setMode('select')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all cursor-pointer ${
                activeMode === 'select'
                  ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40'
                  : 'text-muted-foreground hover:bg-slate-800 hover:text-foreground'
              }`}
              title="Select & Move (V)"
            >
              <MousePointer className="h-4 w-4" />
              <span className="pointer-events-none absolute left-full ml-2.5 hidden rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-[11px] font-semibold text-white shadow-xl whitespace-nowrap group-hover:block z-50">
                Select & Move (V)
              </span>
            </button>

            {/* 1B. Pan Canvas (Hand) */}
            <button
              type="button"
              onClick={() => setMode('pan')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all cursor-pointer ${
                activeMode === 'pan'
                  ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/40'
                  : 'text-muted-foreground hover:bg-slate-800 hover:text-emerald-300'
              }`}
              title="Pan Canvas (Hand / H / Space+Drag)"
            >
              <Hand className="h-4 w-4" />
              <span className="pointer-events-none absolute left-full ml-2.5 hidden rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-[11px] font-semibold text-white shadow-xl whitespace-nowrap group-hover:block z-50">
                Pan Canvas (H / Space)
              </span>
            </button>

            {/* 2. Pin Camera with Wall-Snap */}
            <button
              type="button"
              onClick={() => setMode('add')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all cursor-pointer ${
                activeMode === 'add'
                  ? 'bg-sky-500 text-white shadow-md ring-2 ring-sky-400/50'
                  : 'text-muted-foreground hover:bg-slate-800 hover:text-foreground'
              }`}
              title="Pin Camera (Wall-Snap)"
            >
              <Plus className="h-4 w-4" />
              <span className="pointer-events-none absolute left-full ml-2.5 hidden rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-[11px] font-semibold text-white shadow-xl whitespace-nowrap group-hover:block z-50">
                Pin Camera (Wall-Snap)
              </span>
            </button>

            {/* 3. Draw Zone / Area Stamp */}
            <button
              type="button"
              onClick={() => setMode('draw_zone')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all cursor-pointer ${
                activeMode === 'draw_zone'
                  ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-500/40'
                  : 'text-muted-foreground hover:bg-slate-800 hover:text-purple-300'
              }`}
              title="Draw Zone / Area (Rectangle Stamp)"
            >
              <Square className="h-4 w-4 text-purple-300" />
              <span className="pointer-events-none absolute left-full ml-2.5 hidden rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-[11px] font-semibold text-white shadow-xl whitespace-nowrap group-hover:block z-50">
                Draw Zone (Rectangle Stamp)
              </span>
            </button>

            {/* 4. Draw Wall */}
            <button
              type="button"
              onClick={() => setMode('draw_wall')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all cursor-pointer ${
                activeMode === 'draw_wall'
                  ? 'bg-slate-700 text-white shadow-md ring-2 ring-slate-500/40'
                  : 'text-muted-foreground hover:bg-slate-800 hover:text-foreground'
              }`}
              title="Draw Solid Wall"
            >
              <Ruler className="h-4 w-4 text-slate-300" />
              <span className="pointer-events-none absolute left-full ml-2.5 hidden rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-[11px] font-semibold text-white shadow-xl whitespace-nowrap group-hover:block z-50">
                Draw Solid Wall
              </span>
            </button>

            {/* 5. Draw Corridor */}
            <button
              type="button"
              onClick={() => setMode('draw_corridor')}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all cursor-pointer ${
                activeMode === 'draw_corridor'
                  ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-500/40'
                  : 'text-muted-foreground hover:bg-slate-800 hover:text-amber-300'
              }`}
              title="Draw Walking Corridor"
            >
              <Footprints className="h-4 w-4 text-amber-300" />
              <span className="pointer-events-none absolute left-full ml-2.5 hidden rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-[11px] font-semibold text-white shadow-xl whitespace-nowrap group-hover:block z-50">
                Draw Walking Corridor
              </span>
            </button>

            {/* 6. Connect Walkways */}
            <button
              type="button"
              onClick={() => setMode('connect')}
              disabled={localCameras.length < 2}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all disabled:opacity-30 cursor-pointer ${
                activeMode === 'connect'
                  ? 'bg-cyan-600 text-white shadow-md ring-2 ring-cyan-500/30'
                  : 'text-muted-foreground hover:bg-slate-800 hover:text-cyan-300'
              }`}
              title="Connect Walkways"
            >
              <Link2 className="h-4 w-4" />
              <span className="pointer-events-none absolute left-full ml-2.5 hidden rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-[11px] font-semibold text-white shadow-xl whitespace-nowrap group-hover:block z-50">
                Connect Walkways
              </span>
            </button>
          </div>

          {/* Bottom Section: Sensitivity + Undo / Redo / Delete */}
          <div className="flex flex-col items-center gap-1.5 w-full pt-2">

            {/* Scroll Sensitivity Button */}
            <div className="group relative flex items-center justify-center">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-slate-800 hover:text-sky-300 cursor-pointer transition-colors"
                title="Scroll Sensitivity"
              >
                <Mouse className="h-3.5 w-3.5" />
              </button>
              {/* Hover Popover: Sensitivity Slider */}
              <div className="pointer-events-none opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto absolute left-full ml-3 z-50 transition-all duration-150"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
              >
                <div className="flex items-center gap-3 rounded-xl bg-slate-900/98 border border-slate-700 px-3 py-2.5 shadow-2xl backdrop-blur-sm whitespace-nowrap">
                  <Mouse className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[11px] font-semibold text-white">Sensitivity</span>
                      <span className="text-[10px] font-mono text-sky-300 bg-sky-500/15 border border-sky-500/30 px-1.5 py-0.5 rounded">
                        {zoomSensitivity === 1.0 ? '1×' : zoomSensitivity < 1 ? `${zoomSensitivity}×` : `${zoomSensitivity}×`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground">Slow</span>
                      <input
                        type="range"
                        min="0.25"
                        max="2.0"
                        step="0.25"
                        value={zoomSensitivity}
                        onChange={(ev) => {
                          const v = parseFloat(ev.target.value);
                          setZoomSensitivity(v);
                          zoomSensitivityRef.current = v;
                        }}
                        className="w-28 h-1 accent-sky-400 cursor-pointer"
                      />
                      <span className="text-[9px] text-muted-foreground">Fast</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px w-7 bg-border/80 my-0.5" />

            {/* Undo */}
            <button
              type="button"
              onClick={handleUndo}
              disabled={past.length === 0}
              className="group relative flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-slate-800 hover:text-foreground disabled:opacity-25 cursor-pointer transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span className="pointer-events-none absolute left-full ml-2.5 hidden rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-[11px] font-semibold text-white shadow-xl whitespace-nowrap group-hover:block z-50">
                Undo (Ctrl+Z)
              </span>
            </button>

            {/* Redo */}
            <button
              type="button"
              onClick={handleRedo}
              disabled={future.length === 0}
              className="group relative flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-slate-800 hover:text-foreground disabled:opacity-25 cursor-pointer transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="h-3.5 w-3.5" />
              <span className="pointer-events-none absolute left-full ml-2.5 hidden rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-[11px] font-semibold text-white shadow-xl whitespace-nowrap group-hover:block z-50">
                Redo (Ctrl+Y)
              </span>
            </button>

            {/* Delete Selected Item */}
            {(selectedZoneId || selectedLineIndex !== null) && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (selectedZoneId) {
                    handleDeleteZone(selectedZoneId);
                  } else if (selectedLineIndex !== null) {
                    handleDeleteLine(selectedLineIndex);
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedZoneId) {
                    handleDeleteZone(selectedZoneId);
                  } else if (selectedLineIndex !== null) {
                    handleDeleteLine(selectedLineIndex);
                  }
                }}
                className="group relative flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md cursor-pointer transition-all animate-in fade-in"
                title={`Delete ${selectedZoneId ? 'Zone' : 'Line'} (Del)`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="pointer-events-none absolute left-full ml-2.5 hidden rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-[11px] font-semibold text-white shadow-xl whitespace-nowrap group-hover:block z-50">
                  Delete {selectedZoneId ? 'Zone' : 'Line'} (Del)
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Right Canvas Column */}
        <div className="flex flex-col flex-1 gap-2 min-w-0 min-h-0 h-full overflow-hidden">
          {/* Mode Banner Indicator */}
          {activeMode === 'connect' && (
            <div className="flex items-center justify-between rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-3.5 py-1.5 text-xs text-cyan-300 animate-in fade-in duration-200 shrink-0">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-cyan-400 animate-pulse" />
                <span>
                  {connectSourceId
                    ? `Connecting from "${localCameras.find((c) => c.id === connectSourceId)?.name || 'Camera'}" -> Click destination camera.`
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
            <div className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/30 px-3.5 py-1.5 text-xs text-primary animate-in fade-in duration-200 shrink-0">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-sky-400" />
                <span>
                  <strong>Wall-Snap Mode:</strong> Move near any wall to snap the camera to the edge with FOV pointing inward (30° span). Click to mount.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMode('select')}
                className="text-xs underline hover:text-primary/80 cursor-pointer"
              >
                Cancel Placing
              </button>
            </div>
          )}

          {activeMode === 'draw_zone' && (
            <div className="flex items-center justify-between rounded-xl bg-purple-950/80 border border-purple-800/80 px-3.5 py-1.5 text-xs text-purple-200 animate-in fade-in duration-200 shrink-0">
              <div className="flex items-center gap-2">
                <Square className="h-4 w-4 text-purple-400" />
                <span>
                  <strong>Zone Stamp Mode:</strong> Right-Click & Drag to stamp a closed rectangular room or area. Left-Click & Drag to pan canvas.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMode('select')}
                className="text-xs underline text-purple-400 hover:text-white cursor-pointer"
              >
                Exit Stamp Mode
              </button>
            </div>
          )}

          {(activeMode === 'draw_wall' || activeMode === 'draw_corridor') && (
            <div className="flex items-center justify-between rounded-xl bg-slate-800/80 border border-slate-700 px-3.5 py-1.5 text-xs text-slate-200 animate-in fade-in duration-200 shrink-0">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-amber-400" />
                <span>
                  <strong>{activeMode === 'draw_wall' ? 'Wall Mode' : 'Corridor Mode'}:</strong> Right-Click & Drag on the grid to create line. Left-Click & Drag to pan canvas.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMode('select')}
                className="text-xs underline text-slate-400 hover:text-white"
              >
                Exit Drawing
              </button>
            </div>
          )}

          {/* Interactive Floor Plan Area (Endless / Zoomable Canvas) */}
          <div
            ref={containerRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMoveOver}
            onMouseLeave={() => {
              setAddHoverSnap(null);
              setHoveredZoneId(null);
              setHoveredLineIndex(null);
            }}
            onClick={handleCanvasClick}
            onContextMenu={(e) => e.preventDefault()}
            className={`relative flex-1 min-h-0 h-full w-full overflow-hidden rounded-xl border border-border/80 bg-accent/10 select-none ${
              isPanning
                ? 'cursor-grabbing'
                : drawingStart
                ? 'cursor-crosshair'
                : activeMode === 'add'
                ? 'cursor-crosshair ring-2 ring-primary/30'
                : activeMode === 'connect'
                ? 'cursor-pointer'
                : 'cursor-grab'
            }`}
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, oklch(0.35 0.03 250) 1px, transparent 0)`,
              backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`,
            }}
          >
            {/* Virtual World Canvas Layer (Panned & Zoomed) */}
            <div
              className="absolute pointer-events-auto origin-top-left"
              style={{
                width: baseWorldWidth,
                height: baseWorldHeight,
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
              }}
            >
              {/* Facility Boundary Border */}
              <div className="absolute inset-0 border-2 border-dashed border-sky-500/25 rounded-2xl bg-slate-950/20 pointer-events-none shadow-2xl">
                <div className="absolute top-2 left-3 text-[10px] font-mono text-sky-400/60 uppercase tracking-wider select-none">
                  Facility Plane ({Math.round(baseWorldWidth * scaleMetersPerPx)}m × {Math.round(baseWorldHeight * scaleMetersPerPx)}m)
                </div>
              </div>

              {/* Optional Uploaded Floor Plan Blueprint Image */}
              {floorPlanUrl && (
                <img
                  src={floorPlanUrl}
                  alt="Floor Plan"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-80"
                />
              )}

              {/* SVG Overlay: Walkway Links, Drawn Spatial Lines, Snapped Wall Highlight, and Rubberband */}
              <svg
                onContextMenu={(e) => e.preventDefault()}
                className="absolute inset-0 pointer-events-none z-10"
                style={{ width: baseWorldWidth, height: baseWorldHeight }}
              >
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

          {/* 0. PERSISTED STAMPED ZONES / ROOMS (Option B: Move & 8-Handle Sizing) */}
          {localZones.map((zone) => {
            const isSelected = selectedZoneId === zone.id;
            const isHovered = hoveredZoneId === zone.id;
            const minX = Math.min(zone.x1, zone.x2);
            const maxX = Math.max(zone.x1, zone.x2);
            const minY = Math.min(zone.y1, zone.y2);
            const maxY = Math.max(zone.y1, zone.y2);

            const xPct = minX * 100;
            const yPct = minY * 100;
            const wPct = (maxX - minX) * 100;
            const hPct = (maxY - minY) * 100;

            const midXPct = ((minX + maxX) / 2) * 100;
            const midYPct = ((minY + maxY) / 2) * 100;

            const widthPx = (maxX - minX) * canvasDimensions.width;
            const heightPx = (maxY - minY) * canvasDimensions.height;
            const widthM = Math.round(widthPx * scaleMetersPerPx * 10) / 10;
            const heightM = Math.round(heightPx * scaleMetersPerPx * 10) / 10;
            // Format area with 2 decimals like 1.22 m² in screenshot
            const areaM2 = Math.round(widthM * heightM * 100) / 100;

            const cxPx = (midXPct * canvasDimensions.width) / 100;
            const cyPx = (midYPct * canvasDimensions.height) / 100;

            return (
              <g
                key={zone.id}
                className="pointer-events-auto group"
                onMouseEnter={() => setHoveredZoneId(zone.id)}
                onMouseLeave={() => setHoveredZoneId((prev) => (prev === zone.id ? null : prev))}
              >
                {/* 1. Rectangle Body (Clickable to select, Draggable to translate whole rectangle) */}
                <rect
                  x={`${xPct}%`}
                  y={`${yPct}%`}
                  width={`${wPct}%`}
                  height={`${hPct}%`}
                  rx="3"
                  fill={isSelected ? '#d8d4aa' : '#8b5cf6'}
                  fillOpacity={isSelected ? 0.38 : isHovered ? 0.22 : 0.1}
                  stroke={isSelected ? '#22c55e' : isHovered ? '#38bdf8' : 'transparent'}
                  strokeWidth={isSelected ? 4 : isHovered ? 2 : 1}
                  className={`transition-colors ${
                    activeMode === 'select'
                      ? isSelected
                        ? 'cursor-move'
                        : 'cursor-pointer hover:fill-opacity-20'
                      : 'cursor-default'
                  }`}
                  style={
                    isSelected
                      ? { filter: 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.45))' }
                      : isHovered
                      ? { filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.35))' }
                      : undefined
                  }
                  onMouseDown={(e) => {
                    if (activeMode === 'select') {
                      handleZoneBodyMouseDown(e, zone);
                    }
                  }}
                  onClick={(e) => {
                    if (activeMode === 'select') {
                      e.stopPropagation();
                      setSelectedZoneId(zone.id);
                      setSelectedLineIndex(null);
                      onSelectCamera?.(null);
                    }
                  }}
                />

                {/* 2. Floating Zone Name Pill on Hover (shows zone name when cursor hovers over room) */}
                {isHovered && !isSelected && (
                  <foreignObject
                    x={`calc(${midXPct}% - 75px)`}
                    y={`calc(${yPct}% + 8px)`}
                    width="150"
                    height="32"
                    className="overflow-visible pointer-events-none select-none"
                  >
                    <div className="flex items-center justify-center gap-1.5 rounded-full bg-slate-950/95 border border-sky-400 px-3 py-1 text-[11px] font-bold text-sky-200 shadow-2xl ring-2 ring-sky-500/30 whitespace-nowrap">
                      <span>🏷️</span>
                      <span className="truncate max-w-[110px]">{zone.name}</span>
                    </div>
                  </foreignObject>
                )}

                {/* 2B. Centered Area & Room Name Typography */}
                <foreignObject
                  x={`calc(${midXPct}% - 100px)`}
                  y={isSelected ? `calc(${midYPct}% - 32px)` : `calc(${midYPct}% - 22px)`}
                  width="200"
                  height="64"
                  className="overflow-visible pointer-events-none select-none"
                >
                  <div className="flex flex-col items-center justify-center text-center">
                    <span
                      className={`font-extrabold tracking-tight text-white ${
                        isSelected ? 'text-2xl' : 'text-sm'
                      }`}
                      style={{
                        filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.95))',
                      }}
                    >
                      {areaM2} m²
                    </span>
                    {!isSelected && (
                      <span
                        className="text-[11px] font-semibold text-slate-300 drop-shadow-sm mt-0.5"
                        style={{
                          filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.95))',
                        }}
                      >
                        {zone.name}
                      </span>
                    )}
                  </div>
                </foreignObject>

                {/* 3. FOUR CORNER RESIZE HANDLES (STABLE, ZERO FLICKER) */}
                {isSelected && activeMode === 'select' && (
                  <>
                    {/* Top-Left Corner Handle (nw) */}
                    <g
                      className="cursor-nwse-resize pointer-events-auto"
                      onMouseDown={(e) => handleZoneHandleMouseDown(e, zone, 'nw')}
                    >
                      <title>Resize Top-Left</title>
                      <circle
                        cx={`${xPct}%`}
                        cy={`${yPct}%`}
                        r="16"
                        fill="transparent"
                      />
                      <circle
                        cx={`${xPct}%`}
                        cy={`${yPct}%`}
                        r="10"
                        fill="#18181b"
                        fillOpacity="0.95"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <circle
                        cx={`${xPct}%`}
                        cy={`${yPct}%`}
                        r="4"
                        fill="#22c55e"
                        className="pointer-events-none"
                      />
                    </g>

                    {/* Top-Right Corner Handle (ne) */}
                    <g
                      className="cursor-nesw-resize pointer-events-auto"
                      onMouseDown={(e) => handleZoneHandleMouseDown(e, zone, 'ne')}
                    >
                      <title>Resize Top-Right</title>
                      <circle
                        cx={`${xPct + wPct}%`}
                        cy={`${yPct}%`}
                        r="16"
                        fill="transparent"
                      />
                      <circle
                        cx={`${xPct + wPct}%`}
                        cy={`${yPct}%`}
                        r="10"
                        fill="#18181b"
                        fillOpacity="0.95"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <circle
                        cx={`${xPct + wPct}%`}
                        cy={`${yPct}%`}
                        r="4"
                        fill="#22c55e"
                        className="pointer-events-none"
                      />
                    </g>

                    {/* Bottom-Right Corner Handle (se) */}
                    <g
                      className="cursor-nwse-resize pointer-events-auto"
                      onMouseDown={(e) => handleZoneHandleMouseDown(e, zone, 'se')}
                    >
                      <title>Resize Bottom-Right</title>
                      <circle
                        cx={`${xPct + wPct}%`}
                        cy={`${yPct + hPct}%`}
                        r="16"
                        fill="transparent"
                      />
                      <circle
                        cx={`${xPct + wPct}%`}
                        cy={`${yPct + hPct}%`}
                        r="10"
                        fill="#18181b"
                        fillOpacity="0.95"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <circle
                        cx={`${xPct + wPct}%`}
                        cy={`${yPct + hPct}%`}
                        r="4"
                        fill="#22c55e"
                        className="pointer-events-none"
                      />
                    </g>

                    {/* Bottom-Left Corner Handle (sw) */}
                    <g
                      className="cursor-nesw-resize pointer-events-auto"
                      onMouseDown={(e) => handleZoneHandleMouseDown(e, zone, 'sw')}
                    >
                      <title>Resize Bottom-Left</title>
                      <circle
                        cx={`${xPct}%`}
                        cy={`${yPct + hPct}%`}
                        r="16"
                        fill="transparent"
                      />
                      <circle
                        cx={`${xPct}%`}
                        cy={`${yPct + hPct}%`}
                        r="10"
                        fill="#18181b"
                        fillOpacity="0.95"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <circle
                        cx={`${xPct}%`}
                        cy={`${yPct + hPct}%`}
                        r="4"
                        fill="#22c55e"
                        className="pointer-events-none"
                      />
                    </g>
                  </>
                )}
              </g>
            );
          })}

          {/* 1. PERSISTED / DRAWN SPATIAL LINES (Walls & Corridors) */}
          {localLines.map((line, idx) => {
            const isSelected = selectedLineIndex === idx;
            const isSnappedToThis =
              (addHoverSnap?.snapped && addHoverSnap.wallLine === line) ||
              snappedWallId === line.id;

            // Identify parent room shape if line is a zone perimeter wall
            const parentZone = findParentZoneForLine(line, localZones);
            const parentZoneId = parentZone?.id ?? null;

            const isParentZoneHovered = parentZoneId ? hoveredZoneId === parentZoneId : false;
            const isParentZoneSelected = parentZoneId ? selectedZoneId === parentZoneId : false;
            const isParentZoneActive = parentZoneId
              ? draggingZoneId === parentZoneId || draggingZoneHandle?.zoneId === parentZoneId
              : false;

            const isThisLineHovered = hoveredLineIndex === idx;
            const isThisLineActive =
              isSelected ||
              draggingLineIndex === idx ||
              draggingEndpoint?.lineIndex === idx;

            // Display edge length only when hovering the shape or when actively selected/manipulated
            const showEdgeLength = parentZoneId
              ? isParentZoneHovered || isParentZoneSelected || isParentZoneActive || isThisLineHovered
              : isThisLineHovered || isThisLineActive;

            const x1Pct = `${line.x1 * 100}%`;
            const y1Pct = `${line.y1 * 100}%`;
            const x2Pct = `${line.x2 * 100}%`;
            const y2Pct = `${line.y2 * 100}%`;

            const midXPct = ((line.x1 + line.x2) / 2) * 100;
            const midYPct = ((line.y1 + line.y2) / 2) * 100;

            const dxPx = (line.x2 - line.x1) * canvasDimensions.width;
            const dyPx = (line.y2 - line.y1) * canvasDimensions.height;
            const distMeters = Math.round(Math.sqrt(dxPx * dxPx + dyPx * dyPx) * scaleMetersPerPx * 10) / 10;

            const isWall = line.line_type === 'wall';

            return (
              <g
                key={line.id || `line-${idx}`}
                className="pointer-events-auto group"
                onMouseEnter={() => {
                  setHoveredLineIndex(idx);
                  if (parentZoneId) setHoveredZoneId(parentZoneId);
                }}
                onMouseLeave={() => {
                  setHoveredLineIndex((prev) => (prev === idx ? null : prev));
                  if (parentZoneId) {
                    setHoveredZoneId((prev) => (prev === parentZoneId ? null : prev));
                  }
                }}
              >
                {/* Thick transparent hit target for easy clicking and translation dragging */}
                <line
                  x1={x1Pct}
                  y1={y1Pct}
                  x2={x2Pct}
                  y2={y2Pct}
                  stroke="transparent"
                  strokeWidth="24"
                  className={activeMode === 'select' ? 'cursor-move' : 'cursor-default'}
                  onMouseDown={(e) => handleLineMouseDown(e, idx)}
                  onClick={(e) => {
                    if (activeMode === 'select') {
                      e.stopPropagation();
                      const matchedZone = findParentZoneForLine(line, localZones);
                      if (matchedZone) {
                        setSelectedZoneId(matchedZone.id);
                        setSelectedLineIndex(null);
                      } else {
                        setSelectedLineIndex(idx);
                        setSelectedZoneId(null);
                      }
                      onSelectCamera?.(null);
                    }
                  }}
                />

                {/* Snapped Wall Active Glow Indicator */}
                {isSnappedToThis && (
                  <line
                    x1={x1Pct}
                    y1={y1Pct}
                    x2={x2Pct}
                    y2={y2Pct}
                    stroke="#38bdf8"
                    strokeWidth={isWall ? 12 : 9}
                    strokeOpacity="0.75"
                    strokeLinecap="round"
                    className="pointer-events-none animate-pulse"
                  />
                )}

                {/* Selected highlight glow */}
                {isSelected && !isSnappedToThis && (
                  <line
                    x1={x1Pct}
                    y1={y1Pct}
                    x2={x2Pct}
                    y2={y2Pct}
                    stroke="#38bdf8"
                    strokeWidth={isWall ? 9 : 7}
                    strokeOpacity="0.45"
                    strokeLinecap="round"
                    className="pointer-events-none"
                  />
                )}

                {/* Visible Line */}
                <line
                  x1={x1Pct}
                  y1={y1Pct}
                  x2={x2Pct}
                  y2={y2Pct}
                  stroke={isSnappedToThis ? '#38bdf8' : isSelected ? '#38bdf8' : isWall ? '#cbd5e1' : '#f59e0b'}
                  strokeWidth={isWall ? 4.5 : 3.5}
                  strokeDasharray={isWall ? undefined : '8 5'}
                  strokeLinecap="round"
                  className="transition-colors group-hover:stroke-primary pointer-events-none"
                />

                {/* Endpoint Grab Handles when selected in Select Mode (ONLY for standalone lines, NEVER for solid zone shapes) */}
                {isSelected && !parentZone && activeMode === 'select' && (
                  <>
                    {/* Endpoint 1 Handle (x1, y1) */}
                    <g className="pointer-events-auto">
                      {/* Wide invisible hit area (16px radius) so grab never misses or flickers */}
                      <circle
                        cx={x1Pct}
                        cy={y1Pct}
                        r="16"
                        fill="transparent"
                        className="cursor-grab active:cursor-grabbing"
                        onMouseDown={(e) => handleEndpointMouseDown(e, idx, 1)}
                      />
                      {/* Static crisp handle dot without CSS scale transform */}
                      <circle
                        cx={x1Pct}
                        cy={y1Pct}
                        r="7"
                        fill="#0284c7"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        className="pointer-events-none drop-shadow-md"
                      />
                      <circle
                        cx={x1Pct}
                        cy={y1Pct}
                        r="2.5"
                        fill="#ffffff"
                        className="pointer-events-none"
                      />
                    </g>

                    {/* Endpoint 2 Handle (x2, y2) */}
                    <g className="pointer-events-auto">
                      {/* Wide invisible hit area (16px radius) so grab never misses or flickers */}
                      <circle
                        cx={x2Pct}
                        cy={y2Pct}
                        r="16"
                        fill="transparent"
                        className="cursor-grab active:cursor-grabbing"
                        onMouseDown={(e) => handleEndpointMouseDown(e, idx, 2)}
                      />
                      {/* Static crisp handle dot without CSS scale transform */}
                      <circle
                        cx={x2Pct}
                        cy={y2Pct}
                        r="7"
                        fill="#0284c7"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        className="pointer-events-none drop-shadow-md"
                      />
                      <circle
                        cx={x2Pct}
                        cy={y2Pct}
                        r="2.5"
                        fill="#ffffff"
                        className="pointer-events-none"
                      />
                    </g>
                  </>
                )}

                {/* Dimension & Label Badge (displayed only when shape/line is hovered or actively selected/manipulated) */}
                {showEdgeLength && (
                  <foreignObject
                    x={`calc(${midXPct}% - 40px)`}
                    y={`calc(${midYPct}% - 12px)`}
                    width="80"
                    height="24"
                    className="overflow-visible pointer-events-auto"
                    onMouseEnter={() => {
                      setHoveredLineIndex(idx);
                      if (parentZoneId) setHoveredZoneId(parentZoneId);
                    }}
                  >
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeMode === 'select') {
                          setSelectedLineIndex(idx);
                        }
                      }}
                      className={`flex items-center justify-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-mono shadow-md whitespace-nowrap transition-all ${
                        isSelected
                          ? 'bg-sky-950 border border-sky-400 text-sky-200 ring-2 ring-sky-500/30'
                          : 'bg-slate-900/95 border border-border/80 text-slate-200'
                      }`}
                    >
                      <span>{distMeters}m</span>
                      {isSelected && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLine(idx);
                          }}
                          title="Delete line (Del)"
                          className="text-muted-foreground hover:text-rose-400 p-0.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}

          {/* 2. LIVE RUBBERBAND LINE WHILE DRAWING */}
          {(drawingShapeType === 'wall' || drawingShapeType === 'corridor') && drawingStart && drawingCurrent && liveLineMetrics && (
            <g className="pointer-events-none">
              <line
                x1={`${drawingStart.x}%`}
                y1={`${drawingStart.y}%`}
                x2={`${drawingCurrent.x}%`}
                y2={`${drawingCurrent.y}%`}
                stroke={drawingShapeType === 'corridor' ? '#f59e0b' : '#38bdf8'}
                strokeWidth={drawingShapeType === 'corridor' ? 4 : 5}
                strokeDasharray={drawingShapeType === 'corridor' ? '8 6' : undefined}
                strokeLinecap="round"
                className="animate-pulse"
              />
              <circle
                cx={`${drawingCurrent.x}%`}
                cy={`${drawingCurrent.y}%`}
                r="4.5"
                fill="#38bdf8"
              />

              {/* Live Dimension Measurement Badge */}
              <foreignObject
                x={`calc(${liveLineMetrics.midX}% - 44px)`}
                y={`calc(${liveLineMetrics.midY}% - 14px)`}
                width="88"
                height="28"
                className="overflow-visible"
              >
                <div className="flex items-center justify-center gap-1 rounded-full bg-slate-950/95 border border-sky-400 px-2 py-0.5 text-[10px] font-mono font-bold text-sky-300 shadow-xl ring-2 ring-sky-500/30">
                  <Ruler className="h-3 w-3 text-sky-400" />
                  <span>{liveLineMetrics.distMeters}m</span>
                </div>
              </foreignObject>
            </g>
          )}

          {/* 2B. LIVE RUBBERBAND RECTANGLE WHILE STAMPING ZONE (Option B) */}
          {drawingShapeType === 'zone' && drawingStart && drawingCurrent && liveZoneMetrics && (
            <g className="pointer-events-none">
              <rect
                x={`${liveZoneMetrics.minX}%`}
                y={`${liveZoneMetrics.minY}%`}
                width={`${liveZoneMetrics.widthPct}%`}
                height={`${liveZoneMetrics.heightPct}%`}
                rx="6"
                fill={liveZoneMetrics.isOverlapping ? '#f43f5e' : '#8b5cf6'}
                fillOpacity={liveZoneMetrics.isOverlapping ? 0.26 : 0.18}
                stroke={liveZoneMetrics.isOverlapping ? '#f43f5e' : '#a78bfa'}
                strokeWidth={liveZoneMetrics.isOverlapping ? 3 : 2.5}
                strokeDasharray="6 4"
                className="animate-pulse"
              />
              {/* Corner handles */}
              <circle cx={`${liveZoneMetrics.minX}%`} cy={`${liveZoneMetrics.minY}%`} r="4.5" fill={liveZoneMetrics.isOverlapping ? '#f43f5e' : '#a78bfa'} stroke="#fff" strokeWidth="1.5" />
              <circle cx={`${liveZoneMetrics.maxX}%`} cy={`${liveZoneMetrics.minY}%`} r="4.5" fill={liveZoneMetrics.isOverlapping ? '#f43f5e' : '#a78bfa'} stroke="#fff" strokeWidth="1.5" />
              <circle cx={`${liveZoneMetrics.maxX}%`} cy={`${liveZoneMetrics.maxY}%`} r="4.5" fill={liveZoneMetrics.isOverlapping ? '#f43f5e' : '#a78bfa'} stroke="#fff" strokeWidth="1.5" />
              <circle cx={`${liveZoneMetrics.minX}%`} cy={`${liveZoneMetrics.maxY}%`} r="4.5" fill={liveZoneMetrics.isOverlapping ? '#f43f5e' : '#a78bfa'} stroke="#fff" strokeWidth="1.5" />

              {/* Live Center Metric Badge */}
              <foreignObject
                x={`calc(${liveZoneMetrics.midX}% - 110px)`}
                y={`calc(${liveZoneMetrics.midY}% - 16px)`}
                width="220"
                height="32"
                className="overflow-visible"
              >
                <div className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-mono font-bold shadow-2xl whitespace-nowrap ${
                  liveZoneMetrics.isOverlapping
                    ? 'bg-rose-950/95 border border-rose-500 text-rose-200 ring-2 ring-rose-500/50'
                    : 'bg-purple-950/95 border border-purple-400 text-purple-200 ring-2 ring-purple-500/40'
                }`}>
                  <Square className="h-3 w-3 text-purple-300" />
                  {liveZoneMetrics.isOverlapping ? (
                    <span>⚠️ Overlap Detected (Keep Separated)</span>
                  ) : (
                    <>
                      <span>{liveZoneMetrics.widthMeters}m × {liveZoneMetrics.heightMeters}m</span>
                      <span className="text-purple-400">({liveZoneMetrics.areaSqm} m²)</span>
                    </>
                  )}
                </div>
              </foreignObject>
            </g>
          )}

          {/* 3. CAMERA TRANSIT WALKWAY LINKS */}
          {links.map((link) => {
            const fromCam = localCameras.find((c) => c.id === link.from_camera_id);
            const toCam = localCameras.find((c) => c.id === link.to_camera_id);
            if (!fromCam || !toCam) return null;

            const fromIdx = localCameras.findIndex((c) => c.id === fromCam.id);
            const toIdx = localCameras.findIndex((c) => c.id === toCam.id);
            const fromPos = getCamCoords(fromCam, fromIdx);
            const toPos = getCamCoords(toCam, toIdx);

            const midX = (fromPos.x + toPos.x) / 2;
            const midY = (fromPos.y + toPos.y) / 2;

            return (
              <g key={link.id} className="group pointer-events-auto">
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
                        setLinkToDelete({
                          id: link.id,
                          fromName: fromCam.name,
                          toName: toCam.name,
                        });
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
        {localCameras.length === 0 && localLines.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-muted-foreground/60">
            <Camera className="h-10 w-10 mb-2 opacity-40 text-primary" />
            <p className="text-xs font-semibold">No cameras or walls added yet</p>
            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
              Draw walls first, then click &quot;Pin Camera&quot; to mount CCTV nodes directly onto walls
            </p>
          </div>
        )}

        {/* GHOST CAMERA PREVIEW ON HOVER (Wall-Snap Mode) */}
        {activeMode === 'add' && addHoverSnap && (
          <div
            style={{
              left: `${addHoverSnap.x}%`,
              top: `${addHoverSnap.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className="absolute pointer-events-none z-35 flex flex-col items-center opacity-95 transition-all duration-75"
          >
            {/* Ghost Inward FOV Cone */}
            <div
              className="absolute text-sky-400 opacity-45"
              style={{
                width: '100px',
                height: '100px',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -100%) rotate(${addHoverSnap.angle}deg)`,
                transformOrigin: 'bottom center',
                clipPath: 'polygon(50% 100%, 12% 0%, 88% 0%)',
                backgroundColor: 'currentColor',
              }}
            />

            {/* Wall Mount Plate Bracket (Parallel to the wall) */}
            {addHoverSnap.snapped && (
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-2 rounded-full bg-sky-500/90 border border-white/80 shadow-lg z-25"
                style={{
                  transform: `translate(-50%, -50%) rotate(${addHoverSnap.angle + 90}deg)`,
                }}
              />
            )}

            {/* Ghost Camera Icon Body */}
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border-2 border-dashed border-sky-400 bg-sky-500/35 text-white shadow-2xl backdrop-blur-sm z-30">
              <Camera className="h-4 w-4 text-sky-100" />

              {/* Blue Pivot Point Dot (Contact point directly on wall) */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-sky-400 border-2 border-white shadow-md z-35" />

              {/* Aiming Indicator Notch */}
              <div
                className="absolute -top-1.5 h-2 w-2 rounded-full bg-sky-300 border border-background"
                style={{
                  transform: `rotate(${addHoverSnap.angle}deg) translateY(-15px)`,
                }}
              />
            </div>

            {/* Floating Tag */}
            <div className="mt-1.5 flex items-center gap-1 rounded-full bg-slate-950/95 border border-sky-400 px-2.5 py-0.5 text-[9px] font-bold text-sky-300 shadow-xl whitespace-nowrap ring-2 ring-sky-500/30">
              <span>
                {addHoverSnap.snapped
                  ? `📍 Mounted on ${addHoverSnap.wallLine?.label?.split(' (')[0] || 'Wall'} (${addHoverSnap.angle}° inward)`
                  : '📍 Draw a room to mount camera'}
              </span>
            </div>
          </div>
        )}

        {/* SELECTED ZONE FLOATING ACTION PILL BADGE (Native HTML Overlay - 100% Reliable Clicks & Deletes) */}
        {localZones.map((zone) => {
          if (selectedZoneId !== zone.id || activeMode !== 'select') return null;
          const minX = Math.min(zone.x1, zone.x2);
          const maxX = Math.max(zone.x1, zone.x2);
          const minY = Math.min(zone.y1, zone.y2);
          const maxY = Math.max(zone.y1, zone.y2);
          const midXPct = ((minX + maxX) / 2) * 100;
          const midYPct = ((minY + maxY) / 2) * 100;

          return (
            <div
              key={`selected-zone-badge-${zone.id}`}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
              style={{
                left: `${midXPct}%`,
                top: `${midYPct}%`,
                transform: 'translate(-50%, 28px)',
              }}
              className="absolute z-40 flex items-center justify-center gap-2 rounded-full bg-slate-950/95 border border-emerald-500/80 px-3 py-1 text-[11px] font-bold text-emerald-300 shadow-2xl backdrop-blur-md pointer-events-auto select-none"
            >
              <span className="truncate max-w-[120px]">{zone.name}</span>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleDeleteZone(zone.id);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleDeleteZone(zone.id);
                }}
                title="Delete Zone (Del / Backspace)"
                className="flex items-center gap-1 rounded-md bg-rose-600/90 hover:bg-rose-500 active:bg-rose-700 text-white px-2 py-0.5 text-[10px] font-bold cursor-pointer transition-colors shadow-sm"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete</span>
              </button>
            </div>
          );
        })}

        {/* PLACED CAMERA PINS (Mounted on Wall Edge) */}
        {localCameras.map((cam, idx) => {
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
              {/* Field of View (FOV) Directional Cone (Emerges from Wall Contact Pivot into Room) */}
              <div
                className={`absolute pointer-events-none transition-all ${
                  isSelected
                    ? 'opacity-55 text-primary'
                    : cam.is_entry_point
                    ? 'opacity-40 text-emerald-400'
                    : 'opacity-30 text-sky-400 group-hover:opacity-50'
                }`}
                style={{
                  width: '95px',
                  height: '95px',
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%, -100%) rotate(${fovAngle}deg)`,
                  transformOrigin: 'bottom center',
                  clipPath: 'polygon(50% 100%, 12% 0%, 88% 0%)',
                  backgroundColor: 'currentColor',
                }}
              />

              {/* Wall Mount Base Plate (Parallel to the wall surface, perpendicular to FOV angle) */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-2 rounded-full bg-slate-800/95 border border-slate-600/90 shadow-md z-25 pointer-events-none group-hover:border-primary/60 transition-colors"
                style={{
                  transform: `translate(-50%, -50%) rotate(${fovAngle + 90}deg)`,
                }}
                title={`Wall Mount Plate (Perpendicular to ${fovAngle}°)`}
              />

              {/* Floating Quick Action Bar for Selected Camera (Adjustable 30° span) */}
              {isSelected && activeMode === 'select' && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute -top-11 flex items-center gap-1 rounded-xl bg-slate-950/95 border border-slate-700/80 px-2 py-1 shadow-2xl backdrop-blur-md z-40 animate-in fade-in zoom-in-95 duration-150 whitespace-nowrap"
                >
                  {/* Rotate -30° Button */}
                  <button
                    type="button"
                    onClick={(e) => handleRotateCam(e, cam.id, fovAngle, -30)}
                    className="flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 text-[11px] font-bold text-muted-foreground hover:text-sky-300 hover:bg-slate-800 transition-colors cursor-pointer"
                    title={`Rotate FOV -30° (Current: ${fovAngle}°)`}
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span className="text-[9px] font-mono">-30°</span>
                  </button>

                  {/* 30° Span Angle Badge */}
                  <span className="rounded-md bg-sky-500/15 border border-sky-500/30 px-1.5 py-0.5 text-[10px] font-mono font-bold text-sky-300">
                    {fovAngle}°
                  </span>

                  {/* Rotate +30° Button */}
                  <button
                    type="button"
                    onClick={(e) => handleRotateCam(e, cam.id, fovAngle, 30)}
                    className="flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 text-[11px] font-bold text-muted-foreground hover:text-sky-300 hover:bg-slate-800 transition-colors cursor-pointer"
                    title={`Rotate FOV +30° (Current: ${fovAngle}°)`}
                  >
                    <span className="text-[9px] font-mono">+30°</span>
                    <RotateCw className="h-3 w-3" />
                  </button>

                  <div className="h-3.5 w-px bg-border/80 mx-0.5" />

                  {/* Quick Connect Walkway */}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('connect');
                      setConnectSourceId(cam.id);
                    }}
                    className="p-1 rounded-lg text-muted-foreground hover:text-cyan-400 hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Connect this camera to another"
                  >
                    <Link2 className="h-3 w-3" />
                  </button>

                  {/* Delete Camera */}
                  {onDeleteCamera && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        pushHistorySnapshot(localCameras, localLines, localZones);
                        onDeleteCamera(cam.id);
                      }}
                      className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      title="Delete this camera"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Camera Icon Body (Sits directly on the wall edge: half inside, half outside) */}
              <div
                className={`relative flex h-9 w-9 items-center justify-center rounded-xl border-2 shadow-xl backdrop-blur-md transition-all z-30 ${
                  isConnectSource
                    ? 'border-cyan-400 bg-cyan-500 text-white ring-4 ring-cyan-400/40 animate-pulse'
                    : isSelected
                    ? 'border-primary bg-primary text-primary-foreground ring-4 ring-primary/30 shadow-primary/20'
                    : cam.is_entry_point
                    ? 'border-emerald-500 bg-emerald-600 text-white hover:border-emerald-400'
                    : 'border-border bg-card/95 text-foreground group-hover:border-primary group-hover:bg-accent/80'
                }`}
              >
                <Camera className="h-4 w-4 z-10" />

                {/* Wall Contact / Mounting Pivot Dot (The blue dot at the exact wall contact point) */}
                <div
                  className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 shadow-md z-20 pointer-events-none transition-all ${
                    isSelected
                      ? 'bg-sky-400 border-white ring-2 ring-sky-400/50'
                      : 'bg-primary border-background'
                  }`}
                  title={`Wall Contact Pivot (${coords.x}%, ${coords.y}%)`}
                />

                {/* Direction Notch (Lens Aim Indicator - clickable to adjust +30°) */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRotateCam(e, cam.id, fovAngle, 30);
                  }}
                  className="absolute -top-1.5 h-2.5 w-2.5 rounded-full bg-primary hover:bg-sky-300 border border-background shadow-xs pointer-events-auto cursor-pointer z-30 transition-transform"
                  style={{
                    transform: `rotate(${fovAngle}deg) translateY(-16px)`,
                  }}
                  title={`Direction: ${fovAngle}° (Click to adjust +30°)`}
                />
              </div>

              {/* Camera Name Label & Status Badges */}
              <div className="mt-1 flex flex-col items-center gap-0.5 z-20">
                <div className="flex items-center gap-1 rounded bg-background/90 px-2 py-0.5 text-[10px] font-bold text-foreground shadow-md backdrop-blur-sm border border-border/80 whitespace-nowrap">
                  <span>{cam.name}</span>
                  {cam.is_entry_point && (
                    <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[8px] text-emerald-400 uppercase font-semibold">
                      Entry
                    </span>
                  )}
                </div>

                <span className="text-[9px] text-muted-foreground font-mono bg-card/80 px-1 rounded border border-border/40">
                  {isIsolated ? 'Standalone' : `${linkCount} link${linkCount > 1 ? 's' : ''}`}
                </span>
              </div>
            </div>
          );
        })}
        </div>

        {/* Canvas Navigation Hint (Bottom-Left) */}
        <div className="absolute bottom-3 left-3 z-40 hidden sm:flex items-center gap-2 rounded-full border border-slate-800/90 bg-slate-950/85 px-3 py-1 text-[10px] text-muted-foreground/80 backdrop-blur-md pointer-events-none select-none">
          <span className="flex items-center gap-1 font-semibold text-sky-300">
            <Hand className="h-3 w-3" /> Left Drag to Pan
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 font-semibold text-purple-300">
            <Square className="h-3 w-3" /> Right Drag to Draw Shape / Line
          </span>
          <span>•</span>
          <span>Scroll to Zoom</span>
        </div>

        {/* Viewport Zoom & Pan Floating HUD (Bottom-Right) */}
        <div
          className="absolute bottom-3 right-3 z-45 flex items-center gap-1.5 rounded-2xl border border-slate-700/80 bg-slate-950/90 p-1.5 shadow-2xl backdrop-blur-md"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Zoom Out Button */}
          <button
            type="button"
            onClick={handleZoomOut}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            title="Zoom Out (Ctrl - or Scroll Down)"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          {/* Zoom Level Indicator & Reset */}
          <button
            type="button"
            onClick={handleResetZoom}
            className="px-2 py-1 text-[11px] font-mono font-bold text-sky-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Click to reset zoom to 100% (Ctrl 0)"
          >
            {Math.round(zoom * 100)}%
          </button>

          {/* Zoom In Button */}
          <button
            type="button"
            onClick={handleZoomIn}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            title="Zoom In (Ctrl + or Scroll Up)"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-slate-700/80 mx-0.5" />

          {/* Fit Plan Button */}
          <button
            type="button"
            onClick={handleFitView}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer shadow-xs"
            title="Auto-Fit All Rooms & Cameras in View"
          >
            <Maximize2 className="h-3.5 w-3.5 text-sky-400" />
            <span>Fit Plan</span>
          </button>
        </div>
      </div>

      {/* Footer Info / Topology Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <strong className="text-foreground">{localCameras.length}</strong> Cameras
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-purple-400" />
            <strong className="text-foreground">{localZones.length}</strong> Zones
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            <strong className="text-foreground">{localLines.filter((l) => l.line_type === 'wall').length}</strong> Walls
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <strong className="text-foreground">{localLines.filter((l) => l.line_type === 'corridor').length}</strong> Corridors
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            <strong className="text-foreground">{links.length}</strong> Walkway Links
          </span>
        </div>

        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/80">
          <span className="flex items-center gap-1">
            <Ruler className="h-3 w-3" /> Scale: ~{Math.round(scaleMetersPerPx * 100)}cm/px
          </span>
          <div className="flex items-center gap-1">
            <Compass className="h-3 w-3" />
            <span>Wall-Snap active • Left-Drag to Pan • Right-Drag to Draw • FOV points inward • Ctrl+Z Undo</span>
          </div>
        </div>
      </div>
      </div>
    </div>

      {/* Zone Naming Modal Dialog (Option B: Rectangle / Zone Stamp) */}
      {pendingZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-purple-500/40 bg-card p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
                  <Square className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Name Stamped Zone / Area</h3>
                  <p className="text-[11px] text-muted-foreground">Creates closed rectangular boundaries & enables camera wall-snapping</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingZone(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Calculated Dimensions Banner */}
            <div className="flex items-center justify-between rounded-xl bg-purple-950/50 border border-purple-500/30 p-3">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-mono font-semibold text-purple-200">
                  {pendingZone.widthMeters}m × {pendingZone.heightMeters}m
                </span>
              </div>
              <div className="rounded-lg bg-purple-500/20 px-2.5 py-1 text-xs font-bold text-purple-300 font-mono">
                {pendingZone.areaSqm} m² Floor Area
              </div>
            </div>

            {/* Zone Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Zone Name</span>
                <span className="text-[10px] text-muted-foreground">e.g. Meeting Room A, Reception</span>
              </label>
              <input
                type="text"
                autoFocus
                value={zoneModalName}
                onChange={(e) => setZoneModalName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveZoneModal();
                  } else if (e.key === 'Escape') {
                    setPendingZone(null);
                  }
                }}
                placeholder="Enter zone name..."
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-hidden focus:ring-2 focus:ring-purple-500/30"
              />
            </div>

            {/* Quick Preset Badges */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Quick Presets</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: 'Meeting Room', icon: '🏢', type: 'meeting', color: 'purple' },
                  { name: 'Open Office', icon: '💻', type: 'office', color: 'sky' },
                  { name: 'Main Lobby', icon: '🏛️', type: 'lobby', color: 'emerald' },
                  { name: 'Hallway', icon: '🚶', type: 'corridor', color: 'amber' },
                  { name: 'Cafeteria', icon: '☕', type: 'other', color: 'emerald' },
                  { name: 'Server Room', icon: '🔒', type: 'restricted', color: 'rose' },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setZoneModalName(preset.name);
                      setZoneModalType(preset.type as any);
                      setZoneModalColor(preset.color);
                    }}
                    className="rounded-lg border border-border bg-accent/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:border-purple-500/50 hover:bg-purple-500/10 hover:text-purple-300 transition-colors cursor-pointer"
                  >
                    {preset.icon} {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Accent Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Theme Color</label>
              <div className="flex items-center gap-2">
                {[
                  { id: 'purple', label: 'Purple', bg: 'bg-purple-500', border: 'border-purple-400' },
                  { id: 'sky', label: 'Sky', bg: 'bg-sky-500', border: 'border-sky-400' },
                  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500', border: 'border-emerald-400' },
                  { id: 'amber', label: 'Amber', bg: 'bg-amber-500', border: 'border-amber-400' },
                  { id: 'rose', label: 'Rose', bg: 'bg-rose-500', border: 'border-rose-400' },
                ].map((col) => (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setZoneModalColor(col.id)}
                    className={`h-6 w-6 rounded-full ${col.bg} transition-all cursor-pointer ${
                      zoneModalColor === col.id ? `ring-2 ring-white scale-110 shadow-md ${col.border}` : 'opacity-70 hover:opacity-100'
                    }`}
                    title={col.label}
                  />
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
              <button
                type="button"
                onClick={() => setPendingZone(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveZoneModal}
                className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/25 hover:bg-purple-500 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                <span>Save Zone & Walls</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REMOVE CONNECTION CONFIRMATION MODAL */}
      {linkToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-foreground flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Disconnect Cameras?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to remove the walkway connection between <b className="text-foreground">&quot;{linkToDelete.fromName}&quot;</b> and <b className="text-foreground">&quot;{linkToDelete.toName}&quot;</b>?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setLinkToDelete(null)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  pushHistorySnapshot(localCameras, localLines, localZones);
                  onDeleteLink?.(linkToDelete.id);
                  setLinkToDelete(null);
                }}
                className="rounded-lg bg-destructive px-4 py-1.5 text-xs font-semibold text-white hover:bg-destructive/90 shadow-sm cursor-pointer transition-colors"
              >
                Yes, Remove Connection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
