import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';

vi.mock('@/utils/api', () => ({
  apiCall: vi.fn(),
}));

import { apiCall } from '@/utils/api';

const mockApiCall = vi.mocked(apiCall);

const mockUser = { id: 1, username: 'testuser', email: 'test@example.com', avatarURL: 'default_avatar' };
const mockToken = 'mock-jwt-token';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

describe('useAuth - initialization', () => {
  it('starts with null token and user when localStorage is empty', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('restores token from localStorage on mount', () => {
    localStorage.setItem('auth_token', mockToken);
    const { result } = renderHook(() => useAuth());
    expect(result.current.token).toBe(mockToken);
  });

  it('restores user from localStorage on mount', () => {
    localStorage.setItem('auth_user', JSON.stringify(mockUser));
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toEqual(mockUser);
  });
});

describe('useAuth - login', () => {
  it('sets token and user on successful login', async () => {
    mockApiCall
      .mockResolvedValueOnce({ token: mockToken, user_id: 1 })
      .mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('testuser', 'password');
    });

    expect(result.current.token).toBe(mockToken);
    expect(result.current.user).toEqual(mockUser);
    expect(localStorage.getItem('auth_token')).toBe(mockToken);
    expect(JSON.parse(localStorage.getItem('auth_user')!)).toEqual(mockUser);
  });

  it('sets isLoading true during login and false after', async () => {
    let resolveLogin!: (v: { token: string; user_id: number }) => void;
    const loginPromise = new Promise<{ token: string; user_id: number }>((res) => {
      resolveLogin = res;
    });
    mockApiCall
      .mockReturnValueOnce(loginPromise as unknown as Promise<{ token: string; user_id: number }>)
      .mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuth());

    let loginTask!: Promise<void>;
    act(() => {
      loginTask = result.current.login('testuser', 'password');
    });
    expect(result.current.isLoading).toBe(true);

    resolveLogin({ token: mockToken, user_id: 1 });
    await act(async () => {
      await loginTask;
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('sets error and throws when login API call fails', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('Invalid credentials'));

    const { result } = renderHook(() => useAuth());
    let caughtError: Error | undefined;

    await act(async () => {
      await result.current.login('testuser', 'wrong').catch((e) => { caughtError = e; });
    });

    expect(caughtError?.message).toBe('Invalid credentials');
    expect(result.current.error).toBe('Invalid credentials');
    expect(result.current.token).toBeNull();
  });

  it('clears token and sets error when profile fetch fails after login', async () => {
    mockApiCall
      .mockResolvedValueOnce({ token: mockToken, user_id: 1 })
      .mockRejectedValueOnce(new Error('Profile fetch failed'));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('testuser', 'password').catch(() => {});
    });

    expect(result.current.token).toBeNull();
    expect(result.current.error).toBe('Profile fetch failed');
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('resets isLoading to false even when login fails', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('fail'));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('testuser', 'password').catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });
});

describe('useAuth - register', () => {
  it('sets token and user on successful registration', async () => {
    mockApiCall
      .mockResolvedValueOnce({ token: mockToken, user_id: 1 })
      .mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.register('testuser', 'test@example.com', 'password');
    });

    expect(result.current.token).toBe(mockToken);
    expect(result.current.user).toEqual(mockUser);
    expect(localStorage.getItem('auth_token')).toBe(mockToken);
  });

  it('sets error and throws when register API call fails', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('Username taken'));

    const { result } = renderHook(() => useAuth());
    let caughtError: Error | undefined;

    await act(async () => {
      await result.current.register('taken', 'test@example.com', 'password').catch((e) => { caughtError = e; });
    });

    expect(caughtError?.message).toBe('Username taken');
    expect(result.current.error).toBe('Username taken');
  });

  it('clears token when profile fetch fails after registration', async () => {
    mockApiCall
      .mockResolvedValueOnce({ token: mockToken, user_id: 1 })
      .mockRejectedValueOnce(new Error('Profile error'));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.register('testuser', 'test@example.com', 'password').catch(() => {});
    });

    expect(result.current.token).toBeNull();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });
});

describe('useAuth - logout', () => {
  it('clears token, user, and error on logout', async () => {
    mockApiCall
      .mockResolvedValueOnce({ token: mockToken, user_id: 1 })
      .mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('testuser', 'password');
    });

    act(() => { result.current.logout(); });

    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('removes auth data from localStorage on logout', async () => {
    localStorage.setItem('auth_token', mockToken);
    localStorage.setItem('auth_user', JSON.stringify(mockUser));

    const { result } = renderHook(() => useAuth());

    act(() => { result.current.logout(); });

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
  });
});

describe('useAuth - refreshUser', () => {
  it('updates user state and localStorage with the latest profile', async () => {
    localStorage.setItem('auth_user', JSON.stringify(mockUser));
    const updatedUser = { ...mockUser, avatarURL: 'new_avatar.png' };
    mockApiCall.mockResolvedValueOnce(updatedUser);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(mockApiCall).toHaveBeenCalledWith('GET', '/user/profile');
    expect(result.current.user).toEqual(updatedUser);
    expect(JSON.parse(localStorage.getItem('auth_user')!)).toEqual(updatedUser);
  });

  it('silently fails and keeps stale user data when the fetch errors', async () => {
    localStorage.setItem('auth_user', JSON.stringify(mockUser));
    mockApiCall.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await expect(result.current.refreshUser()).resolves.toBeUndefined();
    });

    expect(result.current.user).toEqual(mockUser);
    expect(JSON.parse(localStorage.getItem('auth_user')!)).toEqual(mockUser);
  });
});
