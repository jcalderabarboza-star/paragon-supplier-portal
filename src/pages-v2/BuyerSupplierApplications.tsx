// ────────────────────────────────────────────────────────────────────────────
// B2 · THE BUYER REVIEW LANE — the surface over B1's machine.
//
// B1 shipped `supplierApplication` wired and HEADLESS: three review verbs that
// dispatched and that no screen offered. `/buyer/process-flows` said so in two
// words — **NO READ SURFACE** — and that badge is derived, so this page is what
// retires it rather than an edit to a label.
//
// ── ⚠️ THE SEGREGATION RENDERS, AND THIS PAGE MUST NOT COLLAPSE IT ──────────
//
// `application:submit` is `procurement`'s; `application:review` and
// `application:decide` are `compliance`'s (derived — `/buyer/roles` draws it
// today). So a seat holding review but NOT decide is a real seat, and it must
// see the review act live and a NOTICE on the two decision acts — never an
// absent affordance, and never a live button the dispatcher would refuse.
//
// Availability is per-verb, from each verb's own atom, through
// `useVerbAvailabilities`. There is no page-level gate: a page-level one would
// be exactly the collapse.
//
// ── ⚠️ `t_application_submit` IS NOT HERE ───────────────────────────────────
//
// That is B3's door and B3 is blocked on the s4Vendor roster reconciliation
// (`BP-10001234` on the roster against a `1000456`-shaped field, no LIFNR
// anywhere in the tree). A "New application" button here would be a false
// affordance of exactly the class `IMPORTER-PRESENCE-IS-NOT-VERB-COVERAGE-01`
// names — a create verb in a page header, beside four guarded document verbs.
//
// ── ⚠️ CONFIRM BEFORE COMMIT, AND THE TWO ENDINGS DIFFER ────────────────────
//
// Both decisions are terminal and neither can be undone, so both confirm. The
// asymmetry is the reason: a refusal REQUIRES authored text (the verb refuses
// without it, and `APPLICATION_REFUSAL_AUTHORED` refuses a blank one), because
// the applicant holds no seat here and that text is the only account of the
// decision that will ever exist. Approval needs no text and is not given a box
// to type in — a field nobody must fill is a field somebody will.
//
// The commit button is disabled until the reason is non-blank. That is a
// COURTESY MIRROR of the policy, not the policy: `APPLICATION_REFUSAL_AUTHORED`
// stands behind any caller that never renders this box.
//
// ── SidePanel (#280): a closed panel renders NOTHING ────────────────────────
// Every control below lives inside a panel that is only mounted when a row is
// selected, so a test must WALK TO THE STATE before asserting a control — and
// the confirm step is a further state inside it.
// ────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react';
import { UserPlus, Clock, Eye, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import Data from '../components/ui-v2/Data';
import SubTabs from '../components/ui-v2/SubTabs';
import SearchBar from '../components/ui-v2/SearchBar';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import SidePanel from '../components/ui-v2/SidePanel';
import FormSection from '../components/ui-v2/FormSection';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';

import { useToast } from '../hooks/useToast';
import { useSupplierApplications } from '../services/query/hooks';
import {
  useApplicationStartReview,
  useApplicationApprove,
  useApplicationReject,
} from '../services/query/commandHooks';
import { useVerbAvailabilities } from '../hooks/useVerbAvailability';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { useRefusalText, useDataErrorText } from '../hooks/useRefusalText';
import { formatDate } from '../lib/format';
import { DataError } from '../services/data/types';
import type {
  SupplierApplication,
  SupplierApplicationStatus,
} from '../services/data/types';
import type { ActorAttribution, UnattributedReason } from '../lib/enforcement';

/**
 * EXHAUSTIVE over the unattributed vocabulary, deliberately: widening it must
 * break the build here rather than render a blank where a person's name would
 * be. The `BuyerRequisitions` convention, reused because the question is the
 * same one — WHICH failure to resolve, never a bare "unknown".
 */
const UNATTRIBUTED_KEY: Record<UnattributedReason, string> = {
  NO_PERSON_IN_SESSION: 'applications.attribution.noPerson',
  IDENTITY_PROVIDER_UNAVAILABLE: 'applications.attribution.idpDown',
};

/** The four states, toned. Exhaustive: a fifth state must break the build here
 *  rather than render an untoned pill. */
const STATUS_VARIANT: Record<
  SupplierApplicationStatus,
  'success' | 'warning' | 'danger' | 'info' | 'neutral'
> = {
  Submitted: 'warning',
  'Under Review': 'info',
  Approved: 'success',
  Rejected: 'danger',
};

type Tab = 'all' | 'waiting' | 'inReview' | 'decided';

const TAB_STATUSES: Record<Tab, readonly SupplierApplicationStatus[] | null> = {
  all: null,
  waiting: ['Submitted'],
  inReview: ['Under Review'],
  decided: ['Approved', 'Rejected'],
};

/** Which confirmation step is open, if any. `null` is the panel's resting state. */
type Pending = 'approve' | 'reject' | null;

const BuyerSupplierApplications: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const dataErrorText = useDataErrorText();

  /**
   * A refusal the dispatcher THREW, in the reader's language.
   *
   * `SCOPE_DENIED` and its siblings arrive as a thrown `DataError` whose message
   * is prose, so `useRefusalText` cannot read them — `useDataErrorText` owns
   * that vocabulary and returns `null` for a code it does not own, which is why
   * the fallback chain below is preserved rather than collapsed. The
   * `BuyerRequisitions` helper, copied deliberately: two surfaces answering the
   * same question the same way is better than one of them inventing a message.
   */
  const describeThrown = (e: unknown, fallback: string): string =>
    dataErrorText(e instanceof DataError ? e.code : undefined) ??
    (e instanceof DataError ? e.message : fallback);

  // ⚠️ TRANSLATED, AND BUILT INSIDE THE COMPONENT — the house convention every
  // other page follows, because `t` is only available here. It was a
  // module-level English literal until browser QA read the page in Indonesian
  // and found the one line still in English.
  const APPLICATIONS_CRUMB = [
    t('applications.crumb.acquire'),
    t('applications.crumb.applications'),
  ];

  const { data, isLoading, isError, error } = useSupplierApplications();
  const applications = useMemo(() => data?.items ?? [], [data]);

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [reason, setReason] = useState('');

  const startReview = useApplicationStartReview();
  const approve = useApplicationApprove();
  const reject = useApplicationReject();

  // ⚠️ ONE AVAILABILITY PER VERB, FROM THAT VERB'S OWN ATOM. `review` and
  // `decide` are separate questions and a seat can hold one without the other —
  // which is precisely the segregation `/buyer/roles` renders.
  const { review: reviewAvailability, decide: decideAvailability } = useVerbAvailabilities({
    review: 'application:review',
    decide: 'application:decide',
  } as const);

  const selected = useMemo(
    () => applications.find((a) => a.id === selectedId) ?? null,
    [applications, selectedId],
  );

  const counts = useMemo(() => {
    const by = (s: SupplierApplicationStatus) =>
      applications.filter((a) => a.status === s).length;
    return {
      waiting: by('Submitted'),
      inReview: by('Under Review'),
      decided: by('Approved') + by('Rejected'),
    };
  }, [applications]);

  const filtered = useMemo(() => {
    const wanted = TAB_STATUSES[tab];
    const q = search.trim().toLowerCase();
    return applications.filter((a) => {
      if (wanted && !wanted.includes(a.status)) return false;
      if (!q) return true;
      return (
        a.companyName.toLowerCase().includes(q) ||
        a.applicationNumber.toLowerCase().includes(q)
      );
    });
  }, [applications, tab, search]);

  const closePanel = () => {
    setSelectedId(null);
    setPending(null);
    setReason('');
  };

  /** The reason must be SUBSTANCE, not presence — the policy's mirror. */
  const canCommitReject = reason.trim().length > 0;

  const renderAttribution = (actor: ActorAttribution | null): string =>
    actor === null
      ? t('applications.panel.notStated')
      : actor.kind === 'RESOLVED'
        ? actor.person.displayName
        : t(UNATTRIBUTED_KEY[actor.reason]);

  const startReviewSelected = async () => {
    if (!selected || startReview.isPending) return;
    try {
      const result = await startReview.mutateAsync({ applicationId: selected.id });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('applications.toast.reviewFailed.title', {
            number: selected.applicationNumber,
          }),
          description:
            refusalText(result.reason) ?? result.reason ?? t('applications.toast.actionFailed.desc'),
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('applications.toast.reviewStarted.title', {
          number: selected.applicationNumber,
        }),
        description: t('applications.toast.reviewStarted.desc'),
      });
    } catch (e) {
      toast({
        variant: 'error',
        title: t('applications.toast.reviewFailed.title', {
          number: selected.applicationNumber,
        }),
        description: describeThrown(e, t('applications.toast.actionFailed.desc')),
      });
    }
  };

  const approveSelected = async () => {
    if (!selected || approve.isPending) return;
    try {
      const result = await approve.mutateAsync({ applicationId: selected.id });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('applications.toast.approveFailed.title', {
            number: selected.applicationNumber,
          }),
          description:
            refusalText(result.reason) ?? result.reason ?? t('applications.toast.actionFailed.desc'),
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('applications.toast.approved.title', {
          number: selected.applicationNumber,
        }),
        description: t('applications.toast.approved.desc'),
      });
      closePanel();
    } catch (e) {
      toast({
        variant: 'error',
        title: t('applications.toast.approveFailed.title', {
          number: selected.applicationNumber,
        }),
        description: describeThrown(e, t('applications.toast.actionFailed.desc')),
      });
    }
  };

  const rejectSelected = async () => {
    if (!selected || !canCommitReject || reject.isPending) return;
    try {
      const result = await reject.mutateAsync({
        applicationId: selected.id,
        rejectionReason: reason.trim(),
      });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('applications.toast.rejectFailed.title', {
            number: selected.applicationNumber,
          }),
          description:
            refusalText(result.reason) ?? result.reason ?? t('applications.toast.actionFailed.desc'),
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('applications.toast.rejected.title', {
          number: selected.applicationNumber,
        }),
        description: t('applications.toast.rejected.desc'),
      });
      closePanel();
    } catch (e) {
      toast({
        variant: 'error',
        title: t('applications.toast.rejectFailed.title', {
          number: selected.applicationNumber,
        }),
        description: describeThrown(e, t('applications.toast.actionFailed.desc')),
      });
    }
  };

  const declaredLabel = (a: SupplierApplication): string =>
    a.declarations.length === 0
      ? t('applications.declared.none')
      : a.declarations.length === 1
        ? t('applications.declared.count.one', { count: 1 })
        : t('applications.declared.count.other', { count: a.declarations.length });

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={APPLICATIONS_CRUMB}
        title={t('applications.title')}
        subtitle={t('applications.subtitle')}
      />
      <PageMetaLine className="-mt-6 mb-6">
        {t('applications.meta.note')}
        <ProvenanceMarker capability="supplierApplications" className="ml-3 align-middle" />
      </PageMetaLine>

      {isLoading && <LoadingState breadcrumb={APPLICATIONS_CRUMB} />}
      {isError && (
        <ErrorState
          breadcrumb={APPLICATIONS_CRUMB}
          title={t('applications.error.title')}
          error={error}
        />
      )}

      {!isLoading && !isError && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <KpiCard
              icon={Clock}
              eyebrow={t('applications.kpi.waiting')}
              value={counts.waiting.toString()}
            />
            <KpiCard
              icon={Eye}
              eyebrow={t('applications.kpi.inReview')}
              value={counts.inReview.toString()}
            />
            <KpiCard
              icon={CheckCircle2}
              eyebrow={t('applications.kpi.decided')}
              value={counts.decided.toString()}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <SubTabs<Tab>
              options={[
                { id: 'all', label: t('applications.tab.all'), count: applications.length },
                { id: 'waiting', label: t('applications.tab.waiting'), count: counts.waiting },
                { id: 'inReview', label: t('applications.tab.inReview'), count: counts.inReview },
                { id: 'decided', label: t('applications.tab.decided'), count: counts.decided },
              ]}
              value={tab}
              onChange={setTab}
            />
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={t('applications.search.placeholder')}
            />
          </div>

          {applications.length === 0 ? (
            <EmptyState
              breadcrumb={APPLICATIONS_CRUMB}
              title={t('applications.empty.title')}
              subtitle={t('applications.empty.subtitle')}
              message={t('applications.empty.body')}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              breadcrumb={APPLICATIONS_CRUMB}
              title={t('applications.empty.filtered.title')}
              subtitle={t('applications.empty.filtered.subtitle')}
              message={t('applications.empty.filtered.body')}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('applications.col.number')}</TableHeaderCell>
                <TableHeaderCell>{t('applications.col.company')}</TableHeaderCell>
                <TableHeaderCell>{t('applications.col.type')}</TableHeaderCell>
                <TableHeaderCell>{t('applications.col.declared')}</TableHeaderCell>
                <TableHeaderCell>{t('applications.col.submitted')}</TableHeaderCell>
                <TableHeaderCell>{t('applications.col.status')}</TableHeaderCell>
              </TableHeader>
              <tbody>
                {filtered.map((a) => (
                  <TableRow
                    key={a.id}
                    onClick={() => {
                      setSelectedId(a.id);
                      setPending(null);
                      setReason('');
                    }}
                    data-testid={`application-row-${a.applicationNumber}`}
                  >
                    <TableCell>
                      <Data>{a.applicationNumber}</Data>
                    </TableCell>
                    <TableCell>{a.companyName}</TableCell>
                    <TableCell>{a.requestType}</TableCell>
                    <TableCell>{declaredLabel(a)}</TableCell>
                    <TableCell>
                      <Data>{formatDate(a.submittedAt)}</Data>
                    </TableCell>
                    <TableCell>
                      <StatusPill variant={STATUS_VARIANT[a.status]}>{a.status}</StatusPill>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </>
      )}

      {/* #280 — mounted only when a row is selected. A closed panel is ABSENT. */}
      <SidePanel
        open={selected !== null}
        onClose={closePanel}
        title={
          selected
            ? t('applications.panel.title', { number: selected.applicationNumber })
            : ''
        }
      >
        {selected && (
          <div className="space-y-6">
            <FormSection title={t('applications.panel.section.applicant')}>
              <dl className="space-y-2 text-sm">
                <Field label={t('applications.panel.field.company')}>
                  {selected.companyName}
                </Field>
                <Field label={t('applications.panel.field.type')}>
                  {selected.requestType}
                </Field>
                <Field label={t('applications.panel.field.vendor')}>
                  {selected.resolvedSupplierId ? (
                    <Data>{selected.resolvedSupplierId}</Data>
                  ) : (
                    t('applications.panel.notStated')
                  )}
                </Field>
                <Field label={t('applications.panel.field.submitted')}>
                  <Data>{formatDate(selected.submittedAt)}</Data>
                </Field>
                <Field label={t('applications.panel.field.submittedBy')}>
                  {renderAttribution(selected.submittedBy)}
                </Field>
                {selected.reviewStartedAt && (
                  <Field label={t('applications.panel.field.reviewStarted')}>
                    <Data>{formatDate(selected.reviewStartedAt)}</Data>
                  </Field>
                )}
              </dl>
            </FormSection>

            <FormSection title={t('applications.panel.section.declared')}>
              {selected.declarations.length === 0 ? (
                <p className="text-sm text-text-tertiary">
                  {t('applications.panel.declared.empty')}
                </p>
              ) : (
                <ul className="space-y-1 text-sm" data-testid="application-declarations">
                  {selected.declarations.map((d) => (
                    <li key={`${d.kind}-${d.reference}`} className="flex gap-2">
                      <span className="uppercase text-text-tertiary w-14 shrink-0">
                        {d.kind}
                      </span>
                      <Data>{d.reference}</Data>
                    </li>
                  ))}
                </ul>
              )}
              {/* The sentence that stops this lane over-claiming. */}
              <p className="text-xs text-text-tertiary mt-3">
                {t('applications.panel.declared.note')}
              </p>
            </FormSection>

            {(selected.status === 'Approved' || selected.status === 'Rejected') && (
              <FormSection title={t('applications.panel.section.decision')}>
                <dl className="space-y-2 text-sm">
                  <Field label={t('applications.panel.field.decidedAt')}>
                    {selected.decidedAt ? (
                      <Data>{formatDate(selected.decidedAt)}</Data>
                    ) : (
                      t('applications.panel.notStated')
                    )}
                  </Field>
                  <Field label={t('applications.panel.field.decidedBy')}>
                    {renderAttribution(selected.decidedBy)}
                  </Field>
                  {selected.rejectionReason && (
                    <Field label={t('applications.panel.field.reason')}>
                      {selected.rejectionReason}
                    </Field>
                  )}
                </dl>
              </FormSection>
            )}

            {/* ── THE ACTS. Each in its OWN slot, gated on its OWN atom. ───── */}
            {selected.status === 'Submitted' && (
              <div className="flex items-center gap-3">
                {reviewAvailability.kind === 'held' ? (
                  <Button
                    variant="outline"
                    onClick={startReviewSelected}
                    disabled={startReview.isPending}
                    data-testid="application-start-review"
                  >
                    {t('applications.action.startReview')}
                  </Button>
                ) : (
                  <HandoffNotice
                    availability={reviewAvailability}
                    testId="handoff-application-review"
                  />
                )}
              </div>
            )}

            {selected.status === 'Under Review' && pending === null && (
              <div className="flex items-center gap-3">
                {decideAvailability.kind === 'held' ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setPending('approve')}
                      data-testid="application-approve"
                    >
                      {t('applications.action.approve')}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setPending('reject')}
                      data-testid="application-reject"
                    >
                      {t('applications.action.reject')}
                    </Button>
                  </>
                ) : (
                  <HandoffNotice
                    availability={decideAvailability}
                    testId="handoff-application-decide"
                  />
                )}
              </div>
            )}

            {/* CONFIRM BEFORE COMMIT — approve. No text box: nothing to author. */}
            {selected.status === 'Under Review' && pending === 'approve' && (
              <div
                className="rounded-md border border-border-subtle bg-bg-hover p-4 space-y-3"
                data-testid="application-approve-confirm"
              >
                <div className="text-sm font-bold text-text-primary">
                  {t('applications.confirm.approve.title')}
                </div>
                <p className="text-sm text-text-secondary">
                  {t('applications.confirm.approve.body', { company: selected.companyName })}
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={approveSelected}
                    disabled={approve.isPending}
                    data-testid="application-approve-commit"
                  >
                    {t('applications.confirm.approve.commit')}
                  </Button>
                  <Button variant="secondary" onClick={() => setPending(null)}>
                    {t('applications.action.cancel')}
                  </Button>
                </div>
              </div>
            )}

            {/* CONFIRM BEFORE COMMIT — reject, and the reason is required. */}
            {selected.status === 'Under Review' && pending === 'reject' && (
              <div
                className="rounded-md border border-border-subtle bg-bg-hover p-4 space-y-3"
                data-testid="application-reject-confirm"
              >
                <div className="text-sm font-bold text-text-primary">
                  {t('applications.confirm.reject.title')}
                </div>
                <p className="text-sm text-text-secondary">
                  {t('applications.confirm.reject.body', { company: selected.companyName })}
                </p>
                <label className="block text-sm">
                  <span className="text-text-secondary">
                    {t('applications.confirm.reject.reasonLabel')}
                  </span>
                  <textarea
                    className="mt-1 w-full rounded-md border border-border-subtle bg-white p-2 text-sm"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t('applications.confirm.reject.reasonPlaceholder')}
                    data-testid="application-reject-reason"
                  />
                </label>
                <p className="text-xs text-text-tertiary">
                  {t('applications.confirm.reject.reasonHint')}
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={rejectSelected}
                    disabled={!canCommitReject || reject.isPending}
                    data-testid="application-reject-commit"
                  >
                    {t('applications.confirm.reject.commit')}
                  </Button>
                  <Button variant="secondary" onClick={() => setPending(null)}>
                    {t('applications.action.cancel')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </SidePanel>
    </AppShellV2>
  );
};

/** One label/value row. Local because it is this panel's shape, not a token. */
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="flex gap-3">
    <dt className="text-text-tertiary w-36 shrink-0">{label}</dt>
    <dd className="text-text-primary">{children}</dd>
  </div>
);

export default BuyerSupplierApplications;
