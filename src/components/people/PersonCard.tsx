'use client';

import React, { useState } from 'react';
import {
  User,
  Timer,
  Camera,
  Clock,
  ArrowRight,
  ShieldCheck,
  Trash2,
  Check,
  X,
  Sparkles,
  MapPin,
  Briefcase,
} from 'lucide-react';
import type { PersonSummaryItem } from '@/types/advancedpeopleanalytics';
import { getMediaCropUrl } from '@/lib/apiClient';
import { formatDwellTime } from '@/lib/utils';
import { deleteVisitorIdentity } from '@/lib/api/advancedpeopleanalytics';
import toast from 'react-hot-toast';

interface PersonCardProps {
  person: PersonSummaryItem;
  onViewJourney: (person: PersonSummaryItem) => void;
  onDelete?: (person: PersonSummaryItem) => void;
  maxDwellSeconds?: number;
}

const OBJECT_ICONS: Record<string, string> = {
  backpack: '🎒',
  handbag: '👜',
  suitcase: '🧳',
  umbrella: '☂️',
  laptop: '💻',
  mouse: '🖱️',
  keyboard: '⌨️',
  'cell phone': '📱',
  remote: '📺',
  bottle: '💧',
  cup: '☕',
  book: '📖',
};

export function PersonCard({ person, onViewJourney, onDelete, maxDwellSeconds }: PersonCardProps) {
  const isEmployee = person.person_type === 'employee';
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      if (onDelete) {
        onDelete(person);
      } else {
        const res = await deleteVisitorIdentity(person.person_id);
        toast.success(res?.message || 'Visitor profile deleted successfully');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete visitor profile');
    } finally {
      setIsDeleting(false);
      setIsConfirmingDelete(false);
    }
  };

  // Dynamic relative scaling: Compare against the highest dwell in the current video session/directory
  const effectiveMax = Math.max(maxDwellSeconds || 0, 30);
  const dwellPercentage = Math.min(
    100,
    Math.max(6, Math.round(((person.total_dwell_seconds || 0) / effectiveMax) * 100))
  );

  return (
    <div
      onClick={() => onViewJourney(person)}
      className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/80 bg-card shadow-sm transition-all duration-300 hover:border-primary/60 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
    >
      {/* Top Visual Showcase Banner (Large Image Showcase) */}
      <div className="relative h-56 w-full overflow-hidden bg-muted/40">
        {person.crop_url ? (
          <>
            {/* Ambient Blurred Backdrop */}
            <img
              src={getMediaCropUrl(person.crop_url)}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover blur-md opacity-30 scale-110"
            />
            {/* Crisp Focused Foreground Portrait */}
            <img
              src={getMediaCropUrl(person.crop_url)}
              alt={person.name}
              className="relative z-1 h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-105"
            />
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-accent/40 to-muted/80 text-muted-foreground">
            <div className="rounded-full bg-background/60 p-4 shadow-inner">
              <User className="h-12 w-12 text-muted-foreground/60" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground/70 mt-2">No Crop Captured</span>
          </div>
        )}

        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 z-2 bg-gradient-to-t from-card via-card/30 to-transparent pointer-events-none" />

        {/* Floating Role Badge */}
        <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1 text-xs font-bold tracking-wide shadow-lg backdrop-blur-md border ${
              isEmployee
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}
          >
            {isEmployee ? (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> STAFF
              </>
            ) : (
              <>
                <User className="h-3.5 w-3.5 text-amber-400" /> VISITOR
              </>
            )}
          </span>
          {person.employee_code && (
            <span className="rounded-xl bg-background/80 border border-border/80 px-2.5 py-1 text-xs font-mono font-bold text-foreground backdrop-blur-md shadow-sm">
              #{person.employee_code}
            </span>
          )}
        </div>

        {/* Top Right: Delete Visitor Option (for non-employees) */}
        {!isEmployee && (
          <div className="absolute top-3.5 right-3.5 z-10">
            {isConfirmingDelete ? (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 bg-card/95 border border-destructive/50 rounded-2xl p-1 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
              >
                <span className="text-[11px] font-bold text-destructive pl-2 pr-0.5">Delete?</span>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  title="Confirm delete profile"
                  className="p-1.5 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsConfirmingDelete(false);
                  }}
                  title="Cancel"
                  className="p-1.5 rounded-xl bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsConfirmingDelete(true);
                }}
                title="Delete Visitor Profile"
                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-xl border border-border/60 bg-background/80 hover:border-destructive/50 hover:bg-destructive/10 text-muted-foreground hover:text-destructive shadow-md backdrop-blur-md"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Floating Identity Title on Image Bottom */}
        <div className="absolute bottom-3 left-4 right-4 z-10 flex items-end justify-between">
          <div className="min-w-0 flex-1 pr-2">
            <h3 className="text-base font-extrabold text-foreground truncate drop-shadow-sm group-hover:text-primary transition-colors">
              {person.name}
            </h3>
            <p className="text-[11px] text-muted-foreground font-mono truncate">
              ID: {person.person_id.slice(0, 16)}
            </p>
          </div>
          <span className="shrink-0 rounded-lg bg-background/80 border border-border/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground backdrop-blur-sm">
            {new Date(person.first_seen_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Body: Visual Analytics Metrics */}
      <div className="p-5 space-y-4">
        {/* Visual Dwell Intensity Bar */}
        <div className="rounded-2xl border border-border/70 bg-accent/20 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <Timer className="h-4 w-4 text-primary" /> Total On-Premises Dwell
            </span>
            <span className="font-extrabold text-foreground text-sm">
              {formatDwellTime(person.total_dwell_seconds)}
            </span>
          </div>

          {/* Dwell Fill Meter */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-accent/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-primary to-indigo-500 transition-all duration-500"
              style={{ width: `${dwellPercentage}%` }}
            />
          </div>
        </div>

        {/* Visual Camera Pathway Flow */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Camera className="h-3.5 w-3.5 text-primary" /> Camera Pathway ({person.camera_stops_count} Node
            {person.camera_stops_count !== 1 ? 's' : ''})
          </span>

          {person.cameras_visited && person.cameras_visited.length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {person.cameras_visited.slice(0, 3).map((cam, idx) => (
                <React.Fragment key={idx}>
                  <span className="inline-flex items-center gap-1 rounded-xl bg-accent/60 border border-border/80 px-2.5 py-1 text-xs font-semibold text-foreground shadow-2xs">
                    <MapPin className="h-3 w-3 text-cyan-400" />
                    {cam.replace(/\.(mp4|avi|mov)$/i, '')}
                  </span>
                  {idx < Math.min(person.cameras_visited.length - 1, 2) && (
                    <ArrowRight className="h-3 w-3 text-primary/60 shrink-0" />
                  )}
                </React.Fragment>
              ))}
              {person.cameras_visited.length > 3 && (
                <span className="rounded-xl bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
                  +{person.cameras_visited.length - 3} more
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground italic">Single camera detection</span>
          )}
        </div>

        {/* Associated / Carried Objects Visual Badges */}
        {person.associated_objects && person.associated_objects.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Detected Objects & Belongings
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {person.associated_objects.map((obj) => (
                <span
                  key={obj}
                  className="inline-flex items-center gap-1 rounded-xl bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-xs font-semibold text-amber-300 capitalize shadow-2xs"
                >
                  <span>{OBJECT_ICONS[obj.toLowerCase()] || '📦'}</span> {obj}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Card Action Footer */}
      <div className="border-t border-border/70 bg-accent/10 px-5 py-3.5 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {person.latest_event_type ? `Latest: ${person.latest_event_type.toUpperCase()}` : 'Tracked on CCTV'}
        </span>

        <span className="flex items-center gap-1.5 rounded-xl bg-primary/10 border border-primary/30 px-3.5 py-1.5 text-xs font-bold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-sm">
          <span>View Journey</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </div>
  );
}
