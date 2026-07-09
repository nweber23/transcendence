import React from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Balatro from '@/components/Balatro';
import HeroVisual from './HeroVisual';

const Hero: React.FC = () => {
  return (
    <section className="hero min-h-screen flex items-center relative overflow-hidden" aria-labelledby="hero-heading">
      {/* Ambient background texture — low opacity, supporting the split layout below */}
      <div className="absolute inset-0 pointer-events-none opacity-30" aria-hidden="true">
        <Balatro
          isRotate={false}
          mouseInteraction
          pixelFilter={2000}
          color1="#DE443B"
          color2="#006BB4"
          color3="#162325"
        />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-8 py-32 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Left column — copy */}
        <div className="text-left fade-in-up" style={{ animationDelay: '0ms' }}>
          <h1
            id="hero-heading"
            className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-5"
          >
            Sit down.
            <br />
            The table&rsquo;s <em className="italic text-[var(--gold)]">live.</em>
          </h1>

          <p className="text-lg text-[var(--text-2)] max-w-md mb-8 leading-relaxed">
            Blackjack, hold&rsquo;em, and slots — against real players, right now. No chips required.
          </p>

          <div className="flex flex-col sm:flex-row items-start gap-4">
            <Link to="/login">
              <Button variant="gold" size="md">
                Sit down at a table
                <span className="w-6 h-6 rounded-full bg-black/15 flex items-center justify-center flex-shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-px transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="M2 8L8 2M8 2H3.5M8 2V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </Button>
            </Link>
            <a href="#games">
              <Button variant="ghost" size="md">Watch a hand first</Button>
            </a>
          </div>
        </div>

        {/* Right column — live-feeling visual */}
        <div className="fade-in-up" style={{ animationDelay: '150ms' }}>
          <HeroVisual />
        </div>
      </div>
    </section>
  );
};

export default Hero;
