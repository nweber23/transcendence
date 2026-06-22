import { useState, useEffect } from 'react';
import { apiCall } from '@/utils/api';

export const AUTH_TOKEN_CHANGED_EVENT = 'auth-token-changed';

export interface User {
  id: number;
  username: string;
  email: string;
  avatarURL: string;
}

export interface UseAuthReturn {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('auth_token');
  });
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('auth_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const syncFromStorage = () => {
      const savedUser = localStorage.getItem('auth_user');
      setUser(savedUser ? JSON.parse(savedUser) : null);
      setToken(localStorage.getItem('auth_token'));
    };
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, syncFromStorage);
    return () => window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, syncFromStorage);
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiCall<{ token: string; user_id: number }>(
        'POST',
        '/auth/login',
        { username, password }
      );
      localStorage.setItem('auth_token', response.token);
      setToken(response.token);
      // Fetch user profile after login
      try {
        const profile = await apiCall<User>('GET', '/user/profile');
        localStorage.setItem('auth_user', JSON.stringify(profile));
        setUser(profile);
        window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
      } catch (profileErr) {
        // If profile fetch fails, clear the token and error out
        localStorage.removeItem('auth_token');
        setToken(null);
        const errorMessage = profileErr instanceof Error ? profileErr.message : 'Failed to fetch user profile';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
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
      localStorage.setItem('auth_token', response.token);
      setToken(response.token);
      // Fetch user profile after registration
      try {
        const profile = await apiCall<User>('GET', '/user/profile');
        localStorage.setItem('auth_user', JSON.stringify(profile));
        setUser(profile);
        window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
      } catch (profileErr) {
        // If profile fetch fails, clear the token and error out
        localStorage.removeItem('auth_token');
        setToken(null);
        const errorMessage = profileErr instanceof Error ? profileErr.message : 'Failed to fetch user profile';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
    setError(null);
    window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
  };

  const refreshUser = async () => {
    try {
      const profile = await apiCall<User>('GET', '/user/profile');
      localStorage.setItem('auth_user', JSON.stringify(profile));
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
    login,
    register,
    logout,
    refreshUser,
  };
}
