import React from 'react';

const CARD_ROTATIONS = [-8, 0, 8];

const HeroVisual: React.FC = () => {
  return (
    <div
      className="relative w-full h-full min-h-[280px] flex items-center justify-center"
      aria-hidden="true"
    >
      <div className="relative flex items-end justify-center gap-3">
        {CARD_ROTATIONS.map((rot, index) => (
          <div
            key={rot}
            className="hero-visual-card w-16 h-24 md:w-20 md:h-28 rounded-lg bg-[var(--text)] shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
            style={
              {
                '--card-rot': `${rot}deg`,
                animationDelay: `${index * 180}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <div className="absolute -bottom-2 flex items-center gap-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="hero-visual-chip w-8 h-8 rounded-full border-4 border-[var(--gold)] bg-[#1a1408]"
            style={{ animationDelay: `${900 + i * 220}ms` } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroVisual;
