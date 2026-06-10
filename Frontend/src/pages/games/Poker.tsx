import React, { useState } from 'react';

interface Player {
  id: number;
  name: string;
  stack: number;
  currentBet: number;
  status: 'active' | 'folded' | 'waiting' | 'empty';
  isDealer?: boolean;
  cards?: string[];
}

/*
  Seat positions on a 2.2:1 oval.
  Derived from the ellipse at 60° intervals, offset ~12% inward from the edge.
  All use translate(-50%, -50%) — the seat component is centered on the coordinate.
  Perfectly symmetric: top/bottom pairs sum to 100%, left/right pairs are mirrored at 50%.
*/
const SEAT_POSITIONS: React.CSSProperties[] = [
  { top: '88%', left: '50%',  transform: 'translate(-50%, -50%)' }, // 0 – bottom center
  { top: '72%', left: '88%',  transform: 'translate(-50%, -50%)' }, // 1 – lower right
  { top: '28%', left: '88%',  transform: 'translate(-50%, -50%)' }, // 2 – upper right
  { top: '12%', left: '50%',  transform: 'translate(-50%, -50%)' }, // 3 – top center
  { top: '28%', left: '12%',  transform: 'translate(-50%, -50%)' }, // 4 – upper left
  { top: '72%', left: '12%',  transform: 'translate(-50%, -50%)' }, // 5 – lower left
];

/*
  Height budget (inside mt-16 outer container):
    game header  56px
    controls    171px
    table py-3   24px
    ───────────────
    total        251px
  → available table height = 100dvh - 64px (global header) - 251px = 100dvh - 315px
  → max table WIDTH at 2.2:1 = (100dvh - 315px) × 2.2
  This makes the table fill the viewport height on wide screens and fill width on narrow screens.
*/
const TABLE_MAX_WIDTH = 'calc((100dvh - 390px) * 2.2)';

const Poker: React.FC = () => {
  const [players] = useState<Player[]>(
    Array(6).fill(null).map((_, i) => ({
      id: i, name: '', stack: 0, currentBet: 0,
      status: 'empty' as const, isDealer: false, cards: [],
    }))
  );

  const balance = 10_000;
  const pot = 0;
  const communityCards: string[] = [];
  const [bet, setBet] = useState(0);

  const addBet = (n: number) => setBet(b => Math.min(b + n, balance));
  const subBet = (n: number) => setBet(b => Math.max(b - n, 0));
  const canJoin = bet > 0 && bet <= balance;

  return (
    /* mt-16 clears the fixed global Header (h-16 = 4 rem = 64 px) */
    <div className="mt-16 flex flex-col h-[calc(100dvh-4rem)] bg-[var(--base)]">

      {/* ── Table area ──────────────────────────────────────────────────────── */}
      {/*
        No overflow-hidden — seats sit near the oval edge and need room to breathe.
        The wrapper's maxWidth is calculated so the table fills the available height.
      */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-6 py-3">

        {/*
          aspect-ratio: 2.2/1 gives the oval natural horizontal shape.
          w-full makes it fill container width by default.
          maxWidth caps it so the height never exceeds the available table section height.
          Result: fills height on wide screens, fills width on narrow screens.
        */}
        <div
          className="relative w-full"
          style={{ aspectRatio: '2.2 / 1', maxWidth: TABLE_MAX_WIDTH }}
        >
          {/* ── Wood rail (outer ring) ────────────────────────────────────── */}
          <div
            className="absolute inset-0 rounded-[50%]"
            style={{
              background: 'linear-gradient(145deg, #3d2a0e 0%, #1a1206 50%, #2e1e08 100%)',
              boxShadow: [
                '0 0 0 1.5px rgba(212,175,55,0.35)',   /* outer gold rim */
                '0 12px 80px rgba(0,0,0,0.95)',
                '0 4px 20px rgba(0,0,0,0.8)',
                'inset 0 0 0 1.5px rgba(255,255,255,0.06)',
              ].join(', '),
            }}
          >
            {/* ── Felt surface ──────────────────────────────────────────── */}
            <div
              className="absolute rounded-[50%]"
              style={{
                inset: '14px',
                background: [
                  'radial-gradient(ellipse at 50% 30%,',
                  '  #1e6048 0%, #155038 40%, #0e3526 80%, #091f18 100%)',
                ].join(''),
                boxShadow: [
                  'inset 0 0 80px rgba(0,0,0,0.6)',
                  'inset 0 0 20px rgba(0,0,0,0.4)',
                ].join(', '),
              }}
            >
              {/* Felt stitched accent ring */}
              <div
                className="absolute rounded-[50%]"
                style={{
                  inset: '10px',
                  border: '1px solid rgba(212,175,55,0.12)',
                }}
              />

              {/* ── Community cards + pot ──────────────────────────────── */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-center">
                <p className="eyebrow text-[10px] mb-2">COMMUNITY CARDS</p>
                <div className="flex justify-center gap-2 mb-3">
                  {communityCards.length > 0
                    ? communityCards.map((c, i) => <PlayingCard key={i} card={c} faceUp />)
                    : [0, 1, 2, 3, 4].map(i => <PlayingCard key={i} card="" faceUp={false} />)}
                </div>
                <div
                  className="inline-flex flex-col items-center px-6 py-2 rounded-full"
                  style={{
                    border: '1.5px solid rgba(212,175,55,0.3)',
                    background: 'rgba(0,0,0,0.35)',
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  <span className="text-[9px] text-[var(--text-3)] uppercase tracking-widest">POT</span>
                  <span className="font-serif text-xl text-[var(--gold)] leading-tight">${pot}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Player seats ──────────────────────────────────────────────── */}
          {players.map(player => (
            <div key={player.id} className="absolute z-20" style={SEAT_POSITIONS[player.id]}>
              <PlayerSeat player={player} isCurrentPlayer={player.id === 0} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Controls panel ──────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-[rgba(212,175,55,0.1)] bg-[var(--surface)] px-5 pt-4 pb-5 space-y-2.5">

        {/* Quick add */}
        <div className="flex gap-2">
          {[10, 50, 100, 500].map(n => (
            <button
              key={n}
              onClick={() => addBet(n)}
              className="flex-1 py-3 rounded-lg border border-[rgba(212,175,55,0.12)] text-[var(--text-2)] text-sm font-semibold hover:border-[var(--gold)] hover:text-[var(--gold)] transition-all cursor-pointer active:scale-95"
            >
              +{n}
            </button>
          ))}
        </div>

        {/* Quick subtract */}
        <div className="flex gap-2">
          {[10, 50, 100, 500].map(n => (
            <button
              key={n}
              onClick={() => subBet(n)}
              className="flex-1 py-3 rounded-lg border border-[rgba(212,175,55,0.08)] text-[var(--text-3)] text-sm font-semibold hover:border-red-500/40 hover:text-red-400 transition-all cursor-pointer active:scale-95"
            >
              -{n}
            </button>
          ))}
        </div>

        {/* Buy-in + Join */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-3 bg-[var(--surface-2)] border border-[rgba(212,175,55,0.1)] rounded-lg px-4 py-3">
            <span className="text-xs text-[var(--text-3)] uppercase tracking-widest shrink-0">Buy-in</span>
            <input
              type="number"
              min="0"
              max={balance}
              value={bet}
              onChange={e => setBet(Math.max(0, Math.min(parseInt(e.target.value) || 0, balance)))}
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
            className={`px-8 py-3 rounded-xl font-semibold text-sm tracking-widest uppercase transition-all duration-150 cursor-pointer ${
              canJoin
                ? 'bg-[var(--gold)] text-[#0a0e12] hover:opacity-90 active:scale-[0.98] shadow-[0_2px_24px_rgba(212,175,55,0.25)]'
                : 'bg-[var(--surface-2)] text-[var(--text-3)] cursor-not-allowed border border-[rgba(212,175,55,0.08)]'
            }`}
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

const PlayingCard: React.FC<{ card: string; faceUp: boolean; small?: boolean }> = ({
  card, faceUp, small = false,
}) => {
  const getRank = (c: string) => c.slice(0, -1);
  const getSuit = (c: string) => c.slice(-1);
  const isRed   = (s: string) => s === '♥' || s === '♦';

  return (
    <div
      className={`rounded-md border-2 flex flex-col items-center justify-center font-serif font-bold transition-all ${
        small ? 'w-8 h-[2.75rem]' : 'w-11 h-[3.75rem]'
      } ${
        faceUp
          ? 'bg-white border-gray-200 shadow-lg'
          : 'border-[rgba(212,175,55,0.25)] bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]'
      }`}
    >
      {faceUp && card && (
        <>
          <span className={`leading-none text-black ${small ? 'text-[9px]' : 'text-xs'}`}>
            {getRank(card)}
          </span>
          <span className={`leading-none ${small ? 'text-[9px]' : 'text-xs'} ${
            isRed(getSuit(card)) ? 'text-red-500' : 'text-black'
          }`}>
            {getSuit(card)}
          </span>
        </>
      )}
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
    const parts = name.trim().split(' ');
    return parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : (name[0]?.toUpperCase() ?? '?');
  };

  // ── Empty seat ────────────────────────────────────────────────────────────
  if (isEmpty) {
    return (
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-dashed border-[rgba(212,175,55,0.22)] bg-[rgba(0,0,0,0.35)] text-[var(--text-3)] text-xl leading-none select-none backdrop-blur-sm"
        title="Empty seat"
      >
        +
      </div>
    );
  }

  // ── Occupied seat ─────────────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col items-center gap-0.5">

      {/* Dealer button */}
      {player.isDealer && (
        <div className="absolute -right-2.5 -top-2.5 w-5 h-5 rounded-full bg-[var(--gold)] flex items-center justify-center text-[#0a0e12] text-[9px] font-bold z-10 border border-[rgba(212,175,55,0.5)] shadow">
          D
        </div>
      )}

      {/* Avatar */}
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
          isFolded
            ? 'opacity-50 grayscale bg-[rgba(212,175,55,0.06)] border-[rgba(212,175,55,0.2)]'
            : isCurrentPlayer
              ? 'bg-[rgba(212,175,55,0.18)] border-[var(--gold)] shadow-[0_0_12px_rgba(212,175,55,0.3)]'
              : 'bg-[rgba(212,175,55,0.1)] border-[rgba(212,175,55,0.3)]'
        }`}
      >
        <span className="font-semibold text-sm text-[var(--text)]">{getInitials(player.name)}</span>
      </div>

      {/* Name */}
      <span className="text-[10px] font-medium text-[var(--text-2)] max-w-[64px] truncate leading-tight">
        {player.name}
      </span>

      {/* Stack */}
      <span className="text-[10px] font-mono font-bold text-[var(--gold)] leading-tight">
        ${player.stack.toLocaleString()}
      </span>

      {/* Hole cards */}
      <div className="flex gap-1 mt-0.5">
        {player.cards && player.cards.length > 0
          ? player.cards.map((c, i) => <PlayingCard key={i} card={c} faceUp small />)
          : (
            <>
              <PlayingCard card="" faceUp={false} small />
              <PlayingCard card="" faceUp={false} small />
            </>
          )}
      </div>

      {/* Current bet chip */}
      {player.currentBet > 0 && (
        <div className="mt-0.5 px-2 py-0.5 rounded-full bg-[rgba(212,175,55,0.2)] border border-[var(--gold)] text-[9px] font-bold text-[var(--gold)]">
          ${player.currentBet}
        </div>
      )}

      {isFolded && (
        <span className="text-[9px] font-semibold text-[var(--red)] uppercase tracking-wide mt-0.5">
          FOLD
        </span>
      )}
    </div>
  );
};

export default Poker;
