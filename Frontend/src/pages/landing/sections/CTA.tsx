import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';

const CTA: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasEntered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '-40px' }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 px-8 relative" aria-labelledby="cta-heading">
      <div className="relative z-10 max-w-lg mx-auto text-center">
        <h2
          id="cta-heading"
          className={`font-serif text-4xl md:text-5xl font-bold leading-tight mb-5 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            hasEntered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Come sit down.
        </h2>

        <p
          className={`text-lg text-[var(--text-2)] leading-relaxed mb-10 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            hasEntered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '80ms' }}
        >
          Create an account and you&rsquo;re at the table in under a minute.
          No deposit, no real money — just the game.
        </p>

        <div
          className={`transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            hasEntered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '160ms' }}
        >
          <Link to="/signup">
            <Button variant="gold" size="md" className="mb-5">
              Create free account
              <span className="w-6 h-6 rounded-full bg-black/15 flex items-center justify-center flex-shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-px transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path d="M2 8L8 2M8 2H3.5M8 2V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </Button>
          </Link>

          <p className="text-sm text-[var(--text-3)] leading-relaxed">
            Already playing?{' '}
            <Link to="/login" className="text-[var(--gold)] underline underline-offset-[3px] hover:opacity-85 transition-opacity duration-200">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTA;
