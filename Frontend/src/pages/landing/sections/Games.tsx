import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { BlackjackIcon, PokerIcon, SlotsIcon } from '@/components/icons/GameIcons';

interface GameCardData {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ width?: number; height?: number; className?: string }>;
  badge: {
    text: string;
    type: 'live' | 'ai' | 'new';
  };
  visual: string;
  path: string;
}

const GAMES: GameCardData[] = [
  {
    id: 'blackjack',
    name: 'Blackjack',
    description: 'Classic 21 against the dealer. Go solo, train with AI, or take a seat at a live multiplayer table.',
    icon: BlackjackIcon,
    badge: { text: 'Live', type: 'live' },
    visual: 'bg-[#091a12]',
    path: '/games/blackjack',
  },
  {
    id: 'poker',
    name: 'Texas Hold\'em',
    description:
      'Full-table poker with adaptive AI opponents and real-time remote multiplayer across sessions.',
    icon: PokerIcon,
    badge: { text: 'AI', type: 'ai' },
    visual: 'bg-[#08131e]',
    path: '/games/poker',
  },
  {
    id: 'slots',
    name: 'Slot Machines',
    description: 'Multiple machines with unique paylines and bonus rounds. Spin solo or watch the leaderboard live.',
    icon: SlotsIcon,
    badge: { text: 'New', type: 'new' },
    visual: 'bg-[#140910]',
    path: '/games/slots',
  },
];

const badgeStyles = {
  live: 'bg-[rgba(45,122,99,0.24)] text-[#5CCBA9] border border-[rgba(45,122,99,0.48)]',
  ai: 'bg-[rgba(212,175,55,0.2)] text-[var(--gold)] border border-[rgba(212,175,55,0.36)]',
  new: 'bg-[rgba(139,38,53,0.26)] text-[#E07A8A] border border-[rgba(139,38,53,0.48)]',
};

const GameCard: React.FC<GameCardData> = ({ name, description, icon: Icon, badge, visual, path }) => {
  return (
    <Link to={path}>
      <Card hoverable tabIndex={0} aria-label={`${name} — Play Now`} className="h-full flex flex-col">
        {/* Visual area */}
        <div className={`h-56 flex items-center justify-center relative overflow-hidden ${visual} flex-shrink-0`}>
          <Icon width={160} height={130} />
        </div>

        {/* Body */}
        <div className="p-7 flex flex-col flex-1">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.09em] px-2.5 py-1 rounded-full mb-4 ${badgeStyles[badge.type]}`}>
            {badge.type === 'live' && (
              <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
            )}
            {badge.text}
          </span>

          <h3 className="font-serif text-2xl font-semibold leading-tight mb-2">{name}</h3>
          <p className="text-base text-text-2 leading-relaxed mb-5.5 flex-1">{description}</p>

          <Button variant="ghost" size="sm" className="mt-auto">
            Play Now
          </Button>
        </div>
      </Card>
    </Link>
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
    <section ref={sectionRef} id="games" className="py-24 px-8" aria-labelledby="games-heading">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-14">
          <p
            className={`eyebrow mb-3.5 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
              hasEntered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '0ms' }}
          >
            Featured Games
          </p>
          <h2
            id="games-heading"
            className={`font-serif text-4xl md:text-5xl font-semibold leading-tight mb-3.5 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
              hasEntered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '80ms' }}
          >
            Choose Your Game
          </h2>
          <p
            className={`text-base text-text max-w-sm mx-auto leading-relaxed transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
              hasEntered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '160ms' }}
          >
            Three classic casino experiences.
          </p>
        </div>

        {/* Games grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" role="list">
          {GAMES.map((game, index) => (
            <div
              key={game.id}
              role="listitem"
              className={`transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                hasEntered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
              style={{ transitionDelay: `${280 + index * 100}ms` }}
            >
              <GameCard {...game} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Games;
