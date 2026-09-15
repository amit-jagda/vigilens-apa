import { create } from 'zustand';
import {
  listPeopleDirectory,
  deleteVisitorIdentity,
  getPersonTimeline,
} from '@/lib/api/advancedpeopleanalytics';
import type {
  PersonSummaryItem,
  PersonTimelineResponse,
} from '@/types/advancedpeopleanalytics';
import toast from 'react-hot-toast';

interface PeopleState {
  // People Directory list
  people: PersonSummaryItem[];
  isLoading: boolean;
  lastFetched: number | null;
  
  // Active Filter state
  roleFilter: 'all' | 'employee' | 'visitor';
  dateFilter: string;
  searchQuery: string;
  showHourlyAnalytics: boolean;
  isDailyCheckinOpen: boolean;

  // Person Journey Cache (keyed by personId)
  timelineCache: Record<string, { data: PersonTimelineResponse; timestamp: number }>;
  personInfoCache: Record<string, { data: PersonSummaryItem; timestamp: number }>;

  // Actions
  setRoleFilter: (role: 'all' | 'employee' | 'visitor') => void;
  setDateFilter: (date: string) => void;
  setSearchQuery: (query: string) => void;
  setShowHourlyAnalytics: (show: boolean) => void;
  setIsDailyCheckinOpen: (open: boolean) => void;

  fetchPeople: (force?: boolean) => Promise<void>;
  deleteVisitor: (personId: string) => Promise<void>;
  fetchPersonJourney: (
    personId: string,
    personType?: 'employee' | 'visitor',
    date?: string,
    force?: boolean
  ) => Promise<{ timeline: PersonTimelineResponse | null; info: PersonSummaryItem | null }>;
  invalidateCache: () => void;
}

const CACHE_TTL_MS = 60 * 1000; // 60 seconds in-memory cache freshness

export const usePeopleStore = create<PeopleState>((set, get) => ({
  people: [],
  isLoading: false,
  lastFetched: null,

  roleFilter: 'all',
  dateFilter: '',
  searchQuery: '',
  showHourlyAnalytics: false,
  isDailyCheckinOpen: false,

  timelineCache: {},
  personInfoCache: {},

  setRoleFilter: (roleFilter) => {
    set({ roleFilter });
    get().fetchPeople(true);
  },

  setDateFilter: (dateFilter) => {
    set({ dateFilter });
    get().fetchPeople(true);
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setShowHourlyAnalytics: (showHourlyAnalytics) => set({ showHourlyAnalytics }),
  setIsDailyCheckinOpen: (isDailyCheckinOpen) => set({ isDailyCheckinOpen }),

  fetchPeople: async (force = false) => {
    const { people, lastFetched, roleFilter, dateFilter, searchQuery } = get();
    const now = Date.now();

    // If we have cached data, not forced, and within TTL, don't show loading spinner or re-fetch
    if (!force && people.length > 0 && lastFetched && now - lastFetched < CACHE_TTL_MS) {
      return;
    }

    // If we already have some people, keep them visible while refreshing in background
    if (people.length === 0) {
      set({ isLoading: true });
    }

    try {
      const res = await listPeopleDirectory({
        person_type: roleFilter,
        date: dateFilter || undefined,
        search: searchQuery || undefined,
      });

      if (res?.data) {
        set({
          people: res.data,
          lastFetched: Date.now(),
        });
      }
    } catch (err: any) {
      // Keep existing data on transient network errors
    } finally {
      set({ isLoading: false });
    }
  },

  deleteVisitor: async (personId: string) => {
    try {
      const res = await deleteVisitorIdentity(personId);
      toast.success(res?.message || 'Visitor profile deleted successfully');

      // Optimistic Instant Removal from Store
      set((state) => {
        const nextPeople = state.people.filter((p) => p.person_id !== personId);
        const nextTimelineCache = { ...state.timelineCache };
        delete nextTimelineCache[personId];
        const nextInfoCache = { ...state.personInfoCache };
        delete nextInfoCache[personId];

        return {
          people: nextPeople,
          timelineCache: nextTimelineCache,
          personInfoCache: nextInfoCache,
        };
      });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete visitor profile');
    }
  },

  fetchPersonJourney: async (personId, personType = 'visitor', date, force = false) => {
    const { timelineCache, personInfoCache, people } = get();
    const now = Date.now();
    const cacheKey = `${personId}-${date || 'all'}`;

    // 1. Check in-memory journey cache
    const cachedTimeline = timelineCache[cacheKey];
    const cachedInfo = personInfoCache[personId];

    if (!force && cachedTimeline && now - cachedTimeline.timestamp < CACHE_TTL_MS) {
      return {
        timeline: cachedTimeline.data,
        info: cachedInfo?.data || people.find((p) => p.person_id === personId) || null,
      };
    }

    // 2. Fetch fresh journey timeline from API
    try {
      const [timelineRes, directoryRes] = await Promise.all([
        getPersonTimeline(personType, personId, date),
        people.length === 0 ? listPeopleDirectory({ search: personId }) : Promise.resolve(null),
      ]);

      const timeline = timelineRes?.data || null;
      let info = people.find((p) => p.person_id === personId) || null;
      if (!info && directoryRes?.data && directoryRes.data.length > 0) {
        info = directoryRes.data.find((p) => p.person_id === personId) || directoryRes.data[0];
      }

      if (timeline) {
        set((state) => ({
          timelineCache: {
            ...state.timelineCache,
            [cacheKey]: { data: timeline, timestamp: Date.now() },
          },
          ...(info
            ? {
                personInfoCache: {
                  ...state.personInfoCache,
                  [personId]: { data: info, timestamp: Date.now() },
                },
              }
            : {}),
        }));
      }

      return { timeline, info };
    } catch (err) {
      return {
        timeline: cachedTimeline?.data || null,
        info: cachedInfo?.data || null,
      };
    }
  },

  invalidateCache: () => {
    set({
      lastFetched: null,
      timelineCache: {},
      personInfoCache: {},
    });
  },
}));
