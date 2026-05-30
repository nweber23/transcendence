import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Balatro from '@/components/Balatro';
import { useCountUp } from '@/hooks/useCountUp';

interface HeroStat {
  value: string;
  label: string;
}

const STATS: HeroStat[] = [
  { value: '3+', label: 'Casino Games' },
  { value: 'Live', label: 'Real-time Tables' },
  { value: 'AI', label: 'Smart Opponents' },
  { value: 'Free', label: 'No Real Money' },
];

const Hero: React.FC = () => {
  const statsRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: '-50px' }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const gameCount = useCountUp(3, 1200, isVisible);

  return (
    <section className="hero min-h-screen flex flex-col pt-24" aria-labelledby="hero-heading">
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden px-8 py-20">
        {/* Balatro background */}
        <div className="absolute inset-0 pointer-events-none opacity-80" aria-hidden="true">
          <Balatro
            isRotate={false}
            mouseInteraction
            pixelFilter={2000}
            color1="#DE443B"
            color2="#006BB4"
            color3="#162325"
          />
        </div>

        {/* Atmospheric glow */}
        <div className="glow-gold absolute inset-0 pointer-events-none" aria-hidden="true" />

        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, var(--base))' }}
          aria-hidden="true"
        />

        {/* Content */}
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <p className="eyebrow mb-5 fade-in-up" style={{ animationDelay: '0ms' }}>Premium Casino Platform</p>

          <h1
            id="hero-heading"
            className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight mb-6 fade-in-up"
            style={{ animationDelay: '100ms' }}
          >
            Where Strategy
            <br />
            Meets <em className="italic text-[var(--gold)]">Fortune</em>
          </h1>

          <p className="text-lg text-[var(--text)] max-w-lg mx-auto mb-8 leading-relaxed fade-in-up" style={{ animationDelay: '200ms' }}>
            Experience sophisticated casino gaming — blackjack, poker, and slots. Compete against AI or
            challenge real players in live, real-time tables.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 fade-in-up" style={{ animationDelay: '300ms' }}>
            <Link to="/login">
              <Button variant="gold" size="md">
                Play for Free
                <span className="w-6 h-6 rounded-full bg-black/15 flex items-center justify-center flex-shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-px transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="M2 8L8 2M8 2H3.5M8 2V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </Button>
            </Link>
            <a href="#games">
              <Button variant="ghost" size="md">Explore Games</Button>
            </a>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="border-t border-[rgba(212,175,55,0.1)] bg-[var(--surface)]" ref={statsRef}>
        <div className="grid grid-cols-2 md:grid-cols-4 max-w-5xl mx-auto divide-x divide-[rgba(212,175,55,0.08)]">
          {STATS.map((stat, index) => (
            <div key={stat.label} className="px-4 py-6 text-center">
              <span className="block font-serif text-3xl font-bold text-[var(--gold)] leading-tight">
                {index === 0 ? `${gameCount}+` : stat.value}
              </span>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-3)] mt-2">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
