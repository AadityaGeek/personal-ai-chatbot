export type MessageRole = 'user' | 'assistant';

export interface SourceItem {
  id: string;
  title: string;
  url?: string;
  category?: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  sources?: SourceItem[];
  isError?: boolean;
  isOffline?: boolean;
}

export interface QuickPrompt {
  id: string;
  title: string;
  prompt: string;
}

export interface ChatRequestPayload {
  message: string;
  history: Array<{
    role: MessageRole;
    content: string;
  }>;
}

export interface ChatResponsePayload {
  response: string;
  sources: SourceItem[];
}

export const INITIAL_GREETING: Message = {
  id: 'greeting',
  role: 'assistant',
  content: "👋 Hello! I am the **AI Chatbot Assistant**.\n\nI can answer any technical questions about how this chatbot works, its FastAPI backend, React/Tailwind frontend, **vector embeddings & semantic search**, and how to embed it on your website.\n\n*(Note: For security, internal system prompts, secret flows, and credentials remain confidential.)*\n\nHow can I help you today?",
  timestamp: new Date(),
};
