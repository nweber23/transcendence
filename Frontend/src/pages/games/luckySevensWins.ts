import {
  BONUS_TRIGGER_COUNT,
  MAX_LINES,
  PAYLINES,
  PAYTABLE,
  SCATTER_PAYTABLE,
  SCATTER_SYMBOL,
  WILD_SYMBOL,
} from './luckySevensConfig';

export interface WinningLine {
  lineIndex: number;
  cells: [number, number][]; // [row, col], in payline order, one entry per matched symbol
  symbol: string;
  count: number;
  multiplier: number;
}

export interface ScatterWin {
  cells: [number, number][];
  count: number;
  multiplier: number;
  bonusTriggered: boolean;
}

/* Reimplements Engine/games/slotMachine/src/machines.cpp's evaluate_spin
   line-matching rules client-side, since the engine only ever returns the
   resolved grid and total payout — not which lines actually won. grid is
   [row][col], matching the /games response. */
export function evaluateWinningLines(grid: string[][], lineCount: number): WinningLine[] {
  const count = Math.min(lineCount, MAX_LINES);
  const wins: WinningLine[] = [];

  for (let lineIndex = 0; lineIndex < count; lineIndex++) {
    const payline = PAYLINES[lineIndex];
    const cells: [number, number][] = payline.map(([col, row]) => [row, col]);
    const symbols = cells.map(([row, col]) => grid[row][col]);

    let base = WILD_SYMBOL;
    for (const symbol of symbols) {
      if (symbol !== SCATTER_SYMBOL && symbol !== WILD_SYMBOL) {
        base = symbol;
        break;
      }
    }

    let match = 0;
    for (const symbol of symbols) {
      if (symbol === SCATTER_SYMBOL) break;
      if (symbol === base || symbol === WILD_SYMBOL) match++;
      else break;
    }

    const paytableEntry = PAYTABLE[base];
    if (!paytableEntry) continue;

    let multiplier = 0;
    for (let c = match; c >= 1; c--) {
      if (paytableEntry[c] != null) {
        multiplier = paytableEntry[c];
        break;
      }
    }

    if (multiplier > 0) {
      wins.push({ lineIndex, cells: cells.slice(0, match), symbol: base, count: match, multiplier });
    }
  }

  return wins;
}

export function evaluateScatterWin(grid: string[][]): ScatterWin | null {
  const cells: [number, number][] = [];
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col] === SCATTER_SYMBOL) cells.push([row, col]);
    }
  }

  const multiplier = SCATTER_PAYTABLE[cells.length];
  if (!multiplier) return null;

  return {
    cells,
    count: cells.length,
    multiplier,
    bonusTriggered: cells.length >= BONUS_TRIGGER_COUNT,
  };
}
