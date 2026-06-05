import React, { useState, useRef, useEffect, useCallback } from 'react';

const ICONS = [
  'apple', 'apricot', 'banana', 'big_win', 'cherry', 'grapes',
  'lemon', 'lucky_seven', 'orange', 'pear', 'strawberry', 'watermelon',
];

const BASE_SPINNING_DURATION = 2.7;
const COLUMN_SPINNING_DURATION = 0.3;
const ITEM_HEIGHT = 100;
const NUM_REELS = 5;

function getRandomIcon() {
  return ICONS[Math.floor(Math.random() * ICONS.length)];
}

function randomDuration() {
  return Math.floor(Math.random() * 10) / 100;
}

const SlotMachine: React.FC = () => {
  const balance = 10_000;
  const [bet, setBet] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  const colRefs = useRef<(HTMLDivElement | null)[]>(Array(NUM_REELS).fill(null));
  const spinningContainerRef = useRef<HTMLDivElement>(null);

  const addBet = (n: number) => setBet((b) => Math.min(b + n, balance));
  const subBet = (n: number) => setBet((b) => Math.max(b - n, 0));
  const canSpin = bet > 0 && bet <= balance && !isSpinning;

  useEffect(() => {
    colRefs.current.forEach((col, i) => {
      if (!col) return;
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
  }, []);

  const setResult = useCallback(() => {
    colRefs.current.forEach((col) => {
      if (!col) return;
      const results = [getRandomIcon(), getRandomIcon(), getRandomIcon()];
      const imgs = col.querySelectorAll<HTMLImageElement>('.slot-icon img');
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
          transform: translateY(calc(-100% + ${ITEM_HEIGHT * 3}px));
          will-change: transform;
        }
        .slot-icon {
          width: 80px;
          height: ${ITEM_HEIGHT}px;
          display: block;
          position: relative;
        }
        .slot-icon img {
          width: 100%;
          height: auto;
          margin: 10px 0;
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
          box-shadow: 0 0 30px 24px rgba(0, 0, 0, 0.5);
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

      <div className="flex flex-col h-[calc(100dvh-4rem)] overflow-hidden bg-[var(--base)]">

        {/* ── Machine ─────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 min-h-0">
          <div className="relative w-full max-w-2xl">

            {/* Top rail */}
            <div className="h-px bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-50 mb-1" />

            {/* Cabinet body */}
            <div className="bg-gradient-to-b from-[var(--surface-2)] to-[var(--surface-3)] rounded-2xl border border-[rgba(212,175,55,0.15)] p-5">

              <p className="text-center text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--gold)] opacity-70 mb-4">
                Lucky Fruits
              </p>

              {/* Window border */}
              <div
                className="rounded-xl p-1"
                style={{
                  background: 'linear-gradient(to bottom, rgba(212,175,55,0.35), rgba(212,175,55,0.08) 50%, rgba(212,175,55,0.2))',
                }}
              >
                {/* Spinning container — class "spinning" drives CSS animation */}
                <div ref={spinningContainerRef}>
                  {/* Window */}
                  <div
                    className="relative overflow-hidden rounded-lg bg-[var(--base)]"
                    style={{ height: `${ITEM_HEIGHT * 3}px` }}
                  >
                    {/* Top fade */}
                    <div
                      className="absolute top-0 left-0 w-full z-10 pointer-events-none"
                      style={{ height: 8, background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)' }}
                    />
                    {/* Bottom fade */}
                    <div
                      className="absolute bottom-0 left-0 w-full z-10 pointer-events-none"
                      style={{ height: 8, background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }}
                    />
                    {/* Centre payline */}
                    <div className="absolute inset-y-0 left-0 right-0 flex items-center pointer-events-none z-10">
                      <div className="w-full h-px bg-gradient-to-r from-transparent via-[rgba(212,175,55,0.25)] to-transparent" />
                    </div>

                    {/* Reels row */}
                    <div className="flex h-full">
                      {Array.from({ length: NUM_REELS }, (_, i) => (
                        <React.Fragment key={i}>
                          {/* Divider */}
                          {i > 0 && (
                            <div className="w-px flex-shrink-0 bg-[var(--border-2)] self-stretch" />
                          )}
                          {/* Reel column */}
                          <div
                            className="flex-1 overflow-hidden"
                            style={{ background: 'linear-gradient(180deg, var(--surface-3) 0%, var(--surface-2) 50%, var(--surface-3) 100%)' }}
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
            </div>

            {/* Bottom rail */}
            <div className="h-px bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-30 mt-1" />

            <div className="glow-gold absolute -inset-8 -z-10 pointer-events-none" />
          </div>
        </div>

        {/* ── Controls panel ──────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-[rgba(212,175,55,0.1)] bg-[var(--surface)] px-5 pt-4 pb-5 space-y-3">

          {/* Quick add */}
          <div className="flex gap-2">
            {[10, 50, 100, 500].map((n) => (
              <button
                key={n}
                onClick={() => addBet(n)}
                disabled={isSpinning}
                className="flex-1 py-3.5 rounded-lg border border-[rgba(212,175,55,0.12)] text-[var(--text-2)] text-sm font-semibold hover:border-[var(--gold)] hover:text-[var(--gold)] transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                +{n}
              </button>
            ))}
          </div>

          {/* Quick subtract */}
          <div className="flex gap-2">
            {[10, 50, 100, 500].map((n) => (
              <button
                key={n}
                onClick={() => subBet(n)}
                disabled={isSpinning}
                className="flex-1 py-3.5 rounded-lg border border-[rgba(212,175,55,0.08)] text-[var(--text-3)] text-sm font-semibold hover:border-red-500/40 hover:text-red-400 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
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
                disabled={isSpinning}
                onChange={(e) => setBet(Math.max(0, Math.min(parseInt(e.target.value) || 0, balance)))}
                className="flex-1 bg-transparent text-[var(--gold)] font-serif text-xl text-right focus:outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-40"
                aria-label="Bet amount"
              />
              <span className="text-[var(--text-3)] text-sm">$</span>
            </div>
            <button
              onClick={() => setBet(0)}
              disabled={isSpinning}
              className="px-4 py-3 rounded-lg border border-[rgba(212,175,55,0.1)] text-[var(--text-3)] text-sm hover:border-[rgba(212,175,55,0.25)] hover:text-[var(--text-2)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Clear
            </button>
            <button
              onClick={() => setBet(balance)}
              disabled={isSpinning}
              className="px-4 py-3 rounded-lg border border-[rgba(212,175,55,0.1)] text-[var(--text-3)] text-sm hover:border-[rgba(212,175,55,0.25)] hover:text-[var(--text-2)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Max
            </button>
          </div>

          {/* Spin button */}
          <button
            disabled={!canSpin}
            onClick={spin}
            className={`
              w-full py-5 rounded-xl font-semibold text-lg tracking-widest uppercase transition-all duration-150 cursor-pointer
              ${canSpin
                ? 'bg-[var(--gold)] text-[#0a0e12] hover:opacity-90 active:scale-[0.98] shadow-[0_2px_24px_rgba(212,175,55,0.25)]'
                : 'bg-[var(--surface-2)] text-[var(--text-3)] cursor-not-allowed border border-[rgba(212,175,55,0.08)]'
              }
            `}
            aria-label="Spin the reels"
          >
            {isSpinning ? 'Spinning…' : 'Spin'}
          </button>
        </div>
      </div>
    </>
  );
};

export default SlotMachine;
