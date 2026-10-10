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

/** The card's box. The ONLY place a card is dressed. */
export function cardClass(opts: { padding?: CardPadding; tone?: CardTone } = {}): string {
  return `${CARD_TONE[opts.tone ?? 'surface']} ${CARD_PADDING[opts.padding ?? 'md']}`.trim();
}

type CardElement = 'div' | 'section' | 'article' | 'aside' | 'li' | 'form' | 'details' | 'fieldset';

type CardProps = Omit<React.HTMLAttributes<HTMLElement>, 'className'> & {
  padding?: CardPadding;
  tone?: CardTone;
  /** The element. A card is a `div` unless the page says what it is. */
  as?: CardElement;
  /** Layout only. */
  className?: string;
  /** For `as="form"`. */
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
};

export const Card = React.forwardRef<HTMLElement, CardProps>(
  ({ padding = 'md', tone = 'surface', as = 'div', className = '', children, ...rest }, ref) =>
    React.createElement(
      as,
      { ref, 'data-card': tone, className: `${cardClass({ padding, tone })} ${className}`.trim(), ...rest },
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
