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

export interface SessionDetectedPerson {
  identity_id?: string;
  employee_id?: string;
  person_type: 'visitor' | 'employee';
  name: string;
  tracker_id: number;
  crop_url?: string;
  first_seen: number;
  last_seen: number;
  started_at: string;
  ended_at: string;
  confidence: number;
  identity_source: string;
  camera_name?: string;
}

export interface PersonSummaryItem {
  person_type: 'employee' | 'visitor';
  person_id: string;
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
  first_name: string;
  last_name: string;
  registration_type: 'visitor' | 'employee';
  employee_code?: string;
}
