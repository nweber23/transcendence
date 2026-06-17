import { useState, useEffect, useCallback } from 'react';
import { apiCall } from '@/utils/api';

export interface Friend {
  friendId: number;
  username: string;
  avatarURL: string;
  isOnline: boolean;
  createdAt: string;
}

export interface UserSearchResult {
  id: number;
  username: string;
  avatarURL: string;
}

interface RawFriendResponse {
  friend_id: number;
  username: string;
  avatarURL: string;
  status: string;
  is_online: boolean;
  created_at: string;
}

export interface UseFriendsReturn {
  friends: Friend[];
  incoming: Friend[];
  outgoing: Friend[];
  searchResults: UserSearchResult[];
  isLoading: boolean;
  error: string | null;
  searchUsers: (q: string) => Promise<void>;
  addFriend: (id: number) => Promise<void>;
  removeFriend: (id: number) => Promise<void>;
  refetch: () => Promise<void>;
}

function toFriend(raw: RawFriendResponse): Friend {
  return {
    friendId: raw.friend_id,
    username: raw.username,
    avatarURL: raw.avatarURL,
    isOnline: raw.is_online,
    createdAt: raw.created_at,
  };
}

export function useFriends(): UseFriendsReturn {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<Friend[]>([]);
  const [outgoing, setOutgoing] = useState<Friend[]>([]);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFriends = useCallback(async () => {
    const raw = await apiCall<RawFriendResponse[]>(
      'GET',
      '/user/friends?statuses=active,pending_self,pending_other&limit=100'
    );
    setFriends(raw.filter((r) => r.status === 'active').map(toFriend));
    setOutgoing(raw.filter((r) => r.status === 'pending_self').map(toFriend));
    setIncoming(raw.filter((r) => r.status === 'pending_other').map(toFriend));
  }, []);

  const searchUsers = async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await apiCall<UserSearchResult[]>('GET', `/user/search?q=${encodeURIComponent(q)}&limit=10`);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
  };

  const addFriend = async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      await apiCall('POST', `/user/${id}/friends`, undefined);
      await fetchFriends();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add friend';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const removeFriend = async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      await apiCall('DELETE', `/user/${id}/friends`, undefined);
      await fetchFriends();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove friend';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (localStorage.getItem('auth_token')) {
      fetchFriends().catch(() => {});
    }
  }, [fetchFriends]);

  return { friends, incoming, outgoing, searchResults, isLoading, error, searchUsers, addFriend, removeFriend, refetch: fetchFriends };
}
