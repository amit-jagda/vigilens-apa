'use client';

import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

export interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: React.ReactNode;
  confirmText?: string;
  loading?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  title = 'Delete Item?',
  description = 'You are about to permanently delete this item. This action cannot be undone.',
  confirmText = 'Delete',
  loading = false,
  disabled = false,
  children,
}: ConfirmDeleteModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md select-none"
      onClick={onClose}
    >
      <div
        className="border-border bg-card w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-gradient-to-r from-rose-600 to-rose-400" />
        <div className="space-y-5 p-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3">
              <AlertTriangle className="h-6 w-6 text-rose-500" />
            </div>
            <div className="space-y-1">
              <h2 className="text-foreground text-base font-bold tracking-tight">
                {title}
              </h2>
              {typeof description === 'string' ? (
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {description}
                </p>
              ) : (
                description
              )}
            </div>
          </div>

          {children}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground hover:border-border flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading || disabled}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
