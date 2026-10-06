// ────────────────────────────────────────────────────────────────────────────
// RFx-1 · THE STAGE TIMELINE — one rendering, on the buyer's panel and on the
// supplier's card.
//
// It shows the path THIS event takes: an event started at RFP has no RFI step,
// and an event with no stages is one step, RFQ. Each step reads done, current
// or upcoming, with the day it was left; the last line says how the event
// ended, when it has. Everything is derived from the event's own `stage`,
// `stageHistory` and `status` — no supplier is named here, so the same
// component is safe on both sides of the tenancy boundary.
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { RFQStatus } from '../../data/mockRfqs';
import { stageOf, stagePathOf, type RfqStage, type StageAdvance } from '../../data/rfqStage';
import { formatDate } from '../../lib/format';
import Data from '../../components/ui-v2/Data';

interface StageTimelineProps {
  event: {
    readonly status: RFQStatus;
    readonly stage?: RfqStage;
    readonly stageHistory?: readonly StageAdvance[];
  };
  testId?: string;
}

/** The three ways an event is over. */
const isEnded = (status: RFQStatus): boolean =>
  status === 'Awarded' || status === 'Concluded' || status === 'Cancelled';

export const StageTimeline: React.FC<StageTimelineProps> = ({ event, testId = 'stage-timeline' }) => {
  const { t } = useTranslation();
  const path = stagePathOf(event);
  const current = stageOf(event);
  const at = path.indexOf(current);
  const ended = isEnded(event.status);

  return (
    <div data-testid={testId}>
      <ol className="flex flex-wrap items-stretch gap-2">
        {path.map((stage, i) => {
          const state = i < at ? 'done' : i > at ? 'upcoming' : ended ? 'done' : 'current';
          const left = (event.stageHistory ?? []).find((a) => a.from === stage);
          return (
            <li
              key={stage}
              data-testid={`${testId}-${stage}`}
              data-state={state}
              className={`flex-1 min-w-[8.5rem] rounded-md border px-3 py-2 ${
                state === 'current'
                  ? 'border-action bg-action-soft/40'
                  : state === 'done'
                    ? 'border-border-subtle bg-bg-hover'
                    : 'border-dashed border-border-subtle'
              }`}
            >
              <div className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                {state === 'done' && <Check size={13} className="text-success" />}
                {stage}
              </div>
              <div className="text-[11px] text-text-tertiary">{t(`sourcing.stage.name.${stage}`)}</div>
              <div className="text-[11px] text-text-secondary mt-1">
                {left ? (
                  <>
                    {t('sourcing.stage.left')} <Data>{formatDate(left.advancedAt)}</Data>
                  </>
                ) : (
                  t(`sourcing.stage.state.${state}`)
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {ended && (
        <p className="text-xs text-text-secondary mt-2" data-testid={`${testId}-outcome`}>
          {t(`sourcing.stage.outcome.${event.status}`, { stage: current })}
        </p>
      )}
    </div>
  );
};

export default StageTimeline;
