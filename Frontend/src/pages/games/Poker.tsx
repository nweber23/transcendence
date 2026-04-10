import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';

interface Player {
  id: number;
  name: string;
  stack: number;
  currentBet: number;
  status: 'active' | 'folded' | 'waiting' | 'empty';
  isDealer?: boolean;
  cards?: string[];
}

// Proper 6-seat oval positioning
const PLAYER_POSITIONS = [
  { id: 0, top: '85%', left: '50%', transform: 'translateX(-50%)' }, // Bottom center (You)
  { id: 1, top: '65%', left: '80%' }, // Bottom right
  { id: 2, top: '25%', left: '80%' }, // Top right
  { id: 3, top: '5%', left: '50%', transform: 'translateX(-50%)' }, // Top center
  { id: 4, top: '25%', left: '12%' }, // Top left
  { id: 5, top: '65%', left: '12%' }, // Bottom left
];

const Poker: React.FC = () => {
  const navigate = useNavigate();

  // Game state
  const [players, setPlayers] = useState<Player[]>(
    Array(6)
      .fill(null)
      .map((_, i) => ({
        id: i,
        name: '',
        stack: 0,
        currentBet: 0,
        status: 'empty' as const,
        isDealer: false,
        cards: [],
      }))
  );

  const [currentBet, setCurrentBet] = useState(0);
  const [pot, setPot] = useState(0);
  const [communityCards, setCommunityCards] = useState<string[]>([]);

  return (
    <div className="min-h-screen bg-[var(--base)] overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[var(--surface)] border-b border-[rgba(212,175,55,0.1)]">
        <div className="container-max py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-[var(--gold)] hover:text-[var(--text)] transition-colors"
          >
            ← Back
          </button>
          <h1 className="font-serif text-2xl font-semibold">Texas Hold'em Poker</h1>
          <div className="w-24" />
        </div>
      </header>

      {/* Main Game Area */}
      <main className="py-12">
        {/* Poker Table Container */}
        <div className="mb-16 flex justify-center px-8">
          {/* Responsive oval table with 35% aspect ratio (wider/flatter) */}
          <div className="relative w-full" style={{ paddingBottom: '35%', maxWidth: '1400px' }}>
            {/* Wood Rail Border - using dark surface gradients */}
            <div className="absolute inset-0 rounded-[50%] border-[16px] shadow-xl"
              style={{
                borderColor: 'rgba(212, 175, 55, 0.2)',
                background: 'linear-gradient(135deg, rgba(25,36,48,0.6), rgba(15,20,25,0.9))',
                boxShadow: '0 0 60px rgba(0,0,0,0.8), inset 0 0 30px rgba(0,0,0,0.6)',
              }}>

              {/* Felt Surface - using emerald base */}
              <div className="absolute inset-2 rounded-[50%] bg-gradient-to-b from-[#1B4D3E] to-[#0f2e26]"
                style={{
                  boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)',
                }}>

                {/* Felt Inner Line Decoration */}
                <div className="absolute inset-4 rounded-[50%] border border-[rgba(212,175,55,0.15)]" />

                {/* Community Cards Area - Center */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 text-center">
                  <div className="mb-8">
                    <p className="eyebrow mb-4">COMMUNITY CARDS</p>
                    <div className="flex justify-center gap-2">
                      {communityCards.length > 0 ? (
                        communityCards.map((card, idx) => (
                          <PlayingCard key={idx} card={card} faceUp={true} />
                        ))
                      ) : (
                        <div className="flex gap-2">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <PlayingCard key={i} card="" faceUp={false} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pot Display */}
                  <div className="bg-[rgba(212,175,55,0.15)] border-2 border-[rgba(212,175,55,0.4)] rounded-full px-8 py-3 text-center backdrop-blur-sm">
                    <p className="text-xs text-[var(--text-3)] uppercase tracking-widest mb-1">POT</p>
                    <p className="font-serif text-3xl text-[var(--gold)]">${pot}</p>
                  </div>
                </div>

                {/* Player Seats - 6 positions around table */}
                {players.map((player) => {
                  const position = PLAYER_POSITIONS[player.id];
                  return (
                    <div
                      key={player.id}
                      className="absolute z-20 transition-all duration-300"
                      style={{
                        top: position.top,
                        left: position.left,
                        transform: position.transform || 'none',
                      }}
                    >
                      <PlayerSeat player={player} isCurrentPlayer={player.id === 0} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Game Controls - Join Table */}
        <div className="container-max mb-16">
          <div className="space-y-6 max-w-2xl mx-auto">
            {/* Bet section */}
            <div className="border border-[rgba(212,175,55,0.1)] rounded-lg p-8 bg-[var(--surface)] hover:border-[rgba(212,175,55,0.2)] transition-colors">
              <label className="block text-sm font-semibold text-[var(--text-2)] mb-4">
                Join Table
              </label>

              {/* Quick bet buttons */}
              <div className="mb-6">
                <p className="text-xs text-[var(--text-3)] mb-2">Quick Bets</p>
                <div className="flex gap-3 flex-wrap">
                  {[10, 50, 100, 250, 500, 1000].map((amount) => (
                    <button
                      key={`bet-${amount}`}
                      onClick={() => setCurrentBet(amount)}
                      className="px-4 py-3 rounded border border-[rgba(212,175,55,0.1)] text-[var(--text-2)] text-sm font-medium hover:border-[var(--gold)] hover:text-[var(--gold)] transition-all min-w-20"
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual bet input */}
              <div className="mb-6">
                <label htmlFor="betInput" className="block text-xs text-[var(--text-3)] mb-2">
                  Enter Amount
                </label>
                <div className="flex gap-3">
                  <input
                    id="betInput"
                    type="number"
                    min="0"
                    value={currentBet}
                    onChange={(e) =>
                      setCurrentBet(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="flex-1 px-4 py-3 rounded-lg bg-[var(--surface-2)] border border-[rgba(212,175,55,0.1)] text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:ring-opacity-50 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-moz-number-input-spinner]:hidden"
                    placeholder="0"
                  />
                  <button
                    onClick={() => setCurrentBet(0)}
                    className="px-6 py-3 rounded border border-[rgba(212,175,55,0.1)] text-[var(--text-2)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition-all font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Current bet display */}
              <div className="bg-[var(--surface-2)] rounded p-4 mb-6">
                <p className="text-xs text-[var(--text-3)] mb-2">Your Bet</p>
                <p className="font-serif text-2xl text-[var(--gold)]">${currentBet}</p>
              </div>

              <Button
                variant="gold"
                className="w-full"
                disabled={currentBet === 0}
              >
                Join Table
              </Button>
            </div>
          </div>
        </div>

        {/* Table Info */}
        <div className="container-max">
          <div className="grid grid-cols-5 gap-4 mb-16">
            <div className="bg-[var(--surface)] border border-[rgba(212,175,55,0.1)] rounded-lg p-6">
              <p className="text-xs text-[var(--text-3)] uppercase tracking-widest mb-2">Blinds</p>
              <p className="font-serif text-2xl text-[var(--gold)]">$10 / $20</p>
            </div>
            <div className="bg-[var(--surface)] border border-[rgba(212,175,55,0.1)] rounded-lg p-6 text-center">
              <p className="text-xs text-[var(--text-3)] uppercase tracking-widest mb-2">Players</p>
              <p className="font-serif text-2xl text-[var(--gold)]">0/6</p>
            </div>
            <div className="bg-[var(--surface)] border border-[rgba(212,175,55,0.1)] rounded-lg p-6 text-center">
              <p className="text-xs text-[var(--text-3)] uppercase tracking-widest mb-2">Min Bet</p>
              <p className="font-serif text-2xl text-[var(--gold)]">$10</p>
            </div>
            <div className="bg-[var(--surface)] border border-[rgba(212,175,55,0.1)] rounded-lg p-6 text-center">
              <p className="text-xs text-[var(--text-3)] uppercase tracking-widest mb-2">Max Players</p>
              <p className="font-serif text-2xl text-[var(--gold)]">6</p>
            </div>
            <div className="bg-[var(--surface)] border border-[rgba(212,175,55,0.1)] rounded-lg p-6 text-center">
              <p className="text-xs text-[var(--text-3)] uppercase tracking-widest mb-2">Status</p>
              <p className="font-serif text-2xl text-[var(--emerald)]">Waiting</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Playing Card Component
const PlayingCard: React.FC<{ card: string; faceUp: boolean }> = ({ card, faceUp }) => {
  const getSuitColor = (suit: string) => {
    return suit === '♥' || suit === '♦' ? 'text-red-500' : 'text-[var(--text)]';
  };

  const getRank = (card: string) => card.slice(0, -1);
  const getSuit = (card: string) => card.slice(-1);

  return (
    <div
      className={`w-12 h-16 rounded-lg border-2 flex flex-col items-center justify-center font-serif font-bold transition-all ${
        faceUp
          ? 'bg-white text-black border-gray-300 shadow-lg'
          : 'bg-[var(--surface-2)] border-[rgba(212,175,55,0.2)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)]'
      }`}
    >
      {faceUp && card ? (
        <>
          <div className="text-sm leading-none">{getRank(card)}</div>
          <div className={`text-base leading-none ${getSuitColor(getSuit(card))}`}>
            {getSuit(card)}
          </div>
        </>
      ) : null}
    </div>
  );
};

// Player Seat Component
const PlayerSeat: React.FC<{ player: Player; isCurrentPlayer?: boolean }> = ({ player, isCurrentPlayer = false }) => {
  const isEmpty = player.status === 'empty';
  const isFolded = player.status === 'folded';
  const getInitials = (name: string) => {
    if (name === 'You') return 'Y';
    const parts = name.split(' ');
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name[0].toUpperCase();
  };

  return (
    <div className="flex flex-col items-center text-center">
      {/* Avatar Ring */}
      <div
        className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 border-3 transition-all ${
          isEmpty
            ? 'bg-[rgba(212,175,55,0.05)] border-[rgba(212,175,55,0.1)]'
            : isFolded
              ? 'bg-[rgba(212,175,55,0.08)] border-[rgba(212,175,55,0.2)] opacity-50 grayscale'
              : isCurrentPlayer
                ? 'bg-[rgba(212,175,55,0.2)] border-[var(--gold)] animate-pulse'
                : 'bg-[rgba(212,175,55,0.1)] border-[rgba(212,175,55,0.3)]'
        }`}
      >
        {isEmpty ? (
          <p className="text-[var(--text-3)] text-xs">—</p>
        ) : (
          <p className="font-semibold text-lg text-[var(--text)]">{getInitials(player.name)}</p>
        )}
      </div>

      {/* Player Name */}
      {!isEmpty && (
        <p className="text-xs font-semibold text-[var(--text)] mb-1 min-h-[16px]">{player.name}</p>
      )}

      {/* Hole Cards */}
      {!isEmpty && (
        <div className="flex justify-center gap-1 mb-2">
          {player.cards && player.cards.length > 0 ? (
            player.cards.map((card, idx) => (
              <PlayingCard key={idx} card={card} faceUp={true} />
            ))
          ) : (
            <>
              <PlayingCard card="" faceUp={false} />
              <PlayingCard card="" faceUp={false} />
            </>
          )}
        </div>
      )}

      {/* Stack Chip */}
      {!isEmpty && (
        <div className="bg-[var(--gold)] text-[#0a0e12] rounded-full px-2 py-1 text-xs font-bold whitespace-nowrap">
          ${player.stack}
        </div>
      )}

      {/* Current Bet Chip - overlays toward table center */}
      {!isEmpty && player.currentBet > 0 && (
        <div className="absolute -bottom-2 w-10 h-10 rounded-full bg-[rgba(212,175,55,0.3)] border-2 border-[var(--gold)] flex items-center justify-center text-xs font-bold text-[var(--gold)]">
          ${player.currentBet}
        </div>
      )}

      {/* Status Badge */}
      {isFolded && (
        <p className="text-xs text-[var(--red)] mt-1 font-semibold">FOLDED</p>
      )}

      {/* Dealer Button */}
      {player.isDealer && !isEmpty && (
        <div className="absolute -right-1 -top-1 w-6 h-6 rounded-full bg-[var(--gold)] flex items-center justify-center text-[#0a0e12] text-xs font-bold border border-[rgba(212,175,55,0.5)]">
          D
        </div>
      )}
    </div>
  );
};


export default Poker;
