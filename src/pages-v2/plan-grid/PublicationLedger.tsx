// ────────────────────────────────────────────────────────────────────────────
// B4b · PublicationLedger — a publication's history (Design 2 §2.3): opened,
// published, superseded, withdrawn; by which role, when. Rendered under the
// grid's publication panel and on /buyer/collaboration, from the SAME rows.
//
// ⚠️ THE ROLE IS DERIVED, NEVER STORED. A ledger row records the verb; the role
// is the lane holding that verb's atom, read from the flow at render — so a
// re-bundled lane re-labels its history truthfully instead of freezing
// yesterday's bundle into the record. A verb no person's lane holds is the
// machine's own act (the supersede cascade), and says so.
//
// ⚠️ A PERSON IS A STAMP. `personId` is resolved through `personLabel` — the one
// resolver, which carries the (SAMPLE) marker — and never printed raw.
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import Data from '../../components/ui-v2/Data';
import { formatDate } from '../../lib/format';
import { personLabel } from '../../services/identity/personLabel';
import { getTransition } from '../../services/transitions/registry';
import { rolesHolding } from '../../services/transitions/businessRoles';
import { ownerLabelKeys } from '../../services/transitions/handoff';
import type { PublicationDocument, PublicationLedgerVerb } from '../../services/sdc';

/** The label keys of the lanes that hold a ledger verb's atom — empty for a machine act. */
export function ledgerRoleKeys(verb: PublicationLedgerVerb): readonly string[] {
  const atom = getTransition(verb)?.requiredRole;
  return atom ? ownerLabelKeys(rolesHolding(atom)) : [];
}

interface LedgerRow {
  readonly publicationId: string;
  readonly planVersion: string;
  readonly verb: PublicationLedgerVerb;
  readonly at: string;
  readonly seq: number;
  readonly personId: string | null;
  readonly seeded: boolean;
  readonly reason?: string;
}

/**
 * Every ledger row of `records`, newest first — by instant, then by the order
 * the store recorded the act (`seq`), because a frozen clock gives an open, its
 * publish and the supersede that publish cascades ONE instant.
 */
export function ledgerRows(records: readonly PublicationDocument[]): readonly LedgerRow[] {
  return records
    .flatMap((r) =>
      r.ledger.map((e) => ({
        publicationId: r.publicationId,
        planVersion: r.planVersion,
        verb: e.verb,
        at: e.at,
        seq: e.seq,
        personId: e.personId,
        seeded: e.seeded === true,
        ...(e.reason ? { reason: e.reason } : {}),
      })),
    )
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || b.seq - a.seq);
}

const PublicationLedger: React.FC<{ records: readonly PublicationDocument[]; testId: string }> = ({ records, testId }) => {
  const { t } = useTranslation();
  const rows = ledgerRows(records);
  return (
    <div data-testid={testId}>
      <div className="mb-1 text-label uppercase text-text-tertiary">{t('planGrid.publication.ledger.title')}</div>
      {rows.length === 0 ? (
        <p className="text-xs text-text-tertiary">{t('planGrid.publication.ledger.empty')}</p>
      ) : (
        <table className="w-full text-xs">
          <thead className="text-left text-text-tertiary">
            <tr>
              <th className="py-1 pr-2 font-medium">{t('planGrid.publication.ledger.when')}</th>
              <th className="py-1 pr-2 font-medium">{t('planGrid.publication.ledger.act')}</th>
              <th className="py-1 pr-2 font-medium">{t('planGrid.publication.ledger.publication')}</th>
              <th className="py-1 pr-2 font-medium">{t('planGrid.publication.ledger.role')}</th>
              <th className="py-1 font-medium">{t('planGrid.publication.ledger.person')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const roles = ledgerRoleKeys(r.verb);
              return (
                <tr key={`${r.publicationId}-${r.verb}-${i}`} className="border-t border-border-subtle align-top" data-testid="publication-ledger-row">
                  <td className="py-1 pr-2">
                    <Data>{formatDate(r.at)}</Data>
                  </td>
                  <td className="py-1 pr-2">
                    {t(`planGrid.publication.ledger.verb.${r.verb}`)}
                    {r.reason && <span className="text-text-secondary"> — “{r.reason}”</span>}
                  </td>
                  <td className="py-1 pr-2">
                    <Data>{r.publicationId}</Data> · <Data>{r.planVersion}</Data>
                  </td>
                  <td className="py-1 pr-2">
                    {roles.length > 0 ? roles.map((k) => t(k)).join(' / ') : t('planGrid.publication.ledger.machine')}
                  </td>
                  <td className="py-1 text-text-secondary">
                    {r.seeded
                      ? t('planGrid.publication.ledger.seeded')
                      : r.personId
                        ? personLabel(r.personId, t)
                        : roles.length > 0
                          ? t('planGrid.publication.ledger.noPerson')
                          : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default PublicationLedger;
