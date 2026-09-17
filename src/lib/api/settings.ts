import { apiClient, handleApiError } from '@/lib/apiClient';

export interface SettingItem {
  key: string;
  label: string;
  value: any;
  type: 'string' | 'number' | 'boolean';
  category: string;
  unit?: string;
  recommended_range?: string;
  description: string;
  env_source: string;
}

export interface SettingsCategory {
  id: string;
  name: string;
  description: string;
  parameters: SettingItem[];
}

export interface SystemSettingsData {
  raw_parameters: Record<string, any>;
  categories: SettingsCategory[];
  environment: string;
  server_time: string;
  instructions: string;
}

export interface StandardResponse<T> {
  message: string;
  status: number;
  data: T;
}

/**
 * Fetch dynamic system settings and environment variables from backend runtime
 */
export async function fetchSystemSettings(): Promise<SystemSettingsData> {
  try {
    const response = await apiClient.get<StandardResponse<SystemSettingsData>>('/settings');
    if (response.data && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to fetch system settings');
  } catch (error) {
    return handleApiError(error, 'Could not retrieve system environment parameters');
  }
}
