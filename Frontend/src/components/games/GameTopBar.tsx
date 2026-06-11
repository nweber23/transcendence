import React from 'react';
import { Link } from 'react-router-dom';

interface GameTopBarProps {
  title: string;
  subtitle?: string;
  balance: number;
}

/** Slim status bar shown above every game table: lobby link, game title, wallet balance. */
const GameTopBar: React.FC<GameTopBarProps> = ({ title, subtitle, balance }) => (
  <div className="shrink-0 grid grid-cols-[1fr_auto_1fr] items-center h-14 px-5 border-b border-[var(--border)] bg-[var(--surface)]">
    <Link
      to="/"
      className="justify-self-start flex items-center gap-1.5 text-sm text-[var(--text-3)] hover:text-[var(--text)] transition-colors"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Lobby
    </Link>

    <div className="text-center leading-tight">
      <h1 className="font-serif text-lg text-[var(--text)]">{title}</h1>
      {subtitle && (
        <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-3)] mt-0.5">
          {subtitle}
        </p>
      )}
    </div>

    <div className="justify-self-end text-right leading-tight">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-3)]">Balance</p>
      <p className="font-serif text-lg text-[var(--gold)]">${balance.toLocaleString()}</p>
    </div>
  </div>
);

export default GameTopBar;
