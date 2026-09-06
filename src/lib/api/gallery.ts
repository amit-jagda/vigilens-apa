import { apiClient, handleApiError } from '../apiClient';
import type { GalleryMedia, ApiResponse } from '@/types/gallery';

/** Upload one or more photo/video files to the centralized gallery (/gallery/media) */
export async function uploadGalleryMedia(
  files: File[] | File,
  mediaType: 'photo' | 'video' = 'video',
): Promise<ApiResponse<GalleryMedia[]>> {
  try {
    const fileArray = Array.isArray(files) ? files : [files];
    const formData = new FormData();
    fileArray.forEach((f) => formData.append('files', f));
    formData.append('media_type', mediaType);

    const response = await apiClient.post<ApiResponse<GalleryMedia[]>>('/gallery/media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to upload video media to gallery');
  }
}

/** List all uploaded gallery media for the current tenant */
export async function listGalleryMedia(
  mediaType?: 'photo' | 'video',
): Promise<ApiResponse<GalleryMedia[]>> {
  try {
    const params = mediaType ? { media_type: mediaType } : {};
    const response = await apiClient.get<ApiResponse<GalleryMedia[]>>('/gallery/media', { params });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to list gallery media');
  }
}

/** Delete a single gallery media item */
export async function deleteGalleryMedia(mediaId: string): Promise<ApiResponse<null>> {
  try {
    const response = await apiClient.delete<ApiResponse<null>>(`/gallery/media/${mediaId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to delete gallery media');
  }
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

/** Returns the display URL for a gallery media asset */
export function getGalleryMediaUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  return `${BACKEND_URL}/${normalized}`;
}
