// ────────────────────────────────────────────────────────────────────────────
// RFx-2 · THE SUPPLIER ANSWERS THE RFI QUESTIONNAIRE.
//
// One form, two acts: SAVE DRAFT keeps what is answered so far (Paragon does
// not read a draft), and SUBMIT sends the answers — refused, by name, while a
// required question is unanswered. Which verb each button fires depends only on
// whether a draft already exists: with none, the two creation verbs; with one,
// the two verbs on the draft.
//
// THE SUBMIT IS NOT BLOCKED HERE. The press goes to the machine and the
// machine's refusal is what the supplier reads, with the questions named from
// the same predicate the machine ran (`unansweredRequiredOf`) — so the form
// cannot disagree with the rule it reports.
//
// A document question records THE FILE'S NAME ONLY. No file leaves this
// browser: there is no document store behind the questionnaire, and the form
// says so under the field rather than letting an "attached" file imply one.
// ────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Send } from 'lucide-react';
import Button from '../../components/ui-v2/Button';
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
  normalizeAnswers,
  questionLabel,
  unansweredRequiredOf,
  YES_NO,
  type RfiQuestion,
} from '../../data/rfiQuestionnaire';
import {
  answersOfForm,
  formValuesOf,
  interestRefusalKey,
  namedQuestions,
  refusedForRequired,
} from './rfiAnswerModel';

const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

interface Props {
  /** The event, as this supplier reads it: its questions and its own draft. */
  rfq: RFQ;
  supplierId: string;
  /** Called after a draft is saved or the answers are submitted, and on Cancel. */
  onClose: () => void;
}

const RfiAnswerForm: React.FC<Props> = ({ rfq, supplierId, onClose }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const questions: readonly RfiQuestion[] = rfq.questionnaire ?? [];
  const draft = rfq.myStageDraft;

  const [values, setValues] = useState(() => formValuesOf(questions, draft?.answers));
  const [note, setNote] = useState(draft?.note ?? '');
  // Set by a refused submit: the required questions still unanswered are marked.
  const [marked, setMarked] = useState(false);

  const submitNew = useStageResponseSubmit();
  const saveNew = useStageResponseSave();
  const resave = useStageResponseResave();
  const send = useStageResponseSend();
  const busy = submitNew.isPending || saveNew.isPending || resave.isPending || send.isPending;

  const answers = answersOfForm(questions, values);
  const missing = unansweredRequiredOf(questions, normalizeAnswers(questions, answers));
  const content = { answers, ...(note.trim() ? { note: note.trim() } : {}) };

  const set = (id: string, v: string | readonly string[]) => setValues((s) => ({ ...s, [id]: v }));

  const refused = (titleKey: string, res: CommandResult) => {
    const key = interestRefusalKey(res.reason);
    toast({
      variant: 'error',
      title: t(titleKey),
      description: key
        ? t(key, { questions: namedQuestions(questions, missing) })
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
        if (refusedForRequired(res.reason)) setMarked(true);
        return refused('rfqs.rfi.toast.submitFailed.title', res);
      }
      toast({
        variant: 'success',
        title: t('rfqs.rfi.toast.submitted.title', { rfq: rfq.rfqNumber }),
        description: t('rfqs.rfi.toast.submitted.body'),
      });
      onClose();
    } catch {
      toast({
        variant: 'error',
        title: t('rfqs.rfi.toast.submitFailed.title'),
        description: t('rfqs.rfi.toast.failed.default'),
      });
    }
  };

  const field = (q: RfiQuestion) => {
    const v = values[q.id];
    const name = `rfi-${rfq.id}-${q.id}`;
    const testId = `rfi-answer-${rfq.id}-${q.id}`;
    switch (q.type) {
      case 'yes_no':
      case 'single_choice': {
        const choices = q.type === 'yes_no' ? YES_NO : (q.options ?? []);
        return (
          <div className="flex flex-wrap gap-x-4 gap-y-1" role="radiogroup" aria-labelledby={`${name}-label`}>
            {choices.map((c) => (
              <label key={c} className="flex items-center gap-1.5 text-sm text-text-primary">
                <input
                  type="radio"
                  name={name}
                  className="accent-teal"
                  checked={v === c}
                  onChange={() => set(q.id, c)}
                  data-testid={`${testId}-${c}`}
                />
                {q.type === 'yes_no' ? t(`rfqs.rfi.${c}`) : c}
              </label>
            ))}
          </div>
        );
      }
      case 'multi_choice': {
        const ticked = Array.isArray(v) ? (v as readonly string[]) : [];
        return (
          <div className="flex flex-wrap gap-x-4 gap-y-1" role="group" aria-labelledby={`${name}-label`}>
            {(q.options ?? []).map((c) => (
              <label key={c} className="flex items-center gap-1.5 text-sm text-text-primary">
                <input
                  type="checkbox"
                  className="accent-teal"
                  checked={ticked.includes(c)}
                  onChange={() =>
                    set(q.id, ticked.includes(c) ? ticked.filter((x) => x !== c) : [...ticked, c])
                  }
                  data-testid={`${testId}-${c}`}
                />
                {c}
              </label>
            ))}
          </div>
        );
      }
      case 'number':
        return (
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              aria-labelledby={`${name}-label`}
              value={typeof v === 'string' ? v : ''}
              onChange={(e) => set(q.id, e.target.value)}
              className={`${inputClass} max-w-[12rem] font-mono`}
              data-testid={testId}
            />
            <span className="text-sm text-text-secondary">{q.unit}</span>
          </div>
        );
      case 'text':
        return (
          <textarea
            rows={2}
            aria-labelledby={`${name}-label`}
            value={typeof v === 'string' ? v : ''}
            onChange={(e) => set(q.id, e.target.value)}
            className={`${inputClass} h-auto`}
            data-testid={testId}
          />
        );
      case 'document':
        return (
          <div>
            <input
              type="file"
              aria-labelledby={`${name}-label`}
              onChange={(e) => set(q.id, e.target.files?.[0]?.name ?? '')}
              className="block text-sm text-text-secondary"
              data-testid={testId}
            />
            {typeof v === 'string' && v !== '' && (
              <div className="text-xs text-text-primary mt-1" data-testid={`${testId}-name`}>
                {t('rfqs.rfi.document.recorded')} <span className="font-mono">{v}</span>
              </div>
            )}
            <div className="text-[11px] text-text-tertiary mt-1" data-testid={`${testId}-note`}>
              {t('rfqs.rfi.document.note')}
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className="border border-border-subtle bg-bg-hover rounded-md p-3 mb-3"
      data-testid={`rfi-answer-form-${rfq.id}`}
    >
      <p className="text-xs text-text-tertiary mb-3">{t('rfqs.rfi.form.intro')}</p>
      <ol className="space-y-4 mb-4">
        {questions.map((q, i) => {
          const unanswered = marked && missing.includes(q);
          return (
            <li key={q.id} data-testid={`rfi-question-${rfq.id}-${q.id}`}>
              <div
                id={`rfi-${rfq.id}-${q.id}-label`}
                className="text-sm font-semibold text-text-primary mb-1.5"
              >
                <span className="font-mono text-text-secondary mr-1.5">{questionLabel(i + 1)}</span>
                {q.prompt}
                <span className="ml-2 text-[11px] font-normal text-text-tertiary">
                  {t(q.required ? 'rfqs.rfi.required' : 'rfqs.rfi.optional')}
                </span>
              </div>
              {field(q)}
              {unanswered && (
                <div
                  className="text-xs text-danger font-semibold mt-1"
                  data-testid={`rfi-question-missing-${rfq.id}-${q.id}`}
                >
                  {t('rfqs.rfi.missing')}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <label className={labelClass} htmlFor={`rfi-note-${rfq.id}`}>
        {t('rfqs.interest.note')}
      </label>
      <textarea
        id={`rfi-note-${rfq.id}`}
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className={`${inputClass} h-auto py-2`}
        data-testid={`rfi-note-${rfq.id}`}
      />
      <div className="flex flex-wrap gap-2 mt-3">
        <Button
          variant="outline"
          icon={Send}
          disabled={busy}
          onClick={handleSubmit}
          data-testid={`rfi-submit-${rfq.id}`}
        >
          {t('rfqs.rfi.submit')}
        </Button>
        <Button
          variant="secondary"
          icon={Save}
          disabled={busy}
          onClick={handleSave}
          data-testid={`rfi-save-${rfq.id}`}
        >
          {t('rfqs.rfi.saveDraft')}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          {t('rfqs.panel.cancel')}
        </Button>
      </div>
    </div>
  );
};

export default RfiAnswerForm;
