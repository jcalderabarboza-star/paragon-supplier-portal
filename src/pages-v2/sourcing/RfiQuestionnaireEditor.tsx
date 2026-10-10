// ────────────────────────────────────────────────────────────────────────────
// RFx-2 · THE BUYER WRITES THE RFI QUESTIONNAIRE — on a draft event that starts
// at RFI, before it is published.
//
// The editor holds the questionnaire as the buyer types it and saves THE WHOLE
// LIST in one act (`t_rfq_questionnaire_set`). What may be saved is the
// machine's own rule, read before the act through the same predicate the verb
// runs (`questionnaireProblemOf`): the first fault is named under the list,
// with its question, and Save stays off until it is gone.
//
// THE MODE IS GATED, NOT THE DOOR (`ENTRANCE-IS-THE-UNIT-01`): the editing
// form renders only while the seat holds `rfq:create`, so a seat narrowed while
// it stands open loses it.
//
// TEMPLATES ARE LOCAL (`rfiTemplates.ts`) and the bar says so: kept in this
// browser, not governed, not shared. Loading one fills the editor; nothing is
// written to the event until Save.
// ────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, ListChecks, Plus, Save, Trash2 } from 'lucide-react';
import Button from '../../components/ui-v2/Button';
import { HandoffNotice } from '../../components/ui-v2/HandoffNotice';
import { Checkbox, FormField, Select, TextArea, TextInput } from '../../components/ui-v2/Form';
import SectionHeading from '../../components/ui-v2/SectionHeading';
import { useToast } from '../../hooks/useToast';
import { useRefusalText } from '../../hooks/useRefusalText';
import { useVerbAvailability } from '../../hooks/useVerbAvailability';
import { useRfqQuestionnaireSet } from '../../services/query/commandHooks';
import { POLICY_HOOKS } from '../../services/transitions/policyHooks';
import { refusedByPolicy } from '../../services/transitions/refusalMessage';
import type { RFQ } from '../../services/data/types';
import {
  RFI_QUESTION_TYPES,
  knockoutChoicesOf,
  questionLabel,
  questionnaireProblemOf,
  takesKnockout,
  type RfiQuestion,
  type RfiQuestionType,
} from '../../data/rfiQuestionnaire';
import { readRfiTemplates, removeRfiTemplate, saveRfiTemplate } from './rfiTemplates';

/** One question while it is being written. Options are typed one per line. */
interface Row {
  id: string;
  prompt: string;
  type: RfiQuestionType;
  required: boolean;
  optionsText: string;
  unit: string;
  knockout: string;
}

const rowOf = (q: RfiQuestion): Row => ({
  id: q.id,
  prompt: q.prompt,
  type: q.type,
  required: q.required,
  optionsText: (q.options ?? []).join('\n'),
  unit: q.unit ?? '',
  knockout: q.knockout ?? '',
});

/** A row as the payload states it. The verb normalises; nothing is tidied here. */
const questionOf = (r: Row) => ({
  id: r.id,
  prompt: r.prompt,
  type: r.type,
  required: r.required,
  options: r.optionsText.split('\n'),
  unit: r.unit,
  knockout: r.knockout,
});

/** `q4` after `q1…q3`: one past the highest number in use, so a removed id is not reused. */
function nextId(rows: readonly Row[]): string {
  const used = rows.map((r) => Number(/^q(\d+)$/.exec(r.id)?.[1] ?? 0));
  return `q${Math.max(0, ...used) + 1}`;
}

/** The questionnaire, read. The buyer's read: it shows each knock-out answer. */
export const RfiQuestionList: React.FC<{ questions: readonly RfiQuestion[] }> = ({ questions }) => {
  const { t } = useTranslation();
  return (
    <ol className="divide-y divide-border-subtle border border-border-subtle rounded-md" data-testid="rfi-question-list">
      {questions.map((q, i) => (
        <li key={q.id} className="px-3 py-2 text-sm" data-testid={`rfi-question-read-${q.id}`}>
          <div className="text-text-primary">
            <span className="font-mono text-text-secondary mr-1.5">{questionLabel(i + 1)}</span>
            {q.prompt}
          </div>
          <div className="text-xs text-text-tertiary mt-0.5">
            {t(`sourcing.rfi.type.${q.type}`)}
            {q.type === 'number' && q.unit ? ` (${q.unit})` : ''}
            {' · '}
            {t(q.required ? 'sourcing.rfi.required' : 'sourcing.rfi.optional')}
            {q.options ? ` · ${q.options.join(' / ')}` : ''}
            {q.knockout !== undefined && (
              <span className="text-text-secondary font-semibold">
                {' · '}
                {t('sourcing.rfi.knockoutIs', {
                  answer: q.type === 'yes_no' ? t(`sourcing.rfi.${q.knockout}`) : q.knockout,
                })}
              </span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
};

const RfiQuestionnaireEditor: React.FC<{ rfq: RFQ }> = ({ rfq }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const availability = useVerbAvailability('rfq:create');
  const mutation = useRfqQuestionnaireSet();
  const stored = rfq.questionnaire ?? [];

  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [picked, setPicked] = useState('');
  // Bumped after a template is saved or removed, so the list is read again.
  const [, setTemplatesRead] = useState(0);
  const templates = readRfiTemplates();

  const questions = rows.map(questionOf);
  const problem = questionnaireProblemOf(questions);

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
      { rfqId: rfq.id, questions },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            const key = refusedByPolicy(result.reason, POLICY_HOOKS.RFQ_QUESTIONNAIRE_AT_RFI)
              ? 'sourcing.refusal.questionnaireStageNotRfi'
              : refusedByPolicy(result.reason, POLICY_HOOKS.RFQ_QUESTIONNAIRE_WELL_FORMED)
                ? 'sourcing.refusal.questionnaireMalformed'
                : null;
            toast({
              variant: 'error',
              title: t('sourcing.rfi.toast.saveFailed.title'),
              description: key
                ? t(key)
                : (refusalText(result.reason) ?? result.reason ?? t('sourcing.rfi.toast.saveFailed.default')),
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('sourcing.rfi.toast.saved.title', { rfqNumber: rfq.rfqNumber }),
            description: t(
              rows.length === 0
                ? 'sourcing.rfi.toast.saved.none'
                : rows.length === 1
                  ? 'sourcing.rfi.toast.saved.one'
                  : 'sourcing.rfi.toast.saved.other',
              { count: rows.length },
            ),
          });
          setEditing(false);
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('sourcing.rfi.toast.saveFailed.title'),
            description: t('sourcing.rfi.toast.saveFailed.default'),
          }),
      },
    );
  };

  const handleSaveTemplate = () => {
    const refusal = saveRfiTemplate(templateName, questions);
    if (refusal !== null) {
      toast({
        variant: 'error',
        title: t('sourcing.rfi.template.toast.failed'),
        description: t(`sourcing.rfi.template.refused.${refusal}`),
      });
      return;
    }
    toast({
      variant: 'success',
      title: t('sourcing.rfi.template.toast.saved', { name: templateName.trim() }),
      description: t('sourcing.rfi.template.local'),
    });
    setPicked(templateName.trim());
    setTemplateName('');
    setTemplatesRead((n) => n + 1);
  };

  const pickedTemplate = templates.templates.find((x) => x.name === picked);

  // ── Read mode: what the draft asks now, and the way in ────────────────────
  if (!editing || availability.kind !== 'held') {
    return (
      <div data-testid="rfi-questionnaire-read">
        {stored.length === 0 ? (
          <p className="text-sm text-text-secondary mb-3" data-testid="rfi-questionnaire-none">
            {t('sourcing.rfi.none')}
          </p>
        ) : (
          <div className="mb-3">
            <RfiQuestionList questions={stored} />
          </div>
        )}
        {availability.kind === 'held' ? (
          <Button variant="outline" icon={ListChecks} onClick={open} data-testid="rfi-questionnaire-edit">
            {t(stored.length === 0 ? 'sourcing.rfi.write' : 'sourcing.rfi.edit')}
          </Button>
        ) : (
          <HandoffNotice availability={availability} testId="handoff-rfq-questionnaire" />
        )}
      </div>
    );
  }

  // ── Edit mode ─────────────────────────────────────────────────────────────
  return (
    <div className="border border-border-subtle bg-bg-surface rounded-md p-3" data-testid="rfi-questionnaire-editor">
      {/* Templates — local, and said to be. */}
      <div className="border border-border-subtle bg-bg-hover rounded-md p-3 mb-4" data-testid="rfi-template-bar">
        <SectionHeading level="group" as="h4" className="mb-1">{t('sourcing.rfi.template.title')}</SectionHeading>
        <p className="text-xs text-text-tertiary mb-2" data-testid="rfi-template-local">
          {t('sourcing.rfi.template.local')}
        </p>
        {templates.unreadable && (
          <p className="text-xs text-critical mb-2" data-testid="rfi-template-unreadable">
            {t('sourcing.rfi.template.unreadable')}
          </p>
        )}
        {templates.rejected > 0 && (
          <p className="text-xs text-warning-hover mb-2" data-testid="rfi-template-rejected">
            {t('sourcing.rfi.template.rejected', { count: templates.rejected })}
          </p>
        )}
        <div className="flex flex-wrap items-end gap-2 mb-2">
          <FormField label={t('sourcing.rfi.template.pick')} htmlFor="rfi-template-pick" className="flex-1 min-w-[12rem]">
            <Select
              id="rfi-template-pick"
              value={picked}
              onChange={(e) => setPicked(e.target.value)}
              data-testid="rfi-template-pick"
            >
              <option value="">
                {templates.templates.length === 0
                  ? t('sourcing.rfi.template.noneSaved')
                  : t('sourcing.rfi.template.choose')}
              </option>
              {templates.templates.map((x) => (
                <option key={x.name} value={x.name}>
                  {x.name} ({x.questions.length})
                </option>
              ))}
            </Select>
          </FormField>
          <Button
            variant="secondary"
            disabled={!pickedTemplate}
            onClick={() => pickedTemplate && setRows(pickedTemplate.questions.map(rowOf))}
            data-testid="rfi-template-load"
          >
            {t('sourcing.rfi.template.load')}
          </Button>
          <Button
            variant="secondary"
            icon={Trash2}
            disabled={!pickedTemplate}
            onClick={() => {
              removeRfiTemplate(picked);
              setPicked('');
              setTemplatesRead((n) => n + 1);
            }}
            data-testid="rfi-template-remove"
          >
            {t('sourcing.rfi.template.remove')}
          </Button>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <FormField label={t('sourcing.rfi.template.name')} htmlFor="rfi-template-name" className="flex-1 min-w-[12rem]">
            <TextInput
              id="rfi-template-name"
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              data-testid="rfi-template-name"
            />
          </FormField>
          <Button
            variant="secondary"
            icon={Save}
            disabled={rows.length === 0 || problem !== null || templateName.trim() === ''}
            onClick={handleSaveTemplate}
            data-testid="rfi-template-save"
          >
            {t('sourcing.rfi.template.save')}
          </Button>
        </div>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-text-secondary mb-3" data-testid="rfi-editor-empty">
          {t('sourcing.rfi.editor.empty')}
        </p>
      )}
      <ol className="space-y-3 mb-3">
        {rows.map((r, i) => {
          const choices = knockoutChoicesOf({ type: r.type, options: r.optionsText.split('\n') });
          const isChoice = r.type === 'single_choice' || r.type === 'multi_choice';
          return (
            <li
              key={r.id}
              className="border border-border-subtle rounded-md p-3"
              data-testid={`rfi-editor-row-${i + 1}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-sm font-semibold text-text-secondary">{questionLabel(i + 1)}</span>
                <span className="ml-auto flex gap-1">
                  <button
                    type="button"
                    className="p-1 text-text-tertiary hover:text-text-primary disabled:opacity-40"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    aria-label={t('sourcing.rfi.editor.moveUp', { question: questionLabel(i + 1) })}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    className="p-1 text-text-tertiary hover:text-text-primary disabled:opacity-40"
                    disabled={i === rows.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label={t('sourcing.rfi.editor.moveDown', { question: questionLabel(i + 1) })}
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    className="p-1 text-text-tertiary hover:text-critical"
                    onClick={() => setRows((rs) => rs.filter((_, x) => x !== i))}
                    aria-label={t('sourcing.rfi.editor.remove', { question: questionLabel(i + 1) })}
                    data-testid={`rfi-editor-remove-${i + 1}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </span>
              </div>
              <FormField label={t('sourcing.rfi.editor.prompt')} htmlFor={`rfi-editor-prompt-${r.id}`} className="mb-2">
              <TextInput
                id={`rfi-editor-prompt-${r.id}`}
                type="text"
                value={r.prompt}
                onChange={(e) => patch(i, { prompt: e.target.value })}
                data-testid={`rfi-editor-prompt-${i + 1}`}
              />
              </FormField>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <FormField label={t('sourcing.rfi.editor.type')} htmlFor={`rfi-editor-type-${r.id}`}>
                  <Select
                    id={`rfi-editor-type-${r.id}`}
                    value={r.type}
                    // A knock-out names an answer of the OLD type; it does not
                    // survive a change of type.
                    onChange={(e) => patch(i, { type: e.target.value as RfiQuestionType, knockout: '' })}
                    data-testid={`rfi-editor-type-${i + 1}`}
                  >
                    {RFI_QUESTION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {t(`sourcing.rfi.type.${type}`)}
                      </option>
                    ))}
                  </Select>
                </FormField>
                {r.type === 'number' && (
                  <FormField label={t('sourcing.rfi.editor.unit')} htmlFor={`rfi-editor-unit-${r.id}`}>
                    <TextInput
                      id={`rfi-editor-unit-${r.id}`}
                      type="text"
                      value={r.unit}
                      onChange={(e) => patch(i, { unit: e.target.value })}
                      data-testid={`rfi-editor-unit-${i + 1}`}
                    />
                  </FormField>
                )}
                {takesKnockout(r.type) && (
                  <FormField label={t('sourcing.rfi.editor.knockout')} htmlFor={`rfi-editor-knockout-${r.id}`}>
                    <Select
                      id={`rfi-editor-knockout-${r.id}`}
                      value={choices.includes(r.knockout) ? r.knockout : ''}
                      // A knock-out makes the question required: optional, it
                      // would be passed by skipping it.
                      onChange={(e) =>
                        patch(i, { knockout: e.target.value, ...(e.target.value ? { required: true } : {}) })
                      }
                      data-testid={`rfi-editor-knockout-${i + 1}`}
                    >
                      <option value="">{t('sourcing.rfi.editor.knockoutNone')}</option>
                      {choices.map((c) => (
                        <option key={c} value={c}>
                          {r.type === 'yes_no' ? t(`sourcing.rfi.${c}`) : c}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                )}
              </div>
              {isChoice && (
                <FormField label={t('sourcing.rfi.editor.options')} htmlFor={`rfi-editor-options-${r.id}`} className="mt-2">
                  <TextArea
                    id={`rfi-editor-options-${r.id}`}
                    rows={3}
                    value={r.optionsText}
                    onChange={(e) => patch(i, { optionsText: e.target.value })}
                    data-testid={`rfi-editor-options-${i + 1}`}
                  />
                </FormField>
              )}
              <Checkbox
                  className="mt-2"
                  checked={r.required}
                  disabled={r.knockout !== ''}
                  onChange={(e) => patch(i, { required: e.target.checked })}
                  data-testid={`rfi-editor-required-${i + 1}`}
              >
                {t('sourcing.rfi.editor.required')}
                {r.knockout !== '' && (
                  <span className="ml-2 text-xs text-text-tertiary">{t('sourcing.rfi.editor.requiredByKnockout')}</span>
                )}
              </Checkbox>
            </li>
          );
        })}
      </ol>
      <Button
        variant="secondary"
        icon={Plus}
        onClick={() =>
          setRows((rs) => [
            ...rs,
            { id: nextId(rs), prompt: '', type: 'yes_no', required: true, optionsText: '', unit: '', knockout: '' },
          ])
        }
        data-testid="rfi-editor-add"
      >
        {t('sourcing.rfi.editor.add')}
      </Button>

      {problem !== null && (
        <p className="text-xs text-critical font-semibold mt-3" data-testid="rfi-editor-problem">
          {t(`sourcing.rfi.problem.${problem.code}`, { question: questionLabel(problem.number) })}
        </p>
      )}
      <div className="flex flex-wrap gap-2 mt-3">
        <Button
          variant="outline"
          icon={Save}
          disabled={mutation.isPending || problem !== null}
          onClick={handleSave}
          data-testid="rfi-editor-save"
        >
          {t('sourcing.rfi.editor.save')}
        </Button>
        <Button variant="secondary" disabled={mutation.isPending} onClick={() => setEditing(false)}>
          {t('sourcing.rfi.editor.cancel')}
        </Button>
      </div>
    </div>
  );
};

export default RfiQuestionnaireEditor;
