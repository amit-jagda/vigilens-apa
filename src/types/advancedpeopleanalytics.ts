export interface CameraNode {
  id: string;
  name: string;
  location_label?: string;
  region?: string;
  label?: string;
  description?: string;
  location_desc?: string;
  is_entry_point?: boolean;
  x_coord?: number;
  y_coord?: number;
  fov_angle?: number;
  fov_depth?: number;
  created_at?: string;
}

export interface CameraNodeLink {
  id: string;
  from_camera_id: string;
  to_camera_id: string;
  min_transit_time_seconds: number;
  avg_transit_time_seconds: number;
  max_transit_time_seconds: number;
  is_bidirectional: boolean;
  created_at?: string;
}

export interface CameraZone {
  id: string;
  camera_id: string;
  name: string;
  zone_type: 'entry' | 'exit' | 'dwell' | 'transit' | 'restricted';
  polygon_coordinates?: number[][];
  min_dwell_threshold_seconds: number;
}

export interface CameraZoneLink {
  id: string;
  from_zone_id: string;
  to_zone_id: string;
  min_transit_time_seconds: number;
  max_transit_time_seconds: number;
}

export interface AdvancedAnalyticsSession {
  id: string;
  tenant_id: string;
  gallery_media_id?: string;
  video_name: string;
  video_path?: string;
  output_video_path?: string;
  generate_video?: boolean;
  start_time_sec?: number | null;
  end_time_sec?: number | null;
  file_size?: number;
  status: string;
  progress?: number;
  completed_percentage?: number;
  current_step?: string;
  eta_seconds?: number;
  error_message?: string;
  total_people_detected?: number;
  total_person_count?: number;
  unique_person_count?: number;
  unique_visitors_count?: number;
  visitor_count?: number;
  first_time_visitor_count?: number;
  employees_detected_count?: number;
  employee_count?: number;
  line_crossings_in_count?: number;
  entry_count?: number;
  line_crossings_out_count?: number;
  exit_count?: number;
  started_at?: string;
  completed_at?: string;
  recording_started_at?: string;
  created_at: string;
}

export interface PersonAppearanceSegment {
  first_seen_sec: number;
  last_seen_sec: number;
  duration_seconds: number;
  formatted_time: string;
}

export interface SessionDetectedPerson {
  identity_id?: string;
  employee_id?: string;
  person_type: 'visitor' | 'employee';
  name: string;
  tracker_id: number;
  crop_url?: string;
  first_seen: number;
  last_seen: number;
  first_seen_sec?: number;
  last_seen_sec?: number;
  duration_seconds?: number;
  formatted_time?: string;
  zone_name?: string;
  sequence_number?: number;
  started_at: string;
  ended_at: string;
  confidence: number;
  identity_source: string;
  camera_name?: string;
  appearances_count?: number;
  segments?: PersonAppearanceSegment[];
}

export interface PersonSummaryItem {
  person_type: 'employee' | 'visitor';
  person_id: string;
  identity_id?: string;
  name: string;
  employee_code?: string;
  crop_url?: string;
  total_dwell_seconds: number;
  camera_stops_count: number;
  cameras_visited: string[];
  first_seen_at: string;
  last_seen_at: string;
  latest_event_type: string;
}

export interface TimelineEventItem {
  id: string;
  session_id: string;
  camera_name: string;
  zone_name?: string;
  event_type: string;
  started_at: string;
  ended_at: string;
  identity_source: string;
  identity_confidence: number;
  tracker_id: number;
  duration_seconds: number;
}

export interface PersonTimelineResponse {
  person_id: string;
  person_type: string;
  date?: string;
  events: TimelineEventItem[];
}

export interface RegisterVisitorPayload {
  identity_id: string;
  first_name?: string;
  last_name?: string;
  registration_type: 'visitor' | 'employee' | 'new_employee' | 'link_existing_employee';
  employee_code?: string;
  existing_employee_id?: string;
  retroactive_attendance?: boolean;
  force?: boolean;
}

export interface DailyCheckinResponse {
  employee_id: string;
  employee_name: string;
  employee_code?: string;
  checkin_date: string;
  face_registered: boolean;
  appearance_anchored: boolean;
  message: string;
}

export interface HourlyAreaDwellItem {
  hour: string;
  hour_int: number;
  total_dwell_seconds: number;
  portion_of_hour: number;
  formatted_duration: string;
  areas: Record<string, number>;
}

export interface HourlyDwellResponse {
  target_date: string;
  person_id?: string;
  person_name?: string;
  all_areas: string[];
  hourly_data: HourlyAreaDwellItem[];
}

export interface ReviewQueueCandidate {
  identity_id: string;
  crop_url?: string;
  first_seen_at?: string;
  last_seen_at?: string;
  total_dwell_seconds: number;
  camera_stops_count: number;
  cameras_visited: string[];
  suggested_employee_id?: string;
  suggested_employee_name?: string;
  suggested_similarity?: number;
}

export interface ReconcileIdentityPayload {
  target_employee_id?: string;
  or_visitor_name?: string;
  auto_merge_similar?: boolean;
  similarity_threshold?: number;
}

export interface PhotoSearchAppearanceItem {
  session_id?: string;
  camera_id?: string;
  camera_name: string;
  zone_name?: string | null;
  timestamp: string;
  timestamp_offset_seconds?: number;
  dwell_seconds?: number;
  crop_url?: string | null;
  thumbnail_url?: string | null;
  event_type?: string;
}

export interface PhotoSearchMatchItem {
  identity_type: 'employee' | 'visitor';
  identity_id: string;
  name: string;
  code?: string | null;
  similarity_score: number;
  similarity_percentage: string;
  matched_via: string;
  primary_photo_url?: string | null;
  total_appearances: number;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
  timeline_events: PhotoSearchAppearanceItem[];
}

export interface PhotoSearchResponse {
  query_processed: boolean;
  face_detected_in_query: boolean;
  appearance_extracted: boolean;
  total_matches_found: number;
  matches: PhotoSearchMatchItem[];
}
