// ────────────────────────────────────────────────────────────────────────────
// PLN-5 · CompactNotice — an honesty banner in ONE line, the rest one click away.
//
// The plan views opened under two full banners (the planning sandbox, the
// SIMULATED SOMO plan) and a publication panel, and at 1600×900 the grid began
// BELOW the fold (measured on built main: the grid's top at 929 px). The banners
// are not optional — they say before any number that the numbers are simulated —
// so they are SUMMARISED, never removed: the title and the start of the body stay
// in sight, the whole statement is in the DOM (a screen reader and a spec read it
// all), and "Details" unfolds it.
// ────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TONE = {
  info: { box: 'border-info/30 bg-info-soft', title: 'text-info' },
  warning: { box: 'border-warning/40 bg-warning-soft', title: 'text-warning-hover' },
} as const;

const CompactNotice: React.FC<{
  tone: keyof typeof TONE;
  title: string;
  body: string;
  /** Beside the toggle — a liveness pill, say. */
  aside?: React.ReactNode;
  testId: string;
  className?: string;
}> = ({
  tone,
  title,
  body,
  aside,
  testId,
  // i18n-defer: a Tailwind class name, not copy — the notice's TEXT is `title` and `body`.
  className = 'mb-2',
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const c = TONE[tone];
  return (
    <div className={`flex items-start gap-2 rounded-md border px-3 py-1.5 text-xs ${c.box} ${className}`} data-testid={testId} data-open={open}>
      <Info size={14} className={`mt-px shrink-0 ${c.title}`} aria-hidden="true" />
      <div className={`min-w-0 flex-1 ${open ? '' : 'truncate'}`} title={open ? undefined : `${title} — ${body}`}>
        <span className={`font-semibold ${c.title}`}>{title}</span>
        <span className="text-text-secondary"> — {body}</span>
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
      <button
        type="button"
        className="shrink-0 font-medium text-action-text hover:underline"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        data-testid={`${testId}-toggle`}
      >
        {open ? t('planGrid.chrome.less') : t('planGrid.chrome.more')}
      </button>
    </div>
  );
};

export default CompactNotice;
