import { useState, useEffect } from 'react';
import { apiCall } from '@/utils/api';

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface UseAuthReturn {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    if (savedToken) {
      setToken(savedToken);
    }
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
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
      const profile = await apiCall<User>('GET', '/user/profile');
      localStorage.setItem('auth_user', JSON.stringify(profile));
      setUser(profile);
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
      const profile = await apiCall<User>('GET', '/user/profile');
      localStorage.setItem('auth_user', JSON.stringify(profile));
      setUser(profile);
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
  };

  return {
    token,
    user,
    isLoading,
    error,
    login,
    register,
    logout,
  };
}
