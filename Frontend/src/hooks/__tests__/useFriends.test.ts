import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFriends } from '../useFriends';

vi.mock('@/utils/api', () => ({
  apiCall: vi.fn(),
}));

import { apiCall } from '@/utils/api';

const mockApiCall = vi.mocked(apiCall);

const mockFriendsResponse = [
  { friend_id: 2, username: 'bob',   avatarURL: 'default_avatar', status: 'active',        is_online: true,  created_at: '2024-01-01T00:00:00Z' },
  { friend_id: 3, username: 'carol', avatarURL: 'default_avatar', status: 'pending_self',  is_online: false, created_at: '2024-01-01T00:00:00Z' },
  { friend_id: 4, username: 'dave',  avatarURL: 'default_avatar', status: 'pending_other', is_online: false, created_at: '2024-01-01T00:00:00Z' },
];

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

describe('useFriends - initialization', () => {
  it('fetches and splits friends by status on mount', async () => {
    localStorage.setItem('auth_token', 'mock-token');
    mockApiCall.mockResolvedValueOnce(mockFriendsResponse);

    const { result } = renderHook(() => useFriends());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    expect(result.current.friends).toHaveLength(1);
    expect(result.current.friends[0].friendId).toBe(2);
    expect(result.current.friends[0].isOnline).toBe(true);

    expect(result.current.outgoing).toHaveLength(1);
    expect(result.current.outgoing[0].friendId).toBe(3);

    expect(result.current.incoming).toHaveLength(1);
    expect(result.current.incoming[0].friendId).toBe(4);
  });

  it('does not fetch when no token', async () => {
    const { result } = renderHook(() => useFriends());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    expect(result.current.friends).toHaveLength(0);
    expect(mockApiCall).not.toHaveBeenCalled();
  });
});

describe('useFriends - addFriend', () => {
  it('calls POST /user/:id/friends and refreshes list', async () => {
    localStorage.setItem('auth_token', 'mock-token');
    mockApiCall
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ friend_id: 5, username: 'erin', avatarURL: 'default_avatar', status: 'pending_self', is_online: false, created_at: '2024-01-01T00:00:00Z' }]);

    const { result } = renderHook(() => useFriends());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    await act(async () => { await result.current.addFriend(5); });

    expect(mockApiCall).toHaveBeenCalledWith('POST', '/user/5/friends', undefined);
    expect(result.current.outgoing).toHaveLength(1);
    expect(result.current.outgoing[0].friendId).toBe(5);
  });
});

describe('useFriends - removeFriend', () => {
  it('calls DELETE /user/:id/friends and refreshes list', async () => {
    localStorage.setItem('auth_token', 'mock-token');
    mockApiCall
      .mockResolvedValueOnce([{ friend_id: 2, username: 'bob', avatarURL: 'default_avatar', status: 'active', is_online: true, created_at: '2024-01-01T00:00:00Z' }])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([]);

    const { result } = renderHook(() => useFriends());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    await act(async () => { await result.current.removeFriend(2); });

    expect(mockApiCall).toHaveBeenCalledWith('DELETE', '/user/2/friends', undefined);
    expect(result.current.friends).toHaveLength(0);
  });
});

describe('useFriends - searchUsers', () => {
  it('calls GET /user/search and populates searchResults', async () => {
    localStorage.setItem('auth_token', 'mock-token');
    mockApiCall
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 7, username: 'alice', avatarURL: 'default_avatar' }]);

    const { result } = renderHook(() => useFriends());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    await act(async () => { await result.current.searchUsers('ali'); });

    expect(mockApiCall).toHaveBeenCalledWith('GET', '/user/search?q=ali&limit=10');
    expect(result.current.searchResults).toHaveLength(1);
    expect(result.current.searchResults[0].username).toBe('alice');
  });

  it('clears searchResults when query is empty', async () => {
    localStorage.setItem('auth_token', 'mock-token');
    mockApiCall.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useFriends());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    await act(async () => { await result.current.searchUsers(''); });

    expect(result.current.searchResults).toHaveLength(0);
    expect(mockApiCall).toHaveBeenCalledTimes(1);
  });
});

describe('useFriends - refetch', () => {
  it('re-fetches the friend list on demand', async () => {
    localStorage.setItem('auth_token', 'mock-token');
    mockApiCall
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(mockFriendsResponse);

    const { result } = renderHook(() => useFriends());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(result.current.friends).toHaveLength(0);

    await act(async () => { await result.current.refetch(); });

    expect(result.current.friends).toHaveLength(1);
  });
});
