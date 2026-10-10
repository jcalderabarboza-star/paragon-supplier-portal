// ────────────────────────────────────────────────────────────────────────────
// RFx-3 · THE SUPPLIER WRITES ITS PROPOSAL.
//
// One response per criterion the event sets, and the names of the documents the
// proposal refers to. One form, two acts, as the RFI answer form is: SAVE DRAFT
// keeps what is written so far (Paragon does not read a draft), and SUBMIT
// sends it — refused, by name, while a required criterion has no response.
//
// THE SUBMIT IS NOT BLOCKED HERE. The press goes to the machine and the
// machine's refusal is what the supplier reads, with the criteria named from
// the same predicate the machine ran (`unansweredCriteriaOf`).
//
// A DOCUMENT IS ITS NAME. No file leaves this browser: there is no document
// store behind a proposal, and the form says so under the field.
//
// NOTHING HERE READS A SCORE. The event a supplier is handed carries none
// (`rfqSupplierView.ts`), so there is no score, total, rank or other supplier
// for this form to show.
// ────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Send, X } from 'lucide-react';
import Button from '../../components/ui-v2/Button';
import { Card } from '../../components/ui-v2/Card';
import { IconButton } from '../../components/ui-v2/Actions';
import { FormField, TextArea } from '../../components/ui-v2/Form';
import { useToast } from '../../hooks/useToast';
import { useRefusalText } from '../../hooks/useRefusalText';
import {
  useStageResponseResave,
  useStageResponseSave,
  useStageResponseSend,
  useStageResponseSubmit,
} from '../../services/query/commandHooks';
import type { CommandResult, RFQ } from '../../services/data/types';
import {
  criterionLabel,
  normalizeDocuments,
  unansweredCriteriaOf,
  type RfpCriterion,
} from '../../data/rfpEvaluation';
import { formatNumber } from '../../lib/format';
import { interestRefusalKey, namedCriteria, refusedForCriteria } from './rfiAnswerModel';

interface Props {
  /** The event, as this supplier reads it: its criteria and its own draft. */
  rfq: RFQ;
  supplierId: string;
  /** Called after a draft is saved or the proposal is submitted, and on Cancel. */
  onClose: () => void;
}

const RfpProposalForm: React.FC<Props> = ({ rfq, supplierId, onClose }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const criteria: readonly RfpCriterion[] = rfq.criteria ?? [];
  const draft = rfq.myStageDraft;

  const [values, setValues] = useState<Record<string, string>>(() => ({ ...(draft?.proposal ?? {}) }));
  const [documents, setDocuments] = useState<string[]>(() => [...(draft?.documents ?? [])]);
  const [note, setNote] = useState(draft?.note ?? '');
  // Set by a refused submit: the required criteria still without a response are marked.
  const [marked, setMarked] = useState(false);

  const submitNew = useStageResponseSubmit();
  const saveNew = useStageResponseSave();
  const resave = useStageResponseResave();
  const send = useStageResponseSend();
  const busy = submitNew.isPending || saveNew.isPending || resave.isPending || send.isPending;

  // Sent as typed: the store trims and drops a blank, and the rule that names
  // a missing criterion reads a blank as no response.
  const missing = unansweredCriteriaOf(criteria, values);
  const content = { proposal: values, documents, ...(note.trim() ? { note: note.trim() } : {}) };

  const refused = (titleKey: string, res: CommandResult) => {
    const key = interestRefusalKey(res.reason);
    toast({
      variant: 'error',
      title: t(titleKey),
      description: key
        ? t(key, { criteria: namedCriteria(criteria, missing) })
        : (refusalText(res.reason) ?? res.reason ?? t('rfqs.rfi.toast.failed.default')),
    });
  };

  const handleSave = async () => {
    try {
      const res = draft
        ? await resave.mutateAsync({ responseId: draft.id, payload: content })
        : await saveNew.mutateAsync({ payload: { rfqId: rfq.id, supplierId, ...content } });
      if (res.status === 'failed') return refused('rfqs.rfi.toast.saveFailed.title', res);
      toast({
        variant: 'success',
        title: t('rfqs.rfi.toast.saved.title', { rfq: rfq.rfqNumber }),
        description: t('rfqs.rfi.toast.saved.body'),
      });
      onClose();
    } catch {
      toast({
        variant: 'error',
        title: t('rfqs.rfi.toast.saveFailed.title'),
        description: t('rfqs.rfi.toast.failed.default'),
      });
    }
  };

  const handleSubmit = async () => {
    try {
      const res = draft
        ? await send.mutateAsync({ responseId: draft.id, payload: content })
        : await submitNew.mutateAsync({ payload: { rfqId: rfq.id, supplierId, ...content } });
      if (res.status === 'failed') {
        if (refusedForCriteria(res.reason)) setMarked(true);
        return refused('rfqs.rfp.toast.submitFailed.title', res);
      }
      toast({
        variant: 'success',
        title: t('rfqs.rfp.toast.submitted.title', { rfq: rfq.rfqNumber }),
        description: t('rfqs.rfp.toast.submitted.body'),
      });
      onClose();
    } catch {
      toast({
        variant: 'error',
        title: t('rfqs.rfp.toast.submitFailed.title'),
        description: t('rfqs.rfi.toast.failed.default'),
      });
    }
  };

  return (
    <Card
      tone="inset"
      className="mb-3"
      data-testid={`rfp-proposal-form-${rfq.id}`}
    >
      <p className="text-xs text-text-tertiary mb-3">{t('rfqs.rfp.form.intro')}</p>
      <ol className="space-y-4 mb-4">
        {criteria.map((c, i) => {
          const unanswered = marked && missing.includes(c);
          const fieldId = `rfp-${rfq.id}-${c.id}`;
          return (
            <li key={c.id} data-testid={`rfp-criterion-${rfq.id}-${c.id}`}>
              <FormField
                htmlFor={fieldId}
                label={`${criterionLabel(i + 1)} ${c.name}`}
                hint={
                  <>
                    {t('rfqs.rfp.weight', { weight: formatNumber(c.weight) })}
                    {c.group ? ` · ${t(`rfqs.rfp.group.${c.group}`)}` : ''}
                    {' · '}
                    {t(c.required ? 'rfqs.rfi.required' : 'rfqs.rfi.optional')}
                  </>
                }
                error={
                  unanswered && (
                    <span data-testid={`rfp-criterion-missing-${rfq.id}-${c.id}`}>
                      {t('rfqs.rfp.missing')}
                    </span>
                  )
                }
              >
                <TextArea
                  id={fieldId}
                  rows={3}
                  value={values[c.id] ?? ''}
                  onChange={(e) => setValues((s) => ({ ...s, [c.id]: e.target.value }))}
                  data-testid={`rfp-response-${rfq.id}-${c.id}`}
                />
              </FormField>
            </li>
          );
        })}
      </ol>

      <FormField label={t('rfqs.rfp.documents.label')} htmlFor={`rfp-documents-${rfq.id}`}>
        <input
          id={`rfp-documents-${rfq.id}`}
          type="file"
          multiple
          onChange={(e) => {
            const names = Array.from(e.target.files ?? []).map((f) => f.name);
            setDocuments((d) => normalizeDocuments([...d, ...names]));
            e.target.value = '';
          }}
          className="block text-sm text-text-secondary"
          data-testid={`rfp-documents-${rfq.id}`}
        />
      </FormField>
      {documents.length > 0 && (
        <ul className="mt-2 space-y-1" data-testid={`rfp-documents-list-${rfq.id}`}>
          {documents.map((name) => (
            <li key={name} className="flex items-center gap-2 text-xs text-text-primary">
              <span className="font-mono">{name}</span>
              <IconButton
                icon={X}
                tone="critical"
                onClick={() => setDocuments((d) => d.filter((x) => x !== name))}
                aria-label={t('rfqs.rfp.documents.remove', { name })}
              />
            </li>
          ))}
        </ul>
      )}
      <div className="text-xs text-text-tertiary mt-1 mb-3" data-testid={`rfp-documents-note-${rfq.id}`}>
        {t('rfqs.rfp.documents.note')}
      </div>

      <FormField label={t('rfqs.interest.note')} htmlFor={`rfp-note-${rfq.id}`}>
        <TextArea
          id={`rfp-note-${rfq.id}`}
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          data-testid={`rfp-note-${rfq.id}`}
        />
      </FormField>
      <div className="flex flex-wrap gap-2 mt-3">
        <Button
          variant="outline"
          icon={Send}
          disabled={busy}
          onClick={handleSubmit}
          data-testid={`rfp-submit-${rfq.id}`}
        >
          {t('rfqs.rfp.submit')}
        </Button>
        <Button
          variant="secondary"
          icon={Save}
          disabled={busy}
          onClick={handleSave}
          data-testid={`rfp-save-${rfq.id}`}
        >
          {t('rfqs.rfi.saveDraft')}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          {t('rfqs.panel.cancel')}
        </Button>
      </div>
    </Card>
  );
};

export default RfpProposalForm;
