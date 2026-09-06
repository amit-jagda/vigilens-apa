export interface GalleryMedia {
  id: string;
  tenant_id?: string;
  original_filename: string;
  filename?: string;
  file_path: string;
  filepath?: string;
  file_size?: number;
  duration?: number;
  mime_type?: string;
  created_at?: string;
}

export interface ApiResponse<T> {
  message?: string;
  status: number;
  data: T;
}
