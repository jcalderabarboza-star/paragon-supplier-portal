import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import Button from '../../components/ui-v2/Button';
import { Card } from '../../components/ui-v2/Card';
import Data from '../../components/ui-v2/Data';
import Dialog from '../../components/ui-v2/Dialog';
import { Checkbox, ChoiceCard, FormField, Select, TextArea, TextInput } from '../../components/ui-v2/Form';
import { IconButton, RowButton } from '../../components/ui-v2/Actions';
import Notice from '../../components/ui-v2/Notice';
import SectionHeading from '../../components/ui-v2/SectionHeading';
import StatusPill from '../../components/ui-v2/StatusPill';
import ActorPreActNotice from '../../components/ui-v2/ActorPreActNotice';
import { useToast } from '../../hooks/useToast';
import { useRefusalText } from '../../hooks/useRefusalText';
import i18n from '../../lib/i18n';
import { namedSeatRefusalKey } from '../../lib/namedSeatRefusal';
import { getGuide, guideLocaleFor } from '../../guides';
import { buildCatalogView } from '../../services/transitions/catalogView';
import { ROLE_LABEL_KEY } from '../../services/transitions/handoff';
import type { SystemRoleId } from '../../services/transitions/businessRoles';
import { useFlowVersionSave } from '../../services/query/commandHooks';
import {
  findingKey,
  STEP_FIELD_TYPES,
  type AddedStep,
  type FlowVersion,
  type FlowVersionContent,
  type StepField,
  type StepFieldType,
} from '../../services/flowBuilder/flowVersion';
import {
  MAX_ELEMENTS_PER_ACT,
  validateVersion,
  type Finding,
  type ValidationWorld,
} from '../../services/flowBuilder/validateVersion';
import FlowDiagram from './FlowDiagram';
import {
  actOptions,
  addStep,
  blankField,
  COMPOSABLE_KINDS,
  earlierSteps,
  elementsPerAct,
  moveStep,
  removeStep,
  sameContent,
  setFields,
  stepsBefore,
  updateStep,
  type ComposableKind,
} from './composerModel';
import { flowVersionRefusalKey } from './flowVersionRefusal';

// ────────────────────────────────────────────────────────────────────────────
// FB-2 · THE COMPOSER — a draft is written here: pick an act of the process,
// put a step in front of it, say who completes it and what they are told.
//
// ⚠️ ITS ONLY WRITE IS THE SAVE OF THIS DRAFT (`t_flowversion_save`). It reads
// the registry, the guides and the rules; it changes no process, and nothing a
// draft says is in force. `fb2Composer.page.test.tsx` holds the first half by
// scanning this module's imports.
//
// THE FINDINGS ARE THE LIBRARY'S, LIVE. The same `validateVersion` the store
// judges a saved version by runs on every keystroke, so what the author reads
// while composing is what a reviewer will be shown.
// ────────────────────────────────────────────────────────────────────────────

/** One finding, as a sentence: the rule, what it is about, and the detail a person needs to fix it. */
export function useFindingText(): (f: Finding) => string {
  const { t } = useTranslation();
  return (f) => {
    const rule = t(`flowBuilder.rule.${f.code}.text`, { limit: MAX_ELEMENTS_PER_ACT });
    const variant = f.detail.problem ?? f.detail.counted;
    const key = `flowBuilder.finding.${f.code}${variant === undefined ? '' : `.${variant}`}`;
    if (!i18n.exists(key)) return rule;
    const part = typeof f.detail.part === 'string' ? f.detail.part : '';
    return `${rule} ${t(key, {
      ...f.detail,
      element: f.element,
      part: part.startsWith('field:') ? t('flowBuilder.part.field', { name: part.slice(6) }) : part ? t(`flowBuilder.part.${part}`) : '',
      language: f.detail.language ? t(`flowBuilder.language.${f.detail.language}`) : '',
    })}`;
  };
}

const TONE = { error: 'critical', warning: 'warning', info: 'neutral' } as const;

const StepForm: React.FC<{
  content: FlowVersionContent;
  step: AddedStep;
  lanes: readonly string[];
  onChange: (next: FlowVersionContent) => void;
}> = ({ content, step, lanes, onChange }) => {
  const { t } = useTranslation();
  const set = (change: Parameters<typeof updateStep>[2]): void => onChange(updateStep(content, step.id, change));
  const fields = step.fields ?? [];
  const setField = (i: number, change: Partial<StepField>): void =>
    onChange(setFields(content, step.id, fields.map((f, j) => (j === i ? { ...f, ...change } : f))));
  const earlier = earlierSteps(content, step.id);
  const differs = step.differentFrom ?? [];

  return (
    <Card tone="inset" padding="md" className="space-y-3" data-testid={`fb-step-form-${step.id}`}>
      <FormField label={t('flowBuilder.compose.lane')} hint={t('flowBuilder.compose.laneHint')}>
        <Select data-testid="fb-step-lane" value={step.lane} onChange={(e) => set({ lane: e.target.value })}>
          <option value="">{t('flowBuilder.compose.lanePick')}</option>
          {lanes.map((lane) => (
            <option key={lane} value={lane}>
              {t(ROLE_LABEL_KEY[lane as SystemRoleId])}
            </option>
          ))}
        </Select>
      </FormField>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label={t('flowBuilder.compose.labelEn')}>
          <TextInput
            data-testid="fb-step-label-en"
            value={step.label.en}
            onChange={(e) => set({ label: { ...step.label, en: e.target.value } })}
          />
        </FormField>
        <FormField label={t('flowBuilder.compose.labelId')}>
          <TextInput
            data-testid="fb-step-label-id"
            value={step.label.id}
            onChange={(e) => set({ label: { ...step.label, id: e.target.value } })}
          />
        </FormField>
        <FormField label={t('flowBuilder.compose.instructionEn')} hint={t('flowBuilder.compose.instructionHint')}>
          <TextArea
            data-testid="fb-step-instruction-en"
            rows={3}
            value={step.instruction.en}
            onChange={(e) => set({ instruction: { ...step.instruction, en: e.target.value } })}
          />
        </FormField>
        <FormField label={t('flowBuilder.compose.instructionId')}>
          <TextArea
            data-testid="fb-step-instruction-id"
            rows={3}
            value={step.instruction.id}
            onChange={(e) => set({ instruction: { ...step.instruction, id: e.target.value } })}
          />
        </FormField>
      </div>

      {step.kind === 'capture' ? (
        <div data-testid="fb-step-fields">
          <SectionHeading level="group" as="h4">
            {t('flowBuilder.compose.fields')}
          </SectionHeading>
          <p className="mt-1 text-xs text-text-tertiary">{t('flowBuilder.compose.fieldsHint')}</p>
          <div className="mt-2 space-y-3">
            {fields.map((field, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_8rem_auto_auto] sm:items-end">
                <FormField label={t('flowBuilder.compose.fieldName')}>
                  <TextInput mono data-testid={`fb-field-name-${i}`} value={field.name} onChange={(e) => setField(i, { name: e.target.value })} />
                </FormField>
                <FormField label={t('flowBuilder.compose.labelEn')}>
                  <TextInput value={field.label.en} onChange={(e) => setField(i, { label: { ...field.label, en: e.target.value } })} />
                </FormField>
                <FormField label={t('flowBuilder.compose.labelId')}>
                  <TextInput value={field.label.id} onChange={(e) => setField(i, { label: { ...field.label, id: e.target.value } })} />
                </FormField>
                <FormField label={t('flowBuilder.compose.fieldType')}>
                  <Select value={field.type} onChange={(e) => setField(i, { type: e.target.value as StepFieldType })}>
                    {STEP_FIELD_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {t(`flowBuilder.fieldType.${type}`)}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <Checkbox checked={field.required} onChange={(e) => setField(i, { required: e.target.checked })}>
                  {t('flowBuilder.compose.fieldRequired')}
                </Checkbox>
                <IconButton
                  icon={Trash2}
                  aria-label={t('flowBuilder.compose.fieldRemove', { name: field.name || String(i + 1) })}
                  onClick={() => onChange(setFields(content, step.id, fields.filter((_, j) => j !== i)))}
                />
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            icon={Plus}
            className="mt-2"
            data-testid="fb-field-add"
            onClick={() => onChange(setFields(content, step.id, [...fields, blankField()]))}
          >
            {t('flowBuilder.compose.fieldAdd')}
          </Button>
        </div>
      ) : null}

      <div data-testid="fb-step-separation">
        <SectionHeading level="group" as="h4">
          {t('flowBuilder.compose.separation')}
        </SectionHeading>
        <div className="mt-1 space-y-1">
          {earlier.map((other) => (
            <Checkbox
              key={other.id}
              data-testid={`fb-step-differs-${other.id}`}
              checked={differs.includes(other.id)}
              onChange={(e) =>
                set({ differentFrom: e.target.checked ? [...differs, other.id] : differs.filter((id) => id !== other.id) })
              }
            >
              {t('flowBuilder.compose.differentFrom', { step: other.label[guideLocaleFor(i18n.language)] || other.id })}
            </Checkbox>
          ))}
          <Checkbox
            data-testid="fb-step-may-not-act"
            checked={step.completerMayNotAct === true}
            onChange={(e) => set({ completerMayNotAct: e.target.checked })}
          >
            {t('flowBuilder.compose.completerMayNotAct')}
          </Checkbox>
        </div>
      </div>
    </Card>
  );
};

const ChangeComposer: React.FC<{
  version: FlowVersion;
  /** The page's one world: the list judges a saved draft by the same rules. */
  world: ValidationWorld;
  onClose: () => void;
  /** The saved draft is handed over for review: the page closes this and opens the review. */
  onPropose: () => void;
  /** Called after a save the dispatcher accepted, so the list reads the store again. */
  onSaved: () => void;
}> = ({ version, world, onClose, onSaved, onPropose }) => {
  // FB-3 — closing with unsaved work ASKS FIRST (operator ruling). Every way
  // out of the pop-up — the button, the cross, Escape, the dimmed page — comes
  // through `leave`, so none of them can drop the work unasked.
  const [discarding, setDiscarding] = useState(false);
  const { t, i18n: lang } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const findingText = useFindingText();
  const save = useFlowVersionSave();
  const locale = guideLocaleFor(lang.language);
  const entity = version.content.entity;

  const flow = world.flows.find((f) => f.entity === entity);
  const view = useMemo(() => (flow ? buildCatalogView([flow]).flows[0] : undefined), [flow]);
  const options = useMemo(() => (flow ? actOptions(flow) : { offered: [], withheld: [] }), [flow]);
  const guide = getGuide(entity, locale);
  const actName = (id: string): string => guide?.steps[id]?.label ?? id;

  const [saved, setSaved] = useState(version.content);
  const [content, setContent] = useState(version.content);
  const [acknowledged, setAcknowledged] = useState<readonly string[]>(version.acknowledged);
  const [savedAck, setSavedAck] = useState<readonly string[]>(version.acknowledged);
  const [act, setAct] = useState<string | null>(options.offered[0]?.id ?? null);
  const [stepId, setStepId] = useState<string | null>(null);
  const [kind, setKind] = useState<ComposableKind>('approval');

  const findings = useMemo(() => validateVersion(content, world), [content, world]);
  const warningKeys = findings.filter((f) => f.severity === 'warning').map(findingKey);
  // An acknowledgement of a warning the draft no longer raises is not kept.
  const liveAck = acknowledged.filter((k) => warningKeys.includes(k));
  const dirty = !sameContent(content, saved) || [...liveAck].sort().join('|') !== [...savedAck].sort().join('|');

  if (!flow || !view) return null;

  const here = act ? stepsBefore(content, act) : [];
  const open = here.find((s) => s.id === stepId) ?? null;
  const change = (next: FlowVersionContent): void => setContent(next);

  const add = (): void => {
    if (!act) return;
    const next = addStep(content, act, kind);
    setContent(next);
    setStepId(stepsBefore(next, act).slice(-1)[0].id);
  };

  const submit = async (): Promise<void> => {
    const result = await save.mutateAsync({ versionId: version.id, content, acknowledged: liveAck });
    if (result.status === 'failed') {
      const key = namedSeatRefusalKey(result.reason) ?? flowVersionRefusalKey(result.reason);
      toast({
        variant: 'error',
        title: (key ? t(key) : null) ?? refusalText(result.reason) ?? t('flowBuilder.create.refused', { reason: result.reason ?? '' }),
      });
      return;
    }
    setSaved(content);
    setSavedAck(liveAck);
    toast({ variant: 'success', title: t('flowBuilder.compose.saved', { label: version.label }) });
    onSaved();
  };

  const leave = (): void => {
    if (dirty) setDiscarding(true);
    else onClose();
  };

  return (
    <Dialog
      open
      fill
      onClose={leave}
      title={t('flowBuilder.compose.title', { label: version.label, process: guide?.title ?? entity })}
      titleAside={<StatusPill variant="neutral">{t(`flowBuilder.state.${version.state}`)}</StatusPill>}
      testId="fb-composer"
    >
      <p className="mb-4 max-w-prose text-meta text-text-secondary">
        <strong>{version.title}</strong> — {t('flowBuilder.compose.intro')}
      </p>

      {/* The diagram takes the pop-up's whole width: in half of it a process
          with five states ran off the side (found on the first walk). */}
      <div className="space-y-6">
        {/* ── THE PROCESS, AND THE ACT PICKED ── */}
        <section className="min-w-0 space-y-4">
          <FormField label={t('flowBuilder.compose.act')} hint={t('flowBuilder.compose.actHint')} className="max-w-xl">
            <Select
              data-testid="fb-act-picker"
              value={act ?? ''}
              onChange={(e) => {
                setAct(e.target.value || null);
                setStepId(null);
              }}
            >
              {options.offered.map((def) => (
                <option key={def.id} value={def.id}>
                  {actName(def.id)} · {def.id}
                </option>
              ))}
            </Select>
          </FormField>
          <Card padding="md">
            <FlowDiagram
              view={view}
              cursor={null}
              idPrefix={`fb-compose-${entity}`}
              draft={{
                elements: elementsPerAct(content),
                selected: act,
                selectable: (id) => options.offered.some((d) => d.id === id),
                onSelect: (id) => {
                  setAct(id);
                  setStepId(null);
                },
                countLabel: (count) => t('flowBuilder.compose.added', { count }),
              }}
            />
          </Card>
          {options.withheld.length > 0 ? (
            <div data-testid="fb-acts-withheld">
              <SectionHeading level="group" as="h3">
                {t('flowBuilder.compose.withheldTitle')}
              </SectionHeading>
              <ul className="mt-1 space-y-0.5 text-xs text-text-tertiary">
                {options.withheld.map(({ def, because }) => (
                  <li key={def.id} data-testid={`fb-act-withheld-${def.id}`}>
                    <Data className="text-text-secondary">{def.id}</Data> — {t(`flowBuilder.withheld.${because}`)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {/* ── WHAT STANDS IN FRONT OF IT ── */}
        <section className="min-w-0 max-w-4xl space-y-4" data-testid="fb-compose-steps">
          <SectionHeading as="h3">
            {act ? t('flowBuilder.compose.inFrontOf', { act: actName(act) }) : t('flowBuilder.compose.noAct')}
          </SectionHeading>
          {act && here.length === 0 ? (
            <p className="text-sm text-text-tertiary" data-testid="fb-compose-none">
              {t('flowBuilder.compose.none')}
            </p>
          ) : null}
          <ul className="space-y-2">
            {here.map((step, i) => (
              <li key={step.id}>
                <Card padding="none" className="flex items-center" data-testid={`fb-step-${step.id}`}>
                  <RowButton selected={step.id === stepId} onClick={() => setStepId(step.id === stepId ? null : step.id)}>
                    <span className="min-w-0">
                      <span className="block truncate">
                        {i + 1}. {step.label[locale] || t('flowBuilder.compose.unnamed')}
                      </span>
                      <span className="block text-xs text-text-tertiary">
                        {t(`flowBuilder.kind.${step.kind}`)}
                        {step.lane ? ` · ${t(ROLE_LABEL_KEY[step.lane as SystemRoleId] ?? step.lane)}` : ''} · <Data>{step.id}</Data>
                      </span>
                    </span>
                  </RowButton>
                  <IconButton
                    icon={ArrowUp}
                    disabled={i === 0}
                    aria-label={t('flowBuilder.compose.moveEarlier', { step: step.id })}
                    data-testid={`fb-step-earlier-${step.id}`}
                    onClick={() => change(moveStep(content, step.id, 'earlier'))}
                  />
                  <IconButton
                    icon={ArrowDown}
                    disabled={i === here.length - 1}
                    aria-label={t('flowBuilder.compose.moveLater', { step: step.id })}
                    data-testid={`fb-step-later-${step.id}`}
                    onClick={() => change(moveStep(content, step.id, 'later'))}
                  />
                  <IconButton
                    icon={Trash2}
                    aria-label={t('flowBuilder.compose.remove', { step: step.id })}
                    data-testid={`fb-step-remove-${step.id}`}
                    onClick={() => {
                      change(removeStep(content, step.id));
                      if (stepId === step.id) setStepId(null);
                    }}
                  />
                </Card>
                {open?.id === step.id ? (
                  <div className="mt-2">
                    <StepForm content={content} step={step} lanes={world.stepLanes} onChange={change} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          {act ? (
            <div>
              <SectionHeading level="group" as="h4">
                {t('flowBuilder.compose.palette')}
              </SectionHeading>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {COMPOSABLE_KINDS.map((k) => (
                  <ChoiceCard
                    key={k}
                    type="radio"
                    name="fb-kind"
                    data-testid={`fb-kind-${k}`}
                    checked={kind === k}
                    onChange={() => setKind(k)}
                  >
                    <span className="block font-medium">{t(`flowBuilder.kind.${k}`)}</span>
                    <span className="block text-xs text-text-tertiary">{t(`flowBuilder.kindHint.${k}`)}</span>
                  </ChoiceCard>
                ))}
              </div>
              <Button variant="outline" icon={Plus} className="mt-2" data-testid="fb-step-add" onClick={add}>
                {t('flowBuilder.compose.add', { kind: t(`flowBuilder.kind.${kind}`) })}
              </Button>
            </div>
          ) : null}
        </section>
      </div>

      {/* ── WHAT THE RULES SAY ABOUT THE DRAFT, AS IT STANDS ── */}
      <section className="mt-6 space-y-2" data-testid="fb-findings">
        <SectionHeading as="h3">{t('flowBuilder.compose.findings')}</SectionHeading>
        {findings.length === 0 ? (
          <p className="text-sm text-text-tertiary" data-testid="fb-findings-none">
            {t('flowBuilder.compose.findingsNone')}
          </p>
        ) : null}
        {findings.map((f, i) => {
          const key = findingKey(f);
          return (
            <Notice
              key={`${key}#${i}`}
              tone={TONE[f.severity]}
              data-testid={`fb-finding-${f.code}`}
              title={
                <>
                  <Data>{f.code}</Data> · {t(`flowBuilder.severity.${f.severity}`)} · <Data>{f.element}</Data>
                </>
              }
            >
              <p>{findingText(f)}</p>
              {f.severity === 'warning' ? (
                <Checkbox
                  data-testid={`fb-ack-${key}`}
                  checked={liveAck.includes(key)}
                  onChange={(e) =>
                    setAcknowledged(e.target.checked ? [...liveAck, key] : liveAck.filter((k) => k !== key))
                  }
                >
                  {t('flowBuilder.compose.acknowledge')}
                </Checkbox>
              ) : null}
            </Notice>
          );
        })}
      </section>

      {discarding ? (
        // The destructive ask stands alone: its confirm is the one solid
        // button, and no other commit is offered while it is open.
        <div
          className="mt-6 flex flex-wrap items-center gap-3 border-t border-border-subtle pt-4"
          role="alertdialog"
          aria-label={t('flowBuilder.compose.discardTitle')}
          data-testid="fb-discard-ask"
        >
          <span className="text-sm text-text-primary">{t('flowBuilder.compose.discardBody', { label: version.label })}</span>
          <Button variant="secondary" data-testid="fb-discard-keep" onClick={() => setDiscarding(false)}>
            {t('flowBuilder.compose.discardKeep')}
          </Button>
          <Button variant="primary" tone="critical" data-testid="fb-discard-confirm" onClick={onClose}>
            {t('flowBuilder.compose.discardConfirm')}
          </Button>
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border-subtle pt-4">
          {/* ONE solid button: saving while there is something to save, handing
              the saved draft over once there is not. */}
          <Button variant={dirty ? 'primary' : 'outline'} disabled={!dirty} data-testid="fb-save" onClick={() => void submit()}>
            {t('flowBuilder.compose.save')}
          </Button>
          <Button
            variant={dirty ? 'outline' : 'primary'}
            disabled={dirty}
            title={dirty ? t('flowBuilder.compose.proposeAfterSave') : undefined}
            data-testid="fb-propose"
            onClick={onPropose}
          >
            {t('flowBuilder.compose.propose')}
          </Button>
          <Button variant="secondary" data-testid="fb-compose-close" onClick={leave}>
            {t('flowBuilder.compose.close')}
          </Button>
          <span className="text-xs text-text-tertiary" data-testid="fb-compose-dirty">
            {t(dirty ? 'flowBuilder.compose.unsaved' : 'flowBuilder.compose.allSaved')}
          </span>
          <ActorPreActNotice
            unattributedKey="identity.preAct.namedRequired"
            className="text-xs text-text-tertiary leading-relaxed"
            testId="fb-compose-actor"
          />
        </div>
      )}
      <p className="mt-2 text-xs text-text-tertiary">{t('flowBuilder.compose.notInForce')}</p>
    </Dialog>
  );
};

export default ChangeComposer;
