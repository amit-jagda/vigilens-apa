'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Send,
  Trash2,
  Cpu,
  Database,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { queryAssistant, getOllamaModels } from '@/lib/api/assistant';
import { ChatMessage } from '@/components/assistant/ChatMessage';
import { SuggestedQueries } from '@/components/assistant/SuggestedQueries';
import type { ChatMessage as ChatMessageType, OllamaModelInfo } from '@/types/assistant';

export default function AssistantPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ollamaInfo, setOllamaInfo] = useState<OllamaModelInfo | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    getOllamaModels().then((info) => {
      if (info) {
        setOllamaInfo(info);
        if (info.current_model) {
          setSelectedModel(info.current_model);
        }
      }
    });
  }, []);

  const handleSendQuery = async (queryText?: string) => {
    const text = (queryText || inputQuery).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessageType = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));

      const response = await queryAssistant({
        question: text,
        session_id: 'apa_session',
        model_name: selectedModel || undefined,
        conversation_history: history,
      });

      const assistantMsg: ChatMessageType = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        content: response.answer,
        timestamp: new Date().toISOString(),
        metadata: {
          entities: response.entities,
          sql_query: response.sql_query,
          execution_time_ms: response.execution_time_ms,
          model_used: response.model_used,
          retry_count: response.retry_count,
          suggested_followups: response.suggested_followups,
        },
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessageType = {
        id: `assistant-error-${Date.now()}`,
        sender: 'assistant',
        content:
          '⚠️ **Error Processing Query**\n\nCould not execute surveillance query against the PostgreSQL database. Please verify video analytics processing has completed.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEntityClick = (type: 'person' | 'camera' | 'zone' | 'date', idOrLabel: string) => {
    if (type === 'person') {
      router.push(`/people/${idOrLabel}`);
    } else {
      router.push(`/setup`);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] max-w-5xl mx-auto flex-col rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/80 bg-accent/20 px-6 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Database className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">Vigilens Autonomous SQL Agent</h3>
            <p className="text-[10px] text-muted-foreground">PostgreSQL Surveillance & Spatio-Temporal Intelligence</p>
          </div>
        </div>

        {/* Engine Status & Controls */}
        <div className="flex items-center gap-3">
          {ollamaInfo ? (
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-[10px]">
              {ollamaInfo.status === 'connected' ? (
                <>
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span className="font-medium text-foreground">{ollamaInfo.provider || 'Engine'}:</span>
                  {ollamaInfo.available_models.length > 1 ? (
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="bg-transparent font-medium text-primary focus:outline-none cursor-pointer"
                    >
                      {ollamaInfo.available_models.map((m) => (
                        <option key={m} value={m} className="bg-card text-foreground">
                          {m}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-mono text-primary">{selectedModel || ollamaInfo.current_model}</span>
                  )}
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 text-amber-500" />
                  <span className="text-muted-foreground">{ollamaInfo.provider || 'Offline'} (Rule Fallback)</span>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-[10px] text-muted-foreground">
              <Cpu className="h-3 w-3 text-primary" />
              <span>SQL Agent Engine</span>
            </div>
          )}

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear Chat
            </button>
          )}
        </div>
      </div>

      {/* Messages Thread Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <SuggestedQueries onSelectQuery={(q) => handleSendQuery(q)} />
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onSelectEntity={handleEntityClick}
                onSelectFollowup={(followup) => handleSendQuery(followup)}
              />
            ))}
            {isLoading && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <Sparkles className="h-4 w-4 animate-spin" />
                </div>
                <div className="rounded-2xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground shadow-sm flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span>Generating PostgreSQL query & analyzing spatial intelligence...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Bar */}
      <div className="border-t border-border/80 bg-background/60 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendQuery();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            placeholder="Ask anything (e.g. 'Who stayed the longest?', 'Which camera has most foot traffic?')..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-2xl border border-input bg-card pl-4 pr-12 py-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
          />
          <button
            type="submit"
            disabled={isLoading || !inputQuery.trim()}
            className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
