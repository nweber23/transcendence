import { useState, useEffect, useCallback } from 'react';
import { apiCall, apiUpload } from '@/utils/api';
import { getAuthToken } from '@/utils/authStorage';

export interface ProfileUser {
  id: number;
  username: string;
  email: string;
  avatarURL: string;
  joined_at: string;
}

export interface UseProfileReturn {
  user: ProfileUser | null;
  notificationTypes: string[];
  isLoading: boolean;
  error: string | null;
  updateProfile: (username: string, email: string, password?: string) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  profile_setNotificationTypes: (notificationTypes: string[]) => Promise<void>;
}

export function useProfile(): UseProfileReturn {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [notificationTypes, setNotificationTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    const result = await apiCall<ProfileUser>('GET', '/user/profile');
    setUser(result);
  }, []);

  const getNotificationTypes = useCallback(async () => {
    const result = await apiCall<string[]>('GET', '/user/notification_types');
    setNotificationTypes(result);
  }, []);
  
  const updateProfile = async (username: string, email: string, password?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const body: Record<string, string> = { username, email };
      if (password) body.password = password;
      await apiCall('PUT', '/user/profile', body);
      await fetchProfile();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await apiUpload('/user/avatar', formData);
      await fetchProfile();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const profile_setNotificationTypes = async (notificationTypesToSet: string[]) => {
    setIsLoading(true);
    setError(null);
    try {
      await apiCall('PUT', '/user/notification_types', notificationTypesToSet);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Apply failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (getAuthToken()) {
      fetchProfile().catch(() => {});
      getNotificationTypes().catch(() => {});
    }
  }, [fetchProfile, getNotificationTypes]);

  return { user, notificationTypes, isLoading, error, updateProfile, uploadAvatar, profile_setNotificationTypes };
}
