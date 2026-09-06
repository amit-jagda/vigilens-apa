export interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  tenant_id: string;
  organization_name?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  user?: UserProfile;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  address?: string;
  floor_plan_url?: string;
  created_at?: string;
}
