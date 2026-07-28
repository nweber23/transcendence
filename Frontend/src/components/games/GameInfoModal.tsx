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

/** Info trigger button ("i") meant to sit inside a game's felt/table area. */
export const InfoTriggerButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    aria-label="View rules and info"
    className="absolute top-4 right-4 z-20 w-6 h-6 rounded-full border border-[rgba(212,175,55,0.35)] font-serif text-[11px] text-[rgba(212,175,55,0.75)] hover:border-[rgba(212,175,55,0.7)] hover:text-[var(--gold)] transition-colors cursor-pointer flex items-center justify-center"
  >
    i
  </button>
);

export default GameInfoModal;
