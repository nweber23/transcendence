import React from 'react';

export const SUITS = ['♠', '♥', '♦', '♣'] as const;
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

export type Suit = (typeof SUITS)[number];
export type Rank = (typeof RANKS)[number];

export interface CardData {
  rank: Rank;
  suit: Suit;
}

const SIZES = {
  sm: { width: '2.25rem', height: '3.15rem', index: '0.5rem', pip: '0.95rem', radius: '0.25rem' },
  md: { width: '3.25rem', height: '4.55rem', index: '0.65rem', pip: '1.4rem', radius: '0.375rem' },
  lg: { width: '4.5rem', height: '6.3rem', index: '0.8rem', pip: '2rem', radius: '0.5rem' },
  xl: { width: '5.5rem', height: '7.7rem', index: '0.95rem', pip: '2.5rem', radius: '0.625rem' },
} as const;

export type CardSize = keyof typeof SIZES;

interface PlayingCardProps {
  card?: CardData;
  faceDown?: boolean;
  size?: CardSize;
  className?: string;
  style?: React.CSSProperties;
}

/** Empty outlined slot marking where a card will land on the felt. */
export const CardSlot: React.FC<{ size?: CardSize; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const s = SIZES[size];
  return (
    <div
      className={`shrink-0 border border-dashed border-[rgba(212,175,55,0.2)] bg-[rgba(0,0,0,0.15)] ${className}`}
      style={{ width: s.width, height: s.height, borderRadius: s.radius }}
      aria-hidden="true"
    />
  );
};

const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  faceDown = false,
  size = 'md',
  className = '',
  style,
}) => {
  const s = SIZES[size];

  if (faceDown || !card) {
    return (
      <div
        className={`relative shrink-0 ${className}`}
        style={{
          width: s.width,
          height: s.height,
          borderRadius: s.radius,
          background: 'linear-gradient(160deg, #1c2a38 0%, #101922 100%)',
          border: '1px solid rgba(212,175,55,0.38)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
          ...style,
        }}
        aria-label="Face-down card"
      >
        <div
          className="absolute flex items-center justify-center"
          style={{
            inset: '9%',
            borderRadius: `calc(${s.radius} - 2px)`,
            border: '1px solid rgba(212,175,55,0.22)',
            background: [
              'repeating-linear-gradient(45deg, rgba(212,175,55,0.08) 0 2px, transparent 2px 7px)',
              'repeating-linear-gradient(-45deg, rgba(212,175,55,0.08) 0 2px, transparent 2px 7px)',
            ].join(', '),
          }}
        >
          <span className="leading-none" style={{ color: 'rgba(212,175,55,0.55)', fontSize: s.pip }}>
            ◆
          </span>
        </div>
      </div>
    );
  }

  const isRed = card.suit === '♥' || card.suit === '♦';
  const color = isRed ? '#9c2638' : '#1c2630';

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{
        width: s.width,
        height: s.height,
        borderRadius: s.radius,
        background: 'linear-gradient(165deg, #faf6ec 0%, #ece5d3 100%)',
        border: '1px solid rgba(16,22,28,0.25)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.7)',
        ...style,
      }}
      aria-label={`${card.rank} of ${card.suit}`}
    >
      <div
        className="absolute top-[5%] left-[8%] flex flex-col items-center leading-none"
        style={{ color, fontSize: s.index }}
      >
        <span className="font-serif font-bold">{card.rank}</span>
        <span style={{ marginTop: '0.15em' }}>{card.suit}</span>
      </div>
      <div
        className="absolute bottom-[5%] right-[8%] flex flex-col items-center leading-none rotate-180"
        style={{ color, fontSize: s.index }}
      >
        <span className="font-serif font-bold">{card.rank}</span>
        <span style={{ marginTop: '0.15em' }}>{card.suit}</span>
      </div>
      <div
        className="absolute inset-0 flex items-center justify-center leading-none"
        style={{ color, fontSize: s.pip }}
      >
        {card.suit}
      </div>
    </div>
  );
};

export default PlayingCard;
