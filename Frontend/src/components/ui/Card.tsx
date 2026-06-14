import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = '', hoverable = false, ...props }, ref) => {
    return (
      // Outer shell — className goes here so callers can control layout (h-full, margins, etc.)
      <div
        ref={ref}
        className={`
          bg-[rgba(255,255,255,0.025)] border border-[rgba(255,255,255,0.06)] p-1.5 rounded-[2rem]
          ${hoverable ? 'card-transition cursor-pointer' : ''}
          ${className}
        `}
        {...props}
      >
        {/* Inner core */}
        <div
          className="
            h-full bg-[var(--surface)] rounded-[calc(2rem-0.375rem)] overflow-hidden
            shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]
          "
        >
          {children}
        </div>
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
