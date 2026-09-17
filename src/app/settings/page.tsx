'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sliders,
  RefreshCw,
  Search,
  Copy,
  Check,
  Server,
  Layers,
  Sparkles,
  Database,
  Eye,
  HardDrive,
  Activity,
  Cpu,
  Info,
  Terminal,
  ShieldCheck,
  Video,
  FileCode,
  Gauge,
  ScanFace,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchSystemSettings, SystemSettingsData, SettingItem } from '@/lib/api/settings';

export default function SettingsPage() {
  const [data, setData] = useState<SystemSettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showRawModal, setShowRawModal] = useState(false);
  const [rawCopied, setRawCopied] = useState(false);

  const loadSettings = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const result = await fetchSystemSettings();
      setData(result);
      if (isManual) {
        toast.success('Live parameters refreshed from backend');
      }
    } catch (error) {
      // Error handled by apiClient toast
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleCopy = (text: string, keyIdentifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyIdentifier);
    toast.success(`Copied ${keyIdentifier} to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyRawEnv = () => {
    if (!data?.raw_parameters) return;
    const envText = Object.entries(data.raw_parameters)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    navigator.clipboard.writeText(envText);
    setRawCopied(true);
    toast.success('All parameters copied as .env');
    setTimeout(() => setRawCopied(false), 2000);
  };

  // Filter categories and parameters
  const filteredCategories = useMemo(() => {
    if (!data?.categories) return [];

    return data.categories
      .filter((cat) => activeCategory === 'all' || cat.id === activeCategory)
      .map((cat) => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return cat;

        const filteredParams = cat.parameters.filter(
          (p) =>
            p.key.toLowerCase().includes(query) ||
            p.label.toLowerCase().includes(query) ||
            p.description.toLowerCase().includes(query) ||
            String(p.value).toLowerCase().includes(query) ||
            (p.unit && p.unit.toLowerCase().includes(query))
        );

        return {
          ...cat,
          parameters: filteredParams,
        };
      })
      .filter((cat) => cat.parameters.length > 0);
  }, [data, activeCategory, searchQuery]);

  const totalParamsCount = useMemo(() => {
    if (!data?.categories) return 0;
    return data.categories.reduce((acc, cat) => acc + cat.parameters.length, 0);
  }, [data]);

  const getCategoryIcon = (id: string) => {
    switch (id) {
      case 'cv_reid':
        return ScanFace;
      case 'pipeline':
        return Gauge;
      case 'database_storage':
        return Database;
      case 'sql_agent':
        return Sparkles;
      default:
        return Sliders;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Top Header */}
      <div className="border-b border-border bg-card/40 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/25 text-primary shadow-sm">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                    Backend & Engine Parameters
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Live Runtime
                    </span>
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Dynamic parameters queried directly from the backend environment (`.env`). Updated automatically upon container restart.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowRawModal(true)}
                disabled={isLoading || !data}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-card border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-sm"
              >
                <FileCode className="h-4 w-4 text-primary" />
                <span>View Raw .env</span>
              </button>

              <button
                onClick={() => loadSettings(true)}
                disabled={isLoading || isRefreshing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-sm shadow-primary/20 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh Config'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Dynamic Notice Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-5">
          <div className="flex items-start gap-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30">
              <Terminal className="h-4 w-4" />
            </div>
            <div className="flex-1 text-xs">
              <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
                Dynamic Configuration Lifecycle
              </h2>
              <p className="text-muted-foreground mt-1 leading-relaxed">
                All values shown below reflect active runtime parameters loaded from your backend environment. When you edit variables in <code className="bg-background/80 px-1.5 py-0.5 rounded border border-border text-primary font-mono text-[11px]">.env</code> and restart the backend container or process, this dashboard updates immediately with zero frontend rebuild required.
              </p>
              {data?.server_time && (
                <div className="mt-2.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5 text-emerald-400" />
                    Last Synced: <span className="font-mono text-foreground">{new Date(data.server_time).toLocaleTimeString()}</span>
                  </span>
                  <span className="text-border">•</span>
                  <span>
                    Environment: <span className="font-semibold uppercase text-primary">{data.environment}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Highlights Metrics Bar */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card border border-border rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                <ScanFace className="h-3.5 w-3.5 text-primary" />
                Face Match Threshold
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-foreground">
                  {data.raw_parameters.ADVANCED_FACE_SIMILARITY_THRESHOLD ?? '0.32'}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-mono">ArcFace Cosine</span>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                ReID Match Threshold
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-foreground">
                  {data.raw_parameters.ADVANCED_REID_SIMILARITY_THRESHOLD ?? '0.72'}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-mono">OSNet Cosine</span>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5 text-amber-400" />
                Smart Sampling Rate
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-foreground">
                  {data.raw_parameters.PROCESSING_FPS ?? '7.5'}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-mono">
                  {data.raw_parameters.PROCESS_EVERY_FRAME ? 'Native FPS' : 'FPS Sampling'}
                </span>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-purple-400" />
                PostgreSQL Database
              </span>
              <div className="mt-2 flex items-baseline gap-1.5 truncate">
                <span className="text-base font-bold font-mono text-foreground truncate">
                  {data.raw_parameters.POSTGRES_DB ?? 'cv_db'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border rounded-2xl p-2.5">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              All ({totalParamsCount})
            </button>
            {data?.categories.map((cat) => {
              const Icon = getCategoryIcon(cat.id);
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{cat.name.split('&')[0].trim()}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {cat.parameters.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search parameter or key..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border rounded-xl pl-9 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Loading State Skeleton */}
        {isLoading && (
          <div className="space-y-6 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <div className="h-5 w-48 bg-muted rounded"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-28 bg-muted/60 rounded-xl"></div>
                  <div className="h-28 bg-muted/60 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Parameters Categories & Cards */}
        {!isLoading && filteredCategories.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <Sliders className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <h3 className="text-sm font-semibold text-foreground">No parameters matched</h3>
            <p className="text-xs text-muted-foreground mt-1">Try clearing your search query or selecting another category.</p>
          </div>
        )}

        {!isLoading &&
          filteredCategories.map((category) => {
            const CategoryIcon = getCategoryIcon(category.id);
            return (
              <div
                key={category.id}
                className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4"
              >
                {/* Category Header */}
                <div className="flex items-start justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                      <CategoryIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-foreground tracking-tight">{category.name}</h2>
                      <p className="text-[11px] text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground bg-secondary px-2.5 py-1 rounded-lg border border-border">
                    {category.parameters.length} parameter{category.parameters.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Parameters Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                  {category.parameters.map((param) => {
                    const isCopied = copiedKey === param.key;
                    return (
                      <div
                        key={param.key}
                        className="group bg-background/60 hover:bg-background border border-border/80 hover:border-primary/40 rounded-xl p-4 transition-all flex flex-col justify-between gap-3 shadow-sm hover:shadow-md"
                      >
                        <div>
                          {/* Parameter Top Row: Friendly Label & Value Badge */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                {param.label}
                              </h3>
                              {/* Copyable ENV Key */}
                              <div className="mt-1 flex items-center gap-1.5">
                                <button
                                  onClick={() => handleCopy(param.key, param.key)}
                                  className="inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline group-hover:text-primary/90 cursor-pointer bg-primary/5 px-2 py-0.5 rounded border border-primary/20"
                                  title="Click to copy environment variable key"
                                >
                                  {param.key}
                                  {isCopied ? (
                                    <Check className="h-3 w-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Value Display Badge */}
                            <div className="shrink-0 flex items-center">
                              {param.type === 'boolean' ? (
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold font-mono uppercase border ${
                                    param.value
                                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                      : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      param.value ? 'bg-emerald-400' : 'bg-zinc-400'
                                    }`}
                                  ></span>
                                  {param.value ? 'TRUE' : 'FALSE'}
                                </span>
                              ) : param.type === 'number' ? (
                                <span className="inline-flex items-baseline gap-1 px-3 py-1 rounded-lg bg-card border border-border text-foreground font-mono font-bold text-sm shadow-inner">
                                  {param.value}
                                  {param.unit && (
                                    <span className="text-[10px] font-normal text-muted-foreground uppercase font-sans">
                                      {param.unit}
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-secondary border border-border text-foreground font-mono text-xs font-medium max-w-[180px] truncate">
                                  {String(param.value)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-[11px] text-muted-foreground mt-2.5 leading-relaxed">
                            {param.description}
                          </p>
                        </div>

                        {/* Card Footer: Recommended Range / Optimal Notes */}
                        {param.recommended_range && (
                          <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1 font-medium">
                              <Info className="h-3 w-3 text-primary/70" />
                              Recommended Range:
                            </span>
                            <span className="font-mono text-foreground/80 bg-secondary/80 px-1.5 py-0.5 rounded border border-border/60">
                              {param.recommended_range}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>

      {/* Raw .env Inspection Modal */}
      {showRawModal && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-card/80">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                  <FileCode className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Active Environment Variables (.env)</h3>
                  <p className="text-[11px] text-muted-foreground">Live key-value pairs active on the backend container</p>
                </div>
              </div>
              <button
                onClick={() => setShowRawModal(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Code Content */}
            <div className="p-4 overflow-y-auto bg-background/80 font-mono text-xs text-foreground/90 space-y-1 select-all border-y border-border">
              {Object.entries(data.raw_parameters).map(([key, val]) => (
                <div key={key} className="flex items-start gap-1 py-0.5 hover:bg-secondary/40 px-2 rounded">
                  <span className="text-primary font-semibold">{key}</span>
                  <span className="text-muted-foreground">=</span>
                  <span className="text-emerald-400 font-mono">{String(val)}</span>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex items-center justify-between bg-card/80">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Loaded from <code className="text-foreground">configs/base.py</code>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyRawEnv}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
                >
                  {rawCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{rawCopied ? 'Copied All!' : 'Copy .env Syntax'}</span>
                </button>
                <button
                  onClick={() => setShowRawModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
