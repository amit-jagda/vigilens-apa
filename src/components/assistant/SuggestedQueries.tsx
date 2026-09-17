'use client';

import React, { useState } from 'react';
import { Sparkles, Users, Clock, Backpack, Compass, HelpCircle } from 'lucide-react';

interface SuggestedQueriesProps {
  onSelectQuery: (query: string) => void;
}

const CATEGORIES = [
  {
    id: 'people',
    name: 'Visitors & Staff',
    icon: Users,
    queries: [
      'Who visited yesterday and stayed the longest?',
      'Show me all staff members detected today',
      'List all new visitors detected this week',
      'Show top 5 visitors with the highest dwell time',
    ],
  },
  {
    id: 'traffic',
    name: 'Foot Traffic & Hotspots',
    icon: Clock,
    queries: [
      'Which camera had the highest foot traffic this week?',
      'Show average dwell time for each camera location',
      'What was the peak occupancy recorded across all sessions?',
      'Which area is currently the busiest?',
    ],
  },
  {
    id: 'objects',
    name: 'Object & Bag Detection',
    icon: Backpack,
    queries: [
      'Show persons carrying backpacks or laptops',
      'What objects and items were detected across recent footage?',
      'List all detections with suitcases or handbags',
    ],
  },
  {
    id: 'journeys',
    name: 'Journeys & Tracking',
    icon: Compass,
    queries: [
      'Show the path and journey of visitor 1042',
      'Show all line crossing entry events',
      'Which individuals traversed multiple cameras?',
    ],
  },
  {
    id: 'guidance',
    name: 'Assistant Guidance',
    icon: HelpCircle,
    queries: [
      'What can you do and what data do you analyze?',
      'What tables and surveillance metrics are available?',
      'How do I search for a specific person or camera?',
    ],
  },
];

export function SuggestedQueries({ onSelectQuery }: SuggestedQueriesProps) {
  const [activeCategory, setActiveCategory] = useState('people');
  const currentGroup = CATEGORIES.find((c) => c.id === activeCategory) || CATEGORIES[0];

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 mb-3 shadow-sm">
        <Sparkles className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold text-foreground">Vigilens Spatio-Temporal AI Assistant</h3>
      <p className="text-xs text-muted-foreground max-w-md mt-1 mb-6">
        Ask natural language questions about surveillance footage, visitor dwell times, camera walkways, staff attendance, and detected belongings.
      </p>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 mb-5">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = cat.id === activeCategory;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent/40'
              }`}
            >
              <Icon className="h-3 w-3" />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Query Suggestions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
        {currentGroup.queries.map((query) => (
          <button
            key={query}
            type="button"
            onClick={() => onSelectQuery(query)}
            className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-xs text-left font-medium text-muted-foreground hover:border-primary/50 hover:bg-accent/30 hover:text-foreground transition-all shadow-sm group"
          >
            <span className="text-primary group-hover:scale-110 transition-transform">💬</span>
            <span className="leading-snug">&quot;{query}&quot;</span>
          </button>
        ))}
      </div>
    </div>
  );
}
