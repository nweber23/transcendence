import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps extends ToastMessage {
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({
  id,
  message,
  type,
  duration = 4000,
  onClose,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration === 0) return;

    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(id), 200);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const bgColors = {
    success: 'bg-[rgba(45,122,99,0.9)] border-[rgba(45,122,99,0.5)]',
    error: 'bg-[rgba(139,38,53,0.9)] border-[rgba(139,38,53,0.5)]',
    info: 'bg-[rgba(212,175,55,0.9)] border-[rgba(212,175,55,0.5)]',
    warning: 'bg-[rgba(212,175,55,0.85)] border-[rgba(212,175,55,0.5)]',
  };

  const textColors = {
    success: 'text-[#5CCBA9]',
    error: 'text-[#E07A8A]',
    info: 'text-[#0a0e12]',
    warning: 'text-[#0a0e12]',
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '!',
  };

  return (
    <div
      className={`
        max-w-sm px-5 py-4 rounded-lg border flex items-center gap-3
        ${bgColors[type]}
        ${textColors[type]}
        ${
          isExiting
            ? 'opacity-0 translate-y-2'
            : 'opacity-100 translate-y-0'
        }
      `}
      role="alert"
      aria-live="polite"
    >
      <span className="text-lg font-bold flex-shrink-0 w-5 h-5 flex items-center justify-center">
        {icons[type]}
      </span>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
};

export default Toast;
