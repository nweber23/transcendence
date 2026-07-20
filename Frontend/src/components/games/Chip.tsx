import React from 'react';

export const CHIP_VALUES = [1, 5, 10, 25, 100, 500, 1000, 2000, 5000] as const;

/* Standard casino chip color convention */
const CHIP_COLORS: Record<number, { face: string; edge: string; text: string }> = {
  1: { face: '#efe9dc', edge: '#b8b0a0', text: '#241b0b' },
  5: { face: '#b23a3a', edge: '#7a2323', text: '#f4f0e4' },
  10: { face: '#2f6fa4', edge: '#1f4f79', text: '#f4f0e4' },
  25: { face: '#2d7a63', edge: '#1b5042', text: '#f4f0e4' },
  100: { face: '#111111', edge: '#000000', text: '#f4f0e4' },
  500: { face: '#8d5bd3', edge: '#5f3d97', text: '#f4f0e4' },
  1000: { face: '#d8b11e', edge: '#8f7210', text: '#241b0b' },
  2000: { face: '#7ec3f1', edge: '#4b88b4', text: '#17324a' },
  5000: { face: '#6b4226', edge: '#3f2513', text: '#f4f0e4' },
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
          color: colors.text,
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
