import { create } from 'zustand';
import toast from 'react-hot-toast';
import {
  listEmployees,
  registerEmployee,
  updateEmployee,
  deleteEmployee,
  getAttendanceByDateRange,
  uploadAttendanceVideos,
  deleteAttendanceUpload,
  processAttendanceVideos,
  listAttendanceSessions,
  getEmployeePhotoUrl,
  processGroupPhotoAttendance,
  deleteAttendanceSession,
} from '@/lib/api/employees';
import { ApiError } from '@/types/api';
import type {
  Employee,
  AttendanceLog,
  AttendanceVideoSession,
  AttendanceUploadedVideo,
  GroupPhotoResult,
} from '@/types/employees';
import { listGalleryMedia } from '@/lib/api/gallery';
import type { GalleryMedia } from '@/types/gallery';

type Tab = 'employees' | 'uploads' | 'results' | 'logs';
type UploadSubTab = 'groupphoto' | 'video';

interface AttendanceState {
  // Tabs
  activeTab: Tab;
  uploadSubTab: UploadSubTab;
  setActiveTab: (tab: Tab) => void;
  setUploadSubTab: (tab: UploadSubTab) => void;

  // Employees
  employees: Employee[];
  employeesLoading: boolean;
  employeeSearch: string;
  drawerOpen: boolean;
  editTarget: Employee | null;
  saving: boolean;
  deleteConfirm: Employee | null;
  firstName: string;
  lastName: string;
  empCode: string;
  photoFile: File | null;
  photoPreview: string | null;
  setEmployeeSearch: (v: string) => void;
  setDrawerOpen: (v: boolean) => void;
  setDeleteConfirm: (e: Employee | null) => void;
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  setEmpCode: (v: string) => void;
  setPhotoFile: (file: File | null, preview: string | null) => void;
  fetchEmployees: () => Promise<void>;
  openRegister: () => void;
  openEdit: (emp: Employee) => void;
  saveEmployee: () => Promise<void>;
  deleteEmployee: (emp: Employee) => Promise<void>;

  // Attendance Sessions
  attSessions: AttendanceVideoSession[];
  fetchAttSessions: () => Promise<void>;
  deleteAttSession: (sessionId: string) => Promise<void>;

  // Group Photo
  groupPhoto: File | null;
  groupPhotoPreview: string | null;
  groupPhotoResult: GroupPhotoResult | null;
  markingAttendance: boolean;
  simThreshold: number;
  confThreshold: number;
  setGroupPhoto: (file: File | null, preview: string | null) => void;
  setSimThreshold: (v: number) => void;
  setConfThreshold: (v: number) => void;
  markGroupPhoto: () => Promise<void>;

  // Attendance Video Uploads
  attUploads: AttendanceUploadedVideo[];
  attUploading: boolean;
  selectedAttSession: AttendanceVideoSession | null;
  historyOpen: boolean;
  addAttUploads: (files: File[]) => Promise<void>;
  removeAttUpload: (id: string) => Promise<void>;
  processAttVideos: () => Promise<void>;
  setSelectedAttSession: (s: AttendanceVideoSession | null) => void;
  setHistoryOpen: (v: boolean) => void;

  // Global Media Gallery States & Actions
  galleryPhotos: GalleryMedia[];
  galleryVideos: GalleryMedia[];
  loadingGallery: boolean;
  selectedPhotoId: string | null;
  selectedVideoIds: string[];
  fetchGalleryMedia: () => Promise<void>;
  setSelectedPhotoId: (id: string | null) => void;
  toggleSelectVideoId: (id: string) => void;
  clearSelection: () => void;

  // Logs
  startDate: string;
  endDate: string;
  logs: AttendanceLog[];
  logsLoading: boolean;
  setStartDate: (v: string) => void;
  setEndDate: (v: string) => void;
  fetchLogs: () => Promise<void>;
  todayLogs: AttendanceLog[];
  fetchTodayLogs: () => Promise<void>;
}

function toDateInput(date: Date) {
  return date.toISOString().split('T')[0];
}
const today = toDateInput(new Date());
const monthStart = toDateInput(new Date(new Date().setDate(1)));

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  activeTab: 'employees',
  uploadSubTab: 'groupphoto',
  setActiveTab: (tab) => set({ activeTab: tab }),
  setUploadSubTab: (tab) => set({ uploadSubTab: tab }),

  employees: [],
  employeesLoading: true,
  employeeSearch: '',
  drawerOpen: false,
  editTarget: null,
  saving: false,
  deleteConfirm: null,
  firstName: '',
  lastName: '',
  empCode: '',
  photoFile: null,
  photoPreview: null,

  setEmployeeSearch: (v) => set({ employeeSearch: v }),
  setDrawerOpen: (v) => set({ drawerOpen: v }),
  setDeleteConfirm: (e) => set({ deleteConfirm: e }),
  setFirstName: (v) => set({ firstName: v }),
  setLastName: (v) => set({ lastName: v }),
  setEmpCode: (v) => set({ empCode: v }),
  setPhotoFile: (file, preview) =>
    set({ photoFile: file, photoPreview: preview }),

  fetchEmployees: async () => {
    set({ employeesLoading: true });
    try {
      const res = await listEmployees();
      set({ employees: res.data });
      await get().fetchTodayLogs();
    } catch {
      /* silent */
    } finally {
      set({ employeesLoading: false });
    }
  },

  openRegister: () =>
    set({
      editTarget: null,
      firstName: '',
      lastName: '',
      empCode: '',
      photoFile: null,
      photoPreview: null,
      drawerOpen: true,
    }),

  openEdit: (emp) =>
    set({
      editTarget: emp,
      firstName: emp.first_name,
      lastName: emp.last_name,
      empCode: emp.employee_code,
      photoFile: null,
      photoPreview: emp.photo_path ? getEmployeePhotoUrl(emp.photo_path) : null,
      drawerOpen: true,
    }),

  saveEmployee: async () => {
    const { firstName, lastName, empCode, photoFile, editTarget } = get();

    // Validate first_name
    if (!firstName) {
      toast.error('First name cannot be empty');
      return;
    }
    if (firstName.startsWith(' ') || firstName.endsWith(' ')) {
      toast.error('First name cannot start or end with spaces');
      return;
    }
    const cleanedFirstName = firstName;
    if (cleanedFirstName.length > 50) {
      toast.error('First name must be between 1 and 50 characters');
      return;
    }
    if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(cleanedFirstName)) {
      toast.error(
        'First name can only contain letters, spaces, hyphens, or apostrophes',
      );
      return;
    }

    // Validate last_name
    if (!lastName) {
      toast.error('Last name cannot be empty');
      return;
    }
    if (lastName.startsWith(' ') || lastName.endsWith(' ')) {
      toast.error('Last name cannot start or end with spaces');
      return;
    }
    const cleanedLastName = lastName;
    if (cleanedLastName.length > 50) {
      toast.error('Last name must be between 1 and 50 characters');
      return;
    }
    if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(cleanedLastName)) {
      toast.error(
        'Last name can only contain letters, spaces, hyphens, or apostrophes',
      );
      return;
    }

    // Validate employee_code
    if (!empCode) {
      toast.error('Employee code cannot be empty');
      return;
    }
    if (empCode.startsWith(' ') || empCode.endsWith(' ')) {
      toast.error('Employee code cannot start or end with spaces');
      return;
    }
    const cleanedCode = empCode;
    if (cleanedCode.length < 2 || cleanedCode.length > 30) {
      toast.error('Employee code must be between 2 and 30 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanedCode)) {
      toast.error(
        'Employee code can only contain alphanumeric characters, hyphens, or underscores',
      );
      return;
    }

    if (!editTarget && !photoFile) {
      toast.error('Photo is required for new employees');
      return;
    }
    set({ saving: true });
    try {
      const fd = new FormData();
      fd.append('first_name', firstName);
      fd.append('last_name', lastName);
      fd.append('employee_code', empCode);
      if (photoFile) fd.append('file', photoFile);
      if (editTarget) {
        await updateEmployee(editTarget.id, fd);
        toast.success('Employee updated');
      } else {
        await registerEmployee(fd);
        toast.success('Employee registered');
      }
      set({ drawerOpen: false });
      await get().fetchEmployees();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      set({ saving: false });
    }
  },

  deleteEmployee: async (emp) => {
    try {
      await deleteEmployee(emp.id);
      toast.success('Employee deleted');
      set((s) => ({
        employees: s.employees.filter((e) => e.id !== emp.id),
        deleteConfirm: null,
      }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Delete failed');
    }
  },

  attSessions: [],
  fetchAttSessions: async () => {
    try {
      const res = await listAttendanceSessions();
      set({ attSessions: res.data });
    } catch {
      /* silent */
    }
  },

  deleteAttSession: async (sessionId) => {
    try {
      await deleteAttendanceSession(sessionId);
      toast.success('Session deleted successfully');
      set((s) => ({
        attSessions: s.attSessions.filter((x) => x.id !== sessionId),
        selectedAttSession:
          s.selectedAttSession?.id === sessionId ? null : s.selectedAttSession,
      }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Delete failed');
    }
  },

  groupPhoto: null,
  groupPhotoPreview: null,
  groupPhotoResult: null,
  markingAttendance: false,
  simThreshold: 0.85,
  confThreshold: 0.3,
  setGroupPhoto: (file, preview) =>
    set({
      groupPhoto: file,
      groupPhotoPreview: preview,
      groupPhotoResult: null,
    }),
  setSimThreshold: (v) => set({ simThreshold: v }),
  setConfThreshold: (v) => set({ confThreshold: v }),

  markGroupPhoto: async () => {
    const { selectedPhotoId, simThreshold, confThreshold } = get();
    if (!selectedPhotoId) return;
    set({ markingAttendance: true });
    try {
      const res = await processGroupPhotoAttendance({
        gallery_media_id: selectedPhotoId,
        similarity_threshold: simThreshold,
        confidence_threshold: confThreshold,
      });
      set({
        groupPhotoResult: res.data,
        selectedAttSession: null,
        activeTab: 'results',
      });
      toast.success(
        `Marked ${res.data.attendance_logs.length} employee(s) present`,
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to mark attendance',
      );
    } finally {
      set({ markingAttendance: false });
    }
  },

  attUploads: [],
  attUploading: false,
  selectedAttSession: null,
  historyOpen: false,

  addAttUploads: async (files) => {
    set({ attUploading: true });
    try {
      const res = await uploadAttendanceVideos(files);
      toast.success(`Uploaded ${res.data.length} video(s)`);
      set((s) => ({ attUploads: [...s.attUploads, ...res.data] }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      set({ attUploading: false });
    }
  },

  removeAttUpload: async (id) => {
    try {
      await deleteAttendanceUpload(id);
      set((s) => ({ attUploads: s.attUploads.filter((u) => u.id !== id) }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Delete failed');
    }
  },

  processAttVideos: async () => {
    const { selectedVideoIds } = get();
    if (selectedVideoIds.length === 0) return;
    try {
      const res = await processAttendanceVideos({
        videos: selectedVideoIds.map((id) => ({ gallery_media_id: id })),
      });
      toast.success(`Started ${res.data.length} session(s)`);
      set((s) => ({
        attSessions: [...res.data, ...s.attSessions],
        selectedVideoIds: [],
        selectedAttSession: res.data[0] ?? null,
        groupPhotoResult: null,
        activeTab: 'results',
      }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Processing failed');
    }
  },

  // Gallery States and Actions
  galleryPhotos: [],
  galleryVideos: [],
  loadingGallery: false,
  selectedPhotoId: null,
  selectedVideoIds: [],

  fetchGalleryMedia: async () => {
    set({ loadingGallery: true });
    try {
      const [photosRes, videosRes] = await Promise.all([
        listGalleryMedia('photo'),
        listGalleryMedia('video'),
      ]);
      set({
        galleryPhotos: photosRes.data || [],
        galleryVideos: videosRes.data || [],
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to retrieve media library assets');
    } finally {
      set({ loadingGallery: false });
    }
  },

  setSelectedPhotoId: (id) => set({ selectedPhotoId: id }),

  toggleSelectVideoId: (id) => {
    const { selectedVideoIds } = get();
    if (selectedVideoIds.includes(id)) {
      set({ selectedVideoIds: selectedVideoIds.filter((x) => x !== id) });
    } else {
      set({ selectedVideoIds: [...selectedVideoIds, id] });
    }
  },

  clearSelection: () => set({ selectedPhotoId: null, selectedVideoIds: [] }),

  setSelectedAttSession: (s) =>
    set({ selectedAttSession: s, groupPhotoResult: null }),
  setHistoryOpen: (v) => set({ historyOpen: v }),

  startDate: monthStart,
  endDate: today,
  logs: [],
  logsLoading: false,
  setStartDate: (v) => set({ startDate: v }),
  setEndDate: (v) => set({ endDate: v }),

  fetchLogs: async () => {
    const { startDate, endDate } = get();
    set({ logsLoading: true });
    try {
      const res = await getAttendanceByDateRange(startDate, endDate);
      set({ logs: res.data });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to fetch logs',
      );
    } finally {
      set({ logsLoading: false });
    }
  },

  todayLogs: [],
  fetchTodayLogs: async () => {
    const todayStr = toDateInput(new Date());
    try {
      const res = await getAttendanceByDateRange(todayStr, todayStr);
      set({ todayLogs: res.data });
    } catch {
      /* silent */
    }
  },
}));
