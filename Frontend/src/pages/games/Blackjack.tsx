import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';

interface Card {
  suit: string;
  rank: string;
}

interface GameHistoryItem {
  id: string;
  date: string;
  result: 'win' | 'loss' | 'push';
  playerTotal: number;
  dealerTotal: number;
  betAmount: number;
  winAmount: number;
}

const Blackjack: React.FC = () => {
  const navigate = useNavigate();

  // Game state
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [gameHistory, setGameHistory] = useState<GameHistoryItem[]>([]);
  const [balance, setBalance] = useState(10000);
  const [currentBet, setCurrentBet] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [dealerRevealed, setDealerRevealed] = useState(false);

  const calculateHandValue = (hand: Card[]): number => {
    let value = 0;
    let aces = 0;

    hand.forEach((card) => {
      if (card.rank === 'A') {
        aces += 1;
        value += 11;
      } else if (['K', 'Q', 'J'].includes(card.rank)) {
        value += 10;
      } else {
        value += parseInt(card.rank);
      }
    });

    while (value > 21 && aces > 0) {
      value -= 10;
      aces -= 1;
    }

    return value;
  };

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
          <h1 className="font-serif text-2xl font-semibold">Blackjack</h1>
          <div className="text-right">
            <p className="text-xs text-[var(--text-3)] uppercase tracking-widest">Balance</p>
            <p className="font-serif text-xl text-[var(--gold)]">${balance}</p>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="container-max py-12">
        {/* Table */}
        <div className="relative mb-16">
          {/* Felt background */}
          <div className="relative bg-gradient-to-b from-[var(--surface-2)] to-[var(--surface-3)] rounded-2xl border border-[rgba(212,175,55,0.1)] p-12 min-h-96">
            {/* Dealer section */}
            <div className="mb-20">
              <p className="eyebrow mb-6 text-center">Dealer</p>
              <div className="flex justify-center gap-4 mb-8 min-h-32">
                {dealerHand.map((card, idx) => (
                  <CardDisplay key={idx} card={card} isHidden={!dealerRevealed && idx === 0} />
                ))}
              </div>
              {dealerRevealed && (
                <p className="text-center text-[var(--gold)] font-serif text-lg">
                  Total: {calculateHandValue(dealerHand)}
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-[rgba(212,175,55,0.2)] to-transparent mb-12" />

            {/* Player section */}
            <div>
              <p className="eyebrow mb-6 text-center">Your Hand</p>
              <div className="flex justify-center gap-4 mb-8 min-h-32">
                {playerHand.map((card, idx) => (
                  <CardDisplay key={idx} card={card} />
                ))}
              </div>
              {playerHand.length > 0 && (
                <p className="text-center text-[var(--gold)] font-serif text-lg">
                  Total: {calculateHandValue(playerHand)}
                </p>
              )}
            </div>
          </div>

          {/* Glow effect */}
          <div className="glow-gold absolute -inset-12 -z-10 pointer-events-none" />
        </div>

        {/* Game Controls */}
        <div className="max-w-2xl mx-auto mb-16">
          {!gameActive ? (
            <div className="space-y-6">
              {/* Bet section */}
              <div className="border border-[rgba(212,175,55,0.1)] rounded-lg p-8 bg-[var(--surface)] hover:border-[rgba(212,175,55,0.2)] transition-colors">
                <label className="block text-sm font-semibold text-[var(--text-2)] mb-4">
                  Place Your Bet
                </label>

                {/* Quick buttons - Positive */}
                <div className="mb-4">
                  <p className="text-xs text-[var(--text-3)] mb-2">Quick Add</p>
                  <div className="flex gap-3 flex-wrap">
                    {[10, 50, 100, 500].map((amount) => (
                      <button
                        key={`add-${amount}`}
                        onClick={() => setCurrentBet(prev => Math.min(prev + amount, balance))}
                        className="px-4 py-2 rounded border border-[rgba(212,175,55,0.1)] text-[var(--text-2)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition-all"
                      >
                        +${amount}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick buttons - Negative */}
                <div className="mb-6">
                  <p className="text-xs text-[var(--text-3)] mb-2">Quick Remove</p>
                  <div className="flex gap-3 flex-wrap">
                    {[10, 50, 100, 500].map((amount) => (
                      <button
                        key={`remove-${amount}`}
                        onClick={() => setCurrentBet(prev => Math.max(prev - amount, 0))}
                        className="px-4 py-2 rounded border border-[rgba(212,175,55,0.1)] text-[var(--text-2)] hover:border-red-500 hover:text-red-500 transition-all"
                      >
                        -${amount}
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
                      onChange={(e) => setCurrentBet(Math.max(0, Math.min(parseInt(e.target.value) || 0, balance)))}
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
                  <p className="text-xs text-[var(--text-3)] mb-2">Current Bet</p>
                  <p className="font-serif text-2xl text-[var(--gold)]">${currentBet}</p>
                </div>
                <Button
                  variant="gold"
                  className="w-full"
                  disabled={currentBet === 0 || currentBet > balance}
                >
                  Deal Hand
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 flex-wrap justify-center">
              <Button variant="gold">Hit</Button>
              <Button variant="gold">Stand</Button>
              <Button variant="gold">Double Down</Button>
              <Button variant="gold" className="border border-[rgba(212,175,55,0.3)]">
                Split
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Game History Section */}
      <section className="border-t border-[rgba(212,175,55,0.1)] bg-[var(--surface)]">
        <div className="container-max py-12">
          <div className="mb-8">
            <p className="eyebrow mb-4">Recent Games</p>
            <h2 className="font-serif text-3xl font-semibold">Game History</h2>
          </div>

          {gameHistory.length === 0 ? (
            <div className="text-center py-12 border border-[rgba(212,175,55,0.1)] rounded-lg bg-[var(--base)]">
              <p className="text-[var(--text-2)]">No games played yet</p>
              <p className="text-xs text-[var(--text-3)] mt-2">Start playing to see your history</p>
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

// Card Component
const CardDisplay: React.FC<{ card: Card; isHidden?: boolean }> = ({ card, isHidden = false }) => {
  const suits: Record<string, string> = {
    '♠': 'text-[var(--text)]',
    '♥': 'text-red-500',
    '♦': 'text-red-500',
    '♣': 'text-[var(--text)]',
  };

  return (
    <div
      className={`w-20 h-28 rounded border flex items-center justify-center font-serif font-bold text-xl transition-all ${
        isHidden
          ? 'bg-gradient-to-br from-[rgba(212,175,55,0.1)] to-[rgba(212,175,55,0.05)] border-[rgba(212,175,55,0.2)]'
          : `bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)] border-[rgba(212,175,55,0.3)] ${suits[card.suit] || ''}`
      }`}
    >
      {!isHidden && (
        <div className="text-center">
          <div>{card.rank}</div>
          <div className={`text-sm ${suits[card.suit] || ''}`}>{card.suit}</div>
        </div>
      )}
    </div>
  );
};

// History Row Component
const GameHistoryRow: React.FC<{ game: GameHistoryItem }> = ({ game }) => {
  const resultColor = {
    win: 'text-emerald-400',
    loss: 'text-red-400',
    push: 'text-[var(--text-2)]',
  };

  const resultLabel = {
    win: '✓ Win',
    loss: '✗ Loss',
    push: '= Push',
  };

  return (
    <div className="border border-[rgba(212,175,55,0.1)] rounded-lg p-4 bg-[var(--surface-2)] hover:border-[rgba(212,175,55,0.2)] transition-colors hover:bg-[var(--surface-3)]">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-[var(--text-2)] mb-1">{game.date}</p>
          <p className="text-xs text-[var(--text-3)]">
            Player: {game.playerTotal} | Dealer: {game.dealerTotal}
          </p>
        </div>

        <div className="text-right">
          <p className={`font-semibold ${resultColor[game.result]}`}>{resultLabel[game.result]}</p>
          <div className="flex gap-4 mt-1 text-sm">
            <div>
              <p className="text-xs text-[var(--text-3)]">Bet</p>
              <p className="text-[var(--text)]">${game.betAmount}</p>
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

export default Blackjack;
