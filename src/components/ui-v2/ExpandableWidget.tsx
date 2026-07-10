import React, { useEffect, useRef, useState } from 'react';
import {
  Maximize2,
  ChevronDown,
  ChevronUp,
  X,
  LucideIcon,
} from 'lucide-react';
import Data from './Data';

// ────────────────────────────────────────────────────────────────────────────
// ExpandableWidget — the reusable dashboard module-summary shell (Paragon house
// pattern, SOMO/Brain-Engine + TMS). ONE shell; every dashboard module is a thin
// adapter that feeds this contract. The per-widget work is just: hook →
// { count, live, flagSeverity, flagLabel, actionLabel, onAction, expandedRows }.
//
// Honest-by-construction lock: the honesty marker is STRUCTURAL. `live === true`
// renders the green "● Live" dot-label; `live === false` renders the amber
// "○ Sample" dot-label. The green ● Live is UNREACHABLE without live===true — a
// widget cannot claim live derived data it doesn't have (guard test enforces it).
//
// COMPACT state — "Ledger Line" (DP2-FLAG-01): the severity signal is the CARD's
// own 3px LEFT EDGE (critical=red, warning=amber, info=slate, none=no edge), so
// triage reads by scanning the grid's left margin. The big mono <Data> number is
// the hero; the flag detail is a quiet line beneath it (colored only when
// critical); the CTA is an action-blue TEXT LINK; honesty is a micro dot-label.
// No count badge, no chip, no bordered button — color only where it earns meaning.
//
// EXPANDED state: a fullscreen scrim (adapts SidePanel's overlay / Esc-close /
// role="dialog" / focus-trap mechanics, fullscreen geometry not the 480px drawer)
// showing the real rows behind the flag; every other widget is hidden.
//
// DP-1/DP-2/DP-3 canon: white surface + thin border, action-blue link, teal
// decorative only, semantic color for STATE only, JetBrains-Mono <Data> for data.
// ────────────────────────────────────────────────────────────────────────────

export type FlagSeverity = 'critical' | 'warning' | 'info' | 'none';

export interface ExpandableWidgetProps {
  title: string;
  count: number;
  /** Honest-by-construction: true → green "● Live"; false → amber "○ Sample". */
  live: boolean;
  flagSeverity?: FlagSeverity;
  flagLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Disable the action (e.g. while the command is in flight). */
  actionDisabled?: boolean;
  /** The real rows behind the flag — shown in the fullscreen expanded view. */
  expandedRows: React.ReactNode;
  icon?: LucideIcon;
}

// DP2-FLAG-01 (card scale): the severity accent is the card's own 3px left edge.
const EDGE_CLASS: Record<FlagSeverity, string> = {
  critical: 'border-l-[3px] border-l-danger',
  warning: 'border-l-[3px] border-l-warning',
  info: 'border-l-[3px] border-l-text-tertiary',
  none: '',
};

// Honest-by-construction marker: a micro dot-label, quiet in the header corner.
// live → filled green dot + "Live"; sample → hollow amber ring + "Sample".
const HonestyDot: React.FC<{ live: boolean }> = ({ live }) => (
  <span
    className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${
      live ? 'text-success' : 'text-warning-hover'
    }`}
  >
    <span
      aria-hidden="true"
      className={`h-1.5 w-1.5 rounded-full ${
        live ? 'bg-success' : 'border border-warning'
      }`}
    />
    {live ? 'Live' : 'Sample'}
  </span>
);

const ExpandableWidget: React.FC<ExpandableWidgetProps> = ({
  title,
  count,
  live,
  flagSeverity = 'none',
  flagLabel,
  actionLabel,
  onAction,
  actionDisabled = false,
  expandedRows,
  icon: Icon,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  // Scrim mechanics (adapted from SidePanel): Esc-close, a Tab focus-trap inside
  // the dialog, and focus restoration to the trigger on close.
  useEffect(() => {
    if (!expanded) return;
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpanded(false);
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      prevFocusRef.current?.focus?.();
    };
  }, [expanded]);

  // The flag's information moves to a quiet detail line under the number —
  // colored only when critical; "All clear" when there is nothing to flag.
  const detailText =
    flagLabel ?? (flagSeverity === 'none' ? 'All clear' : `${count}`);
  const detailClass =
    flagSeverity === 'critical' ? 'text-danger' : 'text-text-tertiary';

  return (
    <>
      <section
        className={`bg-bg-surface rounded-lg shadow-sm border border-border-subtle overflow-hidden ${EDGE_CLASS[flagSeverity]}`}
      >
        <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            {Icon ? (
              <Icon size={15} className="text-text-tertiary shrink-0" />
            ) : null}
            <h2 className="text-sm font-medium text-text-secondary truncate">
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <HonestyDot live={live} />
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                aria-label={`Expand ${title}`}
                onClick={() => setExpanded(true)}
                className="p-1.5 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-bg-hover transition-colors"
              >
                <Maximize2 size={15} />
              </button>
              <button
                type="button"
                aria-label={collapsed ? `Show ${title}` : `Collapse ${title}`}
                aria-expanded={!collapsed}
                onClick={() => setCollapsed((c) => !c)}
                className="p-1.5 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-bg-hover transition-colors"
              >
                {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
              </button>
            </div>
          </div>
        </header>

        {!collapsed && (
          <div className="px-5 pb-4 pt-1">
            <Data as="div" className="text-kpi leading-none text-text-primary">
              {count}
            </Data>
            <Data as="div" className={`mt-2 text-meta ${detailClass}`}>
              {detailText}
            </Data>
            {actionLabel && onAction ? (
              <button
                type="button"
                onClick={onAction}
                disabled={actionDisabled}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-action hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
              >
                {actionLabel}
                <span aria-hidden="true">→</span>
              </button>
            ) : null}
          </div>
        )}
      </section>

      {expanded && (
        <>
          <div
            aria-hidden
            onClick={() => setExpanded(false)}
            className="fixed inset-0 z-40 bg-[rgba(13,27,42,0.4)]"
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed inset-2 sm:inset-6 z-50 flex flex-col bg-bg-surface rounded-lg shadow-md border border-border-subtle"
          >
            <header className="flex items-center justify-between gap-4 px-6 py-5 border-b border-border-subtle">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-title text-text-primary truncate">
                  {title}
                </h2>
                <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-md bg-bg-hover text-text-secondary text-xs font-semibold shrink-0">
                  <Data>{count}</Data>
                </span>
                <HonestyDot live={live} />
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                aria-label="Close fullscreen"
                onClick={() => setExpanded(false)}
                className="shrink-0 text-text-tertiary hover:text-text-secondary transition-colors"
              >
                <X size={20} />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-6">{expandedRows}</div>
          </div>
        </>
      )}
    </>
  );
};

export default ExpandableWidget;
