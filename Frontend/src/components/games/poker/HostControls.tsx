import React, { useState } from 'react';
import GameInfoModal from '@/components/games/GameInfoModal';
import { PokerTableSummary } from '@/hooks/usePokerTables';

interface EditSettingsModalProps {
  table: PokerTableSummary;
  canResize: boolean;
  onClose: () => void;
  onSave: (settings: { name: string; isPrivate: boolean; maxSeats: number; buyIn: string; smallBlind: string; bigBlind: string }) => Promise<void>;
}

const inputClass =
  'w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[rgba(212,175,55,0.15)] text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[rgba(212,175,55,0.4)] text-sm disabled:opacity-40 disabled:cursor-not-allowed';

const labelClass = 'text-[11px] uppercase tracking-[0.18em] text-[var(--text-2)] mb-1 block';

const EditSettingsModal: React.FC<EditSettingsModalProps> = ({ table, canResize, onClose, onSave }) => {
  const [name, setName] = useState(table.name);
  const [isPrivate, setIsPrivate] = useState(table.isPrivate);
  const [maxSeats, setMaxSeats] = useState(table.maxSeats);
  const [buyIn, setBuyIn] = useState(table.buyIn);
  const [smallBlind, setSmallBlind] = useState(table.smallBlind);
  const [bigBlind, setBigBlind] = useState(table.bigBlind);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), isPrivate, maxSeats, buyIn, smallBlind, bigBlind });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
      setIsSubmitting(false);
    }
  };

  return (
    <GameInfoModal title="Table Settings" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className={labelClass}>Table Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={64} className={inputClass} autoFocus />
        </div>

        {!canResize && (
          <p className="text-xs text-[var(--text-3)] italic">
            Buy-in, blinds, and max seats can't change while players are seated.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Buy-in</label>
            <input type="number" min={1} value={buyIn} onChange={(e) => setBuyIn(e.target.value)} disabled={!canResize} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Max Seats</label>
            <input
              type="number"
              min={2}
              max={9}
              value={maxSeats}
              onChange={(e) => setMaxSeats(Number(e.target.value))}
              disabled={!canResize}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Small Blind</label>
            <input type="number" min={1} value={smallBlind} onChange={(e) => setSmallBlind(e.target.value)} disabled={!canResize} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Big Blind</label>
            <input type="number" min={1} value={bigBlind} onChange={(e) => setBigBlind(e.target.value)} disabled={!canResize} className={inputClass} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-[var(--text-2)] cursor-pointer select-none">
          <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="accent-[var(--gold)]" />
          Private — invite-only, hidden from the public table list
        </label>

        {error && <p className="text-xs text-[#e8a5ae]">{error}</p>}

        <button
          type="submit"
          disabled={!name.trim() || isSubmitting}
          className="mt-1 px-6 py-3 rounded-xl font-semibold text-sm tracking-[0.22em] uppercase transition-all duration-150 bg-[var(--gold)] text-[#0a0e12] hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </GameInfoModal>
  );
};

interface HostControlsProps {
  table: PokerTableSummary;
  canResize: boolean;
  onSaveSettings: (settings: { name: string; isPrivate: boolean; maxSeats: number; buyIn: string; smallBlind: string; bigBlind: string }) => Promise<void>;
  onInviteClick: () => void;
  onCloseTable: () => Promise<void>;
}

const hostBtn =
  'px-3 py-1.5 rounded-lg border border-[rgba(212,175,55,0.4)] bg-[rgba(212,175,55,0.06)] text-[var(--gold)] text-[11px] font-semibold uppercase tracking-wider hover:bg-[rgba(212,175,55,0.14)] transition-all cursor-pointer';

/** Host-only controls shown in the table's info panel: edit settings,
 * invite (private tables only), and close the table. Per-seat kick buttons
 * live inline in the seat rows themselves, not here. */
const HostControls: React.FC<HostControlsProps> = ({ table, canResize, onSaveSettings, onInviteClick, onCloseTable }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = async () => {
    setIsClosing(true);
    try {
      await onCloseTable();
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
      <button onClick={() => setShowSettings(true)} className={hostBtn}>
        Settings
      </button>
      {table.isPrivate && (
        <button onClick={onInviteClick} className={hostBtn}>
          Invite
        </button>
      )}
      {confirmClose ? (
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[#e8a5ae]">Close table for everyone?</span>
          <button
            onClick={handleClose}
            disabled={isClosing}
            className={`${hostBtn} border-[rgba(139,38,53,0.5)] bg-[rgba(139,38,53,0.15)] text-[#e8a5ae]`}
          >
            {isClosing ? 'Closing…' : 'Confirm'}
          </button>
          <button onClick={() => setConfirmClose(false)} className={hostBtn}>
            Cancel
          </button>
        </div>
      ) : (
        <button onClick={() => setConfirmClose(true)} className={`${hostBtn} border-[rgba(139,38,53,0.4)] text-[#e8a5ae] hover:bg-[rgba(139,38,53,0.12)]`}>
          Close Table
        </button>
      )}

      {showSettings && (
        <EditSettingsModal table={table} canResize={canResize} onClose={() => setShowSettings(false)} onSave={onSaveSettings} />
      )}
    </div>
  );
};

export default HostControls;
