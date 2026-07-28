import { useState, useEffect, useCallback, useRef } from 'react';
import { apiCall } from '@/utils/api';
import { subscribeToWebSocket, WsPacket } from '@/utils/wsClient';
import { getAuthToken } from '@/utils/authStorage';

export interface AppNotification {
  id: number | null;
  type: string;
  head: string;
  body: string;
  imageUrl: string;
  actionUrl: string;
  createdAt: string;
}

interface RawRestNotification {
  id: number;
  type: string;
  head: string;
  body: string;
  image_url: string;
  action_url: string;
  created_at: string;
}

interface RawWsNotification {
  notification_type: string;
  head: string;
  body: string;
  image_url: string;
  action_url: string;
  timestamp: string;
}

export const NOTIFICATIONS_LAST_SEEN_KEY = 'notifications_last_seen';

export interface UseNotificationsReturn {
  notifications: AppNotification[];
  unseenCount: number;
  error: string | null;
  markSeen: () => void;
  dismiss: (id: number) => Promise<void>;
  refetch: () => Promise<void>;
}

function fromRest(raw: RawRestNotification): AppNotification {
  return {
    id: raw.id,
    type: raw.type,
    head: raw.head,
    body: raw.body,
    imageUrl: raw.image_url,
    actionUrl: raw.action_url,
    createdAt: raw.created_at,
  };
}

function fromWs(raw: RawWsNotification): AppNotification {
  return {
    id: null,
    type: raw.notification_type,
    head: raw.head,
    body: raw.body,
    imageUrl: raw.image_url,
    actionUrl: raw.action_url,
    createdAt: raw.timestamp,
  };
}

export function useNotifications(
  onToastNotification?: (n: AppNotification) => void
): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastSeen, setLastSeen] = useState<string>(
    () => localStorage.getItem(NOTIFICATIONS_LAST_SEEN_KEY) ?? ''
  );
  const toastCallbackRef = useRef(onToastNotification);
  toastCallbackRef.current = onToastNotification;

  const refetch = useCallback(async () => {
    const raw = await apiCall<RawRestNotification[] | null>(
      'GET',
      '/user/notifications?types=friends&limit=50'
    );
    setNotifications((raw ?? []).map(fromRest));
    setError(null);
  }, []);

  useEffect(() => {
    if (getAuthToken()) {
      refetch().catch(() => setError('Failed to load notifications'));
    }
  }, [refetch]);

  useEffect(() => {
    return subscribeToWebSocket((packet: WsPacket) => {
      if (packet.packet_type !== 'notification') return;
      const notification = fromWs(packet.payload as RawWsNotification);
      if (notification.type === 'games' || notification.type === 'system') {
        toastCallbackRef.current?.(notification);
      } else if (notification.type === 'friends') {
        setNotifications((prev) => [notification, ...prev]);
      }
    });
  }, []);

  const markSeen = useCallback(() => {
    const now = new Date().toISOString();
    localStorage.setItem(NOTIFICATIONS_LAST_SEEN_KEY, now);
    setLastSeen(now);
  }, []);

  const dismiss = useCallback(async (id: number) => {
    await apiCall('DELETE', `/user/${id}/notifications`);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const unseenCount = notifications.filter(
    (n) => !lastSeen || n.createdAt > lastSeen
  ).length;

  return { notifications, unseenCount, error, markSeen, dismiss, refetch };
}
