import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getAuthToken,
  getAuthUser,
  setAuthToken,
  setAuthUser,
  clearAuthStorage,
  isSessionExpired,
} from '../authStorage';

const mockUser = { id: 1, username: 'testuser', email: 'test@example.com', avatarURL: 'default_avatar' };
const mockToken = 'mock-jwt-token';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.useRealTimers();
});

describe('authStorage - setAuthToken', () => {
  it('stores the token in localStorage with an expiry when rememberMe is true', () => {
    setAuthToken(mockToken, true);

    expect(localStorage.getItem('auth_token')).toBe(mockToken);
    expect(sessionStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_expiry')).not.toBeNull();
  });

  it('stores the token in sessionStorage with no expiry when rememberMe is false', () => {
    setAuthToken(mockToken, false);

    expect(sessionStorage.getItem('auth_token')).toBe(mockToken);
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_expiry')).toBeNull();
  });

  it('sets an expiry roughly 7 days in the future when rememberMe is true', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    setAuthToken(mockToken, true);

    const expiry = Number(localStorage.getItem('auth_expiry'));
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(expiry).toBe(now.getTime() + sevenDaysMs);
  });

  it('clears any previous session from the other storage', () => {
    setAuthToken(mockToken, false);
    setAuthToken('new-token', true);

    expect(sessionStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_token')).toBe('new-token');
  });
});

describe('authStorage - setAuthUser', () => {
  it('writes the user to localStorage when the active session is in localStorage', () => {
    setAuthToken(mockToken, true);
    setAuthUser(mockUser);

    expect(JSON.parse(localStorage.getItem('auth_user')!)).toEqual(mockUser);
    expect(sessionStorage.getItem('auth_user')).toBeNull();
  });

  it('writes the user to sessionStorage when the active session is in sessionStorage', () => {
    setAuthToken(mockToken, false);
    setAuthUser(mockUser);

    expect(JSON.parse(sessionStorage.getItem('auth_user')!)).toEqual(mockUser);
    expect(localStorage.getItem('auth_user')).toBeNull();
  });
});

describe('authStorage - getAuthToken / getAuthUser', () => {
  it('returns null when nothing is stored', () => {
    expect(getAuthToken()).toBeNull();
    expect(getAuthUser()).toBeNull();
  });

  it('reads a remembered session from localStorage', () => {
    setAuthToken(mockToken, true);
    setAuthUser(mockUser);

    expect(getAuthToken()).toBe(mockToken);
    expect(getAuthUser()).toEqual(mockUser);
  });

  it('reads a non-remembered session from sessionStorage', () => {
    setAuthToken(mockToken, false);
    setAuthUser(mockUser);

    expect(getAuthToken()).toBe(mockToken);
    expect(getAuthUser()).toEqual(mockUser);
  });

  it('treats an expired remembered session as logged out and clears it', () => {
    setAuthToken(mockToken, true);
    localStorage.setItem('auth_expiry', String(Date.now() - 1000));

    expect(getAuthToken()).toBeNull();
    expect(getAuthUser()).toBeNull();
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_expiry')).toBeNull();
  });
});

describe('authStorage - isSessionExpired', () => {
  it('returns false when there is no expiry set', () => {
    setAuthToken(mockToken, false);
    expect(isSessionExpired()).toBe(false);
  });

  it('returns false when the expiry is in the future', () => {
    setAuthToken(mockToken, true);
    expect(isSessionExpired()).toBe(false);
  });

  it('returns true when the expiry has passed', () => {
    setAuthToken(mockToken, true);
    localStorage.setItem('auth_expiry', String(Date.now() - 1000));
    expect(isSessionExpired()).toBe(true);
  });
});

describe('authStorage - clearAuthStorage', () => {
  it('removes token, user, and expiry from both storages', () => {
    setAuthToken(mockToken, true);
    setAuthUser(mockUser);
    setAuthToken(mockToken, false);
    setAuthUser(mockUser);

    clearAuthStorage();

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
    expect(localStorage.getItem('auth_expiry')).toBeNull();
    expect(sessionStorage.getItem('auth_token')).toBeNull();
    expect(sessionStorage.getItem('auth_user')).toBeNull();
  });
});
