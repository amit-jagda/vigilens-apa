import { apiClient, handleApiError, parseApiError } from '../apiClient';
import type { ApiResponse } from '@/types/gallery';
import type { UserProfile } from '@/types/auth';

export async function loginUser(email: string, password: string): Promise<UserProfile> {
  try {
    const response = await apiClient.post<ApiResponse<UserProfile>>('/auth/login', {
      email,
      password,
    });

    const user = response.data?.data;
    if (typeof window !== 'undefined' && user) {
      localStorage.setItem('vigilens_user', JSON.stringify(user));
    }
    return user;
  } catch (error: any) {
    const msg = parseApiError(error?.response?.data, 'Login failed');
    throw new Error(msg);
  }
}

export async function registerUser(payload: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  tenant_id?: string;
}): Promise<UserProfile> {
  try {
    const response = await apiClient.post<ApiResponse<UserProfile>>('/auth/register', payload);
    const user = response.data?.data;
    if (typeof window !== 'undefined' && user) {
      localStorage.setItem('vigilens_user', JSON.stringify(user));
    }
    return user;
  } catch (error: any) {
    const msg = parseApiError(error?.response?.data, 'Registration failed');
    throw new Error(msg);
  }
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const response = await apiClient.get<ApiResponse<UserProfile>>('/auth/me');
    return response.data?.data || null;
  } catch (error) {
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await apiClient.post('/auth/logout');
  } catch (err) {
    // Ignore error on logout
  } finally {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vigilens_user');
      localStorage.removeItem('vigilens_access_token');
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
  }
}
