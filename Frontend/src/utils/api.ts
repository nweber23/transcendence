import { friendlyMessage } from '@/utils/errorMessages';
import { getAuthToken } from '@/utils/authStorage';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export interface ApiResponse<T> {
  data: T;
  message: string;
}

/**
 * Thrown for any failed API call. `message` is always safe to show a user directly —
 * see friendlyMessage() in utils/errorMessages.ts for how it's derived. `code` and
 * `detail` are the raw backend fields, kept around for callers that need to branch on
 * a specific failure (e.g. redirecting to /login on a 401).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: string;

  constructor(status: number, code: string, detail: string) {
    super(friendlyMessage(status, code, detail));
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

async function parseErrorBody(response: Response): Promise<{ code: string; detail: string }> {
  try {
    const body = await response.json();
    const code = body && typeof body.message === 'string' ? body.message : 'unknown_error';
    const detail = body && typeof body.data === 'string' ? body.data : '';
    return { code, detail };
  } catch {
    // Non-JSON error body — e.g. an upstream proxy/gateway error page.
    return { code: 'unknown_error', detail: '' };
  }
}

async function doFetch(endpoint: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_BASE_URL}${endpoint}`, init);
  } catch {
    throw new ApiError(0, 'network_error', '');
  }
}

async function readResult<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const { code, detail } = await parseErrorBody(response);
    throw new ApiError(response.status, code, detail);
  }

  const result: ApiResponse<T> = await response.json();

  if (!result || typeof result !== 'object' || !('data' in result)) {
    throw new ApiError(response.status, 'invalid_response', 'Invalid API response format');
  }

  return result.data;
}

function authHeaders(): HeadersInit {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiCall<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  body?: unknown
): Promise<T> {
  const response = await doFetch(endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return readResult<T>(response);
}

export async function apiUpload<T>(endpoint: string, formData: FormData): Promise<T> {
  // Do NOT set Content-Type — the browser sets it with the correct multipart boundary
  const response = await doFetch(endpoint, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });

  return readResult<T>(response);
}
