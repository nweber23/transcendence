import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import GameTopBar from '@/components/games/GameTopBar';
import Chip, { CHIP_VALUES } from '@/components/games/Chip';
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

  const [stagedChips, setStagedChips] = useState<number[]>([]);
  const [lines, setLines] = useState(9);
  const [isSpinning, setIsSpinning] = useState(false);
  const [itemHeight, setItemHeight] = useState(100);

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
    const denoms = [...CHIP_VALUES].slice().sort((a, b) => b - a);
    const chips: number[] = [];
    let remaining = balance;
    for (const d of denoms) {
      while (remaining >= d && chips.length < 30) {
        chips.push(d);
        remaining -= d;
      }
    }
    if (remaining > 0) chips.push(remaining);
    setStagedChips(chips);
  };

  // Measure actual rendered window height to derive item height
  useLayoutEffect(() => {
    if (!windowRef.current) return;
    const measured = Math.floor(windowRef.current.clientHeight / 3);
    if (measured > 0) setItemHeight(measured);
  }, []);

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

  return (
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

      {/* mt-[4.75rem] clears the floating global Header pill */}
      <div
        className="mt-[4.75rem] flex flex-col bg-[var(--base)]"
        style={{ height: 'calc(100dvh - 4.75rem)' }}
      >
        <GameTopBar title="Lucky Fruits" subtitle="5-Reel · 9 Lines" balance={balance} />

        {/* ── Main area ── */}
        <div className="flex-1 flex min-h-0">

          {/* ── Left: Felt stage ── */}
          <div
            className="flex-1 relative flex flex-col justify-center gap-3 p-4 overflow-hidden"
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
                5 Reels · 9 Lines
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
                  {/* Top-third dim — fades from black at edge to 35% opacity at the payline bracket */}
                  <div
                    className="absolute top-0 left-0 w-full z-10 pointer-events-none"
                    style={{
                      height: '33.33%',
                      background: 'linear-gradient(to bottom, rgba(0,0,0,0.72), rgba(0,0,0,0.35))',
                    }}
                  />
                  {/* Bottom-third dim — mirror of top */}
                  <div
                    className="absolute bottom-0 left-0 w-full z-10 pointer-events-none"
                    style={{
                      height: '33.33%',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0.35))',
                    }}
                  />
                  {/* Payline bracket — brackets the middle third */}
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

            {/* Payline pips (9 lines) */}
            <div className="relative z-10 flex gap-1.5 justify-center">
              {Array.from({ length: 9 }, (_, i) => (
                <div
                  key={i}
                  className="flex-1 max-w-[28px] h-1 rounded-full transition-colors duration-150"
                  style={{
                    background: i < lines ? 'rgba(212,175,55,0.5)' : 'rgba(212,175,55,0.14)',
                    border: `1px solid ${i < lines ? 'rgba(212,175,55,0.3)' : 'rgba(212,175,55,0.08)'}`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* ── Right: Control sidebar ── */}
          <div className="w-[176px] flex-shrink-0 border-l border-[rgba(212,175,55,0.1)] bg-[var(--surface)] flex flex-col gap-4 p-3">

            {/* Chip grid */}
            <div>
              <p className="text-[7px] uppercase tracking-[0.2em] text-[var(--text-3)] mb-2">Chips</p>
              <div className="flex gap-1.5 justify-between">
                {CHIP_VALUES.map((value) => (
                  <Chip
                    key={value}
                    value={value}
                    size={28}
                    onClick={() => addChip(value)}
                    disabled={isSpinning || bet + value > balance}
                  />
                ))}
              </div>
            </div>

            {/* Bet circle */}
            <div className="flex flex-col items-center gap-1">
              <div
                className="relative w-16 h-16 rounded-full border-2 border-dashed border-[rgba(212,175,55,0.3)]"
                style={{ background: 'rgba(0,0,0,0.25)' }}
              >
                {stagedChips.length === 0 ? (
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] tracking-[0.15em] text-[rgba(212,175,55,0.4)] uppercase">
                    Bet
                  </span>
                ) : (
                  <div
                    className="absolute left-1/2 -translate-x-1/2"
                    style={{ width: 38, height: 38, bottom: 12 }}
                  >
                    {stagedChips.slice(-6).map((value, i) => (
                      <div key={i} className="absolute left-0 chip-pop" style={{ bottom: i * 5 }}>
                        <Chip value={value} size={38} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {bet > 0 && (
                <span className="font-serif text-base text-[var(--gold)]">${bet.toLocaleString()}</span>
              )}
            </div>

            {/* Undo / Clear / Max */}
            <div className="flex gap-1">
              {[
                { label: 'Undo', action: undoChip, disabled: stagedChips.length === 0 },
                { label: 'Clear', action: clearChips, disabled: stagedChips.length === 0 },
                { label: 'Max', action: maxBet, disabled: balance === 0 },
              ].map(({ label, action, disabled }) => (
                <button
                  key={label}
                  onClick={action}
                  disabled={disabled || isSpinning}
                  className="flex-1 py-1.5 rounded-md border border-[rgba(212,175,55,0.12)] text-[var(--text-3)] text-[7px] font-semibold uppercase tracking-[0.1em] hover:border-[rgba(212,175,55,0.3)] hover:text-[var(--text-2)] transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Lines selector */}
            <div>
              <p className="text-[7px] uppercase tracking-[0.2em] text-[var(--text-3)] mb-1.5">Lines</p>
              <div className="flex items-center bg-[var(--surface-2)] border border-[rgba(212,175,55,0.1)] rounded-lg px-3 py-2 gap-2">
                <span className="flex-1 font-serif text-base text-[var(--gold)]">{lines}</span>
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => setLines((l) => Math.min(l + 1, 9))}
                    disabled={lines === 9 || isSpinning}
                    className="w-4 h-4 flex items-center justify-center text-[rgba(212,175,55,0.5)] hover:text-[var(--gold)] text-[9px] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Increase lines"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => setLines((l) => Math.max(l - 1, 1))}
                    disabled={lines === 1 || isSpinning}
                    className="w-4 h-4 flex items-center justify-center text-[rgba(212,175,55,0.5)] hover:text-[var(--gold)] text-[9px] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Decrease lines"
                  >
                    ▼
                  </button>
                </div>
              </div>
            </div>

            {/* Spin */}
            <button
              disabled={!canSpin}
              onClick={spin}
              className={`mt-auto w-full py-3 rounded-xl font-semibold text-sm tracking-[0.22em] uppercase transition-all duration-150 cursor-pointer ${
                canSpin
                  ? 'bg-[var(--gold)] text-[#0a0e12] hover:opacity-90 active:scale-[0.98] shadow-[0_2px_16px_rgba(212,175,55,0.25)]'
                  : 'bg-[var(--surface-2)] text-[var(--text-3)] border border-[rgba(212,175,55,0.08)] cursor-not-allowed'
              }`}
              aria-label="Spin the reels"
            >
              {isSpinning ? 'Spinning…' : 'Spin'}
            </button>

          </div>

        </div>
      </div>
    </>
  );
};

export default SlotMachine;
