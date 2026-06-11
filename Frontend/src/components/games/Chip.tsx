import React from 'react';

export const CHIP_VALUES = [10, 25, 100, 500, 1000] as const;

/* Denomination colors drawn from the design-system palette */
const CHIP_COLORS: Record<number, { face: string; edge: string }> = {
  10: { face: '#3a5872', edge: '#22384a' },
  25: { face: '#2d7a63', edge: '#1b5042' },
  100: { face: '#8b2635', edge: '#5a1722' },
  500: { face: '#b08d28', edge: '#7d641b' },
  1000: { face: '#000000', edge: '#1a1a1a'},
};

interface ChipProps {
  value: number;
  size?: number;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const Chip: React.FC<ChipProps> = ({ value, size = 56, onClick, disabled = false, className = '' }) => {
  const colors = CHIP_COLORS[value] ?? CHIP_COLORS[100];

  const body = (
    <span
      className="relative block rounded-full"
      style={{
        width: size,
        height: size,
        background: [
          'repeating-conic-gradient(rgba(244,240,228,0.9) 0deg 14deg, transparent 14deg 60deg)',
          `radial-gradient(circle at 32% 28%, ${colors.face} 0%, ${colors.face} 45%, ${colors.edge} 100%)`,
        ].join(', '),
        boxShadow:
          '0 3px 10px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.4), inset 0 2px 3px rgba(255,255,255,0.18)',
      }}
    >
      <span
        className="absolute flex items-center justify-center rounded-full font-serif font-bold"
        style={{
          inset: '17%',
          background: colors.face,
          border: '1.5px dashed rgba(244,240,228,0.4)',
          boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.35)',
          color: '#f4f0e4',
          fontSize: size * 0.27,
        }}
      >
        {value}
      </span>
    </span>
  );

  if (!onClick) {
    return <span className={`inline-block ${className}`}>{body}</span>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Add $${value} chip`}
      className={`inline-block cursor-pointer transition-transform duration-150 hover:-translate-y-1.5 active:translate-y-0 active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${className}`}
    >
      {body}
    </button>
  );
};

export default Chip;
