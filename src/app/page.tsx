'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Upload,
  Play,
  CheckCircle,
  Clock,
  Users,
  UserCheck,
  UserPlus,
  TrendingUp,
  Activity,
  Layers,
  Sliders,
  Camera,
  MapPin,
  RefreshCw,
  Video,
  ArrowRight,
  ArrowLeftRight,
  ShieldCheck,
  Calendar,
  Search,
  Plus,
  Check,
  X,
  Trash2,
  FileVideo,
  GitFork,
  Route,
  Sparkles,
  User,
  Eye,
  UserCheck2,
  Edit3,
  History,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Timer,
  Navigation,
  Footprints,
  AlertTriangle,
} from 'lucide-react';

import { LineDrawingCanvas } from '@/components/LineDrawingCanvas';
import { CameraTopologyGraph } from '@/components/CameraTopologyGraph';
import {
  createCameraNode,
  updateCameraNode,
  listCameraNodes,
  deleteCameraNode,
  createCameraNodeLink,
  listCameraNodeLinks,
  deleteCameraNodeLink,
  processBatchSessions,
  listAnalyticsSessions,
  getSessionDetails,
  getSessionDetectedPeople,
  getAnnotatedVideoUrl,
  listPeopleDirectory,
  getPersonTimeline,
  registerOrUpdateVisitor,
  addPersonFromFacePhoto,
  triggerCrossCameraAssociation,
  resetAnalyticsData,
  deleteAdvancedSession,
} from '@/lib/api/advancedpeopleanalytics';
import { uploadGalleryMedia, listGalleryMedia, getGalleryMediaUrl } from '@/lib/api/gallery';
import { getMediaCropUrl } from '@/lib/apiClient';
import type { GalleryMedia } from '@/types/gallery';
import type {
  CameraNode,
  CameraNodeLink,
  AdvancedAnalyticsSession,
  SessionDetectedPerson,
  PersonSummaryItem,
  PersonTimelineResponse,
  TimelineEventItem,
} from '@/types/advancedpeopleanalytics';

function VigilensAPAMainContent() {
  const searchParams = useSearchParams();
  const initialSessionId = searchParams.get('sessionId');

  // Top-level Navigation Mode: 'analytics' | 'people' | 'history'
  const [mainTab, setMainTab] = useState<'analytics' | 'people' | 'history'>('analytics');
  const [selectedPersonForJourney, setSelectedPersonForJourney] = useState<PersonSummaryItem | null>(null);
  const [selectedJourneyDate, setSelectedJourneyDate] = useState<string>('all');

  // Stepper Sub-tabs for Video Analytics: 1 (Topology & Setup) | 2 (Processing) | 3 (Dashboard Stream / Results)
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // Video Source & Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedVideos, setUploadedVideos] = useState<GalleryMedia[]>([]);
  const [selectedUploadedVideo, setSelectedUploadedVideo] = useState<GalleryMedia | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Camera Node & Topology State
  const [cameraNodes, setCameraNodes] = useState<CameraNode[]>([]);
  const [cameraLinks, setCameraLinks] = useState<CameraNodeLink[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isCreatingCamera, setIsCreatingCamera] = useState(false);
  const [newCameraName, setNewCameraName] = useState('');
  const [newCameraLabel, setNewCameraLabel] = useState('');
  const [newCameraIsEntryPoint, setNewCameraIsEntryPoint] = useState(false);
  const [topologyViewMode, setTopologyViewMode] = useState<'graph' | 'list'>('graph');
  const cameraCarouselRef = React.useRef<HTMLDivElement>(null);

  const scrollCameraCarousel = (direction: 'left' | 'right') => {
    if (cameraCarouselRef.current) {
      const scrollAmount = 260;
      cameraCarouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Camera Link Modal State
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [linkFromCameraId, setLinkFromCameraId] = useState('');
  const [linkToCameraId, setLinkToCameraId] = useState('');
  const [linkMinTransit, setLinkMinTransit] = useState<number>(5);
  const [linkAvgTransit, setLinkAvgTransit] = useState<number>(30);
  const [linkMaxTransit, setLinkMaxTransit] = useState<number>(120);
  const [linkBidirectional, setLinkBidirectional] = useState(true);

  // Line Crossing Vector State (Optional gate counter)
  const [lineStart, setLineStart] = useState<[number, number]>([100, 300]);
  const [lineEnd, setLineEnd] = useState<[number, number]>([500, 300]);
  const [lineDrawnConfirmed, setLineDrawnConfirmed] = useState(false);
  const [showLineCanvas, setShowLineCanvas] = useState(false);

  // Thresholds & Feature Toggles
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.60);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.30);
  const [trackEmployees, setTrackEmployees] = useState(true);
  const [registerNewVisitors, setRegisterNewVisitors] = useState(true);
  const [trackRepeatVisitors, setTrackRepeatVisitors] = useState(true);
  const [lineCrossingAnalysis, setLineCrossingAnalysis] = useState(true);
  const [trackOccupancy, setTrackOccupancy] = useState(true);

  // Processing & Polling State
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<AdvancedAnalyticsSession | null>(null);
  const [detectedPeople, setDetectedPeople] = useState<SessionDetectedPerson[]>([]);
  const [isLoadingPeople, setIsLoadingPeople] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAssociating, setIsAssociating] = useState(false);

  // Past Sessions History State
  const [pastSessions, setPastSessions] = useState<AdvancedAnalyticsSession[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<AdvancedAnalyticsSession | null>(null);

  // Camera To Delete & Edit Modals
  const [cameraToDelete, setCameraToDelete] = useState<CameraNode | null>(null);
  const [isDeletingCamera, setIsDeletingCamera] = useState(false);
  const [editingCamera, setEditingCamera] = useState<CameraNode | null>(null);
  const [editCameraName, setEditCameraName] = useState('');
  const [editCameraLabel, setEditCameraLabel] = useState('');
  const [isUpdatingCamera, setIsUpdatingCamera] = useState(false);

  // Clear / Reset All Analytics Data State
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // People Directory View State
  const [directoryDate, setDirectoryDate] = useState<string>('');
  const [directoryRoleFilter, setDirectoryRoleFilter] = useState<'all' | 'employee' | 'visitor'>('all');
  const [directorySearch, setDirectorySearch] = useState<string>('');
  const [directoryList, setDirectoryList] = useState<PersonSummaryItem[]>([]);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState<boolean>(false);

  // Person Registration & Enrollment Modals
  const [isEnrollingPerson, setIsEnrollingPerson] = useState(false);
  const [enrollFaceFile, setEnrollFaceFile] = useState<File | null>(null);
  const [enrollFirstName, setEnrollFirstName] = useState('');
  const [enrollLastName, setEnrollLastName] = useState('');
  const [enrollRole, setEnrollRole] = useState<'visitor' | 'employee'>('visitor');
  const [enrollEmployeeCode, setEnrollEmployeeCode] = useState('');
  const [isEnrollingSubmitting, setIsEnrollingSubmitting] = useState(false);

  // Person Journey Timeline State
  const [journeyTimelineData, setJourneyTimelineData] = useState<PersonTimelineResponse | null>(null);
  const [isLoadingJourneyTimeline, setIsLoadingJourneyTimeline] = useState(false);

  const formatDwellTime = (totalSeconds: number) => {
    const secs = Math.round(totalSeconds);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    if (mins < 60) return `${mins}m ${remSecs > 0 ? `${remSecs}s` : ''}`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins > 0 ? `${remMins}m` : ''}`;
  };

  // Load initial camera and recent video data
  const fetchTopologyData = async () => {
    try {
      const [cRes, lRes, uRes] = await Promise.all([
        listCameraNodes(),
        listCameraNodeLinks(),
        listGalleryMedia('video'),
      ]);
      if (cRes?.data) setCameraNodes(cRes.data);
      if (lRes?.data) setCameraLinks(lRes.data);
      if (uRes?.data) setUploadedVideos(uRes.data);
      if (cRes?.data && cRes.data.length > 0 && !selectedCameraId) {
        setSelectedCameraId(cRes.data[0].id);
      }
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    fetchTopologyData();
  }, []);

  // Fetch People Directory
  const fetchPeopleDirectory = () => {
    setIsLoadingDirectory(true);
    listPeopleDirectory({
      date: directoryDate || undefined,
      person_type: directoryRoleFilter === 'all' ? undefined : directoryRoleFilter,
      search: directorySearch.trim() || undefined,
    })
      .then((res) => {
        if (res?.data) {
          setDirectoryList(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load people directory:', err);
      })
      .finally(() => {
        setIsLoadingDirectory(false);
      });
  };

  useEffect(() => {
    if (mainTab === 'people') {
      fetchPeopleDirectory();
    }
  }, [mainTab, directoryDate, directoryRoleFilter, directorySearch]);

  // Fetch History Sessions
  const fetchHistorySessions = () => {
    setIsLoadingHistory(true);
    listAnalyticsSessions()
      .then((res) => {
        if (res?.data) {
          setPastSessions(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load sessions:', err);
      })
      .finally(() => {
        setIsLoadingHistory(false);
      });
  };

  useEffect(() => {
    if (mainTab === 'history') {
      fetchHistorySessions();
    }
  }, [mainTab]);

  // Load Session from URL Query Parameter (e.g., from History page "View Dashboard" button)
  useEffect(() => {
    if (initialSessionId) {
      setActiveSessionId(initialSessionId);
      setActiveStep(3);
      getSessionDetails(initialSessionId)
        .then((res) => {
          if (res?.data) {
            setSessionData(res.data);
            fetchDetectedPeople(initialSessionId);
            toast.success(`Loaded session: ${res.data.video_name}`);
          }
        })
        .catch(() => {
          toast.error('Failed to load session details');
        });
    }
  }, [initialSessionId]);

  // Select existing uploaded video from gallery
  const handleSelectUploadedVideo = (vid: GalleryMedia) => {
    setSelectedFile(null);
    setSelectedUploadedVideo(vid);
    const mediaPath = vid.file_path || (vid as any).filepath || '';
    setVideoPreviewUrl(mediaPath ? getGalleryMediaUrl(mediaPath) : '');
    toast.success(`Selected '${vid.original_filename || (vid as any).filename}'`);
  };

  // Video Drag & Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('video/'));
    if (files.length === 0) {
      toast.error('Please drop a valid video file (.mp4, .avi, .mov)');
      return;
    }
    const file = files[0];
    setSelectedUploadedVideo(null);
    setSelectedFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
    toast.success(`Loaded video: ${file.name}`);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setSelectedUploadedVideo(null);
    setSelectedFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
    toast.success(`Selected video: ${file.name}`);
  };

  // Create Camera Node
  const handleCreateCamera = async () => {
    if (!newCameraName.trim()) {
      toast.error('Please enter a camera name (e.g. Workspace, Cafeteria, Reception)');
      return;
    }
    const labelValue = newCameraLabel.trim() || undefined;
    try {
      const res = await createCameraNode({
        name: newCameraName.trim(),
        location_label: labelValue,
        location_desc: labelValue,
        is_entry_point: newCameraIsEntryPoint,
      });
      if (res?.data) {
        toast.success(`Created camera: ${res.data.name}`);
        setCameraNodes((prev) => [res.data, ...prev]);
        setSelectedCameraId(res.data.id);
        setIsCreatingCamera(false);
        setNewCameraName('');
        setNewCameraLabel('');
        setNewCameraIsEntryPoint(false);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create camera');
    }
  };

  // Update Camera Node (Name / Location Label)
  const handleUpdateCamera = async () => {
    if (!editingCamera) return;
    if (!editCameraName.trim()) {
      toast.error('Please enter a camera name');
      return;
    }
    const labelValue = editCameraLabel.trim() || undefined;
    setIsUpdatingCamera(true);
    try {
      const res = await updateCameraNode(editingCamera.id, {
        name: editCameraName.trim(),
        location_label: labelValue,
      });
      if (res?.data) {
        toast.success(`Updated camera: ${res.data.name}`);
        setCameraNodes((prev) =>
          prev.map((c) => (c.id === editingCamera.id ? res.data : c))
        );
        setEditingCamera(null);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update camera');
    } finally {
      setIsUpdatingCamera(false);
    }
  };

  // Delete Camera Node (API Integrated)
  const handleDeleteCamera = async () => {
    if (!cameraToDelete) return;
    setIsDeletingCamera(true);
    try {
      await deleteCameraNode(cameraToDelete.id);
      setCameraNodes((prev) => prev.filter((c) => c.id !== cameraToDelete.id));
      setCameraLinks((prev) =>
        prev.filter((l) => l.from_camera_id !== cameraToDelete.id && l.to_camera_id !== cameraToDelete.id)
      );
      if (selectedCameraId === cameraToDelete.id) {
        setSelectedCameraId('');
      }
      toast.success(`Camera "${cameraToDelete.name}" deleted successfully`);
      setCameraToDelete(null);
    } catch (err: any) {
      toast.error('Failed to delete camera');
    } finally {
      setIsDeletingCamera(false);
    }
  };

  // Create Camera Connection Link
  const handleCreateCameraLink = async () => {
    if (!linkFromCameraId || !linkToCameraId) {
      toast.error('Please select both Origin and Destination cameras.');
      return;
    }
    if (linkFromCameraId === linkToCameraId) {
      toast.error('Origin and Destination cameras must be different.');
      return;
    }
    try {
      const res = await createCameraNodeLink({
        from_camera_id: linkFromCameraId,
        to_camera_id: linkToCameraId,
        min_transit_time_seconds: linkMinTransit,
        avg_transit_time_seconds: linkAvgTransit,
        max_transit_time_seconds: linkMaxTransit,
        is_bidirectional: linkBidirectional,
      });
      if (res?.data) {
        toast.success(
          linkBidirectional
            ? 'Created two-way (bidirectional) camera link!'
            : 'Created camera link!'
        );
        setIsCreatingLink(false);
        setCameraLinks((prev) => [...prev, res.data]);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create camera link');
    }
  };

  // Delete Camera Link
  const handleDeleteCameraLink = async (linkId: string) => {
    try {
      const targetLink = cameraLinks.find((l) => l.id === linkId);
      await deleteCameraNodeLink(linkId);
      toast.success('Removed camera connection');
      if (targetLink) {
        setCameraLinks((prev) =>
          prev.filter(
            (l) =>
              l.id !== linkId &&
              !(
                l.from_camera_id === targetLink.to_camera_id &&
                l.to_camera_id === targetLink.from_camera_id
              )
          )
        );
      } else {
        setCameraLinks((prev) => prev.filter((l) => l.id !== linkId));
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete link');
    }
  };

  // Launch Video Processing Session
  const handleLaunchAnalysis = async (customLineStart?: [number, number], customLineEnd?: [number, number]) => {
    if (!selectedFile && !selectedUploadedVideo) {
      toast.error('Please select or drop a CCTV video footage clip.');
      return;
    }

    // If doorway line crossing is enabled and user hasn't confirmed a line yet, prompt line drawing canvas
    if (lineCrossingAnalysis && !lineDrawnConfirmed && !customLineStart && !showLineCanvas) {
      setShowLineCanvas(true);
      return;
    }

    const effectiveLineStart = customLineStart || (lineDrawnConfirmed ? lineStart : undefined);
    const effectiveLineEnd = customLineEnd || (lineDrawnConfirmed ? lineEnd : undefined);

    setIsSubmitting(true);
    try {
      let mediaId = selectedUploadedVideo?.id;
      let videoPath = selectedUploadedVideo?.file_path || (selectedUploadedVideo as any)?.filepath;

      if (!mediaId && selectedFile) {
        // 1. Upload video file to gallery (/gallery/media)
        const uploadToastId = toast.loading('Uploading CCTV video footage to server...');
        const uploadRes = await uploadGalleryMedia([selectedFile], 'video');
        toast.dismiss(uploadToastId);

        const uploadedMedia = uploadRes?.data?.[0];
        if (!uploadedMedia?.id) {
          toast.error('Failed to upload video media to server.');
          setIsSubmitting(false);
          return;
        }
        mediaId = uploadedMedia.id;
        videoPath = uploadedMedia.file_path || (uploadedMedia as any).filepath;
        setUploadedVideos((prev) => [uploadedMedia, ...prev.filter((v) => v.id !== uploadedMedia.id)]);
      }

      const effectiveCamId = selectedCameraId || (cameraNodes.length > 0 ? cameraNodes[0].id : undefined);
      const selectedCam = cameraNodes.find((c) => c.id === effectiveCamId);

      // 2. Queue video analysis session with gallery_media_id, direct_video_path, line_start, line_end
      const res = await processBatchSessions({
        videos: [
          {
            gallery_media_id: mediaId,
            direct_video_path: videoPath,
            camera_id: effectiveCamId,
            camera_name: selectedCam?.name || 'Main Camera',
            video_source_type: 'upload',
            line_start: lineCrossingAnalysis ? effectiveLineStart : undefined,
            line_end: lineCrossingAnalysis ? effectiveLineEnd : undefined,
          },
        ],
        global_line_start: lineCrossingAnalysis ? effectiveLineStart : undefined,
        global_line_end: lineCrossingAnalysis ? effectiveLineEnd : undefined,
        similarity_threshold: similarityThreshold,
        confidence_threshold: confidenceThreshold,
        track_employees: trackEmployees,
        register_new_visitors: registerNewVisitors,
        track_repeat_visitors: trackRepeatVisitors,
        line_crossing_analysis: lineCrossingAnalysis,
        track_occupancy: trackOccupancy,
      });

      if (res?.data && res.data.length > 0) {
        const session = res.data[0];
        setActiveSessionId(session.id);
        setSessionData(session);
        setActiveStep(2);
        setShowLineCanvas(false);
        toast.success('Video processing session queued!');
      } else {
        toast.error('Failed to initiate processing session');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Processing failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Polling for active session in Step 2
  useEffect(() => {
    if (!activeSessionId || activeStep !== 2) return;

    const interval = setInterval(async () => {
      try {
        const res = await getSessionDetails(activeSessionId);
        if (res?.data) {
          setSessionData(res.data);
          const currentStatus = (res.data.status || '').toUpperCase();
          if (currentStatus === 'COMPLETED') {
            toast.success('Video processing completed!');
            setActiveStep(3);
            fetchDetectedPeople(activeSessionId);
            clearInterval(interval);
          } else if (currentStatus === 'FAILED') {
            toast.error(res.data.error_message || 'Video processing failed');
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [activeSessionId, activeStep]);

  const fetchDetectedPeople = async (sessionId: string) => {
    setIsLoadingPeople(true);
    try {
      const res = await getSessionDetectedPeople(sessionId);
      if (res?.data) {
        setDetectedPeople(res.data);
      }
    } catch (err) {
      console.error('Failed to load detected people:', err);
    } finally {
      setIsLoadingPeople(false);
    }
  };

  // Load Past Session into Results Dashboard
  const handleSelectPastSession = (session: AdvancedAnalyticsSession) => {
    setActiveSessionId(session.id);
    setSessionData(session);
    setActiveStep(3);
    fetchDetectedPeople(session.id);
    setMainTab('analytics');
    toast.success(`Loaded session "${session.video_name}"`);
  };

  // Delete Session
  const handleDeletePastSession = async () => {
    if (!sessionToDelete) return;
    const sessionId = sessionToDelete.id;
    setDeletingSessionId(sessionId);
    try {
      await deleteAdvancedSession(sessionId);
      setPastSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setSessionToDelete(null);
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setSessionData(null);
        setDetectedPeople([]);
        setActiveStep(1);
      }
      toast.success('Session deleted');
    } catch (err: any) {
      toast.error('Failed to delete session');
    } finally {
      setDeletingSessionId(null);
    }
  };

  // Global Reset / Clear Data
  const handleResetAllData = async () => {
    setIsResetting(true);
    try {
      await resetAnalyticsData();
      setPastSessions([]);
      setDirectoryList([]);
      setActiveSessionId(null);
      setSessionData(null);
      setDetectedPeople([]);
      setActiveStep(1);
      setIsResetConfirmOpen(false);
      toast.success('All analytics data cleared successfully');
    } catch {
      toast.error('Failed to reset analytics data');
    } finally {
      setIsResetting(false);
    }
  };

  // Person Journey Timeline
  const handleOpenPersonJourney = async (person: PersonSummaryItem, specificDate?: string) => {
    setSelectedPersonForJourney(person);
    setSelectedJourneyDate(specificDate || 'all');
    setIsLoadingJourneyTimeline(true);
    try {
      const targetDate = specificDate || (directoryDate ? directoryDate : undefined);
      const res = await getPersonTimeline(person.person_type, person.person_id, targetDate);
      if (res?.data) {
        setJourneyTimelineData(res.data);
      }
    } catch (err: any) {
      toast.error('Failed to fetch person journey');
    } finally {
      setIsLoadingJourneyTimeline(false);
    }
  };

  // Direct Face Enrollment
  const handleEnrollPersonFromFace = async () => {
    if (!enrollFaceFile) {
      toast.error('Please upload a clear frontal face image');
      return;
    }
    if (!enrollFirstName.trim()) {
      toast.error('Please enter a first name');
      return;
    }

    setIsEnrollingSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', enrollFaceFile);
      formData.append('first_name', enrollFirstName.trim());
      formData.append('last_name', enrollLastName.trim());
      formData.append('registration_type', enrollRole);
      if (enrollRole === 'employee') {
        formData.append('employee_code', enrollEmployeeCode.trim());
      }

      await addPersonFromFacePhoto(formData);
      toast.success('Person enrolled successfully with face embedding!');
      setIsEnrollingPerson(false);
      setEnrollFaceFile(null);
      setEnrollFirstName('');
      setEnrollLastName('');
      setEnrollEmployeeCode('');
      if (mainTab === 'people') fetchPeopleDirectory();
    } catch (err: any) {
      toast.error('Face enrollment failed');
    } finally {
      setIsEnrollingSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Advanced People & Spatial Analytics
            </h1>
            <p className="text-xs text-muted-foreground">
              Spatio-temporal camera topology, segmentation ReID, multi-camera journeys, and dwell analytics
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: VIDEO ANALYTICS (With 3 Sub-Tabs: Topology | Processing | Results) */}
      {/* ========================================================= */}
      {mainTab === 'analytics' && !selectedPersonForJourney && (
        <div className="space-y-6">
          {/* Sub-tabs Stepper Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  activeStep === 1
                    ? 'bg-primary text-primary-foreground shadow'
                    : 'border border-border text-muted-foreground hover:bg-accent'
                }`}
              >
                <Sliders className="h-3.5 w-3.5" /> 1. Topology & Setup
              </button>
              <button
                type="button"
                onClick={() => activeSessionId && setActiveStep(2)}
                disabled={!activeSessionId}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  activeStep === 2
                    ? 'bg-primary text-primary-foreground shadow'
                    : 'border border-border text-muted-foreground hover:bg-accent disabled:opacity-40'
                }`}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${activeStep === 2 ? 'animate-spin' : ''}`} /> 2. Processing
              </button>
              <button
                type="button"
                onClick={() => (sessionData?.status || '').toUpperCase() === 'COMPLETED' && setActiveStep(3)}
                disabled={(sessionData?.status || '').toUpperCase() !== 'COMPLETED'}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  activeStep === 3
                    ? 'bg-primary text-primary-foreground shadow'
                    : 'border border-border text-muted-foreground hover:bg-accent disabled:opacity-40'
                }`}
              >
                <Activity className="h-3.5 w-3.5" /> 3. Dashboard Stream (Results)
              </button>
            </div>
          </div>

          {/* SUB-TAB 1: TOPOLOGY GRAPH, CAMERA LIST & VIDEO UPLOAD */}
          {activeStep === 1 && (
            <div className="space-y-6">
              {/* Camera-to-Camera Topology Network Manager */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                      <Route className="h-5 w-5 text-primary" /> Camera-to-Camera Spatial Topology Graph
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Define spatial connections and expected travel times between cameras (supports 1-to-many, e.g., Workspace ➔ Cafeteria, Meeting Room, Cabins)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* View Switcher: Graph vs List */}
                    <div className="flex items-center rounded-lg border border-border bg-accent/30 p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setTopologyViewMode('graph')}
                        className={`rounded-md px-2.5 py-1 font-semibold transition-all cursor-pointer ${
                          topologyViewMode === 'graph'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Visual Graph
                      </button>
                      <button
                        type="button"
                        onClick={() => setTopologyViewMode('list')}
                        className={`rounded-md px-2.5 py-1 font-semibold transition-all cursor-pointer ${
                          topologyViewMode === 'list'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        List Cards
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsCreatingCamera(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-accent/40 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 text-primary" /> Add Camera
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLinkFromCameraId(selectedCameraId || (cameraNodes[0]?.id ?? ''));
                        setLinkToCameraId(cameraNodes.find((c) => c.id !== selectedCameraId)?.id ?? '');
                        setIsCreatingLink(true);
                      }}
                      disabled={cameraNodes.length < 2}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 cursor-pointer"
                    >
                      <GitFork className="h-3.5 w-3.5" /> Connect Cameras
                    </button>
                  </div>
                </div>

                {/* Add Camera Node Modal / Form */}
                {isCreatingCamera && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Camera className="h-4 w-4 text-primary" /> Create New Camera Node
                      </h4>
                      <button onClick={() => setIsCreatingCamera(false)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Camera Name (e.g. Open Workspace, Cafeteria, Lobby)"
                        value={newCameraName}
                        onChange={(e) => setNewCameraName(e.target.value)}
                        className="rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input
                        type="text"
                        placeholder="Location Label (e.g. Ground Floor, West Wing)"
                        value={newCameraLabel}
                        onChange={(e) => setNewCameraLabel(e.target.value)}
                        className="rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={newCameraIsEntryPoint}
                          onChange={(e) => setNewCameraIsEntryPoint(e.target.checked)}
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                        />
                        <span>Is Campus Entry / Exit Point</span>
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIsCreatingCamera(false)}
                          className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleCreateCamera}
                          className="rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
                        >
                          Save Camera
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Connect Cameras Modal / Form */}
                {isCreatingLink && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <GitFork className="h-4 w-4 text-primary" /> Create Camera-to-Camera Connection Edge
                      </h4>
                      <button onClick={() => setIsCreatingLink(false)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Origin Camera</label>
                        <select
                          value={linkFromCameraId}
                          onChange={(e) => setLinkFromCameraId(e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">-- Select Origin Camera --</option>
                          {cameraNodes.map((n) => (
                            <option key={n.id} value={n.id}>📷 {n.name} {n.location_label ? `(${n.location_label})` : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Destination Camera</label>
                        <select
                          value={linkToCameraId}
                          onChange={(e) => setLinkToCameraId(e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">-- Select Destination Camera --</option>
                          {cameraNodes.filter((n) => n.id !== linkFromCameraId).map((n) => (
                            <option key={n.id} value={n.id}>📷 {n.name} {n.location_label ? `(${n.location_label})` : ''}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Min Transit (sec)</label>
                        <input
                          type="number"
                          min="1"
                          value={linkMinTransit}
                          onChange={(e) => setLinkMinTransit(parseFloat(e.target.value) || 1)}
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Avg Transit (sec)</label>
                        <input
                          type="number"
                          min="1"
                          value={linkAvgTransit}
                          onChange={(e) => setLinkAvgTransit(parseFloat(e.target.value) || 1)}
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Transit (sec)</label>
                        <input
                          type="number"
                          min="5"
                          value={linkMaxTransit}
                          onChange={(e) => setLinkMaxTransit(parseFloat(e.target.value) || 5)}
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                        <input
                          type="checkbox"
                          checked={linkBidirectional}
                          onChange={(e) => setLinkBidirectional(e.target.checked)}
                          className="h-4 w-4 rounded border-input text-primary accent-primary"
                        />
                        <span className="flex items-center gap-1">
                          <ArrowLeftRight className="h-3.5 w-3.5 text-primary" /> Bidirectional (Create two-way link A ⇄ B)
                        </span>
                      </label>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIsCreatingLink(false)}
                          className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleCreateCameraLink}
                          className="rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
                        >
                          Save Connection
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* VISUAL TOPOLOGY GRAPH VIEW (Default) */}
                {topologyViewMode === 'graph' ? (
                  <CameraTopologyGraph
                    cameraNodes={cameraNodes}
                    cameraLinks={cameraLinks}
                    selectedCameraId={selectedCameraId}
                    onSelectCamera={(id) => setSelectedCameraId(id)}
                    onInitiateConnect={(fromId, toId) => {
                      setLinkFromCameraId(fromId);
                      setLinkToCameraId(toId);
                      setIsCreatingLink(true);
                    }}
                    onDeleteLink={handleDeleteCameraLink}
                    onDeleteCamera={(node) => setCameraToDelete(node)}
                    onEditCamera={(node) => {
                      setEditingCamera(node);
                      setEditCameraName(node.name);
                      setEditCameraLabel(node.location_label || node.location_desc || node.label || node.region || '');
                    }}
                    onAddCameraClick={() => setIsCreatingCamera(true)}
                  />
                ) : (
                  /* DIRECT LIST OF CAMERA NODES & CONNECTIONS (List View) */
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                          <Camera className="h-3.5 w-3.5 text-primary" /> Active Camera Nodes ({cameraNodes.length}):
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => scrollCameraCarousel('left')}
                            className="rounded-lg border border-border bg-card p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => scrollCameraCarousel('right')}
                            className="rounded-lg border border-border bg-card p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div
                        ref={cameraCarouselRef}
                        className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x"
                      >
                        {cameraNodes.length > 0 ? (
                          cameraNodes.map((node) => {
                            const isSelected = selectedCameraId === node.id;
                            return (
                              <div
                                key={node.id}
                                className={`min-w-[210px] shrink-0 snap-start flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                                  isSelected
                                    ? 'border-primary bg-primary/10 shadow-sm'
                                    : 'border-border bg-accent/20 hover:border-border/80'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => setSelectedCameraId(node.id)}
                                  className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                                >
                                  <div
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                      isSelected
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-accent text-muted-foreground'
                                    }`}
                                  >
                                    <Camera className="h-4 w-4" />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1">
                                      <span className="font-bold text-xs text-foreground block truncate">
                                        {node.name}
                                      </span>
                                      {node.is_entry_point && (
                                        <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[8px] text-emerald-400 font-bold uppercase shrink-0">
                                          Entry
                                        </span>
                                      )}
                                    </div>
                                    <span
                                      className={`text-[11px] block truncate ${
                                        node.location_label ? 'text-primary font-medium' : 'text-muted-foreground'
                                      }`}
                                    >
                                      📍 {node.location_label || node.location_desc || node.label || node.region || 'No location set'}
                                    </span>
                                  </div>
                                </button>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCamera(node);
                                      setEditCameraName(node.name);
                                      setEditCameraLabel(node.location_label || node.location_desc || node.label || node.region || '');
                                    }}
                                    className="text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-primary/10"
                                    title="Edit camera"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCameraToDelete(node)}
                                    className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/10"
                                    title="Delete camera node"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-xl border border-dashed border-border bg-accent/10 px-4 py-3 text-xs text-muted-foreground flex items-center gap-2">
                            <span>No camera nodes created yet. Click &quot;Add Camera&quot; to begin.</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setIsCreatingCamera(true)}
                          className="min-w-[140px] shrink-0 flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 text-primary text-xs font-semibold hover:bg-primary/10 hover:border-primary transition-all cursor-pointer"
                        >
                          <Plus className="h-4 w-4" /> Add Camera
                        </button>
                      </div>
                    </div>

                    {/* Active Topology Network Connections Display */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                        <GitFork className="h-3.5 w-3.5 text-primary" /> Active Camera Connections ({cameraLinks.length}):
                      </p>
                      {cameraLinks.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                          {cameraLinks.map((link, idx) => {
                            const fromCam = cameraNodes.find((c) => c.id === link.from_camera_id);
                            const toCam = cameraNodes.find((c) => c.id === link.to_camera_id);
                            const fromRegion = fromCam?.location_label || fromCam?.location_desc || fromCam?.label || fromCam?.region;
                            const toRegion = toCam?.location_label || toCam?.location_desc || toCam?.label || toCam?.region;
                            return (
                              <div
                                key={`${link.id}-${idx}`}
                                className="flex items-center justify-between rounded-lg border border-border bg-accent/20 px-3 py-2 text-xs transition-all hover:border-primary/40"
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <span className="font-semibold text-foreground truncate">
                                    📷 {fromCam?.name || 'Camera A'}
                                    {fromRegion && <span className="text-[10px] text-primary font-medium ml-1">({fromRegion})</span>}
                                  </span>
                                  <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0" />
                                  <span className="font-semibold text-foreground truncate">
                                    📷 {toCam?.name || 'Camera B'}
                                    {toRegion && <span className="text-[10px] text-primary font-medium ml-1">({toRegion})</span>}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  <span className="font-mono text-muted-foreground text-[11px] bg-background/50 px-1.5 py-0.5 rounded">
                                    {link.min_transit_time_seconds || 5}s–{link.max_transit_time_seconds || 120}s
                                  </span>
                                  <button
                                    onClick={() => handleDeleteCameraLink(link.id)}
                                    className="text-muted-foreground hover:text-rose-400 transition-colors p-1"
                                    title="Delete connection"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-border bg-accent/10 p-4 text-center">
                          <p className="text-xs text-muted-foreground">
                            No camera connections defined yet. Click <span className="font-semibold text-primary">&quot;Connect Cameras&quot;</span> above to build your spatial topology graph.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Video Footage Upload & Parameter Configuration */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                  <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <h3 className="mb-3 flex items-center justify-between text-base font-semibold text-foreground">
                      <span className="flex items-center gap-2">
                        <Video className="h-5 w-5 text-primary" /> Upload CCTV Video Footage
                      </span>
                      {(selectedFile || selectedUploadedVideo) && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          <Check className="h-3.5 w-3.5" /> Ready for Analysis
                        </span>
                      )}
                    </h3>

                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                      className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                        isDragOver
                          ? 'border-primary bg-primary/5 scale-[0.99]'
                          : selectedFile || selectedUploadedVideo
                          ? 'border-emerald-500/50 bg-accent/20'
                          : 'border-border bg-accent/10 hover:border-primary/50'
                      }`}
                    >
                      {videoPreviewUrl ? (
                        <div className="w-full flex flex-col items-center gap-3">
                          {/* Live Video Thumbnail / Preview Player */}
                          <div className="relative w-full max-w-md aspect-video rounded-xl overflow-hidden border border-border/80 bg-black shadow-lg">
                            <video
                              src={videoPreviewUrl}
                              controls
                              playsInline
                              preload="metadata"
                              className="w-full h-full object-contain"
                            />
                            <div className="absolute top-2 left-2 rounded-md bg-black/75 px-2 py-0.5 text-[10px] text-white font-medium flex items-center gap-1 backdrop-blur-sm pointer-events-none">
                              <Play className="h-3 w-3 text-emerald-400 fill-emerald-400" /> Video Preview
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <FileVideo className="h-4 w-4 text-emerald-400" />
                            <span className="text-xs font-bold text-foreground">
                              {selectedUploadedVideo
                                ? (selectedUploadedVideo.original_filename || (selectedUploadedVideo as any).filename)
                                : selectedFile?.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              (
                              {selectedUploadedVideo && selectedUploadedVideo.file_size
                                ? `${(selectedUploadedVideo.file_size / (1024 * 1024)).toFixed(2)} MB`
                                : selectedFile
                                ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                                : 'Ready'}
                              )
                            </span>
                          </div>

                          <div className="relative z-10 flex items-center gap-2 mt-1">
                            <label className="cursor-pointer rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors shadow-sm">
                              Change Video
                              <input
                                type="file"
                                accept="video/*"
                                onChange={handleFileInputChange}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFile(null);
                                setSelectedUploadedVideo(null);
                                setVideoPreviewUrl('');
                              }}
                              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <input
                            type="file"
                            accept="video/*"
                            onChange={handleFileInputChange}
                            className="absolute inset-0 cursor-pointer opacity-0"
                          />
                          <FileVideo className="h-10 w-10 mb-2 text-primary" />
                          <p className="text-sm font-semibold text-foreground">
                            Click to Browse or Drag & Drop CCTV Video
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            MP4, AVI, MOV supported for YOLOv8 segmentation and ReID embedding
                          </p>
                        </>
                      )}
                    </div>

                    {/* Previously Uploaded Footage Selection (Recent Uploads) */}
                    {uploadedVideos.length > 0 && (
                      <div className="mt-4 border-t border-border pt-3">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          Or select from recent uploads:
                        </p>
                        <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                          {uploadedVideos.map((vid, idx) => {
                            const isSelected = selectedUploadedVideo?.id === vid.id;
                            const displayName = vid.original_filename || (vid as any).filename || 'Video Footage';
                            return (
                              <button
                                key={`${vid.id}-${idx}`}
                                type="button"
                                onClick={() => handleSelectUploadedVideo(vid)}
                                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                                  isSelected
                                    ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary'
                                    : 'border-border bg-accent/30 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                                }`}
                              >
                                <span>🎬</span>
                                <span>{displayName}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Camera Node Assignment Selector */}
                    <div className="mt-5 pt-4 border-t border-border">
                      <label className="block text-xs font-semibold text-foreground mb-2">
                        Assign Footage to Camera Node:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {cameraNodes.map((cam) => {
                          const isSelected = selectedCameraId === cam.id;
                          const region = cam.location_label || cam.location_desc || cam.label || cam.region;
                          return (
                            <button
                              key={cam.id}
                              type="button"
                              onClick={() => setSelectedCameraId(cam.id)}
                              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20'
                                  : 'border-border bg-accent/30 text-foreground hover:bg-accent hover:border-border/80'
                              }`}
                            >
                              <Camera className="h-3.5 w-3.5 shrink-0" />
                              <span>{cam.name}</span>
                              {region && (
                                <span
                                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${
                                    isSelected
                                      ? 'bg-primary-foreground/20 border-white/30 text-primary-foreground'
                                      : 'bg-primary/10 border-primary/20 text-primary'
                                  }`}
                                >
                                  📍 {region}
                                </span>
                              )}
                              {cam.is_entry_point && (
                                <span
                                  className={`rounded px-1 py-0.2 text-[8px] font-bold uppercase ${
                                    isSelected
                                      ? 'bg-emerald-400/30 text-white'
                                      : 'bg-emerald-500/20 text-emerald-400'
                                  }`}
                                >
                                  Entry
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: AI Analytics Hyperparameters */}
                <div className="space-y-6">
                  <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Sliders className="h-5 w-5 text-primary" /> Processing Parameters
                    </h3>

                    <div className="space-y-3 text-xs">
                      <div>
                        <div className="flex justify-between font-semibold text-muted-foreground mb-1">
                          <span>ReID Similarity Threshold</span>
                          <span className="text-primary font-mono">{similarityThreshold}</span>
                        </div>
                        <input
                          type="range"
                          min="0.30"
                          max="0.95"
                          step="0.05"
                          value={similarityThreshold}
                          onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
                          className="w-full h-1.5 bg-accent rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between font-semibold text-muted-foreground mb-1">
                          <span>YOLO Confidence Threshold</span>
                          <span className="text-primary font-mono">{confidenceThreshold}</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="0.9"
                          step="0.05"
                          value={confidenceThreshold}
                          onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                          className="w-full h-1.5 bg-accent rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>

                      <div className="space-y-2 pt-2 border-t border-border">
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="font-medium text-foreground">Track Staff & Employees</span>
                          <input
                            type="checkbox"
                            checked={trackEmployees}
                            onChange={(e) => setTrackEmployees(e.target.checked)}
                            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="font-medium text-foreground">Register New Visitors</span>
                          <input
                            type="checkbox"
                            checked={registerNewVisitors}
                            onChange={(e) => setRegisterNewVisitors(e.target.checked)}
                            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="font-medium text-foreground">Track Repeat Visitors</span>
                          <input
                            type="checkbox"
                            checked={trackRepeatVisitors}
                            onChange={(e) => setTrackRepeatVisitors(e.target.checked)}
                            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="font-medium text-foreground">Doorway Line Crossing</span>
                          <input
                            type="checkbox"
                            checked={lineCrossingAnalysis}
                            onChange={(e) => setLineCrossingAnalysis(e.target.checked)}
                            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="font-medium text-foreground">Track Occupancy Density</span>
                          <input
                            type="checkbox"
                            checked={trackOccupancy}
                            onChange={(e) => setTrackOccupancy(e.target.checked)}
                            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          />
                        </label>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedFile && !selectedUploadedVideo) {
                          toast.error('Please select or drop a CCTV video footage clip.');
                          return;
                        }
                        if (lineCrossingAnalysis) {
                          setShowLineCanvas(true);
                        } else {
                          handleLaunchAnalysis();
                        }
                      }}
                      disabled={isSubmitting || (!selectedFile && !selectedUploadedVideo)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" /> Starting Analytics...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 fill-current" /> Launch Video Analysis
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Interactive Line Drawing Modal */}
              {showLineCanvas && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                  <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Route className="h-4 w-4 text-primary" /> Draw Doorway / Gate Crossing Line
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Click and drag across the threshold of the doorway on the video frame.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowLineCanvas(false)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <LineDrawingCanvas
                      videoName={selectedUploadedVideo?.original_filename || selectedFile?.name || 'Video Footage'}
                      videoFile={selectedFile}
                      videoSavedPath={selectedUploadedVideo?.file_path || (selectedUploadedVideo as any)?.filepath || null}
                      onLineDraw={(start, end) => {
                        setLineStart(start);
                        setLineEnd(end);
                        setLineDrawnConfirmed(true);
                        toast.success(`Doorway line set: (${start[0]}, ${start[1]}) ➔ (${end[0]}, ${end[1]})`);
                      }}
                      onSkip={() => {
                        setShowLineCanvas(false);
                        handleLaunchAnalysis(lineStart, lineEnd);
                      }}
                      initialLine={lineDrawnConfirmed ? { start: lineStart, end: lineEnd, resolution: { width: 1280, height: 720 } } : null}
                    />

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <button
                        type="button"
                        onClick={() => {
                          setShowLineCanvas(false);
                          setLineDrawnConfirmed(false);
                          handleLaunchAnalysis();
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
                      >
                        Proceed With Default Line
                      </button>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowLineCanvas(false)}
                          className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowLineCanvas(false);
                            handleLaunchAnalysis(lineStart, lineEnd);
                          }}
                          className="rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/20 cursor-pointer flex items-center gap-1.5"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" /> Save & Launch Analysis
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB 2: REAL-TIME PROCESSING QUEUE */}
          {activeStep === 2 && (
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center space-y-6 max-w-2xl mx-auto">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-primary/10 text-primary animate-pulse">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-foreground">Video Processing in Progress</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  YOLOv8 person segmentation, feature extraction, ReID matching, and doorway crossing analysis are running
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{sessionData?.current_step || 'Segmenting Video Frames & Extracting Embeddings...'}</span>
                  <span className="font-mono font-bold text-primary">
                    {sessionData?.completed_percentage ?? sessionData?.progress ?? 0}%
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-accent overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500 rounded-full"
                    style={{ width: `${sessionData?.completed_percentage ?? sessionData?.progress ?? 0}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl border border-border bg-accent/20 p-3">
                  <span className="text-muted-foreground block text-[11px]">Total Detections</span>
                  <span className="text-sm font-bold text-foreground mt-1 block">
                    {sessionData?.total_person_count ?? sessionData?.total_people_detected ?? 0}
                  </span>
                </div>
                <div className="rounded-xl border border-border bg-accent/20 p-3">
                  <span className="text-muted-foreground block text-[11px]">Staff Count</span>
                  <span className="text-sm font-bold text-emerald-400 mt-1 block">
                    {sessionData?.employee_count ?? sessionData?.employees_detected_count ?? 0}
                  </span>
                </div>
                <div className="rounded-xl border border-border bg-accent/20 p-3">
                  <span className="text-muted-foreground block text-[11px]">Visitors Count</span>
                  <span className="text-sm font-bold text-amber-400 mt-1 block">
                    {sessionData?.visitor_count ?? sessionData?.unique_visitors_count ?? 0}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: DASHBOARD STREAM (RESULTS) */}
          {activeStep === 3 && sessionData && (
            <div className="space-y-6">
              {/* Summary Metric Header */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-primary" /> Total People
                  </span>
                  <span className="text-2xl font-bold text-foreground mt-2 block">
                    {sessionData.total_person_count ?? sessionData.total_people_detected ?? 0}
                  </span>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-emerald-400" /> Employees
                  </span>
                  <span className="text-2xl font-bold text-emerald-400 mt-2 block">
                    {sessionData.employee_count ?? sessionData.employees_detected_count ?? 0}
                  </span>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <UserPlus className="h-4 w-4 text-amber-400" /> Unique Visitors
                  </span>
                  <span className="text-2xl font-bold text-amber-400 mt-2 block">
                    {sessionData.visitor_count ?? sessionData.unique_visitors_count ?? 0}
                  </span>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-sky-400" /> Doorway In / Out
                  </span>
                  <span className="text-2xl font-bold text-foreground mt-2 block">
                    {sessionData.entry_count ?? sessionData.line_crossings_in_count ?? 0} / {sessionData.exit_count ?? sessionData.line_crossings_out_count ?? 0}
                  </span>
                </div>
              </div>

              {/* Video Stream & Action Controls */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Play className="h-5 w-5 text-primary" /> Annotated Video Stream
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveStep(1)}
                      className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent/80 cursor-pointer"
                    >
                      New Analysis
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!activeSessionId) return;
                        setIsAssociating(true);
                        try {
                          await triggerCrossCameraAssociation([activeSessionId]);
                          toast.success('Cross-camera spatio-temporal matching started!');
                        } finally {
                          setIsAssociating(false);
                        }
                      }}
                      disabled={isAssociating}
                      className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer"
                    >
                      {isAssociating ? 'Associating...' : 'Trigger Cross-Camera ReID'}
                    </button>
                  </div>
                </div>

                <div className="relative h-96 w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
                  <video
                    src={getAnnotatedVideoUrl(sessionData.id)}
                    controls
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>

              {/* Detected People Cards */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Detected Individuals in Footage ({detectedPeople.length})
                </h3>

                {detectedPeople.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {detectedPeople.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col rounded-xl border border-border bg-accent/20 p-3.5 space-y-2 transition-all hover:border-primary/40"
                      >
                        <div className="relative h-32 w-full overflow-hidden rounded-lg bg-background border border-border">
                          {p.crop_url ? (
                            <img
                              src={getMediaCropUrl(p.crop_url)}
                              alt={p.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <User className="h-8 w-8" />
                            </div>
                          )}
                        </div>

                        <div>
                          <span className="font-bold text-xs text-foreground block truncate">{p.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            Role: <b className="text-foreground">{p.person_type}</b>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-xs text-muted-foreground p-8">
                    No individual crops available for this session.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: PEOPLE JOURNEY DIRECTORY TABLE & DRILLDOWN         */}
      {/* ========================================================= */}
      {mainTab === 'people' && !selectedPersonForJourney && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> People Journey Directory
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Filter and track unique visitors and employees detected across camera networks
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEnrollingPerson(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/20 cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" /> Enroll New Person
                </button>
                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 shadow-sm cursor-pointer"
                  title="Clear all analytics and people data"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear Data
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Filter by Date</label>
                <input
                  type="date"
                  value={directoryDate}
                  onChange={(e) => setDirectoryDate(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Person Role</label>
                <select
                  value={directoryRoleFilter}
                  onChange={(e) => setDirectoryRoleFilter(e.target.value as any)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All People (Employees & Visitors)</option>
                  <option value="employee">Employees (Registered Staff)</option>
                  <option value="visitor">Visitors (Guests & Repeat)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Search Person</label>
                <div className="relative flex items-center">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search name or ID..."
                    value={directorySearch}
                    onChange={(e) => setDirectorySearch(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background pl-8 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Directory Table */}
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            {isLoadingDirectory ? (
              <div className="flex h-64 items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : directoryList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-accent/40 text-muted-foreground uppercase font-semibold text-[11px]">
                    <tr>
                      <th className="px-6 py-3.5">Person Profile</th>
                      <th className="px-6 py-3.5">Role</th>
                      <th className="px-6 py-3.5">Total Dwell Time</th>
                      <th className="px-6 py-3.5">Camera Stops Visited</th>
                      <th className="px-6 py-3.5">Activity Window</th>
                      <th className="px-6 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {directoryList.map((person) => (
                      <tr key={person.person_id} className="transition-colors hover:bg-accent/20">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
                              {person.crop_url ? (
                                <img
                                  src={getMediaCropUrl(person.crop_url)}
                                  alt={person.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-accent/50 text-muted-foreground">
                                  <User className="h-6 w-6" />
                                </div>
                              )}
                            </div>
                            <div>
                              <span className="font-bold text-sm text-foreground block">{person.name}</span>
                              {person.employee_code && (
                                <span className="rounded bg-accent px-1 text-[10px] font-mono text-muted-foreground">
                                  {person.employee_code}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                              person.person_type === 'employee'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {person.person_type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-foreground">
                          {formatDwellTime(person.total_dwell_seconds)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-foreground">
                            {person.camera_stops_count} Stop{person.camera_stops_count !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {new Date(person.first_seen_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ➔{' '}
                          {new Date(person.last_seen_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenPersonJourney(person)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground shadow-sm cursor-pointer"
                          >
                            <Route className="h-3.5 w-3.5" /> View Journey
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-muted-foreground">
                No individuals detected matching your filters.
              </div>
            )}
          </div>
        </div>
      )}

      {/* PERSON JOURNEY DRILLDOWN VIEW */}
      {selectedPersonForJourney && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <button
              type="button"
              onClick={() => setSelectedPersonForJourney(null)}
              className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Back to People Directory
            </button>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-6">
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-primary/40 bg-background shadow-md">
                  {selectedPersonForJourney.crop_url ? (
                    <img
                      src={getMediaCropUrl(selectedPersonForJourney.crop_url)}
                      alt={selectedPersonForJourney.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-accent/50 text-muted-foreground">
                      <User className="h-9 w-9" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-foreground">{selectedPersonForJourney.name}</h2>
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                        selectedPersonForJourney.person_type === 'employee'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {selectedPersonForJourney.person_type.toUpperCase()}
                    </span>
                    {selectedPersonForJourney.employee_code && (
                      <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-mono text-foreground font-semibold">
                        ID: {selectedPersonForJourney.employee_code}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground font-mono">
                    UUID: {selectedPersonForJourney.person_id}
                  </p>
                </div>
              </div>

              {/* Metric Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-border bg-accent/20 px-3.5 py-2.5">
                  <span className="text-[11px] text-muted-foreground block flex items-center gap-1">
                    <Timer className="h-3.5 w-3.5 text-primary" /> Total Dwell Time
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {formatDwellTime(selectedPersonForJourney.total_dwell_seconds)}
                  </span>
                </div>
                <div className="rounded-xl border border-border bg-accent/20 px-3.5 py-2.5">
                  <span className="text-[11px] text-muted-foreground block flex items-center gap-1">
                    <Camera className="h-3.5 w-3.5 text-primary" /> Camera Stops
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {selectedPersonForJourney.camera_stops_count} Locations
                  </span>
                </div>
                <div className="rounded-xl border border-border bg-accent/20 px-3.5 py-2.5">
                  <span className="text-[11px] text-muted-foreground block flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-emerald-400" /> First Seen
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {new Date(selectedPersonForJourney.first_seen_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="rounded-xl border border-border bg-accent/20 px-3.5 py-2.5">
                  <span className="text-[11px] text-muted-foreground block flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-rose-400" /> Last Seen
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {new Date(selectedPersonForJourney.last_seen_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Chronological Pathway Stops */}
            <div className="mt-6">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-4">
                <Footprints className="h-5 w-5 text-primary" /> Spatio-Temporal Multi-Camera Journey Pathway
              </h3>

              {isLoadingJourneyTimeline ? (
                <div className="flex h-48 items-center justify-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : journeyTimelineData && journeyTimelineData.events.length > 0 ? (
                <div className="relative border-l-2 border-primary/40 ml-4 pl-6 space-y-6">
                  {journeyTimelineData.events.map((evt, idx) => (
                    <div key={`${evt.id}-${idx}`} className="relative group">
                      <span className="absolute -left-[31px] top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-primary text-[11px] font-bold text-primary-foreground shadow-md ring-4 ring-primary/20">
                        {idx + 1}
                      </span>
                      <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/50">
                        <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
                          <span className="font-bold text-sm text-foreground">📷 {evt.camera_name}</span>
                          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400 font-semibold">
                            {evt.identity_source.toUpperCase()} ({Math.round(evt.identity_confidence * 100)}%)
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <div>Arrival: <b className="text-foreground">{new Date(evt.started_at).toLocaleTimeString()}</b></div>
                          <div>Departure: <b className="text-foreground">{new Date(evt.ended_at).toLocaleTimeString()}</b></div>
                          <div>Dwell: <b className="text-foreground">{formatDwellTime(evt.duration_seconds)}</b></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-accent/10 p-8 text-center text-xs text-muted-foreground">
                  No multi-camera journey stops recorded for this person yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: PAST SESSIONS (HISTORY) TAB VIEW                   */}
      {/* ========================================================= */}
      {mainTab === 'history' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <History className="h-5 w-5 text-primary" /> Past Analyzed Video Sessions ({pastSessions.length})
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Click &quot;View Dashboard&quot; on any session to load its full video stream, detection crops, and KPIs
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchHistorySessions}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent shadow-sm cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 shadow-sm cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear All Data
              </button>
            </div>
          </div>

          {isLoadingHistory ? (
            <div className="flex h-64 items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pastSessions.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {pastSessions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3 transition-all hover:border-primary/40"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Video className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground">{s.video_name}</h3>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {s.created_at ? new Date(s.created_at).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase ${
                          (s.status || '').toUpperCase() === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : (s.status || '').toUpperCase() === 'PROCESSING'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {s.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSelectPastSession(s)}
                        className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" /> View Dashboard
                      </button>
                      <button
                        type="button"
                        onClick={() => setSessionToDelete(s)}
                        className="rounded-xl border border-destructive/30 bg-destructive/10 p-2 text-destructive hover:bg-destructive/20 shadow-sm cursor-pointer"
                        title="Delete session"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-xl bg-accent/20 p-2.5">
                      <span className="text-muted-foreground block text-[11px] flex items-center gap-1">
                        <Users className="h-3 w-3 text-primary" /> Total Detections
                      </span>
                      <span className="font-bold text-foreground text-sm mt-0.5 block">
                        {s.total_people_detected ?? 0}
                      </span>
                    </div>

                    <div className="rounded-xl bg-accent/20 p-2.5">
                      <span className="text-muted-foreground block text-[11px] flex items-center gap-1">
                        <UserCheck className="h-3 w-3 text-emerald-400" /> Employees
                      </span>
                      <span className="font-bold text-emerald-400 text-sm mt-0.5 block">
                        {s.employees_detected_count ?? 0}
                      </span>
                    </div>

                    <div className="rounded-xl bg-accent/20 p-2.5">
                      <span className="text-muted-foreground block text-[11px] flex items-center gap-1">
                        <UserPlus className="h-3 w-3 text-amber-400" /> Visitors
                      </span>
                      <span className="font-bold text-amber-400 text-sm mt-0.5 block">
                        {s.unique_visitors_count ?? 0}
                      </span>
                    </div>

                    <div className="rounded-xl bg-accent/20 p-2.5">
                      <span className="text-muted-foreground block text-[11px] flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-sky-400" /> Gate In / Out
                      </span>
                      <span className="font-bold text-foreground text-sm mt-0.5 block">
                        {s.line_crossings_in_count ?? 0} / {s.line_crossings_out_count ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-xs text-muted-foreground">
              No analyzed video sessions in history yet.
            </div>
          )}
        </div>
      )}

      {/* DELETE CAMERA CONFIRMATION MODAL */}
      {cameraToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-foreground flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Delete Camera Node?
            </h4>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to delete camera <b>&quot;{cameraToDelete.name}&quot;</b>? All connected walkway links to this camera will also be automatically removed from the topology.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setCameraToDelete(null)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCamera}
                disabled={isDeletingCamera}
                className="rounded-lg bg-destructive px-4 py-1.5 text-xs font-semibold text-white hover:bg-destructive/90 shadow-sm cursor-pointer"
              >
                {isDeletingCamera ? 'Deleting...' : 'Yes, Delete Camera'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE SESSION CONFIRMATION MODAL */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-foreground flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Delete Analyzed Session?
            </h4>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to delete session &quot;{sessionToDelete.video_name}&quot;? All associated ReID detections and dwell events will be permanently removed.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePastSession}
                disabled={Boolean(deletingSessionId)}
                className="rounded-lg bg-destructive px-4 py-1.5 text-xs font-semibold text-white hover:bg-destructive/90 shadow-sm cursor-pointer"
              >
                {deletingSessionId ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET ALL DATA CONFIRMATION MODAL */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-destructive/40 bg-card p-6 shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Clear All Analytics Data?
            </h4>
            <p className="text-xs text-muted-foreground">
              This will wipe all sessions, timeline occurrences, and visitor records from the database. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetAllData}
                disabled={isResetting}
                className="rounded-lg bg-destructive px-4 py-1.5 text-xs font-semibold text-white hover:bg-destructive/90 shadow-sm cursor-pointer"
              >
                {isResetting ? 'Clearing...' : 'Clear All Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ENROLL PERSON FROM FACE MODAL */}
      {isEnrollingPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" /> Enroll Person from Face Photo
              </h4>
              <button onClick={() => setIsEnrollingPerson(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-muted-foreground mb-1">Face Photo *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEnrollFaceFile(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-input bg-background p-2 text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">First Name *</label>
                  <input
                    type="text"
                    value={enrollFirstName}
                    onChange={(e) => setEnrollFirstName(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Last Name</label>
                  <input
                    type="text"
                    value={enrollLastName}
                    onChange={(e) => setEnrollLastName(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground mb-1">Role</label>
                <select
                  value={enrollRole}
                  onChange={(e) => setEnrollRole(e.target.value as any)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-foreground"
                >
                  <option value="visitor">Visitor</option>
                  <option value="employee">Employee / Staff</option>
                </select>
              </div>

              {enrollRole === 'employee' && (
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Employee ID Code</label>
                  <input
                    type="text"
                    value={enrollEmployeeCode}
                    onChange={(e) => setEnrollEmployeeCode(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-foreground"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsEnrollingPerson(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEnrollPersonFromFace}
                disabled={isEnrollingSubmitting || !enrollFaceFile || !enrollFirstName}
                className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
              >
                {isEnrollingSubmitting ? 'Enrolling...' : 'Enroll Person'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CAMERA NODE MODAL */}
      {editingCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-primary/40 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" /> Edit Camera Node
              </h4>
              <button
                type="button"
                onClick={() => setEditingCamera(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">Camera Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Open Workspace, Cafeteria, Lobby, Camera 1"
                  value={editCameraName}
                  onChange={(e) => setEditCameraName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Location / Region Label (e.g. Ground Floor, West Wing, 2nd Floor)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ground Floor, West Wing, 2nd Floor Reception"
                  value={editCameraLabel}
                  onChange={(e) => setEditCameraLabel(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  This location label will be displayed on the topology graph, journey timeline, and camera node selectors.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setEditingCamera(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateCamera}
                disabled={isUpdatingCamera || !editCameraName.trim()}
                className="rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50 cursor-pointer"
              >
                {isUpdatingCamera ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VigilensAPAMainPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <VigilensAPAMainContent />
    </Suspense>
  );
}
