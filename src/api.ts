import type { InventoryApi } from './types';

const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function request<T>(path: string, token?: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000), cache: 'no-store' });
  } catch { throw new ApiError('Cannot reach the API. Check that the backend is running and the API URL is configured.', 0); }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status === 429 ? 'Too many requests. Please wait before trying again.' : data?.error || `Request failed (${response.status}).`, response.status);
  if (!data) throw new ApiError('The API returned an unexpected response. Check the backend URL.', response.status);
  return data as T;
}
export const login = (username: string, password: string) => request<{ access_token: string; expires_in: number }>('/api/auth/login', undefined, { username, password });
export function createApi(token: string): InventoryApi {
  return {
    products: () => request('/api/products', token),
    ledger: (offset = 0, product = '', limit = 10) => request(`/api/ledger?${new URLSearchParams({ offset: String(offset), limit: String(limit), ...(product ? { product_id: product } : {}) })}`, token),
    batches: product => request(`/api/products/${encodeURIComponent(product)}/batches`, token),
    publish: event => request('/api/events', token, event),
    status: async id => { try { return await request(`/api/events/${encodeURIComponent(id)}`, token); } catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; } },
  };
}
