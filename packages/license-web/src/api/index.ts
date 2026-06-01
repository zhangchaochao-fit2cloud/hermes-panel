const BASE = '/api';

let token: string | null = localStorage.getItem('license-token');

export function setToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem('license-token', t);
  else localStorage.removeItem('license-token');
}

export function getToken(): string | null {
  return token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 204) return undefined as T;
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
  return data as T;
}

export const api = {
  get<T>(path: string) { return request<T>(path); },
  post<T>(path: string, body?: unknown) { return request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }); },
  patch<T>(path: string, body?: unknown) { return request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }); },
  delete(path: string) { return request(path, { method: 'DELETE' }); },
};
