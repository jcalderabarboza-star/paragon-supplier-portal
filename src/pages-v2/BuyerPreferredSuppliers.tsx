// ─────────────────────────────────────────────────────────────────────────────
// THE PREFERRED-SUPPLIER QUEUE — PSL P3 · where a listing is RAISED and DECIDED.
//
// ⚠️ **A PAGE RATHER THAN A TAB, AND BOTH REVIEW LANES IN THIS TREE DID THE
// SAME** (operator ruling g). `/buyer/supplier-applications` and
// `/buyer/material-requests` were each shipped WITH their lane, for the reason
// that applies here unchanged: without a queue, a `Proposed` listing is only
// reachable by already knowing which supplier holds one, which is the question
// the queue exists to answer.
//
// ── ⚠️ PROPOSING AND DECIDING DO NOT COMPOSE INTO ONE PANEL (ruling g) ─────
//   The CREATE verb lives in the page header, acting on no selected row; the
//   DECIDE verbs live in the row panel, acting on a listing already chosen.
//   They never appear together, so the surface does not walk a single seat from
//   *raise* to *approve* in one flow.
//
//   ⚠️ **THAT IS A SURFACE MITIGATION AND IT IS NOT ENFORCEMENT.** The default
//   buyer seat holds all six lane bundles (§76d), so it holds both atoms. What
//   ENFORCES the split on the designations that matter is
//   `PSL_RESTRICTIVE_STATUS_APPROVED`, in the dispatcher, and this page renders
//   its verdict BEFORE the act rather than letting the dispatcher refuse a
//   button the page already offered.
//
// ── ⚠️ `IMPORTER-PRESENCE-IS-NOT-VERB-COVERAGE-01` APPLIES HERE ALMOST WORD
//     FOR WORD, WHICH IS WHY THE HEADER VERB HAS ITS OWN NOTICE ─────────────
//   `BuyerRequisitions` imported the guard, rendered four of them, and still
//   shipped a live **New PR** button to a seat holding no `pr:create` — because
//   every guarded verb acted on a document already selected and the CREATE verb
//   lived in the page header. `t_psl_propose` is that verb here. Coverage is
//   (surface × verb × ENTRANCE) and the header is an entrance.
//
// ── ⚠️ THE MODE IS GATED, NOT THE DOOR (`ENTRANCE-IS-THE-UNIT-01`) ─────────
//   The decide panel's confirm step is gated on the availability AND on the
//   seat-segregation verdict at the point of RENDER, not only where the panel
//   is opened. Component state outlives the seat: a panel standing open while
//   somebody narrows the seat on the identity panel is reachable, not a dead
//   branch, and `SupplierShipments` says so in its own comment.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ListPlus } from 'lucide-react';

import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import Button from '../components/ui-v2/Button';
import SidePanel from '../components/ui-v2/SidePanel';
import StatusPill from '../components/ui-v2/StatusPill';
import Data from '../components/ui-v2/Data';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';

import { useToast } from '../hooks/useToast';
import { useVerbAvailabilities } from '../hooks/useVerbAvailability';
import { useRefusalText, useDataErrorText } from '../hooks/useRefusalText';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { usePslListings } from '../services/query/hooks';
import {
  usePslPropose,
  usePslGrant,
  usePslReject,
} from '../services/query/commandHooks';
import { atomsForSeat } from '../services/transitions/customRoles';
import { restrictiveDecisionVerdict } from '../services/data/pslLeadCheck';
import { pslRefusalKey } from './psl/pslRefusal';
import { pslDisplayStatus, pslScopeCodes } from '../services/data/pslProjection';
import { PSL_STATUSES, type PslListing, type PslStatus } from '../services/data/pslListing';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';
import { statusLabelKey } from '../lib/statusLabel';
import { statusTone } from '../lib/statusTone';
import { formatDate } from '../lib/format';
import { DataError } from '../services/data/types';
import { mockSuppliers } from '../data/mockSuppliers';
import type { CommandResult } from '../services/data/types';

/**
 * THE READING INSTANT. `DECLARED_PRESENT`, exactly as every other PSL surface
 * uses — the corpus is anchored at `P`, so a projection read at the wall clock
 * would be answering a different question from the one the seed authored.
 */
const PSL_TODAY = DECLARED_PRESENT;

type Tab = 'proposed' | 'all';

/** Which confirmation step is open. `null` is the panel's resting state. */
type Pending = 'grant' | 'reject' | null;

interface ProposeDraft {
  supplierId: string;
  materialCodes: string;
  status: PslStatus;
  validFrom: string;
  validUntil: string;
  justification: string;
  reason: string;
  evidenceRefs: string;
}

const emptyDraft: ProposeDraft = {
  supplierId: '',
  materialCodes: '',
  status: 'Validated',
  validFrom: '',
  validUntil: '',
  justification: '',
  reason: '',
  evidenceRefs: '',
};

/** Comma-separated free text → a trimmed, non-empty list. The form collects a
 *  string because a person types one; the verb wants a list. */
const listOf = (raw: string): string[] =>
  raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');

const BuyerPreferredSuppliers: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const dataErrorText = useDataErrorText();
  const { identity } = useCurrentIdentity();

  // ⚠️ TRANSLATED AND BUILT INSIDE THE COMPONENT — the house convention, and
  // the one browser QA caught on the applications page when it was a
  // module-level English literal.
  const CRUMB = [t('psl.queue.nav'), t('psl.queue.title')];

  const { data, isLoading, isError, error } = usePslListings();
  const listings = useMemo(() => data?.items ?? [], [data]);

  const [tab, setTab] = useState<Tab>('proposed');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [reason, setReason] = useState('');
  const [proposeOpen, setProposeOpen] = useState(false);
  const [draft, setDraft] = useState<ProposeDraft>(emptyDraft);

  const propose = usePslPropose();
  const grant = usePslGrant();
  const reject = usePslReject();

  // ⚠️ ONE AVAILABILITY PER VERB, FROM THAT VERB'S OWN ATOM. `propose` and
  // `decide` are different questions in different lanes, and a seat may hold
  // one without the other — which is precisely the segregation this page's
  // layout expresses and the dispatcher enforces.
  const { propose: proposeAvailability, decide: decideAvailability } =
    useVerbAvailabilities({
      propose: 'psl:propose',
      decide: 'psl:decide',
    } as const);

  const selected = useMemo(
    () => listings.find((l) => l.id === selectedId) ?? null,
    [listings, selectedId],
  );

  /**
   * ⚠️ THE SEAT-SEGREGATION MIRROR — the SAME pure function the policy hook
   * asks (`pslLeadCheck.ts`), off the same call. `handlePinConfirm` /
   * `rfq_fx_pin_well_formed` is the precedent and its own note is the reason:
   * *"the dialog's own button is already disabled on a refusal; this is the
   * structural twin, so a keyboard or a future caller cannot route around it."*
   *
   * It is recomputed on every render from `identity.businessRoles`, so
   * narrowing the seat while this panel stands open re-gates the panel rather
   * than leaving a stale verdict behind it.
   */
  const seatVerdict = useMemo(
    () =>
      selected
        ? restrictiveDecisionVerdict(selected.status, atomsForSeat(identity.businessRoles))
        : null,
    [selected, identity.businessRoles],
  );
  const seatBlocksGrant = seatVerdict?.kind === 'SEAT_HOLDS_BOTH';

  const supplierName = (id: string): string =>
    mockSuppliers.find((s) => s.id === id)?.name ?? id;

  /** A refusal the dispatcher RETURNED, in the reader's language. */
  const describeRefused = (result: CommandResult): string =>
    (pslRefusalKey(result.reason) ? t(pslRefusalKey(result.reason)!) : null) ??
    refusalText(result.reason) ??
    result.reason ??
    t('psl.refusal.decisionBlank');

  /** A refusal the dispatcher THREW. `SCOPE_DENIED` and its siblings arrive as
   *  prose, which `useRefusalText` cannot read. */
  const describeThrown = (e: unknown, fallback: string): string =>
    dataErrorText(e instanceof DataError ? e.code : undefined) ??
    (e instanceof DataError ? e.message : fallback);

  const proposed = useMemo(
    () => listings.filter((l) => l.lifecycle === 'Proposed'),
    [listings],
  );
  const rows = tab === 'proposed' ? proposed : listings;

  const closePanel = (): void => {
    setSelectedId(null);
    setPending(null);
    setReason('');
  };

  const onGrant = async (): Promise<void> => {
    if (!selected) return;
    try {
      const result = await grant.mutateAsync({ listingId: selected.id, reason });
      if (result.status === 'failed') {
        toast({ variant: 'error', title: describeRefused(result) });
        return;
      }
      toast({
        variant: 'success',
        title: t('psl.toast.granted', { id: selected.id }),
      });
      closePanel();
    } catch (e) {
      toast({ variant: 'error', title: describeThrown(e, t('psl.refusal.decisionBlank')) });
    }
  };

  const onReject = async (): Promise<void> => {
    if (!selected) return;
    try {
      const result = await reject.mutateAsync({ listingId: selected.id, reason });
      if (result.status === 'failed') {
        toast({ variant: 'error', title: describeRefused(result) });
        return;
      }
      toast({
        variant: 'success',
        title: t('psl.toast.rejected', { id: selected.id }),
      });
      closePanel();
    } catch (e) {
      toast({ variant: 'error', title: describeThrown(e, t('psl.refusal.decisionBlank')) });
    }
  };

  const onPropose = async (): Promise<void> => {
    try {
      const result = await propose.mutateAsync({
        payload: {
          supplierId: draft.supplierId,
          materialCodes: listOf(draft.materialCodes),
          status: draft.status,
          validFrom: draft.validFrom,
          validUntil: draft.validUntil,
          justification: draft.justification,
          reason: draft.reason,
          evidenceRefs: listOf(draft.evidenceRefs),
        },
      });
      if (result.status === 'failed') {
        toast({ variant: 'error', title: describeRefused(result) });
        return;
      }
      toast({
        variant: 'success',
        title: t('psl.toast.proposed', {
          id: result.entityId ?? '',
          supplier: supplierName(draft.supplierId),
        }),
      });
      setProposeOpen(false);
      setDraft(emptyDraft);
    } catch (e) {
      toast({ variant: 'error', title: describeThrown(e, t('psl.refusal.decisionBlank')) });
    }
  };

  const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({
    label,
    hint,
    children,
  }) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-text-secondary">{label}</span>
      {children}
      {hint ? <span className="text-xs text-text-tertiary">{hint}</span> : null}
    </label>
  );

  const input =
    'border border-border-subtle rounded px-2 py-1.5 text-sm text-text-primary bg-white';

  const renderRow = (l: PslListing): React.ReactNode => {
    const shown = pslDisplayStatus(l, PSL_TODAY);
    return (
      <tr
        key={l.id}
        className="border-b border-border-subtle hover:bg-surface-subtle cursor-pointer"
        onClick={() => {
          setSelectedId(l.id);
          setPending(null);
          setReason('');
        }}
        data-testid={`psl-queue-row-${l.id}`}
      >
        <td className="py-3 px-3">
          <Data>{l.id}</Data>
        </td>
        <td className="py-3 px-3 text-text-primary">{supplierName(l.supplierId)}</td>
        <td className="py-3 px-3">
          <Data className="text-xs">{pslScopeCodes(l).join(', ')}</Data>
        </td>
        <td className="py-3 px-3">
          <StatusPill variant={statusTone(l.status)}>{t(statusLabelKey(l.status) ?? '', { defaultValue: l.status })}</StatusPill>
        </td>
        <td className="py-3 px-3">
          <StatusPill variant={statusTone(shown)}>{t(statusLabelKey(shown) ?? '', { defaultValue: shown })}</StatusPill>
        </td>
        <td className="py-3 px-3">
          <Data className="text-xs">
            {formatDate(l.validFrom)} — {formatDate(l.validUntil)}
          </Data>
        </td>
      </tr>
    );
  };

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={CRUMB}
        title={t('psl.queue.title')}
        subtitle={t('psl.queue.subtitle')}
        actions={
          /* THE CREATE VERB, in the page header, acting on no selected row —
             the one shape a panel-walking derivation cannot see, and the exact
             site `IMPORTER-PRESENCE-IS-NOT-VERB-COVERAGE-01` was filed about.
             Its own atom, its own notice, never the decide gate. */
          proposeAvailability.kind === 'held' ? (
            <Button
              variant="outline"
              onClick={() => setProposeOpen(true)}
              data-testid="psl-propose-open"
            >
              <ListPlus size={16} className="mr-2" />
              {t('psl.verb.propose')}
            </Button>
          ) : (
            <HandoffNotice availability={proposeAvailability} testId="handoff-psl-propose" />
          )
        }
      />

      <div className="flex gap-2 mb-4">
        {(['proposed', 'all'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            data-testid={`psl-queue-tab-${k}`}
            className={`text-sm px-3 py-1.5 rounded border ${
              tab === k
                ? 'border-action text-action'
                : 'border-border-subtle text-text-secondary'
            }`}
          >
            {t(`psl.queue.tab.${k}`)}
            {k === 'proposed' ? ` (${proposed.length})` : ` (${listings.length})`}
          </button>
        ))}
      </div>

      {isLoading ? <LoadingState /> : null}
      {isError ? <ErrorState error={error} breadcrumb={CRUMB} /> : null}
      {!isLoading && !isError && rows.length === 0 ? (
        <EmptyState
          breadcrumb={CRUMB}
          title={t('psl.queue.title')}
          subtitle={t('psl.queue.subtitle')}
          message={
            tab === 'proposed'
              ? `${t('psl.queue.empty')} ${t('psl.queue.emptyHint')}`
              : `${t('psl.queue.emptyAll')} ${t('psl.queue.emptyHint')}`
          }
        />
      ) : null}

      {!isLoading && !isError && rows.length > 0 ? (
        <div className="border border-border-subtle rounded-lg bg-white overflow-hidden">
          <table className="w-full text-sm" data-testid="psl-queue-table">
            <thead className="bg-surface-subtle text-text-tertiary text-xs uppercase">
              <tr>
                <th className="text-left py-2 px-3">PSL</th>
                <th className="text-left py-2 px-3">{t('psl.queue.col.supplier')}</th>
                <th className="text-left py-2 px-3">{t('psl.queue.col.scope')}</th>
                <th className="text-left py-2 px-3">{t('psl.queue.col.status')}</th>
                <th className="text-left py-2 px-3">{t('psl.queue.col.lifecycle')}</th>
                <th className="text-left py-2 px-3">{t('psl.queue.col.validity')}</th>
              </tr>
            </thead>
            <tbody>{rows.map(renderRow)}</tbody>
          </table>
        </div>
      ) : null}

      {/* ── THE DECIDE PANEL ────────────────────────────────────────────────
          ⚠️ THE MODE IS GATED, NOT THE DOOR. The confirm step below reads the
          availability AND the seat verdict at RENDER time, so a seat narrowed
          while this panel stands open re-gates it. A check performed only where
          the panel is opened would leave a live commit behind a stale one. */}
      <SidePanel
        open={selected !== null}
        onClose={closePanel}
        title={selected ? `${selected.id} · ${supplierName(selected.supplierId)}` : ''}
      >
        {selected ? (
          <div className="flex flex-col gap-4 text-sm" data-testid="psl-decide-panel">
            <div className="flex gap-2 flex-wrap">
              <StatusPill variant={statusTone(selected.status)}>
                {t(statusLabelKey(selected.status) ?? '', { defaultValue: selected.status })}
              </StatusPill>
              <StatusPill variant={statusTone(pslDisplayStatus(selected, PSL_TODAY))}>
                {t(statusLabelKey(pslDisplayStatus(selected, PSL_TODAY)) ?? '', {
                  defaultValue: pslDisplayStatus(selected, PSL_TODAY),
                })}
              </StatusPill>
            </div>

            <div>
              <div className="text-xs uppercase text-text-tertiary">
                {t('psl.detail.scope')}
              </div>
              <Data>{pslScopeCodes(selected).join(', ')}</Data>
            </div>
            <div>
              <div className="text-xs uppercase text-text-tertiary">
                {t('psl.detail.justification')}
              </div>
              <p className="text-text-secondary">{selected.justification}</p>
            </div>

            <Link
              to={`/buyer/suppliers/${selected.supplierId}?id=${selected.id}`}
              className="text-action text-sm"
              data-testid="psl-queue-open-profile"
            >
              {t('psl.queue.openProfile')}
            </Link>

            {selected.lifecycle === 'Proposed' ? (
              <div className="border-t border-border-subtle pt-4 flex flex-col gap-3">
                {/* ⚠️ THE UNATTRIBUTED NOTICE COMES BEFORE THE ACT, not after
                    it. A person should know the decision is recorded against
                    nobody BEFORE they commit — `t_role_grant`'s surface makes
                    the same call. */}
                <p className="text-xs text-text-tertiary" data-testid="psl-unattributed">
                  {t('psl.notice.unattributed')}
                </p>

                {decideAvailability.kind !== 'held' ? (
                  <HandoffNotice
                    availability={decideAvailability}
                    testId="handoff-psl-decide"
                  />
                ) : seatBlocksGrant ? (
                  /* ⚠️ THE MIRROR. The SAME function the policy hook asks, so
                     the panel cannot promise what the dispatcher will refuse.
                     It gates the GRANT only: a refusal is not a designation and
                     suspends nothing, so `PSL_RESTRICTIVE_STATUS_APPROVED` does
                     not sit on `t_psl_reject`. */
                  <>
                    <p
                      className="text-xs text-warning-hover"
                      data-testid="psl-seat-holds-both"
                    >
                      {t('psl.notice.seatHoldsBoth', {
                        status: t(statusLabelKey(selected.status) ?? '', {
                          defaultValue: selected.status,
                        }),
                      })}
                    </p>
                    <Field label={t('psl.form.reason')} hint={t('psl.form.reason.hint')}>
                      <textarea
                        className={input}
                        rows={3}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        data-testid="psl-decide-reason"
                      />
                    </Field>
                    <Button
                      variant="secondary"
                      disabled={reason.trim() === '' || reject.isPending}
                      onClick={() => {
                        setPending('reject');
                        void onReject();
                      }}
                      data-testid="psl-reject"
                    >
                      {t('psl.verb.reject')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Field label={t('psl.form.reason')} hint={t('psl.form.reason.hint')}>
                      <textarea
                        className={input}
                        rows={3}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        data-testid="psl-decide-reason"
                      />
                    </Field>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        disabled={reason.trim() === '' || grant.isPending}
                        onClick={() => {
                          setPending('grant');
                          void onGrant();
                        }}
                        data-testid="psl-grant"
                      >
                        {t('psl.verb.grant')}
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={reason.trim() === '' || reject.isPending}
                        onClick={() => {
                          setPending('reject');
                          void onReject();
                        }}
                        data-testid="psl-reject"
                      >
                        {t('psl.verb.reject')}
                      </Button>
                    </div>
                  </>
                )}
                {pending ? <span className="sr-only">{pending}</span> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </SidePanel>

      {/* ── THE PROPOSE PANEL ───────────────────────────────────────────── */}
      <SidePanel
        open={proposeOpen}
        onClose={() => setProposeOpen(false)}
        title={t('psl.form.propose.title')}
      >
        <div className="flex flex-col gap-3 text-sm" data-testid="psl-propose-panel">
          <p className="text-xs text-text-tertiary">{t('psl.notice.unattributed')}</p>
          <Field label={t('psl.form.supplier')}>
            <select
              className={input}
              value={draft.supplierId}
              onChange={(e) => setDraft({ ...draft, supplierId: e.target.value })}
              data-testid="psl-form-supplier"
            >
              <option value="">{t('psl.form.supplier.pick')}</option>
              {mockSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={t('psl.form.materialCodes')}
            hint={t('psl.form.materialCodes.hint')}
          >
            <input
              className={input}
              value={draft.materialCodes}
              onChange={(e) => setDraft({ ...draft, materialCodes: e.target.value })}
              data-testid="psl-form-codes"
            />
          </Field>
          <Field label={t('psl.form.status')}>
            <select
              className={input}
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value as PslStatus })}
              data-testid="psl-form-status"
            >
              {PSL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(statusLabelKey(s) ?? '', { defaultValue: s })}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('psl.form.validFrom')}>
            <input
              type="date"
              className={input}
              value={draft.validFrom}
              onChange={(e) => setDraft({ ...draft, validFrom: e.target.value })}
              data-testid="psl-form-from"
            />
          </Field>
          <Field label={t('psl.form.validUntil')}>
            <input
              type="date"
              className={input}
              value={draft.validUntil}
              onChange={(e) => setDraft({ ...draft, validUntil: e.target.value })}
              data-testid="psl-form-until"
            />
          </Field>
          <Field
            label={t('psl.form.justification')}
            hint={t('psl.form.justification.hint')}
          >
            <textarea
              className={input}
              rows={3}
              value={draft.justification}
              onChange={(e) => setDraft({ ...draft, justification: e.target.value })}
              data-testid="psl-form-justification"
            />
          </Field>
          <Field label={t('psl.form.reason')} hint={t('psl.form.reason.hint')}>
            <textarea
              className={input}
              rows={2}
              value={draft.reason}
              onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
              data-testid="psl-form-reason"
            />
          </Field>
          <Field label={t('psl.form.evidence')} hint={t('psl.form.evidence.hint')}>
            <input
              className={input}
              value={draft.evidenceRefs}
              onChange={(e) => setDraft({ ...draft, evidenceRefs: e.target.value })}
              data-testid="psl-form-evidence"
            />
          </Field>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              disabled={propose.isPending}
              onClick={() => void onPropose()}
              data-testid="psl-propose-submit"
            >
              {t('psl.verb.propose')}
            </Button>
            <Button variant="secondary" onClick={() => setProposeOpen(false)}>
              {t('psl.verb.cancel')}
            </Button>
          </div>
        </div>
      </SidePanel>
    </AppShellV2>
  );
};

export default BuyerPreferredSuppliers;
