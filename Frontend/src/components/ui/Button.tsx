import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'outline' | 'ghost' | 'nav-ghost' | 'nav-primary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'gold', size = 'md', className = '', ...props }, ref) => {
    const baseStyles =
      'group inline-flex items-center justify-center gap-2 font-semibold border-none cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-[var(--gold)] focus-visible:outline-offset-2 active:scale-[0.98] active:opacity-85 btn-base-transition';

    const variantStyles = {
      gold: 'bg-[var(--gold)] text-[#0a0e12] btn-gold-transition hover:opacity-90 hover:shadow-lg',
      outline:
        'bg-[rgba(212,175,55,0.32)] text-[#0a0e12] border-2 border-[var(--gold)] font-bold btn-outline-transition hover:bg-[rgba(212,175,55,0.42)] hover:shadow-lg',
      ghost: 'bg-[rgba(212,175,55,0.35)] text-[var(--gold)] border border-[rgba(212,175,55,0.65)] btn-ghost-transition hover:bg-[rgba(212,175,55,0.48)] hover:border-[rgba(212,175,55,0.8)]',
      'nav-ghost':
        'bg-none text-[var(--text-2)] px-4 py-2 btn-nav-ghost-transition active:bg-[rgba(255,255,255,0.12)] hover:text-[var(--text)] hover:bg-[rgba(255,255,255,0.06)]',
      'nav-primary': 'bg-[var(--gold)] text-[#0a0e12] px-[1.125rem] py-2 btn-nav-primary-transition hover:opacity-90 hover:shadow-md',
    };

    const sizeStyles = {
      sm: 'text-sm px-5 py-2',
      md: 'text-base px-8 py-3.5',
      lg: 'text-lg px-10 py-4',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export default Button;
