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
  Users,
  Clock,
  Backpack,
} from 'lucide-react';
import { queryAssistant, getOllamaModels } from '@/lib/api/assistant';
import { ChatMessage } from '@/components/assistant/ChatMessage';
import { SuggestedQueries } from '@/components/assistant/SuggestedQueries';
import type { ChatMessage as ChatMessageType, OllamaModelInfo } from '@/types/assistant';

const QUICK_PROMPTS = [
  { icon: Users, label: 'Staff & Dwell', query: 'Show all staff members and their registered photos and dwell times today' },
  { icon: Clock, label: 'Busiest Camera', query: 'Which camera had the highest foot traffic this week?' },
  { icon: Users, label: 'Longest Stay', query: 'Who stayed the longest on premises?' },
  { icon: Backpack, label: 'Objects & Bags', query: 'Show persons carrying backpacks or laptops' },
];

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
          response_format: response.response_format,
          entities: response.entities,
          raw_results: response.raw_results,
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
    <div className="flex h-[calc(100vh-3.5rem)] w-full flex-col bg-background overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-border/80 bg-card/50 px-6 py-2.5 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Database className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">Vigilens AI Assistant</span>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                READY
              </span>
            </div>
          </div>
        </div>

        {/* Engine Status & Controls */}
        <div className="flex items-center gap-2">
          {ollamaInfo ? (
            <div className="flex items-center gap-1.5 rounded-full border border-border/80 bg-accent/40 px-2.5 py-0.5 text-[10px]">
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
                    <span className="font-mono text-primary font-semibold">{selectedModel || ollamaInfo.current_model}</span>
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
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-accent/40 px-2.5 py-0.5 text-[10px] text-muted-foreground">
              <Cpu className="h-3 w-3 text-primary" />
              <span>SQL Agent Engine</span>
            </div>
          )}

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              className="flex items-center gap-1 rounded-lg border border-border/80 bg-accent/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
            >
              <Trash2 className="h-3 w-3" /> Clear Chat
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-4xl mx-auto w-full space-y-3">
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
                <div className="flex items-start gap-2.5 my-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs animate-pulse">
                    <Sparkles className="h-3.5 w-3.5 animate-spin" />
                  </div>
                  <div className="rounded-2xl rounded-tl-xs border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground shadow-xs flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
                    </div>
                    <span>Analyzing CCTV intelligence & executing query...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Bottom Pinned Input Bar */}
      <div className="border-t border-border/70 bg-card/60 backdrop-blur-md px-4 py-3 shrink-0">
        <div className="max-w-4xl mx-auto w-full">
          {/* Quick prompt suggestions (when in chat) */}
          {messages.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              <span className="text-[10px] text-muted-foreground font-semibold shrink-0 flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5 text-primary" /> Suggestions:
              </span>
              {QUICK_PROMPTS.map((qp, idx) => {
                const Icon = qp.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendQuery(qp.query)}
                    disabled={isLoading}
                    className="flex items-center gap-1 rounded-full border border-border/80 bg-background/80 px-2.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-accent transition-all shrink-0"
                  >
                    <Icon className="h-2.5 w-2.5 text-primary" />
                    <span>{qp.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Text Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery();
            }}
            className="relative flex items-center"
          >
            <input
              type="text"
              placeholder="Ask anything (e.g. 'Show details for Kinjal', 'Who stayed longest today?', 'Which camera has highest traffic?')..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-xl border border-input bg-background/90 pl-4 pr-11 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
            />
            <button
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-30"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
