import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';

interface Card {
  suit: string;
  rank: string;
}

const Blackjack: React.FC = () => {
  const navigate = useNavigate();

  const balance     = 10_000; // TODO: connect to account/wallet
  const [bet, setBet]               = useState(0);
  const [playerHand]                = useState<Card[]>([]);
  const [dealerHand]                = useState<Card[]>([]);
  const [gameActive]                = useState(false);
  const [dealerRevealed]            = useState(false);

  const addBet = (n: number) => setBet((b) => Math.min(b + n, balance));
  const subBet = (n: number) => setBet((b) => Math.max(b - n, 0));
  const canDeal = bet > 0 && bet <= balance;

  const calculateHandValue = (hand: Card[]): number => {
    let value = 0;
    let aces  = 0;
    hand.forEach((card) => {
      if (card.rank === 'A') { aces += 1; value += 11; }
      else if (['K', 'Q', 'J'].includes(card.rank)) value += 10;
      else value += parseInt(card.rank);
    });
    while (value > 21 && aces > 0) { value -= 10; aces -= 1; }
    return value;
  };

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-[var(--base)]">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-[var(--surface)] border-b border-[rgba(212,175,55,0.1)] px-6 h-14 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="text-[var(--gold)] hover:text-[var(--text)] transition-colors text-sm cursor-pointer"
          aria-label="Back to home"
        >
          ← Back
        </button>
        <h1 className="font-serif text-xl font-semibold">Blackjack</h1>
        <div className="text-right">
          <p className="text-[10px] text-[var(--text-3)] uppercase tracking-widest leading-none mb-0.5">Balance</p>
          <p className="font-serif text-lg text-[var(--gold)] leading-none">${balance.toLocaleString()}</p>
        </div>
      </header>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4 py-4">
        <div className="relative w-full max-w-lg">
          {/* Top rail */}
          <div className="h-0.5 bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-40 mb-1 rounded-full" />

          {/* Felt surface */}
          <div className="bg-gradient-to-b from-[var(--surface-2)] to-[var(--surface-3)] rounded-2xl border border-[rgba(212,175,55,0.12)] px-6 py-5">

            {/* Dealer */}
            <div className="mb-4">
              <p className="eyebrow text-center mb-3">Dealer</p>
              <div className="flex justify-center gap-3 min-h-24">
                {dealerHand.map((card, idx) => (
                  <CardDisplay key={idx} card={card} isHidden={!dealerRevealed && idx === 0} />
                ))}
              </div>
              {dealerRevealed && dealerHand.length > 0 && (
                <p className="text-center text-[var(--gold)] font-serif mt-2">
                  Total: {calculateHandValue(dealerHand)}
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-[rgba(212,175,55,0.2)] to-transparent my-4" />

            {/* Player */}
            <div>
              <p className="eyebrow text-center mb-3">Your Hand</p>
              <div className="flex justify-center gap-3 min-h-24">
                {playerHand.map((card, idx) => (
                  <CardDisplay key={idx} card={card} />
                ))}
              </div>
              {playerHand.length > 0 && (
                <p className="text-center text-[var(--gold)] font-serif mt-2">
                  Total: {calculateHandValue(playerHand)}
                </p>
              )}
            </div>
          </div>

          {/* Bottom rail */}
          <div className="h-0.5 bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-30 mt-1 rounded-full" />

          {/* Glow */}
          <div className="glow-gold absolute -inset-8 -z-10 pointer-events-none" />
        </div>
      </div>

      {/* ── Controls panel ──────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-[rgba(212,175,55,0.1)] bg-[var(--surface)] px-5 pt-4 pb-5 space-y-3">

        {!gameActive ? (
          <>
            {/* Quick add row */}
            <div className="flex gap-2">
              {[10, 50, 100, 500].map((n) => (
                <button
                  key={n}
                  onClick={() => addBet(n)}
                  className="flex-1 py-3.5 rounded-lg border border-[rgba(212,175,55,0.12)] text-[var(--text-2)] text-sm font-semibold hover:border-[var(--gold)] hover:text-[var(--gold)] transition-all cursor-pointer active:scale-95"
                >
                  +{n}
                </button>
              ))}
            </div>

            {/* Quick subtract row */}
            <div className="flex gap-2">
              {[10, 50, 100, 500].map((n) => (
                <button
                  key={n}
                  onClick={() => subBet(n)}
                  className="flex-1 py-3.5 rounded-lg border border-[rgba(212,175,55,0.08)] text-[var(--text-3)] text-sm font-semibold hover:border-red-500/40 hover:text-red-400 transition-all cursor-pointer active:scale-95"
                >
                  -{n}
                </button>
              ))}
            </div>

            {/* Bet input row */}
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-3 bg-[var(--surface-2)] border border-[rgba(212,175,55,0.1)] rounded-lg px-4 py-3">
                <span className="text-xs text-[var(--text-3)] uppercase tracking-widest shrink-0">Bet</span>
                <input
                  type="number"
                  min="0"
                  max={balance}
                  value={bet}
                  onChange={(e) => setBet(Math.max(0, Math.min(parseInt(e.target.value) || 0, balance)))}
                  className="flex-1 bg-transparent text-[var(--gold)] font-serif text-xl text-right focus:outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  aria-label="Bet amount"
                />
                <span className="text-[var(--text-3)] text-sm">$</span>
              </div>
              <button
                onClick={() => setBet(0)}
                className="px-4 py-3 rounded-lg border border-[rgba(212,175,55,0.1)] text-[var(--text-3)] text-sm hover:border-[rgba(212,175,55,0.25)] hover:text-[var(--text-2)] transition-all cursor-pointer"
              >
                Clear
              </button>
              <button
                onClick={() => setBet(balance)}
                className="px-4 py-3 rounded-lg border border-[rgba(212,175,55,0.1)] text-[var(--text-3)] text-sm hover:border-[rgba(212,175,55,0.25)] hover:text-[var(--text-2)] transition-all cursor-pointer"
              >
                Max
              </button>
            </div>

            {/* Deal button */}
            <button
              disabled={!canDeal}
              className={`
                w-full py-5 rounded-xl font-semibold text-lg tracking-widest uppercase transition-all duration-150 cursor-pointer
                ${canDeal
                  ? 'bg-[var(--gold)] text-[#0a0e12] hover:opacity-90 active:scale-[0.98] shadow-[0_2px_24px_rgba(212,175,55,0.25)]'
                  : 'bg-[var(--surface-2)] text-[var(--text-3)] cursor-not-allowed border border-[rgba(212,175,55,0.08)]'
                }
              `}
            >
              {/* TODO: wire up to game engine */}
              Deal Hand
            </button>
          </>
        ) : (
          /* In-game action buttons */
          <div className="flex gap-3">
            <Button variant="gold" className="flex-1">Hit</Button>
            <Button variant="gold" className="flex-1">Stand</Button>
            <Button variant="gold" className="flex-1">Double</Button>
            <Button variant="ghost" className="flex-1">Split</Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Card display ─────────────────────────────────────────────────────────────

const CardDisplay: React.FC<{ card: Card; isHidden?: boolean }> = ({ card, isHidden = false }) => {
  const suits: Record<string, string> = {
    '♠': 'text-[var(--text)]',
    '♥': 'text-red-500',
    '♦': 'text-red-500',
    '♣': 'text-[var(--text)]',
  };

  return (
    <div
      className={`w-16 h-22 rounded border flex items-center justify-center font-serif font-bold text-lg transition-all ${
        isHidden
          ? 'bg-gradient-to-br from-[rgba(212,175,55,0.1)] to-[rgba(212,175,55,0.05)] border-[rgba(212,175,55,0.2)]'
          : `bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)] border-[rgba(212,175,55,0.3)] ${suits[card.suit] || ''}`
      }`}
      style={{ width: '4rem', height: '5.5rem' }}
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

export default Blackjack;
