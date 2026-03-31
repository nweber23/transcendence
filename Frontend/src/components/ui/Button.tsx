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
      'inline-flex items-center justify-center gap-2 font-semibold border-none cursor-pointer rounded transition-all duration-150 focus-visible:outline-2 focus-visible:outline-[var(--gold)] focus-visible:outline-offset-2 active:scale-98';

    const variantStyles = {
      gold: 'bg-[var(--gold)] text-[#0a0e12] hover:opacity-90 hover:shadow-lg active:opacity-85 transition-all duration-200',
      outline:
        'bg-[rgba(212,175,55,0.32)] text-[#0a0e12] border-2 border-[var(--gold)] font-bold hover:bg-[rgba(212,175,55,0.42)] hover:shadow-lg active:bg-[rgba(212,175,55,0.50)] transition-all duration-200',
      ghost: 'bg-[rgba(212,175,55,0.16)] text-[var(--gold)] border border-[rgba(212,175,55,0.28)] hover:bg-[rgba(212,175,55,0.28)] hover:border-[rgba(212,175,55,0.42)] active:bg-[rgba(212,175,55,0.32)] transition-all duration-200',
      'nav-ghost':
        'bg-none text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[rgba(255,255,255,0.06)] active:bg-[rgba(255,255,255,0.08)] rounded px-4 py-2 transition-all duration-150',
      'nav-primary': 'bg-[var(--gold)] text-[#0a0e12] hover:opacity-90 hover:shadow-md active:opacity-85 px-[1.125rem] py-2 transition-all duration-200',
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
