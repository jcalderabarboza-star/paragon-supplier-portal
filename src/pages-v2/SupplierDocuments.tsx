import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Files,
  Upload,
  UploadCloud,
  Eye,
  ExternalLink,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import ListPage from '../components/ui-v2/ListPage';
import DataTable, { CellSub, type Column } from '../components/ui-v2/DataTable';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import SessionStampMarker from '../components/ui-v2/SessionStampMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import SearchBar from '../components/ui-v2/SearchBar';
import StatusPill from '../components/ui-v2/StatusPill';
import Button from '../components/ui-v2/Button';
import SidePanel from '../components/ui-v2/SidePanel';
import GuidedLesson from '../components/ui-v2/GuidedLesson';
import Data from '../components/ui-v2/Data';
import SectionHeading from '../components/ui-v2/SectionHeading';
import {
  HALAL_RENEWAL_STEPS,
  HALAL_RENEWAL_SOURCE,
} from '../lib/learn/halalRenewalWalkthrough';
import { useToast } from '../hooks/useToast';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import type {
  CertType,
  SupplierDocument,
  SupplierDocumentCategory as DocCategory,
} from '../services/data/types';
import { useDocuments } from '../services/query/hooks';
import {
  daysUntil,
  documentExpiry,
  DOCUMENT_EXPIRING_WINDOW_DAYS,
} from '../services/data/dayProjection';
import {
  documentDisplayState,
  DISPLAY_STATE_LABEL_KEY,
  DISPLAY_STATE_TONE,
} from '../services/data/documentDisplayState';
import {
  useSupplierDocumentDeclare,
  useSupplierDocumentSubmit,
} from '../services/query/commandHooks';
import { certTypeLabelKey } from '../lib/complianceView';
import { useVerbAvailability } from '../hooks/useVerbAvailability';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { formatDate } from '../lib/format';
import { useTranslation } from 'react-i18next';
import { useRefusalText } from '../hooks/useRefusalText';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';

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

type CategoryFilter = 'All' | DocCategory;

// ── §82 · THE DECLARATION FORM ──────────────────────────────────────────────
//
// ⚠️ **THE SCHEME LIST IS THE `CertType` UNION, WRITTEN OUT ONCE AND BOUND BY
// THE TYPE.** `satisfies readonly CertType[]` plus the exhaustive
// `certTypeLabelKey` switch means adding a seventh scheme is a `tsc` failure in
// two places rather than a dropdown that silently omits it. A `.map` over an
// object's keys would have been shorter and would have lost that.
const CERT_TYPES = [
  'HALAL_BPJPH',
  'HALAL_MUI_LEGACY',
  'HALAL_FOREIGN',
  'BPOM',
  'ISO',
  'OTHER',
] as const satisfies readonly CertType[];

const FIELD_LABEL = 'block text-label text-text-tertiary uppercase mb-1';
const FIELD_INPUT =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
const FIELD_HINT = 'block text-xs text-text-tertiary mt-1';

/** What the panel is collecting. `expiresOn` is the ONLY optional one — a BPJPH
 *  cert has permanent validity under GR 42/2024, so blank is an answer. */
interface DeclarationForm {
  certType: CertType;
  certNumber: string;
  issuer: string;
  issuedOn: string;
  expiresOn: string;
  scopeText: string;
}

const EMPTY_FORM: DeclarationForm = {
  certType: 'HALAL_BPJPH',
  certNumber: '',
  issuer: '',
  issuedOn: '',
  expiresOn: '',
  scopeText: '',
};

/** Every field the verb requires is present and non-blank. `expiresOn` is
 *  deliberately absent from this check — see `DeclarationForm`. */
function declarationComplete(f: DeclarationForm): boolean {
  return (
    f.certNumber.trim() !== '' &&
    f.issuer.trim() !== '' &&
    f.issuedOn.trim() !== '' &&
    f.scopeText.trim() !== ''
  );
}

// ⚠️ **`STATUS_VARIANT` IS DELETED RATHER THAN LEFT UNUSED**, and so is the
// `DocStatus` alias that existed only to type it. `tsc` would not have said
// a word — `noUnusedLocals` is off — so a stored-keyed tone map would have
// sat here indefinitely, one import away from being wired back by a future
// edit that saw a map and assumed it was the one to use. `DISPLAY_STATE_TONE`
// is now the only tone map this page can reach.

/**
 * ⚠️ **THE REFUSAL BLOCK — REASON, TIMESTAMP, AND THE LINE THAT SAYS NOBODY CAN
 * BE NAMED.** It renders the SAME grammar the dispute lane set one tenancy over
 * (`DisputeLedger`, `SupplierForecasts.tsx`): a coloured left rule, a label,
 * a timestamp, then the buyer's authored text — read by the party the text is
 * about. It sits inside a table cell, so every line is a `CellSub` (UI-1b).
 *
 * ⚠️ **THREE THINGS IT DELIBERATELY DOES NOT DO.**
 * 1. **It does not name a person.** `rejectedBy` is `ActorAttribution`, always
 *    `UNATTRIBUTED` in this tree, so the component renders the REASON rather
 *    than a name — and says so in words instead of leaving the slot blank.
 * 2. **It offers no remedy affordance.** A "resubmit" button here would be a
 *    forward promise with no handler: `supplierdoc:upload` is unauthored, and
 *    the atom belongs to the back-office lane by ruling. The refusal text
 *    carries the instruction; the platform makes no claim about what happens
 *    next (`FORWARD-PROMISE-HAS-NO-HANDLER-01`).
 * 3. **It does not fabricate a time of day.** `rejectedAt` is a full instant,
 *    but `formatDate` is date-only and no shared datetime formatter exists in
 *    this tree — so the surface shows the DATE and claims nothing finer.
 */
const RefusalBlock: React.FC<{ doc: SupplierDocument }> = ({ doc }) => {
  const { t } = useTranslation();
  // ⚠️ CO-PRESENCE IS CHECKED HERE TOO, NOT ONLY IN THE FIXTURE GATE. A reason
  // with no timestamp is an accusation with no date; rendering half of one is
  // worse than rendering none, so the block is all-or-nothing.
  if (!doc.rejectionReason || !doc.rejectedAt) return null;
  // ⚠️ **AND THE STATE GATE, ADDED AT §82 BY BROWSER QA — THE PRESENCE OF A
  // REASON IS NOT THE SAME QUESTION AS WHETHER THE DOCUMENT IS REFUSED NOW.**
  // Until §82 nothing could leave `Rejected`, so the two questions had the same
  // answer and the field check stood in for the state check. `t_supplierdoc_
  // submit` now accepts `Rejected` as a `from` — and the store DELIBERATELY
  // keeps the refusal fields, because a refusal was a recorded act and a
  // correction does not un-happen it. The result, caught on the built bundle
  // and invisible to the suite: a re-declared document sat in `Under Review`
  // with a red block reading "REFUSED" above it, while the page banner (which
  // IS status-gated) had already dropped its count. Two parts of one page
  // disagreeing about the same document.
  //
  // The stored fields stay; only this render is gated. Showing a supplier a
  // present-tense refusal for a document they have already corrected is the
  // false-affordance class facing backwards — a stale accusation instead of a
  // false promise.
  if (doc.status !== 'Rejected') return null;
  return (
    <div
      className="mt-1.5 border-l-2 border-l-critical pl-3 py-1 max-w-[22rem]"
      data-testid={`doc-refusal-${doc.id}`}
    >
      <CellSub>
        <span className="text-critical">{t('supplierDocuments.refusal.label')}</span>{' '}
        {formatDate(doc.rejectedAt)}{' '}
        {/* ⚠️ **PER VALUE, NOT PER ROW — AND THIS SURFACE IS WHY.** `doc-012` is
            SEEDED with a refusal and can be refused AGAIN (`t_supplierdoc_submit`
            takes `Rejected` as a `from`), so the same id renders a shifted
            fixture literal one minute and a wall-clock instant the next. Anything
            keyed on the id would keep saying "seeded" after the second refusal,
            which is precisely the row this disclosure exists for. The marker asks
            about the STRING and renders nothing when it is the seeded one. */}
        <SessionStampMarker
          documentId={doc.id}
          field="rejectedAt"
          value={doc.rejectedAt}
        />
      </CellSub>
      {/* i18n-defer: mock/sample data (fixture refusal text) */}
      <CellSub>
        {t('supplierDocuments.refusal.reasonLabel')}: {doc.rejectionReason}
      </CellSub>
      {doc.rejectedBy?.kind === 'UNATTRIBUTED' && (
        <CellSub className="italic">{t('supplierDocuments.refusal.unattributed')}</CellSub>
      )}
    </div>
  );
};

// Filter chip ids are the CANONICAL EN category values matched against
// `d.category` (stored-as-data) — never translate the `id`. Only the display
// label localizes; the option list is built in-component so `t` is available.
const CATEGORY_FILTERS: { id: CategoryFilter; labelKey: string }[] = [
  { id: 'All', labelKey: 'supplierDocuments.category.all' },
  { id: 'Halal Compliance', labelKey: 'supplierDocuments.category.halal' },
  { id: 'BPOM Regulatory', labelKey: 'supplierDocuments.category.bpom' },
  { id: 'Tax & Legal', labelKey: 'supplierDocuments.category.taxLegal' },
  { id: 'Quality', labelKey: 'supplierDocuments.category.quality' },
  { id: 'Contract', labelKey: 'supplierDocuments.category.contract' },
];

// ⚠️ The page-local `daysUntil` is GONE. It read `Date.now()` inside a pure-
// looking helper, which made this page's expiry story untestable and — more to
// the point — made it ONE OF THREE different answers to "what day is it?".
// `services/data/dayProjection` is now the only one; `now` is captured once
// below and injected, so this page and `SupplierCertsExpiringWidget` cannot
// drift apart again.


type PanelMode = 'closed' | 'new' | 'upload-existing' | 'view';

const SupplierDocuments: React.FC = () => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const { toast } = useToast();
  const { identity } = useCurrentIdentity();
  const { supplierId, supplierName } = identity;
  const docsCrumb = [
    t('supplierDocuments.crumb.myDocuments'),
  ];
  const categoryOptions = CATEGORY_FILTERS.map((c) => ({
    id: c.id,
    label: t(c.labelKey),
  }));
  const docsQuery = useDocuments();
  const docs = docsQuery.data?.items ?? [];
  // ONE clock read for the whole page, captured once so every expiry figure on
  // screen is answered against the SAME instant. Deps are empty deliberately:
  // a re-render must not silently move the day under a rendered count.
  // (`BuyerCompliance` is the precedent.)
  const nowIso = TODAY;
  const [filterCat, setFilterCat] = useState<CategoryFilter>('All');
  const [search, setSearch] = useState('');
  const [panelMode, setPanelMode] = useState<PanelMode>('closed');
  const [activeDoc, setActiveDoc] = useState<SupplierDocument | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [form, setForm] = useState<DeclarationForm>(EMPTY_FORM);
  // §82 — the two supply verbs. `_declare` mints a document nobody asked for;
  // `_submit` answers a slot the buyer opened, or re-answers after a refusal.
  const declare = useSupplierDocumentDeclare();
  const submit = useSupplierDocumentSubmit();
  // ⚠️ ONE NOTICE PER VERB, IN THAT VERB'S OWN SLOT (§76). The two supply verbs
  // are never co-reachable on one panel — `activeDoc` decides which is in play —
  // so the panel footer carries whichever applies and never both.
  const declareAvailability = useVerbAvailability('supplierdoc:upload');
  const submitAvailability = useVerbAvailability('supplierdoc:submit');
  const supplyAvailability = activeDoc ? submitAvailability : declareAvailability;
  const pending = declare.isPending || submit.isPending;
  // I3.4 (FORK-1=(c)) — the halal-renewal walkthrough. Read-only guidance; a
  // shared SIHALAL path (no per-document branching; the `certBasis` this once
  // named was deleted at D-A). Opened from the
  // per-document "Renew" action AND the standalone "How to renew" entry.
  const [lessonOpen, setLessonOpen] = useState(false);
  const lessonSteps = useMemo(
    () =>
      HALAL_RENEWAL_STEPS.map((s) => ({
        id: s.id,
        icon: s.icon,
        title: t(s.titleKey),
        body: t(s.bodyKey),
      })),
    [t],
  );

  const filtered = useMemo(
    () =>
      docs.filter((d) => {
        const matchCat = filterCat === 'All' || d.category === filterCat;
        const q = search.toLowerCase();
        const matchSearch =
          q === '' ||
          d.name.toLowerCase().includes(q) ||
          d.issuedBy.toLowerCase().includes(q);
        return matchCat && matchSearch;
      }),
    [filterCat, search, docs],
  );

  const expiringSoon = useMemo(
    () => docs.filter((d) => documentExpiry(d, nowIso) === 'expiring'),
    [docs, nowIso],
  );
  const expired = useMemo(
    () => docs.filter((d) => documentExpiry(d, nowIso) === 'expired'),
    [docs, nowIso],
  );
  const awaitingUpload = useMemo(
    () => docs.filter((d) => d.status === 'Awaiting Upload'),
    [docs],
  );
  // The stored state, not a projection — a refusal is an act that was recorded,
  // so unlike expiry it is never derived from the clock.
  const refused = useMemo(() => docs.filter((d) => d.status === 'Rejected'), [docs]);
  // ⚠️ **COMPUTED, AND IT IS THE THIRD KPI IN THIS BLOCK RATHER THAN THE
  // FIRST.** `expiringSoon` and `expired` above have read the clock since the
  // projection landed; this one still asked the STORED field, so the same
  // row could in principle be counted Valid here and expiring three lines up.
  // It never was — the fixture agrees — but two counters over one population
  // answering to two sources is the divergence, not the disagreement it has
  // not yet produced. `awaitingUpload` and `refused` below stay STORED on
  // purpose: those are lifecycle facts and no clock has an opinion on them.
  const validCount = useMemo(
    () => docs.filter((d) => documentDisplayState(d, nowIso) === 'valid').length,
    [docs, nowIso],
  );

  // Same instant as every expiry figure above — a page that says "as of <date>"
  // must mean the date it actually reckoned against, not a second clock read.
  const today = formatDate(nowIso);

  const openUploadFor = (doc: SupplierDocument) => {
    setActiveDoc(doc);
    setUploaded(false);
    // Pre-fill from what the document already carries. A re-declaration after a
    // refusal is a CORRECTION, and making the supplier retype five correct
    // fields to fix one wrong one is how a remedy becomes a deterrent.
    setForm(
      doc.declaration
        ? {
            certType: doc.declaration.certType,
            certNumber: doc.declaration.certNumber,
            issuer: doc.declaration.issuer,
            issuedOn: doc.declaration.issuedOn,
            expiresOn: doc.declaration.expiresOn ?? '',
            scopeText: doc.declaration.scopeText,
          }
        : EMPTY_FORM,
    );
    setPanelMode('upload-existing');
  };

  const openNewUpload = () => {
    setActiveDoc(null);
    setUploaded(false);
    setForm(EMPTY_FORM);
    setPanelMode('new');
  };

  const closePanel = () => {
    setPanelMode('closed');
    setActiveDoc(null);
    setUploaded(false);
    setForm(EMPTY_FORM);
  };

  /**
   * ⚠️ **THIS FUNCTION USED TO SET A BOOLEAN AND FIRE A SUCCESS TOAST.** No
   * dispatch, no store, no file — while the panel it sat behind advertised
   * "PDF, JPG, PNG · Max 20 MB" and a drop zone whose `onDrop` called it and
   * never read `e.dataTransfer`. Three entry points reached it, and the toast
   * said "Document uploaded". §82 · `docs/findings.md`.
   *
   * ⚠️ **AND THE OUTCOME IS READ FROM THE RESULT, NOT ASSUMED FROM THE CALL.**
   * `CommandResult.status` can be `failed`, and a refusal that renders as a
   * success is the same defect one layer down.
   */
  const recordDeclaration = async () => {
    if (!declarationComplete(form)) return;
    const vars = {
      certType: form.certType,
      certNumber: form.certNumber.trim(),
      issuer: form.issuer.trim(),
      issuedOn: form.issuedOn,
      // Blank means the certificate HAS no expiry (BPJPH, GR 42/2024) — `null`
      // is the answer, never a guessed date and never today.
      expiresOn: form.expiresOn === '' ? null : form.expiresOn,
      scopeText: form.scopeText.trim(),
    };
    const result = activeDoc
      ? await submit.mutateAsync({ ...vars, docId: activeDoc.id })
      : await declare.mutateAsync({ ...vars, supplierId: supplierId ?? '' });
    if (result.status === 'failed') {
      toast({
        variant: 'error',
        title: t('supplierDocuments.toast.declineFailed.title'),
        description: refusalText(result.reason) ?? result.reason,
      });
      return;
    }
    setUploaded(true);
    toast({
      variant: 'success',
      title: t('supplierDocuments.toast.declared.title'),
      description: t('supplierDocuments.toast.declared.desc'),
    });
  };

  const panelTitle =
    panelMode === 'new'
      ? t('supplierDocuments.panel.newTitle')
      : panelMode === 'upload-existing' && activeDoc
        ? t('supplierDocuments.panel.declareTitle', {
            name: activeDoc.name.split('—')[0].trim(),
          })
        : '';

  const columns: Column<SupplierDocument>[] = [
    {
      id: 'document',
      header: t('supplierDocuments.table.document'),
      kind: 'text',
      cell: (doc) => (
        <>
          <div className="max-w-[18rem]">{doc.name}</div>
          {doc.notes && (
            <CellSub tone="warning" className="max-w-[18rem]">
              ⚠ {doc.notes}
            </CellSub>
          )}
          <RefusalBlock doc={doc} />
          {/* SUP-1 - when Paragon confirmed it. The date only: the
              person is the buyer's record, not the supplier's. */}
          {doc.verifiedAt && (
            <CellSub data-testid={`doc-confirmed-on-${doc.id}`}>
              {t('supplierDocuments.confirmedOn')} {formatDate(doc.verifiedAt)}{' '}
              <SessionStampMarker documentId={doc.id} field="verifiedAt" value={doc.verifiedAt} />
            </CellSub>
          )}
          <CellSub>{t('supplierDocuments.row.linked', { value: doc.linkedTo })}</CellSub>
        </>
      ),
    },
    {
      id: 'category',
      header: t('supplierDocuments.table.category'),
      kind: 'status',
      // Category pill renders the canonical EN token: no central
      // category-label map yet (filter-vs-pill split, see fragment header).
      cell: (doc) => <StatusPill variant="neutral">{doc.category}</StatusPill>,
    },
    {
      id: 'issuedBy',
      header: t('supplierDocuments.table.issuedBy'),
      kind: 'text',
      className: 'max-w-[12rem]',
      cell: (doc) => doc.issuedBy,
    },
    {
      id: 'issued',
      header: t('supplierDocuments.table.issued'),
      kind: 'date',
      cell: (doc) => <Data>{formatDate(doc.issuedDate)}</Data>,
    },
    {
      id: 'expiry',
      header: t('supplierDocuments.table.expiry'),
      kind: 'date',
      cell: (doc) => {
        const days = daysUntil(doc.expiryDate, nowIso);
        const expiryTone =
          days === null ? 'neutral' : days <= 0 ? 'critical' : days <= 90 ? 'warning' : 'neutral';
        return doc.expiryDate ? (
          <>
            <Data
              as="div"
              className={days !== null && days <= 90 ? 'text-warning-hover' : undefined}
            >
              {formatDate(doc.expiryDate)}
            </Data>
            {days !== null && (
              <CellSub tone={expiryTone}>
                {days > 0
                  ? t('supplierDocuments.expiry.remaining', { count: days })
                  : t('supplierDocuments.expiry.expiredAgo', {
                      count: Math.abs(days),
                    })}
              </CellSub>
            )}
          </>
        ) : (
          t('supplierDocuments.expiry.none')
        );
      },
    },
    {
      id: 'status',
      header: t('supplierDocuments.table.status'),
      kind: 'status',
      cell: (doc) => {
        // ONE decision per row, read by the badge below. Every surface
        // that renders this document calls the SAME function with the
        // same instant, which is what stops the page and the dashboard
        // disagreeing about a certificate the way they could before.
        const display = documentDisplayState(doc, nowIso);
        // ⚠️ **THE BADGE IS COMPUTED AND THE LABEL COMES FROM A
        // KEY, NOT FROM THE ROW.** It rendered `doc.status`
        // verbatim and leaned on `StatusPill` to localize the
        // canonical token; that still works, and is exactly why
        // the stored read was invisible — EN output was
        // identical either way. Resolving `t(…)` here says
        // WHICH state was decided, and by what.
        return (
          <StatusPill variant={DISPLAY_STATE_TONE[display]}>
            {display === 'under-review' ? (
              <span className="inline-flex items-center gap-1">
                <RefreshCw size={10} />
                {t(DISPLAY_STATE_LABEL_KEY[display])}
              </span>
            ) : (
              t(DISPLAY_STATE_LABEL_KEY[display])
            )}
          </StatusPill>
        );
      },
    },
    {
      id: 'version',
      header: t('supplierDocuments.table.version'),
      kind: 'id',
      cell: (doc) => <Data>{doc.version}</Data>,
    },
    {
      id: 'actions',
      header: t('supplierDocuments.table.actions'),
      kind: 'actions',
      cell: (doc) => {
        const days = daysUntil(doc.expiryDate, nowIso);
        return (
          <div className="inline-flex gap-1.5">
            {/* ⚠️ **THE REFUSED ROW GAINS A REMEDY, AND §80's REASON
                FOR WITHHOLDING ONE IS THE REASON IT CAN NOW HAVE IT.**
                That batch wrote: *"a resubmit button here would be a
                forward promise with no handler: `supplierdoc:upload`
                is unauthored"* (`FORWARD-PROMISE-HAS-NO-HANDLER-01`).
                The verb exists as of §82, so the promise has a
                handler — `t_supplierdoc_submit` accepts `Rejected` as
                a `from` precisely so a refusal is not a dead end. */}
            {doc.status === 'Awaiting Upload' || doc.status === 'Rejected' ? (
              <Button
                variant="outline"
                icon={Upload}
                onClick={() => openUploadFor(doc)}
              >
                {doc.status === 'Rejected'
                  ? t('supplierDocuments.action.redeclare')
                  : t('supplierDocuments.action.declare')}
              </Button>
            ) : (
              <Button
                variant="secondary"
                icon={Eye}
                onClick={() =>
                  toast({
                    title: t('supplierDocuments.toast.downloading', {
                      name: doc.name,
                    }),
                  })
                }
              >
                {t('supplierDocuments.action.view')}
              </Button>
            )}
            {/* ⚠️ `180` STOOD HERE AS A LITERAL, a fourth clock
                opinion on one page. Same window, one declaration. */}
            {doc.expiryDate &&
              days !== null &&
              days <= DOCUMENT_EXPIRING_WINDOW_DAYS && (
              <Button
                variant="secondary"
                onClick={() => setLessonOpen(true)}
              >
                {t('supplierDocuments.action.renew')}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  if (!supplierId) return <NoSupplierIdentity />;
  if (docsQuery.isPending) return <LoadingState breadcrumb={docsCrumb} />;
  if (docsQuery.isError)
    return (
      <ErrorState
        breadcrumb={docsCrumb}
        error={docsQuery.error}
        onRetry={() => docsQuery.refetch()}
      />
    );
  if (docs.length === 0)
    return (
      <EmptyState
        breadcrumb={docsCrumb}
        title={t('supplierDocuments.empty.title')}
        subtitle={t('supplierDocuments.empty.subtitle', {
          name: supplierName ?? t('supplierDocuments.empty.supplierFallback'),
        })}
        message={t('supplierDocuments.empty.message')}
      />
    );

  return (
    <ListPage
      breadcrumb={docsCrumb}
      title={t('supplierDocuments.header.title')}
      subtitle={t('supplierDocuments.header.subtitle', {
        name: supplierName ?? t('supplierDocuments.common.supplierFallback'),
      })}
      actions={
        <BulkActionsBar
          primary={{
            label: t('supplierDocuments.action.declareCert'),
            icon: Upload,
            onClick: openNewUpload,
          }}
        />
      }
      meta={
        <>
            {docs.length === 1
              ? t('supplierDocuments.meta.summary.one', { count: docs.length, date: today })
              : t('supplierDocuments.meta.summary.other', { count: docs.length, date: today })}
            {/* D-CENSUS-8 — `supplierDocuments` is an F0.4 flow that is REGISTERED but not
                a wired CommandTarget, so it derives SIMULATED and shows the feed axis
                only. Certificate validity here is authored, not verified. */}
            <ProvenanceMarker capability="supplierDocuments" className="ml-3 align-middle" />
        </>
      }
      notices={
        refused.length + expired.length + expiringSoon.length + awaitingUpload.length > 0 ? (
          <>
            {refused.length > 0 && (
              <div
                className="bg-critical-soft border-l-2 border-critical rounded px-4 py-3 text-sm text-critical flex items-start gap-2"
                data-testid="doc-refused-banner"
              >
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <div>
                  <strong>
                    {refused.length === 1
                      ? t('supplierDocuments.alert.refused.one', { count: refused.length })
                      : t('supplierDocuments.alert.refused.other', { count: refused.length })}{' '}
                  </strong>
                  {/* i18n-defer: mock/sample data (fixture document names) */}
                  {refused.map((d) => d.name.split('—')[0].trim()).join(' · ')}
                </div>
              </div>
            )}
            {expired.length > 0 && (
              <div className="bg-critical-soft border-l-2 border-critical rounded px-4 py-3 text-sm text-critical flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <div>
                  <strong>
                    {expired.length === 1
                      ? t('supplierDocuments.alert.expired.one', { count: expired.length })
                      : t('supplierDocuments.alert.expired.other', { count: expired.length })}{' '}
                  </strong>
                  {/* i18n-defer: mock/sample data (fixture document names) */}
                  {expired.map((d) => d.name.split('—')[0].trim()).join(' · ')}
                </div>
              </div>
            )}
            {expiringSoon.length > 0 && (
              <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 text-sm text-warning-hover flex items-start gap-2">
                <Clock size={14} className="shrink-0 mt-0.5" />
                <div>
                  <strong>
                    {expiringSoon.length === 1
                      ? t('supplierDocuments.alert.expiring.one', { count: expiringSoon.length })
                      : t('supplierDocuments.alert.expiring.other', { count: expiringSoon.length })}{' '}
                  </strong>
                  {/* i18n-defer: mock/sample data (fixture document names) */}
                  {expiringSoon.map((d) => d.name.split('—')[0].trim()).join(' · ')}
                </div>
              </div>
            )}
            {awaitingUpload.length > 0 && (
              <div className="bg-bg-hover border-l-2 border-border-input rounded px-4 py-3 text-sm text-text-secondary flex items-start gap-2">
                <UploadCloud size={14} className="shrink-0 mt-0.5 text-text-tertiary" />
                <div>
                  <strong className="text-text-primary">
                    {awaitingUpload.length === 1
                      ? t('supplierDocuments.alert.awaiting.one', { count: awaitingUpload.length })
                      : t('supplierDocuments.alert.awaiting.other', { count: awaitingUpload.length })}{' '}
                  </strong>
                  {/* i18n-defer: mock/sample data (fixture linked-to refs) */}
                  {awaitingUpload.map((d) => d.linkedTo).join(' · ')}
                </div>
              </div>
            )}
          </>
        ) : undefined
      }
      kpiColumns={5}
      kpis={
        <>
          <KpiCard
            eyebrow={t('supplierDocuments.kpi.total.eyebrow')}
            value={docs.length.toString()}
            subtitle={t('supplierDocuments.kpi.total.subtitle')}
            icon={Files}
          />
          <KpiCard
            eyebrow={t('supplierDocuments.kpi.valid.eyebrow')}
            value={validCount.toString()}
            subtitle={t('supplierDocuments.kpi.valid.subtitle')}
            icon={CheckCircle2}
          />
          <KpiCard
            eyebrow={t('supplierDocuments.kpi.expiring.eyebrow')}
            value={expiringSoon.length.toString()}
            subtitle={
              <span className="text-warning-hover">
                {t('supplierDocuments.kpi.expiring.subtitle')}
              </span>
            }
            icon={Clock}
          />
          <KpiCard
            eyebrow={t('supplierDocuments.kpi.expired.eyebrow')}
            value={expired.length.toString()}
            subtitle={
              <span className="text-critical">
                {t('supplierDocuments.kpi.expired.subtitle')}
              </span>
            }
            icon={AlertTriangle}
          />
          <KpiCard
            eyebrow={t('supplierDocuments.kpi.needsAction.eyebrow')}
            value={awaitingUpload.length.toString()}
            subtitle={t('supplierDocuments.kpi.needsAction.subtitle')}
            icon={UploadCloud}
          />
        </>
      }
      filters={
        <>
          <FilterChipsBar<CategoryFilter>
            options={categoryOptions}
            value={filterCat}
            onChange={setFilterCat}
          />
          <span className="text-meta text-text-tertiary">
            {t('supplierDocuments.filter.count', {
              shown: filtered.length,
              total: docs.length,
            })}
          </span>
        </>
      }
      search={
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('supplierDocuments.search.placeholder')}
        />
      }
    >
      <DataTable<SupplierDocument>
        className="mb-6"
        rows={filtered}
        rowKey={(doc) => doc.id}
        empty={t('supplierDocuments.table.empty')}
        columns={columns}
      />

      <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 text-sm text-text-secondary flex items-start gap-2">
        <FileText size={14} className="text-warning-hover shrink-0 mt-0.5" />
        <div>
          <strong className="text-warning-hover">
            {t('supplierDocuments.bpjph.title')}
          </strong>{' '}
          {t('supplierDocuments.bpjph.body')}{' '}
          <a
            href="https://halal.go.id"
            target="_blank"
            rel="noopener noreferrer"
            className="text-warning-hover font-semibold inline-flex items-center gap-1 hover:underline"
          >
            halal.go.id
            <ExternalLink size={11} />
          </a>
          {/* Deadline-floor discoverable entry (I3.4): findable without being
              mid-action on a specific document. Opens the read-only walkthrough. */}
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setLessonOpen(true)}
              className="inline-flex items-center gap-1.5 text-action-hover font-semibold hover:underline"
            >
              <BookOpen size={14} aria-hidden="true" />
              {t('learn.halalRenewal.entry')}
            </button>
          </div>
        </div>
      </div>

      {/* I3.4 — the halal-renewal walkthrough, in a read-only SidePanel. No footer
          actions here: GuidedLesson owns its own Back/Next/Done nav and has NO
          submit path, so it can never look like a live renewal submission. */}
      <SidePanel
        open={lessonOpen}
        onClose={() => setLessonOpen(false)}
        title={t('learn.halalRenewal.title')}
      >
        <GuidedLesson
          steps={lessonSteps}
          labels={{
            back: t('learn.halalRenewal.nav.back'),
            next: t('learn.halalRenewal.nav.next'),
            done: t('learn.halalRenewal.nav.done'),
            step: (current, total) =>
              t('learn.halalRenewal.nav.step', { current, total }),
          }}
          disclaimer={t('learn.halalRenewal.disclaimer')}
          source={{
            href: HALAL_RENEWAL_SOURCE.href,
            label: t(HALAL_RENEWAL_SOURCE.labelKey),
          }}
          onDone={() => setLessonOpen(false)}
        />
      </SidePanel>

      <SidePanel
        open={panelMode !== 'closed'}
        onClose={closePanel}
        title={panelTitle}
        footerActions={
          <>
            <Button variant="secondary" onClick={closePanel}>
              {uploaded
                ? t('supplierDocuments.action.close')
                : t('supplierDocuments.action.cancel')}
            </Button>
            {!uploaded &&
              (supplyAvailability.kind === 'held' ? (
                <Button
                  variant="outline"
                  icon={Upload}
                  disabled={!declarationComplete(form) || pending}
                  onClick={() => {
                    void recordDeclaration();
                  }}
                >
                  {t('supplierDocuments.action.submit')}
                </Button>
              ) : (
                // The seat may READ this panel and not hold the verb — a
                // commercial or fulfilment lane, once a supplier seat is
                // narrowed. Render the wait with its owner, never an absent
                // affordance (the handoff constraint).
                <HandoffNotice
                  availability={supplyAvailability}
                  testId="handoff-supplierdoc-supply"
                />
              ))}
          </>
        }
      >
        <div className="space-y-5">
          {activeDoc && (
            <section>
              <SectionHeading level="group" as="h3" className="mb-2">
                {t('supplierDocuments.panel.document')}
              </SectionHeading>
              {/* i18n-defer: mock/sample data (fixture document name) */}
              <div className="text-sm font-semibold text-text-primary">
                {activeDoc.name}
              </div>
              <div className="text-xs text-text-tertiary mt-0.5">
                {t('supplierDocuments.row.linked', { value: activeDoc.linkedTo })}
              </div>
              {activeDoc.notes && (
                <div className="mt-2 bg-warning-soft border-l-2 border-warning rounded px-3 py-2 text-xs text-warning-hover">
                  {activeDoc.notes}
                </div>
              )}
            </section>
          )}

          {!uploaded ? (
            <>
              {/* THE HONEST SENTENCE, BEFORE THE FORM AND NOT AFTER IT. A
                  supplier must know what this act is while deciding whether to
                  perform it - a disclaimer under the button is a receipt, not a
                  notice. The claim is precisely bounded: the platform CAN read a
                  file (XlsxImportPanel parses a workbook one lane over); what it
                  has no seam for is KEEPING or FORWARDING one. */}
              <section
                className="bg-bg-hover border-l-2 border-action rounded px-4 py-3"
                data-testid="declaration-nofile-notice"
              >
                <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <FileText size={14} className="text-action shrink-0" aria-hidden="true" />
                  {t('supplierDocuments.panel.noFile.title')}
                </div>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  {t('supplierDocuments.panel.noFile.body')}
                </p>
              </section>

              <section className="space-y-4">
                <SectionHeading level="group" as="h3">
                  {t('supplierDocuments.panel.certDetails')}
                </SectionHeading>

                <label className="block">
                  <span className={FIELD_LABEL}>
                    {t('supplierDocuments.field.certType')}
                  </span>
                  <select
                    className={FIELD_INPUT}
                    data-testid="declare-certType"
                    value={form.certType}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, certType: e.target.value as CertType }))
                    }
                  >
                    {CERT_TYPES.map((ct) => (
                      <option key={ct} value={ct}>
                        {t(certTypeLabelKey(ct))}
                      </option>
                    ))}
                  </select>
                  <span className={FIELD_HINT}>
                    {t('supplierDocuments.field.certType.hint')}
                  </span>
                </label>

                <label className="block">
                  <span className={FIELD_LABEL}>
                    {t('supplierDocuments.field.certNumber')}
                  </span>
                  <input
                    className={FIELD_INPUT}
                    data-testid="declare-certNumber"
                    value={form.certNumber}
                    onChange={(e) => setForm((f) => ({ ...f, certNumber: e.target.value }))}
                  />
                </label>

                <label className="block">
                  <span className={FIELD_LABEL}>
                    {t('supplierDocuments.field.issuer')}
                  </span>
                  <input
                    className={FIELD_INPUT}
                    data-testid="declare-issuer"
                    value={form.issuer}
                    onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))}
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className={FIELD_LABEL}>
                      {t('supplierDocuments.field.issuedOn')}
                    </span>
                    <input
                      type="date"
                      className={FIELD_INPUT}
                      data-testid="declare-issuedOn"
                      value={form.issuedOn}
                      onChange={(e) => setForm((f) => ({ ...f, issuedOn: e.target.value }))}
                    />
                  </label>
                  <label className="block">
                    <span className={FIELD_LABEL}>
                      {t('supplierDocuments.field.expiresOn')}
                    </span>
                    <input
                      type="date"
                      className={FIELD_INPUT}
                      data-testid="declare-expiresOn"
                      value={form.expiresOn}
                      onChange={(e) => setForm((f) => ({ ...f, expiresOn: e.target.value }))}
                    />
                  </label>
                </div>
                <span className={FIELD_HINT}>
                  {t('supplierDocuments.field.expiresOn.hint')}
                </span>

                <label className="block">
                  <span className={FIELD_LABEL}>
                    {t('supplierDocuments.field.scopeText')}
                  </span>
                  <textarea
                    rows={3}
                    className={FIELD_INPUT}
                    data-testid="declare-scopeText"
                    placeholder={t('supplierDocuments.field.scopeText.placeholder')}
                    value={form.scopeText}
                    onChange={(e) => setForm((f) => ({ ...f, scopeText: e.target.value }))}
                  />
                  <span className={FIELD_HINT}>
                    {t('supplierDocuments.field.scopeText.hint')}
                  </span>
                </label>

                {/* C10 5.2 / D-ID-3 - the surface says WHOSE act this is recorded
                    as, BEFORE the act, because it cannot name a person. */}
                <p
                  className="text-xs text-text-tertiary"
                  data-testid="declaration-attribution"
                >
                  {t('supplierDocuments.panel.attribution')}
                </p>
                {!declarationComplete(form) && (
                  <p
                    className="text-xs text-text-tertiary"
                    data-testid="declaration-incomplete"
                  >
                    {t('supplierDocuments.panel.incomplete')}
                  </p>
                )}
              </section>
            </>
          ) : (
            <section
              className="bg-success-soft border-l-2 border-success rounded px-4 py-3 text-sm text-success font-semibold flex items-center gap-2"
              data-testid="declaration-recorded"
            >
              <CheckCircle2 size={16} />
              {t('supplierDocuments.panel.declaredMsg')}
            </section>
          )}
        </div>
      </SidePanel>
    </ListPage>
  );
};

export default SupplierDocuments;
