import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import GameTopBar from '@/components/games/GameTopBar';
import Chip, { CHIP_VALUES } from '@/components/games/Chip';
import UnsupportedScreenSize from '@/components/games/UnsupportedScreenSize';
import { useAccount } from '@/hooks/useAccount';

const ICONS = [
  'apple', 'apricot', 'banana', 'big_win', 'cherry', 'grapes',
  'lemon', 'lucky_seven', 'orange', 'pear', 'strawberry', 'watermelon',
];

const BASE_SPINNING_DURATION = 2.7;
const COLUMN_SPINNING_DURATION = 0.3;
const NUM_REELS = 5;

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

function getRandomIcon() {
  return ICONS[Math.floor(Math.random() * ICONS.length)];
}

function randomDuration() {
  return Math.floor(Math.random() * 10) / 100;
}

const SlotMachine: React.FC = () => {
  const { account, getAccount } = useAccount(false);
  useEffect(() => { getAccount().catch(() => {}); }, [getAccount]);
  const balance = account ? Math.floor(Number(account.balance)) : 0;

  const [isSmallScreen, setIsSmallScreen] = useState(() => window.innerWidth < 768);
  const [stagedChips, setStagedChips] = useState<number[]>([]);
  const [lines, setLines] = useState(9);
  const [isSpinning, setIsSpinning] = useState(false);
  const [itemHeight, setItemHeight] = useState(100);

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 768);
      if (windowRef.current) {
        const measured = Math.floor(windowRef.current.clientHeight / 3);
        if (measured > 0) setItemHeight(measured);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const windowRef = useRef<HTMLDivElement>(null);
  const colRefs = useRef<(HTMLDivElement | null)[]>(Array(NUM_REELS).fill(null));
  const spinningContainerRef = useRef<HTMLDivElement>(null);

  const bet = sum(stagedChips);
  const canSpin = bet > 0 && bet <= balance && !isSpinning;

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

  // Measure actual rendered window height to derive item height
  useLayoutEffect(() => {
    if (!windowRef.current) return;
    const measured = Math.floor(windowRef.current.clientHeight / 3);
    if (measured > 0) setItemHeight(measured);
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

  const setResult = useCallback(() => {
    colRefs.current.forEach((col) => {
      if (!col) return;
      const results = [getRandomIcon(), getRandomIcon(), getRandomIcon()];
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

  const spin = useCallback(() => {
    if (!canSpin) return;
    setIsSpinning(true);
    spinningContainerRef.current?.classList.add('spinning');

    let duration = BASE_SPINNING_DURATION + randomDuration();
    colRefs.current.forEach((col, i) => {
      if (!col) return;
      duration += COLUMN_SPINNING_DURATION + randomDuration();
      col.style.animationDuration = `${duration}s`;
      col.style.animationDelay = `${i * 0.01}s`;
    });

    setTimeout(setResult, (BASE_SPINNING_DURATION * 1000) / 2);

    setTimeout(() => {
      spinningContainerRef.current?.classList.remove('spinning');
      setIsSpinning(false);
    }, duration * 1000 + NUM_REELS * 10);
  }, [canSpin, setResult]);

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
          transform: translateY(calc(-100% + ${itemHeight * 3}px));
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
          animation-timing-function: cubic-bezier(.65, .97, .72, 1);
        }
        @keyframes slot-scroll {
          to { transform: translateY(0); }
        }
      `}</style>
        <GameTopBar title="Lucky Fruits" subtitle={`5-Reel · ${lines} Lines`} balance={balance} />

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

          {/* Machine title */}
          <div className="relative z-10 text-center">
            <p
              className="uppercase tracking-[0.35em] text-[rgba(212,175,55,0.75)]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 13 }}
            >
              ◆ Lucky Fruits ◆
            </p>
            <p className="text-[9px] uppercase tracking-[0.2em] text-[rgba(212,175,55,0.35)] mt-0.5">
              5 Reels · {lines} Lines
            </p>
          </div>

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
              </div>
            </div>
          </div>

          {/* Payline pips — click pip N to play N+1 lines */}
          <div className="relative z-10 flex gap-1.5 justify-center">
            {Array.from({ length: 9 }, (_, i) => (
              <button
                key={i}
                onClick={() => !isSpinning && setLines(i + 1)}
                disabled={isSpinning}
                aria-label={`Play ${i + 1} line${i > 0 ? 's' : ''}`}
                className="flex-1 max-w-[28px] h-2 rounded-full transition-all duration-150 cursor-pointer disabled:cursor-not-allowed hover:opacity-80"
                style={{
                  background: i < lines ? 'rgba(212,175,55,0.55)' : 'rgba(212,175,55,0.14)',
                  border: `1px solid ${i < lines ? 'rgba(212,175,55,0.35)' : 'rgba(212,175,55,0.08)'}`,
                  boxShadow: i < lines ? '0 0 4px rgba(212,175,55,0.2)' : 'none',
                }}
              />
            ))}
          </div>
        </div>

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
              <span className="font-serif text-lg text-[var(--gold)]">${bet.toLocaleString()}</span>
            )}
          </div>

          {/* Chips */}
          <div className="flex items-end gap-2.5">
            {CHIP_VALUES.map((value) => (
              <Chip
                key={value}
                value={value}
                onClick={() => addChip(value)}
                disabled={isSpinning || bet + value > balance}
              />
            ))}
          </div>

          {/* Undo / Clear / Max */}
          <div className="flex items-center gap-2">
            <button onClick={undoChip} disabled={stagedChips.length === 0 || isSpinning} className={ghostButton}>Undo</button>
            <button onClick={clearChips} disabled={stagedChips.length === 0 || isSpinning} className={ghostButton}>Clear</button>
            <button onClick={maxBet} disabled={balance === 0 || isSpinning} className={ghostButton}>Max</button>
          </div>

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
            {isSpinning ? 'Spinning…' : 'Spin'}
          </button>

        </div>
        </>
        )}
      </div>
  );
};

export default SlotMachine;
