import React, { useEffect, useState } from 'react';
import PlayingCard, { CardData, CardSlot, Rank, Suit } from '@/components/games/PlayingCard';
import Chip, { CHIP_VALUES } from '@/components/games/Chip';
import GameTopBar from '@/components/games/GameTopBar';
import UnsupportedScreenSize from '@/components/games/UnsupportedScreenSize';
import BlackjackRulesModal from '@/components/games/BlackjackRulesModal';
import { InfoTriggerButton } from '@/components/games/GameInfoModal';
import { useAccount } from '@/hooks/useAccount';
import { apiCall, ApiError } from '@/utils/api';

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

/* Engine cards look like "A♠" / "10♥" — suit is always the last character */
const parseCard = (card: string): CardData => ({
  rank: card.slice(0, -1) as Rank,
  suit: card.slice(-1) as Suit,
});

interface BlackjackDetail {
  player_cards: string[];
  dealer_cards: string[];
  player_value: number;
  dealer_value: number;
  outcome: string;
}

interface GameResponse {
  id: number;
  game_type: string;
  status: string;
  initial_bet: string;
  winnings: string;
  created_at: string;
  blackjack?: BlackjackDetail;
}

const OUTCOME_MESSAGES: Record<string, string> = {
  player_blackjack: 'Blackjack! You win',
  player_win: 'You win',
  push: 'Push — bet returned',
  dealer_win: 'Dealer wins',
};

const Blackjack: React.FC = () => {
  /* autoFetch=false: only the account is needed here, not the transaction history */
  const { account, getAccount } = useAccount(false);
  React.useEffect(() => {
    getAccount().catch(() => {});
  }, [getAccount]);
  const balance = account ? Math.floor(Number(account.balance)) : 0;

  /* Bet is staged as a stack of chips so the engine receives a single amount on deal */
  const [stagedChips, setStagedChips] = useState<number[]>([]);

  const [gameId, setGameId] = useState<number | null>(null);
  const [playerHand, setPlayerHand] = useState<CardData[]>([]);
  const [dealerHand, setDealerHand] = useState<CardData[]>([]);
  const [playerValue, setPlayerValue] = useState(0);
  const [dealerValue, setDealerValue] = useState(0);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [gameActive, setGameActive] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);

  const [isSmallScreen, setIsSmallScreen] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsSmallScreen(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const bet = sum(stagedChips);
  const canDeal = bet > 0 && bet <= balance && !isBusy;

  const addChip = (value: number) => {
    if (bet + value <= balance) setStagedChips((c) => [...c, value]);
  };
  const undoChip = () => setStagedChips((c) => c.slice(0, -1));
  const clearChips = () => setStagedChips([]);
  const maxBet = () => {
    const denoms = [...CHIP_VALUES].sort((a, b) => b - a);
    const chips: number[] = [];
    let remaining = balance;
    for (const d of denoms) {
      while (remaining >= d) {
        chips.push(d);
        remaining -= d;
      }
    }
    setStagedChips(chips);
  };

  const applyResponse = (response: GameResponse) => {
    const detail = response.blackjack;
    setGameId(response.id);
    setPlayerHand((detail?.player_cards ?? []).map(parseCard));
    setDealerHand((detail?.dealer_cards ?? []).map(parseCard));
    setPlayerValue(detail?.player_value ?? 0);
    setDealerValue(detail?.dealer_value ?? 0);
    setOutcome(detail?.outcome || null);
    setGameActive(response.status === 'in_progress');
    if (response.status !== 'in_progress') {
      getAccount().catch(() => {});
    }
  };

  const deal = async () => {
    if (!canDeal) return;
    setIsBusy(true);
    setError(null);
    try {
      const response = await apiCall<GameResponse>('POST', '/games', {
        game_type: 'blackjack',
        bet_amount: String(bet),
      });
      applyResponse(response);
      setStagedChips([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to deal');
    } finally {
      setIsBusy(false);
    }
  };

  const act = async (action: 'hit' | 'stand') => {
    if (!gameId || isBusy) return;
    setIsBusy(true);
    setError(null);
    try {
      const response = await apiCall<GameResponse>('POST', `/games/${gameId}/action`, { action });
      applyResponse(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setIsBusy(false);
    }
  };

  const ghostButton =
    'px-4 py-2.5 rounded-lg border border-[rgba(212,175,55,0.45)] bg-[rgba(212,175,55,0.1)] text-[var(--text)] text-sm font-semibold hover:border-[rgba(212,175,55,0.75)] hover:bg-[rgba(212,175,55,0.2)] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed';

  const actionButton =
    'flex-1 py-4 rounded-xl font-semibold uppercase tracking-[0.18em] border border-[rgba(255,255,255,0.08)] transition-colors cursor-pointer active:scale-[0.98] disabled:opacity-35 disabled:cursor-not-allowed';

  /* mt-[4.75rem] clears the floating global Header pill (pt-4 + h-14 = 4.5 rem) */
  return (
    <div
      className="mt-[4.75rem] flex flex-col bg-[var(--base)]"
      style={{ height: 'calc(100dvh - 4.75rem)' }}
    >
      {isSmallScreen ? (
        <UnsupportedScreenSize
          title="Screen Too Small"
          subtitle="This game is best enjoyed on a larger display. Please use a tablet or desktop to play."
        />
      ) : (
        <>
      <GameTopBar title="Blackjack" subtitle="Single Deck · Pays 3 to 2" balance={balance} />

      {/* ── Table felt ─────────────────────────────────────────────────────── */}
      <div
        className="relative flex-1 min-h-0 m-3 mb-2 rounded-2xl overflow-hidden"
        style={{
          background:
            'radial-gradient(ellipse 130% 100% at 50% -10%, #1b5742 0%, #123c2d 48%, #0b2a1f 78%, #071e16 100%)',
          boxShadow: 'inset 0 0 90px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(212,175,55,0.18)',
        }}
      >
        {/* Inner pinstripe */}
        <div className="absolute inset-2.5 rounded-xl border border-[rgba(212,175,55,0.12)] pointer-events-none" />

        {/* Rules */}
        <InfoTriggerButton onClick={() => setShowRules(true)} />

        {/* Arc inscription */}
        <svg
          className="absolute left-1/2 top-[34%] -translate-x-1/2 -translate-y-1/2 w-[min(78%,560px)] pointer-events-none"
          viewBox="0 0 600 240"
          aria-hidden="true"
        >
          <defs>
            <path id="bj-arc-1" d="M 60 200 A 300 300 0 0 1 540 200" fill="none" />
            <path id="bj-arc-2" d="M 80 232 A 330 330 0 0 1 520 232" fill="none" />
          </defs>
          <text
            fill="rgba(212,175,55,0.4)"
            fontSize="23"
            letterSpacing="7"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            <textPath href="#bj-arc-1" startOffset="50%" textAnchor="middle">
              BLACKJACK PAYS 3 TO 2
            </textPath>
          </text>
          <text fill="rgba(212,175,55,0.26)" fontSize="11" letterSpacing="4">
            <textPath href="#bj-arc-2" startOffset="50%" textAnchor="middle">
              DEALER MUST STAND ON 17 AND DRAW TO 16
            </textPath>
          </text>
        </svg>

        <div className="relative h-full flex flex-col items-center justify-between px-4 py-5">
          {/* Dealer */}
          <div className="flex flex-col items-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[rgba(212,175,55,0.55)]">
                Dealer
              </span>
              {dealerHand.length > 0 && <TotalBadge value={dealerValue} />}
            </div>
            <div className="flex gap-2 min-h-[7.7rem]">
              {dealerHand.length === 0 ? (
                <>
                  <CardSlot size="xl" />
                  <CardSlot size="xl" />
                </>
              ) : (
                dealerHand.map((card, i) => (
                  <PlayingCard
                    key={i}
                    card={card}
                    size="xl"
                    className="card-deal"
                    style={{ animationDelay: `${i * 220}ms` }}
                  />
                ))
              )}
            </div>
          </div>

          {/* Bet circle */}
          <div className="flex flex-col items-center gap-1.5">
            <div
              className="relative w-[5.75rem] h-[5.75rem] rounded-full border-2 border-dashed border-[rgba(212,175,55,0.35)]"
              style={{ background: 'rgba(0,0,0,0.18)' }}
            >
              {stagedChips.length === 0 ? (
                <span className="absolute inset-0 flex items-center justify-center text-[9px] tracking-[0.25em] text-[rgba(212,175,55,0.45)] uppercase">
                  Bet
                </span>
              ) : (
                <div
                  className="absolute left-1/2 -translate-x-1/2"
                  style={{ width: 46, height: 46, bottom: 14 }}
                >
                  {stagedChips.slice(-6).map((value, i) => (
                    <div key={i} className="absolute left-0 chip-pop" style={{ bottom: i * 6 }}>
                      <Chip value={value} size={46} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            {bet > 0 && (
              <span className="font-serif text-xl text-[var(--gold)]">${bet.toLocaleString()}</span>
            )}
            {!gameActive && outcome && (
              <span
                className={`text-xs font-semibold uppercase tracking-[0.15em] ${
                  outcome === 'dealer_win' ? 'text-[#e8a5ae]' : 'text-[var(--gold)]'
                }`}
              >
                {OUTCOME_MESSAGES[outcome] ?? outcome}
              </span>
            )}
            {error && <span className="text-xs text-[#e8a5ae]">{error}</span>}
          </div>

          {/* Player */}
          <div className="flex flex-col items-center gap-2.5">
            <div className="flex gap-2 min-h-[7.7rem]">
              {playerHand.length === 0 ? (
                <>
                  <CardSlot size="xl" />
                  <CardSlot size="xl" />
                </>
              ) : (
                playerHand.map((card, i) => (
                  <PlayingCard
                    key={i}
                    card={card}
                    size="xl"
                    className="card-deal"
                    style={{ animationDelay: `${i < 2 ? i * 160 : 0}ms` }}
                  />
                ))
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[rgba(212,175,55,0.55)]">
                Your Hand
              </span>
              {playerHand.length > 0 && <TotalBadge value={playerValue} />}
            </div>
          </div>
        </div>
      </div>

      {/* ── Console ────────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-[rgba(212,175,55,0.12)] bg-[var(--surface)] px-5 py-4 min-h-[88px] flex items-center">
        {!gameActive ? (
          <div className="w-full flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="flex items-end gap-2.5">
              {CHIP_VALUES.map((value) => (
                <Chip
                  key={value}
                  value={value}
                  onClick={() => addChip(value)}
                  disabled={isBusy || bet + value > balance}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={undoChip} disabled={isBusy || stagedChips.length === 0} className={ghostButton}>
                Undo
              </button>
              <button onClick={clearChips} disabled={isBusy || stagedChips.length === 0} className={ghostButton}>
                Clear
              </button>
              <button onClick={maxBet} disabled={isBusy || balance === 0} className={ghostButton}>
                Max
              </button>
            </div>
            <button
              onClick={deal}
              disabled={!canDeal}
              className={`ml-auto px-12 py-3.5 rounded-xl font-semibold text-base tracking-[0.22em] uppercase transition-all duration-150 ${
                canDeal
                  ? 'bg-[var(--gold)] text-[#0a0e12] hover:opacity-90 active:scale-[0.98] shadow-[0_2px_24px_rgba(212,175,55,0.3)] cursor-pointer'
                  : 'bg-[var(--surface-2)] text-[var(--text-3)] border border-[rgba(212,175,55,0.08)] cursor-not-allowed'
              }`}
            >
              {isBusy ? 'Dealing…' : 'Deal'}
            </button>
          </div>
        ) : (
          <div className="w-full flex items-center gap-3">
            <div className="hidden sm:block mr-2 leading-tight">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-3)]">Wager</p>
              <p className="font-serif text-lg text-[var(--gold)]">${bet.toLocaleString()}</p>
            </div>
            <button
              onClick={() => act('hit')}
              disabled={isBusy}
              className={`${actionButton} text-[#e9f5ef] bg-[#1e5a45] hover:bg-[#247052]`}
            >
              Hit
            </button>
            <button
              onClick={() => act('stand')}
              disabled={isBusy}
              className={`${actionButton} text-[#f6e3e6] bg-[var(--red)] hover:bg-[#a12e40]`}
            >
              Stand
            </button>
          </div>
        )}
      </div>
        </>
      )}

      {showRules && <BlackjackRulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
};

// ─── Hand total badge ─────────────────────────────────────────────────────────

const TotalBadge: React.FC<{ value: number }> = ({ value }) => (
  <span
    className={`px-2.5 py-0.5 rounded-full border font-serif text-sm leading-tight ${
      value > 21
        ? 'border-[rgba(139,38,53,0.6)] bg-[rgba(139,38,53,0.25)] text-[#e8a5ae]'
        : value === 21
          ? 'border-[rgba(212,175,55,0.6)] bg-[rgba(212,175,55,0.15)] text-[var(--gold)]'
          : 'border-[rgba(212,175,55,0.25)] bg-[rgba(0,0,0,0.35)] text-[var(--text)]'
    }`}
  >
    {value > 21 ? `${value} · Bust` : value}
  </span>
);

export default Blackjack;
