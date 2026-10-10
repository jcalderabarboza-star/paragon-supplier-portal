import React from 'react';
import type { LucideIcon } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// UI-1c-3 · EVERYTHING THE READER PRESSES THAT IS NOT A `Button`.
//
// `Button` is the labelled action. The inventory found 99 more `<button>`s
// written by hand in 47 files, and they are four things:
//
//   LinkButton    an action that reads as a link: "Edit", "Remove", "Back",
//                 "Show more". Inter 14 medium in the action colour, no box.
//   IconButton    an icon alone: close, delete, move up. It has no words, so
//                 `aria-label` is required by the type.
//   ToggleChip    one of a set the reader switches between or ticks: a period,
//                 a lane, a brand, yes / no. Selected takes the action border
//                 and tint; `aria-pressed` says so.
//   RowButton     a whole row that opens or selects: an accordion header, a
//                 menu item, a line in a pick list.
//
// A card that is pressed is `CardButton` (`Card.tsx`). `className` on all of
// them is layout only.
// ─────────────────────────────────────────────────────────────────────────────

export type ActionTone = 'action' | 'muted' | 'critical';

const LINK_TONE: Record<ActionTone, string> = {
  action: 'text-action-text',
  muted: 'text-text-secondary',
  critical: 'text-critical',
};

type LinkButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
  tone?: ActionTone;
  icon?: LucideIcon;
  /** The icon follows the words (an arrow, a chevron that points onward). */
  iconAfter?: LucideIcon;
  /** Layout only. */
  className?: string;
};

export const LinkButton = React.forwardRef<HTMLButtonElement, LinkButtonProps>(
  ({ tone = 'action', icon: Icon, iconAfter: IconAfter, className = '', children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      data-action="link"
      className={`inline-flex items-center gap-1 bg-transparent p-0 font-sans text-sm font-medium hover:underline focus:outline-none focus-visible:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline ${LINK_TONE[tone]} ${className}`}
      {...rest}
    >
      {Icon ? <Icon size={14} aria-hidden="true" /> : null}
      {children}
      {IconAfter ? <IconAfter size={14} aria-hidden="true" /> : null}
    </button>
  ),
);
LinkButton.displayName = 'LinkButton';

const ICON_TONE: Record<ActionTone, string> = {
  action: 'text-action-text hover:bg-action-soft',
  muted: 'text-text-tertiary hover:bg-bg-hover hover:text-text-primary',
  critical: 'text-text-tertiary hover:bg-critical-soft hover:text-critical',
};

type IconButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children' | 'aria-label'> & {
  icon: LucideIcon;
  /** What the button does, in words. Required: the button shows none. */
  'aria-label': string;
  tone?: ActionTone;
  /** Layout only. */
  className?: string;
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon: Icon, tone = 'muted', className = '', ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      data-action="icon"
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-action/40 disabled:cursor-not-allowed disabled:opacity-40 ${ICON_TONE[tone]} ${className}`}
      {...rest}
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  ),
);
IconButton.displayName = 'IconButton';

type ToggleChipProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
  selected: boolean;
  /** The chip holds a code or a figure. */
  mono?: boolean;
  /** Layout only. */
  className?: string;
};

export const ToggleChip = React.forwardRef<HTMLButtonElement, ToggleChipProps>(
  ({ selected, mono, className = '', children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      data-action="toggle"
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-normal transition-colors focus:outline-none focus:ring-2 focus:ring-action/40 disabled:cursor-not-allowed disabled:opacity-50 ${
        mono ? 'font-mono' : 'font-sans'
      } ${
        selected
          ? 'border-action bg-action-soft text-action-text'
          : 'border-border-subtle bg-bg-surface text-text-secondary hover:bg-bg-hover'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  ),
);
ToggleChip.displayName = 'ToggleChip';

type RowButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
  /** The row is the chosen one of its list. */
  selected?: boolean;
  /** `md` is 16 × 12; `sm` is 8 × 6, for a menu; `none` leaves the padding to the row's own layout. */
  padding?: 'none' | 'sm' | 'md';
  /** Layout only. */
  className?: string;
};

const ROW_PADDING = { none: '', sm: 'px-2 py-1.5', md: 'px-4 py-3' } as const;

export const RowButton = React.forwardRef<HTMLButtonElement, RowButtonProps>(
  ({ selected, padding = 'md', className = '', children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      data-action="row"
      className={`flex w-full items-center justify-between gap-3 text-left font-sans text-sm font-normal text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-action/40 disabled:cursor-not-allowed disabled:opacity-50 ${
        selected ? 'bg-action-soft' : 'hover:bg-bg-hover'
      } ${ROW_PADDING[padding]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  ),
);
RowButton.displayName = 'RowButton';
