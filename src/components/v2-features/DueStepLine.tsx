// ─────────────────────────────────────────────────────────────────────────────
// FB-4 · A STEP AN ACTIVE VERSION ADDED IS DUE ON THIS DOCUMENT — the line that
// says so, and the pop-up in which its lane completes it (Design 6 v2 §7.3).
//
// Mounted by `NextActLine`, so every surface that already says who acts next
// says this first, with no page of its own to build.
//
// ⚠️ IT NEVER GRANTS. "Open step" is shown to a seat `stepOpenFor` admits — the
// SAME function the dispatcher's check calls — and the act is still taken
// through the dispatcher, which decides. A seat the line does not offer the
// step to reads which lane it waits for.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../ui-v2/Button';
import Dialog from '../ui-v2/Dialog';
import { Checkbox, FormField, Select, TextArea, TextInput } from '../ui-v2/Form';
import { LinkButton } from '../ui-v2/Actions';
import Notice from '../ui-v2/Notice';
import ActorPreActNotice from '../ui-v2/ActorPreActNotice';
import { useCurrentIdentity } from '../../context/CurrentIdentityContext';
import { useToast } from '../../hooks/useToast';
import { useFlowRefusalCopy } from '../../hooks/useFlowRefusalCopy';
import { isAttributed } from '../../lib/enforcement';
import { inLanguage, laneLabel } from '../../lib/stepRefusal';
import { personLabel } from '../../services/identity/personLabel';
import { useStepAct } from '../../services/query/commandHooks';
import { dueStepsFor, stepOpenFor, type DueStep } from '../../services/flowBuilder/stepsDue';
import { flowVersionStore } from '../../services/flowBuilder/flowVersionStore';
import { stepLedger } from '../../services/flowBuilder/stepLedger';
import type { StepField } from '../../services/flowBuilder/flowVersion';

export interface StepDocument {
  /** The process: the flow's entity key. */
  entity: string;
  id: string;
  /** The CANONICAL state the document rests in, never a display label. */
  state: string;
}

const FieldInput: React.FC<{ field: StepField; value: unknown; onChange: (v: unknown) => void; label: string }> = ({
  field,
  value,
  onChange,
  label,
}) => {
  const testId = `step-field-${field.name}`;
  if (field.type === 'boolean') {
    return (
      <Checkbox data-testid={testId} checked={value === true} onChange={(e) => onChange(e.target.checked)}>
        {label}
      </Checkbox>
    );
  }
  const text = typeof value === 'string' ? value : '';
  return (
    <FormField label={label}>
      {field.type === 'choice' && (field.options ?? []).length > 0 ? (
        <Select data-testid={testId} value={text} onChange={(e) => onChange(e.target.value)}>
          <option value="" />
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      ) : (
        <TextInput
          data-testid={testId}
          type={field.type === 'date' ? 'date' : 'text'}
          inputMode={field.type === 'number' || field.type === 'quantity' || field.type === 'money' ? 'decimal' : undefined}
          value={text}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </FormField>
  );
};

const StepDialog: React.FC<{ due: DueStep; onClose: () => void }> = ({ due, onClose }) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const refusalCopy = useFlowRefusalCopy();
  const stepAct = useStepAct();
  const { step } = due;
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const label = inLanguage(step.label, i18n.language);
  const who = (by: DueStep['earlier'][number]['row']['by']): string =>
    isAttributed(by) ? personLabel(by.person.personId, t) : t('identity.actor.unknown');

  const send = async (decline: boolean): Promise<void> => {
    const result = await stepAct.mutateAsync({
      stepKey: due.key,
      ...(decline ? { decline: { reason } } : { values }),
    });
    if (result.status === 'failed') {
      toast({ variant: 'error', title: refusalCopy(result.reason) });
      return;
    }
    toast({ variant: 'success', title: t(decline ? 'flowBuilder.step.declined' : 'flowBuilder.step.completed', { step: label }) });
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title={label} testId="step-dialog">
      <div className="flex flex-col gap-3">
        <p className="text-xs text-text-tertiary" data-testid="step-dialog-source">
          {t('flowBuilder.step.source', { version: due.version.label, lane: laneLabel(step, t) })}
        </p>
        <p className="text-sm leading-relaxed text-text-primary" data-testid="step-dialog-instruction">
          {inLanguage(step.instruction, i18n.language)}
        </p>
        {due.declined ? (
          <Notice tone="warning" title={t('flowBuilder.step.declinedTitle')} data-testid="step-dialog-declined">
            <p>{t('flowBuilder.step.declinedBody', { person: who(due.declined.by), reason: due.declined.reason })}</p>
          </Notice>
        ) : null}
        {due.earlier.length > 0 ? (
          <ul className="list-disc pl-5 text-xs text-text-secondary" data-testid="step-dialog-earlier">
            {due.earlier.map(({ step: s, row }) => (
              <li key={s.id}>
                {t('flowBuilder.step.earlier', { step: inLanguage(s.label, i18n.language), person: who(row.by) })}
              </li>
            ))}
          </ul>
        ) : null}
        {(step.fields ?? []).map((f) => (
          <FieldInput
            key={f.name}
            field={f}
            label={`${inLanguage(f.label, i18n.language) || f.name}${f.required ? ' *' : ''}`}
            value={values[f.name]}
            onChange={(v) => setValues((prev) => ({ ...prev, [f.name]: v }))}
          />
        ))}
        {declining ? (
          <FormField label={t('flowBuilder.step.declineReason')}>
            <TextArea data-testid="step-decline-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>
        ) : null}
        <ActorPreActNotice
          unattributedKey="identity.preAct.namedRequired"
          className="text-xs text-text-tertiary leading-relaxed"
          testId="step-dialog-actor"
        />
        <div className="flex flex-wrap items-center gap-3">
          {declining ? (
            <>
              <Button variant="secondary" data-testid="step-decline-cancel" onClick={() => setDeclining(false)}>
                {t('flowBuilder.review.cancel')}
              </Button>
              <Button
                variant="primary"
                tone="critical"
                disabled={reason.trim() === ''}
                data-testid="step-decline-confirm"
                onClick={() => void send(true)}
              >
                {t('flowBuilder.step.declineConfirm')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="primary" data-testid="step-complete" onClick={() => void send(false)}>
                {t(step.kind === 'approval' ? 'flowBuilder.step.approve' : 'flowBuilder.step.complete')}
              </Button>
              {step.kind === 'approval' ? (
                <Button variant="outline" tone="critical" data-testid="step-decline" onClick={() => setDeclining(true)}>
                  {t('flowBuilder.step.decline')}
                </Button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
};

const DueStepLine: React.FC<{ doc: StepDocument; testId?: string }> = ({ doc, testId = 'due-step' }) => {
  const { t, i18n } = useTranslation();
  const { identity } = useCurrentIdentity();
  // Read again whenever a step is taken or a version comes into or out of force.
  useSyncExternalStore(stepLedger.subscribe, stepLedger.all);
  useSyncExternalStore(flowVersionStore.subscribe, flowVersionStore.revision);
  const [open, setOpen] = useState<string | null>(null);
  const due = dueStepsFor(doc.entity, doc.id, doc.state);
  if (due.length === 0) return null;
  const opened = due.find((d) => d.key === open) ?? null;

  return (
    <span className="flex flex-col gap-1" data-testid={testId}>
      {due.map((d) => {
        const values = { step: inLanguage(d.step.label, i18n.language), lane: laneLabel(d.step, t) };
        return (
          <span key={d.key} className="text-xs text-text-secondary" data-testid={`${testId}-${d.step.id}`} data-step-state={d.declined ? 'declined' : 'due'}>
            <span className="mr-1 uppercase text-label">{t('flowBuilder.step.label')}</span>
            {t(d.declined ? 'flowBuilder.step.lineDeclined' : 'flowBuilder.step.line', values)}{' '}
            {stepOpenFor(d.step, identity.businessRoles) ? (
              <LinkButton data-testid={`${testId}-open-${d.step.id}`} onClick={() => setOpen(d.key)}>
                {t('flowBuilder.step.open')}
              </LinkButton>
            ) : null}
          </span>
        );
      })}
      {opened ? <StepDialog key={opened.key} due={opened} onClose={() => setOpen(null)} /> : null}
    </span>
  );
};

export default DueStepLine;
