import React, { useEffect, useState } from 'react';
import PlayingCard, { CardData, CardSlot } from '@/components/games/PlayingCard';
import GameTopBar from '@/components/games/GameTopBar';
import UnsupportedScreenSize from '@/components/games/UnsupportedScreenSize';
import { useAccount } from '@/hooks/useAccount';

interface Player {
  id: number;
  name: string;
  stack: number;
  currentBet: number;
  status: 'active' | 'folded' | 'waiting' | 'empty';
  isDealer?: boolean;
  cards?: CardData[];
}

/* Table stakes — TODO: comes from the table config / game engine */
const SMALL_BLIND = 25;
const BIG_BLIND = 50;
const MIN_BUYIN = BIG_BLIND * 20;
const MAX_BUYIN = BIG_BLIND * 100;

/*
  Seat positions on the oval — centered on the coordinate via translate(-50%, -50%).
  Symmetric: top/bottom pairs sum to 100%, left/right pairs are mirrored at 50%.
*/
const SEAT_POSITIONS: React.CSSProperties[] = [
  { top: '92%', left: '50%', transform: 'translate(-50%, -50%)' }, // 0 – bottom center
  { top: '74%', left: '87%', transform: 'translate(-50%, -50%)' }, // 1 – lower right
  { top: '26%', left: '87%', transform: 'translate(-50%, -50%)' }, // 2 – upper right
  { top: '8%', left: '50%', transform: 'translate(-50%, -50%)' }, // 3 – top center
  { top: '26%', left: '13%', transform: 'translate(-50%, -50%)' }, // 4 – upper left
  { top: '74%', left: '13%', transform: 'translate(-50%, -50%)' }, // 5 – lower left
];

const Poker: React.FC = () => {
  /* autoFetch=false: only the account is needed here, not the transaction history */
  const { account, getAccount } = useAccount(false);
  useEffect(() => {
    getAccount().catch(() => {});
  }, [getAccount]);
  const balance = account ? Math.floor(Number(account.balance)) : 0;

  /* TODO: all game state below comes from the game engine */
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
  const pot = 0;
  const communityCards: CardData[] = [];

  /* Pre-join UI state — seat choice and buy-in are sent to the engine on join */
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [buyIn, setBuyIn] = useState(MIN_BUYIN * 2);
  const [inputValue, setInputValue] = useState(String(MIN_BUYIN * 2));

  /* Clamp to MIN_BUYIN so the slider stays valid while the account loads */
  const maxBuyIn = Math.max(MIN_BUYIN, Math.min(MAX_BUYIN, balance));
  const canJoin = selectedSeat !== null && buyIn >= MIN_BUYIN && buyIn <= Math.min(maxBuyIn, balance);
  const fillPct = maxBuyIn > MIN_BUYIN ? ((buyIn - MIN_BUYIN) / (maxBuyIn - MIN_BUYIN)) * 100 : 0;
  const midBuyIn = Math.round((MIN_BUYIN + maxBuyIn) / 2 / BIG_BLIND) * BIG_BLIND;

  const clampBuyIn = (value: number) => Math.max(MIN_BUYIN, Math.min(value, maxBuyIn));

  const presetButton =
    'px-3 py-2 rounded-lg border border-[rgba(212,175,55,0.15)] text-[var(--text-3)] text-xs font-semibold uppercase tracking-wider hover:border-[rgba(212,175,55,0.4)] hover:text-[var(--text-2)] transition-all cursor-pointer';

  const [isSmallScreen, setIsSmallScreen] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* mt-[4.75rem] clears the floating global Header pill (pt-4 + h-14 = 4.5 rem) */
  return (
    <div
      className="mt-[4.75rem] flex flex-col bg-[var(--base)]"
      style={{ height: 'calc(100dvh - 4.75rem)' }}
    >
      {isSmallScreen ? (
        <UnsupportedScreenSize
          title="Screen Too Small"
          subtitle="This game is best enjoyed on a larger display. Please use a laptop or desktop to play."
        />
      ) : (
        <>
          <GameTopBar
            title="Texas Hold'em"
            subtitle={`No-Limit · 6-Max · Blinds $${SMALL_BLIND} / $${BIG_BLIND}`}
            balance={balance}
          />

          {/* ── Table area ─────────────────────────────────────────────────────── */}
          {/*
            The oval keeps its 1.9:1 shape and grows to whatever the viewport allows:
            width-bound on narrow screens, height-bound on tall/short ones.
            260px ≈ header offset + top bar + console + paddings.
          */}
          <div className="flex-1 min-h-0 flex items-center justify-center px-8 py-5">
            <div
              className="relative w-full"
              style={{ aspectRatio: '1.9 / 1', maxWidth: 'calc((100dvh - 260px) * 1.9)' }}
            >
              {/* Ambient glow */}
              <div className="glow-emerald absolute -inset-12 -z-10 pointer-events-none" />

              {/* ── Wood rail ───────────────────────────────────────────────── */}
              <div
                className="absolute inset-0 rounded-[50%]"
                style={{
                  background:
                    'linear-gradient(150deg, #38260d 0%, #241706 35%, #120b03 60%, #2a1c08 100%)',
                  boxShadow: [
                    '0 0 0 1px rgba(212,175,55,0.4)',
                    '0 24px 90px rgba(0,0,0,0.85)',
                    'inset 0 1px 0 rgba(255,255,255,0.08)',
                    'inset 0 0 24px rgba(0,0,0,0.7)',
                  ].join(', '),
                }}
              >
                {/* Gold inlay ring */}
                <div
                  className="absolute rounded-[50%] pointer-events-none"
                  style={{ inset: '8px', border: '1px solid rgba(212,175,55,0.28)' }}
                />

                {/* ── Felt ───────────────────────────────────────────────────── */}
                <div
                  className="absolute rounded-[50%]"
                  style={{
                    inset: '18px',
                    background:
                      'radial-gradient(ellipse at 50% 28%, #1b5742 0%, #14422f 42%, #0d2e21 75%, #082017 100%)',
                    boxShadow: 'inset 0 0 70px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(0,0,0,0.4)',
                  }}
                >
                  {/* Betting line */}
                  <div
                    className="absolute rounded-[50%] pointer-events-none"
                    style={{ inset: '11%', border: '1px solid rgba(212,175,55,0.14)' }}
                  />

                  {/* ── Table center ──────────────────────────────────────────── */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
                    <div className="flex items-center gap-2 opacity-50">
                      <span className="text-[rgba(212,175,55,0.6)] text-sm leading-none">◆</span>
                      <span className="font-serif text-[rgba(212,175,55,0.6)] text-sm tracking-[0.35em]">
                        FT_CASINO
                      </span>
                      <span className="text-[rgba(212,175,55,0.6)] text-sm leading-none">◆</span>
                    </div>

                    {/* Community cards */}
                    <div className="flex gap-1.5">
                      {communityCards.length > 0
                        ? communityCards.map((card, i) => (
                            <PlayingCard
                              key={i}
                              card={card}
                              size="md"
                              className="card-deal"
                              style={{ animationDelay: `${i * 120}ms` }}
                            />
                          ))
                        : [0, 1, 2, 3, 4].map((i) => <CardSlot key={i} size="md" />)}
                    </div>

                    {/* Pot */}
                    {pot > 0 ? (
                      <div
                        className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full"
                        style={{
                          border: '1px solid rgba(212,175,55,0.3)',
                          background: 'rgba(0,0,0,0.35)',
                          backdropFilter: 'blur(6px)',
                        }}
                      >
                        <span className="text-[9px] text-[var(--text-3)] uppercase tracking-[0.25em]">
                          Pot
                        </span>
                        <span className="font-serif text-lg text-[var(--gold)] leading-tight">
                          ${pot.toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[9px] uppercase tracking-[0.3em] text-[rgba(212,175,55,0.4)]">
                        No-Limit Hold'em · ${SMALL_BLIND} / ${BIG_BLIND}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Seats ──────────────────────────────────────────────────────── */}
              {players.map((player) => (
                <div key={player.id} className="absolute z-20" style={SEAT_POSITIONS[player.id]}>
                  <Seat
                    player={player}
                    selected={selectedSeat === player.id}
                    onSelect={setSelectedSeat}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Console ────────────────────────────────────────────────────────── */}
          <div className="shrink-0 border-t border-[rgba(212,175,55,0.12)] bg-[var(--surface)] px-5 py-4 min-h-[96px] flex items-center">
            <div className="w-full flex flex-wrap items-center gap-x-6 gap-y-3">
              {/* Seat indicator */}
              <div className="leading-tight">
                <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-3)]">Seat</p>
                <p
                  className={`font-serif text-lg ${
                    selectedSeat !== null ? 'text-[var(--gold)]' : 'text-[var(--text-3)]'
                  }`}
                >
                  {selectedSeat !== null ? `No. ${selectedSeat + 1}` : 'Pick one'}
                </p>
              </div>

              {/* Buy-in slider */}
              <div className="flex-1 min-w-[220px]">
                <div className="flex justify-between text-[10px] uppercase tracking-[0.18em] text-[var(--text-3)] mb-1.5">
                  <span>Buy-in · Min ${MIN_BUYIN.toLocaleString()}</span>
                  <span>Max ${maxBuyIn.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={MIN_BUYIN}
                  max={maxBuyIn}
                  step={BIG_BLIND}
                  value={buyIn}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setBuyIn(val);
                    setInputValue(String(val));
                  }}
                  className="range-gold w-full"
                  style={{ '--fill': `${fillPct}%` } as React.CSSProperties}
                  aria-label="Buy-in amount"
                />
              </div>

              {/* Amount + presets */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-[var(--surface-2)] border border-[rgba(212,175,55,0.14)] rounded-lg px-3 py-2">
                  <span className="text-[var(--text-3)] text-sm mr-1">$</span>
                  <input
                    type="number"
                    min={MIN_BUYIN}
                    max={maxBuyIn}
                    step={BIG_BLIND}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val === '' || isNaN(parseInt(val))) {
                        setBuyIn(MIN_BUYIN);
                        setInputValue(String(MIN_BUYIN));
                      } else {
                        const num = parseInt(val);
                        const snapped = Math.round(num / BIG_BLIND) * BIG_BLIND;
                        const clamped = clampBuyIn(snapped);
                        setBuyIn(clamped);
                        setInputValue(String(clamped));
                      }
                    }}
                    className="w-20 bg-transparent font-serif text-lg text-[var(--gold)] text-right focus:outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    aria-label="Buy-in amount input"
                  />
                </div>
                <button onClick={() => { setBuyIn(MIN_BUYIN); setInputValue(String(MIN_BUYIN)); }} className={presetButton}>
                  Min
                </button>
                <button onClick={() => { setBuyIn(midBuyIn); setInputValue(String(midBuyIn)); }} className={presetButton}>
                  ½
                </button>
                <button onClick={() => { setBuyIn(maxBuyIn); setInputValue(String(maxBuyIn)); }} className={presetButton}>
                  Max
                </button>
              </div>

              {/* Join */}
              <button
                disabled={!canJoin}
                className={`px-10 py-3.5 rounded-xl font-semibold text-sm tracking-[0.22em] uppercase transition-all duration-150 ${
                  canJoin
                    ? 'bg-[var(--gold)] text-[#0a0e12] hover:opacity-90 active:scale-[0.98] shadow-[0_2px_24px_rgba(212,175,55,0.3)] cursor-pointer'
                    : 'bg-[var(--surface-2)] text-[var(--text-3)] border border-[rgba(212,175,55,0.08)] cursor-not-allowed'
                }`}
              >
                {/* TODO: wire up to game engine */}
                Join Table
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Seat ─────────────────────────────────────────────────────────────────────

const Seat: React.FC<{
  player: Player;
  selected: boolean;
  onSelect: (id: number) => void;
}> = ({ player, selected, onSelect }) => {
  const isEmpty = player.status === 'empty';
  const isFolded = player.status === 'folded';

  // ── Empty seat — selectable before joining ─────────────────────────────────
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => onSelect(player.id)}
          aria-label={`Select seat ${player.id + 1}`}
          className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg leading-none transition-all duration-150 backdrop-blur-sm cursor-pointer ${
            selected
              ? 'border-[var(--gold)] bg-[rgba(212,175,55,0.18)] text-[var(--gold)] shadow-[0_0_16px_rgba(212,175,55,0.35)]'
              : 'border-dashed border-[rgba(212,175,55,0.3)] bg-[rgba(0,0,0,0.4)] text-[var(--text-3)] hover:border-[rgba(212,175,55,0.7)] hover:text-[var(--gold)] hover:scale-105'
          }`}
        >
          {selected ? '✓' : '+'}
        </button>
        <span
          className={`text-[9px] font-semibold uppercase tracking-[0.18em] ${
            selected ? 'text-[var(--gold)]' : 'text-[var(--text-3)]'
          }`}
        >
          Seat {player.id + 1}
        </span>
      </div>
    );
  }

  // ── Occupied seat ───────────────────────────────────────────────────────────
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    return parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : (name[0]?.toUpperCase() ?? '?');
  };

  return (
    <div className="relative flex flex-col items-center gap-1">
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
            : player.status === 'active'
              ? 'bg-[rgba(212,175,55,0.16)] border-[var(--gold)] shadow-[0_0_16px_rgba(212,175,55,0.35)]'
              : 'bg-[rgba(212,175,55,0.1)] border-[rgba(212,175,55,0.3)]'
        }`}
      >
        <span className="font-serif font-bold text-sm text-[var(--text)]">
          {getInitials(player.name)}
        </span>
      </div>

      {/* Nameplate */}
      <div className="px-3 py-1 rounded-full bg-[rgba(8,12,16,0.78)] border border-[rgba(212,175,55,0.25)] backdrop-blur-sm text-center leading-tight">
        <p className="text-[10px] font-semibold text-[var(--text)] max-w-[72px] truncate">
          {player.name}
        </p>
        <p className="font-serif text-[11px] text-[var(--gold)]">
          ${player.stack.toLocaleString()}
        </p>
      </div>

      {/* Hole cards */}
      {player.cards && player.cards.length > 0 ? (
        <div className="flex gap-1">
          {player.cards.map((card, i) => (
            <PlayingCard key={i} card={card} size="sm" />
          ))}
        </div>
      ) : (
        player.status !== 'waiting' &&
        !isFolded && (
          <div className="flex gap-1">
            <PlayingCard faceDown size="sm" />
            <PlayingCard faceDown size="sm" />
          </div>
        )
      )}

      {/* Current bet */}
      {player.currentBet > 0 && (
        <div className="px-2.5 py-0.5 rounded-full bg-[rgba(0,0,0,0.45)] border border-[rgba(212,175,55,0.4)] font-serif text-[10px] text-[var(--gold)]">
          ${player.currentBet.toLocaleString()}
        </div>
      )}

      {isFolded && (
        <span className="text-[9px] font-semibold text-[#d98994] uppercase tracking-[0.18em]">
          Fold
        </span>
      )}
    </div>
  );
};

export default Poker;
