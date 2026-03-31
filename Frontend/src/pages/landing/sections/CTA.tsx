import React from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';

const CTA: React.FC = () => {
  return (
    <section className="py-40 px-8 relative overflow-hidden">
      {/* Atmospheric glow */}
      <div className="glow-emerald absolute inset-0 pointer-events-none" aria-hidden="true" />

      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto text-center">
        <p className="eyebrow mb-4">Get Started</p>

        <h2 id="cta-heading" className="font-serif text-4xl md:text-5xl font-bold leading-tight mb-5">
          Ready to Play?
        </h2>

        <p className="text-lg text-text leading-relaxed mb-10">
          Create a free account and start playing in seconds. No deposit, no real money — just the game.
        </p>

        <Link to="/signup">
          <Button variant="gold" size="md" className="mb-5">
            Create Free Account
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
