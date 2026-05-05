import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeButton?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeButton = true,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center px-4
        transition-opacity duration-200 ease-out
        ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}
      onClick={onClose}
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className={`
          absolute inset-0 bg-[rgba(10,14,18,0.6)] backdrop-blur-sm
          transition-opacity duration-200
          ${isOpen ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        className={`
          relative bg-[var(--surface)] border border-[rgba(212,175,55,0.2)] rounded-2xl
          shadow-[0_20px_60px_rgba(0,0,0,0.4)]
          transition-all duration-300 ease-out
          ${sizeClasses[size]} w-full
          ${
            isOpen
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-95'
          }
        `}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-8 py-6 border-b border-[rgba(212,175,55,0.1)]">
            <h2 className="font-serif text-xl font-semibold text-[var(--text)]">
              {title}
            </h2>
            {closeButton && (
              <button
                onClick={onClose}
                className="text-[var(--text-2)] hover:text-[var(--text)] transition-colors"
                aria-label="Close modal"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-8 py-6">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
