// ────────────────────────────────────────────────────────────────────────────
// FB-3 / FB-4 · THE REVIEW OF A CHANGE (Design 6 v2 §5.3) — what a reviewer is
// shown, and the acts that move the change: propose, decide, put in force, roll
// back.
//
// The reviewer does not read a diff of two machines. A change IS the list of
// what it adds, so the review shows that list in sentences, the rules as they
// judge it AT THIS MOMENT, and every act taken on it with who and why.
//
// ⚠️ EVERY ACT ASKS ITS REASON FIRST, IN ONE PLACE, and is taken through the
// dispatcher. The drawer offers an act to a seat that holds its permission and
// tells any other seat which lane does, in that act's own slot. It decides
// nothing: four eyes, the rules and the deployment are the dispatcher's.
//
// ONE SOLID BUTTON IN EACH STATE: the act that moves the change forward. A
// destructive act is a critical outline first; pressed, it asks, and its
// confirm is the solid critical button while every other commit steps back.
// ────────────────────────────────────────────────────────────────────────────
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui-v2/Button';
import { Card } from '../../components/ui-v2/Card';
import DataTable, { type Column } from '../../components/ui-v2/DataTable';
import { Field, FieldList } from '../../components/ui-v2/Field';
import { FormField, TextArea } from '../../components/ui-v2/Form';
import HandoffNotice from '../../components/ui-v2/HandoffNotice';
import Notice from '../../components/ui-v2/Notice';
import SectionHeading from '../../components/ui-v2/SectionHeading';
import SidePanel from '../../components/ui-v2/SidePanel';
import StatusPill from '../../components/ui-v2/StatusPill';
import Timeline, { type TimelineEvent } from '../../components/ui-v2/Timeline';
import ActorPreActNotice from '../../components/ui-v2/ActorPreActNotice';
import { bypassRuleLabel } from '../../components/v2-features/BypassReasonDialog';
import { useToast } from '../../hooks/useToast';
import { useFlowRefusalCopy } from '../../hooks/useFlowRefusalCopy';
import { useVerbAvailabilities } from '../../hooks/useVerbAvailability';
import { getGuide, guideLocaleFor } from '../../guides';
import { isAttributed, type ActorAttribution } from '../../lib/enforcement';
import { formatDate } from '../../lib/format';
import { inLanguage, laneLabel } from '../../lib/stepRefusal';
import { personLabel } from '../../services/identity/personLabel';
import { useFlowVersionAct, type FlowVersionActName } from '../../services/query/commandHooks';
import {
  findingKey,
  inForceSince,
  proposerOf,
  type AddedStep,
  type FlowVersion,
} from '../../services/flowBuilder/flowVersion';
import { validateVersion, type ValidationWorld } from '../../services/flowBuilder/validateVersion';
import { useFindingText } from './ChangeComposer';

const TONE = { error: 'critical', warning: 'warning', info: 'neutral' } as const;

/** Which permission each act asks for — the flow's own, written once for the slots. */
const ATOMS = { draft: 'flow:draft', decide: 'flow:decide', activate: 'flow:activate' } as const;

interface ActSpec {
  readonly act: FlowVersionActName;
  readonly atom: keyof typeof ATOMS;
  /** The act that moves the change forward: the state's one solid button. */
  readonly forward?: boolean;
  /** A destructive act: a critical outline, then a solid critical confirm. */
  readonly destructive?: boolean;
}

/** The acts a state offers, in the order they stand in the footer. */
export const REVIEW_ACTS: Readonly<Record<string, readonly ActSpec[]>> = Object.freeze({
  Draft: [{ act: 'propose', atom: 'draft', forward: true }],
  'In Review': [
    { act: 'approve', atom: 'decide', forward: true },
    { act: 'return', atom: 'decide' },
    { act: 'reject', atom: 'decide', destructive: true },
    { act: 'withdraw', atom: 'draft' },
  ],
  Approved: [
    { act: 'activate', atom: 'activate', forward: true },
    { act: 'withdraw', atom: 'draft' },
  ],
  Active: [{ act: 'retire', atom: 'activate', destructive: true }],
  Retired: [{ act: 'restore', atom: 'activate', forward: true }],
  Rejected: [],
});

const STATE_TONE: Readonly<Record<string, 'neutral' | 'info' | 'success' | 'danger' | 'warning'>> = {
  Draft: 'neutral',
  'In Review': 'info',
  Approved: 'info',
  Active: 'success',
  Retired: 'neutral',
  Rejected: 'danger',
};
export const stateTone = (state: string) => STATE_TONE[state] ?? 'neutral';

const ChangeReview: React.FC<{
  version: FlowVersion;
  world: ValidationWorld;
  /** An act the page asked for on opening (the composer's "Propose for review"). */
  asking?: FlowVersionActName | null;
  onClose: () => void;
  /** An act was taken: the page reads the store again. */
  onChanged: () => void;
}> = ({ version, world, asking = null, onClose, onChanged }) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const refusalCopy = useFlowRefusalCopy();
  const findingText = useFindingText();
  const act = useFlowVersionAct();
  const availability = useVerbAvailabilities(ATOMS);
  const [ask, setAsk] = useState<FlowVersionActName | null>(asking);
  const [reason, setReason] = useState('');

  const entity = version.content.entity;
  const guide = getGuide(entity, guideLocaleFor(i18n.language));
  const actName = (id: string): string => guide?.steps[id]?.label ?? id;
  const who = (by: ActorAttribution | null): string =>
    by === null ? t('flowBuilder.review.byPlatform') : isAttributed(by) ? personLabel(by.person.personId, t) : t('identity.actor.unknown');
  // THE RULES, ASKED NOW — not the answer that stood when the change was saved.
  const findings = useMemo(() => validateVersion(version.content, world), [version, world]);
  const specs = REVIEW_ACTS[version.state] ?? [];
  const asked = specs.find((s) => s.act === ask) ?? null;

  const take = async (): Promise<void> => {
    if (!asked) return;
    const result = await act.mutateAsync({ versionId: version.id, act: asked.act, reason });
    if (result.status === 'failed') {
      toast({ variant: 'error', title: refusalCopy(result.reason) });
      return;
    }
    toast({ variant: 'success', title: t(`flowBuilder.review.done.${asked.act}`, { label: version.label }) });
    setAsk(null);
    setReason('');
    onChanged();
  };

  const sentence = (s: AddedStep): string => {
    const base = t(`flowBuilder.review.sentence.${s.kind}`, {
      act: actName(s.before),
      lane: laneLabel(s, t),
      step: inLanguage(s.label, i18n.language) || s.id,
    });
    const apart = (s.differentFrom ?? []).map((id) => {
      const other = version.content.steps.find((x) => x.id === id);
      return t('flowBuilder.review.sentence.differentFrom', { step: other ? inLanguage(other.label, i18n.language) || id : id });
    });
    return [base, ...apart, ...(s.completerMayNotAct ? [t('flowBuilder.review.sentence.mayNotAct')] : [])].join(' ');
  };

  const steps = [...version.content.steps].sort((a, b) => a.before.localeCompare(b.before) || a.order - b.order);
  const columns: Column<AddedStep>[] = [
    { id: 'step', header: t('flowBuilder.review.col.step'), kind: 'text', cell: (s) => inLanguage(s.label, i18n.language) || s.id },
    { id: 'kind', header: t('flowBuilder.review.col.kind'), kind: 'text', cell: (s) => t(`flowBuilder.kind.${s.kind}`) },
    { id: 'before', header: t('flowBuilder.review.col.before'), kind: 'text', cell: (s) => actName(s.before) },
    { id: 'lane', header: t('flowBuilder.review.col.lane'), kind: 'text', cell: (s) => laneLabel(s, t) },
  ];

  const history: TimelineEvent[] = [
    {
      id: 'created',
      title: t('flowBuilder.review.history.create', { person: who(version.createdBy) }),
      timestamp: formatDate(version.createdAt),
      status: 'completed',
    },
    ...version.history.map((h, i): TimelineEvent => ({
      id: `${h.act}-${i}`,
      title:
        h.act === 'supersede'
          ? t('flowBuilder.review.history.supersede', { label: h.reason })
          : t(`flowBuilder.review.history.${h.act}`, { person: who(h.by) }),
      timestamp: formatDate(h.at),
      status: i === version.history.length - 1 ? 'current' : 'completed',
      description:
        h.act === 'supersede'
          ? undefined
          : [
              t('flowBuilder.review.history.why', { reason: h.reason }),
              ...(h.bypass
                ? [
                    t('flowBuilder.review.history.bypass', {
                      rules: h.bypass.rules.map((r) => bypassRuleLabel(r, t, (k) => i18n.exists(k))).join(', '),
                      reason: h.bypass.reason,
                    }),
                  ]
                : []),
            ].join(' '),
    })),
  ];

  const proposer = proposerOf(version);
  const since = inForceSince(version);

  const footerForReview = asked ? (
    <>
      <Button variant="secondary" data-testid="fb-ask-cancel" onClick={() => setAsk(null)}>
        {t('flowBuilder.review.cancel')}
      </Button>
      <Button
        variant="primary"
        tone={asked.destructive ? 'critical' : undefined}
        disabled={reason.trim() === ''}
        data-testid="fb-ask-confirm"
        onClick={() => void take()}
      >
        {t(`flowBuilder.review.confirm.${asked.act}`)}
      </Button>
    </>
  ) : (
    <>
      {specs.map((s) =>
        availability[s.atom].kind === 'held' ? (
          <Button
            key={s.act}
            variant={s.forward ? 'primary' : 'outline'}
            tone={s.destructive ? 'critical' : undefined}
            data-testid={`fb-act-${s.act}`}
            onClick={() => {
              setReason('');
              setAsk(s.act);
            }}
          >
            {t(`flowBuilder.review.act.${s.act}`)}
          </Button>
        ) : (
          <span key={s.act} className="flex items-center gap-2 text-xs text-text-secondary" data-testid={`fb-act-gate-${s.act}`}>
            {t(`flowBuilder.review.act.${s.act}`)}
            <HandoffNotice availability={availability[s.atom]} testId={`handoff-flow-${s.act}`} />
          </span>
        ),
      )}
      <Button variant="secondary" data-testid="fb-review-close" onClick={onClose}>
        {t('flowBuilder.compose.close')}
      </Button>
    </>
  );

  return (
    <SidePanel
      open
      wide
      onClose={onClose}
      title={t('flowBuilder.compose.title', { label: version.label, process: guide?.title ?? entity })}
      footerActions={footerForReview}
    >
      <div className="space-y-6" data-testid="fb-review" data-version-state={version.state}>
        {asked ? (
          <Card tone="inset" padding="md" className="space-y-3" data-testid="fb-ask">
            <SectionHeading level="group">{t(`flowBuilder.review.ask.${asked.act}`, { label: version.label })}</SectionHeading>
            <FormField label={t('flowBuilder.review.reason')} hint={t('flowBuilder.review.reasonHint')}>
              <TextArea data-testid="fb-ask-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </FormField>
            <ActorPreActNotice
              unattributedKey="identity.preAct.namedRequired"
              className="text-xs text-text-tertiary leading-relaxed"
              testId="fb-ask-actor"
            />
          </Card>
        ) : null}

        <FieldList columns={2}>
          <Field label={t('flowBuilder.changes.col.state')}>
            <StatusPill variant={stateTone(version.state)}>{t(`flowBuilder.state.${version.state}`)}</StatusPill>
          </Field>
          <Field label={t('flowBuilder.changes.col.title')}>{version.title}</Field>
          <Field label={t('flowBuilder.changes.col.createdBy')} data-testid="fb-review-author">
            {who(version.createdBy)}
          </Field>
          <Field label={t('flowBuilder.review.proposedBy')} data-testid="fb-review-proposer">
            {proposer ? who(proposer) : t('flowBuilder.review.notYet')}
          </Field>
          <Field label={t('flowBuilder.review.inForceSince')} kind={since ? 'date' : 'text'} data-testid="fb-review-since">
            {since ? formatDate(since) : t('flowBuilder.review.notInForce')}
          </Field>
        </FieldList>

        <section data-testid="fb-review-sentences">
          <SectionHeading level="group">{t('flowBuilder.review.sentences')}</SectionHeading>
          {steps.length === 0 ? (
            <p className="mt-1 text-sm text-text-secondary">{t('flowBuilder.review.nothing')}</p>
          ) : (
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-text-primary">
              {steps.map((s) => (
                <li key={s.id} data-testid={`fb-review-sentence-${s.id}`}>
                  {sentence(s)}
                </li>
              ))}
            </ul>
          )}
        </section>

        {steps.length > 0 ? (
          <DataTable
            density="compact"
            ariaLabel={t('flowBuilder.review.elements')}
            testId="fb-review-elements"
            columns={columns}
            rows={steps}
            rowKey={(s) => s.id}
          />
        ) : null}

        <section className="space-y-2" data-testid="fb-review-findings">
          <SectionHeading level="group">{t('flowBuilder.review.findings')}</SectionHeading>
          {findings.length === 0 ? (
            <p className="text-sm text-text-secondary">{t('flowBuilder.review.findingsNone')}</p>
          ) : (
            findings.map((f, i) => (
              <Notice
                key={`${findingKey(f)}#${i}`}
                tone={TONE[f.severity]}
                title={`${f.code} · ${t(`flowBuilder.severity.${f.severity}`)}`}
                data-testid={`fb-review-finding-${f.code}`}
              >
                <p>{findingText(f)}</p>
                {f.severity === 'warning' ? (
                  <p className="mt-1 text-xs">
                    {t(
                      version.acknowledged.includes(findingKey(f))
                        ? 'flowBuilder.review.acknowledged'
                        : 'flowBuilder.review.notAcknowledged',
                    )}
                  </p>
                ) : null}
              </Notice>
            ))
          )}
        </section>

        <section data-testid="fb-review-history">
          <SectionHeading level="group">{t('flowBuilder.review.history.title')}</SectionHeading>
          <Timeline events={history} className="mt-2" />
        </section>
      </div>
    </SidePanel>
  );
};

export default ChangeReview;
