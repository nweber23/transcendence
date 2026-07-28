/* Mirrors Engine/games/slotMachine/configs/lucky-sevens.config.json.
   Keep every value here identical to that file — paylines, paytable, and
   symbol art must match the engine's own rules exactly, since the frontend
   uses this copy to render the paytable popup and winning lines without a
   round trip to the server (the engine only ever returns the resolved grid
   and the total payout, not which lines won). */

export interface SlotSymbol {
  id: string;
  label: string;
  file: string; // served straight out of Frontend/public, same path as the engine config
}

export const SYMBOLS: SlotSymbol[] = [
  { id: 'SYM_7', label: '7', file: '/sym_seven.png' },
  { id: 'SYM_BAR', label: 'BAR', file: '/sym_bar.png' },
  { id: 'SYM_WILD', label: 'WILD', file: '/sym_wild.png' },
  { id: 'SYM_DIAMOND', label: '◆', file: '/sym_diamond.png' },
  { id: 'SYM_HEART', label: '♥', file: '/sym_heart.png' },
  { id: 'SYM_SPADE', label: '♠', file: '/sym_spade.png' },
  { id: 'SYM_CLUB', label: '♣', file: '/sym_club.png' },
  { id: 'SYM_BELL', label: 'BELL', file: '/sym_bell.png' },
];

export const symbolIcon = (id: string) => SYMBOLS.find((s) => s.id === id)?.file;

export const WILD_SYMBOL = 'SYM_WILD';
export const SCATTER_SYMBOL = 'SYM_DIAMOND';

export const LINE_OPTIONS = [1, 3, 5, 10] as const;
export const MAX_LINES = 10;

/* [col, row] pairs — same order and indexing as the engine config */
export const PAYLINES: [number, number][][] = [
  [[0, 1], [1, 1], [2, 1]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 2], [1, 2], [2, 2]],
  [[0, 0], [1, 1], [2, 2]],
  [[0, 2], [1, 1], [2, 0]],
  [[0, 0], [1, 0], [2, 1]],
  [[0, 2], [1, 2], [2, 1]],
  [[0, 1], [1, 0], [2, 0]],
  [[0, 1], [1, 2], [2, 2]],
  [[0, 0], [1, 2], [2, 0]],
];

export const PAYTABLE: Record<string, Record<number, number>> = {
  SYM_7: { 3: 100, 2: 10 },
  SYM_WILD: { 3: 250, 2: 2.5 },
  SYM_DIAMOND: { 3: 15, 2: 1 },
  SYM_BAR: { 3: 2.5, 2: 1 },
  SYM_BELL: { 3: 2.5, 2: 1 },
  SYM_HEART: { 3: 1.5, 2: 0.3 },
  SYM_SPADE: { 3: 1, 2: 0.3 },
  SYM_CLUB: { 3: 1, 2: 0.3 },
};

export const SCATTER_PAYTABLE: Record<number, number> = { 2: 1, 3: 15 };
export const BONUS_TRIGGER_COUNT = 3;

export const FREE_SPIN_COUNT = 15;
export const FREE_SPIN_MULTIPLIER = 1;
export const FREE_SPIN_MULTIPLIER_INCREMENT = 1;
export const FREE_SPIN_MAX_MULTIPLIER = 10;

export const MAX_WIN_MULTIPLIER = 5000;
