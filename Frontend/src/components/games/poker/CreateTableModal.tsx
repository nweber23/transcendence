import React, { useState } from 'react';
import GameInfoModal from '@/components/games/GameInfoModal';
import { CreatePokerTableRequest } from '@/hooks/usePokerTables';

interface CreateTableModalProps {
  onClose: () => void;
  onCreate: (req: CreatePokerTableRequest) => Promise<void>;
}

const inputClass =
  'w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[rgba(212,175,55,0.15)] text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[rgba(212,175,55,0.4)] text-sm';

const labelClass = 'text-[11px] uppercase tracking-[0.18em] text-[var(--text-2)] mb-1 block';

const CreateTableModal: React.FC<CreateTableModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [maxSeats, setMaxSeats] = useState(6);
  const [buyIn, setBuyIn] = useState('1000');
  const [smallBlind, setSmallBlind] = useState('25');
  const [bigBlind, setBigBlind] = useState('50');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsePositive = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  const validationError = (): string | null => {
    if (!name.trim()) return 'Table name is required';
    const buyInNum = parsePositive(buyIn);
    const smallBlindNum = parsePositive(smallBlind);
    const bigBlindNum = parsePositive(bigBlind);
    if (buyInNum === null) return 'Buy-in must be a positive number';
    if (smallBlindNum === null || bigBlindNum === null) return 'Blinds must be positive numbers';
    if (smallBlindNum >= bigBlindNum) return 'Small blind must be less than big blind';
    if (!Number.isFinite(maxSeats) || maxSeats < 2 || maxSeats > 9) return 'Max seats must be between 2 and 9';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationMessage = validationError();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onCreate({ name: name.trim(), isPrivate, maxSeats, buyIn, smallBlind, bigBlind });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create table');
      setIsSubmitting(false);
    }
  };

  return (
    <GameInfoModal title="Create Table" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className={labelClass}>Table Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. High Rollers"
            maxLength={64}
            className={inputClass}
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Buy-in</label>
            <input type="number" min={1} value={buyIn} onChange={(e) => setBuyIn(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Max Seats</label>
            <input
              type="number"
              min={2}
              max={9}
              value={maxSeats}
              onChange={(e) => setMaxSeats(Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Small Blind</label>
            <input type="number" min={1} value={smallBlind} onChange={(e) => setSmallBlind(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Big Blind</label>
            <input type="number" min={1} value={bigBlind} onChange={(e) => setBigBlind(e.target.value)} className={inputClass} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-[var(--text-2)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="accent-[var(--gold)]"
          />
          Private — invite-only, hidden from the public table list
        </label>

        {error && <p className="text-xs text-[#e8a5ae]">{error}</p>}

        <button
          type="submit"
          disabled={validationError() !== null || isSubmitting}
          className="mt-1 px-6 py-3 rounded-xl font-semibold text-sm tracking-[0.22em] uppercase transition-all duration-150 bg-[var(--gold)] text-[#0a0e12] hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? 'Creating…' : 'Create Table'}
        </button>
      </form>
    </GameInfoModal>
  );
};

export default CreateTableModal;
