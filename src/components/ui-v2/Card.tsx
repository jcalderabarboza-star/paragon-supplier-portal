import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// UI-1c-3 · THE ONE CARD.
//
// A card is a white box with one border, one radius and one shadow. The
// inventory found 223 boxes written by hand in 65 files, in 40 signatures:
// radius `lg` or `md`, padding 3, 4, 5, 6 or none, shadow `sm`, `md` or none,
// `bg-white` or `bg-bg-surface`.
//
//   Card          the box                       padding none · md (16) · lg (24)
//     tone        surface (white, shadowed)  ·  inset (grey, flat — a block
//                                               INSIDE a card, never a second
//                                               shadowed box)
//     accent      critical · warning · info — a left edge in the state's colour:
//                 an event near its deadline, a high-priority action. `fill`
//                 tints the whole card with it, for the one panel a page leads
//                 with. An accent is a STATE; a card with none has no edge.
//     highlighted the reader was sent to THIS card by a link — the info border
//                 and a ring. It is not a selection (that is `CardButton`).
//   CardButton    a card the reader presses     the same box; `selected` takes
//                                               the action border and tint
//
// `className` is for layout — a margin, a grid span, a flex rule — never a
// border, a radius, a shadow, a background or a padding.
// ─────────────────────────────────────────────────────────────────────────────

export type CardPadding = 'none' | 'md' | 'lg';
export type CardTone = 'surface' | 'inset';

export const CARD_PADDING: Record<CardPadding, string> = { none: '', md: 'p-4', lg: 'p-6' };

export const CARD_TONE: Record<CardTone, string> = {
  surface: 'rounded-lg border border-border-subtle bg-bg-surface shadow-sm',
  inset: 'rounded-lg border border-border-subtle bg-bg-hover',
};

export type CardAccent = 'critical' | 'warning' | 'info';

/** UI-1d: the edge an accent draws, and the tint `fill` lays under it. */
export const CARD_ACCENT: Record<CardAccent, { edge: string; fill: string }> = {
  critical: { edge: 'border-l-4 border-l-critical', fill: 'bg-critical-soft' },
  warning: { edge: 'border-l-4 border-l-warning', fill: 'bg-warning-soft' },
  info: { edge: 'border-l-4 border-l-info', fill: 'bg-info-soft' },
};

/** UI-1d: the card a link sent the reader to. */
export const CARD_HIGHLIGHT = 'border-info ring-1 ring-info/40';

const CARD_GROUND: Record<CardTone, string> = { surface: 'bg-bg-surface shadow-sm', inset: 'bg-bg-hover' };

interface CardClassOptions {
  padding?: CardPadding;
  tone?: CardTone;
  accent?: CardAccent;
  fill?: boolean;
  highlighted?: boolean;
}

/** The card's box. The ONLY place a card is dressed. */
export function cardClass(opts: CardClassOptions = {}): string {
  const { padding = 'md', tone = 'surface', accent, fill = false, highlighted = false } = opts;
  if (!accent && !highlighted) return `${CARD_TONE[tone]} ${CARD_PADDING[padding]}`.trim();
  // Built from parts, never by adding to `CARD_TONE`: two border colours or two
  // grounds on one element is decided by stylesheet order, not by the reader.
  const parts = [
    'rounded-lg border',
    highlighted ? CARD_HIGHLIGHT : 'border-border-subtle',
    accent && fill ? CARD_ACCENT[accent].fill : CARD_GROUND[tone],
    accent ? CARD_ACCENT[accent].edge : '',
    CARD_PADDING[padding],
  ];
  return parts.filter(Boolean).join(' ');
}

type CardElement = 'div' | 'section' | 'article' | 'aside' | 'li' | 'form' | 'details' | 'fieldset';

type CardProps = Omit<React.HTMLAttributes<HTMLElement>, 'className'> & {
  padding?: CardPadding;
  tone?: CardTone;
  /** A state's left edge: an urgency, a priority. Left out, the card has no edge. */
  accent?: CardAccent;
  /** With `accent`: tint the whole card. For the one panel a page leads with. */
  fill?: boolean;
  /** A link sent the reader to this card. */
  highlighted?: boolean;
  /** The element. A card is a `div` unless the page says what it is. */
  as?: CardElement;
  /** Layout only. */
  className?: string;
  /** For `as="form"`. */
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
};

export const Card = React.forwardRef<HTMLElement, CardProps>(
  ({ padding = 'md', tone = 'surface', accent, fill, highlighted, as = 'div', className = '', children, ...rest }, ref) =>
    React.createElement(
      as,
      {
        ref,
        'data-card': tone,
        'data-accent': accent,
        'data-highlighted': highlighted ? 'true' : undefined,
        className: `${cardClass({ padding, tone, accent, fill, highlighted })} ${className}`.trim(),
        ...rest,
      },
      children,
    ),
);
Card.displayName = 'Card';

type CardButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
  padding?: CardPadding;
  /**
   * The card is one of a set and this one is chosen. Stated, it is announced
   * (`aria-pressed`); left out, the card is a plain press target.
   */
  selected?: boolean;
  /** Layout only. */
  className?: string;
};

/** A card the reader presses: a tile that opens something, or one choice of a set. */
export const CardButton = React.forwardRef<HTMLButtonElement, CardButtonProps>(
  ({ padding = 'md', selected, className = '', children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      data-card="button"
      className={`rounded-lg border text-left font-sans transition-colors focus:outline-none focus:ring-2 focus:ring-action/40 disabled:cursor-not-allowed disabled:opacity-50 ${
        selected ? 'border-action bg-action-soft' : 'border-border-subtle bg-bg-surface shadow-sm hover:bg-bg-hover'
      } ${CARD_PADDING[padding]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  ),
);
CardButton.displayName = 'CardButton';

export default Card;
