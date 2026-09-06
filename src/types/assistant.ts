export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    entities?: Array<{
      type: 'person' | 'camera' | 'zone' | 'date';
      id?: string;
      label: string;
    }>;
    suggested_actions?: string[];
  };
}

export interface AssistantQueryPayload {
  workspace_id?: string;
  question: string;
  session_id?: string;
}

export interface AssistantQueryResponse {
  answer: string;
  session_id?: string;
  entities?: Array<{
    type: 'person' | 'camera' | 'zone' | 'date';
    id?: string;
    label: string;
  }>;
}
