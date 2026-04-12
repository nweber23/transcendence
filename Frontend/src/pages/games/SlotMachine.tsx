import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Symbol definitions ──────────────────────────────────────────────────────

type SymbolId = '7' | 'BAR' | 'WILD' | 'DIAMOND' | 'CLUB' | 'HEART' | 'SPADE';

interface SlotSymbol {
  id: SymbolId;
  label: string;
  color: string;
}

const SYMBOLS: SlotSymbol[] = [
  { id: '7',       label: '7',   color: 'text-red-400'           },
  { id: 'WILD',    label: 'W',   color: 'text-[var(--gold)]'     },
  { id: 'BAR',     label: 'BAR', color: 'text-[var(--text)]'     },
  { id: 'DIAMOND', label: '◆',   color: 'text-blue-400'          },
  { id: 'HEART',   label: '♥',   color: 'text-red-500'           },
  { id: 'SPADE',   label: '♠',   color: 'text-[var(--text)]'     },
  { id: 'CLUB',    label: '♣',   color: 'text-emerald-400'       },
];

// Static placeholder grid — 3 cols × 3 rows
const PLACEHOLDER_GRID: SymbolId[][] = [
  ['CLUB',    'HEART',   'SPADE'  ],
  ['BAR',     'SEVEN',   'DIAMOND'],
  ['HEART',   'WILD',    'CLUB'   ],
] as SymbolId[][];

function getSymbol(id: SymbolId): SlotSymbol {
  return SYMBOLS.find((s) => s.id === id) ?? SYMBOLS[5];
}

// ─── Component ───────────────────────────────────────────────────────────────

const SlotMachine: React.FC = () => {
  const navigate  = useNavigate();
  const balance   = 10_000; // TODO: connect to account/wallet
  const [bet, setBet] = useState(0);

  const addBet = (n: number) => setBet((b) => Math.min(b + n, balance));
  const subBet = (n: number) => setBet((b) => Math.max(b - n, 0));

  const canSpin = bet > 0 && bet <= balance;

  return (
    <>
      <style>{`
        @keyframes reel-idle {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-2px); }
        }
        .reel-idle { animation: reel-idle 3s ease-in-out infinite; }
        .reel-idle:nth-child(2) { animation-delay: 0.4s; }
        .reel-idle:nth-child(3) { animation-delay: 0.8s; }
      `}</style>

      <div className="flex flex-col h-dvh overflow-hidden bg-[var(--base)]">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="shrink-0 bg-[var(--surface)] border-b border-[rgba(212,175,55,0.1)] px-6 py-0 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-[var(--gold)] hover:text-[var(--text)] transition-colors text-sm cursor-pointer"
            aria-label="Back to home"
          >
            ← Back
          </button>
          <h1 className="font-serif text-xl font-semibold tracking-wide">Slot Machine</h1>
          <div className="text-right">
            <p className="text-[10px] text-[var(--text-3)] uppercase tracking-widest leading-none mb-0.5">Balance</p>
            <p className="font-serif text-lg text-[var(--gold)] leading-none">${balance.toLocaleString()}</p>
          </div>
        </header>

        {/* ── Machine ─────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 min-h-0">

          {/* Cabinet outer */}
          <div className="relative w-full max-w-sm">
            {/* Top decorative rail */}
            <div className="h-0.5 bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-50 mb-1 rounded-full" />

            {/* Cabinet body */}
            <div className="bg-gradient-to-b from-[var(--surface-2)] to-[var(--surface-3)] rounded-2xl border border-[rgba(212,175,55,0.15)] p-5">

              {/* Game name */}
              <p className="text-center text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--gold)] opacity-70 mb-4">
                Lucky Sevens
              </p>

              {/* Reels window */}
              <div
                className="relative rounded-xl border border-[rgba(212,175,55,0.12)] bg-[var(--base)] overflow-hidden p-3"
                role="img"
                aria-label="Slot machine reels"
              >
                {/* Payline — centre row */}
                <div className="absolute inset-y-0 left-0 right-0 flex items-center pointer-events-none z-10">
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-[rgba(212,175,55,0.4)] to-transparent" />
                </div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-gradient-to-b from-[var(--gold)] to-[rgba(212,175,55,0.4)] rounded-r-sm z-20" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-gradient-to-b from-[var(--gold)] to-[rgba(212,175,55,0.4)] rounded-l-sm z-20" />

                {/* 3 reels */}
                <div className="flex gap-2 justify-center">
                  {PLACEHOLDER_GRID.map((col, colIdx) => (
                    <div
                      key={colIdx}
                      className="reel-idle flex flex-col gap-1 w-[72px]"
                    >
                      {col.map((symId, rowIdx) => {
                        const sym = getSymbol(symId);
                        const isMiddle = rowIdx === 1;
                        return (
                          <div
                            key={rowIdx}
                            className={`
                              flex items-center justify-center h-14 rounded-lg border select-none
                              ${isMiddle
                                ? 'bg-[rgba(212,175,55,0.05)] border-[rgba(212,175,55,0.15)]'
                                : 'bg-[var(--surface-2)] border-[rgba(255,255,255,0.04)]'
                              }
                            `}
                          >
                            <span
                              className={`font-bold leading-none ${sym.color} ${
                                sym.id === 'BAR' || sym.id === 'WILD'
                                  ? 'text-xs tracking-tight'
                                  : 'text-2xl'
                              } ${isMiddle ? 'opacity-100' : 'opacity-40'}`}
                              aria-hidden="true"
                            >
                              {sym.label}
                            </span>
                            <span className="sr-only">{sym.id}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Win display row */}
              <div className="mt-3 h-6 flex items-center justify-center">
                <p className="text-[var(--text-3)] text-xs tracking-widest uppercase">
                  — Place a bet to play —
                </p>
              </div>
            </div>

            {/* Bottom rail */}
            <div className="h-0.5 bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-30 mt-1 rounded-full" />

            {/* Ambient glow */}
            <div className="glow-gold absolute -inset-8 -z-10 pointer-events-none" />
          </div>
        </div>

        {/* ── Controls panel ──────────────────────────────────────────────── */}
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

          {/* Current bet + manual input */}
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

          {/* Spin button */}
          <button
            disabled={!canSpin}
            className={`
              w-full py-5 rounded-xl font-semibold text-lg tracking-widest uppercase transition-all duration-150 cursor-pointer
              ${canSpin
                ? 'bg-[var(--gold)] text-[#0a0e12] hover:opacity-90 active:scale-[0.98] shadow-[0_2px_24px_rgba(212,175,55,0.25)]'
                : 'bg-[var(--surface-2)] text-[var(--text-3)] cursor-not-allowed border border-[rgba(212,175,55,0.08)]'
              }
            `}
            aria-label="Spin the reels"
          >
            {/* TODO: wire up to game engine */}
            Spin
          </button>
        </div>
      </div>
    </>
  );
};

export default SlotMachine;
