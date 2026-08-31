import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileQuestion,
  Download,
  Shield,
  RefreshCw,
  Bell,
  Database,
  Inbox,
  XCircle,
  FilePlus2,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import Data from '../components/ui-v2/Data';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import SidePanel from '../components/ui-v2/SidePanel';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import StatusPill from '../components/ui-v2/StatusPill';
import LivenessPill from '../components/ui-v2/LivenessPill';
import { isLive, readinessNote } from '../services/liveness';
import { formatDate } from '../lib/format';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import { useToast } from '../hooks/useToast';
import { useComplianceRegistry, useDocuments, useSuppliers } from '../services/query/hooks';
import {
  useSupplierDocumentVerify,
  useSupplierDocumentReject,
  useSupplierDocumentRequest,
} from '../services/query/commandHooks';
import { useVerbAvailabilities, useVerbAvailability } from '../hooks/useVerbAvailability';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import {
  computeStatus,
  daysRemaining,
  schemeValid,
  remindEligible,
} from '../services/data/complianceProjection';
import {
  certCategory,
  certTypeLabelKey,
  actionLabelKey,
  type CertCategory,
} from '../lib/complianceView';
import { statusTone } from '../lib/statusTone';
import type {
  ComplianceRegistryEntry,
  ComplianceDisplayStatus,
  SupplierDocumentCategory,
} from '../services/data/types';
import { DataError } from '../services/data/types';
import { useRefusalText, useDataErrorText } from '../hooks/useRefusalText';

type CategoryFilter = 'All' | CertCategory;
type StatusFilter = 'All' | ComplianceDisplayStatus;

// A row = the stored entry + its computed-at-read projections (law 0.5). The page
// never reads a stored clock/scheme value — every display fact below is derived
// from the entry vs the reference clock (HALAL-CLOCK-STATE mechanism, I3.1).
interface Row {
  entry: ComplianceRegistryEntry;
  status: ComplianceDisplayStatus;
  days: number | null;
  category: CertCategory;
  remind: boolean;
  schemeOk: boolean;
}

// Option ids stay canonical EN (they drive filtering against computed values);
// only the display `label` localizes, via the labelKey resolved at render.
const STATUS_OPTIONS: { id: StatusFilter; labelKey: string }[] = [
  { id: 'All', labelKey: 'compliance.filter.status.all' },
  { id: 'Expired', labelKey: 'compliance.filter.status.expired' },
  { id: 'Expiring', labelKey: 'compliance.filter.status.expiring' },
  { id: 'Missing', labelKey: 'compliance.filter.status.missing' },
  { id: 'Under Review', labelKey: 'compliance.filter.status.underReview' },
  { id: 'Valid', labelKey: 'compliance.filter.status.valid' },
];

// ⚠️ **ALL SIX MEMBERS OF `SupplierDocumentCategory`, AND THE TWO THAT LOOK
// REDUNDANT ARE THE REASON THE VERB CARRIES A CATEGORY AT ALL.**
// `CERT_TYPE_TO_CATEGORY` (the declare path) reaches only four of them —
// `Halal Compliance` · `BPOM Regulatory` · `Quality` · `Other`. **`Tax & Legal`
// and `Contract` have NO declare path**: outside the seeded fixtures, a
// requested document is the only way a row in either category can ever exist.
// Dropping them from this list would make two of the platform's six document
// kinds unreachable by anybody.
//
// The `id` is the canonical EN union member — it is what the payload carries
// and what the store holds. Only `labelKey` localizes.
const REQUEST_CATEGORIES: { id: SupplierDocumentCategory; labelKey: string }[] = [
  { id: 'Halal Compliance', labelKey: 'compliance.request.category.halal' },
  { id: 'BPOM Regulatory', labelKey: 'compliance.request.category.bpom' },
  { id: 'Quality', labelKey: 'compliance.request.category.quality' },
  { id: 'Tax & Legal', labelKey: 'compliance.request.category.taxLegal' },
  { id: 'Contract', labelKey: 'compliance.request.category.contract' },
  { id: 'Other', labelKey: 'compliance.request.category.other' },
];

const CATEGORY_OPTIONS: { id: CategoryFilter; labelKey: string }[] = [
  { id: 'All', labelKey: 'compliance.filter.category.all' },
  { id: 'Halal', labelKey: 'compliance.filter.category.halal' },
  { id: 'Quality', labelKey: 'compliance.filter.category.quality' },
  { id: 'Regulatory', labelKey: 'compliance.filter.category.regulatory' },
  { id: 'Other', labelKey: 'compliance.filter.category.other' },
];

// Dates on this surface go through the canonical `formatDate` (lib/format), the
// mechanism the tree already uses at 101 call sites. The local helper this
// replaces hardcoded 'en-GB', so a certificate expiry rendered "15 Dec 2027" to
// an Indonesian reader while the SAME field, on the SAME domain's widgets
// (BuyerComplianceWidget / SupplierCertsExpiringWidget, which already import
// formatDate), rendered "15 Des 2027". A regulatory record disagreeing with its
// own summary tile is worse than either rendering alone. §47.

const BuyerCompliance: React.FC = () => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const dataErrorText = useDataErrorText();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');

  // Now injected once per mount — the projection is pure & deterministic (no
  // clock read inside pure code); rows recompute only if the read changes.
  const now = useMemo(() => new Date().toISOString(), []);
  const query = useComplianceRegistry();
  // §82 — the review queue. A BUYER scope gets the cross-supplier superset from
  // `applySupplierScope`, which is what makes a compliance officer able to see
  // every supplier's pending declaration from one page.
  const docsQuery = useDocuments();
  const reviewQueue = useMemo(
    () => (docsQuery.data?.items ?? []).filter((d) => d.status === 'Under Review'),
    [docsQuery.data],
  );
  // ⚠️ ONE NOTICE PER VERB, IN THAT VERB'S OWN SLOT (§76). Verify and reject are
  // separate atoms and are co-reachable on the same row, so each carries its own.
  const review = useVerbAvailabilities({
    verify: 'supplierdoc:verify',
    reject: 'supplierdoc:reject',
  } as const);
  const verifyDoc = useSupplierDocumentVerify();
  const rejectDoc = useSupplierDocumentReject();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  /**
   * ⚠️ **THE OUTCOME IS READ FROM THE RESULT, NEVER ASSUMED FROM THE CALL.**
   * `CommandResult.status` can be `failed` — a refusal rendered as a success is
   * the defect this whole batch exists to remove, and reproducing it in the
   * review half would be the same lie facing the other way.
   */
  const runVerify = async (docId: string) => {
    setBusyId(docId);
    try {
      const result = await verifyDoc.mutateAsync({ docId });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('compliance.queue.toast.failed'),
          description: refusalText(result.reason) ?? result.reason,
        });
        return;
      }
      toast({ variant: 'success', title: t('compliance.queue.toast.verified') });
    } finally {
      setBusyId(null);
    }
  };

  const runReject = async (docId: string) => {
    setBusyId(docId);
    try {
      const result = await rejectDoc.mutateAsync({
        docId,
        rejectionReason: rejectReason.trim(),
      });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('compliance.queue.toast.failed'),
          description: refusalText(result.reason) ?? result.reason,
        });
        return;
      }
      setRejecting(null);
      setRejectReason('');
      // The supplier sees the reason and the timestamp on their own documents
      // page (§80) — this toast says the refusal was recorded, and says where it
      // went, rather than implying it vanished into a queue.
      toast({
        variant: 'success',
        title: t('compliance.queue.toast.rejected'),
        description: t('compliance.queue.toast.rejectedDesc'),
      });
    } finally {
      setBusyId(null);
    }
  };
  // ── §WAVE E · THE BUYER'S ASK ──────────────────────────────────────────
  //
  // ⚠️ **ITS OWN SLOT, ITS OWN NOTICE (§76).** `supplierdoc:request` is a
  // separate atom from verify/reject and lives in the page HEADER, not on a
  // row — it acts on no document, it creates one. `IMPORTER-PRESENCE-IS-NOT-
  // VERB-COVERAGE-01` is exactly this shape one lane over: `BuyerRequisitions`
  // rendered four notices and still shipped an ungated CREATE verb in its
  // header, because every guarded verb there acted on a selected document.
  const request = useVerbAvailability('supplierdoc:request');
  const requestDoc = useSupplierDocumentRequest();
  const suppliersQuery = useSuppliers();
  const [requestOpen, setRequestOpen] = useState(false);
  const [reqSupplier, setReqSupplier] = useState('');
  const [reqCategory, setReqCategory] = useState<SupplierDocumentCategory | ''>('');
  const [reqNote, setReqNote] = useState('');
  const [reqConfirming, setReqConfirming] = useState(false);
  const [reqBusy, setReqBusy] = useState(false);

  const supplierOptions = suppliersQuery.data?.items ?? [];
  const reqSupplierName =
    supplierOptions.find((sup) => sup.id === reqSupplier)?.name ?? reqSupplier;
  // Every field the act commits must be stated before it commits, so all three
  // gate the confirm step — `note` included. It is OPTIONAL AT THE VERB (the
  // machine requires `supplierId` + `category`) and REQUIRED HERE: a demand
  // with no stated reason is the thing the supplier cannot act on.
  const reqComplete =
    reqSupplier !== '' && reqCategory !== '' && reqNote.trim() !== '';

  const closeRequest = () => {
    setRequestOpen(false);
    setReqConfirming(false);
    setReqSupplier('');
    setReqCategory('');
    setReqNote('');
  };

  /**
   * ⚠️ **THE OUTCOME IS READ FROM THE RESULT, NEVER ASSUMED FROM THE CALL** —
   * the same rule the review half above runs on, and it matters more here
   * because this act has a refusal the operator can actually trigger:
   * `SCOPE_DENIED` when the named supplier does not resolve on the roster
   * (`requireCreationOwner`, C4b). A `DataError` is THROWN rather than returned
   * for that class, so it is caught and rendered instead of escaping as an
   * unhandled rejection that would leave the panel claiming nothing happened.
   */
  const runRequest = async () => {
    if (reqCategory === '') return;
    setReqBusy(true);
    try {
      const result = await requestDoc.mutateAsync({
        supplierId: reqSupplier,
        category: reqCategory,
        note: reqNote.trim(),
      });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('compliance.request.toast.failed'),
          description: refusalText(result.reason) ?? result.reason,
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('compliance.request.toast.sent'),
        description: t('compliance.request.toast.sentDesc', {
          supplier: reqSupplierName,
        }),
      });
      closeRequest();
    } catch (err) {
      // ⚠️ **THE THROWN HALF, AND IT IS A DIFFERENT VOCABULARY FROM THE
      // RETURNED ONE.** `SCOPE_DENIED` arrives as a `DataError` whose message is
      // prose, so `refusalText` cannot read it — browser QA had an Indonesian
      // operator reading *"creation of supplierDocument denied: unresolved
      // owner"* in English. The CODE is what the glossary is keyed on.
      const code = err instanceof DataError ? err.code : undefined;
      toast({
        variant: 'error',
        title: t('compliance.request.toast.failed'),
        description:
          dataErrorText(code) ??
          (err instanceof Error
            ? (refusalText(err.message) ?? err.message)
            : t('compliance.request.toast.failed')),
      });
    } finally {
      setReqBusy(false);
    }
  };

  const items = query.data?.items ?? [];

  const rows: Row[] = useMemo(
    () =>
      items.map((entry) => ({
        entry,
        status: computeStatus(entry, now),
        days: daysRemaining(entry, now),
        category: certCategory(entry.certType),
        remind: remindEligible(entry),
        schemeOk: schemeValid(entry, now),
      })),
    [items, now],
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (statusFilter !== 'All' && r.status !== statusFilter) return false;
        if (categoryFilter !== 'All' && r.category !== categoryFilter) return false;
        return true;
      }),
    [rows, statusFilter, categoryFilter],
  );

  const counts = useMemo(() => {
    const by = (s: ComplianceDisplayStatus) =>
      rows.filter((r) => r.status === s).length;
    return {
      expired: by('Expired'),
      expiring: by('Expiring'),
      missing: by('Missing'),
      valid: by('Valid'),
      underReview: by('Under Review'),
    };
  }, [rows]);

  // BPJPH compliance is SCHEME-AWARE (HALAL-ISSUER-BLIND mechanism): a halal cert
  // counts as compliant only when `schemeValid` holds — a MUI-legacy cert whose
  // dates say Valid is NON-compliant from the mandate date. The mechanism renders
  // here; the finding stays DOWNGRADED (SIMULATED, not closed) until real issuer
  // data backs it — the surface is honestly marked Sample via <LivenessPill>.
  const bpjph = useMemo(() => {
    const halal = rows.filter((r) => r.category === 'Halal');
    return { compliant: halal.filter((r) => r.schemeOk).length, total: halal.length };
  }, [rows]);

  const deadline = useMemo(() => {
    const target = new Date('2026-10-17');
    const today = new Date();
    const daysLeft = Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
    const pct = Math.max(0, Math.min(100, (daysLeft / 365) * 100));
    return { daysLeft, pct };
  }, []);

  const today = formatDate(new Date());

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={[t('compliance.crumb.intelligence'), t('compliance.crumb.tracker')]}
        title={t('compliance.header.title')}
        subtitle={t('compliance.header.subtitle')}
        actions={
          /* ⚠️ **EXPORT LEFT THE PRIMARY SLOT, AND DP2-BUTTON-01 SAYS WHY:
             *an Export never occupies the primary slot*. It sat there because
             it was the only action this page had. The primary act on a
             compliance tracker is asking a supplier for the certificate the
             tracker says is missing — so the slot now holds the act, and
             Export takes the secondary register it always belonged in. */
          <div className="flex items-center gap-2">
            <BulkActionsBar
              actions={[
                {
                  label: t('compliance.action.exportReport'),
                  icon: Download,
                  onClick: () =>
                    toast({
                      variant: 'info',
                      title: t('compliance.toast.exporting'),
                    }),
                },
              ]}
              primary={
                request.kind === 'held'
                  ? {
                      label: t('compliance.request.action'),
                      icon: FilePlus2,
                      onClick: () => setRequestOpen(true),
                    }
                  : undefined
              }
            />
            {/* Withheld renders as pending-with-an-owner, in the verb's own
                slot — never as a disabled control and never as silence. */}
            {request.kind !== 'held' && (
              <HandoffNotice
                availability={request}
                testId="handoff-supplierdoc-request"
              />
            )}
          </div>
        }
      />

      <PageMetaLine className="-mt-6 mb-6 flex items-center gap-3">
        <span>{t('compliance.meta.summary', { count: rows.length, date: today })}</span>
        {/* Honest-render: capability="compliance" derives SIMULATED (no wired
            CommandTarget) AND is harvest-gated (I3.3) → amber "Sample — awaiting
            Track-R harvest". Green is structurally unreachable (two-gate guard). */}
        <LivenessPill capability="compliance" />
      </PageMetaLine>

      {/* Waiting-state banner (I3.3, second form) — the SPECIFIC readiness message:
          this surface is proven and wired to the seam, waiting for the Track-R
          certificate harvest to land the real registry. Rendered only while the
          capability is harvest-gated; it disappears the moment the two-gate flip
          lands (LIVENESS-DATASOURCE-01). Distinct from the legal-deadline banner
          below (that is about the mandate; this is about data liveness). */}
      {!isLive('compliance') && readinessNote('compliance') && (
        <div className="bg-bg-hover border-l-2 border-warning rounded px-4 py-3 mb-4 flex items-start gap-3">
          <Database size={16} className="text-warning-hover shrink-0 mt-0.5" />
          <div className="text-sm text-text-secondary">
            <strong className="text-text-primary">
              {t('compliance.readiness.title')}
            </strong>{' '}
            {t('compliance.readiness.body')}
          </div>
        </div>
      )}

      {/* ── §82 · COMPLIANCE'S REVIEW QUEUE ────────────────────────────────
          ⚠️ **THIS SECTION EXISTS BECAUSE ITS ABSENCE WAS THE FINDING.** The
          supplier-document verbs were authored at F0.4 and `ruled-unsurfaced` as
          *"a verification pipeline rather than a screen"* — so a declared
          document landed in `Under Review` and **no buyer surface in the tree
          read a `SupplierDocument` at all** (derived: the three readers were
          `SupplierDocuments`, `SupplierDashboard`, `SupplierCertsExpiringWidget`,
          every one supplier-side). Building the supplier's way in without this
          would ship the dead-end shape in the other direction: not unread by the
          gate, but unread by the person whose act it awaits.

          ⚠️ **IT SITS ABOVE THE REGISTRY, NOT INSIDE IT, AND THE TWO ARE
          DIFFERENT OBJECTS.** The table below is the certificate REGISTRY — what
          Paragon believes it holds. This is a QUEUE — what somebody has to
          decide about. Folding them into one list would make a supplier's
          unverified claim look like a registry fact, which is exactly what
          `lifecycleState` exists to keep apart. */}
      {reviewQueue.length > 0 && (
        <div
          className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm mb-6 overflow-hidden"
          data-testid="doc-review-queue"
        >
          <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2">
            <Inbox size={16} className="text-action shrink-0" aria-hidden="true" />
            <div>
              <div className="text-sm font-bold text-text-primary">
                {t('compliance.queue.title')}
              </div>
              <div className="text-xs text-text-tertiary mt-0.5">
                {reviewQueue.length === 1
                  ? t('compliance.queue.subtitle.one', { count: reviewQueue.length })
                  : t('compliance.queue.subtitle.other', { count: reviewQueue.length })}
              </div>
            </div>
          </div>

          <div className="divide-y divide-border-subtle">
            {reviewQueue.map((doc) => (
              <div key={doc.id} className="px-5 py-4" data-testid={`doc-review-${doc.id}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-text-primary">
                      {doc.declaration
                        ? t(certTypeLabelKey(doc.declaration.certType))
                        : /* i18n-defer: mock/sample data (fixture document name) */
                          doc.name}
                    </div>
                    <div className="text-xs text-text-tertiary mt-0.5">
                      {/* i18n-defer: mock/sample data (supplier id) */}
                      <Data>{doc.supplierId}</Data>
                      {doc.declaration && (
                        <>
                          {' · '}
                          <Data>{doc.declaration.certNumber}</Data>
                        </>
                      )}
                    </div>
                    {doc.declaration ? (
                      <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                        <div>
                          <dt className="inline text-text-tertiary">
                            {t('compliance.queue.field.issuer')}{' '}
                          </dt>
                          {/* i18n-defer: supplier-authored free text */}
                          <dd className="inline text-text-secondary">
                            {doc.declaration.issuer}
                          </dd>
                        </div>
                        <div>
                          <dt className="inline text-text-tertiary">
                            {t('compliance.queue.field.dates')}{' '}
                          </dt>
                          <dd className="inline text-text-secondary">
                            <Data>{formatDate(doc.declaration.issuedOn)}</Data>
                            {' → '}
                            {doc.declaration.expiresOn === null ? (
                              t('compliance.queue.noExpiry')
                            ) : (
                              <Data>{formatDate(doc.declaration.expiresOn)}</Data>
                            )}
                          </dd>
                        </div>
                        <div className="sm:col-span-2">
                          {/* ⚠️ **`declaredAt` AND `declaredBy` ARE RENDERED HERE
                              BECAUSE THE STORED-FIELD GATE SAID THEY WERE NOT.**
                              It flagged both as stored-and-never-read — the
                              `certBasis` shape — and the honest disposal is a
                              reader, not an allowlist row. They also earn their
                              place: a reviewer needs to know how old a claim is,
                              and the attribution says out loud that this platform
                              cannot name the person who made it. */}
                          <dt className="inline text-text-tertiary">
                            {t('compliance.queue.field.declared')}{' '}
                          </dt>
                          <dd className="inline text-text-secondary">
                            <Data>{formatDate(doc.declaration.declaredAt)}</Data>
                            {' · '}
                            {doc.declaration.declaredBy.kind === 'UNATTRIBUTED'
                              ? t('compliance.queue.declaredBy.unattributed')
                              : doc.declaration.declaredBy.person.displayName}
                          </dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="inline text-text-tertiary">
                            {t('compliance.queue.field.scope')}{' '}
                          </dt>
                          {/* ⚠️ THE SUPPLIER'S OWN WORDS, RENDERED AS SUCH. This
                              is NOT a material-code list and must never be shown
                              as one — compliance reads it and assigns the codes.
                              i18n-defer: supplier-authored free text. */}
                          <dd className="inline text-text-secondary">
                            {doc.declaration.scopeText}
                          </dd>
                        </div>
                      </dl>
                    ) : (
                      /* A seeded row that predates the verb: it reached `Under
                         Review` before declarations existed, so there is nothing
                         to show and the surface says so rather than rendering
                         empty labels over blanks. */
                      <p className="mt-2 text-xs text-text-tertiary">
                        {t('compliance.queue.noDeclaration')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {review.verify.kind === 'held' ? (
                      <Button
                        variant="outline"
                        icon={CheckCircle2}
                        disabled={busyId === doc.id}
                        onClick={() => {
                          void runVerify(doc.id);
                        }}
                      >
                        {t('compliance.queue.action.verify')}
                      </Button>
                    ) : (
                      <HandoffNotice
                        availability={review.verify}
                        testId="handoff-supplierdoc-verify"
                      />
                    )}
                    {review.reject.kind === 'held' ? (
                      <Button
                        variant="secondary"
                        icon={XCircle}
                        disabled={busyId === doc.id}
                        onClick={() =>
                          setRejecting((r) => (r === doc.id ? null : doc.id))
                        }
                      >
                        {t('compliance.queue.action.reject')}
                      </Button>
                    ) : (
                      <HandoffNotice
                        availability={review.reject}
                        testId="handoff-supplierdoc-reject"
                      />
                    )}
                  </div>
                </div>

                {/* ⚠️ THE REASON IS REQUIRED AT THE VERB, SO IT IS REQUIRED HERE.
                    `t_supplierdoc_reject` declares `requiredFields:
                    ['rejectionReason']` and the dispatcher refuses a blank one —
                    this input is not the guard, it is the surface honouring a
                    guard that already exists. §80 built the supplier-facing
                    refusal screen on the promise that a reason always travels
                    with the refusal; this is the end of the wire that keeps it. */}
                {rejecting === doc.id && review.reject.kind === 'held' && (
                  <div
                    className="mt-3 bg-bg-hover rounded px-3 py-3"
                    data-testid={`doc-reject-form-${doc.id}`}
                  >
                    <label className="block">
                      <span className="block text-label text-text-tertiary uppercase mb-1">
                        {t('compliance.queue.reject.label')}
                      </span>
                      <textarea
                        rows={2}
                        data-testid="doc-reject-reason"
                        className="w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary"
                        placeholder={t('compliance.queue.reject.placeholder')}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                    </label>
                    <p className="text-xs text-text-tertiary mt-1">
                      {t('compliance.queue.reject.hint')}
                    </p>
                    <div className="flex justify-end gap-2 mt-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setRejecting(null);
                          setRejectReason('');
                        }}
                      >
                        {t('compliance.queue.action.cancel')}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={rejectReason.trim() === '' || busyId === doc.id}
                        onClick={() => {
                          void runReject(doc.id);
                        }}
                      >
                        {t('compliance.queue.action.confirmReject')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 mb-4 flex items-start gap-3">
        <Shield size={16} className="text-warning-hover shrink-0 mt-0.5" />
        <div className="text-sm text-text-secondary">
          <strong className="text-warning-hover">
            {t('compliance.bpjph.banner.title')}
          </strong>{' '}
          {t('compliance.bpjph.banner.body')}{' '}
          <strong className="text-text-primary">
            {t('compliance.bpjph.banner.certs', {
              compliant: bpjph.compliant,
              total: bpjph.total,
            })}
          </strong>{' '}
          {t('compliance.bpjph.banner.compliantSuffix')}
        </div>
      </div>

      {/* D-CENSUS-8 — the FACT stays, the URGENCY is retracted.
          The 17 Oct 2026 BPJPH date is real Indonesian regulation. What was false
          was this card's rhetoric: a red-when-≤90-days countdown with a draining
          progress bar, which reads as "this product is racing a deadline" — the
          exact pressure the canon removed on 2026-07-15 (Track-R is a normal
          operator lane; certification is handled manually by the compliance team).
          Now: neutral border, neutral figure, no colour escalation, no depleting
          bar. A date the reader may need to know, stated without manufacturing
          alarm about it. */}
      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm px-5 py-4 mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-bold text-text-primary">
              {t('compliance.deadline.title')}
            </div>
            <div className="text-xs text-text-tertiary mt-0.5 max-w-2xl">
              {t('compliance.deadline.subtitle')}
            </div>
          </div>
          <div className="text-right shrink-0">
            <Data as="div" className="text-kpi leading-none text-text-secondary">
              {deadline.daysLeft}
            </Data>
            <div className="text-xs text-text-tertiary mt-1">
              {t('compliance.deadline.daysRemaining')}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5 mb-6">
        <KpiCard
          eyebrow={t('compliance.kpi.expired.eyebrow')}
          value={counts.expired.toString()}
          subtitle={<span className="text-danger">{t('compliance.kpi.expired.subtitle')}</span>}
          icon={AlertTriangle}
        />
        <KpiCard
          eyebrow={t('compliance.kpi.expiring.eyebrow')}
          value={counts.expiring.toString()}
          subtitle={<span className="text-warning-hover">{t('compliance.kpi.expiring.subtitle')}</span>}
          icon={Clock}
        />
        <KpiCard
          eyebrow={t('compliance.kpi.missing.eyebrow')}
          value={counts.missing.toString()}
          subtitle={<span className="text-danger">{t('compliance.kpi.missing.subtitle')}</span>}
          icon={FileQuestion}
        />
        {/* HALAL-UNDERREVIEW: Under Review now has its own visible KPI home —
            first-class, not a silent second-class state. */}
        <KpiCard
          eyebrow={t('compliance.kpi.underReview.eyebrow')}
          value={counts.underReview.toString()}
          subtitle={t('compliance.kpi.underReview.subtitle')}
          icon={RefreshCw}
        />
        <KpiCard
          eyebrow={t('compliance.kpi.valid.eyebrow')}
          value={counts.valid.toString()}
          subtitle={t('compliance.kpi.valid.subtitle')}
          icon={CheckCircle2}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <FilterChipsBar<StatusFilter>
          options={STATUS_OPTIONS.map((o) => ({ id: o.id, label: t(o.labelKey) }))}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <FilterChipsBar<CategoryFilter>
          options={CATEGORY_OPTIONS.map((o) => ({ id: o.id, label: t(o.labelKey) }))}
          value={categoryFilter}
          onChange={setCategoryFilter}
        />
        <span className="text-meta text-text-tertiary">
          {t('compliance.filter.summary', {
            filtered: filtered.length,
            total: rows.length,
          })}
        </span>
      </div>

      {/* ── THE COLUMN'S ONE-LINE EXPLANATION, AND WHY IT IS NOT A BANNER ──
          Two banners already sit above (data readiness, and the BPJPH date), and
          a third would train the eye to skip all three. This is a quiet line
          attached to the table it describes. It states the NEGATIVE explicitly —
          "no certificate here has been handed to S/4HANA" — because the column
          renders one value on every row, and a uniform column with no caption
          reads as decoration rather than as a fact. */}
      <div className="flex items-start gap-2 mb-2 text-xs text-text-tertiary">
        <Database size={12} className="shrink-0 mt-0.5" />
        <span data-testid="sap-sync-note">{t('compliance.sapSync.note')}</span>
      </div>

      {/* ⚠️ `overflow-x-auto`, NOT `overflow-hidden` — AND THE OLD VALUE WAS
          ALREADY LOSING A COLUMN. Measured in the built bundle at a 1208px
          viewport: the table wants 1007px inside an 896px container, so the
          right-hand **Remind** action was clipped and UNREACHABLE — 24px of it
          before this batch, 110px after the ninth column landed. Clipping is the
          worst of the three options because it is silent: the control does not
          look disabled, it looks absent. Scrolling the table inside its own box
          keeps every column reachable at every width and fixes the 24px that
          predates this change. */}
      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto mb-6">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('compliance.table.supplier')}</TableHeaderCell>
            <TableHeaderCell>{t('compliance.table.certificate')}</TableHeaderCell>
            <TableHeaderCell>{t('compliance.table.category')}</TableHeaderCell>
            <TableHeaderCell>{t('compliance.table.issuedBy')}</TableHeaderCell>
            <TableHeaderCell>{t('compliance.table.expiry')}</TableHeaderCell>
            <TableHeaderCell>{t('compliance.table.status')}</TableHeaderCell>
            <TableHeaderCell>{t('compliance.table.sapSync')}</TableHeaderCell>
            <TableHeaderCell>{t('compliance.table.actionRequired')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('compliance.table.remind')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {filtered.map(({ entry, status, days, category, remind }) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <div className="font-semibold text-text-primary">
                    {entry.supplierName}
                  </div>
                </TableCell>
                <TableCell className="text-text-secondary">
                  <div>{t(certTypeLabelKey(entry.certType))}</div>
                  {entry.certNumber && (
                    <Data as="div" className="text-xs text-text-tertiary mt-0.5">
                      {entry.certNumber}
                    </Data>
                  )}
                </TableCell>
                <TableCell>
                  <StatusPill variant="neutral">{category}</StatusPill>
                </TableCell>
                <TableCell className="text-text-tertiary">
                  {entry.issuer || '—'}
                </TableCell>
                <TableCell>
                  <div className="text-sm text-text-secondary whitespace-nowrap">
                    {formatDate(entry.expiryDate)}
                  </div>
                  {days !== null && (
                    <div
                      className={`text-xs mt-0.5 ${
                        days <= 0
                          ? 'text-danger'
                          : days <= 90
                            ? 'text-warning-hover'
                            : 'text-text-tertiary'
                      }`}
                    >
                      {days <= 0
                        ? t('compliance.expiry.expiredAgo', { days: Math.abs(days) })
                        : t('compliance.expiry.remaining', { days })}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <StatusPill variant={statusTone(status)}>
                    {status === 'Under Review' ? (
                      <span className="inline-flex items-center gap-1">
                        <RefreshCw size={10} />
                        {status}
                      </span>
                    ) : (
                      status
                    )}
                  </StatusPill>
                </TableCell>
                {/* ── THE SYNC STATE, SAID RATHER THAN INFERRED ──────────────
                    A stored fact, NOT a projection — the one non-derived column
                    added since I3.1, and it is stored precisely because nothing
                    can compute it: there is no transport to ask. Every row reads
                    the same today because `SapSyncState` has exactly one
                    reachable member; the column is here so a reader learns that
                    from the row instead of assuming the opposite from silence. */}
                <TableCell>
                  <span
                    data-testid={`sap-sync-${entry.sapSync}`}
                    title={t(`compliance.sapSync.${entry.sapSync}.title`)}
                  >
                    <StatusPill variant="neutral">
                      {t(`compliance.sapSync.${entry.sapSync}`)}
                    </StatusPill>
                  </span>
                </TableCell>
                <TableCell>
                  {/* Descriptive of state, never imperative (D4): the label names
                      the state; it does not offer an action the SIMULATED cert
                      cannot back. */}
                  <span
                    className={`text-xs ${
                      status === 'Expired' || status === 'Missing'
                        ? 'text-danger'
                        : status === 'Expiring'
                          ? 'text-warning-hover'
                          : 'text-text-tertiary'
                    }`}
                  >
                    {t(actionLabelKey(status))}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {/* Remind is gated on remindEligible (lifecycleState Valid) —
                      the honest projection. Under Review / Missing certs are NOT
                      remind-eligible (HALAL-UNDERREVIEW mechanism, I3.1). */}
                  {remind && (
                    <Button
                      variant="outline"
                      icon={Bell}
                      onClick={() =>
                        toast({
                          variant: 'info',
                          title: t('compliance.toast.reminderQueued', {
                            supplier: entry.supplierName,
                          }),
                          description: t('compliance.toast.reminderDesc'),
                        })
                      }
                    >
                      {t('compliance.action.remind')}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="text-center text-sm text-text-tertiary py-10"
                >
                  {t('compliance.table.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <div className="bg-info-soft border-l-2 border-info rounded px-4 py-3 text-sm text-text-primary flex items-start gap-2">
        <Shield size={14} className="text-info shrink-0 mt-0.5" />
        <span>
          <strong className="text-info">{t('compliance.phase2.title')}</strong>{' '}
          {t('compliance.phase2.body')}
        </span>
      </div>
      {/* ── §WAVE E · THE REQUEST PANEL ────────────────────────────────────
          ⚠️ **THE PANEL IS MOUNTED ONLY WHEN THE SEAT HOLDS THE ATOM, AND THAT
          IS THE MODE BEING GATED RATHER THAN THE DOOR (§84).** `SupplierOrders`
          shipped a live commit because a notice guarded ONE entrance to a mode
          three ways reachable, and a comment asserting the other doors were
          unreachable was the only thing holding it up — it was false. Here the
          MODE itself is conditional, so there is no second door to miss, and a
          seat NARROWED WHILE THE PANEL STANDS OPEN loses the panel rather than
          just the button (`SupplierShipments` is the precedent to copy).

          `SidePanel`'s own contract (#280) makes a closed panel ABSENT rather
          than hidden, so this guard is about AUTHORITY, not about leakage. */}
      {request.kind === 'held' && (
        <SidePanel
          open={requestOpen}
          onClose={closeRequest}
          title={t('compliance.request.panel.title')}
          footerActions={
            reqConfirming ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setReqConfirming(false)}
                  disabled={reqBusy}
                >
                  {t('compliance.request.action.back')}
                </Button>
                <Button
                  variant="outline"
                  data-testid="doc-request-commit"
                  disabled={!reqComplete || reqBusy}
                  onClick={() => {
                    void runRequest();
                  }}
                >
                  {t('compliance.request.action.send')}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                data-testid="doc-request-review"
                disabled={!reqComplete}
                onClick={() => setReqConfirming(true)}
              >
                {t('compliance.request.action.review')}
              </Button>
            )
          }
        >
          {/* ⚠️ **CONFIRM-BEFORE-COMMIT, AND WHAT IT IS FOR IS THE SUPPLIER
              CHOICE, NOT THE CLICK.** This act writes across the tenancy
              boundary — a row minted here lands in ANOTHER company's queue and
              names them as owing Paragon a document. The roster resolution
              (`requireCreationOwner`) refuses an id that is not a tenant; it
              cannot refuse the WRONG tenant, because the wrong tenant is a
              perfectly valid one. Only a reader can catch that, so the reader
              is shown the resolved NAME — not the id they picked from — beside
              every other field, before anything commits. */}
          {reqConfirming ? (
            <div className="space-y-4" data-testid="doc-request-confirm">
              <p className="text-sm text-text-secondary">
                {t('compliance.request.confirm.lead')}
              </p>
              <dl className="bg-bg-hover rounded px-4 py-3 space-y-3 text-sm">
                <div>
                  <dt className="text-label text-text-tertiary uppercase">
                    {t('compliance.request.field.supplier')}
                  </dt>
                  <dd className="text-text-primary font-semibold">
                    {/* i18n-defer: mock/sample data (supplier name) */}
                    {reqSupplierName}{' '}
                    <Data className="text-xs text-text-tertiary">
                      {reqSupplier}
                    </Data>
                  </dd>
                </div>
                <div>
                  <dt className="text-label text-text-tertiary uppercase">
                    {t('compliance.request.field.category')}
                  </dt>
                  <dd className="text-text-primary">
                    {t(
                      REQUEST_CATEGORIES.find((c) => c.id === reqCategory)
                        ?.labelKey ?? 'compliance.request.category.other',
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-label text-text-tertiary uppercase">
                    {t('compliance.request.field.note')}
                  </dt>
                  {/* i18n-defer: buyer-authored free text, shown to the
                      supplier word for word. */}
                  <dd className="text-text-secondary">{reqNote.trim()}</dd>
                </div>
              </dl>
              <p className="text-xs text-text-tertiary">
                {t('compliance.request.confirm.unattributed')}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-sm text-text-secondary">
                {t('compliance.request.panel.lead')}
              </p>

              <label className="block">
                <span className="block text-label text-text-tertiary uppercase mb-1">
                  {t('compliance.request.field.supplier')}
                </span>
                <select
                  data-testid="doc-request-supplier"
                  className="w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action"
                  value={reqSupplier}
                  onChange={(e) => setReqSupplier(e.target.value)}
                >
                  <option value="">
                    {t('compliance.request.field.supplierPlaceholder')}
                  </option>
                  {/* ⚠️ THE ROSTER THROUGH THE SEAM, NOT THE FIXTURE MODULE.
                      The dispatcher resolves the chosen id against the SAME
                      roster, so every value this control can produce is a value
                      the gate accepts — the refusal exists for a payload this
                      control cannot construct, which is precisely why the
                      refusal is not decorative. */}
                  {supplierOptions.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {/* i18n-defer: mock/sample data (supplier name) */}
                      {sup.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-label text-text-tertiary uppercase mb-1">
                  {t('compliance.request.field.category')}
                </span>
                <select
                  data-testid="doc-request-category"
                  className="w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action"
                  value={reqCategory}
                  onChange={(e) =>
                    setReqCategory(e.target.value as SupplierDocumentCategory | '')
                  }
                >
                  <option value="">
                    {t('compliance.request.field.categoryPlaceholder')}
                  </option>
                  {REQUEST_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {t(c.labelKey)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-label text-text-tertiary uppercase mb-1">
                  {t('compliance.request.field.note')}
                </span>
                <textarea
                  rows={3}
                  data-testid="doc-request-note"
                  className="w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary"
                  placeholder={t('compliance.request.field.notePlaceholder')}
                  value={reqNote}
                  onChange={(e) => setReqNote(e.target.value)}
                />
                <span className="block text-xs text-text-tertiary mt-1">
                  {t('compliance.request.field.noteHint')}
                </span>
              </label>
            </div>
          )}
        </SidePanel>
      )}

    </AppShellV2>
  );
};

export default BuyerCompliance;
