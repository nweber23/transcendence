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

interface GameHistoryItem {
  id: string;
  date: string;
  result: 'win' | 'loss' | 'fold';
  potSize: number;
  yourContribution: number;
  winAmount: number;
}

const PLAYER_POSITIONS = [
  { id: 0, top: 'top-12', left: 'left-1/2', transform: '-translate-x-1/2' }, // Top center
  { id: 1, top: 'top-1/3', right: 'right-12', transform: '' }, // Top right
  { id: 2, top: '1/2 transform -translate-y-1/2', right: 'right-12', transform: 'top-1/2 -translate-y-1/2 right-12' }, // Middle right
  { id: 3, top: 'bottom-12', left: 'left-1/2', transform: '-translate-x-1/2' }, // Bottom center
  { id: 4, top: '1/2 transform -translate-y-1/2', left: 'left-12', transform: 'top-1/2 -translate-y-1/2 left-12' }, // Middle left
  { id: 5, top: 'top-1/3', left: 'left-12', transform: '' }, // Top left
];

const Poker: React.FC = () => {
  const navigate = useNavigate();

  // Game state
  const [players, setPlayers] = useState<Player[]>(
    Array(6)
      .fill(null)
      .map((_, i) => ({
        id: i,
        name: i === 0 ? 'You' : `Player ${i}`,
        stack: i === 0 ? 10000 : 5000,
        currentBet: 0,
        status: i === 0 ? 'active' : 'empty',
        isDealer: i === 0,
        cards: i === 0 ? ['K♠', 'Q♥'] : [],
      }))
  );

  const [gameHistory, setGameHistory] = useState<GameHistoryItem[]>([]);
  const [balance, setBalance] = useState(10000);
  const [currentBet, setCurrentBet] = useState(0);
  const [gameActive, setGameActive] = useState(false);
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
          <div className="text-right">
            <p className="text-xs text-[var(--text-3)] uppercase tracking-widest">Your Stack</p>
            <p className="font-serif text-xl text-[var(--gold)]">${balance}</p>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="container-max py-12">
        {/* Poker Table */}
        <div className="relative mb-16">
          {/* Table felt */}
          <div className="relative bg-gradient-to-br from-[#1B4D3E] to-[#0f2e26] rounded-full border-8 border-[rgba(212,175,55,0.15)] p-8 aspect-video min-h-[500px] flex items-center justify-center">
            {/* Community Cards Area */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="text-center mb-8">
                <p className="eyebrow mb-4">Community Cards</p>
                <div className="flex justify-center gap-3">
                  {communityCards.length > 0 ? (
                    communityCards.map((card, idx) => (
                      <div
                        key={idx}
                        className="w-16 h-24 rounded border-2 border-[rgba(212,175,55,0.4)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)] flex items-center justify-center font-serif font-bold text-lg text-[var(--gold)]"
                      >
                        {card}
                      </div>
                    ))
                  ) : (
                    <div className="flex gap-3">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="w-16 h-24 rounded border-2 border-[rgba(212,175,55,0.2)] bg-gradient-to-br from-[rgba(212,175,55,0.08)] to-[rgba(212,175,55,0.04)] flex items-center justify-center"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Pot Display */}
              <div className="bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.3)] rounded-lg px-8 py-4 text-center">
                <p className="text-xs text-[var(--text-3)] uppercase tracking-widest mb-2">Current Pot</p>
                <p className="font-serif text-3xl text-[var(--gold)]">${pot}</p>
              </div>
            </div>

            {/* Player Seats - 6 positions around table */}
            {players.map((player) => (
              <div
                key={player.id}
                className={`absolute ${getPlayerPosition(player.id)} z-20 transition-all duration-300`}
              >
                <PlayerSeat player={player} />
              </div>
            ))}

            {/* Glow effect */}
            <div className="glow-emerald absolute -inset-12 -z-10 pointer-events-none" />
          </div>
        </div>

        {/* Game Controls */}
        <div className="max-w-3xl mx-auto mb-16">
          {!gameActive ? (
            <div className="space-y-6">
              {/* Bet section */}
              <div className="border border-[rgba(212,175,55,0.1)] rounded-lg p-8 bg-[var(--surface)] hover:border-[rgba(212,175,55,0.2)] transition-colors">
                <label className="block text-sm font-semibold text-[var(--text-2)] mb-4">
                  Place Your Bet
                </label>

                {/* Quick bet buttons */}
                <div className="mb-6">
                  <p className="text-xs text-[var(--text-3)] mb-2">Quick Bets</p>
                  <div className="flex gap-3 flex-wrap">
                    {[10, 50, 100, 250, 500, 1000].map((amount) => (
                      <button
                        key={`bet-${amount}`}
                        onClick={() => setCurrentBet(Math.min(amount, balance))}
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
                      max={balance}
                      value={currentBet}
                      onChange={(e) =>
                        setCurrentBet(Math.max(0, Math.min(parseInt(e.target.value) || 0, balance)))
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
                  disabled={currentBet === 0 || currentBet > balance}
                >
                  Join Table
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-[var(--surface)] border border-[rgba(212,175,55,0.1)] rounded-lg p-6">
                <p className="text-sm text-[var(--text-2)] mb-4">Your Action</p>
                <div className="flex gap-3 flex-wrap">
                  <Button variant="gold">Fold</Button>
                  <Button variant="gold">Check</Button>
                  <Button variant="gold">Call</Button>
                  <Button variant="gold">Raise</Button>
                  <Button variant="ghost" className="border border-[rgba(212,175,55,0.3)]">
                    All In
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table Info */}
        <div className="grid grid-cols-3 gap-4 mb-16 max-w-3xl mx-auto">
          <div className="bg-[var(--surface)] border border-[rgba(212,175,55,0.1)] rounded-lg p-6">
            <p className="text-xs text-[var(--text-3)] uppercase tracking-widest mb-2">Blinds</p>
            <p className="font-serif text-2xl text-[var(--gold)]">$10 / $20</p>
          </div>
          <div className="bg-[var(--surface)] border border-[rgba(212,175,55,0.1)] rounded-lg p-6 text-center">
            <p className="text-xs text-[var(--text-3)] uppercase tracking-widest mb-2">Players</p>
            <p className="font-serif text-2xl text-[var(--gold)]">
              {players.filter((p) => p.status !== 'empty').length}/6
            </p>
          </div>
          <div className="bg-[var(--surface)] border border-[rgba(212,175,55,0.1)] rounded-lg p-6 text-right">
            <p className="text-xs text-[var(--text-3)] uppercase tracking-widest mb-2">Hands Played</p>
            <p className="font-serif text-2xl text-[var(--gold)]">{gameHistory.length}</p>
          </div>
        </div>
      </main>

      {/* Game History Section */}
      <section className="border-t border-[rgba(212,175,55,0.1)] bg-[var(--surface)]">
        <div className="container-max py-12">
          <div className="mb-8">
            <p className="eyebrow mb-4">Hand Records</p>
            <h2 className="font-serif text-3xl font-semibold">Game History</h2>
          </div>

          {gameHistory.length === 0 ? (
            <div className="text-center py-12 border border-[rgba(212,175,55,0.1)] rounded-lg bg-[var(--base)]">
              <p className="text-[var(--text-2)]">No hands played yet</p>
              <p className="text-xs text-[var(--text-3)] mt-2">Join a table and play to see your history</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {gameHistory.map((game) => (
                <GameHistoryRow key={game.id} game={game} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

// Player Seat Component
const PlayerSeat: React.FC<{ player: Player }> = ({ player }) => {
  const isYou = player.name === 'You';
  const isEmpty = player.status === 'empty';

  return (
    <div
      className={`text-center transition-all duration-300 ${
        isEmpty ? 'opacity-60' : 'opacity-100'
      }`}
    >
      {/* Player Avatar/Slot */}
      <div
        className={`w-24 h-24 rounded-full flex flex-col items-center justify-center mb-3 border-2 transition-all ${
          isEmpty
            ? 'bg-[rgba(212,175,55,0.05)] border-[rgba(212,175,55,0.1)]'
            : isYou
              ? 'bg-[rgba(45,122,99,0.2)] border-[rgba(45,122,99,0.4)]'
              : 'bg-[rgba(212,175,55,0.1)] border-[rgba(212,175,55,0.3)]'
        }`}
      >
        {isEmpty ? (
          <p className="text-[var(--text-3)] text-xs">Empty Seat</p>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-[var(--gold)] opacity-20 mb-2" />
            <p className="text-xs font-semibold text-[var(--text)]">{player.name}</p>
          </>
        )}
      </div>

      {/* Player Info */}
      {!isEmpty && (
        <>
          {/* Hole Cards */}
          <div className="flex justify-center gap-1 mb-2">
            {player.cards && player.cards.length > 0 ? (
              player.cards.map((card, idx) => (
                <div
                  key={idx}
                  className="w-12 h-16 rounded border border-[rgba(212,175,55,0.3)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)] flex items-center justify-center text-xs font-bold text-[var(--gold)]"
                >
                  {card}
                </div>
              ))
            ) : (
              <>
                <div className="w-12 h-16 rounded border border-[rgba(212,175,55,0.2)] bg-gradient-to-br from-[rgba(212,175,55,0.1)] to-[rgba(212,175,55,0.05)]" />
                <div className="w-12 h-16 rounded border border-[rgba(212,175,55,0.2)] bg-gradient-to-br from-[rgba(212,175,55,0.1)] to-[rgba(212,175,55,0.05)]" />
              </>
            )}
          </div>

          {/* Stack and Bet */}
          <p className="text-xs text-[var(--text-3)] mb-1">Stack: ${player.stack}</p>
          {player.currentBet > 0 && (
            <p className="text-xs font-semibold text-[var(--emerald)]">Bet: ${player.currentBet}</p>
          )}

          {/* Status Badge */}
          {player.status === 'folded' && (
            <p className="text-xs text-red-400 mt-1 font-semibold">Folded</p>
          )}
        </>
      )}

      {/* Dealer Button */}
      {player.isDealer && (
        <div className="absolute -right-2 -top-2 w-6 h-6 rounded-full bg-[var(--gold)] flex items-center justify-center text-[#0a0e12] text-xs font-bold">
          D
        </div>
      )}
    </div>
  );
};

// Game History Row Component
const GameHistoryRow: React.FC<{ game: GameHistoryItem }> = ({ game }) => {
  const resultColor = {
    win: 'text-emerald-400',
    loss: 'text-red-400',
    fold: 'text-[var(--text-2)]',
  };

  const resultLabel = {
    win: '✓ Win',
    loss: '✗ Loss',
    fold: '∠ Fold',
  };

  return (
    <div className="border border-[rgba(212,175,55,0.1)] rounded-lg p-4 bg-[var(--surface-2)] hover:border-[rgba(212,175,55,0.2)] transition-colors hover:bg-[var(--surface-3)]">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-[var(--text-2)] mb-1">{game.date}</p>
          <p className="text-xs text-[var(--text-3)]">Pot: ${game.potSize}</p>
        </div>

        <div className="text-right">
          <p className={`font-semibold ${resultColor[game.result]}`}>{resultLabel[game.result]}</p>
          <div className="flex gap-4 mt-1 text-sm">
            <div>
              <p className="text-xs text-[var(--text-3)]">Your Bet</p>
              <p className="text-[var(--text)]">${game.yourContribution}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-3)]">Win</p>
              <p className={game.winAmount > 0 ? 'text-emerald-400' : 'text-[var(--text)]'}>
                ${game.winAmount}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to get player position
function getPlayerPosition(playerId: number): string {
  const positions = [
    'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2', // Center (placeholder)
    'top-8 right-12', // Top right
    'top-1/3 right-8', // Middle right
    'bottom-8 right-12', // Bottom right
    'bottom-8 left-12', // Bottom left
    'top-1/3 left-8', // Middle left
  ];
  return positions[playerId] || positions[0];
}

export default Poker;
