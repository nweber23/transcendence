import React, { useEffect, useRef, useState } from 'react';
import PlayingCard, { CardData, CardSlot, Rank, Suit } from '@/components/games/PlayingCard';
import GameTopBar from '@/components/games/GameTopBar';
import UnsupportedScreenSize from '@/components/games/UnsupportedScreenSize';
import Avatar from '@/components/ui/Avatar';
import { useAccount } from '@/hooks/useAccount';
import { subscribeToWebSocket, sendWebSocketPacket, WsPacket } from '@/utils/wsClient';

interface Player {
  id: number;
  name: string;
  avatarURL: string;
  stack: number;
  currentBet: number;
  status: 'active' | 'folded' | 'waiting' | 'empty';
  isDealer?: boolean;
  isTurn?: boolean;
  cards?: CardData[];
}

/* Engine cards look like "A♠" / "10♥" — suit is always the last character */
const parseCard = (card: string): CardData => ({
  rank: card.slice(0, -1) as Rank,
  suit: card.slice(-1) as Suit,
});

/* The table has one fixed buy-in — the engine can't seed players with
   different starting stacks, so these are only fallbacks until the first
   poker_state snapshot arrives from the server (the source of truth). */
const DEFAULT_SMALL_BLIND = 25;
const DEFAULT_BIG_BLIND = 50;
const DEFAULT_BUY_IN = 1000;

const SEAT_COUNT = 6;

interface PokerSeatPacket {
  seat: number;
  user_id: number;
  username: string;
  avatar_url: string;
  stack: number;
  current_bet: number;
  folded: boolean;
  all_in: boolean;
  is_dealer: boolean;
  is_turn: boolean;
  hole_cards?: string[];
}

interface PokerHandWinner {
  seat: number;
  username: string;
  amount: number;
}

interface PokerHandResult {
  winners: PokerHandWinner[];
  pot: number;
}

interface PokerStatePacket {
  seats: PokerSeatPacket[];
  your_seat: number;
  hand_active: boolean;
  phase: string;
  community_cards: string[];
  pot: number;
  min_raise: number;
  small_blind: number;
  big_blind: number;
  buy_in: number;
  last_action_type: string;
  last_action_amount: number;
  turn_deadline: number; // unix ms; 0 if no turn is currently awaiting action
  hand_result?: PokerHandResult;
}

/* Matches the backend's pause between hands (ws/poker.go: pokerNextHandGap) */
const HAND_RESULT_DISPLAY_MS = 4000;

/* Matches the backend's per-turn countdown (ws/poker.go: pokerTurnTimeout) —
   only used to turn the absolute turn_deadline into a fraction for the ring. */
const TURN_TIMEOUT_MS = 30000;

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

  const [table, setTable] = useState<PokerStatePacket | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [raiseTo, setRaiseTo] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [handResult, setHandResult] = useState<PokerHandResult | null>(null);
  const [bustedMessage, setBustedMessage] = useState<string | null>(null);

  /* Seats persist across many hands now, so "you were seated last update and
     aren't anymore" only means something when it wasn't your own click. */
  const previousSeatRef = useRef(-1);
  const didLeaveRef = useRef(false);

  useEffect(() => {
    const unsubscribe = subscribeToWebSocket((packet: WsPacket) => {
      if (packet.packet_type === 'poker_state') {
        const payload = packet.payload as PokerStatePacket;
        setTable(payload);
        setError(null);

        if (payload.hand_result) {
          setHandResult(payload.hand_result);
          window.setTimeout(() => setHandResult(null), HAND_RESULT_DISPLAY_MS);
        }

        if (previousSeatRef.current >= 0 && payload.your_seat < 0) {
          if (!didLeaveRef.current) {
            setBustedMessage("You're out of chips — pick a new seat to buy back in.");
            window.setTimeout(() => setBustedMessage(null), HAND_RESULT_DISPLAY_MS);
          }
          didLeaveRef.current = false;
          getAccount().catch(() => {}); // our stack was just cashed back into the wallet
        }
        previousSeatRef.current = payload.your_seat;
      } else if (packet.packet_type === 'error') {
        setError((packet.payload as { message: string }).message);
      }
    });
    sendWebSocketPacket('sync');
    return unsubscribe;
  }, []);

  /* Ticks while a turn countdown is running so the ring/badge below can
     recompute how much time is left; idle otherwise. */
  const turnDeadline = table?.turn_deadline || 0;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!turnDeadline) return;
    const interval = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(interval);
  }, [turnDeadline]);
  const turnSecondsLeft = turnDeadline ? Math.max(0, Math.ceil((turnDeadline - now) / 1000)) : null;
  const turnFraction = turnDeadline ? Math.max(0, Math.min(1, (turnDeadline - now) / TURN_TIMEOUT_MS)) : null;

  const smallBlind = table?.small_blind ?? DEFAULT_SMALL_BLIND;
  const bigBlind = table?.big_blind ?? DEFAULT_BIG_BLIND;
  const buyIn = table?.buy_in ?? DEFAULT_BUY_IN;
  const mySeat = table && table.your_seat >= 0 ? table.seats.find((s) => s.seat === table.your_seat) : undefined;
  const isSeated = mySeat !== undefined;
  const handActive = table?.hand_active ?? false;
  const seatedCount = table?.seats.length ?? 0;
  const canJoin = selectedSeat !== null && !isSeated && !handActive && buyIn <= balance;

  const players: Player[] = Array.from({ length: SEAT_COUNT }, (_, seatIdx) => {
    const seatState = table?.seats.find((s) => s.seat === seatIdx);
    if (!seatState) {
      return { id: seatIdx, name: '', avatarURL: '', stack: 0, currentBet: 0, status: 'empty' as const };
    }
    return {
      id: seatIdx,
      name: seatState.username,
      avatarURL: seatState.avatar_url,
      stack: seatState.stack,
      currentBet: seatState.current_bet,
      status: seatState.folded ? 'folded' : handActive ? 'active' : 'waiting',
      isDealer: seatState.is_dealer,
      isTurn: seatState.is_turn,
      cards: seatState.hole_cards?.map(parseCard),
    };
  });

  const pot = table?.pot ?? 0;
  const communityCards = (table?.community_cards ?? []).map(parseCard);

  const toCall = mySeat ? Math.max(0, (table?.last_action_amount ?? 0) - mySeat.current_bet) : 0;
  const minRaiseTo = (table?.last_action_amount ?? 0) + (table?.min_raise ?? bigBlind);

  const join = () => {
    if (!canJoin || selectedSeat === null) return;
    sendWebSocketPacket('join', { seat: selectedSeat });
    setSelectedSeat(null);
    getAccount().catch(() => {}); // buy-in is debited immediately
  };
  const leave = () => {
    didLeaveRef.current = true;
    sendWebSocketPacket('leave');
    getAccount().catch(() => {});
  };
  const act = (action: string, amount = 0) => sendWebSocketPacket('play', { action, amount });

  const presetButton =
    'px-3 py-2 rounded-lg border border-[rgba(212,175,55,0.15)] text-[var(--text-3)] text-xs font-semibold uppercase tracking-wider hover:border-[rgba(212,175,55,0.4)] hover:text-[var(--text-2)] transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed';

  const actionButton =
    'flex-1 py-3.5 rounded-xl font-semibold uppercase tracking-[0.14em] border border-[rgba(255,255,255,0.08)] transition-colors cursor-pointer active:scale-[0.98] disabled:opacity-35 disabled:cursor-not-allowed';

  const [isSmallScreen, setIsSmallScreen] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMyTurn = handActive && mySeat?.is_turn === true;

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
            subtitle={`No-Limit · 6-Max · Blinds $${smallBlind} / $${bigBlind}`}
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
                    <div className="flex gap-2">
                      {communityCards.length > 0
                        ? communityCards.map((card, i) => (
                            <PlayingCard
                              key={i}
                              card={card}
                              size="lg"
                              className="card-deal"
                              style={{ animationDelay: `${i * 120}ms` }}
                            />
                          ))
                        : [0, 1, 2, 3, 4].map((i) => <CardSlot key={i} size="lg" />)}
                    </div>

                    {/* Pot */}
                    {pot > 0 ? (
                      <div
                        className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full"
                        style={{
                          border: '1px solid rgba(212,175,55,0.3)',
                          background: 'rgba(0,0,0,0.35)',
                          WebkitBackdropFilter: 'blur(6px)',
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
                        No-Limit Hold'em · ${smallBlind} / ${bigBlind}
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
                    selectable={!isSeated && !handActive}
                    onSelect={setSelectedSeat}
                    turnSecondsLeft={player.isTurn ? turnSecondsLeft : null}
                    turnFraction={player.isTurn ? turnFraction : null}
                  />
                </div>
              ))}

              {/* ── Hand result banner — the table keeps playing, so this is the only
                   place the outcome of a finished hand is shown ── */}
              {handResult && (
                <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none px-6">
                  <div
                    className="banner-pop text-center px-6 py-4 rounded-2xl"
                    style={{
                      background: 'rgba(8,12,16,0.92)',
                      border: '1px solid rgba(212,175,55,0.5)',
                      boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
                    }}
                  >
                    <p className="text-[9px] uppercase tracking-[0.3em] text-[rgba(212,175,55,0.6)] mb-1.5">
                      {handResult.pot > 0 ? `Pot · $${handResult.pot.toLocaleString()}` : 'Hand Over'}
                    </p>
                    {handResult.winners.length > 0 ? (
                      handResult.winners.map((winner) => (
                        <p key={winner.seat} className="font-serif text-lg text-[var(--gold)] leading-snug">
                          {winner.username} wins ${winner.amount.toLocaleString()}
                        </p>
                      ))
                    ) : (
                      <p className="font-serif text-lg text-[var(--gold)]">Chips returned — no winner</p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Busted-out banner — only for the player it happened to ── */}
              {bustedMessage && (
                <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none px-6">
                  <div
                    className="banner-pop text-center px-6 py-4 rounded-2xl"
                    style={{
                      background: 'rgba(8,12,16,0.92)',
                      border: '1px solid rgba(139,38,53,0.6)',
                      boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
                    }}
                  >
                    <p className="font-serif text-lg text-[#e8a5ae]">{bustedMessage}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Console ────────────────────────────────────────────────────────── */}
          <div className="shrink-0 border-t border-[rgba(212,175,55,0.12)] bg-[var(--surface)] px-5 py-4 min-h-[96px] flex items-center">
            {!isSeated ? (
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

                <div className="leading-tight">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-3)]">Buy-in</p>
                  <p className="font-serif text-lg text-[var(--gold)]">${buyIn.toLocaleString()}</p>
                </div>

                {error && <p className="text-xs text-[#e8a5ae]">{error}</p>}

                {/* Join */}
                <button
                  onClick={join}
                  disabled={!canJoin}
                  className={`ml-auto px-10 py-3.5 rounded-xl font-semibold text-sm tracking-[0.22em] uppercase transition-all duration-150 ${
                    canJoin
                      ? 'bg-[var(--gold)] text-[#0a0e12] hover:opacity-90 active:scale-[0.98] shadow-[0_2px_24px_rgba(212,175,55,0.3)] cursor-pointer'
                      : 'bg-[var(--surface-2)] text-[var(--text-3)] border border-[rgba(212,175,55,0.08)] cursor-not-allowed'
                  }`}
                >
                  Join Table
                </button>
              </div>
            ) : !handActive ? (
              <div className="w-full flex items-center gap-4">
                <p className="text-sm text-[var(--text-3)]">
                  Seated with ${mySeat?.stack.toLocaleString()} —{' '}
                  {seatedCount >= 2 ? 'next hand starting…' : 'waiting for another player to join…'}
                </p>
                {error && <p className="text-xs text-[#e8a5ae]">{error}</p>}
                <button onClick={leave} className={`${presetButton} ml-auto`}>
                  Leave Table
                </button>
              </div>
            ) : (
              <div className="w-full flex items-center gap-4">
                {/* Your Hand — shown large here regardless of which seat you're in,
                    since the seats around the oval are too small/far to read from */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex gap-1">
                    {mySeat?.hole_cards && mySeat.hole_cards.length > 0 ? (
                      mySeat.hole_cards.map((card, i) => (
                        <PlayingCard key={i} card={parseCard(card)} size="lg" className="card-deal" style={{ animationDelay: `${i * 100}ms` }} />
                      ))
                    ) : (
                      <>
                        <PlayingCard faceDown size="lg" />
                        <PlayingCard faceDown size="lg" />
                      </>
                    )}
                  </div>
                  <div className="hidden sm:block leading-tight">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-3)]">Stack</p>
                    <p className="font-serif text-lg text-[var(--gold)]">${mySeat?.stack.toLocaleString()}</p>
                  </div>
                  {isMyTurn && turnSecondsLeft !== null && (
                    <div className="hidden sm:block leading-tight">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-3)]">Time Left</p>
                      <p
                        className={`font-serif text-lg ${
                          turnSecondsLeft <= 10 ? 'text-[var(--red)] animate-pulse' : 'text-[var(--gold)]'
                        }`}
                      >
                        {turnSecondsLeft}s
                      </p>
                    </div>
                  )}
                </div>
                {error && <p className="text-xs text-[#e8a5ae]">{error}</p>}
                <button
                  onClick={() => act('fold')}
                  disabled={!isMyTurn}
                  className={`${actionButton} text-[#f6e3e6] bg-[var(--red)] hover:bg-[#a12e40] ml-auto`}
                >
                  Fold
                </button>
                <button
                  onClick={() => act(toCall > 0 ? 'call' : 'check')}
                  disabled={!isMyTurn}
                  className={`${actionButton} text-[#e9f5ef] bg-[#1e5a45] hover:bg-[#247052]`}
                >
                  {toCall > 0 ? `Call $${toCall.toLocaleString()}` : 'Check'}
                </button>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={minRaiseTo}
                    step={bigBlind}
                    value={raiseTo ?? minRaiseTo}
                    onChange={(e) => setRaiseTo(Number(e.target.value))}
                    disabled={!isMyTurn}
                    className="w-24 bg-[var(--surface-2)] border border-[rgba(212,175,55,0.14)] rounded-lg px-2 py-3 font-serif text-[var(--gold)] text-right focus:outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-40"
                    aria-label="Raise to amount"
                  />
                  <button
                    onClick={() => act('raise', Math.max(raiseTo ?? minRaiseTo, minRaiseTo))}
                    disabled={!isMyTurn}
                    className={`${actionButton} text-[#0a0e12] bg-[var(--gold)] hover:opacity-90 border-none`}
                  >
                    Raise
                  </button>
                </div>
                <button
                  onClick={() => act('all_in')}
                  disabled={!isMyTurn}
                  className={`${actionButton} text-[#0a0e12] bg-[rgba(212,175,55,0.85)] hover:opacity-90 border-none`}
                >
                  All In
                </button>
              </div>
            )}
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
  selectable: boolean;
  onSelect: (id: number) => void;
  turnSecondsLeft?: number | null;
  turnFraction?: number | null;
}> = ({ player, selected, selectable, onSelect, turnSecondsLeft, turnFraction }) => {
  const isEmpty = player.status === 'empty';
  const isFolded = player.status === 'folded';
  const showTurnTimer = player.isTurn && turnSecondsLeft != null && turnFraction != null;
  const turnUrgent = showTurnTimer && turnSecondsLeft! <= 10;

  // ── Empty seat — selectable before joining ─────────────────────────────────
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => selectable && onSelect(player.id)}
          disabled={!selectable}
          aria-label={`Select seat ${player.id + 1}`}
          className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg leading-none transition-all duration-150 backdrop-blur-sm cursor-pointer disabled:cursor-not-allowed ${
            selected
              ? 'border-[var(--gold)] bg-[rgba(212,175,55,0.18)] text-[var(--gold)] shadow-[0_0_16px_rgba(212,175,55,0.35)]'
              : 'border-dashed border-[rgba(212,175,55,0.3)] bg-[rgba(0,0,0,0.4)] text-[var(--text-3)] hover:border-[rgba(212,175,55,0.7)] hover:text-[var(--gold)] hover:scale-105 disabled:hover:scale-100 disabled:hover:border-[rgba(212,175,55,0.3)]'
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
        className={`relative rounded-full transition-all ${
          isFolded
            ? 'opacity-50 grayscale'
            : player.isTurn
              ? 'ring-2 ring-[var(--gold)] shadow-[0_0_16px_rgba(212,175,55,0.35)]'
              : ''
        }`}
      >
        <Avatar avatarURL={player.avatarURL} size={48} />

        {/* Turn countdown — a thin ring that drains as the deadline
            approaches, so it stays visible without competing with the
            avatar for attention; only shown for whoever must act. */}
        {showTurnTimer && (
          <>
            <svg
              width={48}
              height={48}
              viewBox="0 0 48 48"
              className="absolute inset-0 -rotate-90 pointer-events-none"
            >
              <circle
                cx={24}
                cy={24}
                r={22}
                fill="none"
                stroke={turnUrgent ? 'var(--red)' : 'var(--gold)'}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 22}
                strokeDashoffset={2 * Math.PI * 22 * (1 - turnFraction!)}
                style={{ transition: 'stroke-dashoffset 200ms linear' }}
              />
            </svg>
            <div
              className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold z-10 border shadow ${
                turnUrgent
                  ? 'bg-[var(--red)] text-[#f6e3e6] border-[rgba(255,255,255,0.25)] animate-pulse'
                  : 'bg-[var(--gold)] text-[#0a0e12] border-[rgba(212,175,55,0.5)]'
              }`}
            >
              {turnSecondsLeft}
            </div>
          </>
        )}
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

      {/* Hole cards — only revealed at showdown for other players (see the
          "Your Hand" panel in the console for your own, shown much larger) */}
      {player.cards && player.cards.length > 0 ? (
        <div className="flex gap-1">
          {player.cards.map((card, i) => (
            <PlayingCard key={i} card={card} size="md" />
          ))}
        </div>
      ) : (
        player.status === 'active' &&
        !isFolded && (
          <div className="flex gap-1">
            <PlayingCard faceDown size="md" />
            <PlayingCard faceDown size="md" />
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
