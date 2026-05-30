import React from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';

const CTA: React.FC = () => {
  return (
    <section className="py-24 px-8 relative" aria-labelledby="cta-heading">
      {/* Top divider */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-12 bg-gradient-to-b from-[rgba(212,175,55,0.2)] to-transparent pointer-events-none" aria-hidden="true" />

      {/* Atmospheric glow */}
      <div className="glow-emerald absolute inset-0 pointer-events-none" aria-hidden="true" />

      {/* Content */}
      <div className="relative z-10 max-w-lg mx-auto text-center">
        <p className="eyebrow mb-4">Get Started</p>

        <h2 id="cta-heading" className="font-serif text-4xl md:text-5xl font-bold leading-tight mb-5">
          Ready to Play?
        </h2>

        <p className="text-lg text-[var(--text-2)] leading-relaxed mb-10">
          Create a free account and start playing in seconds.
          No deposit, no real money — just the game.
        </p>

        <Link to="/signup">
          <Button variant="gold" size="md" className="mb-5">
            Create Free Account
            <span className="w-6 h-6 rounded-full bg-black/15 flex items-center justify-center flex-shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-px transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M2 8L8 2M8 2H3.5M8 2V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </Button>
        </Link>

        <p className="text-sm text-[var(--text-3)] leading-relaxed">
          Already have an account?{' '}
          <Link to="/login" className="text-[var(--gold)] underline underline-offset-[3px] hover:opacity-85 transition-opacity duration-200">
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
};

export default CTA;
