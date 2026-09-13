'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Sparkles, Footprints, Camera, Code2, ChevronDown, ChevronUp, Clock, Cpu, MapPin } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/types/assistant';

interface ChatMessageProps {
  message: ChatMessageType;
  onSelectEntity?: (type: 'person' | 'camera' | 'zone' | 'date', idOrLabel: string) => void;
  onSelectFollowup?: (query: string) => void;
}

export function ChatMessage({ message, onSelectEntity, onSelectFollowup }: ChatMessageProps) {
  const isAssistant = message.sender === 'assistant';
  const [showSql, setShowSql] = useState(false);

  return (
    <div
      className={`flex items-start gap-3.5 ${
        isAssistant ? 'justify-start' : 'justify-end flex-row-reverse'
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-sm ${
          isAssistant
            ? 'bg-primary text-primary-foreground shadow-primary/20'
            : 'bg-accent text-foreground border border-border'
        }`}
      >
        {isAssistant ? <Sparkles className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>

      {/* Bubble Content */}
      <div
        className={`max-w-2xl rounded-2xl p-4 shadow-sm text-xs leading-relaxed ${
          isAssistant
            ? 'bg-card border border-border text-foreground'
            : 'bg-primary text-primary-foreground'
        }`}
      >
        {/* Model & Latency Header Badge (for Assistant) */}
        {isAssistant && message.metadata?.model_used && (
          <div className="mb-2 flex items-center justify-between gap-2 border-b border-border/60 pb-2 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium">
              <Cpu className="h-3 w-3 text-primary" />
              <span>{message.metadata.model_used}</span>
            </div>
            {message.metadata?.execution_time_ms !== undefined && (
              <div className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
                <Clock className="h-2.5 w-2.5" />
                <span>{message.metadata.execution_time_ms} ms</span>
              </div>
            )}
          </div>
        )}

        <div className="prose prose-invert prose-xs max-w-none text-foreground/90 leading-relaxed">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {/* Expandable Generated SQL Query */}
        {isAssistant && message.metadata?.sql_query && (
          <div className="mt-3 rounded-lg border border-border/80 bg-accent/30 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSql(!showSql)}
              className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1.5 text-primary">
                <Code2 className="h-3.5 w-3.5" />
                <span>Generated PostgreSQL Query</span>
              </span>
              {showSql ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {showSql && (
              <div className="border-t border-border/60 bg-zinc-950 p-3 font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-pre leading-normal">
                {message.metadata.sql_query}
              </div>
            )}
          </div>
        )}

        {/* Clickable Entity Chips in Assistant Responses */}
        {isAssistant && message.metadata?.entities && message.metadata.entities.length > 0 && (
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
            <span className="text-[10px] text-muted-foreground font-semibold">Referenced Entities:</span>
            {message.metadata.entities.map((ent, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectEntity?.(ent.type, ent.id || ent.label)}
                className="flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-primary/20 hover:text-primary transition-colors border border-border/80"
              >
                {ent.type === 'person' ? (
                  <Footprints className="h-3 w-3 text-primary" />
                ) : ent.type === 'camera' ? (
                  <Camera className="h-3 w-3 text-primary" />
                ) : (
                  <MapPin className="h-3 w-3 text-primary" />
                )}
                <span>{ent.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Suggested Followup Questions */}
        {isAssistant && message.metadata?.suggested_followups && message.metadata.suggested_followups.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 pt-2">
            {message.metadata.suggested_followups.map((followup, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectFollowup?.(followup)}
                className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                💬 {followup}
              </button>
            ))}
          </div>
        )}

        <span
          className={`block text-[10px] mt-2 ${
            isAssistant ? 'text-muted-foreground' : 'text-primary-foreground/70'
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
