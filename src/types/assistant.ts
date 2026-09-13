export interface EntityItem {
  type: 'person' | 'camera' | 'zone' | 'date';
  id?: string;
  label: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    entities?: EntityItem[];
    suggested_actions?: string[];
    sql_query?: string;
    execution_time_ms?: number;
    model_used?: string;
    retry_count?: number;
    suggested_followups?: string[];
  };
}

export interface AssistantQueryPayload {
  workspace_id?: string;
  question: string;
  session_id?: string;
  conversation_history?: Array<{ role: string; content: string }>;
  model_name?: string;
}

export interface AssistantQueryResponse {
  answer: string;
  session_id?: string;
  sql_query?: string;
  raw_results?: Record<string, any>[];
  execution_time_ms?: number;
  model_used?: string;
  retry_count?: number;
  entities?: EntityItem[];
  suggested_followups?: string[];
}

export interface LLMModelInfo {
  status: string;
  provider?: string;
  base_url?: string;
  current_model: string;
  available_models: string[];
  error?: string;
}

export type OllamaModelInfo = LLMModelInfo;
