const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export interface ApiResponse<T> {
  data: T;
  message: string;
  code: string;
}

export async function apiCall<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  body?: unknown
): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || `API Error: ${response.status} ${response.statusText}`
    );
  }

  const result: ApiResponse<T> = await response.json();

  if (!result || typeof result !== 'object' || !('data' in result)) {
    throw new Error('Invalid API response format');
  }

  return result.data;
}

export async function apiUpload<T>(endpoint: string, formData: FormData): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // Do NOT set Content-Type — the browser sets it with the correct multipart boundary

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || `API Error: ${response.status} ${response.statusText}`
    );
  }

  const result: ApiResponse<T> = await response.json();

  if (!result || typeof result !== 'object' || !('data' in result)) {
    throw new Error('Invalid API response format');
  }

  return result.data;
}
