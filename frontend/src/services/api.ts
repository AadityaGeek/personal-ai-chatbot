import type { ChatRequestPayload, ChatResponsePayload, SourceItem } from '../types/chat';

// Resolve API base URL: defaults to local proxy '/api', or uses VITE_API_BASE_URL in production (e.g. Vercel)
const getApiBase = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!envUrl) {
    return '/api';
  }
  const cleanUrl = envUrl.replace(/\/+$/, '');
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};

const API_BASE = getApiBase();

export const FALLBACK_OFFLINE_MESSAGE =
  'The assistant is currently offline or unreachable. Please check that the backend server is running and try again.';

export class ChatApiError extends Error {
  status?: number;
  isOffline: boolean;

  constructor(message: string, status?: number, isOffline = false) {
    super(message);
    this.name = 'ChatApiError';
    this.status = status;
    this.isOffline = isOffline;
  }
}

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
    if (!res.ok) throw new Error(`Health check returned status ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend health check warning:', err);
    return null;
  }
}

export async function sendChatMessage(payload: ChatRequestPayload): Promise<ChatResponsePayload> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ChatApiError(FALLBACK_OFFLINE_MESSAGE, undefined, true);
  }

  if (!res.ok) {
    let errorDetail = 'Failed to get response from assistant.';
    try {
      const errorJson = await res.json();
      if (errorJson.detail) {
        errorDetail = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
      }
    } catch {
      // ignore json parse error
    }
    const isOffline = res.status === 502 || res.status === 503 || res.status === 504;
    throw new ChatApiError(isOffline ? FALLBACK_OFFLINE_MESSAGE : errorDetail, res.status, isOffline);
  }

  return await res.json();
}

export async function streamChatMessage(
  payload: ChatRequestPayload,
  onToken: (token: string) => void,
  onSources?: (sources: SourceItem[]) => void,
  signal?: AbortSignal
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    throw new ChatApiError(FALLBACK_OFFLINE_MESSAGE, undefined, true);
  }

  if (!res.ok) {
    let errorDetail = 'Failed to connect to streaming endpoint.';
    try {
      const errorJson = await res.json();
      if (errorJson.detail) {
        errorDetail = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
      }
    } catch {
      // ignore json parse error
    }
    const isOffline = res.status === 502 || res.status === 503 || res.status === 504;
    throw new ChatApiError(isOffline ? FALLBACK_OFFLINE_MESSAGE : errorDetail, res.status, isOffline);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new ChatApiError('Streaming reader is not supported in this browser.');
  }

  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const chunk of lines) {
      if (!chunk.trim()) continue;
      const eventMatch = chunk.match(/^event:\s*(\w+)/m);
      const dataMatch = chunk.match(/^data:\s*(.+)$/m);

      const event = eventMatch ? eventMatch[1] : 'message';
      const rawData = dataMatch ? dataMatch[1] : '';

      if (event === 'sources') {
        if (onSources) {
          try {
            const sources = JSON.parse(rawData);
            onSources(sources);
          } catch (e) {
            console.error('Failed to parse sources event:', e);
          }
        }
      } else if (event === 'message') {
        try {
          const parsed = JSON.parse(rawData);
          if (parsed.token) {
            onToken(parsed.token);
          }
        } catch {
          // Plain string fallback
          onToken(rawData);
        }
      } else if (event === 'done' || rawData === '[DONE]') {
        return;
      }
    }
  }
}
