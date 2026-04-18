import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = '', hoverable = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden
          ${hoverable ? 'cursor-pointer card-transition hover:border-[rgba(212,175,55,0.42)] hover:-translate-y-1.5 hover:shadow-[0_8px_32px_rgba(212,175,55,0.15)]' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
