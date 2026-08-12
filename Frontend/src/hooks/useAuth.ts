import { useState, useEffect } from 'react';
import { apiCall } from '@/utils/api';
import { getAuthToken, getAuthUser, setAuthToken, setAuthUser, clearAuthStorage } from '@/utils/authStorage';

export const AUTH_TOKEN_CHANGED_EVENT = 'auth-token-changed';

export interface User {
  id: number;
  username: string;
  email: string;
  avatarURL: string;
  two_factor_enabled?: boolean;
}

interface LoginResponse {
  token?: string;
  user_id: number;
  two_factor_required?: boolean;
  temp_token?: string;
}

interface TwoFactorChallenge {
  tempToken: string;
  rememberMe: boolean;
}

export interface UseAuthReturn {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  /** Set once /auth/login responds with two_factor_required — prompt for a TOTP code and call verifyTwoFactor. */
  twoFactorPending: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<{ requiresTwoFactor: boolean }>;
  verifyTwoFactor: (code: string) => Promise<void>;
  cancelTwoFactor: () => void;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [user, setUser] = useState<User | null>(() => getAuthUser<User>());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<TwoFactorChallenge | null>(null);

  useEffect(() => {
    const syncFromStorage = () => {
      setUser(getAuthUser<User>());
      setToken(getAuthToken());
    };
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, syncFromStorage);
    return () => window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, syncFromStorage);
  }, []);

  // Stores the token and fetches/persists the user profile that goes with it.
  // Shared by login, register, and the 2FA challenge, which all end the same way.
  const completeLogin = async (authToken: string, rememberMe: boolean) => {
    setAuthToken(authToken, rememberMe);
    setToken(authToken);
    try {
      const profile = await apiCall<User>('GET', '/user/profile');
      setAuthUser(profile);
      setUser(profile);
      window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
    } catch (profileErr) {
      // If profile fetch fails, clear the token and error out
      clearAuthStorage();
      setToken(null);
      const errorMessage = profileErr instanceof Error ? profileErr.message : 'Failed to fetch user profile';
      throw new Error(errorMessage);
    }
  };

  const login = async (username: string, password: string, rememberMe = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiCall<LoginResponse>('POST', '/auth/login', { username, password });
      if (response.two_factor_required) {
        setTwoFactorChallenge({ tempToken: response.temp_token!, rememberMe });
        return { requiresTwoFactor: true };
      }
      await completeLogin(response.token!, rememberMe);
      return { requiresTwoFactor: false };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyTwoFactor = async (code: string) => {
    if (!twoFactorChallenge) {
      throw new Error('No two-factor challenge in progress');
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiCall<{ token: string; user_id: number }>('POST', '/auth/2fa/verify', {
        temp_token: twoFactorChallenge.tempToken,
        code,
      });
      await completeLogin(response.token, twoFactorChallenge.rememberMe);
      setTwoFactorChallenge(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Verification failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const cancelTwoFactor = () => {
    setTwoFactorChallenge(null);
    setError(null);
  };

  const register = async (
    username: string,
    email: string,
    password: string
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiCall<{ token: string; user_id: number }>(
        'POST',
        '/auth/register',
        { username, email, password }
      );
      await completeLogin(response.token, true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearAuthStorage();
    setToken(null);
    setUser(null);
    setError(null);
    window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
  };

  const refreshUser = async () => {
    try {
      const profile = await apiCall<User>('GET', '/user/profile');
      setAuthUser(profile);
      setUser(profile);
      window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
    } catch {
      // Silently fail — stale data is better than breaking the UI
    }
  };

  return {
    token,
    user,
    isLoading,
    error,
    twoFactorPending: twoFactorChallenge !== null,
    login,
    verifyTwoFactor,
    cancelTwoFactor,
    register,
    logout,
    refreshUser,
  };
}
