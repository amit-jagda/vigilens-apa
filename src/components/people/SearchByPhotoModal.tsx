'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  Search,
  Loader2,
  Sparkles,
  User,
  Sliders,
  Play,
  Clock,
  Video,
  MapPin,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { searchByPhoto } from '@/lib/api/advancedpeopleanalytics';
import { getMediaCropUrl } from '@/lib/apiClient';
import type {
  PhotoSearchResponse,
  PhotoSearchMatchItem,
  PhotoSearchAppearanceItem,
} from '@/types/advancedpeopleanalytics';
import Link from 'next/link';

interface SearchByPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSeekToMoment?: (sessionId: string, offsetSeconds: number) => void;
}

export function SearchByPhotoModal({
  isOpen,
  onClose,
  onSeekToMoment,
}: SearchByPhotoModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<number>(0.55);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PhotoSearchResponse | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<PhotoSearchMatchItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.type.startsWith('image/')) {
        toast.error('Please upload a valid image file (JPG, PNG, WebP).');
        return;
      }
      setFile(selected);
      const url = URL.createObjectURL(selected);
      setPreviewUrl(url);
      setSearchResults(null);
      setSelectedMatch(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type.startsWith('image/')) {
      setFile(dropped);
      const url = URL.createObjectURL(dropped);
      setPreviewUrl(url);
      setSearchResults(null);
      setSelectedMatch(null);
    } else {
      toast.error('Please drop an image file.');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleReset = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSearchResults(null);
    setSelectedMatch(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const executeSearch = async () => {
    if (!file) {
      toast.error('Please select or drop a photo to search.');
      return;
    }

    setIsSearching(true);
    try {
      const res = await searchByPhoto(file, threshold, 20);
      if (res.data) {
        setSearchResults(res.data);
        if (res.data.matches && res.data.matches.length > 0) {
          setSelectedMatch(res.data.matches[0]);
          toast.success(`Found ${res.data.total_matches_found} matching identity result(s)!`);
        } else {
          toast('No matching persons found matching the similarity threshold.', {
            icon: '🔍',
          });
        }
      } else {
        toast.error(res.message || 'Failed to complete photo search');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during search');
    } finally {
      setIsSearching(false);
    }
  };

  const getMatchedViaBadge = (matchedVia: string) => {
    switch (matchedVia) {
      case 'face':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Sparkles className="w-3 h-3" /> Face Vector
          </span>
        );
      case 'appearance':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3 h-3" /> Body ReID
          </span>
        );
      case 'face+reid':
      case 'fusion':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Sparkles className="w-3 h-3" /> Fusion (Face + ReID)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-slate-500/10 text-slate-300 border border-slate-500/20">
            {matchedVia}
          </span>
        );
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 0.65) return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
    return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  };

  const formatTimestamp = (ts?: string) => {
    if (!ts) return 'Unknown Time';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return ts;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-slate-900/95 border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400 shadow-inner">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100 tracking-tight">
                  Search by Photo / Reference Image
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  AI Vector DB
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload a portrait or full-body picture to instantly locate appearances across all video sessions & cameras.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Panel: Uploader & Search Controls */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-950/40 p-5 rounded-xl border border-slate-800/60">
            {/* Image Dropzone / Preview */}
            <div className="md:col-span-5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {previewUrl ? (
                <div className="relative group w-full h-52 rounded-xl overflow-hidden border border-indigo-500/40 bg-black/60 shadow-lg flex items-center justify-center">
                  <img
                    src={previewUrl}
                    alt="Query Reference"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600/90 text-white text-xs font-semibold hover:bg-indigo-500 flex items-center gap-1.5 shadow"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Change Photo
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-3 py-1.5 rounded-lg bg-red-600/90 text-white text-xs font-semibold hover:bg-red-500 flex items-center gap-1.5 shadow"
                    >
                      <X className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-52 border-2 border-dashed border-slate-700/80 hover:border-indigo-500/60 bg-slate-900/40 hover:bg-indigo-950/10 rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition group"
                >
                  <div className="p-3 rounded-full bg-slate-800/80 text-slate-400 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition mb-3">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-200 group-hover:text-indigo-300 transition">
                    Click or drag reference image here
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports JPG, PNG, WebP (Face crop or full-body)
                  </p>
                </div>
              )}
            </div>

            {/* Search Configuration & Action */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Match Sensitivity Threshold
                  </label>
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {Math.round(threshold * 100)}% ({threshold.toFixed(2)})
                  </span>
                </div>
                <input
                  type="range"
                  min="0.40"
                  max="0.85"
                  step="0.01"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>0.40 (Broad ReID)</span>
                  <span>0.55 (Balanced)</span>
                  <span>0.75+ (High Precision Face)</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-400 space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-300 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Multi-Modal Search Pipeline:
                  </div>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 border border-slate-700">
                      ✓ InsightFace 512-d Face Embedding
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 border border-slate-700">
                      ✓ ResNet-18 512-d Body ReID
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  disabled={!file || isSearching}
                  onClick={executeSearch}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Vectorizing & Searching DB...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" /> Search Vector Database
                    </>
                  )}
                </button>
                {searchResults && (
                  <button
                    onClick={handleReset}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results Area */}
          {searchResults && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-200">
                    Search Results ({searchResults.total_matches_found})
                  </h3>
                  {searchResults.face_detected_in_query && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Face Detected in Query
                    </span>
                  )}
                  {searchResults.appearance_extracted && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Body ReID Extracted
                    </span>
                  )}
                </div>
              </div>

              {searchResults.matches.length === 0 ? (
                <div className="p-12 text-center rounded-xl bg-slate-950/30 border border-slate-800/80">
                  <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-300">
                    No individuals matched this image above {Math.round(threshold * 100)}% similarity.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Try reducing the sensitivity threshold or uploading a clearer frontal photo.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Matched People List */}
                  <div className="lg:col-span-5 space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {searchResults.matches.map((match) => {
                      const isSelected = selectedMatch?.identity_id === match.identity_id;
                      return (
                        <div
                          key={`${match.identity_type}-${match.identity_id}`}
                          onClick={() => setSelectedMatch(match)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition ${
                            isSelected
                              ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-500/10'
                              : 'bg-slate-900/60 hover:bg-slate-850 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-slate-800 overflow-hidden border border-slate-700 flex-shrink-0 flex items-center justify-center">
                              {match.primary_photo_url ? (
                                <img
                                  src={getMediaCropUrl(match.primary_photo_url)}
                                  alt={match.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <User className="w-6 h-6 text-slate-500" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold text-slate-100 truncate">
                                  {match.name}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${getScoreColor(
                                    match.similarity_score
                                  )}`}
                                >
                                  {match.similarity_percentage}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 mt-1">
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-medium uppercase tracking-wider ${
                                    match.identity_type === 'employee'
                                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                  }`}
                                >
                                  {match.identity_type}
                                </span>
                                {match.code && (
                                  <span className="text-[10px] font-mono text-slate-400">
                                    #{match.code}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/60 text-[11px] text-slate-400">
                                <span>{match.total_appearances} Moment(s)</span>
                                {getMatchedViaBadge(match.matched_via)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Column: Selected Person Timeline & Jump-to-Video Moments */}
                  <div className="lg:col-span-7 bg-slate-950/50 rounded-xl border border-slate-800/80 p-4 flex flex-col justify-between">
                    {selectedMatch ? (
                      <div className="space-y-4">
                        {/* Selected Person Header Card */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-xl bg-slate-800 overflow-hidden border border-indigo-500/40 shadow">
                              {selectedMatch.primary_photo_url ? (
                                <img
                                  src={getMediaCropUrl(selectedMatch.primary_photo_url)}
                                  alt={selectedMatch.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-500">
                                  <User className="w-7 h-7" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-base font-bold text-slate-100">
                                  {selectedMatch.name}
                                </h4>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getScoreColor(
                                    selectedMatch.similarity_score
                                  )}`}
                                >
                                  {selectedMatch.similarity_percentage} Match
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                                <span className="capitalize">{selectedMatch.identity_type}</span>
                                {selectedMatch.code && <span>• Code: {selectedMatch.code}</span>}
                              </div>
                            </div>
                          </div>

                          <Link
                            href={`/people/${selectedMatch.identity_id}?type=${selectedMatch.identity_type}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 text-xs font-semibold border border-slate-700 transition"
                          >
                            <span>Full Profile</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>

                        {/* Appearance Moments / Seeking Chips */}
                        <div>
                          <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                            <Video className="w-3.5 h-3.5 text-indigo-400" /> Video Appearance Moments & Timestamps
                          </h5>

                          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                            {selectedMatch.timeline_events.length === 0 ? (
                              <p className="text-xs text-slate-500 py-4 text-center">
                                No video appearances recorded yet for this identity.
                              </p>
                            ) : (
                              selectedMatch.timeline_events.map((event, idx) => {
                                return (
                                  <div
                                    key={idx}
                                    className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 group transition"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      {event.crop_url ? (
                                        <img
                                          src={getMediaCropUrl(event.crop_url)}
                                          alt="Crop"
                                          className="w-9 h-9 rounded object-cover border border-slate-700"
                                          onError={(e) => {
                                            (e.target as HTMLElement).style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <div className="w-9 h-9 rounded bg-slate-800 flex items-center justify-center text-slate-500">
                                          <Video className="w-4 h-4" />
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-xs font-bold text-slate-200 truncate">
                                            {event.camera_name}
                                          </span>
                                          {event.zone_name && (
                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                                              {event.zone_name}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                          <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-slate-500" />
                                            {formatTimestamp(event.timestamp)}
                                          </span>
                                          {event.dwell_seconds ? (
                                            <span>• Dwell: {Math.round(event.dwell_seconds)}s</span>
                                          ) : null}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Jump to Video Seek Button */}
                                    {event.session_id && onSeekToMoment && (
                                      <button
                                        onClick={() => {
                                          onSeekToMoment(
                                            event.session_id!,
                                            event.timestamp_offset_seconds || 0
                                          );
                                          toast.success(
                                            `Seeking video to ${event.camera_name} at offset ${event.timestamp_offset_seconds || 0}s`
                                          );
                                          onClose();
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-semibold border border-indigo-500/30 transition shadow"
                                      >
                                        <Play className="w-3 h-3 fill-current" />
                                        <span>Jump to Video</span>
                                      </button>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
                        <User className="w-10 h-10 mb-2 opacity-40" />
                        <p className="text-xs font-medium">Select a person match on the left to view appearance timeline</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-400">
          <span>
            Powered by InsightFace Buffalo_L & PyTorch ReID embeddings (512-dim PGVector)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
