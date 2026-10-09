// ─────────────────────────────────────────────────────────────────────────────
// OPS-2 · MATERIAL APPLICABILITY — where Compliance rules.
//
// R-OPS P0-5: receiving refused a material nobody had ruled on, and told the
// clerk "until someone rules on it" — with no surface on which anybody could.
// This is that surface. One row per material in the master; per regime, where
// it stands (applies / does not apply / pending), on whose word (the material
// master, or a named ruling), and the control that records a ruling.
//
// A ruling is an ACT on a ledger (`t_material_ruling_set`): it is never edited,
// a later one supersedes it, and the history stays on the row. Only a seat
// holding `material:rule` rules; every other seat reads, and is told whose act
// it is in the slot the control would occupy.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Table from '../../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../../components/ui-v2/TableHeader';
import TableRow from '../../components/ui-v2/TableRow';
import TableCell from '../../components/ui-v2/TableCell';
import Button from '../../components/ui-v2/Button';
import Data from '../../components/ui-v2/Data';
import FilterChipsBar from '../../components/ui-v2/FilterChipsBar';
import { HandoffNotice } from '../../components/ui-v2/HandoffNotice';
import { useToast } from '../../hooks/useToast';
import { useRefusalText } from '../../hooks/useRefusalText';
import { useVerbAvailability } from '../../hooks/useVerbAvailability';
import { useCurrentIdentity } from '../../context/CurrentIdentityContext';
import { useMaterialRulings } from '../../services/query/hooks';
import { useMaterialRulingSet } from '../../services/query/commandHooks';
import { personLabel } from '../../services/identity/personLabel';
import { formatDate } from '../../lib/format';
import {
  RULING_REGIMES,
  materialApplicabilityRows,
  rulingHistory,
  type MaterialApplicabilityRow,
  type MaterialRuling,
  type RulingRegime,
} from '../../services/sdc/materialRuling';

type RowFilter = 'pending' | 'ruled' | 'all';

/** A row is pending when either regime has no answer a ruling could give. */
/** One regime's answer on a row — read by name, so each field has a reader. */
const outcomeOf = (row: MaterialApplicabilityRow, regime: RulingRegime) =>
  regime === 'halal' ? row.halal : row.bpom;

export const rowIsPending = (row: MaterialApplicabilityRow): boolean =>
  RULING_REGIMES.some((regime) => {
    const o = outcomeOf(row, regime);
    return !o.ok && o.reason === 'UNDETERMINED_APPLICABILITY';
  });

/** A row is ruled when Compliance has ruled on it under either regime. */
export const rowIsRuled = (row: MaterialApplicabilityRow): boolean =>
  RULING_REGIMES.some((regime) => {
    const o = outcomeOf(row, regime);
    return o.ok && o.ruling !== null;
  });

// The verb's refusals, each to its own sentence. Keyed on the refusal HEAD.
const RULING_REFUSAL_KEY: Readonly<Record<string, string>> = Object.freeze({
  RULING_REGIME_UNKNOWN: 'compliance.applicability.refused.regime',
  RULING_MALFORMED: 'compliance.applicability.refused.malformed',
  RULING_REASON_BLANK: 'compliance.applicability.refused.reasonBlank',
  RULING_UNCHANGED: 'compliance.applicability.refused.unchanged',
  RULING_ACTOR_UNATTRIBUTED: 'compliance.applicability.refused.unattributed',
});

const rulingRefusalKey = (reason: string | undefined): string | null => {
  if (!reason) return null;
  const head = Object.keys(RULING_REFUSAL_KEY).find((h) => reason.includes(`${h}:`));
  return head ? RULING_REFUSAL_KEY[head] : null;
};

interface Draft {
  materialCode: string;
  regime: RulingRegime;
  applicable: boolean | null;
  reason: string;
}

const MaterialApplicabilityPanel: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const { identity } = useCurrentIdentity();
  const canRule = useVerbAvailability('material:rule');
  const rulingsQuery = useMaterialRulings();
  const setRuling = useMaterialRulingSet();
  const [filter, setFilter] = useState<RowFilter>('pending');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [historyOf, setHistoryOf] = useState<string | null>(null);

  const rulings: readonly MaterialRuling[] = useMemo(
    () => rulingsQuery.data?.items ?? [],
    [rulingsQuery.data],
  );
  const rows = useMemo(() => materialApplicabilityRows(rulings), [rulings]);
  const counts = useMemo(
    () => ({
      pending: rows.filter(rowIsPending).length,
      ruled: rows.filter(rowIsRuled).length,
      all: rows.length,
    }),
    [rows],
  );
  const shown = useMemo(
    () =>
      rows.filter((r) =>
        filter === 'pending' ? rowIsPending(r) : filter === 'ruled' ? rowIsRuled(r) : true,
      ),
    [rows, filter],
  );

  const person = (r: MaterialRuling): string =>
    r.setBy.kind === 'RESOLVED'
      ? personLabel(r.setBy.person.personId, t)
      : t('identity.actor.unknown');

  const commit = () => {
    if (!draft || draft.applicable === null) return;
    const { materialCode, regime, applicable, reason } = draft;
    setRuling.mutate(
      { materialCode, regime, applicable, reason },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            const key = rulingRefusalKey(res.reason);
            toast({
              variant: 'warning',
              title: t('compliance.applicability.failed.title', { material: materialCode }),
              description: key
                ? t(key)
                : (refusalText(res.reason) ?? res.reason ?? ''),
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('compliance.applicability.done.title', { material: materialCode }),
            description: t(
              `compliance.applicability.done.${regime}.${applicable ? 'applies' : 'notApplicable'}`,
            ),
          });
          setDraft(null);
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('compliance.applicability.failed.title', { material: materialCode }),
            description: t('compliance.applicability.failed.denied'),
          }),
      },
    );
  };

  const cell = (row: MaterialApplicabilityRow, regime: RulingRegime) => {
    const o = outcomeOf(row, regime);
    const applies = regime === 'halal' ? row.halal.ok && row.halal.required : row.bpom.ok && row.bpom.applicable;
    const stateKey = !o.ok
      ? o.reason === 'UNDETERMINED_APPLICABILITY'
        ? 'pending'
        : 'unknown'
      : applies
        ? 'applies'
        : 'notApplicable';
    const tone =
      stateKey === 'pending'
        ? 'text-warning-hover'
        : stateKey === 'unknown'
          ? 'text-critical'
          : 'text-text-primary';
    return (
      <div className="flex flex-col gap-1" data-testid={`applicability-${regime}-${row.materialCode}`}>
        <span className={`text-sm font-medium ${tone}`}>
          {t(`compliance.applicability.state.${stateKey}`)}
        </span>
        <span className="text-xs text-text-tertiary">
          {o.ok && o.ruling
            ? t('compliance.applicability.basis.ruling', {
                person: person(o.ruling),
                date: formatDate(o.ruling.setAt.slice(0, 10)),
              })
            : o.ok
              ? t(`compliance.applicability.basis.master.${regime}`)
              : t('compliance.applicability.basis.none')}
        </span>
        {canRule.kind === 'held' ? (
          <button
            type="button"
            className="self-start text-xs font-medium text-action-text hover:underline"
            data-testid={`applicability-rule-${regime}-${row.materialCode}`}
            onClick={() =>
              setDraft({ materialCode: row.materialCode, regime, applicable: null, reason: '' })
            }
          >
            {t('compliance.applicability.action.rule')}
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm mb-6 overflow-hidden"
      data-testid="material-applicability"
    >
      <div className="px-5 py-4 border-b border-border-subtle flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-text-primary">
            {t('compliance.applicability.title')}
          </h2>
          <p className="text-xs text-text-tertiary mt-0.5 max-w-3xl">
            {t('compliance.applicability.subtitle')}
          </p>
        </div>
        {/* Withheld renders as the wait with its owner, in the control's slot. */}
        {canRule.kind !== 'held' && (
          <HandoffNotice availability={canRule} testId="handoff-material-rule" />
        )}
      </div>

      <div className="px-5 py-3 border-b border-border-subtle">
        <FilterChipsBar<RowFilter>
          options={[
            { id: 'pending', label: t('compliance.applicability.filter.pending', { count: counts.pending }) },
            { id: 'ruled', label: t('compliance.applicability.filter.ruled', { count: counts.ruled }) },
            { id: 'all', label: t('compliance.applicability.filter.all', { count: counts.all }) },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </div>

      {rulingsQuery.isPending ? (
        <div className="px-5 py-6 text-sm text-text-tertiary" role="status">
          {t('compliance.applicability.loading')}
        </div>
      ) : rulingsQuery.isError ? (
        <div className="px-5 py-6 text-sm text-critical" role="alert">
          {t('compliance.applicability.readFailed')}
        </div>
      ) : shown.length === 0 ? (
        <div className="px-5 py-6 text-sm text-text-tertiary" data-testid="applicability-empty">
          {t(`compliance.applicability.empty.${filter}`)}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('compliance.applicability.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('compliance.applicability.col.halal')}</TableHeaderCell>
            <TableHeaderCell>{t('compliance.applicability.col.bpom')}</TableHeaderCell>
            <TableHeaderCell>{t('compliance.applicability.col.history')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {shown.map((row) => {
              const history = RULING_REGIMES.flatMap((regime) =>
                rulingHistory(rulings, row.materialCode, regime),
              ).sort((a, b) => b.seq - a.seq);
              const editing = draft?.materialCode === row.materialCode ? draft : null;
              return (
                <React.Fragment key={row.materialCode}>
                  <TableRow>
                    <TableCell>
                      <Data as="div" className="text-xs font-bold text-text-primary">
                        {row.materialCode}
                      </Data>
                      <div className="text-xs text-text-tertiary">{row.description}</div>
                    </TableCell>
                    <TableCell>{cell(row, 'halal')}</TableCell>
                    <TableCell>{cell(row, 'bpom')}</TableCell>
                    <TableCell>
                      {history.length === 0 ? (
                        <span className="text-xs text-text-tertiary">
                          {t('compliance.applicability.history.none')}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="text-xs font-medium text-action-text hover:underline"
                          data-testid={`applicability-history-${row.materialCode}`}
                          onClick={() =>
                            setHistoryOf(historyOf === row.materialCode ? null : row.materialCode)
                          }
                        >
                          {history.length === 1
                            ? t('compliance.applicability.history.one', { count: history.length })
                            : t('compliance.applicability.history.other', { count: history.length })}
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                  {historyOf === row.materialCode && history.length > 0 && (
                    <tr data-testid={`applicability-ledger-${row.materialCode}`}>
                      <td colSpan={4} className="px-5 py-3 bg-bg-hover">
                        <ul className="flex flex-col gap-1.5 text-xs text-text-secondary">
                          {history.map((r) => (
                            <li key={r.seq}>
                              <span className="font-semibold text-text-primary">
                                {t(`compliance.applicability.regime.${r.regime}`)} ·{' '}
                                {t(
                                  `compliance.applicability.state.${
                                    r.applicable ? 'applies' : 'notApplicable'
                                  }`,
                                )}
                              </span>{' '}
                              — {person(r)}, <Data as="span">{formatDate(r.setAt.slice(0, 10))}</Data>.{' '}
                              {t('compliance.applicability.history.reason', { reason: r.reason })}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                  {editing && (
                    <tr data-testid="applicability-form">
                      <td colSpan={4} className="px-5 py-4 bg-bg-hover">
                        <div className="flex flex-col gap-3 max-w-2xl">
                          <div className="text-sm font-semibold text-text-primary">
                            {t('compliance.applicability.form.title', {
                              regime: t(`compliance.applicability.regime.${editing.regime}`),
                            })}{' '}
                            <Data as="span">{editing.materialCode}</Data>
                          </div>
                          <div className="flex gap-5 text-sm text-text-primary">
                            {([true, false] as const).map((v) => (
                              <label key={String(v)} className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="radio"
                                  name="applicability-choice"
                                  data-testid={`applicability-choice-${v ? 'yes' : 'no'}`}
                                  checked={editing.applicable === v}
                                  onChange={() => setDraft({ ...editing, applicable: v })}
                                />
                                {t(
                                  `compliance.applicability.form.${v ? 'yes' : 'no'}.${editing.regime}`,
                                )}
                              </label>
                            ))}
                          </div>
                          <div>
                            <label
                              htmlFor="applicability-reason"
                              className="block text-xs font-medium text-text-tertiary uppercase mb-1"
                            >
                              {t('compliance.applicability.form.reason')}
                            </label>
                            <textarea
                              id="applicability-reason"
                              data-testid="applicability-reason"
                              rows={2}
                              value={editing.reason}
                              onChange={(e) => setDraft({ ...editing, reason: e.target.value })}
                              placeholder={t('compliance.applicability.form.reasonPlaceholder')}
                              className="w-full rounded-md border border-border-input bg-white px-3 py-2 text-sm text-text-primary focus:border-action focus:outline-none"
                            />
                          </div>
                          {/* Said BEFORE the act: whose name the ruling will carry,
                              or that this seat names nobody and will be refused. */}
                          <div className="text-xs text-text-secondary" data-testid="applicability-attribution">
                            {identity.actor.kind === 'RESOLVED'
                              ? t('compliance.applicability.form.recordedAs', {
                                  person: personLabel(identity.actor.person.personId, t),
                                })
                              : t('compliance.applicability.form.unattributed')}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => setDraft(null)}>
                              {t('compliance.applicability.form.cancel')}
                            </Button>
                            <Button
                              variant="outline"
                              data-testid="applicability-commit"
                              disabled={
                                setRuling.isPending ||
                                editing.applicable === null ||
                                editing.reason.trim() === ''
                              }
                              onClick={commit}
                            >
                              {t('compliance.applicability.form.commit')}
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </Table>
      )}
    </section>
  );
};

export default MaterialApplicabilityPanel;
