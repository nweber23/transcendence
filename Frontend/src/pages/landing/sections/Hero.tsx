import React from 'react';
import Button from '@/components/ui/Button';
import Balatro from '@/components/Balatro';

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
  return (
    <section className="hero min-h-screen flex flex-col pt-16" aria-labelledby="hero-heading">
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

        {/* Content */}
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <p className="eyebrow mb-5">Premium Casino Platform</p>

          <h1
            id="hero-heading"
            className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight mb-6"
          >
            Where Strategy
            <br />
            Meets <em className="italic text-[var(--gold)]">Fortune</em>
          </h1>

          <p className="text-lg text-text max-w-lg mx-auto mb-8 leading-relaxed">
            Experience sophisticated casino gaming — blackjack, poker, and slots. Compete against AI or
            challenge real players in live, real-time tables.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="gold" size="md">
              Play for Free
            </Button>
            <Button variant="gold" size="md">
              Explore Games
            </Button>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="border-t border-[rgba(212,175,55,0.1)] bg-[var(--surface)]">
        <div className="grid grid-cols-2 md:grid-cols-4 max-w-5xl mx-auto divide-x divide-[rgba(212,175,55,0.08)]">
          {STATS.map((stat) => (
            <div key={stat.label} className="px-4 py-6 text-center">
              <span className="block font-serif text-3xl font-bold text-[var(--gold)] leading-tight">
                {stat.value}
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
