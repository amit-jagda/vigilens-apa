import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ApaStoreState {
  // Navigation & Stepper
  mainTab: 'analytics' | 'people' | 'history';
  activeStep: 1 | 2 | 3 | 4;
  topologyViewMode: 'graph' | 'list' | 'floorplan';
  selectedJourneyDate: string;

  // Processing Parameters & Execution Toggles
  similarityThreshold: number;
  confidenceThreshold: number;
  trackEmployees: boolean;
  registerNewVisitors: boolean;
  trackRepeatVisitors: boolean;
  lineCrossingAnalysis: boolean;
  trackOccupancy: boolean;
  generateVideo: boolean;

  // Time Range Slicing
  enableTimeRange: boolean;
  startTimeSec: number | null;
  endTimeSec: number | null;

  // Camera & Topology Selection
  selectedCameraId: string;
  isCreatingCamera: boolean;
  isCreatingLink: boolean;
  linkFromCameraId: string;
  linkToCameraId: string;
  linkMinTransit: number;
  linkAvgTransit: number;
  linkMaxTransit: number;
  linkBidirectional: boolean;

  // Line Counter Vector
  lineStart: [number, number];
  lineEnd: [number, number];
  lineDrawnConfirmed: boolean;
  showLineCanvas: boolean;

  // Active Session & Results
  activeSessionId: string | null;

  // Global Modals & Layout
  isSearchByPhotoOpen: boolean;
  isDailyCheckinOpen: boolean;
  isSidebarCollapsed: boolean | null; // null = auto (collapsed when canvas open), boolean = user manual override

  // Setters / Actions
  setMainTab: (tab: 'analytics' | 'people' | 'history') => void;
  setActiveStep: (step: 1 | 2 | 3 | 4) => void;
  setTopologyViewMode: (mode: 'graph' | 'list' | 'floorplan') => void;
  setSelectedJourneyDate: (date: string) => void;
  setIsSearchByPhotoOpen: (open: boolean) => void;
  setIsDailyCheckinOpen: (open: boolean) => void;
  setIsSidebarCollapsed: (val: boolean | null) => void;

  setSimilarityThreshold: (val: number) => void;
  setConfidenceThreshold: (val: number) => void;
  setTrackEmployees: (val: boolean) => void;
  setRegisterNewVisitors: (val: boolean) => void;
  setTrackRepeatVisitors: (val: boolean) => void;
  setLineCrossingAnalysis: (val: boolean) => void;
  setTrackOccupancy: (val: boolean) => void;
  setGenerateVideo: (val: boolean) => void;
  setEnableTimeRange: (val: boolean) => void;
  setStartTimeSec: (val: number | null) => void;
  setEndTimeSec: (val: number | null) => void;

  setSelectedCameraId: (id: string) => void;
  setIsCreatingCamera: (val: boolean) => void;
  setIsCreatingLink: (val: boolean) => void;
  setLinkFromCameraId: (id: string) => void;
  setLinkToCameraId: (id: string) => void;
  setLinkMinTransit: (val: number) => void;
  setLinkAvgTransit: (val: number) => void;
  setLinkMaxTransit: (val: number) => void;
  setLinkBidirectional: (val: boolean) => void;

  setLineStart: (coords: [number, number]) => void;
  setLineEnd: (coords: [number, number]) => void;
  setLineDrawnConfirmed: (val: boolean) => void;
  setShowLineCanvas: (val: boolean) => void;

  setActiveSessionId: (id: string | null) => void;

  resetConfig: () => void;
}

export const useApaStore = create<ApaStoreState>()(
  persist(
    (set) => ({
      // Defaults
      mainTab: 'analytics',
      activeStep: 1,
      topologyViewMode: 'floorplan',
      selectedJourneyDate: 'all',

      // Execution Toggles & Hyperparameters
      similarityThreshold: 0.60,
      confidenceThreshold: 0.30,
      trackEmployees: true,
      registerNewVisitors: true,
      trackRepeatVisitors: true,
      lineCrossingAnalysis: true,
      trackOccupancy: true,
      generateVideo: false, // Ultra-fast metadata-only analysis by default

      // Time Range Slicing
      enableTimeRange: false,
      startTimeSec: null,
      endTimeSec: null,

      // Topology
      selectedCameraId: '',
      isCreatingCamera: false,
      isCreatingLink: false,
      linkFromCameraId: '',
      linkToCameraId: '',
      linkMinTransit: 5,
      linkAvgTransit: 30,
      linkMaxTransit: 120,
      linkBidirectional: true,

      // Line Vector
      lineStart: [100, 300],
      lineEnd: [500, 300],
      lineDrawnConfirmed: false,
      showLineCanvas: false,

      // Active Session
      activeSessionId: null,

      // Global Modals & Layout
      isSearchByPhotoOpen: false,
      isDailyCheckinOpen: false,
      isSidebarCollapsed: null,

      // Actions
      setMainTab: (mainTab) => set({ mainTab }),
      setActiveStep: (activeStep) => set({ activeStep }),
      setTopologyViewMode: (topologyViewMode) => set({ topologyViewMode }),
      setSelectedJourneyDate: (selectedJourneyDate) => set({ selectedJourneyDate }),
      setIsSearchByPhotoOpen: (isSearchByPhotoOpen) => set({ isSearchByPhotoOpen }),
      setIsDailyCheckinOpen: (isDailyCheckinOpen) => set({ isDailyCheckinOpen }),
      setIsSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),

      setSimilarityThreshold: (similarityThreshold) => set({ similarityThreshold }),
      setConfidenceThreshold: (confidenceThreshold) => set({ confidenceThreshold }),
      setTrackEmployees: (trackEmployees) => set({ trackEmployees }),
      setRegisterNewVisitors: (registerNewVisitors) => set({ registerNewVisitors }),
      setTrackRepeatVisitors: (trackRepeatVisitors) => set({ trackRepeatVisitors }),
      setLineCrossingAnalysis: (lineCrossingAnalysis) => set({ lineCrossingAnalysis }),
      setTrackOccupancy: (trackOccupancy) => set({ trackOccupancy }),
      setGenerateVideo: (generateVideo) => set({ generateVideo }),
      setEnableTimeRange: (enableTimeRange) => set({ enableTimeRange }),
      setStartTimeSec: (startTimeSec) => set({ startTimeSec }),
      setEndTimeSec: (endTimeSec) => set({ endTimeSec }),

      setSelectedCameraId: (selectedCameraId) => set({ selectedCameraId }),
      setIsCreatingCamera: (isCreatingCamera) => set({ isCreatingCamera }),
      setIsCreatingLink: (isCreatingLink) => set({ isCreatingLink }),
      setLinkFromCameraId: (linkFromCameraId) => set({ linkFromCameraId }),
      setLinkToCameraId: (linkToCameraId) => set({ linkToCameraId }),
      setLinkMinTransit: (linkMinTransit) => set({ linkMinTransit }),
      setLinkAvgTransit: (linkAvgTransit) => set({ linkAvgTransit }),
      setLinkMaxTransit: (linkMaxTransit) => set({ linkMaxTransit }),
      setLinkBidirectional: (linkBidirectional) => set({ linkBidirectional }),

      setLineStart: (lineStart) => set({ lineStart }),
      setLineEnd: (lineEnd) => set({ lineEnd }),
      setLineDrawnConfirmed: (lineDrawnConfirmed) => set({ lineDrawnConfirmed }),
      setShowLineCanvas: (showLineCanvas) => set({ showLineCanvas }),

      setActiveSessionId: (activeSessionId) => set({ activeSessionId }),

      resetConfig: () =>
        set({
          similarityThreshold: 0.60,
          confidenceThreshold: 0.30,
          trackEmployees: true,
          registerNewVisitors: true,
          trackRepeatVisitors: true,
          lineCrossingAnalysis: true,
          trackOccupancy: true,
          generateVideo: false,
          enableTimeRange: false,
          startTimeSec: null,
          endTimeSec: null,
          lineDrawnConfirmed: false,
        }),
    }),
    {
      name: 'vigilens-apa-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        similarityThreshold: state.similarityThreshold,
        confidenceThreshold: state.confidenceThreshold,
        trackEmployees: state.trackEmployees,
        registerNewVisitors: state.registerNewVisitors,
        trackRepeatVisitors: state.trackRepeatVisitors,
        lineCrossingAnalysis: state.lineCrossingAnalysis,
        trackOccupancy: state.trackOccupancy,
        generateVideo: state.generateVideo,
        topologyViewMode: state.topologyViewMode,
        linkBidirectional: state.linkBidirectional,
        linkMinTransit: state.linkMinTransit,
        linkAvgTransit: state.linkAvgTransit,
        linkMaxTransit: state.linkMaxTransit,
      }),
    }
  )
);
