import React from 'react';

interface GameInfoModalProps {
  title: string;
  onClose: () => void;
  maxWidthClassName?: string;
  children: React.ReactNode;
}

/**
 * Shared chrome for a game's "how to play / rules" popup: dimmed overlay,
 * sticky header with close button, scrollable body. Each game supplies its
 * own section content as children.
 */
const GameInfoModal: React.FC<GameInfoModalProps> = ({
  title,
  onClose,
  maxWidthClassName = 'max-w-lg',
  children,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidthClassName} max-h-[85vh] overflow-y-auto rounded-xl border border-[rgba(212,175,55,0.25)] bg-[var(--surface)] shadow-[0_12px_48px_rgba(0,0,0,0.6)]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-[rgba(212,175,55,0.15)] bg-[var(--surface)]">
          <h2
            className="uppercase tracking-[0.2em] text-[var(--gold)]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 15 }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 flex items-center justify-center rounded-full text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[rgba(212,175,55,0.1)] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-5">{children}</div>
      </div>
    </div>
  );
};

/** Small uppercase section label used inside a GameInfoModal body. */
export const InfoSectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-2)] mb-2">{children}</h3>
);

/** Rules/info trigger meant to sit inside a game's felt/table area — a
 * labeled pill rather than a bare icon so it reads clearly against the felt. */
export const InfoTriggerButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    aria-label="View rules and info"
    className="absolute top-4 right-4 z-20 flex items-center gap-1.5 pl-2.5 pr-3.5 py-1.5 rounded-full border border-[rgba(212,175,55,0.5)] bg-[rgba(8,12,16,0.8)] text-[var(--gold)] text-xs font-semibold uppercase tracking-wider shadow-[0_2px_10px_rgba(0,0,0,0.4)] hover:border-[rgba(212,175,55,0.85)] hover:bg-[rgba(212,175,55,0.18)] transition-colors cursor-pointer"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="10.5" x2="12" y2="16" strokeLinecap="round" />
      <circle cx="12" cy="7.2" r="0.9" fill="currentColor" stroke="none" />
    </svg>
    Rules
  </button>
);

export default GameInfoModal;
