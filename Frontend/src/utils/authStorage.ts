const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const EXPIRY_KEY = 'auth_expiry';
const REMEMBER_ME_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function isSessionExpired(): boolean {
  const expiry = localStorage.getItem(EXPIRY_KEY);
  if (!expiry) return false;
  return Date.now() > Number(expiry);
}

export function clearAuthStorage(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function getAuthToken(): string | null {
  if (isSessionExpired()) {
    clearAuthStorage();
    return null;
  }
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

export function getAuthUser<T>(): T | null {
  if (isSessionExpired()) {
    clearAuthStorage();
    return null;
  }
  const saved = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
  return saved ? (JSON.parse(saved) as T) : null;
}

export function setAuthToken(token: string, rememberMe: boolean): void {
  clearAuthStorage();
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(TOKEN_KEY, token);
  if (rememberMe) {
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + REMEMBER_ME_DURATION_MS));
  }
}

export function setAuthUser(user: unknown): void {
  const activeStorage =
    localStorage.getItem(TOKEN_KEY) !== null || localStorage.getItem(USER_KEY) !== null
      ? localStorage
      : sessionStorage;
  activeStorage.setItem(USER_KEY, JSON.stringify(user));
}
