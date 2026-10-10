import React, { useEffect, useId, useRef } from 'react';
import SectionHeading from './SectionHeading';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
}

const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  children,
  testId,
  // i18n-defer: a Tailwind class name, not copy — it reaches `className`, never a reader.
  widthClass = 'max-w-2xl',
}) => {
  const { t } = useTranslation();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
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
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div
        aria-hidden="true"
        onClick={onClose}
        data-testid={testId ? `${testId}-scrim` : undefined}
        className="fixed inset-0 bg-navy/40 animate-overlay-in"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid={testId}
        className={`relative w-full ${widthClass} bg-bg-surface rounded-lg shadow-md border border-border-subtle`}
      >
        <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border-subtle">
          <SectionHeading as="h2" id={titleId}>
            {title}
          </SectionHeading>
          <button
            type="button"
            aria-label={t('ui.closePanel')}
            onClick={onClose}
            className="shrink-0 text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <X size={20} />
          </button>
        </header>
        <div data-dialog-body className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Dialog;
