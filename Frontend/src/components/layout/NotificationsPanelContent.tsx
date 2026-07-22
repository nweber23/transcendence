import React from 'react';
import { AppNotification } from '@/hooks/useNotifications';
import Avatar from '@/components/ui/Avatar';

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (Number.isNaN(seconds) || seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

interface NotificationsPanelContentProps {
  notifications: AppNotification[];
  error: string | null;
  onDismiss: (id: number) => void;
  onNotificationClick: (n: AppNotification) => void;
}

const NotificationsPanelContent: React.FC<NotificationsPanelContentProps> = ({
  notifications,
  error,
  onDismiss,
  onNotificationClick,
}) => {
  if (error) {
    return <p className="text-sm text-[var(--text-3)] text-center py-6">{error}</p>;
  }
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-[var(--text-3)]">
        <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        <p className="text-sm">No notifications yet</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      {notifications.map((notification, index) => (
        <div
          key={notification.id ?? `live-${index}-${notification.createdAt}`}
          className="group flex items-start gap-2.5 py-2.5 px-2.5 rounded-lg bg-[var(--surface-2)] border border-[rgba(212,175,55,0.06)] hover:border-[rgba(212,175,55,0.2)] transition-colors duration-200 cursor-pointer"
          onClick={() => onNotificationClick(notification)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNotificationClick(notification);
            }
          }}
        >
          <Avatar avatarURL={notification.imageUrl} size={32} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text)] leading-tight">{notification.head}</p>
            <p className="text-xs text-[var(--text-2)] mt-0.5 break-words">{notification.body}</p>
            <p className="text-[10px] text-[var(--text-3)] mt-1">{timeAgo(notification.createdAt)}</p>
          </div>
          {notification.id !== null && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(notification.id as number);
              }}
              aria-label="Dismiss notification"
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[rgba(255,255,255,0.08)] transition-colors duration-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default NotificationsPanelContent;
