import React, { useEffect, useId, useRef } from 'react';
import SectionHeading from './SectionHeading';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOneSolid } from './oneSolid';

// ─────────────────────────────────────────────────────────────────────────────
// ADM-1 · THE POP-UP DIALOG. A centred modal for a short form: the role
// creation form on the roles page and the Super Admin reason prompt.
//
// What it guarantees, and each is asserted in `Dialog.test.tsx`:
//   · `role="dialog"`, `aria-modal`, and it is named by its own title;
//   · focus moves INTO it on open, Tab and Shift+Tab stay inside it, and focus
//     returns to the control that opened it on close;
//   · Escape closes it, and so does the scrim.
//
// `SidePanel` is the drawer; this is the pop-up. They are two primitives on
// purpose — a drawer is read beside the page, a pop-up interrupts it.
//
// PG-1 (operator ruling, 11 October 2026) · EVERY POP-UP IS THIS ONE. Four drew
// their own scrim and their own `role="dialog"`: the FX-rate confirmation, the
// full-screen section, the expanded dashboard widget and the identity panel.
// They kept their own focus and Escape handling (or had none), and none was
// counted by `useOneSolid`. `fill` is the full-screen form of the same pop-up;
// `titleAside` stands beside the title; `closeLabel` names the close button
// where "Close panel" would be the wrong word (a full-screen section is LEFT).
// ─────────────────────────────────────────────────────────────────────────────

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  testId?: string;
  /** Tailwind max-width class for the panel. */
  widthClass?: string;
  /** PG-1: the pop-up fills the screen and its body scrolls. `widthClass` is ignored. */
  fill?: boolean;
  /** PG-1: beside the title — a count, a liveness marker. */
  titleAside?: React.ReactNode;
  /** PG-1: the close button's accessible name, where it is not "Close panel". */
  closeLabel?: string;
}

const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  children,
  testId,
  // i18n-defer: a Tailwind class name, not copy — it reaches `className`, never a reader.
  widthClass = 'max-w-2xl',
  fill = false,
  titleAside,
  closeLabel,
}) => {
  const { t } = useTranslation();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // UI-1e: the dialog's final commit is its one solid button.
  useOneSolid(panelRef, 'a dialog');
  // Held in a ref so the effect below does not re-run (and re-steal focus)
  // every time a parent re-renders with a fresh `onClose` closure.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = (): HTMLElement[] =>
      panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
    // The first control of the BODY, not the close button: a form opens on its
    // first field. The close button is the fallback when the body holds none.
    const body = panel?.querySelector<HTMLElement>('[data-dialog-body]');
    const first = body?.querySelector<HTMLElement>(FOCUSABLE) ?? focusables()[0] ?? panel;
    first?.focus();

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const head = items[0];
      const tail = items[items.length - 1];
      const active = document.activeElement;
      if (!panel?.contains(active)) {
        e.preventDefault();
        head.focus();
      } else if (e.shiftKey && active === head) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && active === tail) {
        e.preventDefault();
        head.focus();
      }
    };
    // PG-1 · FOCUS THAT FALLS OUT ON OPENING COMES BACK. A grid inside a
    // full-screen dialog re-mounts its rows as it measures itself, and the
    // control that was just given focus goes with them: focus lands on the page
    // UNDER a modal (found in the browser — jsdom lays out no grid, and a
    // browser fires no blur for a removed element, so there is no event to
    // listen for). So it is looked at again, twice, once the body has settled.
    const reclaim = (): void => {
      if (panel && document.contains(panel) && !panel.contains(document.activeElement)) panel.focus();
    };
    const settle = [window.setTimeout(reclaim, 60), window.setTimeout(reclaim, 400)];
    document.addEventListener('keydown', onKey, true);
    return () => {
      settle.forEach((id) => window.clearTimeout(id));
      document.removeEventListener('keydown', onKey, true);
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      data-fill={fill ? '' : undefined}
      className={
        fill
          ? 'fixed inset-0 z-50 flex p-2 sm:p-6'
          : 'fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8'
      }
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        data-testid={testId ? `${testId}-scrim` : undefined}
        className="fixed inset-0 bg-navy/40 animate-overlay-in"
      />
      <div
        ref={panelRef}
        data-solid-scope=""
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid={testId}
        className={`relative w-full bg-bg-surface rounded-lg shadow-md border border-border-subtle ${
          fill ? 'flex h-full flex-col' : widthClass
        }`}
      >
        <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border-subtle">
          <div className="flex min-w-0 items-center gap-2">
            <SectionHeading as="h2" id={titleId} className="truncate">
              {title}
            </SectionHeading>
            {titleAside}
          </div>
          <button
            type="button"
            aria-label={closeLabel ?? t('ui.closePanel')}
            onClick={onClose}
            className="shrink-0 text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <X size={20} />
          </button>
        </header>
        <div data-dialog-body className={fill ? 'min-h-0 flex-1 overflow-auto p-6' : 'p-6'}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Dialog;
