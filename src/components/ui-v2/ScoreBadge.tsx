import React from 'react';

type Size = 'sm' | 'md' | 'lg';
type Variant = 'circular' | 'bar';

interface ScoreBadgeProps {
  score: number;
  label?: string;
  size?: Size;
  variant?: Variant;
  className?: string;
}

interface ToneStyle {
  text: string;
  stroke: string;
  bg: string;
}

// DP-2: a score bar/dial is single-accent teal — the number conveys the value,
// the colour is not a decision signal (ranking is carried by the number and, in
// comparisons, the top-ranked column highlight). Semantic red/amber/green is
// reserved for true state elsewhere, not for decorating a 0–100 score.
const TONE: ToneStyle = {
  text: 'text-teal',
  stroke: '#0097A7',
  bg: 'bg-teal-soft',
};

const CIRCULAR_SIZE: Record<Size, { px: number; stroke: number; font: string }> = {
  sm: { px: 40, stroke: 4, font: 'text-xs' },
  md: { px: 64, stroke: 6, font: 'text-base' },
  lg: { px: 96, stroke: 8, font: 'text-xl' },
};

const ScoreBadge: React.FC<ScoreBadgeProps> = ({
  score,
  label,
  size = 'md',
  variant = 'circular',
  className = '',
}) => {
  const clamped = Math.max(0, Math.min(100, score));
  const t = TONE;

  if (variant === 'bar') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex-1 h-2 rounded-full bg-bg-hover overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${clamped}%`, backgroundColor: t.stroke }}
          />
        </div>
        <span className={`text-xs font-semibold tabular-nums ${t.text}`}>
          {clamped}
        </span>
        {label && (
          <span className="text-xs text-text-tertiary">{label}</span>
        )}
      </div>
    );
  }

  const { px, stroke, font } = CIRCULAR_SIZE[size];
  const radius = (px - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width: px, height: px }}>
        <svg
          width={px}
          height={px}
          className="-rotate-90"
          viewBox={`0 0 ${px} ${px}`}
          aria-hidden="true"
        >
          <circle
            cx={px / 2}
            cy={px / 2}
            r={radius}
            fill="none"
            stroke="#E5E9EE"
            strokeWidth={stroke}
          />
          <circle
            cx={px / 2}
            cy={px / 2}
            r={radius}
            fill="none"
            stroke={t.stroke}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 300ms ease-out' }}
          />
        </svg>
        <div
          className={`absolute inset-0 flex items-center justify-center font-semibold tabular-nums ${font} ${t.text}`}
        >
          {clamped}
        </div>
      </div>
      {label && (
        <span className="text-xs text-text-tertiary mt-1 text-center">
          {label}
        </span>
      )}
    </div>
  );
};

export default ScoreBadge;
