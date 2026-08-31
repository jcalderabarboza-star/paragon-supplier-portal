// ────────────────────────────────────────────────────────────────────────────
// SidePanel — the slide-over detail surface.
//
// ⚠️ **THE CONTRACT: A CLOSED PANEL RENDERS NOTHING. NOT HIDDEN — ABSENT.**
//
// This component used to render its `<aside>` unconditionally and express
// "closed" as `aria-hidden={!open}` plus `translate-x-full`. Neither of those
// removes anything: a transform moves pixels, and `aria-hidden` is a promise to
// assistive tech, not a change to the DOM or the tab order. So every closed
// panel kept its entire subtree ALIVE — clickable, focusable, and queryable.
//
// ⚠️ **THAT WAS FOUND THREE TIMES, BY THREE DIFFERENT BATCHES, EACH BY
// ACCIDENT** — and being found three times is the argument for changing the
// contract rather than patching a caller a fourth time:
//   · C.2  — deriving `open=` alone would have moved a LIVE, CLICKABLE Submit
//            off-screen and called it gated.
//   · Wave C — a second always-mounted panel duplicated every control
//            permanently; ten red tests found it.
//   · Wave B — confirmed the mechanism directly, and Wave A then shipped a
//            spec-level WORKAROUND (`within(aside[role="dialog"])`) rather than
//            a fix, with a comment saying so.
// **No instrument in this repository could see it**, which is why it survived:
// every discovery was a side effect of looking at something else.
//
// ── WHAT WAS MEASURED, NOT ASSUMED ──────────────────────────────────────────
// Rendering all 15 consumers with nothing selected and counting focusable
// elements inside the CLOSED `aside`:
//   · the FLOOR was 1, never 0 — the panel's own close button, so even a
//     perfectly-guarded consumer leaked one control;
//   · FOUR consumers leaked far more, because their panels have no selection to
//     guard on: `BuyerRequisitions` (new PR), `SupplierDocuments` (lesson +
//     declaration), `SupplierForecasts` (four panels), `SupplierInvoices`
//     (new invoice) — 45 live controls between them, inputs and submits
//     included.
// And the accessibility half, measured the same way: the closed subtree carried
// `aria-hidden="true"` over controls with `tabIndex=0`, no `inert`, and
// `element.focus()` SUCCEEDED. `aria-hidden` on focusable content is the
// hidden-but-reachable trap — a screen reader is told to ignore what the
// keyboard can still land on.
//
// ── THE TRADE, STATED RATHER THAN HIDDEN ────────────────────────────────────
// The old slide was a CSS *transition*, which needs the element to persist so a
// class change has something to interpolate from. Unmounting removes that, so
// the ENTER is now a CSS *animation* (`animate-panel-in`) — a keyframe plays on
// mount, needing no previous frame — and the EXIT is immediate rather than
// animated. **An exit animation is not worth a live control in a hidden
// subtree**, and a delayed unmount would buy it back only by reintroducing a
// window in which exactly this defect exists again, on a timer.
//
// ⚠️ **WHAT ENFORCES THE CONTRACT IS THIS EARLY RETURN, NOT A TEST.** The
// subtree cannot leak because it is never built. `SidePanel.contract.test.tsx`
// exists to catch a REGRESSION of this line, not to hold the property up.
// ────────────────────────────────────────────────────────────────────────────

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footerActions?: React.ReactNode;
}

const SidePanel: React.FC<SidePanelProps> = ({
  open,
  onClose,
  title,
  children,
  footerActions,
}) => {
  const { t } = useTranslation();
  // Hooks run unconditionally and the early return sits BELOW them — the
  // ordering is load-bearing, not stylistic.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // THE CONTRACT, in one line.
  if (!open) return null;

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-[rgba(13,27,42,0.4)] animate-overlay-in"
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="fixed top-0 right-0 z-50 h-screen w-full sm:w-[480px] bg-bg-surface shadow-md border-l border-border-subtle flex flex-col animate-panel-in"
      >
        <header className="flex items-center justify-between gap-4 px-6 py-5 border-b border-border-subtle">
          <h2 className="text-base font-semibold text-text-primary truncate">
            {title}
          </h2>
          <button
            type="button"
            aria-label={t('ui.closePanel')}
            onClick={onClose}
            className="shrink-0 text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <X size={20} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footerActions && (
          <footer className="border-t border-border-subtle px-6 py-4 flex justify-end gap-2">
            {footerActions}
          </footer>
        )}
      </aside>
    </>
  );
};

export default SidePanel;
