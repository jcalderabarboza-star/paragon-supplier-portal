import React from 'react';
import { useTranslation } from 'react-i18next';
import Data from './Data';
import { CellSub } from './DataTable';
import { formatDate } from '../../lib/format';
import { ageHours, freshnessOf, maxAgeHours, type Freshness } from '../../services/masterData/freshness';
import type { MasterRecord } from '../../services/masterData/types';

// ─────────────────────────────────────────────────────────────────────────────
// MD-1 · THE REPLICA STAMP — where a master-data record came from and when it
// was read, shown on every record.
//
// A record that was not read from SAP says so here, in the neutral dashed
// sample mark: a sample record never reads as SAP's. Freshness is computed at
// `now`, which the caller supplies (the declared present); nothing stores it.
// A stale record WARNS — the warning colour is for that and for nothing else.
//
// Two forms: the line under a record's title, and `compact` for a table cell.
// ─────────────────────────────────────────────────────────────────────────────

interface ReplicaStampLineProps {
  record: MasterRecord;
  /** ISO instant freshness is judged at. */
  now: string;
  compact?: boolean;
}

const FRESHNESS_KEY: Record<Exclude<Freshness, 'FRESH'>, string> = {
  STALE: 'masterData.freshness.short.STALE',
  NOT_IN_LAST_RUN: 'masterData.freshness.short.NOT_IN_LAST_RUN',
};

const ReplicaStampLine: React.FC<ReplicaStampLineProps> = ({ record, now, compact = false }) => {
  const { t } = useTranslation();
  const { stamp } = record;
  const sample = stamp.source === 'SAMPLE';
  const freshness = freshnessOf(stamp, record.object, now);
  const days = Math.floor(ageHours(stamp, now) / 24);
  const read = days === 0 ? t('masterData.stamp.readToday') : t('masterData.stamp.readDaysAgo', { count: days });
  const attrs = { 'data-source': stamp.source, 'data-freshness': freshness };

  if (compact) {
    return (
      <span data-testid="replica-stamp-cell" {...attrs}>
        <Data>{formatDate(stamp.readAt)}</Data>
        {sample ? <CellSub>{t('masterData.stamp.sample')}</CellSub> : null}
        {freshness !== 'FRESH' ? <CellSub tone="warning">{t(FRESHNESS_KEY[freshness])}</CellSub> : null}
      </span>
    );
  }

  return (
    <p data-testid="replica-stamp" {...attrs} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-text-tertiary">
      <span className={`inline-flex items-center gap-1.5 text-label uppercase ${sample ? 'text-sample' : 'text-success'}`}>
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${sample ? 'border border-dashed border-sample' : 'bg-success'}`}
        />
        {t(`masterData.stamp.source.${stamp.source}`)}
      </span>
      <span aria-hidden="true">·</span>
      <span>{read}</span>
      {sample ? (
        <>
          <span aria-hidden="true">·</span>
          <span>{t('masterData.stamp.notFromSap')}</span>
        </>
      ) : null}
      {freshness !== 'FRESH' ? (
        <>
          <span aria-hidden="true">·</span>
          <span className="text-warning-hover">
            {freshness === 'STALE'
              ? t('masterData.freshness.STALE', { hours: maxAgeHours(record.object) })
              : t('masterData.freshness.NOT_IN_LAST_RUN', { run: stamp.missingFromRun })}
          </span>
        </>
      ) : null}
    </p>
  );
};

export default ReplicaStampLine;
