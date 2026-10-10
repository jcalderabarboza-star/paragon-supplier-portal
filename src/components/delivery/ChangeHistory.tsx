// ─────────────────────────────────────────────────────────────────────────────
// ChangeHistory — the delivery lane's stamps, read at last.
//
// `releasedAt`, `adjustedAt`, `confirmedAt` and `activeChangedAt` have been on
// the model since the lane was authored, and nothing read any of them. A stamp
// with no reader is a field that LOOKS like an audit trail and answers no
// question — and "change history" is a named RFP element, so the honest remedy
// is a reader rather than another stamp.
//
// ⚠️ **THE ACTOR RENDERS THROUGH THE ONE RESOLVER, WHICH IS WHAT MAKES THE
// `(SAMPLE)` MARKER STRUCTURAL.** `personLabel()` is the single read-time
// resolver (C10 §8.2 / D-ID-7); a stamp carries a `personId` and nothing else.
// Formatting a name here would be the fifth call site that has to REMEMBER to
// append the marker, which is exactly the shape that resolver exists to retire.
//
// ⚠️ **AND AN UNATTRIBUTED ROW SAYS SO IN WORDS.** Every act taken in a session
// names a person, because the dispatcher refuses an unattributed seat on all
// four delivery verbs (Q6). The rows that carry no person are the SEEDED ones,
// released at fixture-build time in no session at all — so the copy reads *"not
// recorded — no person in session"*, which is the truth about them, rather than
// a blank cell that reads as a redaction.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import DataTable, { CellSub, type Column } from '../ui-v2/DataTable';
import Data from '../ui-v2/Data';
import { Card } from '../ui-v2/Card';
import { personLabel } from '../../services/identity/personLabel';
import { formatDate } from '../../lib/format';
import { deriveAgreementHistory } from '../../services/delivery/history';
import type { SchedulingAgreement } from '../../services/delivery';

type HistoryRow = ReturnType<typeof deriveAgreementHistory>[number];

/**
 * One agreement's recorded acts, newest first.
 *
 * Derived at render from the agreement's own rows — there is no history table
 * to fall out of step with the thing it describes, and a row cannot exist for
 * an act the model does not carry.
 */
const ChangeHistory: React.FC<{ agreement: SchedulingAgreement }> = ({ agreement }) => {
  const { t } = useTranslation();
  const rows = deriveAgreementHistory(agreement);

  const columns: Column<HistoryRow>[] = [
    {
      id: 'act',
      header: t('delivery.history.colAct'),
      kind: 'text',
      cell: (row) => (
        <>
          {t(`delivery.history.act.${row.kind}`)}
          {row.reason && <CellSub className="italic">{row.reason}</CellSub>}
        </>
      ),
    },
    {
      id: 'line',
      header: t('delivery.history.colLine'),
      kind: 'id',
      cell: (row) => (
        <Data>
          {row.releaseSeq === undefined
            ? t('delivery.history.itemRef', { material: row.materialCode })
            : t('delivery.history.lineRef', {
                material: row.materialCode,
                seq: row.releaseSeq,
              })}
        </Data>
      ),
    },
    {
      id: 'actor',
      header: t('delivery.history.colActor'),
      kind: 'text',
      cell: (row) =>
        row.actor.kind === 'RESOLVED' ? (
          // THE ONE RESOLVER. It is what appends `(SAMPLE)`, so the
          // marker cannot be forgotten at this call site.
          personLabel(row.actor.person.personId, t)
        ) : (
          <span className="italic">{t('delivery.history.noActor')}</span>
        ),
    },
    {
      id: 'when',
      header: t('delivery.history.colWhen'),
      kind: 'date',
      cell: (row) => <Data>{formatDate(row.at)}</Data>,
    },
  ];

  return (
    <Card
      as="section"
      padding="none"
      className="overflow-hidden mt-6"
      data-testid="delivery-change-history"
    >
      <div className="px-4 py-3 border-b border-border-subtle bg-bg-subtle">
        <span className="text-sm font-semibold text-text-primary">
          {t('delivery.history.title')}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-6 text-sm text-text-tertiary">{t('delivery.history.empty')}</div>
      ) : (
        <>
          <DataTable columns={columns} rows={rows} rowKey={(row) => row.key} card={false} />
          <div className="px-4 py-2 text-[10px] italic text-text-tertiary border-t border-border-subtle">
            {t('delivery.history.seedNote')}
          </div>
        </>
      )}
    </Card>
  );
};

export default ChangeHistory;
