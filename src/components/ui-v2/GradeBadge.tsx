import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// UI-1c-4 · THE ONE GRADE.
//
// A supplier's grade was drawn on three pages — the buyer's scorecard, the
// supplier's performance page and the supplier's dashboard — each with its own
// copy of the ramp in raw hex and its own badge. The three copies agreed, which
// is the most a copy can do.
//
// The ramp is written here once, in tokens:
//
//   A  success      B  info      C  warning      D · F  critical
//
// Grade C takes the warning SPLIT (DP2-WARN-01): the bright amber is the
// border, the dark amber is the letter. The retired copies used one burnt
// amber for both.
//
//   GradeBadge   shape="dial"   the 80px circle on a scorecard header
//                shape="tile"   the square on a dashboard (`size="sm"` in a row)
//   GradeChip                   one month of a grade history: a label, the
//                               letter, a figure
// ─────────────────────────────────────────────────────────────────────────────

export type GradeLetter = 'A' | 'B' | 'C' | 'D' | 'F';

/** `StatusPill`'s variant for a grade — the pill that sits beside a badge. */
export type GradePill = 'success' | 'info' | 'warning' | 'danger';

export const GRADE_TONE: Record<GradeLetter, { box: string; text: string; pill: GradePill }> = {
  A: { box: 'bg-success-soft border-success', text: 'text-success', pill: 'success' },
  B: { box: 'bg-info-soft border-info', text: 'text-info', pill: 'info' },
  C: { box: 'bg-warning-soft border-warning', text: 'text-warning-hover', pill: 'warning' },
  D: { box: 'bg-critical-soft border-critical', text: 'text-critical', pill: 'danger' },
  F: { box: 'bg-critical-soft border-critical', text: 'text-critical', pill: 'danger' },
};

interface GradeBadgeProps {
  grade: GradeLetter;
  shape?: 'dial' | 'tile';
  /** A tile only: `sm` sits in a table row. */
  size?: 'md' | 'sm';
  'data-testid'?: string;
}

const SHAPE = {
  dial: 'h-20 w-20 rounded-full border-4 text-kpi',
  tile: 'h-16 w-16 rounded-md border-[3px] text-kpi',
  tileSm: 'h-10 w-10 rounded-md border-[3px] text-section',
} as const;

export const GradeBadge: React.FC<GradeBadgeProps> = ({ grade, shape = 'dial', size = 'md', 'data-testid': testId }) => {
  const tone = GRADE_TONE[grade];
  const box = shape === 'dial' ? SHAPE.dial : size === 'sm' ? SHAPE.tileSm : SHAPE.tile;
  return (
    <div
      data-testid={testId}
      data-grade={grade}
      className={`flex shrink-0 items-center justify-center font-sans font-semibold ${box} ${tone.box} ${tone.text}`}
    >
      {grade}
    </div>
  );
};

interface GradeChipProps {
  grade: GradeLetter;
  /** What the grade is for: a month, a quarter. */
  label: React.ReactNode;
  /** The figure behind the letter. */
  figure?: React.ReactNode;
}

export const GradeChip: React.FC<GradeChipProps> = ({ grade, label, figure }) => {
  const tone = GRADE_TONE[grade];
  return (
    <div data-grade={grade} className={`rounded-md border px-2.5 py-1.5 text-center font-sans ${tone.box} ${tone.text}`}>
      <div className="text-label">{label}</div>
      <div className="text-sm font-semibold">{grade}</div>
      {figure !== undefined ? <div className="text-xs">{figure}</div> : null}
    </div>
  );
};

export default GradeBadge;
