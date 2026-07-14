import React from 'react';
import PlayingCard, { type CardData } from '@/components/games/PlayingCard';

const CARDS: { card: CardData; rotation: number }[] = [
  { card: { rank: 'A', suit: '♠' }, rotation: -8 },
  { card: { rank: 'K', suit: '♥' }, rotation: 0 },
  { card: { rank: 'Q', suit: '♦' }, rotation: 8 },
];

const HeroVisual: React.FC = () => {
  return (
    <div
      className="relative w-full h-full min-h-[280px] flex items-center justify-center"
      aria-hidden="true"
    >
      <div className="relative flex items-end justify-center gap-3">
        {CARDS.map(({ card, rotation }, index) => (
          <PlayingCard
            key={`${card.rank}${card.suit}`}
            card={card}
            size="lg"
            className="hero-visual-card"
            style={
              {
                '--card-rot': `${rotation}deg`,
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
