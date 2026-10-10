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
import Notice, { type NoticeTone } from '../../components/ui-v2/Notice';
import { LinkButton } from '../../components/ui-v2/Actions';

const CompactNotice: React.FC<{
  tone: NoticeTone;
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
  return (
    <Notice
      tone={tone}
      icon={Info}
      className={className}
      data-testid={testId}
      action={
        <span className="flex items-center gap-2">
          {aside}
          <LinkButton
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            data-testid={`${testId}-toggle`}
          >
            {open ? t('planGrid.chrome.less') : t('planGrid.chrome.more')}
          </LinkButton>
        </span>
      }
    >
      <div className={open ? '' : 'truncate'} title={open ? undefined : `${title} — ${body}`} data-open={open}>
        <strong>{title}</strong>
        <span> — {body}</span>
      </div>
    </Notice>
  );
};

export default CompactNotice;
