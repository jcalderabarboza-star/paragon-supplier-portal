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
import Table from '../ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../ui-v2/TableHeader';
import TableRow from '../ui-v2/TableRow';
import TableCell from '../ui-v2/TableCell';
import Data from '../ui-v2/Data';
import { personLabel } from '../../services/identity/personLabel';
import { formatDate } from '../../lib/format';
import { deriveAgreementHistory } from '../../services/delivery/history';
import type { SchedulingAgreement } from '../../services/delivery';

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

  return (
    <section
      className="border border-border-subtle rounded-lg bg-white overflow-hidden mt-6"
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
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('delivery.history.colAct')}</TableHeaderCell>
              <TableHeaderCell>{t('delivery.history.colLine')}</TableHeaderCell>
              <TableHeaderCell>{t('delivery.history.colActor')}</TableHeaderCell>
              <TableHeaderCell>{t('delivery.history.colWhen')}</TableHeaderCell>
            </TableHeader>
            <tbody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>
                    <span className="text-sm text-text-primary">
                      {t(`delivery.history.act.${row.kind}`)}
                    </span>
                    {row.reason && (
                      <div className="text-[10px] italic text-text-tertiary mt-0.5">
                        {row.reason}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Data className="text-xs">
                      {row.releaseSeq === undefined
                        ? t('delivery.history.itemRef', { material: row.materialCode })
                        : t('delivery.history.lineRef', {
                            material: row.materialCode,
                            seq: row.releaseSeq,
                          })}
                    </Data>
                  </TableCell>
                  <TableCell>
                    {row.actor.kind === 'RESOLVED' ? (
                      // THE ONE RESOLVER. It is what appends `(SAMPLE)`, so the
                      // marker cannot be forgotten at this call site.
                      <span className="text-sm text-text-primary">
                        {personLabel(row.actor.person.personId, t)}
                      </span>
                    ) : (
                      <span className="text-xs italic text-text-tertiary">
                        {t('delivery.history.noActor')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Data className="text-sm">{formatDate(row.at)}</Data>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
          <div className="px-4 py-2 text-[10px] italic text-text-tertiary border-t border-border-subtle">
            {t('delivery.history.seedNote')}
          </div>
        </>
      )}
    </section>
  );
};

export default ChangeHistory;
