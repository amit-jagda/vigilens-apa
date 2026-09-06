/** A registered employee */
export interface Employee {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  employee_code: string;
  photo_path: string | null;
  is_active: boolean;
  created_at: string;
}

/** An attendance log entry linking an employee to a session */
export interface AttendanceLog {
  id: string;
  session_id: string | null;
  employee: Employee;
  first_seen: number;
  last_seen: number;
  occurrence_count: number;
  employee_entry_timestamp: string;
  employee_exit_timestamp: string;
  created_at: string;
  dwell_time: number;
}

/** A standalone attendance video session */
export interface AttendanceVideoSession {
  id: string;
  tenant_id: string;
  video_name: string;
  video_path: string;
  output_video_path: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  line_start: [number, number] | null;
  line_end: [number, number] | null;
  similarity_threshold: number;
  confidence_threshold: number;
  unique_person_count: number | null;
  total_person_count: number | null;
  first_time_visitor_count: number | null;
  peak_occupancy: number | null;
  average_occupancy: number | null;
  entry_count: number | null;
  exit_count: number | null;
  occupancy_timeline: { time_sec: number; occupancy: number }[] | null;
  created_at: string;
  completed_at: string | null;
}

/** An uploaded attendance video (before processing) */
export interface AttendanceUploadedVideo {
  id: string;
  tenant_id: string;
  original_name: string;
  saved_path: string;
  created_at: string;
}

/** Result of group photo attendance marking */
export interface GroupPhotoResult {
  annotated_image_path: string;
  attendance_logs: AttendanceLog[];
}
