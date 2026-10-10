import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { personLabel } from '../services/identity/personLabel';
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
import ListPage from '../components/ui-v2/ListPage';
import DataTable, { CellSub, type Column } from '../components/ui-v2/DataTable';
import Data from '../components/ui-v2/Data';
import { Field, FieldList } from '../components/ui-v2/Field';
import SectionHeading from '../components/ui-v2/SectionHeading';
import { FormField, Select, TextArea } from '../components/ui-v2/Form';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import SidePanel from '../components/ui-v2/SidePanel';
import {
  recordAnchorId,
  useDeepLinkedHighlight,
} from '../lib/recordDeepLink';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import StatusPill from '../components/ui-v2/StatusPill';
import LivenessPill from '../components/ui-v2/LivenessPill';
import SessionStampMarker from '../components/ui-v2/SessionStampMarker';
import { isLive, readinessNote } from '../services/liveness';
import { formatDate } from '../lib/format';
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
import MaterialApplicabilityPanel from './compliance/MaterialApplicabilityPanel';
import {
  BPJPH_MANDATE_DATE,
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
import { DECLARED_PRESENT } from '../services/data/fixturePresent';
import ActorPreActNotice from '../components/ui-v2/ActorPreActNotice';
import { namedSeatRefusalKey } from '../lib/namedSeatRefusal';

// ⚠️ ANCHORED — this surface rendered values derived from anchored
// fixture data against the WALL CLOCK, so what a reader saw moved every day
// with no commit involved. Module-scope `DECLARED_PRESENT`, the shipped
// pattern from `BuyerShipments` / `BuyerGoodsReceipt`, and behaviour-
// preserving for the same reason they are: this surface's families shift by
// `DECLARED_PRESENT - anchor` and so does this pin, so every rendered
// day-count is answered at the instant the fixtures were authored for.
//
// ⚠️ SESSION-WRITTEN STATE KEEPS THE WALL CLOCK. This constant is for READ
// projections only. A timestamp stamped onto something the user just did is a
// fact about this session, not about the fixture set, and anchoring one would
// tell the reader their own action happened weeks ago.
const TODAY = DECLARED_PRESENT;

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
  // SUP-1 - asking for, confirming and refusing a document need a named
  // person; that refusal has its own sentence, in the reader's language.
  const seatRefusal = (reason: string | undefined): string | null => {
    const key = namedSeatRefusalKey(reason);
    return key ? t(key) : null;
  };
  const dataErrorText = useDataErrorText();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');

  // Now injected once per mount — the projection is pure & deterministic (no
  // clock read inside pure code); rows recompute only if the read changes.
  const now = TODAY;
  const query = useComplianceRegistry();
  // §82 — the review queue. A BUYER scope gets the cross-supplier superset from
  // `applySupplierScope`, which is what makes a compliance officer able to see
  // every supplier's pending declaration from one page.
  const docsQuery = useDocuments();
  const reviewQueue = useMemo(
    () => (docsQuery.data?.items ?? []).filter((d) => d.status === 'Under Review'),
    [docsQuery.data],
  );
  // SUP-1 - documents confirmed through the verb: both halves of the stamp.
  const confirmedDocs = useMemo(
    () =>
      (docsQuery.data?.items ?? []).flatMap((d) =>
        d.verifiedAt && d.verifiedBy ? [{ ...d, verifiedAt: d.verifiedAt, verifiedBy: d.verifiedBy }] : [],
      ),
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
          description: seatRefusal(result.reason) ?? refusalText(result.reason) ?? result.reason,
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
          description: seatRefusal(result.reason) ?? refusalText(result.reason) ?? result.reason,
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
          description: seatRefusal(result.reason) ?? refusalText(result.reason) ?? result.reason,
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

  // ── DEEP LINK (?id=) ──────────────────────────────────────────────────────
  // The dashboard's compliance window links a row here. The status filter is
  // WIDENED so the linked certificate cannot be filtered out from under the
  // reader (`Glossary.tsx`'s rule); an unknown id highlights nothing and says
  // nothing.
  const deepLinkedCertId = useDeepLinkedHighlight(items.length > 0);
  useEffect(() => {
    if (deepLinkedCertId) setStatusFilter('All');
  }, [deepLinkedCertId]);

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
    // ⚠️ THE ABSOLUTE CLASS, READ RATHER THAN RESTATED. This was a hardcoded
    // `new Date('2026-10-17')` — a duplicate of the regulatory constant that
    // would NOT have moved with it. A date that must not move is as much a
    // declaration as one that must, and it belongs to its owner.
    const target = new Date(BPJPH_MANDATE_DATE);
    const today = new Date(TODAY);
    const daysLeft = Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
    const pct = Math.max(0, Math.min(100, (daysLeft / 365) * 100));
    return { daysLeft, pct };
  }, []);

  const today = formatDate(TODAY);

  const columns = useMemo<Column<Row>[]>(
    () => [
      {
        id: 'supplier',
        header: t('compliance.table.supplier'),
        kind: 'text',
        cell: ({ entry }) => entry.supplierName,
      },
      {
        id: 'certificate',
        header: t('compliance.table.certificate'),
        kind: 'text',
        cell: ({ entry }) => (
          <>
            {t(certTypeLabelKey(entry.certType))}
            {entry.certNumber && <CellSub>{entry.certNumber}</CellSub>}
          </>
        ),
      },
      {
        id: 'category',
        header: t('compliance.table.category'),
        kind: 'status',
        cell: ({ category }) => <StatusPill variant="neutral">{category}</StatusPill>,
      },
      {
        id: 'issuedBy',
        header: t('compliance.table.issuedBy'),
        kind: 'text',
        cell: ({ entry }) => entry.issuer || '—',
      },
      {
        id: 'expiry',
        header: t('compliance.table.expiry'),
        kind: 'date',
        cell: ({ entry, days }) => (
          <>
            {formatDate(entry.expiryDate)}
            {days !== null && (
              <CellSub tone={days <= 0 ? 'critical' : days <= 90 ? 'warning' : 'neutral'}>
                {days <= 0
                  ? t('compliance.expiry.expiredAgo', { days: Math.abs(days) })
                  : t('compliance.expiry.remaining', { days })}
              </CellSub>
            )}
          </>
        ),
      },
      {
        id: 'status',
        header: t('compliance.table.status'),
        kind: 'status',
        cell: ({ status }) => (
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
        ),
      },
      // ── THE SYNC STATE, SAID RATHER THAN INFERRED ──────────────
      // A stored fact, NOT a projection — the one non-derived column
      // added since I3.1, and it is stored precisely because nothing
      // can compute it: there is no transport to ask. Every row reads
      // the same today because `SapSyncState` has exactly one
      // reachable member; the column is here so a reader learns that
      // from the row instead of assuming the opposite from silence.
      {
        id: 'sapSync',
        header: t('compliance.table.sapSync'),
        kind: 'status',
        cell: ({ entry }) => (
          <span
            data-testid={`sap-sync-${entry.sapSync}`}
            title={t(`compliance.sapSync.${entry.sapSync}.title`)}
          >
            <StatusPill variant="neutral">{t(`compliance.sapSync.${entry.sapSync}`)}</StatusPill>
          </span>
        ),
      },
      // Descriptive of state, never imperative (D4): the label names
      // the state; it does not offer an action the SIMULATED cert
      // cannot back.
      {
        id: 'actionRequired',
        header: t('compliance.table.actionRequired'),
        kind: 'text',
        cell: ({ status }) => (
          <span
            className={
              status === 'Expired' || status === 'Missing'
                ? 'text-critical'
                : status === 'Expiring'
                  ? 'text-warning-hover'
                  : undefined
            }
          >
            {t(actionLabelKey(status))}
          </span>
        ),
      },
      // Remind is gated on remindEligible (lifecycleState Valid) —
      // the honest projection. Under Review / Missing certs are NOT
      // remind-eligible (HALAL-UNDERREVIEW mechanism, I3.1).
      {
        id: 'remind',
        header: t('compliance.table.remind'),
        kind: 'actions',
        cell: ({ entry, remind }) =>
          remind && (
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
          ),
      },
    ],
    [t, toast],
  );

  return (
    <ListPage
        breadcrumb={[t('compliance.crumb.tracker')]}
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
        meta={
          <span className="flex items-center gap-3">
            <span>{t('compliance.meta.summary', { count: rows.length, date: today })}</span>
            {/* Honest-render: capability="compliance" derives SIMULATED (no wired
                CommandTarget) AND is harvest-gated (I3.3) → amber "Sample — awaiting
                Track-R harvest". Green is structurally unreachable (two-gate guard). */}
            <LivenessPill capability="compliance" />
          </span>
        }
        notices={
          /* Waiting-state banner (I3.3, second form) — the SPECIFIC readiness message:
             this surface is proven and wired to the seam, waiting for the Track-R
             certificate harvest to land the real registry. Rendered only while the
             capability is harvest-gated; it disappears the moment the two-gate flip
             lands (LIVENESS-DATASOURCE-01). Distinct from the legal-deadline banner
             below (that is about the mandate; this is about data liveness). */
          !isLive('compliance') && readinessNote('compliance') ? (
            <div className="bg-bg-hover border-l-2 border-warning rounded px-4 py-3 flex items-start gap-3">
              <Database size={16} className="text-warning-hover shrink-0 mt-0.5" />
              <div className="text-sm text-text-secondary">
                <strong className="text-text-primary">
                  {t('compliance.readiness.title')}
                </strong>{' '}
                {t('compliance.readiness.body')}
              </div>
            </div>
          ) : undefined
        }
      >

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
      {/* OPS-2 — where Compliance rules whether halal and BPOM apply to a
          material. Receiving reads it; it sits above the certificate registry
          because a certificate is only asked for where halal applies. */}
      <MaterialApplicabilityPanel />

      {reviewQueue.length > 0 && (
        <div
          className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm mb-6 overflow-hidden"
          data-testid="doc-review-queue"
        >
          <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2">
            <Inbox size={16} className="text-action shrink-0" aria-hidden="true" />
            <div>
              <SectionHeading as="h2">{t('compliance.queue.title')}</SectionHeading>
              <div className="text-xs text-text-tertiary mt-0.5">
                {reviewQueue.length === 1
                  ? t('compliance.queue.subtitle.one', { count: reviewQueue.length })
                  : t('compliance.queue.subtitle.other', { count: reviewQueue.length })}
              </div>
              {/* SUP-1 - said before the act: whose name a confirmation or a
                  refusal carries, or that this seat names nobody. */}
              {(review.verify.kind === 'held' || review.reject.kind === 'held') && (
                <ActorPreActNotice
                  unattributedKey="identity.preAct.namedRequired"
                  className="text-xs text-text-tertiary mt-1"
                  testId="supplierdoc-review-pre-act"
                />
              )}
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
                      <FieldList columns={2} className="mt-2">
                        <Field label={t('compliance.queue.field.issuer')}>
                          {/* i18n-defer: supplier-authored free text */}
                          {doc.declaration.issuer}
                        </Field>
                        <Field label={t('compliance.queue.field.dates')} kind="date">
                          {formatDate(doc.declaration.issuedOn)}
                          {' → '}
                          {doc.declaration.expiresOn === null
                            ? t('compliance.queue.noExpiry')
                            : formatDate(doc.declaration.expiresOn)}
                        </Field>
                        {/* ⚠️ **`declaredAt` AND `declaredBy` ARE RENDERED HERE
                              BECAUSE THE STORED-FIELD GATE SAID THEY WERE NOT.**
                              It flagged both as stored-and-never-read — the
                              `certBasis` shape — and the honest disposal is a
                              reader, not an allowlist row. They also earn their
                              place: a reviewer needs to know how old a claim is,
                              and the attribution says out loud that this platform
                              cannot name the person who made it. */}
                        <Field
                          label={t('compliance.queue.field.declared')}
                          kind="date"
                          wide
                          sub={
                            doc.declaration.declaredBy.kind === 'UNATTRIBUTED'
                              ? t('compliance.queue.declaredBy.unattributed')
                              : personLabel(
                                  doc.declaration.declaredBy.person.personId,
                                  t,
                                )
                          }
                        >
                          {formatDate(doc.declaration.declaredAt)}{' '}
                          {/* ⚠️ **THE ONE STAMP ON THIS PANEL THAT ANSWERS TO
                                THE WALL CLOCK.** `declaredAt` is minted by the
                                store at dispatch (anti-backdating, ruled), while
                                every neighbouring date here is a fixture literal
                                shifted onto the declared present. The marker
                                derives that per VALUE and renders nothing when
                                the value is a seeded one — so it cannot claim a
                                clock it did not read. No fixture seeds a
                                declaration today, which is exactly why the test
                                for the seeded arm is written against a value and
                                not against this site. */}
                          <SessionStampMarker
                            documentId={doc.id}
                            field="declaredAt"
                            value={doc.declaration.declaredAt}
                          />
                        </Field>
                        <Field label={t('compliance.queue.field.scope')} wide>
                          {/* ⚠️ THE SUPPLIER'S OWN WORDS, RENDERED AS SUCH. This
                              is NOT a material-code list and must never be shown
                              as one — compliance reads it and assigns the codes.
                              i18n-defer: supplier-authored free text. */}
                          {doc.declaration.scopeText}
                        </Field>
                      </FieldList>
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
                    <FormField label={t('compliance.queue.reject.label')}>
                      <TextArea
                        rows={2}
                        data-testid="doc-reject-reason"
                        placeholder={t('compliance.queue.reject.placeholder')}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                    </FormField>
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

      {/* SUP-1 - WHO CONFIRMED, AND WHEN. A confirmed document leaves the queue
          above; without this the buyer's side kept no trace of the act. Only
          documents confirmed through the verb carry the pair, so a seeded
          `Valid` row is not listed and nothing is invented for it. */}
      {confirmedDocs.length > 0 && (
        <div
          className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm mb-6 overflow-hidden"
          data-testid="doc-confirmed-list"
        >
          <div className="px-5 py-3 border-b border-border-subtle text-sm font-bold text-text-primary">
            {t('compliance.confirmed.title')}
          </div>
          <ul className="divide-y divide-border-subtle">
            {confirmedDocs.map((doc) => (
              <li
                key={doc.id}
                className="px-5 py-3 text-xs text-text-secondary"
                data-testid={`doc-confirmed-${doc.id}`}
              >
                <span className="text-sm font-semibold text-text-primary">
                  {doc.declaration
                    ? t(certTypeLabelKey(doc.declaration.certType))
                    : /* i18n-defer: mock/sample data (fixture document name) */
                      doc.name}
                </span>
                {' · '}
                {/* i18n-defer: mock/sample data (supplier id) */}
                <Data>{doc.supplierId}</Data>
                {' · '}
                {t('compliance.confirmed.by', {
                  person:
                    doc.verifiedBy.kind === 'RESOLVED'
                      ? personLabel(doc.verifiedBy.person.personId, t)
                      : t('compliance.confirmed.nobody'),
                })}{' '}
                <Data>{formatDate(doc.verifiedAt)}</Data>{' '}
                <SessionStampMarker documentId={doc.id} field="verifiedAt" value={doc.verifiedAt} />
              </li>
            ))}
          </ul>
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
            <SectionHeading as="h2">{t('compliance.deadline.title')}</SectionHeading>
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
          subtitle={<span className="text-critical">{t('compliance.kpi.expired.subtitle')}</span>}
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
          subtitle={<span className="text-critical">{t('compliance.kpi.missing.subtitle')}</span>}
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
      {/* ⚠️ THE ANCHOR AND THE RING ARE THE DEEP-LINK AFFORDANCE HERE.
          This page has no per-certificate detail panel — its only
          SidePanel is the document-REQUEST flow — so a linked row lands
          ON ITSELF, scrolled into view and ringed, the way a glossary
          term chip does (operator ruling). No panel is invented. */}
      <DataTable<Row>
        className="mb-6"
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.entry.id}
        rowProps={(r) => ({
          id: recordAnchorId(r.entry.id),
          className: r.entry.id === deepLinkedCertId ? 'ring-2 ring-action ring-inset' : '',
        })}
        empty={t('compliance.table.empty')}
      />

      <div className="bg-info-soft border-l-2 border-info rounded px-4 py-3 text-sm text-text-primary flex items-start gap-2">
        <Shield size={14} className="text-info shrink-0 mt-0.5" />
        <span>
          <strong className="text-info">{t('compliance.phase2.title')}</strong>{' '}
          {t('compliance.phase2.body')}
        </span>
      </div>
      {/* ── §WAVE E · THE REQUEST PANEL ────────────────────────────────────
          ⚠️ **THE PANEL IS MOUNTED ONLY WHEN THE SEAT HOLDS THE ATOM, AND THAT
          IS THE MODE BEING GATED RATHER THAN THE DOOR (ENTRANCE-IS-THE-UNIT-01).** `SupplierOrders`
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
              <FieldList columns={1} className="bg-bg-hover rounded px-4 py-3">
                <Field label={t('compliance.request.field.supplier')} sub={reqSupplier}>
                  {/* i18n-defer: mock/sample data (supplier name) */}
                  {reqSupplierName}
                </Field>
                <Field label={t('compliance.request.field.category')}>
                  {t(
                    REQUEST_CATEGORIES.find((c) => c.id === reqCategory)
                      ?.labelKey ?? 'compliance.request.category.other',
                  )}
                </Field>
                <Field label={t('compliance.request.field.note')}>
                  {/* i18n-defer: buyer-authored free text, shown to the
                      supplier word for word. */}
                  {reqNote.trim()}
                </Field>
              </FieldList>
              <ActorPreActNotice unattributedKey="identity.preAct.namedRequired" testId="supplierdoc-request-pre-act" />
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-sm text-text-secondary">
                {t('compliance.request.panel.lead')}
              </p>

              <FormField label={t('compliance.request.field.supplier')}>
                <Select
                  data-testid="doc-request-supplier"
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
                </Select>
              </FormField>

              <FormField label={t('compliance.request.field.category')}>
                <Select
                  data-testid="doc-request-category"
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
                </Select>
              </FormField>

              <FormField
                label={t('compliance.request.field.note')}
                hint={t('compliance.request.field.noteHint')}
              >
                <TextArea
                  rows={3}
                  data-testid="doc-request-note"
                  placeholder={t('compliance.request.field.notePlaceholder')}
                  value={reqNote}
                  onChange={(e) => setReqNote(e.target.value)}
                />
              </FormField>
            </div>
          )}
        </SidePanel>
      )}

    </ListPage>
  );
};

export default BuyerCompliance;
