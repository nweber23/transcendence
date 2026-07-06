import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotifications, NOTIFICATIONS_LAST_SEEN_KEY } from '../useNotifications';
import { WsPacket } from '@/utils/wsClient';

vi.mock('@/utils/api', () => ({
  apiCall: vi.fn(),
}));

let wsListener: ((packet: WsPacket) => void) | null = null;
vi.mock('@/utils/wsClient', () => ({
  subscribeToWebSocket: vi.fn((listener: (packet: WsPacket) => void) => {
    wsListener = listener;
    return () => {
      wsListener = null;
    };
  }),
}));

import { apiCall } from '@/utils/api';

const mockApiCall = vi.mocked(apiCall);

const restNotification = {
  id: 7,
  type: 'friends',
  head: 'New friend request',
  body: 'RandomGustav has sent you a friend request',
  image_url: 'sonne.jpeg',
  action_url: '/friends',
  created_at: '2026-07-06T10:00:00Z',
};

const wsFriendsPayload = {
  notification_type: 'friends',
  head: 'New friend request',
  body: 'Gustav2 has sent you a friend request',
  image_url: 'gustav.jpeg',
  action_url: '/friends',
  timestamp: '2026-07-06T12:00:00Z',
};

const wsGamesPayload = {
  notification_type: 'games',
  head: 'You won!',
  body: 'You won 500 chips in Blackjack',
  image_url: '',
  action_url: '/games/blackjack',
  timestamp: '2026-07-06T12:30:00Z',
};

const flush = () => act(async () => {
  await new Promise((r) => setTimeout(r, 0));
});

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  wsListener = null;
});

afterEach(() => {
  localStorage.clear();
});

describe('useNotifications - fetching', () => {
  it('fetches friends notification history when token exists', async () => {
    localStorage.setItem('auth_token', 'token');
    mockApiCall.mockResolvedValueOnce([restNotification]);

    const { result } = renderHook(() => useNotifications());
    await flush();

    expect(mockApiCall).toHaveBeenCalledWith('GET', '/user/notifications?types=friends&limit=50');
    expect(result.current.notifications).toEqual([
      {
        id: 7,
        type: 'friends',
        head: 'New friend request',
        body: 'RandomGustav has sent you a friend request',
        imageUrl: 'sonne.jpeg',
        actionUrl: '/friends',
        createdAt: '2026-07-06T10:00:00Z',
      },
    ]);
  });

  it('does not fetch without a token', async () => {
    const { result } = renderHook(() => useNotifications());
    await flush();
    expect(mockApiCall).not.toHaveBeenCalled();
    expect(result.current.notifications).toEqual([]);
  });

  it('sets error when the fetch fails but keeps working', async () => {
    localStorage.setItem('auth_token', 'token');
    mockApiCall.mockRejectedValueOnce(new Error('boom'));

    const { result } = renderHook(() => useNotifications());
    await flush();

    expect(result.current.error).not.toBeNull();
    expect(result.current.notifications).toEqual([]);
  });
});

describe('useNotifications - websocket routing', () => {
  it('prepends live friends notifications to the list', async () => {
    localStorage.setItem('auth_token', 'token');
    mockApiCall.mockResolvedValueOnce([restNotification]);

    const { result } = renderHook(() => useNotifications());
    await flush();

    act(() => {
      wsListener?.({ packet_type: 'notification', payload: wsFriendsPayload });
    });

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.notifications[0]).toEqual({
      id: null,
      type: 'friends',
      head: 'New friend request',
      body: 'Gustav2 has sent you a friend request',
      imageUrl: 'gustav.jpeg',
      actionUrl: '/friends',
      createdAt: '2026-07-06T12:00:00Z',
    });
  });

  it('routes games notifications to the callback and never stores them', async () => {
    const onGame = vi.fn();
    const { result } = renderHook(() => useNotifications(onGame));
    await flush();

    act(() => {
      wsListener?.({ packet_type: 'notification', payload: wsGamesPayload });
    });

    expect(onGame).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'games', head: 'You won!' })
    );
    expect(result.current.notifications).toEqual([]);
  });

  it('ignores non-notification packets', async () => {
    const { result } = renderHook(() => useNotifications());
    await flush();

    act(() => {
      wsListener?.({ packet_type: 'online', payload: { user_id: 1, is_online: true } });
    });

    expect(result.current.notifications).toEqual([]);
  });
});

describe('useNotifications - unseen tracking', () => {
  it('counts notifications newer than last-seen and clears on markSeen', async () => {
    localStorage.setItem('auth_token', 'token');
    localStorage.setItem(NOTIFICATIONS_LAST_SEEN_KEY, '2026-07-05T00:00:00Z');
    mockApiCall.mockResolvedValueOnce([restNotification]);

    const { result } = renderHook(() => useNotifications());
    await flush();

    expect(result.current.unseenCount).toBe(1);

    act(() => {
      result.current.markSeen();
    });

    expect(result.current.unseenCount).toBe(0);
    expect(localStorage.getItem(NOTIFICATIONS_LAST_SEEN_KEY)).not.toBeNull();
  });

  it('counts everything as unseen when never marked seen', async () => {
    localStorage.setItem('auth_token', 'token');
    mockApiCall.mockResolvedValueOnce([restNotification]);

    const { result } = renderHook(() => useNotifications());
    await flush();

    expect(result.current.unseenCount).toBe(1);
  });
});

describe('useNotifications - dismiss', () => {
  it('deletes the notification and removes it from the list', async () => {
    localStorage.setItem('auth_token', 'token');
    mockApiCall.mockResolvedValueOnce([restNotification]);

    const { result } = renderHook(() => useNotifications());
    await flush();

    mockApiCall.mockResolvedValueOnce(undefined);
    await act(async () => {
      await result.current.dismiss(7);
    });

    expect(mockApiCall).toHaveBeenCalledWith('DELETE', '/user/7/notifications');
    expect(result.current.notifications).toEqual([]);
  });

  it('keeps the notification when the delete fails', async () => {
    localStorage.setItem('auth_token', 'token');
    mockApiCall.mockResolvedValueOnce([restNotification]);

    const { result } = renderHook(() => useNotifications());
    await flush();

    mockApiCall.mockRejectedValueOnce(new Error('boom'));
    await act(async () => {
      await expect(result.current.dismiss(7)).rejects.toThrow();
    });

    expect(result.current.notifications).toHaveLength(1);
  });
});
