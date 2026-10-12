import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Info } from 'lucide-react';
import Button from '../../components/ui-v2/Button';
import { Card } from '../../components/ui-v2/Card';
import Data from '../../components/ui-v2/Data';
import DataTable, { type Column } from '../../components/ui-v2/DataTable';
import Dialog from '../../components/ui-v2/Dialog';
import { FormField, Select, TextInput } from '../../components/ui-v2/Form';
import HandoffNotice from '../../components/ui-v2/HandoffNotice';
import Notice from '../../components/ui-v2/Notice';
import SectionHeading from '../../components/ui-v2/SectionHeading';
import StatusPill from '../../components/ui-v2/StatusPill';
import ActorPreActNotice from '../../components/ui-v2/ActorPreActNotice';
import { useToast } from '../../hooks/useToast';
import { useRefusalText } from '../../hooks/useRefusalText';
import type { VerbAvailability } from '../../services/transitions/handoff';
import { getGuide, guideLocaleFor } from '../../guides';
import { formatDate } from '../../lib/format';
import { namedSeatRefusalKey } from '../../lib/namedSeatRefusal';
import { isAttributed } from '../../lib/enforcement';
import { personLabel } from '../../services/identity/personLabel';
import { useFlowVersionCreate } from '../../services/query/commandHooks';
import type { FlowVersion } from '../../services/flowBuilder/flowVersion';
import { flowVersionStore } from '../../services/flowBuilder/flowVersionStore';
import { readFlowVersions } from '../../services/flowBuilder/liveWorld';
import {
  isGateable,
  MAX_ELEMENTS_PER_ACT,
  VERSION_RULES,
  type FindingSeverity,
  type ValidationWorld,
} from '../../services/flowBuilder/validateVersion';
import { flowVersionRefusalKey } from './flowVersionRefusal';

// ────────────────────────────────────────────────────────────────────────────
// FB-1 · THE CHANGES VIEW — every version of every process, and the rules a
// change must obey.
//
// NOTHING HERE IS IN FORCE. A change can be created and listed; proposing,
// approving and switching one on arrive with their own batches, and until then
// every process runs as it shipped. The page says so rather than leaving the
// reader to infer it from the absence of a button.
// ────────────────────────────────────────────────────────────────────────────

const SEVERITY_TONE: Readonly<Record<FindingSeverity, 'danger' | 'warning' | 'neutral'>> = {
  error: 'danger',
  warning: 'warning',
  info: 'neutral',
};

/** A process's name as its guide titles it, with the code a reader can trace. */
const useProcessName = (): ((entity: string) => string) => {
  const { i18n } = useTranslation();
  return (entity) => getGuide(entity, guideLocaleFor(i18n.language))?.title ?? entity;
};

/** The rules, rendered from the library's own table — never a second list. */
export const RulesReference: React.FC = () => {
  const { t } = useTranslation();
  type Rule = (typeof VERSION_RULES)[number];
  const columns: Column<Rule>[] = [
    { id: 'code', header: t('flowBuilder.rules.col.code'), kind: 'id', cell: (r) => r.code },
    {
      id: 'severity',
      header: t('flowBuilder.rules.col.severity'),
      kind: 'status',
      cell: (r) => (
        <StatusPill variant={SEVERITY_TONE[r.severity]}>{t(`flowBuilder.severity.${r.severity}`)}</StatusPill>
      ),
    },
    {
      id: 'text',
      header: t('flowBuilder.rules.col.text'),
      kind: 'text',
      cell: (r) => t(`flowBuilder.rule.${r.code}.text`, { limit: MAX_ELEMENTS_PER_ACT }),
    },
    {
      id: 'why',
      header: t('flowBuilder.rules.col.why'),
      kind: 'text',
      cell: (r) => t(`flowBuilder.rule.${r.code}.why`),
    },
  ];
  return (
    <Card as="section" padding="none" data-testid="fb-rules">
      <div className="border-b border-border-subtle p-4">
        <SectionHeading as="h2">{t('flowBuilder.rules.title')}</SectionHeading>
        <p className="mt-1 max-w-prose text-meta text-text-secondary">{t('flowBuilder.rules.body')}</p>
      </div>
      <DataTable
        density="compact"
        card={false}
        ariaLabel={t('flowBuilder.rules.aria')}
        columns={columns}
        rows={VERSION_RULES}
        rowKey={(r) => r.code}
        rowProps={(r) => ({ 'data-testid': `fb-rule-${r.code}` })}
      />
    </Card>
  );
};

/** The pop-up that starts a change. Mounted only for a seat that holds `flow:draft`. */
export const NewChangeDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  world: ValidationWorld;
}> = ({ open, onClose, onCreated, world }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const processName = useProcessName();
  const create = useFlowVersionCreate();
  // What the pop-up offers is narrower than what the act admits, never wider:
  // a process a command can write through, with an act something can stand in
  // front of.
  const processes = useMemo(
    () =>
      world.flows
        .filter((f) => f.entity !== 'flowVersion' && world.wiredEntities.includes(f.entity) && f.transitions.some(isGateable))
        .map((f) => f.entity),
    [world],
  );
  const [process, setProcess] = useState(processes[0] ?? '');
  const [title, setTitle] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await create.mutateAsync({ process, title });
    if (result.status === 'failed') {
      const key = namedSeatRefusalKey(result.reason) ?? flowVersionRefusalKey(result.reason);
      toast({
        variant: 'error',
        title:
          (key ? t(key) : null) ??
          refusalText(result.reason) ??
          t('flowBuilder.create.refused', { reason: result.reason ?? '' }),
      });
      return;
    }
    const made = result.entityId ? flowVersionStore.byId(result.entityId) : undefined;
    toast({
      variant: 'success',
      title: t('flowBuilder.create.ok', { label: made?.label ?? '', process: processName(process) }),
    });
    setTitle('');
    onCreated();
  };

  return (
    <Dialog open={open} onClose={onClose} title={t('flowBuilder.create.title')} testId="fb-create-dialog">
      <p className="mb-3 text-xs leading-relaxed text-text-secondary">{t('flowBuilder.create.intro')}</p>
      <form className="flex flex-col gap-3" onSubmit={submit}>
        <FormField label={t('flowBuilder.create.process')} hint={t('flowBuilder.create.processHint')}>
          <Select data-testid="fb-create-process" value={process} onChange={(e) => setProcess(e.target.value)}>
            {processes.map((p) => (
              <option key={p} value={p}>
                {processName(p)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('flowBuilder.create.titleField')} hint={t('flowBuilder.create.titleHint')}>
          <TextInput data-testid="fb-create-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </FormField>
        <p className="text-xs leading-relaxed text-text-tertiary" data-testid="fb-create-persistence">
          {t('flowBuilder.create.persistence')}
        </p>
        <ActorPreActNotice
          unattributedKey="identity.preAct.namedRequired"
          className="text-xs text-text-tertiary leading-relaxed"
          testId="fb-create-actor"
        />
        <div>
          <Button type="submit" variant="primary" data-testid="fb-create-submit">
            {t('flowBuilder.create.submit')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

/** What a seat that does not hold the right reads in the header's primary slot. */
export const ChangeGate: React.FC<{ availability: VerbAvailability }> = ({ availability }) => {
  const { t } = useTranslation();
  return (
    <span className="flex items-center gap-2" data-testid="fb-create-gate" title={t('flowBuilder.create.gateBody')}>
      <span className="text-xs text-text-secondary">{t('flowBuilder.create.gateTitle')}</span>
      <HandoffNotice availability={availability} testId="handoff-flow-draft" />
    </span>
  );
};

const ChangesView: React.FC<{
  /** Bumped by the page when a change is created, so the read is taken again. */
  revision: number;
  world: ValidationWorld;
  /** The version a link named, when it exists. */
  current: string | null;
}> = ({ revision, world, current }) => {
  const { t } = useTranslation();
  const processName = useProcessName();
  // ⚠️ WHAT THE STORE REFUSED AND WHAT NO LONGER OBEYS ITS RULES, READ FROM THE
  // READ ITSELF. A failed parse that returned an empty list would be believed.
  const read = useMemo(() => readFlowVersions(world), [revision, world]);

  const columns: Column<FlowVersion>[] = [
    { id: 'label', header: t('flowBuilder.changes.col.label'), kind: 'id', cell: (v) => v.label },
    {
      id: 'process',
      header: t('flowBuilder.changes.col.process'),
      kind: 'text',
      cell: (v) => processName(v.content.entity),
    },
    { id: 'title', header: t('flowBuilder.changes.col.title'), kind: 'text', cell: (v) => v.title },
    {
      id: 'state',
      header: t('flowBuilder.changes.col.state'),
      kind: 'status',
      cell: (v) => <StatusPill variant="neutral">{t(`flowBuilder.state.${v.state}`)}</StatusPill>,
    },
    {
      id: 'elements',
      header: t('flowBuilder.changes.col.elements'),
      kind: 'text',
      cell: (v) =>
        t('flowBuilder.changes.elements', {
          count: v.content.steps.length + v.content.forks.length + v.content.checks.length,
        }),
    },
    {
      id: 'createdBy',
      header: t('flowBuilder.changes.col.createdBy'),
      kind: 'text',
      cell: (v) => (isAttributed(v.createdBy) ? personLabel(v.createdBy.person.personId, t) : t('identity.actor.unknown')),
    },
    {
      id: 'createdAt',
      header: t('flowBuilder.changes.col.createdAt'),
      kind: 'date',
      cell: (v) => formatDate(v.createdAt),
    },
  ];

  return (
    <div className="space-y-6" data-testid="fb-changes">
      <Card as="section" padding="none">
        <div className="border-b border-border-subtle p-4">
          <SectionHeading as="h2">{t('flowBuilder.changes.title')}</SectionHeading>
          <p className="mt-1 max-w-prose text-meta text-text-secondary">{t('flowBuilder.changes.body')}</p>
        </div>
        <div className="space-y-3 p-4">
          <Notice tone="sample" icon={Info} title={t('flowBuilder.kept.title')} data-testid="fb-kept">
            <p>{t('flowBuilder.kept.body')}</p>
          </Notice>
          {read.unreadable ? (
            <Notice
              tone="warning"
              icon={AlertTriangle}
              title={t('flowBuilder.store.unreadableTitle')}
              data-testid="fb-store-unreadable"
            >
              <p>{t('flowBuilder.store.unreadableBody')}</p>
            </Notice>
          ) : null}
          {read.rejected.length > 0 ? (
            <Notice
              tone="warning"
              icon={AlertTriangle}
              title={t('flowBuilder.store.rejectedTitle')}
              data-testid="fb-store-rejected"
            >
              <p>{t('flowBuilder.store.rejectedBody')}</p>
              <ul className="mt-1 list-disc pl-5">
                {read.rejected.map((r) => (
                  <li key={r.id}>
                    <Data>{r.id}</Data> — {r.reason}
                  </li>
                ))}
              </ul>
            </Notice>
          ) : null}
          {read.flagged.length > 0 ? (
            <Notice
              tone="warning"
              icon={AlertTriangle}
              title={t('flowBuilder.store.flaggedTitle')}
              data-testid="fb-store-flagged"
            >
              <p>{t('flowBuilder.store.flaggedBody')}</p>
              <ul className="mt-1 list-disc pl-5">
                {read.flagged.flatMap(({ version, findings }) =>
                  findings.map((f, i) => (
                    <li key={`${version.id}#${f.code}#${f.element}#${i}`}>
                      {t('flowBuilder.store.flaggedRow', {
                        label: version.label,
                        process: processName(version.content.entity),
                        code: f.code,
                        element: f.element,
                      })}{' '}
                      — {t(`flowBuilder.rule.${f.code}.text`, { limit: MAX_ELEMENTS_PER_ACT })}
                    </li>
                  )),
                )}
              </ul>
            </Notice>
          ) : null}
        </div>
        <DataTable
          card={false}
          ariaLabel={t('flowBuilder.changes.aria')}
          testId="fb-changes-table"
          columns={columns}
          rows={read.versions}
          rowKey={(v) => v.id}
          rowProps={(v) => ({
            'data-testid': `fb-version-${v.id}`,
            ...(v.id === current ? { 'aria-current': 'true' as const } : {}),
          })}
          empty={
            <div className="px-4 py-10 text-center" data-testid="fb-changes-empty">
              <p className="text-sm text-text-secondary">{t('flowBuilder.changes.empty')}</p>
              <p className="mt-1 text-xs text-text-tertiary">{t('flowBuilder.changes.emptyHint')}</p>
            </div>
          }
        />
      </Card>

      <RulesReference />
    </div>
  );
};

export default ChangesView;
