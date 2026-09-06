'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Sparkles, Footprints, Camera } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/types/assistant';

interface ChatMessageProps {
  message: ChatMessageType;
  onSelectEntity?: (type: 'person' | 'camera' | 'zone' | 'date', idOrLabel: string) => void;
}

export function ChatMessage({ message, onSelectEntity }: ChatMessageProps) {
  const isAssistant = message.sender === 'assistant';

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
        <div className="prose prose-invert prose-xs max-w-none">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

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
                ) : (
                  <Camera className="h-3 w-3 text-primary" />
                )}
                <span>{ent.label}</span>
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
