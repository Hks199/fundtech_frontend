import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createApi, login } from '../src/api';
afterEach(() => vi.unstubAllGlobals());
describe('backend API contract', () => {
  it('sends JSON credentials and bearer-authenticated pagination', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }))).mockResolvedValueOnce(new Response('{"entries":[]}'));
    vi.stubGlobal('fetch', fetch);
    await login('admin', 'password');
    expect(fetch.mock.calls[0][0]).toBe('/api/auth/login');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ username: 'admin', password: 'password' });
    await createApi('token').ledger(10, 'PRD001');
    expect(fetch.mock.calls[1][0]).toBe('/api/ledger?offset=10&limit=10&product_id=PRD001');
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer token');
  });
  it('treats status 404 as pending, but propagates authentication failures', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('{"error":"Event not found"}', { status: 404 })).mockResolvedValueOnce(new Response('{"error":"Unauthorized"}', { status: 401 }));
    vi.stubGlobal('fetch', fetch);
    expect(await createApi('token').status('test')).toBeNull();
    await expect(createApi('token').status('test')).rejects.toMatchObject({ status: 401 });
  });
  it('reports rate limits and network failures', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('Too many requests', { status: 429 })).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetch);
    await expect(login('admin', 'password')).rejects.toThrow('Too many requests');
    await expect(login('admin', 'password')).rejects.toBeInstanceOf(ApiError);
  });
});
