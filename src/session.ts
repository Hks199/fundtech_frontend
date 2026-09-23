export type Session = { token: string; username: string; expires: number };
const sessionKey = 'fundtech.session';

export function saveSession(session: Session | null): void {
  try {
    if (session) sessionStorage.setItem(sessionKey, JSON.stringify(session));
    else sessionStorage.removeItem(sessionKey);
  } catch { /* Keep in-memory login working when browser storage is unavailable. */ }
}

export function restoreSession(): Session | null {
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(sessionKey) || 'null');
    if (stored && typeof stored === 'object' && 'token' in stored && 'username' in stored && 'expires' in stored
      && typeof stored.token === 'string' && stored.token.length > 0
      && typeof stored.username === 'string' && stored.username.length > 0
      && typeof stored.expires === 'number' && Number.isFinite(stored.expires) && stored.expires > Date.now()) {
      return { token: stored.token, username: stored.username, expires: stored.expires };
    }
  } catch { /* Invalid or inaccessible storage is treated as signed out. */ }
  saveSession(null);
  return null;
}
