import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import { BlackjackIcon, PokerIcon, SlotsIcon } from '@/components/icons/GameIcons';

interface GameRowData {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: React.ComponentType<{ width?: number; height?: number; className?: string }>;
  visual: string;
  glow: string;
  path: string;
}

const GAMES: GameRowData[] = [
  {
    id: 'blackjack',
    name: 'Blackjack',
    tagline: 'Beat the dealer, not the house edge.',
    description: 'Practice solo or take a seat at a live table. Same rules, no pressure.',
    icon: BlackjackIcon,
    visual: 'bg-[#091a12]',
    glow: 'rgba(45,122,99,0.18)',
    path: '/games/blackjack',
  },
  {
    id: 'poker',
    name: "Hold'em",
    tagline: 'Read the table, not just your cards.',
    description: 'Full ring games, real opponents, whenever you want in.',
    icon: PokerIcon,
    visual: 'bg-[#08131e]',
    glow: 'rgba(212,175,55,0.14)',
    path: '/games/poker',
  },
  {
    id: 'slots',
    name: 'Slots',
    tagline: 'Some machines just feel lucky.',
    description: 'Spin solo, or watch the leaderboard shift while you play.',
    icon: SlotsIcon,
    visual: 'bg-[#140910]',
    glow: 'rgba(139,38,53,0.18)',
    path: '/games/slots',
  },
];

const GameRow: React.FC<GameRowData & { flip: boolean }> = ({
  name,
  tagline,
  description,
  icon: Icon,
  visual,
  glow,
  path,
  flip,
}) => {
  return (
    <div
      className={`flex flex-col md:flex-row ${flip ? 'md:flex-row-reverse' : ''} items-stretch gap-8 md:gap-10 border-b border-[rgba(212,175,55,0.08)] py-14 last:border-b-0`}
    >
      <div className={`flex-1 flex items-center justify-center relative overflow-hidden rounded-2xl ${visual} min-h-[220px]`}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 60% 70% at 50% 55%, ${glow} 0%, transparent 70%)` }}
          aria-hidden="true"
        />
        <div className="relative z-10 card-icon">
          <Icon width={150} height={120} />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <h3 className="font-serif text-3xl font-semibold leading-tight mb-2">{name}</h3>
        <p className="text-lg text-[var(--gold)] font-medium mb-3">{tagline}</p>
        <p className="text-base leading-relaxed mb-6" style={{ color: 'var(--text-2)' }}>
          {description}
        </p>
        <Link to={path}>
          <Button variant="ghost" size="sm" className="self-start">
            Play Now
          </Button>
        </Link>
      </div>
    </div>
  );
};

const Games: React.FC = () => {
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
      { threshold: 0.1, rootMargin: '-40px' }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="games" className="py-16 px-8" aria-labelledby="games-heading">
      <div className="max-w-5xl mx-auto">
        <h2
          id="games-heading"
          className={`font-serif text-2xl md:text-3xl font-semibold mb-4 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            hasEntered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Three tables. Pick one.
        </h2>

        <div role="list">
          {GAMES.map((game, index) => (
            <div
              key={game.id}
              role="listitem"
              className={`transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                hasEntered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <GameRow {...game} flip={index % 2 === 1} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Games;
