import React from 'react';
import { LucideIcon } from 'lucide-react';

// ⚠️ **§68 — `'primary'` (SOLID ACTION-BLUE) IS GONE FROM THIS UNION, AND ITS
// ABSENCE IS THE MECHANISM.** DP2-BUTTON-01 used to reserve solid for the
// irreversible commit — Award, Release payment, Post-to-SAP, Reject,
// Override-hold — at most one per surface, with the WhatsApp messenger chrome
// exempt from DP-2 entirely (D-2). The operator retired the whole register:
// OUTLINE IS THE ONLY PRIMARY WEIGHT, messenger chrome included.
//
// This is a TYPE and not a lint rule or a comment because a comment does not
// survive the next page. Fourteen call sites carried the literal, and two more
// producers could render solid without it — a PROP (`BulkActionsBar`'s
// `primary.solid`) and a MODEL FLAG (`invoiceActionModel`'s `solid`), neither
// visible to a matcher keyed on `variant="primary"`. Removing the member makes
// every route back a `tsc` failure rather than a thing somebody has to notice.
//
// ⚠️ AND THE DEFAULT WAS `'primary'`, WHICH MADE SOLID THE SHAPE OF FORGETTING.
// It was unreachable only by luck: all 181 `<Button>` sites in the tree pass an
// explicit variant, so nothing rendered through it — a latent trap, not a live
// defect, and it closes here with the rest.
//
// UI-1d (operator ruling, 10 October 2026) · SOLID IS BACK, FOR ONE THING. The
// paragraphs above are the record of §68 and are kept as written; what they
// retired was solid as the mark of an IRREVERSIBLE COMMIT, wherever one stood.
// `'primary'` now means something else and narrower: THE PAGE'S MAIN ACTION,
// one per page, in the page header (and "Sign in" on the login page). Outline
// is every other action. The default is still `'outline'`, so solid is never
// the shape of forgetting to choose, and `solidButtonRetired.guard.test.ts`
// holds where a solid button may stand and that a page has at most one.
// UI-1c-3: ONE HEIGHT, 40px — the height of a form control, so a button and an
// input sit on one line in a filter row. `className` is layout only.
type Variant = 'primary' | 'secondary' | 'outline';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /**
   * UI-1c-3: the act destroys something — cancel an event, conclude without an
   * award. The outline and its label take the critical colour. It is a colour on
   * the one outline, not a second weight: a destructive act is never solid.
   */
  tone?: 'critical';
  icon?: LucideIcon;
}

const VARIANT_CLASS: Record<Variant, string> = {
  // UI-1d: the page's main action. White on `action` clears 4.5:1, and on
  // `action-hover`; the border is the fill's, so the box is the outline's box.
  primary:
    'bg-action text-white border border-action hover:bg-action-hover hover:border-action-hover',
  secondary:
    'bg-bg-surface text-text-primary border border-border-input hover:bg-bg-hover',
  // DP2-BUTTON-01 (as amended, §68): action-blue OUTLINE — transparent fill,
  // blue border + text. It is no longer the CALM weight beside a louder one;
  // it is the ONLY primary weight, and therefore the default below.
  outline:
    'bg-transparent text-action-text border border-action hover:bg-action-soft',
};

const CRITICAL_CLASS = 'bg-transparent text-critical border border-critical hover:bg-critical-soft';

/**
 * The button's box and type, for the one thing that must LOOK like a button and
 * cannot BE one: a router `Link` that goes somewhere. It is the same string the
 * component wears, so a link dressed with it follows every change made here.
 */
export function buttonClass(variant: Variant = 'outline', tone?: 'critical'): string {
  return `inline-flex items-center justify-center gap-2 min-h-10 rounded-md px-4 py-2 font-sans text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${tone === 'critical' ? CRITICAL_CLASS : VARIANT_CLASS[variant]}`;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'outline',
  tone,
  icon: Icon,
  children,
  className = '',
  ...rest
}) => {
  return (
    <button
      type="button"
      className={`${buttonClass(variant, tone)} ${className}`}
      {...rest}
    >
      {Icon ? <Icon size={16} /> : null}
      {children}
    </button>
  );
};

export default Button;
