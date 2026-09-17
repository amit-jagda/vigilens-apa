'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  User,
  Sparkles,
  Footprints,
  Camera,
  Code2,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
  Users,
  Timer,
  Eye,
  Backpack,
} from 'lucide-react';
import { getEmployeePhotoUrl } from '@/lib/api/employees';
import type { ChatMessage as ChatMessageType, EntityItem } from '@/types/assistant';

interface ChatMessageProps {
  message: ChatMessageType;
  onSelectEntity?: (type: 'person' | 'camera' | 'zone' | 'date', idOrLabel: string) => void;
  onSelectFollowup?: (query: string) => void;
}

export function ChatMessage({ message, onSelectEntity, onSelectFollowup }: ChatMessageProps) {
  const isAssistant = message.sender === 'assistant';
  const [showSql, setShowSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedAnswer, setCopiedAnswer] = useState(false);

  const responseFormat = message.metadata?.response_format || 'general';
  const personEntities = message.metadata?.entities?.filter((e) => e.type === 'person') || [];
  const locationEntities = message.metadata?.entities?.filter((e) => e.type === 'camera' || e.type === 'zone') || [];
  const rawResults = message.metadata?.raw_results || [];

  const handleCopySql = () => {
    if (message.metadata?.sql_query) {
      navigator.clipboard.writeText(message.metadata.sql_query);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    }
  };

  const handleCopyAnswer = () => {
    navigator.clipboard.writeText(message.content);
    setCopiedAnswer(true);
    setTimeout(() => setCopiedAnswer(false), 2000);
  };

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // User Message (Sleek, Compact, Right Aligned with External Timestamp)
  if (!isAssistant) {
    return (
      <div className="flex w-full justify-end my-1.5">
        <div className="flex flex-col items-end max-w-xl">
          <div className="flex items-start gap-2">
            <div className="rounded-2xl rounded-tr-xs bg-primary text-primary-foreground px-4 py-2 text-xs shadow-sm leading-relaxed">
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-accent text-foreground border border-border/80 shadow-2xs mt-0.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono mr-9 mt-1">
            {formattedTime}
          </span>
        </div>
      </div>
    );
  }

  // Assistant Response (Left Aligned, Natural Fit Width with External Timestamp)
  return (
    <div className="flex w-full justify-start my-2">
      <div className="flex flex-col items-start max-w-3xl w-fit">
        <div className="flex items-start gap-2.5">
          {/* Assistant Avatar */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs mt-0.5">
            <Sparkles className="h-3.5 w-3.5" />
          </div>

          {/* Assistant Content Card */}
          <div className="rounded-2xl rounded-tl-xs bg-card border border-border/90 px-4 py-3 text-xs shadow-xs text-foreground w-full max-w-2xl">
            {/* Subtle Top Metadata Bar */}
            <div className="mb-2.5 flex items-center justify-between gap-3 text-[10px] text-muted-foreground border-b border-border/40 pb-1.5">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="font-semibold text-foreground">Vigilens AI</span>
                {message.metadata?.model_used && (
                  <span className="rounded bg-accent/60 px-1.5 py-0.2 font-mono text-[9px] text-muted-foreground">
                    {message.metadata.model_used}
                  </span>
                )}
                {responseFormat !== 'general' && (
                  <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.2 font-medium text-[9px] text-primary capitalize">
                    {responseFormat.replace('_', ' ')}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 font-mono text-[9px]">
                {message.metadata?.execution_time_ms !== undefined && (
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {message.metadata.execution_time_ms}ms
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleCopyAnswer}
                  className="hover:text-foreground transition-colors p-0.5"
                  title="Copy Answer"
                >
                  {copiedAnswer ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
                </button>
              </div>
            </div>

            {/* Primary Markdown Text Content */}
            <div className="prose prose-invert prose-xs max-w-none text-foreground leading-relaxed">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>

            {/* 1. EMPLOYEE ROSTER SPECIALIZED GRID */}
            {responseFormat === 'employee_roster' && personEntities.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-border/60">
                <div className="text-[11px] font-semibold text-foreground mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span>Staff Directory Roster ({personEntities.length} Enrolled)</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">Click card to view activity</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {personEntities.map((person, idx) => {
                    const photoUrl = person.photo_url || (person.photo_path ? getEmployeePhotoUrl(person.photo_path) : null);
                    const dwell = person.dwell_seconds ?? 0;
                    const dwellFormatted = person.dwell_formatted || `${dwell}s`;
                    const hasDetections = dwell > 0 || (person.cameras_visited && person.cameras_visited.length > 0);

                    return (
                      <div
                        key={idx}
                        onClick={() => onSelectEntity?.('person', person.id || person.label)}
                        className="group flex items-start gap-2.5 p-2 rounded-xl border border-border/80 bg-accent/20 hover:bg-accent/60 hover:border-primary/50 cursor-pointer transition-all text-xs"
                      >
                        <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-muted border border-border flex items-center justify-center">
                          {photoUrl ? (
                            <img
                              src={photoUrl}
                              alt={person.label}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <User className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div className="absolute top-0 right-0 bg-primary text-primary-foreground p-0.5 rounded-bl">
                            <ShieldCheck className="h-2.5 w-2.5" />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-foreground truncate flex items-center justify-between">
                            <span className="truncate group-hover:text-primary transition-colors">{person.label}</span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
                          </div>
                          
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                            <span className="font-mono text-primary bg-primary/10 px-1 rounded">
                              {person.employee_code || 'STAFF'}
                            </span>
                            <span>•</span>
                            <span className={hasDetections ? 'text-emerald-400 font-medium' : 'text-muted-foreground'}>
                              ⏱️ {dwellFormatted}
                            </span>
                          </div>

                          {person.cameras_visited && person.cameras_visited.length > 0 ? (
                            <div className="text-[9px] text-muted-foreground truncate mt-1 flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5 text-primary shrink-0" />
                              <span className="truncate">{person.cameras_visited.join(', ')}</span>
                            </div>
                          ) : (
                            <div className="text-[9px] text-muted-foreground italic mt-0.5">
                              0 active footage detections
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. SINGLE PERSON DOSSIER SPECIALIZED CARD */}
            {responseFormat === 'person_dossier' && personEntities.length === 1 && (
              <div className="mt-3 pt-2.5 border-t border-border/60">
                {(() => {
                  const person = personEntities[0];
                  const photoUrl = person.photo_url || (person.photo_path ? getEmployeePhotoUrl(person.photo_path) : null);
                  const isEmp = person.person_type === 'employee' || !!person.employee_code;
                  const dwell = person.dwell_seconds ?? 0;
                  const dwellFormatted = person.dwell_formatted || `${dwell}s`;

                  return (
                    <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-2.5">
                      <div className="flex items-start gap-3">
                        <div className="relative h-12 w-12 shrink-0 rounded-xl overflow-hidden bg-muted border border-border flex items-center justify-center shadow-xs">
                          {photoUrl ? (
                            <img
                              src={photoUrl}
                              alt={person.label}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <User className="h-6 w-6 text-muted-foreground" />
                          )}
                          {isEmp && (
                            <div className="absolute top-0 right-0 bg-primary text-primary-foreground p-0.5 rounded-bl">
                              <ShieldCheck className="h-3 w-3" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm text-foreground truncate">{person.label}</h4>
                            <button
                              type="button"
                              onClick={() => onSelectEntity?.('person', person.id || person.label)}
                              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-medium"
                            >
                              <span>Full Activity</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                            <span className="font-mono text-primary font-medium">
                              {isEmp ? (person.employee_code ? `STAFF • ${person.employee_code}` : 'STAFF') : 'VISITOR'}
                            </span>
                            {person.photo_path && (
                              <span className="text-emerald-400 font-medium">📸 Enrolled Photo</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Accounted Dwell Metrics Gauge */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-[11px]">
                        <div className="p-2 rounded-lg bg-background/60 border border-border/60">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Timer className="h-3 w-3 text-primary" /> Total Accounted Dwell
                          </span>
                          <span className="font-bold text-sm text-foreground block mt-0.5">
                            {dwellFormatted} <span className="text-[10px] text-muted-foreground font-normal">({dwell}s)</span>
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-background/60 border border-border/60">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-primary" /> Camera Stops
                          </span>
                          <span className="font-bold text-sm text-foreground block mt-0.5">
                            {person.cameras_visited?.length || 0} location(s)
                          </span>
                        </div>
                      </div>

                      {person.cameras_visited && person.cameras_visited.length > 0 && (
                        <div className="text-[10px] text-muted-foreground">
                          <span className="font-medium text-foreground">Locations Visited: </span>
                          <span>{person.cameras_visited.join(' • ')}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 3. DEFAULT IDENTIFIED PEOPLE CARDS (when not in roster mode) */}
            {responseFormat !== 'employee_roster' && responseFormat !== 'person_dossier' && personEntities.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-border/50">
                <div className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Footprints className="h-3 w-3 text-primary" />
                  <span>Identified People ({personEntities.length}):</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {personEntities.map((person, idx) => {
                    const photoUrl = person.photo_url || (person.photo_path ? getEmployeePhotoUrl(person.photo_path) : null);
                    const isEmp = person.person_type === 'employee' || !!person.employee_code;
                    const dwell = person.dwell_seconds ?? 0;
                    const dwellFormatted = person.dwell_formatted || `${dwell}s`;

                    return (
                      <div
                        key={idx}
                        onClick={() => onSelectEntity?.('person', person.id || person.label)}
                        className="flex items-center gap-2 p-1.5 rounded-lg border border-border bg-accent/20 hover:bg-accent/50 hover:border-primary/40 cursor-pointer transition-all text-[11px]"
                      >
                        <div className="relative h-8 w-8 shrink-0 rounded-lg overflow-hidden bg-muted border border-border flex items-center justify-center">
                          {photoUrl ? (
                            <img
                              src={photoUrl}
                              alt={person.label}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                          {isEmp && (
                            <div className="absolute top-0 right-0 bg-primary text-primary-foreground p-0.2 rounded-bl">
                              <ShieldCheck className="h-2 w-2" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-foreground truncate flex items-center justify-between">
                            <span className="truncate">{person.label}</span>
                            <ExternalLink className="h-2.5 w-2.5 text-muted-foreground shrink-0 ml-1" />
                          </div>
                          <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                            <span className={isEmp ? 'text-primary font-medium' : ''}>
                              {isEmp ? (person.employee_code ? `STAFF • ${person.employee_code}` : 'STAFF') : 'VISITOR'}
                            </span>
                            <span>•</span>
                            <span>{dwellFormatted}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Location / Camera Chips */}
            {locationEntities.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-border/40 flex flex-wrap items-center gap-1">
                <span className="text-[10px] text-muted-foreground mr-1">Locations:</span>
                {locationEntities.map((ent, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectEntity?.(ent.type, ent.id || ent.label)}
                    className="inline-flex items-center gap-1 rounded-md bg-accent/50 hover:bg-accent px-2 py-0.5 text-[10px] font-medium text-foreground transition-colors border border-border/60"
                  >
                    {ent.type === 'camera' ? <Camera className="h-2.5 w-2.5 text-primary" /> : <MapPin className="h-2.5 w-2.5 text-primary" />}
                    <span>{ent.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Minimal Collapsible SQL Drawer */}
            {message.metadata?.sql_query && (
              <div className="mt-2.5 pt-1.5 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setShowSql(!showSql)}
                  className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Code2 className="h-3 w-3 text-primary" />
                  <span>{showSql ? 'Hide SQL Query' : 'View SQL Query'}</span>
                  {showSql ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                </button>

                {showSql && (
                  <div className="mt-1.5 rounded-lg border border-border/80 bg-zinc-950 p-2.5 relative">
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="absolute top-1.5 right-1.5 rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-300 hover:bg-zinc-700 transition-colors"
                    >
                      {copiedSql ? 'Copied' : 'Copy'}
                    </button>
                    <pre className="font-mono text-[10px] text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed pr-12">
                      {message.metadata.sql_query}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Suggested Followups */}
            {message.metadata?.suggested_followups && message.metadata.suggested_followups.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-border/40 flex flex-wrap gap-1">
                {message.metadata.suggested_followups.map((followup, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectFollowup?.(followup)}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-accent/30 hover:bg-accent hover:border-primary/30 px-2.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-all"
                  >
                    <span>💬</span>
                    <span>{followup}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono ml-9.5 mt-1">
          {formattedTime}
        </span>
      </div>
    </div>
  );
}
