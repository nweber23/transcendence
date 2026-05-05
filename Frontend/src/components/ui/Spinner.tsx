import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal';
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  variant = 'default',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div
      className={`
        inline-flex items-center justify-center
        ${sizeClasses[size]}
        ${className}
      `}
      aria-busy="true"
      aria-label="Loading"
    >
      {variant === 'default' && (
        <svg
          className="animate-spin-fast text-[var(--gold)]"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          {/* Outer ring for visual weight */}
          <circle
            className="opacity-20"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
          />
          {/* Spinning part */}
          <path
            className="opacity-100"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}

      {variant === 'minimal' && (
        <div className="relative w-full h-full">
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--gold)] animate-spin-fast"
            style={{
              borderTopColor: 'var(--gold)',
            }}
          />
          {/* Pulse effect underneath */}
          <div
            className="absolute inset-0 rounded-full border border-[var(--gold)] opacity-20 animate-pulse"
            style={{
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Spinner;
