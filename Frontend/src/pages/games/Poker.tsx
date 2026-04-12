import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

  const [players] = useState<Player[]>(
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

  const balance   = 10_000; // TODO: connect to account/wallet
  const pot       = 0;      // TODO: connect to game engine
  const communityCards: string[] = [];

  const [bet, setBet] = useState(0);

  const addBet = (n: number) => setBet((b) => Math.min(b + n, balance));
  const subBet = (n: number) => setBet((b) => Math.max(b - n, 0));
  const canJoin = bet > 0 && bet <= balance;

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
        <h1 className="font-serif text-xl font-semibold">Texas Hold'em</h1>
        {/* Table info pills */}
        <div className="flex items-center gap-3 text-xs text-[var(--text-3)]">
          <span>Blinds <span className="text-[var(--gold)]">$10/$20</span></span>
          <span className="w-px h-3 bg-[var(--border)]" />
          <span>0/6 players</span>
        </div>
      </header>

      {/* ── Poker table ─────────────────────────────────────────────────────── */}
      {/* flex-1 + min-h-0 gives this section a bounded height inside the flex column */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-8 py-4 overflow-hidden">
        {/* ─── DO NOT MODIFY: oval table uses padding-bottom aspect-ratio trick ─── */}
        <div className="relative w-full" style={{ paddingBottom: '35%', maxWidth: '1400px' }}>
          {/* Wood Rail Border */}
          <div
            className="absolute inset-0 rounded-[50%] border-[16px] shadow-xl"
            style={{
              borderColor: 'rgba(212, 175, 55, 0.2)',
              background: 'linear-gradient(135deg, rgba(25,36,48,0.6), rgba(15,20,25,0.9))',
              boxShadow: '0 0 60px rgba(0,0,0,0.8), inset 0 0 30px rgba(0,0,0,0.6)',
            }}
          >
            {/* Felt Surface */}
            <div
              className="absolute inset-2 rounded-[50%] bg-gradient-to-b from-[#1B4D3E] to-[#0f2e26]"
              style={{ boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)' }}
            >
              {/* Felt Inner Line Decoration */}
              <div className="absolute inset-4 rounded-[50%] border border-[rgba(212,175,55,0.15)]" />

              {/* Community Cards + Pot — Center */}
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
                <div className="bg-[rgba(212,175,55,0.15)] border-2 border-[rgba(212,175,55,0.4)] rounded-full px-8 py-3 text-center backdrop-blur-sm">
                  <p className="text-xs text-[var(--text-3)] uppercase tracking-widest mb-1">POT</p>
                  <p className="font-serif text-3xl text-[var(--gold)]">${pot}</p>
                </div>
              </div>

              {/* Player Seats */}
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
        {/* ─── END oval table ─── */}
      </div>

      {/* ── Controls panel ──────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-[rgba(212,175,55,0.1)] bg-[var(--surface)] px-5 pt-4 pb-5 space-y-3">

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

        {/* Bet input + Join */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-3 bg-[var(--surface-2)] border border-[rgba(212,175,55,0.1)] rounded-lg px-4 py-3">
            <span className="text-xs text-[var(--text-3)] uppercase tracking-widest shrink-0">Buy-in</span>
            <input
              type="number"
              min="0"
              max={balance}
              value={bet}
              onChange={(e) => setBet(Math.max(0, Math.min(parseInt(e.target.value) || 0, balance)))}
              className="flex-1 bg-transparent text-[var(--gold)] font-serif text-xl text-right focus:outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label="Buy-in amount"
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
            disabled={!canJoin}
            className={`
              px-8 py-3 rounded-xl font-semibold text-base tracking-widest uppercase transition-all duration-150 cursor-pointer
              ${canJoin
                ? 'bg-[var(--gold)] text-[#0a0e12] hover:opacity-90 active:scale-[0.98] shadow-[0_2px_24px_rgba(212,175,55,0.25)]'
                : 'bg-[var(--surface-2)] text-[var(--text-3)] cursor-not-allowed border border-[rgba(212,175,55,0.08)]'
              }
            `}
          >
            {/* TODO: wire up to game engine */}
            Join Table
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Playing Card ─────────────────────────────────────────────────────────────

const PlayingCard: React.FC<{ card: string; faceUp: boolean }> = ({ card, faceUp }) => {
  const getSuitColor = (suit: string) =>
    suit === '♥' || suit === '♦' ? 'text-red-500' : 'text-[var(--text)]';
  const getRank = (c: string) => c.slice(0, -1);
  const getSuit = (c: string) => c.slice(-1);

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
          <div className={`text-base leading-none ${getSuitColor(getSuit(card))}`}>{getSuit(card)}</div>
        </>
      ) : null}
    </div>
  );
};

// ─── Player Seat ─────────────────────────────────────────────────────────────

const PlayerSeat: React.FC<{ player: Player; isCurrentPlayer?: boolean }> = ({
  player,
  isCurrentPlayer = false,
}) => {
  const isEmpty  = player.status === 'empty';
  const isFolded = player.status === 'folded';

  const getInitials = (name: string) => {
    if (name === 'You') return 'Y';
    const parts = name.split(' ');
    return parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name[0].toUpperCase();
  };

  return (
    <div className="flex flex-col items-center text-center">
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

      {!isEmpty && (
        <p className="text-xs font-semibold text-[var(--text)] mb-1 min-h-[16px]">{player.name}</p>
      )}

      {!isEmpty && (
        <div className="flex justify-center gap-1 mb-2">
          {player.cards && player.cards.length > 0 ? (
            player.cards.map((card, idx) => <PlayingCard key={idx} card={card} faceUp={true} />)
          ) : (
            <>
              <PlayingCard card="" faceUp={false} />
              <PlayingCard card="" faceUp={false} />
            </>
          )}
        </div>
      )}

      {!isEmpty && (
        <div className="bg-[var(--gold)] text-[#0a0e12] rounded-full px-2 py-1 text-xs font-bold whitespace-nowrap">
          ${player.stack}
        </div>
      )}

      {!isEmpty && player.currentBet > 0 && (
        <div className="absolute -bottom-2 w-10 h-10 rounded-full bg-[rgba(212,175,55,0.3)] border-2 border-[var(--gold)] flex items-center justify-center text-xs font-bold text-[var(--gold)]">
          ${player.currentBet}
        </div>
      )}

      {isFolded && <p className="text-xs text-[var(--red)] mt-1 font-semibold">FOLDED</p>}

      {player.isDealer && !isEmpty && (
        <div className="absolute -right-1 -top-1 w-6 h-6 rounded-full bg-[var(--gold)] flex items-center justify-center text-[#0a0e12] text-xs font-bold border border-[rgba(212,175,55,0.5)]">
          D
        </div>
      )}
    </div>
  );
};

export default Poker;
