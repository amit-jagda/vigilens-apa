'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface SuggestedQueriesProps {
  onSelectQuery: (query: string) => void;
}

const SUGGESTIONS = [
  'Who visited yesterday?',
  'Which area had the highest foot traffic?',
  'Who stayed the longest on premises?',
  'List all staff identified via face recognition',
  'Show all new visitors detected this week',
];

export function SuggestedQueries({ onSelectQuery }: SuggestedQueriesProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 mb-3">
        <Sparkles className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold text-foreground">Ask Vigilens AI Assistant</h3>
      <p className="text-xs text-muted-foreground max-w-md mt-1 mb-6">
        Ask natural language questions about your footage, detected visitors, dwell durations, and camera walkways.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg">
        {SUGGESTIONS.map((query) => (
          <button
            key={query}
            type="button"
            onClick={() => onSelectQuery(query)}
            className="rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-medium text-muted-foreground hover:border-primary/50 hover:bg-accent/40 hover:text-foreground transition-all shadow-sm text-left"
          >
            💬 &quot;{query}&quot;
          </button>
        ))}
      </div>
    </div>
  );
}
