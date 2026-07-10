import React, { useEffect, useRef, useState } from 'react';
import {
  Maximize2,
  ChevronDown,
  ChevronUp,
  X,
  LucideIcon,
} from 'lucide-react';
import StatusPill from './StatusPill';
import Button from './Button';
import Data from './Data';

// ────────────────────────────────────────────────────────────────────────────
// ExpandableWidget — the reusable dashboard module-summary shell (Paragon house
// pattern, SOMO/Brain-Engine + TMS). ONE shell; every dashboard module is a thin
// adapter that feeds this contract. The per-widget work is just: hook →
// { count, live, flagSeverity, flagLabel, actionLabel, onAction, expandedRows }.
//
// Honest-by-construction lock: the honesty pill is STRUCTURAL. `live === true`
// renders the green "Live" pill; `live === false` renders the amber "Sample
// data" pill. The green pill is UNREACHABLE without live===true — a widget
// cannot claim live derived data it doesn't have (guard test enforces this).
//
// COMPACT state: headline count + urgency flag (StatusPill by severity) + one
// 1-click action (DP2-BUTTON-01: the action is the surface's single primary).
// EXPANDED state: a fullscreen scrim (adapts SidePanel's overlay / Esc-close /
// role="dialog" / focus-trap mechanics, fullscreen geometry not the 480px
// drawer) showing the real rows behind the flag; every other widget is hidden.
// The collapse chevron toggles the compact body to a header-only height.
//
// DP-1/DP-2/DP-3 canon: white surface + thin border, action-blue primary CTA,
// semantic pills only for true state, JetBrains-Mono <Data> for every count.
// ────────────────────────────────────────────────────────────────────────────

export type FlagSeverity = 'none' | 'success' | 'warning' | 'danger';

export interface ExpandableWidgetProps {
  title: string;
  count: number;
  /** Honest-by-construction: true → green "Live"; false → amber "Sample data". */
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

const HonestyPill: React.FC<{ live: boolean }> = ({ live }) => (
  <StatusPill variant={live ? 'success' : 'warning'}>
    {live ? 'Live' : 'Sample data'}
  </StatusPill>
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

  const flag =
    flagSeverity !== 'none' ? (
      <StatusPill variant={flagSeverity}>{flagLabel ?? `${count}`}</StatusPill>
    ) : (
      <StatusPill variant="neutral">All clear</StatusPill>
    );

  return (
    <>
      <section className="bg-bg-surface rounded-lg shadow-sm border border-border-subtle overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2 min-w-0">
            {Icon ? (
              <Icon size={16} className="text-text-tertiary shrink-0" />
            ) : null}
            <h2 className="text-section text-text-primary truncate">{title}</h2>
            <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-md bg-bg-hover text-text-secondary text-xs font-semibold shrink-0">
              <Data>{count}</Data>
            </span>
            <HonestyPill live={live} />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              aria-label={`Expand ${title}`}
              onClick={() => setExpanded(true)}
              className="p-1.5 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-bg-hover transition-colors"
            >
              <Maximize2 size={16} />
            </button>
            <button
              type="button"
              aria-label={collapsed ? `Show ${title}` : `Collapse ${title}`}
              aria-expanded={!collapsed}
              onClick={() => setCollapsed((c) => !c)}
              className="p-1.5 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-bg-hover transition-colors"
            >
              {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          </div>
        </header>

        {!collapsed && (
          <div className="px-5 py-4">
            <div className="flex items-end justify-between gap-4">
              <Data as="div" className="text-kpi text-text-primary">
                {count}
              </Data>
              {flag}
            </div>
            {actionLabel && onAction ? (
              <div className="mt-4">
                <Button
                  variant="primary"
                  onClick={onAction}
                  disabled={actionDisabled}
                >
                  {actionLabel}
                </Button>
              </div>
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
                <HonestyPill live={live} />
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
