import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UseNotificationsReturn, AppNotification } from '@/hooks/useNotifications';
import { useOutsideClick } from '@/utils/useOutsideClick';
import NotificationsPanelContent from '@/components/layout/NotificationsPanelContent';
import { OPEN_FRIENDS_DROPDOWN_EVENT } from '@/components/layout/FriendsDropdown';

const NotificationsDropdown: React.FC<UseNotificationsReturn> = ({
  notifications,
  unseenCount,
  error,
  markSeen,
  dismiss,
  refetch,
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useOutsideClick(wrapperRef, () => setOpen(false), open);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      refetch().catch(() => {});
      markSeen();
    }
  };

  const handleNotificationClick = (notification: AppNotification) => {
    setOpen(false);
    if (notification.type === 'friends') {
      window.dispatchEvent(new Event(OPEN_FRIENDS_DROPDOWN_EVENT));
    } else if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={handleToggle}
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[rgba(255,255,255,0.06)] transition-colors duration-200"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unseenCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--gold)] text-[#0a0e12] text-[10px] font-bold flex items-center justify-center">
            {unseenCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] max-h-[70vh] overflow-y-auto bg-[rgba(13,17,23,0.95)] backdrop-blur-xl border border-[rgba(212,175,55,0.15)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-4 z-50 fade-in-up">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-3)] mb-2 px-1">
            Notifications
          </h3>
          <NotificationsPanelContent
            notifications={notifications}
            error={error}
            onDismiss={(id) => dismiss(id).catch(() => {})}
            onNotificationClick={handleNotificationClick}
          />
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;
