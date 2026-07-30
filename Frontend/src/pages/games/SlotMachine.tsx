import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import GameTopBar from '@/components/games/GameTopBar';
import Chip, { CHIP_VALUES } from '@/components/games/Chip';
import UnsupportedScreenSize from '@/components/games/UnsupportedScreenSize';
import SlotPaytableModal from '@/components/games/SlotPaytableModal';
import { InfoTriggerButton } from '@/components/games/GameInfoModal';
import { useAccount } from '@/hooks/useAccount';
import { apiCall, ApiError } from '@/utils/api';
import { LINE_OPTIONS, SYMBOLS } from './luckySevensConfig';
import { evaluateWinningLines, evaluateScatterWin, type WinningLine, type ScatterWin } from './luckySevensWins';

/* Every symbol in the engine config maps 1:1 onto its own real asset (see
   luckySevensConfig.ts), so a real engine match always renders as a visual
   match too. */
const SYMBOL_ICON_MAP: Record<string, string> = Object.fromEntries(
  SYMBOLS.map((s) => [s.id, s.file.replace(/^\//, '').replace(/\.png$/, '')]),
);

/* Filler icons shown while the reels are still cosmetically spinning — just
   the real symbol set, since there's no separate decorative art anymore. */
const ICONS = Object.values(SYMBOL_ICON_MAP);

const LINE_COLORS = ['#ffd447', '#ff6b6b', '#4ecdc4', '#a78bfa', '#f472b6', '#34d399', '#60a5fa', '#fb923c', '#facc15', '#f87171'];

const BASE_SPINNING_DURATION = 2.7;
const COLUMN_SPINNING_DURATION = 0.6;
const NUM_REELS = 3;
const NUM_ROWS = 3;
/* How long the win/lose message stays on screen before auto spin fires the next spin */
const RESULT_PAUSE_MS = 1200;
/* Free spins replay each awarded step at a brisker pace than the base spin —
   there can be up to FREE_SPIN_COUNT (15) of them, so a full base-length
   animation per step would drag the bonus round out too long. */
const FREE_SPIN_SPINNING_DURATION = 0.9;
const FREE_SPIN_STEP_PAUSE_MS = 500;
const FREE_SPIN_BANNER_MS = 2000;

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function getRandomIcon() {
  return ICONS[Math.floor(Math.random() * ICONS.length)];
}

function iconFor(symbol: string) {
  return SYMBOL_ICON_MAP[symbol] ?? getRandomIcon();
}

function randomDuration() {
  return Math.floor(Math.random() * 10) / 100;
}

/* One entry per spin the engine actually resolved for this round — index 0 is
   the base spin, every entry after it is one awarded free spin. */
interface SlotSpinStep {
  step: number;
  is_free_spin: boolean;
  free_spins_remaining: number;
  multiplier: number;
  step_win: number;
  accumulated_free_win: number;
  grid: string[][]; // [row][col], row-major, from the engine
}

interface GameResponse {
  id: number;
  game_type: string;
  status: string;
  initial_bet: string;
  winnings: string;
  created_at: string;
  slots?: {
    grid: string[][];
    bonus_triggered: boolean;
    free_spin_count: number;
    timeline: SlotSpinStep[];
  };
}

/* Progress HUD shown while a free-spin bonus round is playing out. */
interface FreeSpinProgress {
  index: number; // 1-based, within the free-spin steps only
  total: number;
  multiplier: number;
  accumulated: number; // total won from free spins so far
}

const SlotMachine: React.FC = () => {
  const { account, getAccount } = useAccount(false);
  useEffect(() => { getAccount().catch(() => {}); }, [getAccount]);
  const balance = account ? Math.floor(Number(account.balance)) : 0;

  const [isSmallScreen, setIsSmallScreen] = useState(() => window.innerWidth < 768);
  const [stagedChips, setStagedChips] = useState<number[]>([]);
  const [lines, setLines] = useState<number>(LINE_OPTIONS[0]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isAutoSpinning, setIsAutoSpinning] = useState(false);
  const [itemHeight, setItemHeight] = useState(100);
  const [columnWidth, setColumnWidth] = useState(100);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [winningLines, setWinningLines] = useState<WinningLine[]>([]);
  const [scatterWin, setScatterWin] = useState<ScatterWin | null>(null);
  const [showPaytable, setShowPaytable] = useState(false);
  const [isBonusSequence, setIsBonusSequence] = useState(false);
  const [freeSpinAnnounce, setFreeSpinAnnounce] = useState<number | null>(null);
  const [freeSpinProgress, setFreeSpinProgress] = useState<FreeSpinProgress | null>(null);

  /* Auto spin loops faster than React state settles, so it tracks the live
     "should keep going" flag and the optimistic balance in refs rather than
     relying on stale closures over state. */
  const autoSpinRef = useRef(false);
  const balanceRef = useRef(0);
  useEffect(() => { balanceRef.current = balance; }, [balance]);
  useEffect(() => () => { autoSpinRef.current = false; }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 768);
      if (windowRef.current) {
        const measuredHeight = Math.floor(windowRef.current.clientHeight / NUM_ROWS);
        if (measuredHeight > 0) setItemHeight(measuredHeight);
        const measuredWidth = Math.floor(windowRef.current.clientWidth / NUM_REELS);
        if (measuredWidth > 0) setColumnWidth(measuredWidth);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const windowRef = useRef<HTMLDivElement>(null);
  const colRefs = useRef<(HTMLDivElement | null)[]>(Array(NUM_REELS).fill(null));
  const spinningContainerRef = useRef<HTMLDivElement>(null);

  /* Staged chips are the bet per line; the engine is wagered betPerLine * lines */
  const betPerLine = sum(stagedChips);
  const totalBet = betPerLine * lines;
  const controlsLocked = isSpinning || isAutoSpinning || isBonusSequence;
  const canSpin = betPerLine > 0 && totalBet <= balance && !controlsLocked;

  const addChip = (value: number) => {
    if ((betPerLine + value) * lines <= balance) setStagedChips((c) => [...c, value]);
  };
  const undoChip = () => setStagedChips((c) => c.slice(0, -1));
  const clearChips = () => setStagedChips([]);
  const maxBet = () => {
    const denoms = [...CHIP_VALUES].sort((a, b) => b - a);
    const chips: number[] = [];
    let remaining = Math.floor(balance / lines);
    for (const d of denoms) {
      while (remaining >= d) {
        chips.push(d);
        remaining -= d;
      }
    }
    setStagedChips(chips);
  };

  // Measure actual rendered window size to derive item height/width
  useLayoutEffect(() => {
    if (!windowRef.current) return;
    const measuredHeight = Math.floor(windowRef.current.clientHeight / NUM_ROWS);
    if (measuredHeight > 0) setItemHeight(measuredHeight);
    const measuredWidth = Math.floor(windowRef.current.clientWidth / NUM_REELS);
    if (measuredWidth > 0) setColumnWidth(measuredWidth);
  }, [isSmallScreen]);

  // Initialize reels once item height is known
  useEffect(() => {
    colRefs.current.forEach((col, i) => {
      if (!col) return;
      col.innerHTML = '';
      const count = 40 + i * 3;
      const first3: HTMLElement[] = [];

      for (let x = 0; x < count; x++) {
        const icon = getRandomIcon();
        const cell = document.createElement('div');
        cell.className = 'slot-icon';
        const img = document.createElement('img');
        img.src = `/${icon}.png`;
        img.alt = icon;
        cell.appendChild(img);
        col.appendChild(cell);
        if (x < 3) first3.push(cell);
      }

      first3.forEach((cell) => col.appendChild(cell.cloneNode(true)));
    });
  }, [itemHeight]);

  /* grid is the engine's actual [row][col] result for this spin — null while
     still spinning cosmetically, so the reels show random icons until the
     real result is known. */
  const setResult = useCallback((grid: string[][] | null) => {
    colRefs.current.forEach((col, colIdx) => {
      if (!col) return;
      const results = grid
        ? [iconFor(grid[0][colIdx]), iconFor(grid[1][colIdx]), iconFor(grid[2][colIdx])]
        : [getRandomIcon(), getRandomIcon(), getRandomIcon()];
      const imgs = col.querySelectorAll<HTMLImageElement>('.slot-icon img');
      if (imgs.length < 6) return;
      for (let x = 0; x < 3; x++) {
        const icon = results[x];
        imgs[x].src = `/${icon}.png`;
        imgs[x].alt = icon;
        imgs[imgs.length - 3 + x].src = `/${icon}.png`;
        imgs[imgs.length - 3 + x].alt = icon;
      }
    });
  }, []);

  const runSpinAnimation = useCallback((
    grid: string[][] | null,
    payout: number,
    lineWins: WinningLine[],
    scatter: ScatterWin | null,
    spinDuration: number = BASE_SPINNING_DURATION,
  ) => {
    return new Promise<void>((resolve) => {
      setIsSpinning(true);
      spinningContainerRef.current?.classList.add('spinning');

      let maxDelay = 0;
      let duration = spinDuration + randomDuration();
      colRefs.current.forEach((col, i) => {
        if (!col) return;
        const animDelay = i * 0.35;
        maxDelay = Math.max(maxDelay, animDelay);
        duration += COLUMN_SPINNING_DURATION + randomDuration();
        col.style.animationDuration = `${duration}s`;
        col.style.animationDelay = `${animDelay}s`;
      });

      const setResultTime = (spinDuration * 1000) / 2 + maxDelay * 1000;
      setTimeout(() => setResult(grid), setResultTime);

      const totalAnimTime = duration * 1000 + maxDelay * 1000 + NUM_REELS * 10;
      setTimeout(() => {
        spinningContainerRef.current?.classList.remove('spinning');
        setIsSpinning(false);
        setResultMessage(payout > 0 ? `You win $${payout.toLocaleString()}` : 'No win this spin');
        resolve();
      }, totalAnimTime);
      setTimeout(() => {
        setWinningLines(lineWins);
        setScatterWin(scatter);
      }, totalAnimTime + 100);
    });
  }, [setResult]);

  /* Spins once for the given bet/lines and reports whether it succeeded, so
     auto spin knows whether to keep going. If the base spin triggers the
     bonus, this plays out every awarded free spin in sequence — the engine
     already resolved the whole round server-side, so this is purely replay/
     reveal pacing over the timeline it returned. */
  const spinOnce = useCallback(async (bet: number, lineCount: number): Promise<boolean> => {
    setError(null);
    setResultMessage(null);
    setWinningLines([]);
    setScatterWin(null);
    setFreeSpinProgress(null);
    setIsSpinning(true);
    try {
      const response = await apiCall<GameResponse>('POST', '/games', {
        game_type: 'slots',
        bet_amount: String(bet),
        lines: lineCount,
      });
      const payout = Number(response.winnings);
      const timeline = response.slots?.timeline ?? [];
      const baseStep = timeline[0];
      const grid = baseStep?.grid ?? response.slots?.grid ?? null;
      const lineWins = grid ? evaluateWinningLines(grid, lineCount) : [];
      const scatter = grid ? evaluateScatterWin(grid) : null;
      balanceRef.current = balanceRef.current - bet * lineCount + payout;
      await runSpinAnimation(grid, baseStep?.step_win ?? payout, lineWins, scatter);

      const freeSteps = timeline.slice(1);
      if (response.slots?.bonus_triggered && freeSteps.length > 0) {
        setIsBonusSequence(true);
        setFreeSpinAnnounce(freeSteps.length);
        await delay(FREE_SPIN_BANNER_MS);
        setFreeSpinAnnounce(null);

        for (const step of freeSteps) {
          setFreeSpinProgress({
            index: step.step - 1,
            total: freeSteps.length,
            multiplier: step.multiplier,
            accumulated: step.accumulated_free_win,
          });
          const stepLineWins = evaluateWinningLines(step.grid, lineCount)
            .map((w) => ({ ...w, multiplier: w.multiplier * step.multiplier }));
          const stepScatter = evaluateScatterWin(step.grid);
          // Real retriggers aren't supported engine-side during free spins —
          // suppress the "Free Spins!" tag here so it doesn't look like one.
          const stepScatterWin = stepScatter ? { ...stepScatter, multiplier: stepScatter.multiplier * step.multiplier, bonusTriggered: false } : null;
          await runSpinAnimation(step.grid, step.step_win, stepLineWins, stepScatterWin, FREE_SPIN_SPINNING_DURATION);
          await delay(FREE_SPIN_STEP_PAUSE_MS);
        }

        setFreeSpinProgress(null);
        setIsBonusSequence(false);
        setResultMessage(`Free Spins complete — total win $${payout.toLocaleString()}`);
      }

      getAccount().catch(() => {});
      return true;
    } catch (err) {
      setIsSpinning(false);
      setIsBonusSequence(false);
      setError(err instanceof ApiError ? err.message : 'Spin failed');
      return false;
    }
  }, [runSpinAnimation, getAccount]);

  const spin = useCallback(() => {
    if (!canSpin) return;
    spinOnce(betPerLine, lines);
  }, [canSpin, betPerLine, lines, spinOnce]);

  const stopAutoSpin = useCallback(() => {
    autoSpinRef.current = false;
    setIsAutoSpinning(false);
  }, []);

  const startAutoSpin = useCallback(async () => {
    if (!canSpin || isAutoSpinning) return;
    autoSpinRef.current = true;
    setIsAutoSpinning(true);
    while (autoSpinRef.current) {
      const bet = betPerLine * lines;
      if (bet <= 0 || bet > balanceRef.current) break;
      const ok = await spinOnce(betPerLine, lines);
      if (!ok) break;
      // spinOnce clears the result message as soon as the next spin starts —
      // without this pause the win/lose message from this spin would never
      // actually get painted before being wiped by the next one.
      if (autoSpinRef.current) await delay(RESULT_PAUSE_MS);
    }
    autoSpinRef.current = false;
    setIsAutoSpinning(false);
  }, [canSpin, isAutoSpinning, betPerLine, lines, spinOnce]);

  const ghostButton = 'px-3 py-2 rounded-lg border border-[rgba(212,175,55,0.12)] text-[var(--text-3)] text-[9px] font-semibold uppercase tracking-[0.12em] hover:border-[rgba(212,175,55,0.3)] hover:text-[var(--text-2)] transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed';

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
        <style>{`
        .slot-col {
          padding: 0 10px;
          transform: translateY(calc(-100% + ${itemHeight * NUM_ROWS}px));
          will-change: transform;
        }
        .slot-icon {
          width: 100%;
          height: ${itemHeight}px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .slot-icon img {
          width: 80%;
          height: ${itemHeight * 0.75}px;
          object-fit: contain;
          position: relative;
          z-index: 3;
        }
        .slot-icon::after {
          content: "";
          display: block;
          position: absolute;
          top: 50%;
          left: 50%;
          width: 1px;
          height: 1px;
          background-color: white;
          box-shadow: 0 0 30px 22px rgba(0, 0, 0, 0.45);
          z-index: 2;
          border-radius: 100%;
        }
        .spinning .slot-col {
          animation-name: slot-scroll;
          animation-iteration-count: 1;
          animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .winner-cell {
          animation: winner-pulse 1.1s ease-in-out infinite;
        }
        @keyframes winner-pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
        @keyframes slot-scroll {
          to { transform: translateY(0); }
        }
        @keyframes freespin-pop {
          0% { opacity: 0; transform: scale(0.8); }
          60% { opacity: 1; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
        <GameTopBar title="Lucky Seven" subtitle={`3-Reel · ${lines} Lines`} balance={balance} />

        {/* ── Felt stage ── */}
        <div
          className="flex-1 relative flex flex-col justify-center gap-3 p-4 overflow-hidden min-h-0"
          style={{
            background:
              'radial-gradient(ellipse 140% 110% at 50% -8%, #1b4535 0%, #102a1f 42%, #081a12 72%, #040e09 100%)',
          }}
        >
          {/* Pinstripe inset border */}
          <div className="absolute inset-3 rounded-xl border border-[rgba(212,175,55,0.1)] pointer-events-none" />

          {/* Paytable / rules */}
          <InfoTriggerButton onClick={() => setShowPaytable(true)} />

          {/* Machine title */}
          <div className="relative z-10 text-center">
            <p
              className="uppercase tracking-[0.35em] text-[rgba(212,175,55,0.75)]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 13 }}
            >
              ◆ Lucky Seven ◆
            </p>
            <p className="text-[9px] uppercase tracking-[0.2em] text-[rgba(212,175,55,0.35)] mt-0.5">
              3 Reels · {lines} Lines
            </p>
          </div>

          {/* Free spin progress HUD — visible for the whole bonus round */}
          {freeSpinProgress && (
            <div className="relative z-10 flex items-center justify-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-1 rounded-full text-[9px] font-semibold uppercase tracking-[0.12em] border border-[var(--gold)] text-[var(--gold)] bg-[rgba(212,175,55,0.1)]">
                Free Spin {freeSpinProgress.index}/{freeSpinProgress.total}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[9px] font-semibold uppercase tracking-[0.12em] border border-[rgba(212,175,55,0.3)] text-[var(--text-2)]">
                {freeSpinProgress.multiplier}× Multiplier
              </span>
              <span className="px-2.5 py-1 rounded-full text-[9px] font-semibold uppercase tracking-[0.12em] border border-[rgba(212,175,55,0.3)] text-[var(--text-2)]">
                Won ${freeSpinProgress.accumulated.toLocaleString()}
              </span>
            </div>
          )}

          {/* Reel window — gold-gradient border frame */}
          <div
            className="relative z-10 rounded-[10px] p-px"
            style={{
              background:
                'linear-gradient(to bottom, rgba(212,175,55,0.22), rgba(212,175,55,0.05) 50%, rgba(212,175,55,0.15))',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}
          >
            <div ref={spinningContainerRef}>
              <div
                ref={windowRef}
                className="relative overflow-hidden rounded-[9px]"
                style={{
                  background: 'rgba(0,0,0,0.55)',
                  height: 'clamp(180px, 38dvh, 360px)',
                  boxShadow: 'inset 0 0 60px rgba(0,0,0,0.7)',
                }}
              >
                {/* Top-third dim */}
                <div
                  className="absolute top-0 left-0 w-full z-10 pointer-events-none"
                  style={{
                    height: '33.33%',
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.72), rgba(0,0,0,0.35))',
                  }}
                />
                {/* Bottom-third dim */}
                <div
                  className="absolute bottom-0 left-0 w-full z-10 pointer-events-none"
                  style={{
                    height: '33.33%',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0.35))',
                  }}
                />
                {/* Payline bracket */}
                <div
                  className="absolute left-0 right-0 z-10 pointer-events-none"
                  style={{
                    top: '33.33%',
                    height: '33.33%',
                    borderTop: '1px solid rgba(212,175,55,0.2)',
                    borderBottom: '1px solid rgba(212,175,55,0.2)',
                  }}
                />

                {/* Reels */}
                <div className="flex h-full">
                  {Array.from({ length: NUM_REELS }, (_, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && (
                        <div className="w-px flex-shrink-0 self-stretch bg-[rgba(255,255,255,0.04)]" />
                      )}
                      <div
                        className="flex-1 overflow-hidden"
                        style={{
                          background:
                            'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, transparent 50%, rgba(0,0,0,0.18) 100%)',
                        }}
                      >
                        <div
                          ref={(el) => { colRefs.current[i] = el; }}
                          className="slot-col"
                        />
                      </div>
                    </React.Fragment>
                  ))}
                </div>

                {/* Winning line overlay — cell glows + connecting lines, one color per line */}
                {!isSpinning && (winningLines.length > 0 || scatterWin) && (
                  <>
                    {Array.from(
                      (() => {
                        const highlighted = new Map<string, string>();
                        winningLines.forEach((win) => {
                          const color = LINE_COLORS[win.lineIndex % LINE_COLORS.length];
                          win.cells.forEach(([row, col]) => highlighted.set(`${row}-${col}`, color));
                        });
                        scatterWin?.cells.forEach(([row, col]) => {
                          if (!highlighted.has(`${row}-${col}`)) highlighted.set(`${row}-${col}`, 'var(--gold)');
                        });
                        return highlighted.entries();
                      })(),
                    ).map(([key, color]) => {
                      const [row, col] = key.split('-').map(Number);
                      return (
                        <div
                          key={key}
                          className="absolute z-[15] pointer-events-none rounded-md winner-cell"
                          style={{
                            left: col * columnWidth,
                            top: row * itemHeight,
                            width: columnWidth,
                            height: itemHeight,
                            boxShadow: `inset 0 0 0 2px ${color}, 0 0 14px ${color}`,
                          }}
                        />
                      );
                    })}
                    <svg
                      className="absolute inset-0 z-20 pointer-events-none"
                      width={columnWidth * NUM_REELS}
                      height={itemHeight * NUM_ROWS}
                      viewBox={`0 0 ${columnWidth * NUM_REELS} ${itemHeight * NUM_ROWS}`}
                    >
                      {winningLines.map((win) => {
                        const color = LINE_COLORS[win.lineIndex % LINE_COLORS.length];
                        const points = win.cells
                          .map(([row, col]) => `${col * columnWidth + columnWidth / 2},${row * itemHeight + itemHeight / 2}`)
                          .join(' ');
                        return (
                          <polyline
                            key={win.lineIndex}
                            points={points}
                            fill="none"
                            stroke={color}
                            strokeWidth={3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                          />
                        );
                      })}
                      {scatterWin?.cells.map(([row, col], i) => (
                        <circle
                          key={i}
                          cx={col * columnWidth + columnWidth / 2}
                          cy={row * itemHeight + itemHeight / 2}
                          r={Math.min(columnWidth, itemHeight) * 0.42}
                          fill="none"
                          stroke="var(--gold)"
                          strokeWidth={3}
                          style={{ filter: 'drop-shadow(0 0 5px var(--gold))' }}
                        />
                      ))}
                    </svg>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Line count — the engine only supports these exact counts */}
          <div className="relative z-10 flex gap-2 justify-center">
            {LINE_OPTIONS.map((value) => (
              <button
                key={value}
                onClick={() => !controlsLocked && setLines(value)}
                disabled={controlsLocked}
                aria-label={`Play ${value} line${value > 1 ? 's' : ''}`}
                className={`px-3.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.12em] transition-all duration-150 cursor-pointer disabled:cursor-not-allowed ${
                  value === lines
                    ? 'text-[var(--gold)] border border-[rgba(212,175,55,0.6)] bg-[rgba(212,175,55,0.15)] shadow-[0_0_6px_rgba(212,175,55,0.25)]'
                    : 'text-[var(--text-3)] border border-[rgba(212,175,55,0.14)] hover:border-[rgba(212,175,55,0.4)] hover:text-[var(--text-2)]'
                }`}
              >
                {value} {value === 1 ? 'Line' : 'Lines'}
              </button>
            ))}
          </div>

          {/* Result message — its own row so it never reflows the console below */}
          <div className="relative z-10 h-4 flex items-center justify-center">
            {(resultMessage || error) && (
              <span className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${error ? 'text-[#e8a5ae]' : 'text-[var(--gold)]'}`}>
                {error ?? resultMessage}
              </span>
            )}
          </div>

          {/* Winning line breakdown */}
          {!isSpinning && (winningLines.length > 0 || scatterWin) && (
            <div className="relative z-10 flex flex-wrap gap-1.5 justify-center max-w-md mx-auto">
              {winningLines.map((win) => {
                const color = LINE_COLORS[win.lineIndex % LINE_COLORS.length];
                const symbolLabel = SYMBOLS.find((s) => s.id === win.symbol)?.label ?? win.symbol;
                const amount = Math.floor(win.multiplier * betPerLine);
                return (
                  <span
                    key={win.lineIndex}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-[0.08em] border"
                    style={{ borderColor: color, color }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                    Line {win.lineIndex + 1} · {symbolLabel} ×{win.count} · +${amount.toLocaleString()}
                  </span>
                );
              })}
              {scatterWin && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-[0.08em] border border-[var(--gold)] text-[var(--gold)]">
                  ◆ Scatter ×{scatterWin.count} · +${Math.floor(scatterWin.multiplier * lines * betPerLine).toLocaleString()}
                  {scatterWin.bonusTriggered ? ' · Free Spins!' : ''}
                </span>
              )}
            </div>
          )}

          {/* Free spins awarded — on-screen notification over the felt stage */}
          {freeSpinAnnounce != null && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60">
              <div className="text-center" style={{ animation: 'freespin-pop 0.4s ease-out' }}>
                <p
                  className="uppercase tracking-[0.4em] text-[var(--gold)]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22 }}
                >
                  Free Spins Awarded
                </p>
                <p className="font-serif text-[var(--gold)]" style={{ fontSize: 52, lineHeight: 1.1 }}>
                  ×{freeSpinAnnounce}
                </p>
              </div>
            </div>
          )}
        </div>

        {showPaytable && <SlotPaytableModal onClose={() => setShowPaytable(false)} />}

        {/* ── Bottom console ── */}
        <div className="shrink-0 border-t border-[rgba(212,175,55,0.12)] bg-[var(--surface)] px-5 py-4 flex items-center gap-5">

          {/* Bet circle */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div
              className="relative w-[5.75rem] h-[5.75rem] rounded-full border-2 border-dashed border-[rgba(212,175,55,0.35)]"
              style={{ background: 'rgba(0,0,0,0.18)' }}
            >
              {stagedChips.length === 0 ? (
                <span className="absolute inset-0 flex items-center justify-center text-[9px] tracking-[0.25em] text-[rgba(212,175,55,0.45)] uppercase">
                  Bet/Line
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
            {betPerLine > 0 && (
              <span className="font-serif text-lg text-[var(--gold)]">${totalBet.toLocaleString()}</span>
            )}
          </div>

          {/* Chips */}
          <div className="flex items-end gap-2.5">
            {CHIP_VALUES.map((value) => (
              <Chip
                key={value}
                value={value}
                onClick={() => addChip(value)}
                disabled={controlsLocked || (betPerLine + value) * lines > balance}
              />
            ))}
          </div>

          {/* Undo / Clear / Max */}
          <div className="flex items-center gap-2">
            <button onClick={undoChip} disabled={stagedChips.length === 0 || controlsLocked} className={ghostButton}>Undo</button>
            <button onClick={clearChips} disabled={stagedChips.length === 0 || controlsLocked} className={ghostButton}>Clear</button>
            <button onClick={maxBet} disabled={balance === 0 || controlsLocked} className={ghostButton}>Max</button>
          </div>

          {/* Auto spin */}
          <button
            onClick={isAutoSpinning ? stopAutoSpin : startAutoSpin}
            disabled={!isAutoSpinning && !canSpin}
            className={`px-6 py-3.5 rounded-xl font-semibold text-sm tracking-[0.18em] uppercase transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-35 ${
              isAutoSpinning
                ? 'text-[#f6e3e6] bg-[var(--red)] hover:bg-[#a12e40]'
                : 'text-[var(--text-2)] border border-[rgba(212,175,55,0.3)] hover:border-[rgba(212,175,55,0.6)] hover:text-[var(--gold)]'
            }`}
          >
            {isAutoSpinning ? 'Stop' : 'Auto Spin'}
          </button>

          {/* Spin */}
          <button
            disabled={!canSpin}
            onClick={spin}
            className={`ml-auto px-12 py-3.5 rounded-xl font-semibold text-base tracking-[0.22em] uppercase transition-all duration-150 cursor-pointer ${
              canSpin
                ? 'bg-[var(--gold)] text-[#0a0e12] hover:opacity-90 active:scale-[0.98] shadow-[0_2px_24px_rgba(212,175,55,0.3)]'
                : 'bg-[var(--surface-2)] text-[var(--text-3)] border border-[rgba(212,175,55,0.08)] cursor-not-allowed'
            }`}
            aria-label="Spin the reels"
          >
            {isAutoSpinning ? 'Auto…' : (isSpinning || isBonusSequence) ? 'Spinning…' : 'Spin'}
          </button>

        </div>
        </>
        )}
      </div>
  );
};

export default SlotMachine;
