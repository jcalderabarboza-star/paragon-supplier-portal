// ────────────────────────────────────────────────────────────────────────────
// RFx-3 · THE BUYER SETS THE RFP EVALUATION CRITERIA — on a draft event whose
// path has an RFP stage, before it is published.
//
// The editor holds the criteria as the buyer types them and saves THE WHOLE
// LIST in one act (`t_rfq_criteria_set`). A fault in one criterion is the
// machine's own rule read before the act (`criteriaProblemOf`): it is named
// under the list with its criterion, and Save stays off until it is gone.
//
// THE SUM IS NOT HELD HERE. The running total of the weights is always on the
// page, in words, and says when it is not 100% — but the press goes to the
// machine, and the machine's refusal (`CRITERIA_WEIGHTS_NOT_100`) is what the
// buyer reads. A total the buyer is still typing towards is not a fault in any
// one row, so there is no row to point at.
//
// THE MODE IS GATED, NOT THE DOOR (`ENTRANCE-IS-THE-UNIT-01`): the editing form
// renders only while the seat holds `rfq:create`.
// ────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, ListChecks, Plus, Save, Trash2 } from 'lucide-react';
import Button from '../../components/ui-v2/Button';
import { Card } from '../../components/ui-v2/Card';
import { IconButton } from '../../components/ui-v2/Actions';
import { HandoffNotice } from '../../components/ui-v2/HandoffNotice';
import { Checkbox, FormField, Select, TextInput } from '../../components/ui-v2/Form';
import { useToast } from '../../hooks/useToast';
import { useRefusalText } from '../../hooks/useRefusalText';
import { useVerbAvailability } from '../../hooks/useVerbAvailability';
import { useRfqCriteriaSet } from '../../services/query/commandHooks';
import { POLICY_HOOKS } from '../../services/transitions/policyHooks';
import { refusedByPolicy } from '../../services/transitions/refusalMessage';
import type { RFQ } from '../../services/data/types';
import {
  RFP_CRITERION_GROUPS,
  WEIGHT_TOTAL,
  criteriaProblemOf,
  criterionLabel,
  weightSumOf,
  type RfpCriterion,
} from '../../data/rfpEvaluation';
import { formatNumber } from '../../lib/format';

/** One criterion while it is being written. The weight is TEXT until it is sent. */
interface Row {
  id: string;
  name: string;
  weightText: string;
  required: boolean;
  group: string;
}

const rowOf = (c: RfpCriterion): Row => ({
  id: c.id,
  name: c.name,
  weightText: String(c.weight),
  required: c.required,
  group: c.group ?? '',
});

/**
 * A row as the payload states it. A weight that does not read as a number —
 * blank, or "lots" — is NaN, which the rule names as an invalid weight in its
 * row; it is never read as 0.
 */
const criterionOf = (r: Row) => {
  const text = r.weightText.trim();
  return {
    id: r.id,
    name: r.name,
    weight: text === '' ? Number.NaN : Number(text),
    required: r.required,
    group: r.group,
  };
};

/** `c4` after `c1…c3`: one past the highest number in use, so a removed id is not reused. */
function nextId(rows: readonly Row[]): string {
  const used = rows.map((r) => Number(/^c(\d+)$/.exec(r.id)?.[1] ?? 0));
  return `c${Math.max(0, ...used) + 1}`;
}

/** The criteria, read: name, weight, part, and whether a response is required. */
export const RfpCriteriaList: React.FC<{ criteria: readonly RfpCriterion[] }> = ({ criteria }) => {
  const { t } = useTranslation();
  return (
    <Card padding="none">
    <ol className="divide-y divide-border-subtle" data-testid="rfp-criteria-list">
      {criteria.map((c, i) => (
        <li key={c.id} className="px-3 py-2 text-sm flex items-baseline gap-2" data-testid={`rfp-criterion-read-${c.id}`}>
          <span className="font-mono text-text-secondary">{criterionLabel(i + 1)}</span>
          <span className="text-text-primary flex-1">
            {c.name}
            <span className="block text-xs text-text-tertiary mt-0.5">
              {c.group ? `${t(`sourcing.rfp.group.${c.group}`)} · ` : ''}
              {t(c.required ? 'sourcing.rfi.required' : 'sourcing.rfi.optional')}
            </span>
          </span>
          <span className="font-mono text-data-navy">{formatNumber(c.weight)}%</span>
        </li>
      ))}
    </ol>
    </Card>
  );
};

const RfpCriteriaEditor: React.FC<{ rfq: RFQ }> = ({ rfq }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const availability = useVerbAvailability('rfq:create');
  const mutation = useRfqCriteriaSet();
  const stored = rfq.criteria ?? [];

  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  const criteria = rows.map(criterionOf);
  const problem = criteriaProblemOf(criteria);
  // The running total, over the weights that read as numbers.
  const sum = weightSumOf(
    criteria.map((c) => ({ weight: Number.isFinite(c.weight) ? c.weight : 0 })),
  );
  const sumIsWhole = rows.length === 0 || sum === WEIGHT_TOTAL;

  const open = () => {
    setRows(stored.map(rowOf));
    setEditing(true);
  };
  const patch = (index: number, change: Partial<Row>) =>
    setRows((rs) => rs.map((r, i) => (i === index ? { ...r, ...change } : r)));
  const move = (index: number, by: -1 | 1) =>
    setRows((rs) => {
      const to = index + by;
      if (to < 0 || to >= rs.length) return rs;
      const next = [...rs];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });

  const handleSave = () => {
    mutation.mutate(
      { rfqId: rfq.id, criteria },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            const description = refusedByPolicy(result.reason, POLICY_HOOKS.RFQ_CRITERIA_WEIGHTS_TOTAL)
              ? t('sourcing.refusal.criteriaWeightsNot100', { sum: formatNumber(sum) })
              : refusedByPolicy(result.reason, POLICY_HOOKS.RFQ_CRITERIA_ON_RFP_PATH)
                ? t('sourcing.refusal.criteriaNoRfpStage')
                : refusedByPolicy(result.reason, POLICY_HOOKS.RFQ_CRITERIA_WELL_FORMED)
                  ? t('sourcing.refusal.criteriaMalformed')
                  : (refusalText(result.reason) ?? result.reason ?? t('sourcing.rfp.toast.saveFailed.default'));
            toast({ variant: 'error', title: t('sourcing.rfp.toast.saveFailed.title'), description });
            return;
          }
          toast({
            variant: 'success',
            title: t('sourcing.rfp.toast.saved.title', { rfqNumber: rfq.rfqNumber }),
            description: t(
              rows.length === 0
                ? 'sourcing.rfp.toast.saved.none'
                : rows.length === 1
                  ? 'sourcing.rfp.toast.saved.one'
                  : 'sourcing.rfp.toast.saved.other',
              { count: rows.length },
            ),
          });
          setEditing(false);
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('sourcing.rfp.toast.saveFailed.title'),
            description: t('sourcing.rfp.toast.saveFailed.default'),
          }),
      },
    );
  };

  // ── Read mode: what the draft weighs now, and the way in ──────────────────
  if (!editing || availability.kind !== 'held') {
    return (
      <div data-testid="rfp-criteria-read">
        {stored.length === 0 ? (
          <p className="text-sm text-text-secondary mb-3" data-testid="rfp-criteria-none">
            {t('sourcing.rfp.none')}
          </p>
        ) : (
          <div className="mb-3">
            <RfpCriteriaList criteria={stored} />
          </div>
        )}
        {availability.kind === 'held' ? (
          <Button variant="outline" icon={ListChecks} onClick={open} data-testid="rfp-criteria-edit">
            {t(stored.length === 0 ? 'sourcing.rfp.write' : 'sourcing.rfp.edit')}
          </Button>
        ) : (
          <HandoffNotice availability={availability} testId="handoff-rfq-criteria" />
        )}
      </div>
    );
  }

  // ── Edit mode ─────────────────────────────────────────────────────────────
  return (
    <Card data-testid="rfp-criteria-editor">
      {rows.length === 0 && (
        <p className="text-sm text-text-secondary mb-3" data-testid="rfp-editor-empty">
          {t('sourcing.rfp.editor.empty')}
        </p>
      )}
      <ol className="space-y-3 mb-3">
        {rows.map((r, i) => (
          <Card
            as="li"
            tone="inset"
            key={r.id}
            data-testid={`rfp-editor-row-${i + 1}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm font-semibold text-text-secondary">{criterionLabel(i + 1)}</span>
              <span className="ml-auto flex gap-1">
                <IconButton
                  icon={ArrowUp}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label={t('sourcing.rfp.editor.moveUp', { criterion: criterionLabel(i + 1) })}
                />
                <IconButton
                  icon={ArrowDown}
                  disabled={i === rows.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label={t('sourcing.rfp.editor.moveDown', { criterion: criterionLabel(i + 1) })}
                />
                <IconButton
                  icon={Trash2}
                  tone="critical"
                  onClick={() => setRows((rs) => rs.filter((_, x) => x !== i))}
                  aria-label={t('sourcing.rfp.editor.remove', { criterion: criterionLabel(i + 1) })}
                  data-testid={`rfp-editor-remove-${i + 1}`}
                />
              </span>
            </div>
            <FormField label={t('sourcing.rfp.editor.name')} htmlFor={`rfp-editor-name-${r.id}`} className="mb-2">
            <TextInput
              id={`rfp-editor-name-${r.id}`}
              type="text"
              value={r.name}
              onChange={(e) => patch(i, { name: e.target.value })}
              data-testid={`rfp-editor-name-${i + 1}`}
            />
            </FormField>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <FormField label={t('sourcing.rfp.editor.weight')} htmlFor={`rfp-editor-weight-${r.id}`}>
                <TextInput
                  id={`rfp-editor-weight-${r.id}`}
                  type="text"
                  inputMode="decimal"
                  value={r.weightText}
                  onChange={(e) => patch(i, { weightText: e.target.value })}
                  mono
                  data-testid={`rfp-editor-weight-${i + 1}`}
                />
              </FormField>
              <FormField label={t('sourcing.rfp.editor.group')} htmlFor={`rfp-editor-group-${r.id}`}>
                <Select
                  id={`rfp-editor-group-${r.id}`}
                  value={r.group}
                  onChange={(e) => patch(i, { group: e.target.value })}
                  data-testid={`rfp-editor-group-${i + 1}`}
                >
                  <option value="">{t('sourcing.rfp.editor.groupNone')}</option>
                  {RFP_CRITERION_GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {t(`sourcing.rfp.group.${g}`)}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            <Checkbox
                className="mt-2"
                checked={r.required}
                onChange={(e) => patch(i, { required: e.target.checked })}
                data-testid={`rfp-editor-required-${i + 1}`}
            >
              {t('sourcing.rfp.editor.required')}
            </Checkbox>
          </Card>
        ))}
      </ol>
      <Button
        variant="secondary"
        icon={Plus}
        onClick={() =>
          setRows((rs) => [...rs, { id: nextId(rs), name: '', weightText: '', required: true, group: '' }])
        }
        data-testid="rfp-editor-add"
      >
        {t('sourcing.rfp.editor.add')}
      </Button>

      {rows.length > 0 && (
        <p
          className={`text-xs font-semibold mt-3 ${sumIsWhole ? 'text-success' : 'text-critical'}`}
          data-testid="rfp-editor-sum"
          data-whole={sumIsWhole ? 'true' : 'false'}
        >
          {t(sumIsWhole ? 'sourcing.rfp.editor.sumWhole' : 'sourcing.rfp.editor.sumNot', {
            sum: formatNumber(sum),
          })}
        </p>
      )}
      {problem !== null && (
        <p className="text-xs text-critical font-semibold mt-2" data-testid="rfp-editor-problem">
          {t(`sourcing.rfp.problem.${problem.code}`, { criterion: criterionLabel(problem.number) })}
        </p>
      )}
      <div className="flex flex-wrap gap-2 mt-3">
        <Button
          variant="outline"
          icon={Save}
          disabled={mutation.isPending || problem !== null}
          onClick={handleSave}
          data-testid="rfp-editor-save"
        >
          {t('sourcing.rfp.editor.save')}
        </Button>
        <Button variant="secondary" disabled={mutation.isPending} onClick={() => setEditing(false)}>
          {t('sourcing.rfp.editor.cancel')}
        </Button>
      </div>
    </Card>
  );
};

export default RfpCriteriaEditor;
