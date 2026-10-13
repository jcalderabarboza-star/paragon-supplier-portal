import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import Button from '../../components/ui-v2/Button';
import Data from '../../components/ui-v2/Data';
import DataTable, { CellSub, type Column } from '../../components/ui-v2/DataTable';
import Dialog from '../../components/ui-v2/Dialog';
import SidePanel from '../../components/ui-v2/SidePanel';
import Notice from '../../components/ui-v2/Notice';
import StatusPill from '../../components/ui-v2/StatusPill';
import SectionHeading from '../../components/ui-v2/SectionHeading';
import HandoffNotice from '../../components/ui-v2/HandoffNotice';
import ActorPreActNotice from '../../components/ui-v2/ActorPreActNotice';
import { Field, FieldList } from '../../components/ui-v2/Field';
import { FormField, Select, TextArea, TextInput } from '../../components/ui-v2/Form';
import { useToast } from '../../hooks/useToast';
import { useRefusalText } from '../../hooks/useRefusalText';
import { useVerbAvailability } from '../../hooks/useVerbAvailability';
import { formatDateTime } from '../../lib/format';
import { isAttributed, type ActorAttribution } from '../../lib/enforcement';
import { namedSeatRefusalKey } from '../../lib/namedSeatRefusal';
import { personLabel } from '../../services/identity/personLabel';
import { moduleDeployment } from '../../services/modules/deployment';
import { useMasterDataRequestAct } from '../../services/query/commandHooks';
import { useServiceQuery } from '../../services/query/useServiceQuery';
import { masterDataRequestStore } from '../../services/data/mock/stores/masterDataRequestStore';
import {
  MDR_FIELDS,
  currentValue,
  fieldsSapChanged,
  handOffPackage,
  objectOfKind,
  type MasterDataRequest,
  type MdrKind,
  type MdrState,
} from '../../services/masterData/changeRequest';
import { referenceOptions } from '../../services/masterData/lookup';
import { recordOf, syncRuns } from '../../services/masterData/replica';
import { runSampleSync, sampleSyncRefusal } from '../../services/masterData/sampleSync';
import type { MasterRecord, ReferenceTable, SyncRun } from '../../services/masterData/types';
import { mdrRefusalKey } from './mdrRefusal';

// ─────────────────────────────────────────────────────────────────────────────
// MD-4 / MD-5 · CHANGE REQUESTS AND THE SYNC LOG — the two views of the
// master-data page that are about change.
//
// SAP owns the records, so nothing here edits one. A person PROPOSES; a second
// person reviews; procurement hands the agreed request to SAP; the request ends
// on SAP's answer. "Approved" is worded as agreement to ask, never as "exists".
//
// Requests live in memory for the session and the page says so.
// ─────────────────────────────────────────────────────────────────────────────

export const MASTER_DATA_QUERY = ['masterData'] as const;

const STATE_VARIANT: Record<MdrState, 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  Proposed: 'info',
  'In Review': 'info',
  Approved: 'warning',
  'Sent to SAP': 'warning',
  'Completed in SAP': 'success',
  'Declined by SAP': 'danger',
  Rejected: 'danger',
  Withdrawn: 'neutral',
};

/** A proposed field whose value is chosen from a reference table. */
const TABLE_OF_FIELD: Readonly<Record<string, ReferenceTable>> = {
  materialType: 'materialType',
  materialGroup: 'materialGroup',
  baseUnit: 'unit',
  country: 'country',
  paymentTerm: 'paymentTerm',
  incoterm: 'incoterm',
};

export function useMasterDataRequests() {
  return useServiceQuery([...MASTER_DATA_QUERY, 'requests'], async () => [...masterDataRequestStore.all()]);
}

const stateKey = (state: MdrState): string => `masterData.request.state.${state.replace(/ /g, '_')}`;

/** Fire one act, say what happened in the reader's words, and take every master-data read again. */
function useAct() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const act = useMasterDataRequestAct();
  const client = useQueryClient();
  return async (
    input: { transitionId: string; entityId?: string; payload: Record<string, unknown> },
    done: string,
  ): Promise<boolean> => {
    const result = await act.mutateAsync(input);
    await client.invalidateQueries({ queryKey: [...MASTER_DATA_QUERY] });
    if (result.status === 'failed') {
      const key = namedSeatRefusalKey(result.reason) ?? mdrRefusalKey(result.reason);
      toast({
        variant: 'error',
        title: (key ? t(key) : null) ?? refusalText(result.reason) ?? t('masterData.request.refused', { reason: result.reason ?? '' }),
      });
      return false;
    }
    toast({ variant: 'success', title: done });
    return true;
  };
}

const who = (actor: ActorAttribution, t: ReturnType<typeof useTranslation>['t']): string =>
  isAttributed(actor) ? personLabel(actor.person.personId, t) : t('identity.actor.unknown');

// ── Propose ──────────────────────────────────────────────────────────────────

/** The pop-up that raises a request: a new material, or a change to the record it was opened from. */
export const ProposeDialog: React.FC<{
  kind: MdrKind;
  subject: MasterRecord | null;
  onClose: () => void;
  onProposed: (requestId: string | null) => void;
}> = ({ kind, subject, onClose, onProposed }) => {
  const { t } = useTranslation();
  const fire = useAct();
  const fields = MDR_FIELDS[kind];
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f, subject ? currentValue(subject, f) ?? '' : ''])),
  );
  const [reason, setReason] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // A change proposes only the fields that move; a create proposes them all.
    const proposed = subject
      ? Object.fromEntries(Object.entries(values).filter(([f, v]) => v.trim() !== '' && v.trim() !== (currentValue(subject, f) ?? '')))
      : values;
    const before = masterDataRequestStore.all().length;
    const ok = await fire(
      { transitionId: 't_mdr_propose', payload: { kind, subjectKey: subject?.key ?? '', proposed, reason } },
      t('masterData.request.toast.proposed'),
    );
    if (ok) onProposed(masterDataRequestStore.all()[before]?.id ?? null);
  };

  return (
    <Dialog open onClose={onClose} title={t(`masterData.request.propose.title.${kind}`)} testId="mdr-propose-dialog">
      <p className="mb-3 text-xs leading-relaxed text-text-secondary">{t('masterData.request.propose.intro')}</p>
      <form className="flex flex-col gap-3" onSubmit={submit}>
        {subject ? (
          <FormField label={t('masterData.request.field.subject')}>
            <Data>{subject.key}</Data>
          </FormField>
        ) : null}
        {fields.map((f) => {
          const table = TABLE_OF_FIELD[f];
          const set = (v: string) => setValues((prev) => ({ ...prev, [f]: v }));
          return (
            <FormField key={f} label={t(`masterData.field.${f}`)}>
              {table ? (
                <Select data-testid={`mdr-field-${f}`} value={values[f]} onChange={(e) => set(e.target.value)}>
                  <option value="">{t('masterData.request.propose.choose')}</option>
                  {referenceOptions(table).map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <TextInput data-testid={`mdr-field-${f}`} value={values[f]} onChange={(e) => set(e.target.value)} />
              )}
            </FormField>
          );
        })}
        <FormField label={t('masterData.request.field.reason')}>
          <TextArea data-testid="mdr-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormField>
        <p className="text-xs leading-relaxed text-text-tertiary" data-testid="mdr-propose-session">
          {t('masterData.request.session')}
        </p>
        <ActorPreActNotice
          unattributedKey="identity.preAct.namedRequired"
          className="text-xs text-text-tertiary leading-relaxed"
          testId="mdr-propose-actor"
        />
        <div>
          <Button type="submit" variant="primary" data-testid="mdr-propose-submit">
            {t('masterData.request.propose.submit')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

// ── The request drawer ───────────────────────────────────────────────────────

const RequestDrawer: React.FC<{ request: MasterDataRequest; onClose: () => void }> = ({ request, onClose }) => {
  const { t } = useTranslation();
  const fire = useAct();
  const [note, setNote] = useState('');
  const canPropose = useVerbAvailability('masterdata:propose');
  const canReview = useVerbAvailability('masterdata:review');
  const canHandOff = useVerbAvailability('masterdata:handoff');
  const canAnswer = useVerbAvailability('masterdata:record-sap-answer');
  const subject = request.subjectKey ? recordOf(objectOfKind(request.kind), request.subjectKey) : null;
  const moved = fieldsSapChanged(request);
  const pkg = handOffPackage(request);
  const noNote = note.trim() === '';
  const sampleAnswers = !moduleDeployment.isProduction();

  const run = async (transitionId: string, payload: Record<string, unknown>, done: string) => {
    if (await fire({ transitionId, entityId: request.id, payload }, done)) setNote('');
  };
  const sapNumber = `SAMPLE-CR-${request.number}`;


  const asksNote = request.state === 'Proposed' || request.state === 'In Review' || request.state === 'Approved' || (request.state === 'Sent to SAP' && sampleAnswers);

  return (
    <SidePanel
      open
      onClose={onClose}
      title={request.number}
      footerActions={
    request.state === 'Proposed' ? (
      <>
        {canReview.kind === 'held' ? (
          <Button data-testid="mdr-act-start-review" onClick={() => run('t_mdr_start_review', {}, t('masterData.request.toast.inReview'))}>
            {t('masterData.request.act.startReview')}
          </Button>
        ) : (
          <HandoffNotice availability={canReview} testId="handoff-mdr-review" />
        )}
        {canPropose.kind === 'held' ? (
          <Button tone="critical" disabled={noNote} data-testid="mdr-act-withdraw" onClick={() => run('t_mdr_withdraw', { note }, t('masterData.request.toast.withdrawn'))}>
            {t('masterData.request.act.withdraw')}
          </Button>
        ) : null}
      </>
    ) : request.state === 'In Review' ? (
      canReview.kind === 'held' ? (
        <>
          <Button variant="primary" data-testid="mdr-act-approve" onClick={() => run('t_mdr_approve', {}, t('masterData.request.toast.approved'))}>
            {t('masterData.request.act.approve')}
          </Button>
          <Button disabled={noNote} data-testid="mdr-act-return" onClick={() => run('t_mdr_return', { note }, t('masterData.request.toast.returned'))}>
            {t('masterData.request.act.return')}
          </Button>
          <Button tone="critical" disabled={noNote} data-testid="mdr-act-reject" onClick={() => run('t_mdr_reject', { note }, t('masterData.request.toast.rejected'))}>
            {t('masterData.request.act.reject')}
          </Button>
        </>
      ) : (
        <HandoffNotice availability={canReview} testId="handoff-mdr-review" />
      )
    ) : request.state === 'Approved' ? (
      <>
        {canHandOff.kind === 'held' ? (
          <Button variant="primary" data-testid="mdr-act-hand-off" onClick={() => run('t_mdr_hand_off', {}, t('masterData.request.toast.sent'))}>
            {t('masterData.request.act.handOff')}
          </Button>
        ) : (
          <HandoffNotice availability={canHandOff} testId="handoff-mdr-handoff" />
        )}
        {canPropose.kind === 'held' ? (
          <Button tone="critical" disabled={noNote} data-testid="mdr-act-withdraw" onClick={() => run('t_mdr_withdraw', { note }, t('masterData.request.toast.withdrawn'))}>
            {t('masterData.request.act.withdraw')}
          </Button>
        ) : null}
      </>
    ) : request.state === 'Sent to SAP' && sampleAnswers ? (
      canAnswer.kind === 'held' ? (
        <>
          <Button data-testid="mdr-act-sap-complete" onClick={() => run('t_mdr_sap_complete', { sapRequestNumber: sapNumber, sample: true }, t('masterData.request.toast.completed'))}>
            {t('masterData.request.act.sapComplete')}
          </Button>
          <Button disabled={noNote} data-testid="mdr-act-sap-decline" onClick={() => run('t_mdr_sap_decline', { sapRequestNumber: sapNumber, sample: true, note }, t('masterData.request.toast.declined'))}>
            {t('masterData.request.act.sapDecline')}
          </Button>
        </>
      ) : (
        <HandoffNotice availability={canAnswer} testId="handoff-mdr-answer" />
      )
    ) : undefined
      }
    >
      <div data-testid="mdr-drawer" data-state={request.state} data-request={request.id} className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill variant={STATE_VARIANT[request.state]} data-testid="mdr-state">
            {t(stateKey(request.state))}
          </StatusPill>
          <span className="text-meta text-text-tertiary">{t(`masterData.request.stateNote.${request.state.replace(/ /g, '_')}`)}</span>
        </div>

        {moved.length > 0 && (request.state === 'Proposed' || request.state === 'In Review' || request.state === 'Approved') ? (
          <Notice tone="warning" title={t('masterData.request.sapChanged.title')} data-testid="mdr-sap-changed">
            {t('masterData.request.sapChanged.body', { fields: moved.map((f) => t(`masterData.field.${f}`)).join(', ') })}
          </Notice>
        ) : null}

        <section>
          <SectionHeading level="group">{t('masterData.request.section.asked')}</SectionHeading>
          <FieldList columns={2} className="mt-3" data-testid="mdr-asked">
            <Field label={t('masterData.request.field.kind')}>{t(`masterData.request.kind.${request.kind}`)}</Field>
            <Field label={t('masterData.request.field.subject')} kind={request.subjectKey ? 'id' : 'text'}>
              {request.subjectKey ?? t('masterData.request.noKeyYet')}
            </Field>
            <Field label={t('masterData.request.field.proposedBy')}>{who(request.proposedBy, t)}</Field>
            <Field label={t('masterData.request.field.proposedAt')} kind="date">{formatDateTime(request.proposedAt)}</Field>
            <Field label={t('masterData.request.field.reason')} wide>{request.reason}</Field>
          </FieldList>
        </section>

        <section>
          <SectionHeading level="group">{t('masterData.request.section.proposed')}</SectionHeading>
          <FieldList columns={2} className="mt-3" data-testid="mdr-proposed">
            {Object.entries(request.proposed).map(([field, value]) => (
              <Field
                key={field}
                label={t(`masterData.field.${field}`)}
                sub={subject ? t('masterData.request.sapHolds', { value: currentValue(subject, field) ?? t('masterData.field.notHeld') }) : undefined}
                data-testid={`mdr-proposed-${field}`}
              >
                {value}
              </Field>
            ))}
          </FieldList>
        </section>

        {request.state === 'Approved' || request.state === 'Sent to SAP' || request.sap ? (
          <section data-testid="mdr-package">
            <SectionHeading level="group">{t('masterData.request.section.package')}</SectionHeading>
            <p className="mb-3 mt-1 text-meta text-text-tertiary">{t('masterData.request.packageNote')}</p>
            <FieldList columns={2}>
              <Field label={t('masterData.request.package.reference')} kind="id">{pkg.externalReference}</Field>
              <Field label={t('masterData.request.package.object')}>{t(`masterData.object.${pkg.object}`)}</Field>
              <Field label={t('masterData.request.package.approvedBy')}>
                {pkg.approvedBy ? personLabel(pkg.approvedBy, t) : t('masterData.request.package.notYet')}
              </Field>
              <Field label={t('masterData.request.package.base')} kind={pkg.base ? 'id' : 'text'}>
                {pkg.base ? pkg.base.syncRun : t('masterData.request.noKeyYet')}
              </Field>
            </FieldList>
          </section>
        ) : null}

        {request.sap ? (
          <Notice
            tone={request.sap.sample ? 'sample' : 'info'}
            title={t(request.sap.resultKey ? 'masterData.request.sap.completedTitle' : 'masterData.request.sap.declinedTitle')}
            data-testid="mdr-sap-answer"
          >
            {request.sap.resultKey
              ? t('masterData.request.sap.completedBody', { key: request.sap.resultKey, number: request.sap.sapRequestNumber })
              : t('masterData.request.sap.declinedBody', { reason: request.sap.reason ?? '', number: request.sap.sapRequestNumber })}
            {request.sap.sample ? ` ${t('masterData.request.sap.sampleMark')}` : ''}
          </Notice>
        ) : null}

        {request.state === 'Sent to SAP' && !sampleAnswers ? (
          <Notice tone="neutral" data-testid="mdr-awaiting-sap">{t('masterData.request.awaitingSap')}</Notice>
        ) : null}

        {asksNote ? (
          <section>
            <FormField label={t('masterData.request.field.note')} hint={t('masterData.request.noteHint')}>
              <TextArea data-testid="mdr-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </FormField>
            <ActorPreActNotice
              unattributedKey="identity.preAct.namedRequired"
              className="mt-2 text-xs text-text-tertiary leading-relaxed"
              testId="mdr-drawer-actor"
            />
          </section>
        ) : null}

        <section>
          <SectionHeading level="group">{t('masterData.request.section.history')}</SectionHeading>
          <FieldList columns={1} className="mt-3" data-testid="mdr-history">
            {request.history.map((h, i) => (
              <Field key={`${h.act}-${i}`} label={`${formatDateTime(h.at)} · ${who(h.by, t)}`} sub={h.note ?? undefined}>
                {t(`masterData.request.did.${h.act}`)}
              </Field>
            ))}
          </FieldList>
        </section>
      </div>
    </SidePanel>
  );
};

// ── The requests view ────────────────────────────────────────────────────────

export const ChangeRequestsView: React.FC<{ openId: string | null; onOpen: (id: string | null) => void }> = ({ openId, onOpen }) => {
  const { t } = useTranslation();
  const requests = useMasterDataRequests();
  const rows = useMemo(() => [...(requests.data ?? [])].reverse(), [requests.data]);
  const open = openId ? rows.find((r) => r.id === openId) ?? null : null;

  const columns = useMemo<Column<MasterDataRequest>[]>(
    () => [
      { id: 'number', header: t('masterData.request.col.number'), kind: 'id', cell: (r) => r.number },
      {
        id: 'ask',
        header: t('masterData.request.col.ask'),
        kind: 'text',
        primary: true,
        cell: (r) => (
          <>
            {t(`masterData.request.kind.${r.kind}`)}
            <CellSub>{r.subjectKey ?? r.proposed.description ?? ''}</CellSub>
          </>
        ),
      },
      { id: 'by', header: t('masterData.request.col.by'), kind: 'text', cell: (r) => who(r.proposedBy, t) },
      {
        id: 'state',
        header: t('masterData.request.col.state'),
        kind: 'status',
        cell: (r) => <StatusPill variant={STATE_VARIANT[r.state]}>{t(stateKey(r.state))}</StatusPill>,
      },
      { id: 'at', header: t('masterData.request.col.at'), kind: 'date', cell: (r) => <Data>{formatDateTime(r.proposedAt)}</Data> },
    ],
    [t],
  );

  return (
    <div data-testid="mdr-view">
      <Notice tone="neutral" data-testid="mdr-session-notice">
        {t('masterData.request.session')}
      </Notice>
      <div className="mt-4">
        {rows.length === 0 ? (
          <Notice tone="neutral" data-testid="mdr-empty">
            {t('masterData.request.empty')}
          </Notice>
        ) : (
          <DataTable
            testId="mdr-table"
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            onRowClick={(r) => onOpen(r.id)}
            rowProps={(r) => ({ 'data-testid': `mdr-row-${r.id}`, 'data-state': r.state })}
          />
        )}
      </div>
      {open ? <RequestDrawer request={open} onClose={() => onOpen(null)} /> : null}
    </div>
  );
};

// ── The sync log ─────────────────────────────────────────────────────────────

export const SyncLogView: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const client = useQueryClient();
  const log = useServiceQuery([...MASTER_DATA_QUERY, 'sync-log-view'], async () => [...syncRuns()]);
  const rows = log.data ?? [];
  const refusal = sampleSyncRefusal();

  const run = async () => {
    const result = runSampleSync();
    await client.invalidateQueries({ queryKey: [...MASTER_DATA_QUERY] });
    toast(
      result.ok
        ? { variant: 'success', title: t('masterData.sync.sample.done', { taken: result.run.created + result.run.changed, refused: result.run.refused.length }) }
        : { variant: 'error', title: t(`masterData.sync.sample.refusal.${result.refusal}`) },
    );
  };

  const columns = useMemo<Column<SyncRun>[]>(
    () => [
      { id: 'id', header: t('masterData.sync.col.run'), kind: 'id', cell: (r) => r.id },
      { id: 'source', header: t('masterData.sync.col.source'), kind: 'text', primary: true, cell: (r) => t(`masterData.stamp.source.${r.source}`) },
      { id: 'at', header: t('masterData.sync.col.at'), kind: 'date', cell: (r) => <Data>{formatDateTime(r.at)}</Data> },
      { id: 'created', header: t('masterData.sync.col.created'), kind: 'number', cell: (r) => r.created },
      { id: 'changed', header: t('masterData.sync.col.changed'), kind: 'number', cell: (r) => r.changed },
      { id: 'unchanged', header: t('masterData.sync.col.unchanged'), kind: 'number', cell: (r) => r.unchanged },
      { id: 'missing', header: t('masterData.sync.col.missing'), kind: 'number', cell: (r) => r.missing },
      {
        id: 'refused',
        header: t('masterData.sync.col.refused'),
        kind: 'text',
        cell: (r) =>
          r.refused.length === 0 ? (
            '0'
          ) : (
            <>
              {r.refused.length}
              {r.refused.map((x) => (
                <CellSub key={`${x.object}:${x.key}`} tone="warning">
                  {x.key} — {t(`masterData.refusal.${x.reason}`, { value: x.value })}
                </CellSub>
              ))}
            </>
          ),
      },
    ],
    [t],
  );

  return (
    <div data-testid="sync-log-view">
      <Notice
        tone="sample"
        title={t('masterData.sync.sample.title')}
        data-testid="sync-sample-notice"
        action={
          refusal === null ? (
            <Button data-testid="sync-sample-run" onClick={run}>
              {t('masterData.sync.sample.run')}
            </Button>
          ) : undefined
        }
      >
        {refusal === null ? t('masterData.sync.sample.body') : t(`masterData.sync.sample.refusal.${refusal}`)}
      </Notice>
      <div className="mt-4">
        <DataTable
          testId="sync-log-table"
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          rowProps={(r) => ({ 'data-testid': `sync-run-${r.id}`, 'data-refused': String(r.refused.length) })}
        />
      </div>
    </div>
  );
};
