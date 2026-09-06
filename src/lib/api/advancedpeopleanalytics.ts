import { apiClient, handleApiError, API_BASE_URL } from '../apiClient';
import type { ApiResponse } from '@/types/gallery';
import type {
  CameraNode,
  CameraNodeLink,
  CameraZone,
  AdvancedAnalyticsSession,
  SessionDetectedPerson,
  PersonSummaryItem,
  PersonTimelineResponse,
  RegisterVisitorPayload,
} from '@/types/advancedpeopleanalytics';

export const APA_ENDPOINTS = {
  CAMERAS: '/advancedpeopleanalytics/cameras',
  CAMERA_LINKS: '/advancedpeopleanalytics/cameras/links',
  ZONES: (cameraId: string) => `/advancedpeopleanalytics/cameras/${cameraId}/zones`,
  PROCESS: '/advancedpeopleanalytics/process',
  SESSIONS: '/advancedpeopleanalytics/sessions',
  SESSION_DETAIL: (id: string) => `/advancedpeopleanalytics/sessions/${id}`,
  SESSION_PEOPLE: (id: string) => `/advancedpeopleanalytics/sessions/${id}/people`,
  SESSION_VIDEO: (id: string) => `/advancedpeopleanalytics/sessions/${id}/video`,
  PEOPLE: '/advancedpeopleanalytics/people',
  TIMELINE: '/advancedpeopleanalytics/timeline',
  ASSOCIATE: '/advancedpeopleanalytics/associate',
  REGISTER_VISITOR: '/advancedpeopleanalytics/visitors/register',
  ADD_FROM_FACE: '/advancedpeopleanalytics/visitors/add-from-face',
  RESET: '/advancedpeopleanalytics/reset',
};

// ==========================================
// CAMERAS & SPATIAL TOPOLOGY
// ==========================================

export async function createCameraNode(data: {
  name: string;
  location_label?: string;
  label?: string;
  description?: string;
  location_desc?: string;
  is_entry_point?: boolean;
  x_coord?: number;
  y_coord?: number;
  fov_angle?: number;
  fov_depth?: number;
}): Promise<ApiResponse<CameraNode>> {
  try {
    const payload = {
      ...data,
      location_label: data.location_label || data.location_desc || data.label,
    };
    const response = await apiClient.post<ApiResponse<CameraNode>>(APA_ENDPOINTS.CAMERAS, payload);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to create camera node');
  }
}

export async function updateCameraNode(
  cameraId: string,
  data: {
    name?: string;
    location_label?: string;
    location_desc?: string;
    label?: string;
  }
): Promise<ApiResponse<CameraNode>> {
  try {
    const payload = {
      ...data,
      location_label: data.location_label || data.location_desc || data.label,
    };
    const response = await apiClient.put<ApiResponse<CameraNode>>(`${APA_ENDPOINTS.CAMERAS}/${cameraId}`, payload);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to update camera node');
  }
}

export async function listCameraNodes(): Promise<ApiResponse<CameraNode[]>> {
  try {
    const response = await apiClient.get<ApiResponse<CameraNode[]>>(APA_ENDPOINTS.CAMERAS);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to fetch camera nodes');
  }
}

export async function deleteCameraNode(cameraId: string): Promise<ApiResponse<null>> {
  try {
    const response = await apiClient.delete<ApiResponse<null>>(`${APA_ENDPOINTS.CAMERAS}/${cameraId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to delete camera node');
  }
}

export async function createCameraNodeLink(data: {
  from_camera_id: string;
  to_camera_id: string;
  min_transit_time_seconds: number;
  avg_transit_time_seconds: number;
  max_transit_time_seconds: number;
  is_bidirectional: boolean;
}): Promise<ApiResponse<CameraNodeLink>> {
  try {
    const response = await apiClient.post<ApiResponse<CameraNodeLink>>(APA_ENDPOINTS.CAMERA_LINKS, data);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to create camera link');
  }
}

export async function listCameraNodeLinks(): Promise<ApiResponse<CameraNodeLink[]>> {
  try {
    const response = await apiClient.get<ApiResponse<CameraNodeLink[]>>(APA_ENDPOINTS.CAMERA_LINKS);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to list camera links');
  }
}

export async function deleteCameraNodeLink(linkId: string): Promise<ApiResponse<null>> {
  try {
    const response = await apiClient.delete<ApiResponse<null>>(`${APA_ENDPOINTS.CAMERA_LINKS}/${linkId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to delete camera link');
  }
}

export async function addCameraZone(
  cameraId: string,
  data: {
    name: string;
    zone_type: string;
    polygon_coordinates?: number[][];
    min_dwell_threshold_seconds: number;
  },
): Promise<ApiResponse<CameraZone>> {
  try {
    const response = await apiClient.post<ApiResponse<CameraZone>>(APA_ENDPOINTS.ZONES(cameraId), data);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to add camera zone');
  }
}

export async function listCameraZones(cameraId: string): Promise<ApiResponse<CameraZone[]>> {
  try {
    const response = await apiClient.get<ApiResponse<CameraZone[]>>(APA_ENDPOINTS.ZONES(cameraId));
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to list camera zones');
  }
}

// ==========================================
// PROCESSING SESSIONS
// ==========================================

export async function processBatchSessions(payload: {
  videos: Array<{
    gallery_media_id?: string;
    direct_video_path?: string;
    camera_id?: string;
    camera_name?: string;
    video_source_type: string;
    line_start?: number[] | null;
    line_end?: number[] | null;
  }>;
  global_line_start?: number[] | null;
  global_line_end?: number[] | null;
  similarity_threshold?: number;
  confidence_threshold?: number;
  track_employees?: boolean;
  register_new_visitors?: boolean;
  track_repeat_visitors?: boolean;
  line_crossing_analysis?: boolean;
  track_occupancy?: boolean;
}): Promise<ApiResponse<AdvancedAnalyticsSession[]>> {
  try {
    const response = await apiClient.post<ApiResponse<AdvancedAnalyticsSession[]>>(
      APA_ENDPOINTS.PROCESS,
      payload,
    );
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to initiate video processing');
  }
}

export async function listAnalyticsSessions(): Promise<ApiResponse<AdvancedAnalyticsSession[]>> {
  try {
    const response = await apiClient.get<ApiResponse<AdvancedAnalyticsSession[]>>(APA_ENDPOINTS.SESSIONS);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to fetch sessions');
  }
}

export async function getSessionDetails(sessionId: string): Promise<ApiResponse<AdvancedAnalyticsSession>> {
  try {
    const response = await apiClient.get<ApiResponse<AdvancedAnalyticsSession>>(
      APA_ENDPOINTS.SESSION_DETAIL(sessionId),
    );
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to fetch session details');
  }
}

export async function deleteAdvancedSession(sessionId: string): Promise<ApiResponse<null>> {
  try {
    const response = await apiClient.delete<ApiResponse<null>>(
      APA_ENDPOINTS.SESSION_DETAIL(sessionId),
    );
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to delete session');
  }
}

export async function getSessionDetectedPeople(sessionId: string): Promise<ApiResponse<SessionDetectedPerson[]>> {
  try {
    const response = await apiClient.get<ApiResponse<SessionDetectedPerson[]>>(
      APA_ENDPOINTS.SESSION_PEOPLE(sessionId),
    );
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to fetch detected people');
  }
}

export function getAnnotatedVideoUrl(sessionId: string): string {
  return `${API_BASE_URL}${APA_ENDPOINTS.SESSION_VIDEO(sessionId)}`;
}

// ==========================================
// PEOPLE & SPATIAL TIMELINE
// ==========================================

export async function listPeopleDirectory(params?: {
  date?: string;
  person_type?: string;
  search?: string;
}): Promise<ApiResponse<PersonSummaryItem[]>> {
  try {
    const cleanParams: Record<string, string> = {};
    if (params?.date) cleanParams.date = params.date;
    if (params?.person_type && params.person_type !== 'all') cleanParams.person_type = params.person_type;
    if (params?.search) cleanParams.search = params.search;

    const response = await apiClient.get<ApiResponse<PersonSummaryItem[]>>(APA_ENDPOINTS.PEOPLE, {
      params: cleanParams,
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to fetch people directory');
  }
}

export async function getPersonTimeline(
  personType: 'employee' | 'visitor',
  personId: string,
  date?: string,
): Promise<ApiResponse<PersonTimelineResponse>> {
  try {
    const params: Record<string, string> = {
      person_type: personType,
      person_id: personId,
    };
    if (date) params.date = date;

    const response = await apiClient.get<ApiResponse<PersonTimelineResponse>>(APA_ENDPOINTS.TIMELINE, {
      params,
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to fetch person timeline');
  }
}

export async function registerOrUpdateVisitor(payload: RegisterVisitorPayload): Promise<ApiResponse<any>> {
  try {
    const response = await apiClient.post<ApiResponse<any>>(APA_ENDPOINTS.REGISTER_VISITOR, payload);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to register person');
  }
}

export async function addPersonFromFacePhoto(formData: FormData): Promise<ApiResponse<any>> {
  try {
    const response = await apiClient.post<ApiResponse<any>>(APA_ENDPOINTS.ADD_FROM_FACE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to enroll person from face photo');
  }
}

export async function triggerCrossCameraAssociation(sessionIds: string[]): Promise<ApiResponse<number>> {
  try {
    const response = await apiClient.post<ApiResponse<number>>(APA_ENDPOINTS.ASSOCIATE, {
      session_ids: sessionIds,
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to trigger cross-camera association');
  }
}

export async function resetAnalyticsData(): Promise<ApiResponse<any>> {
  try {
    const response = await apiClient.post<ApiResponse<any>>(APA_ENDPOINTS.RESET);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to reset analytics data');
  }
}
