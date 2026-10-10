import React from 'react';
import type { LucideIcon } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// UI-1c-3 · THE ONE NOTICE.
//
// A notice is something the page SAYS to the reader beside the work: a refusal,
// a warning, a pending ruling, a sample marker, a note. Operator ruling, 9
// October 2026: the left-rule style everywhere. The inventory found 142 of them
// written by hand in 52 files, in 55 box signatures — a left rule or a full
// border, three radii, two paddings, five tints.
//
//   tone      info · warning · critical · success · neutral · sample
//             (sample is neutral and DASHED, with no hue — amber is for real
//             warnings only)
//   title     Inter 14 semibold
//   body      Inter 14 regular
//   icon      optional, in the tone's colour
//   action    optional, on the right — a button or a link
//
// `className` is for layout only. The words inside take no size, weight or
// colour of their own.
// ─────────────────────────────────────────────────────────────────────────────

export type NoticeTone = 'info' | 'warning' | 'critical' | 'success' | 'neutral' | 'sample';

export const NOTICE_TONE: Record<NoticeTone, { box: string; icon: string }> = {
  info: { box: 'border-action bg-action-soft', icon: 'text-action' },
  warning: { box: 'border-warning bg-warning-soft', icon: 'text-warning' },
  critical: { box: 'border-critical bg-critical-soft', icon: 'text-critical' },
  success: { box: 'border-success bg-success-soft', icon: 'text-success' },
  neutral: { box: 'border-border-input bg-bg-hover', icon: 'text-text-tertiary' },
  sample: { box: 'border-dashed border-sample-border bg-sample-soft', icon: 'text-text-tertiary' },
};

export const NOTICE_BOX = 'rounded-r-md border-l-4 px-4 py-3 font-sans text-sm font-normal';
export const NOTICE_TITLE = 'font-semibold text-text-primary';
export const NOTICE_BODY = 'text-text-secondary';

interface NoticeProps {
  tone?: NoticeTone;
  /** The notice in a few words. Left out, the body stands alone. */
  title?: React.ReactNode;
  /** What the notice says. */
  children?: React.ReactNode;
  icon?: LucideIcon;
  /** A button or a link, on the right. */
  action?: React.ReactNode;
  /**
   * `note` unless the page says otherwise. A refusal the reader must hear is
   * `alert`; a result that arrives while they wait is `status`.
   */
  role?: 'note' | 'alert' | 'status';
  /** Layout only. */
  className?: string;
  id?: string;
  'data-testid'?: string;
  'aria-live'?: 'polite' | 'assertive' | 'off';
}

const Notice: React.FC<NoticeProps> = ({
  tone = 'info',
  title,
  children,
  icon: Icon,
  action,
  role = 'note',
  className = '',
  id,
  'data-testid': testId,
  'aria-live': live,
}) => {
  const hasBody = children !== undefined && children !== null && children !== false;
  return (
    <div
      id={id}
      role={role}
      aria-live={live}
      data-testid={testId}
      data-notice={tone}
      className={`flex items-start gap-3 ${NOTICE_BOX} ${NOTICE_TONE[tone].box} ${className}`}
    >
      {Icon ? <Icon size={16} aria-hidden="true" className={`mt-0.5 shrink-0 ${NOTICE_TONE[tone].icon}`} /> : null}
      <div className="min-w-0 flex-1">
        {title ? <div className={NOTICE_TITLE}>{title}</div> : null}
        {hasBody ? <div className={`${NOTICE_BODY} ${title ? 'mt-0.5' : ''}`}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
};

export default Notice;
