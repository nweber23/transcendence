import React from 'react';
import {
  BONUS_TRIGGER_COUNT,
  FREE_SPIN_COUNT,
  FREE_SPIN_MAX_MULTIPLIER,
  FREE_SPIN_MULTIPLIER,
  FREE_SPIN_MULTIPLIER_INCREMENT,
  LINE_OPTIONS,
  MAX_LINES,
  MAX_WIN_MULTIPLIER,
  PAYLINES,
  PAYTABLE,
  SCATTER_PAYTABLE,
  SCATTER_SYMBOL,
  SYMBOLS,
  WILD_SYMBOL,
} from '@/pages/games/luckySevensConfig';

const fmtMult = (value: number) => `${value % 1 === 0 ? value : value.toFixed(1)}×`;

/** Tiny 3x3 grid showing which cells a given payline runs through. */
const PaylineDiagram: React.FC<{ line: [number, number][] }> = ({ line }) => {
  const active = new Set(line.map(([col, row]) => `${row}-${col}`));
  return (
    <div className="grid grid-cols-3 gap-[3px]">
      {Array.from({ length: 3 }, (_, row) =>
        Array.from({ length: 3 }, (_, col) => (
          <div
            key={`${row}-${col}`}
            className="w-[7px] h-[7px] rounded-[1.5px]"
            style={{
              background: active.has(`${row}-${col}`)
                ? 'var(--gold)'
                : 'rgba(212,175,55,0.15)',
            }}
          />
        )),
      )}
    </div>
  );
};

interface SlotPaytableModalProps {
  onClose: () => void;
}

const SlotPaytableModal: React.FC<SlotPaytableModalProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border border-[rgba(212,175,55,0.25)] bg-[var(--surface)] shadow-[0_12px_48px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-[rgba(212,175,55,0.15)] bg-[var(--surface)]">
          <h2
            className="uppercase tracking-[0.2em] text-[var(--gold)]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 15 }}
          >
            Paytable &amp; Rules
          </h2>
          <button
            onClick={onClose}
            aria-label="Close paytable"
            className="w-7 h-7 flex items-center justify-center rounded-full text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[rgba(212,175,55,0.1)] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-5">
          {/* Symbol payouts */}
          <section>
            <h3 className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-3)] mb-2">
              Symbol Payouts <span className="normal-case tracking-normal">(× bet per line)</span>
            </h3>
            <div className="flex flex-col gap-1.5">
              {SYMBOLS.map((symbol) => {
                const entry = PAYTABLE[symbol.id] ?? {};
                const isWild = symbol.id === WILD_SYMBOL;
                const isScatter = symbol.id === SCATTER_SYMBOL;
                return (
                  <div
                    key={symbol.id}
                    className="flex items-center gap-3 px-2.5 py-1.5 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(212,175,55,0.08)]"
                  >
                    <img src={symbol.file} alt={symbol.label} className="w-7 h-7 object-contain shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-[var(--text-2)] font-medium">
                        {symbol.label}
                        {isWild && (
                          <span className="ml-1.5 text-[8px] uppercase tracking-[0.1em] text-[var(--gold)]">Wild</span>
                        )}
                        {isScatter && (
                          <span className="ml-1.5 text-[8px] uppercase tracking-[0.1em] text-[var(--gold)]">Scatter</span>
                        )}
                      </div>
                      {isWild && (
                        <p className="text-[9px] text-[var(--text-3)] mt-0.5">
                          Substitutes for any symbol except Scatter to complete a line.
                        </p>
                      )}
                      {isScatter && (
                        <p className="text-[9px] text-[var(--text-3)] mt-0.5">
                          Pays anywhere on the grid, not just on a line. {BONUS_TRIGGER_COUNT}+ triggers Free Spins.
                        </p>
                      )}
                    </div>
                    <div className="flex gap-3 text-right shrink-0">
                      {[3, 2].map((count) => (
                        <div key={count} className="w-12">
                          <p className="text-[8px] uppercase tracking-[0.1em] text-[var(--text-3)]">{count}×</p>
                          <p className="text-[11px] text-[var(--gold)] font-serif">
                            {entry[count] != null ? fmtMult(entry[count]) : '—'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Scatter pays */}
          <section>
            <h3 className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-3)] mb-2">
              Scatter Pays <span className="normal-case tracking-normal">(× total bet, anywhere on grid)</span>
            </h3>
            <div className="flex gap-2">
              {Object.entries(SCATTER_PAYTABLE)
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([count, mult]) => (
                  <div
                    key={count}
                    className="flex-1 text-center px-2 py-1.5 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(212,175,55,0.08)]"
                  >
                    <p className="text-[9px] text-[var(--text-3)]">{count}× ◆</p>
                    <p className="text-[11px] text-[var(--gold)] font-serif">{fmtMult(mult)}</p>
                  </div>
                ))}
            </div>
          </section>

          {/* Free spins */}
          <section>
            <h3 className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-3)] mb-2">
              Free Spins Bonus
            </h3>
            <p className="text-[11px] text-[var(--text-2)] leading-relaxed">
              Landing {BONUS_TRIGGER_COUNT}+ Scatter symbols anywhere on the grid awards{' '}
              <span className="text-[var(--gold)]">{FREE_SPIN_COUNT} free spins</span>, starting at a{' '}
              <span className="text-[var(--gold)]">{fmtMult(FREE_SPIN_MULTIPLIER)}</span> win multiplier
              {FREE_SPIN_MULTIPLIER_INCREMENT > 0 && (
                <>
                  , increasing by {fmtMult(FREE_SPIN_MULTIPLIER_INCREMENT)} up to a maximum of{' '}
                  <span className="text-[var(--gold)]">{fmtMult(FREE_SPIN_MAX_MULTIPLIER)}</span>
                </>
              )}
              .
            </p>
          </section>

          {/* Paylines */}
          <section>
            <h3 className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-3)] mb-2">
              Paylines <span className="normal-case tracking-normal">({MAX_LINES} total — matches must start from reel 1)</span>
            </h3>
            <div className="grid grid-cols-5 gap-2.5">
              {PAYLINES.map((line, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <PaylineDiagram line={line} />
                  <span className="text-[8px] text-[var(--text-3)]">{i + 1}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Footer notes */}
          <section className="pt-1 border-t border-[rgba(212,175,55,0.1)]">
            <p className="text-[9px] text-[var(--text-3)] leading-relaxed">
              Choose {LINE_OPTIONS.join(', ')} active lines per spin. Matches are counted left-to-right starting
              from the first reel; a symbol only pays once per line, using its best match length. Maximum win is
              capped at {MAX_WIN_MULTIPLIER.toLocaleString()}× the total bet.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SlotPaytableModal;
