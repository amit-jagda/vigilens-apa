'use client';

import React, { useState } from 'react';
import { User, Timer, Camera, Clock, ArrowRight, ShieldCheck, Trash2, Check, X } from 'lucide-react';
import type { PersonSummaryItem } from '@/types/advancedpeopleanalytics';
import { getMediaCropUrl } from '@/lib/apiClient';
import { formatDwellTime } from '@/lib/utils';
import { deleteVisitorIdentity } from '@/lib/api/advancedpeopleanalytics';
import toast from 'react-hot-toast';

interface PersonCardProps {
  person: PersonSummaryItem;
  onViewJourney: (person: PersonSummaryItem) => void;
  onDelete?: (person: PersonSummaryItem) => void;
}

export function PersonCard({ person, onViewJourney, onDelete }: PersonCardProps) {
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

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md">
      {/* Top Right: Delete Visitor Option (for non-employees) */}
      {!isEmployee && (
        <div className="absolute top-3.5 right-3.5 z-10">
          {isConfirmingDelete ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 bg-card/95 border border-destructive/50 rounded-xl p-1 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
            >
              <span className="text-[10px] font-bold text-destructive pl-1.5 pr-0.5">Delete?</span>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                title="Confirm delete profile"
                className="p-1 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsConfirmingDelete(false);
                }}
                title="Cancel"
                className="p-1 rounded-lg bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsConfirmingDelete(true);
              }}
              title="Delete Visitor Profile (Not a person)"
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg border border-border/40 bg-card/80 hover:border-destructive/40 hover:bg-destructive/10 text-muted-foreground hover:text-destructive shadow-sm"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <div>
        {/* Top: Avatar & Name */}
        <div className="flex items-start gap-3.5 pr-6">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-border bg-background shadow-inner">
            {person.crop_url ? (
              <img
                src={getMediaCropUrl(person.crop_url)}
                alt={person.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-accent/40 text-muted-foreground">
                <User className="h-7 w-7" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-sm text-foreground truncate">{person.name}</h3>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                  isEmployee
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {person.person_type.toUpperCase()}
              </span>
            </div>

            {person.employee_code && (
              <span className="inline-block rounded bg-accent px-1.5 py-0.5 text-[10px] font-mono text-foreground font-semibold mt-1">
                ID: {person.employee_code}
              </span>
            )}

            <p className="text-[10px] text-muted-foreground font-mono truncate mt-1">
              UUID: {person.person_id.slice(0, 14)}...
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border border-border/80 bg-accent/20 p-2.5">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Timer className="h-3 w-3 text-primary" /> Total Dwell
            </span>
            <span className="font-bold text-foreground mt-0.5 block">
              {formatDwellTime(person.total_dwell_seconds)}
            </span>
          </div>

          <div className="rounded-xl border border-border/80 bg-accent/20 p-2.5">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Camera className="h-3 w-3 text-primary" /> Locations
            </span>
            <span className="font-bold text-foreground mt-0.5 block">
              {person.camera_stops_count} Camera{person.camera_stops_count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Cameras Visited tags */}
        {person.cameras_visited && person.cameras_visited.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {person.cameras_visited.slice(0, 3).map((cam, idx) => (
              <span
                key={idx}
                className="rounded bg-accent/60 border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground font-medium"
              >
                📷 {cam}
              </span>
            ))}
            {person.cameras_visited.length > 3 && (
              <span className="rounded bg-accent/60 border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground font-medium">
                +{person.cameras_visited.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer: Activity Window & Button */}
      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
        <span className="text-[10px] text-muted-foreground">
          {new Date(person.first_seen_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </span>

        <button
          type="button"
          onClick={() => onViewJourney(person)}
          className="flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-bold text-primary transition-all hover:bg-primary hover:text-primary-foreground"
        >
          <span>View Journey</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
