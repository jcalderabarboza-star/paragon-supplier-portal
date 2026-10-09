import React, { useMemo, useRef, useState } from 'react';
import {
  ClipboardList,
  FileText,
  Clock,
  CheckCircle2,
  ArrowRight,
  ShoppingCart,
  AlertTriangle,
  Plus,
  Download,
  FileSpreadsheet,
  ChevronRight,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import Data from '../components/ui-v2/Data';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
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
import { useTranslation } from 'react-i18next';
import { personLabel } from '../services/identity/personLabel';
import { useEnumLabel } from '../hooks/useEnumLabel';
import { useRequisitions } from '../services/query/hooks';
import {
  usePurchaseRequisitionCreate,
  useRequisitionApprove,
  useRequisitionReject,
  useRequisitionSubmit,
  useRequisitionRevise,
  useRequisitionBatch,
} from '../services/query/commandHooks';
import { useVerbAvailabilities, useNextAct } from '../hooks/useVerbAvailability';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import ActorPreActNotice from '../components/ui-v2/ActorPreActNotice';
import { namedSeatRefusalKey } from '../lib/namedSeatRefusal';
import NextActLine from '../components/ui-v2/NextActLine';
import { DataError } from '../services/data/types';
import { formatNumber, formatIDR, formatDate } from '../lib/format';
import { normalizeQty, type QtyRefusalReason } from '../lib/localeNumber';
import { useNavigate } from 'react-router-dom';
import type { PurchaseRequisition, PRStatus } from '../services/data/types';
import { buildNewPrPayload } from './requisitions/prCreatePayload';
import { BULK_VERB_OF_STATUS, isBulkEligible, isSetInSap, prOrigin, type SetInSapField } from './requisitions/prFieldDisplay';
import { ROLE_LABEL_KEY } from '../services/transitions/handoff';
import type { CommandResult } from '../services/data/types';
import type { ActorAttribution, UnattributedReason } from '../lib/enforcement';
// GL-1 - the glossary destination for this surface's refusals.
import GlossaryTermChip from '../components/ui-v2/GlossaryTermChip';
import { useRefusalText, useDataErrorText } from '../hooks/useRefusalText';

// ── CP-0 · W1 · PR-2b — the New-PR quantity is PARSED, never coerced ─────────
// `Number(form.qty)` behind a `type="number"` field read "4.500" as 4.5, so a
// buyer authoring 4,500 KG minted a Draft PR for 4.5 KG — silently, and with a
// real audited document number attached. The field is now
// `type="text" inputmode="decimal"` (ruling 6.2) and routes through the ONE
// legal parser with NO convention hint, so a token legal under both readings
// refuses instead of being guessed.
//
// The type flip is what makes the parse non-optional rather than merely better:
// `type="number"` filtered the input space to what `Number` happens to accept,
// so a comma could never arrive. On a text field "4,500" reaches the handler,
// `Number` yields NaN, and NaN survives the whole spine — the dispatcher's
// requiredFields check tests emptiness (NaN is not empty), the command target
// accepts it (`typeof NaN === 'number'`), and `formatNumber(NaN)` renders a
// tidy em-dash. A corrupted quantity would look like a formatting nicety.
// Hence: the flip and the parse ship in one commit, never staged.
//
// EXHAUSTIVE, not Partial (the 2a discipline): widening QtyRefusalReason must
// break the build here, not render a blank refusal to a buyer.
const QTY_REFUSAL_KEY: Record<QtyRefusalReason, string> = {
  EMPTY_QTY: 'requisitions.new.qty.refused.empty',
  NOT_NUMERIC: 'requisitions.new.qty.refused.notNumeric',
  AMBIGUOUS_QTY: 'requisitions.new.qty.refused.ambiguous',
};

const STATUS_VARIANT: Record<
  PRStatus,
  'success' | 'warning' | 'danger' | 'info' | 'neutral'
> = {
  Draft: 'neutral',
  'Pending Approval': 'warning',
  Approved: 'success',
  'Sourcing Event': 'neutral',
  'PO Created': 'success',
  Rejected: 'danger',
};

type GroupTab = 'all' | 'Draft' | 'Pending Approval' | 'Approved' | 'Sourcing Event' | 'PO Created';

// ⚠️ §68 — HOW AN ATTRIBUTION READS, AND WHY IT IS A TOTAL RECORD OVER THE
// CLOSED UNION. `UNATTRIBUTED_REASONS` has exactly two members and no `SYSTEM`
// one, deliberately — *"'the system did it' is the comfortable label that makes
// an unattributed act look answered"* (C10 §6.4). Keying the copy off a
// `Record<UnattributedReason, string>` means the day a third reason is added
// the BUILD says so, rather than a surface quietly rendering a raw enum token.
//
// The two are NOT interchangeable and the copy must not merge them:
// NO_PERSON_IN_SESSION is a MISSING capability, IDENTITY_PROVIDER_UNAVAILABLE
// is a FAILING one, and collapsing them would hide the day the first was fixed.
const UNATTRIBUTED_KEY: Record<UnattributedReason, string> = {
  NO_PERSON_IN_SESSION: 'requisitions.panel.unattributed.noPerson',
  IDENTITY_PROVIDER_UNAVAILABLE: 'requisitions.panel.unattributed.idpDown',
};

const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
const labelClass =
  'block text-label text-text-tertiary uppercase mb-1';

const COST_CENTERS = [
  'CC-RD-001 — R&D',
  'CC-PKG-002 — Packaging',
  'CC-MFG-001 — Manufacturing',
  'CC-SC-001 — Supply Chain',
  'CC-RD-003 — Perfumer',
];

const UOM_OPTIONS = ['KG', 'L', 'PCS', 'MT', 'BOX'];
const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];

const ProcurementFlow: React.FC = () => {
  const { t } = useTranslation();
  // Calm outline register (DP-2/DP-3): the pipeline STAGES carry no state, so
  // they go neutral — the diagram's only real decision is the source-check fork,
  // so semantic colour is reserved for its two outcomes (PO = source found;
  // Sourcing Event = the no-source branch). Quiet soft-tint + hue-border chips,
  // no solid saturated fills, mirroring the StatusPill grammar.
  const steps: { label: string; sub: string; tone: 'neutral' | 'success' | 'warning' }[] = [
    { label: t('requisitions.flow.createPr.label'), sub: t('requisitions.flow.createPr.sub'), tone: 'neutral' },
    { label: t('requisitions.flow.approval.label'), sub: t('requisitions.flow.approval.sub'), tone: 'neutral' },
    { label: t('requisitions.flow.sourceCheck.label'), sub: t('requisitions.flow.sourceCheck.sub'), tone: 'neutral' },
    { label: t('requisitions.flow.createPo.label'), sub: t('requisitions.flow.createPo.sub'), tone: 'success' },
    { label: t('requisitions.flow.sourcingEvent.label'), sub: t('requisitions.flow.sourcingEvent.sub'), tone: 'warning' },
  ];
  const TONE: Record<string, string> = {
    neutral: 'bg-bg-hover text-text-secondary border-border-subtle',
    success: 'bg-success-soft text-success border-success/30',
    warning: 'bg-warning-soft text-warning-hover border-warning/30',
  };
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg px-5 py-4 mb-6">
      <div className="text-label text-text-tertiary uppercase mb-3">
        {t('requisitions.flow.label')}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {steps.map((s, i) => (
          <React.Fragment key={s.label}>
            <div className="flex flex-col items-center min-w-[90px]">
              <span
                className={`px-3 py-1.5 rounded-sm border text-[11px] font-semibold text-center ${TONE[s.tone]}`}
              >
                {s.label}
              </span>
              <span className="text-[10px] text-text-tertiary mt-1 text-center">
                {s.sub}
              </span>
            </div>
            {i < steps.length - 1 && (
              <ArrowRight size={14} className="text-text-tertiary -mt-3" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

interface NewPRForm {
  material: string;
  qty: string;
  uom: string;
  date: string;
  costCenter: string;
  priority: string;
  justification: string;
}

const emptyForm: NewPRForm = {
  material: '',
  qty: '',
  uom: 'KG',
  date: '',
  costCenter: '',
  priority: 'Medium',
  justification: '',
};

const BuyerRequisitions: React.FC = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { identity } = useCurrentIdentity();
  const refusalText = useRefusalText();
  // E2E-1 — approving and rejecting need a named person; that refusal has its
  // own sentence, in the reader's language (the SUP-1 shape).
  const seatRefusal = (reason: string | undefined): string | null => {
    const key = namedSeatRefusalKey(reason);
    return key ? t(key) : null;
  };
  const dataErrorText = useDataErrorText();

  /**
   * A refusal the dispatcher THREW, in the reader's language.
   *
   * ⚠️ **THE TWO VOCABULARIES ARE NOT INTERCHANGEABLE, AND THAT IS WHY THIS
   * EXISTS BESIDE `refusalText` RATHER THAN INSIDE IT.** A RETURNED refusal is
   * `CommandResult.reason`, shaped `KIND:detail`, which `refusalKindOf` splits
   * — `useRefusalText`'s job. A THROWN one is a `DataError` whose message is
   * PROSE, so that split matches nothing and the caller fell through to the raw
   * string: an Indonesian buyer read *"purchaseRequisition 'pr-014' denied for
   * scope"* in English. The CODE is what the glossary is keyed on.
   *
   * ⚠️ **`fallback` IS THE EXPRESSION THIS SITE ALREADY EVALUATED**, passed in
   * rather than chosen here, so the `??` reproduces today's behaviour exactly:
   * a `DataError` whose code the glossary does not own still renders its
   * `message`, and a non-`DataError` still renders the site's own copy.
   * `dataErrorText` returns `null` for anything it does not own — that is the
   * whole reason this could be applied to five sites at once.
   */
  const describeThrown = (e: unknown, fallback: string): string =>
    dataErrorText(e instanceof DataError ? e.code : undefined) ??
    (e instanceof DataError ? e.message : fallback);
  const el = useEnumLabel();
  const REQUISITIONS_CRUMB = [
    t('requisitions.crumb.requisitions'),
  ];
  const [group, setGroup] = useState<GroupTab>('all');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const [selectedRow, setSelectedRow] = useState<PurchaseRequisition | null>(null);
  // The detail panel's mode. `rejecting` swaps the footer for the reason
  // capture — the BuyerInvoices dispute precedent, one lane over.
  const [panelMode, setPanelMode] = useState<'view' | 'rejecting' | 'revising'>('view');
  const [rejectReason, setRejectReason] = useState('');
  const [reviseNote, setReviseNote] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState<NewPRForm>(emptyForm);

  const reqQuery = useRequisitions();
  const prs = reqQuery.data?.items ?? [];
  const createPr = usePurchaseRequisitionCreate();
  const approvePr = useRequisitionApprove();
  const rejectPr = useRequisitionReject();
  const submitPr = useRequisitionSubmit();
  const revisePr = useRequisitionRevise();
  // ── PLN-4 · R3 · BULK SUBMIT / BULK APPROVE ──────────────────────────────
  // Each selected requisition is its own dispatch of its own verb, so the role
  // gate decides per document; the lists refresh once, after the last.
  const batch = useRequisitionBatch();
  const batchRef = useRef(batch);
  batchRef.current = batch;
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [bulkProgress, setBulkProgress] = useState<{ verb: 't_pr_submit' | 't_pr_approve'; done: number; total: number } | null>(null);
  const [bulkResult, setBulkResult] = useState<{
    verb: 't_pr_submit' | 't_pr_approve';
    done: number;
    refused: readonly (readonly [string, number])[];
    total: number;
  } | null>(null);

  // ⚠️ **THE SELECTED ROW IS DERIVED FROM THE LIST, NOT HELD AS A SNAPSHOT.**
  // The row captured on click is the PRE-transition record; after an approve
  // invalidates and the list re-derives, a held snapshot would keep rendering
  // 'Pending Approval' with its Approve button intact over a document that is
  // already Approved — an affordance for an act the dispatcher would now refuse
  // as ILLEGAL_TRANSITION. Re-finding by id makes the panel a view of the store
  // rather than a copy of it. The fallback keeps the panel open for a row that
  // has genuinely left the list.
  const selectedPR = selectedRow
    ? (prs.find((p) => p.id === selectedRow.id) ?? selectedRow)
    : null;

  // WHO ACTS NEXT (S2a). Read off the LIVE row above, never off `selectedRow`'s
  // snapshot — the same reason that fallback exists. `useNextAct` answers `null`
  // for a closed panel, so the call stays unconditional and above every return.
  const nextAct = useNextAct('purchaseRequisition', selectedPR?.status);

  // The seat's authority over this page's five verbs, DERIVED per verb — never
  // authored as a status→owner map. `pr:approve` / `pr:reject` live in
  // `procurement` and `pr:create` / `pr:submit` / `pr:revise` in
  // `requisitioner` (businessRoles.ts), two disjoint bundles, so each side
  // reads "Awaiting <the other>" rather than seeing nothing at all — and the
  // segregation is visible from BOTH sides of the machine instead of being a
  // property of the bundles that nothing exercised.
  //
  // ⚠️ **`create` IS NEW HERE AND IT IS THE ONE THIS PAGE WAS MISSING.** §67/§68
  // guarded the four verbs that act on a document ALREADY SELECTED, and left
  // the one that makes a document unguarded — so a procurement seat, which
  // holds no `pr:create`, saw a live "New PR" button, filled three steps, and
  // was refused at the dispatcher with nothing on screen naming the requester.
  // A page can be covered for every verb it has a row for and still ship a
  // false affordance in its header.
  const {
    create: createAvailability,
    submit: submitAvailability,
    revise: reviseAvailability,
    approve: approveAvailability,
    reject: rejectAvailability,
    sourcing: sourcingAvailability,
  } = useVerbAvailabilities({
    create: 'pr:create',
    submit: 'pr:submit',
    revise: 'pr:revise',
    approve: 'pr:approve',
    reject: 'pr:reject',
    // ⚠️ **`rfq:create`, NOT `pr:source` — AND THE DIFFERENCE IS THE WHOLE
    // AUTHORISATION MODEL OF THIS LANE.** Raising a sourcing event IS creating
    // an RFQ; the requisition's own advance is a CASCADE the dispatcher fires
    // afterwards under the automation grant. Derived, not assumed: `pr:source`
    // is held by NO seat (`SYSTEM_ROLES` → zero holders) and lives in
    // `AUTOMATION_ATOMS`, which is why `/buyer/process-flows` renders it
    // `NO PERSONA MAPPED`. Gating this control on `pr:source` would therefore
    // withhold it from EVERY seat that exists, and the handoff notice would name
    // an owner nobody can be.
    sourcing: 'rfq:create',
  } as const);

  const counts = useMemo(() => {
    const by = (s: PRStatus) => prs.filter((p) => p.status === s).length;
    return {
      all: prs.length,
      draft: by('Draft'),
      pending: by('Pending Approval'),
      approved: by('Approved'),
      sourcing: by('Sourcing Event'),
      po: by('PO Created'),
      rejected: by('Rejected'),
    };
  }, [prs]);

  const maxCreatedDate = useMemo(
    () =>
      prs.reduce(
        (acc, p) => (p.createdDate > acc ? p.createdDate : acc),
        prs[0]?.createdDate ?? '',
      ),
    [prs],
  );

  const filtered = useMemo(() => {
    return prs.filter((pr) => {
      if (group !== 'all' && pr.status !== group) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay =
          `${pr.prNumber} ${pr.material} ${pr.category} ${pr.requestor} ${pr.linkedDoc} ${pr.periodBucket ?? ''} ${pr.intakeLineId ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [prs, group, search]);

  if (reqQuery.isPending) return <LoadingState breadcrumb={REQUISITIONS_CRUMB} />;
  if (reqQuery.isError)
    return (
      <ErrorState
        breadcrumb={REQUISITIONS_CRUMB}
        error={reqQuery.error}
        onRetry={() => reqQuery.refetch()}
      />
    );
  if (prs.length === 0)
    return (
      <EmptyState
        breadcrumb={REQUISITIONS_CRUMB}
        title={t('requisitions.empty.title')}
        subtitle={t('requisitions.empty.subtitle')}
        message={t('requisitions.empty.message')}
      />
    );

  // The ONE parse. No hint: a buyer's own form carries no origin convention.
  const parsedQty = normalizeQty(form.qty);
  // A refused quantity is not a submittable form. `!!form.qty` used to be the
  // whole gate — presence, not readability — which is how "4.500" got through.
  const canSubmit =
    !!form.material && parsedQty.ok && !!form.date && !!form.costCenter;

  // G1.2b — the fabricated `PR-2026-00${random}` toast is retired onto the real
  // t_pr_create push (usePurchaseRequisitionCreate). The number now comes from
  // the store (store-assigned PR-2026-9xx), invalidation makes the real Draft
  // list-visible, and both failure channels surface honestly. Fresh authoring —
  // not a quantity override, so no C6-LOCK reason-gate here.
  // PLN-4 · R3 · a field no producer here supplies says where it is set.
  const orSap = (pr: PurchaseRequisition, field: SetInSapField, render: (v: string) => React.ReactNode = (v) => v) =>
    isSetInSap(pr, field) ? (
      <span className="text-text-tertiary italic" data-testid={`pr-set-in-sap-${field}`}>
        {t('requisitions.setInSap')}
      </span>
    ) : (
      render(pr[field] ?? '')
    );
  /** The requestor a person typed, else the lane that raised it (derived), else where it is set. */
  const requestorOf = (pr: PurchaseRequisition): React.ReactNode =>
    pr.requestor ? (
      pr.requestor
    ) : pr.requestorRole ? (
      <span data-testid="pr-requestor-role">{t('requisitions.requestorRole', { role: t(ROLE_LABEL_KEY[pr.requestorRole]) })}</span>
    ) : (
      <span className="text-text-tertiary italic">{t('requisitions.setInSap')}</span>
    );

  const pickedRows = prs.filter((p) => picked.has(p.id));
  const pickedOf = (verb: 't_pr_submit' | 't_pr_approve') =>
    pickedRows.filter((p) => isBulkEligible(p) && BULK_VERB_OF_STATUS[p.status] === verb);

  /**
   * PLN-4 · R3 · one verb over the selected requisitions it applies to, in
   * order, under ONE anchor, with a pause between documents so the page stays a
   * page. A refusal stops nothing: the summary names how many went and why the
   * rest did not, and the lists refresh once at the end.
   */
  const runBulk = async (verb: 't_pr_submit' | 't_pr_approve') => {
    const rows = pickedOf(verb);
    if (rows.length === 0 || bulkProgress) return;
    const b = batchRef.current;
    const refused = new Map<string, number>();
    let done = 0;
    let anchor: string | undefined;
    setBulkResult(null);
    setBulkProgress({ verb, done: 0, total: rows.length });
    try {
      for (const [i, pr] of rows.entries()) {
        if (i > 0) {
          setBulkProgress({ verb, done: i, total: rows.length });
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
        }
        let result: CommandResult | null = null;
        let reason: string | null = null;
        try {
          result = await b.dispatch(verb, pr.id, anchor);
          anchor ??= result.correlationId;
          if (result.status === 'failed') reason = refusalText(result.reason) ?? result.reason ?? 'failed';
        } catch (e) {
          reason = describeThrown(e, t('requisitions.bulk.failed'));
        }
        if (reason === null) done++;
        else refused.set(reason, (refused.get(reason) ?? 0) + 1);
      }
    } finally {
      b.refresh();
      setBulkProgress(null);
      setBulkResult({ verb, done, refused: [...refused.entries()], total: rows.length });
      setPicked(new Set());
    }
  };

  const submitNewPR = async () => {
    // Re-checked at the click (belt-and-suspenders beside the disabled button):
    // an unreadable quantity short-circuits here, so nothing reaches the spine.
    if (!parsedQty.ok || !canSubmit || createPr.isPending) return;
    try {
      // ⚠️ THROUGH THE ONE BUILDER, NOT INLINE. This object literal WAS the
      // drift: it supplied no `estimatedValue` (the form has no such input), so
      // the target's `num()` answered 0 and every PR raised here claimed a
      // budget of nothing. The builder returns a typed `PrCreatePayload`, so an
      // absence stays an absence and a missing REQUIRED key is a `tsc` failure.
      const result = await createPr.mutateAsync({
        payload: buildNewPrPayload(form, parsedQty.value),
      });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('requisitions.toast.createFailed.title'),
          description: refusalText(result.reason) ?? result.reason ?? t('requisitions.toast.createFailed.desc'),
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('requisitions.toast.created.title', { prNumber: result.entityId }),
        description: t('requisitions.toast.created.desc'),
      });
      setForm(emptyForm);
      setNewOpen(false);
    } catch (e) {
      toast({
        variant: 'error',
        title: t('requisitions.toast.createFailed.title'),
        description: describeThrown(e, t('requisitions.toast.createFailed.desc')),
      });
    }
  };

  // ── §67 · THE APPROVAL ACTS ────────────────────────────────────────────────
  // Both mirror `submitNewPR` above: dispatch, read the refusal channel, toast
  // honestly, and let the invalidation re-derive the panel. Neither absorbs a
  // refusal — what the dispatcher said still reaches the buyer.
  //
  // ⚠️ **THIS USED TO SAY "RENDERED VERBATIM", AND THE WORD IS RETIRED RATHER
  // THAN KEPT.** The pin's load-bearing claim was NON-ABSORPTION — that a
  // refusal is never swallowed into a generic "action failed" — and verbatim
  // was the MEANS, not the end. `refusalText` replaces the wire HEAD with the
  // glossary's definition of that head and keeps the detail beside it, so the
  // refusal is neither absorbed nor invented; and when the head is one this
  // vocabulary does not own it returns `null`, so `result.reason` still lands
  // here unchanged. Leaving "verbatim" standing would have made the comment
  // describe a format the line no longer has.
  const closePanel = () => {
    setSelectedRow(null);
    setPanelMode('view');
    setRejectReason('');
    setReviseNote('');
  };

  const approveSelected = async () => {
    if (!selectedPR || approvePr.isPending) return;
    try {
      const result = await approvePr.mutateAsync({ prId: selectedPR.id });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('requisitions.toast.approveFailed.title', { prNumber: selectedPR.prNumber }),
          description:
            seatRefusal(result.reason) ??
            refusalText(result.reason) ??
            result.reason ??
            t('requisitions.toast.actionFailed.desc'),
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('requisitions.toast.approved.title', { prNumber: selectedPR.prNumber }),
        // E2E-1 — an approval is only recorded for a named seat now, so the
        // toast names the person the drawer then shows under "Approved by".
        description: t('requisitions.toast.approved.desc', {
          person: renderAttribution(identity.actor),
        }),
      });
      closePanel();
    } catch (e) {
      toast({
        variant: 'error',
        title: t('requisitions.toast.approveFailed.title', { prNumber: selectedPR.prNumber }),
        description: describeThrown(e, t('requisitions.toast.actionFailed.desc')),
      });
    }
  };

  // ⚠️ THE REASON IS NOT OPTIONAL AND THE BUTTON IS WHAT SAYS SO. A DISMISSIBLE
  // capture beside a required field is how a required thing becomes a
  // suggestion (operator ruling, §67), so the commit stays DISABLED until the
  // box is non-empty rather than firing and surfacing a refusal afterwards.
  // `PR_REJECT_REASON_AUTHORED` stands behind it for anything that never sees
  // this surface — the disable is the courtesy, the hook is the guarantee.
  const canReject = rejectReason.trim().length > 0;

  const submitSelected = async () => {
    if (!selectedPR || submitPr.isPending) return;
    try {
      const result = await submitPr.mutateAsync({ prId: selectedPR.id });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('requisitions.toast.submitFailed.title', { prNumber: selectedPR.prNumber }),
          description:
            seatRefusal(result.reason) ??
            refusalText(result.reason) ??
            result.reason ??
            t('requisitions.toast.actionFailed.desc'),
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('requisitions.toast.submitted.title', { prNumber: selectedPR.prNumber }),
        description: t('requisitions.toast.submitted.desc'),
      });
      closePanel();
    } catch (e) {
      toast({
        variant: 'error',
        title: t('requisitions.toast.submitFailed.title', { prNumber: selectedPR.prNumber }),
        description: describeThrown(e, t('requisitions.toast.actionFailed.desc')),
      });
    }
  };

  // The same disable-until-non-empty rule the rejection reason carries, for the
  // same stated reason: a dismissible capture beside a required field is how a
  // required thing becomes a suggestion. `PR_REVISION_NOTE_AUTHORED` stands
  // behind it for any caller that never renders this box.
  const canRevise = reviseNote.trim().length > 0;

  // RESOLVED renders the person; UNATTRIBUTED renders WHICH failure, never a
  // bare "unknown" — the reason is the part somebody can act on.
  //
  // ⚠️ **THE "NO RESOLVED VALUE CAN EXIST IN THIS TREE YET" HALF OF THIS
  // COMMENT IS RETIRED, NOT EDITED.** It read: *"No `RESOLVED` value can exist
  // in this tree yet (C10 §2.3); the arm is here because the union has two."*
  // The sample roster is exactly the thing that made it false, and a comment
  // asserting an arm is unreachable is the shape that let `SupplierOrders` ship
  // a live ungated commit (`ENTRANCE-IS-THE-UNIT-01`). The arm is REACHED now,
  // and it resolves the label at read rather than reading a stored name.
  const renderAttribution = (actor: ActorAttribution): string =>
    actor.kind === 'RESOLVED'
      ? personLabel(actor.person.personId, t)
      : t(UNATTRIBUTED_KEY[actor.reason]);

  const reviseSelected = async () => {
    if (!selectedPR || !canRevise || revisePr.isPending) return;
    try {
      const result = await revisePr.mutateAsync({
        prId: selectedPR.id,
        revisionNote: reviseNote.trim(),
      });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('requisitions.toast.reviseFailed.title', { prNumber: selectedPR.prNumber }),
          description: refusalText(result.reason) ?? result.reason ?? t('requisitions.toast.actionFailed.desc'),
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('requisitions.toast.revised.title', { prNumber: selectedPR.prNumber }),
        description: t('requisitions.toast.revised.desc'),
      });
      closePanel();
    } catch (e) {
      toast({
        variant: 'error',
        title: t('requisitions.toast.reviseFailed.title', { prNumber: selectedPR.prNumber }),
        description: describeThrown(e, t('requisitions.toast.actionFailed.desc')),
      });
    }
  };

  /**
   * ⚠️ **THE DOOR. IT NAVIGATES; IT DOES NOT DISPATCH.**
   *
   * The act this control starts is `t_rfq_create`, and that verb belongs to the
   * sourcing wizard — it needs a title, a category, materials, a quantity, an
   * invited supplier list and two deadlines, none of which this panel has or
   * should collect. Dispatching from here would mean a second RFQ-creation path
   * beside the ratified one, which is the `extraRfqs` anti-pattern (C6 §1) with
   * a different entry point.
   *
   * So it carries the requisition's IDENTITY to the wizard and lets the wizard
   * do what it already does. The requisition advances afterwards as a CASCADE of
   * the RFQ actually being raised — so a buyer who opens the wizard and closes
   * it again has changed nothing, which is the correct outcome and is what
   * dispatching from here would have got wrong.
   */
  const raiseSourcingEvent = (pr: PurchaseRequisition) => {
    navigate('/buyer/sourcing', { state: { sourceRequisitionId: pr.id } });
  };

  const rejectSelected = async () => {
    if (!selectedPR || !canReject || rejectPr.isPending) return;
    try {
      const result = await rejectPr.mutateAsync({
        prId: selectedPR.id,
        rejectionReason: rejectReason.trim(),
      });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('requisitions.toast.rejectFailed.title', { prNumber: selectedPR.prNumber }),
          description:
            seatRefusal(result.reason) ??
            refusalText(result.reason) ??
            result.reason ??
            t('requisitions.toast.actionFailed.desc'),
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('requisitions.toast.rejected.title', { prNumber: selectedPR.prNumber }),
        description: t('requisitions.toast.rejected.desc'),
      });
      closePanel();
    } catch (e) {
      toast({
        variant: 'error',
        title: t('requisitions.toast.rejectFailed.title', { prNumber: selectedPR.prNumber }),
        description: describeThrown(e, t('requisitions.toast.actionFailed.desc')),
      });
    }
  };

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={REQUISITIONS_CRUMB}
        title={t('requisitions.header.title')}
        subtitle={t('requisitions.header.subtitle')}
        actions={
          // ⚠️ THE CREATE AFFORDANCE IS WITHHELD, NOT DISABLED, AND THE WAIT IS
          // NAMED BESIDE IT. Omitting `primary` is what removes the false
          // affordance; the notice is what stops the removal from reading as a
          // gap. A disabled button would say "you may not" without saying who
          // may — the distinction `HandoffNotice`'s header sets out.
          //
          // Export / bulk-download stay: they are reads, they hold no atom, and
          // gating them on a verb the seat does not hold would be inventing an
          // authority the machine never asserted.
          <div className="flex items-center gap-3">
            <HandoffNotice availability={createAvailability} testId="handoff-pr-create" />
            <BulkActionsBar
              actions={[
                {
                  label: t('requisitions.action.export'),
                  icon: FileSpreadsheet,
                  onClick: () =>
                    toast({
                      variant: 'info',
                      title: t('requisitions.toast.exportUnavailable.title'),
                      description: t('requisitions.toast.exportUnavailable.desc'),
                    }),
                },
                {
                  label: t('requisitions.action.bulkDownload'),
                  icon: Download,
                  onClick: () =>
                    toast({
                      variant: 'info',
                      title: t('requisitions.toast.bulkDownloadUnavailable.title'),
                      description: t('requisitions.toast.bulkDownloadUnavailable.desc'),
                    }),
                },
              ]}
              {...(createAvailability.kind === 'held'
                ? {
                    primary: {
                      label: t('requisitions.action.newPr'),
                      icon: Plus,
                      onClick: () => setNewOpen(true),
                    },
                  }
                : {})}
            />
          </div>
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t(
          prs.length === 1
            ? 'requisitions.meta.summary.one'
            : 'requisitions.meta.summary.other',
          { count: prs.length, date: formatDate(maxCreatedDate) },
        )}
        {/* D-CENSUS-8 — PARTLY REAL, both axes. The PR CommandTarget is wired
            (G1.1) so a create genuinely dispatches; gate-2 still holds the feed
            SIMULATED (no live producer — SOMO F2 / Grid G1.2), which is why the
            feed axis reads the specific "awaiting live PR producer" text. */}
        <ProvenanceMarker capability="purchaseRequisitions" className="ml-3 align-middle" />
      </PageMetaLine>

      <ProcurementFlow />

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-5 mb-8">
        <KpiCard
          eyebrow={t('requisitions.kpi.draft.eyebrow')}
          value={counts.draft.toString()}
          subtitle={t('requisitions.kpi.draft.subtitle')}
          icon={FileText}
        />
        <KpiCard
          eyebrow={t('requisitions.kpi.pending.eyebrow')}
          value={counts.pending.toString()}
          subtitle={t('requisitions.kpi.pending.subtitle')}
          icon={Clock}
        />
        <KpiCard
          eyebrow={t('requisitions.kpi.approved.eyebrow')}
          value={counts.approved.toString()}
          subtitle={t('requisitions.kpi.approved.subtitle')}
          icon={CheckCircle2}
        />
        <KpiCard
          eyebrow={t('requisitions.kpi.sourcing.eyebrow')}
          value={counts.sourcing.toString()}
          subtitle={t('requisitions.kpi.sourcing.subtitle')}
          icon={AlertTriangle}
        />
        <KpiCard
          eyebrow={t('requisitions.kpi.po.eyebrow')}
          value={counts.po.toString()}
          subtitle={t('requisitions.kpi.po.subtitle')}
          icon={ShoppingCart}
        />
      </div>

      <SubTabs<GroupTab>
        options={[
          { id: 'all', label: t('requisitions.tab.all'), count: counts.all },
          { id: 'Draft', label: t('requisitions.tab.draft'), count: counts.draft },
          { id: 'Pending Approval', label: t('requisitions.tab.pending'), count: counts.pending },
          { id: 'Approved', label: t('requisitions.tab.approved'), count: counts.approved },
          { id: 'Sourcing Event', label: t('requisitions.tab.sourcing'), count: counts.sourcing },
          { id: 'PO Created', label: t('requisitions.tab.po'), count: counts.po },
        ]}
        value={group}
        onChange={setGroup}
        className="mb-5"
      />

      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('requisitions.search.placeholder')}
        />
      </div>

      {/* ── PLN-4 · R3 · the bulk acts, over the rows ticked below ────────── */}
      {(pickedRows.length > 0 || bulkProgress || bulkResult) && (
        <div
          className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-info/30 bg-info-soft px-4 py-2.5 text-sm"
          data-testid="pr-bulk-bar"
        >
          {bulkProgress ? (
            <span className="font-semibold text-info" role="status" aria-live="polite" data-testid="pr-bulk-progress">
              {t(bulkProgress.verb === 't_pr_approve' ? 'requisitions.bulk.approving' : 'requisitions.bulk.submitting', {
                done: formatNumber(Math.min(bulkProgress.done + 1, bulkProgress.total)),
                total: formatNumber(bulkProgress.total),
              })}
            </span>
          ) : pickedRows.length > 0 ? (
            <>
              <span className="font-semibold text-text-primary" data-testid="pr-bulk-count">
                {t('requisitions.bulk.selected', { count: pickedRows.length, n: formatNumber(pickedRows.length) })}
              </span>
              {pickedOf('t_pr_submit').length > 0 &&
                (submitAvailability.kind === 'held' ? (
                  <Button variant="outline" onClick={() => void runBulk('t_pr_submit')} data-testid="pr-bulk-submit">
                    {t('requisitions.bulk.submit', { n: formatNumber(pickedOf('t_pr_submit').length) })}
                  </Button>
                ) : (
                  <HandoffNotice availability={submitAvailability} testId="handoff-pr-bulk-submit" />
                ))}
              {/* ⚠️ SEGREGATION, PINNED: bulk approve is offered only to a seat
                  holding `pr:approve` — procurement's — and every document is
                  still gated on its own at the dispatcher. */}
              {pickedOf('t_pr_approve').length > 0 &&
                (approveAvailability.kind === 'held' ? (
                  <Button variant="outline" onClick={() => void runBulk('t_pr_approve')} data-testid="pr-bulk-approve">
                    {t('requisitions.bulk.approve', { n: formatNumber(pickedOf('t_pr_approve').length) })}
                  </Button>
                ) : (
                  <HandoffNotice availability={approveAvailability} testId="handoff-pr-bulk-approve" />
                ))}
              <button
                type="button"
                className="text-text-secondary hover:underline"
                onClick={() => setPicked(new Set())}
                data-testid="pr-bulk-clear"
              >
                {t('requisitions.bulk.clear')}
              </button>
            </>
          ) : null}
          {bulkResult && !bulkProgress && (
            <div className="flex w-full items-start justify-between gap-3" role="status" data-testid="pr-bulk-result">
              <div>
                <span className="font-semibold text-text-primary">
                  {t(bulkResult.verb === 't_pr_approve' ? 'requisitions.bulk.approved' : 'requisitions.bulk.submitted', {
                    done: formatNumber(bulkResult.done),
                    refused: formatNumber(bulkResult.total - bulkResult.done),
                    total: formatNumber(bulkResult.total),
                  })}
                </span>
                {bulkResult.refused.length > 0 && (
                  <ul className="mt-0.5 text-xs text-danger" data-testid="pr-bulk-refusals">
                    {bulkResult.refused.map(([reason, n]) => (
                      <li key={reason}>{t('requisitions.bulk.refusedLine', { n: formatNumber(n), reason })}</li>
                    ))}
                  </ul>
                )}
              </div>
              <button type="button" className="text-text-secondary hover:underline" onClick={() => setBulkResult(null)}>
                {t('requisitions.bulk.dismiss')}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableHeaderCell>
              <input
                type="checkbox"
                aria-label={t('requisitions.bulk.selectAll')}
                data-testid="pr-select-all"
                disabled={!!bulkProgress || !filtered.some(isBulkEligible)}
                checked={filtered.some(isBulkEligible) && filtered.filter(isBulkEligible).every((p) => picked.has(p.id))}
                onChange={(e) => setPicked(e.target.checked ? new Set(filtered.filter(isBulkEligible).map((p) => p.id)) : new Set())}
              />
            </TableHeaderCell>
            <TableHeaderCell>{t('requisitions.table.col.pr')}</TableHeaderCell>
            <TableHeaderCell>{t('requisitions.table.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('requisitions.table.col.category')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('requisitions.table.col.qty')}</TableHeaderCell>
            <TableHeaderCell>{t('requisitions.table.col.bucket')}</TableHeaderCell>
            <TableHeaderCell>{t('requisitions.table.col.origin')}</TableHeaderCell>
            <TableHeaderCell>{t('requisitions.table.col.required')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('requisitions.table.col.estValue')}</TableHeaderCell>
            <TableHeaderCell>{t('requisitions.table.col.requestor')}</TableHeaderCell>
            <TableHeaderCell>{t('requisitions.table.col.status')}</TableHeaderCell>
            <TableHeaderCell>{t('requisitions.table.col.source')}</TableHeaderCell>
            <TableHeaderCell>{t('requisitions.table.col.linkedDoc')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('requisitions.table.col.actions')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {filtered.map((pr) => {
              const hasPIR = pr.sourceOfSupply === 'PIR exists';
              return (
                <TableRow
                  key={pr.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedRow(pr)}
                >
                  <TableCell>
                    {isBulkEligible(pr) && (
                      <input
                        type="checkbox"
                        aria-label={t('requisitions.bulk.selectRow', { number: pr.prNumber })}
                        data-testid={`pr-select-${pr.id}`}
                        disabled={!!bulkProgress}
                        checked={picked.has(pr.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          setPicked((cur) => {
                            const next = new Set(cur);
                            if (e.target.checked) next.add(pr.id);
                            else next.delete(pr.id);
                            return next;
                          })
                        }
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Data as="div" className="text-xs font-semibold text-text-primary">
                      {pr.prNumber}
                    </Data>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-text-primary truncate max-w-[14rem]">
                      {pr.material}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-text-secondary">
                      {orSap(pr, 'category')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap text-sm text-text-primary">
                    <Data>{formatNumber(pr.quantity)} {pr.uom}</Data>
                  </TableCell>
                  {/* PLN-4 · R3 · the planning bucket the requirement sits in — a
                      grain, never a day, so it is its own column beside Required. */}
                  <TableCell className="whitespace-nowrap text-sm text-text-secondary" data-testid={`pr-bucket-${pr.id}`}>
                    <Data>{pr.periodBucket ?? '—'}</Data>
                  </TableCell>
                  <TableCell className="whitespace-nowrap" data-testid={`pr-origin-${pr.id}`}>
                    <span title={pr.intakeLineId}>
                      <StatusPill variant="neutral">
                        {t(prOrigin(pr) === 'intake' ? 'requisitions.origin.intake' : 'requisitions.origin.manual')}
                      </StatusPill>
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-text-secondary">
                    {orSap(pr, 'requiredDate', (v) => <Data>{formatDate(v)}</Data>)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                    <Data>{formatIDR(pr.estimatedValue, { compact: true })}</Data>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-text-secondary">
                      {requestorOf(pr)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={STATUS_VARIANT[pr.status]}>
                      {pr.status}
                    </StatusPill>
                  </TableCell>
                  <TableCell>
                    {/* PLN-4 · R3 · an EMPTY source is not "None" — nobody has said. */}
                    {isSetInSap(pr, 'sourceOfSupply') ? (
                      orSap(pr, 'sourceOfSupply')
                    ) : (
                      <StatusPill variant={hasPIR ? 'success' : 'warning'}>
                        {hasPIR ? 'PIR' : t('requisitions.source.none')}
                      </StatusPill>
                    )}
                  </TableCell>
                  <TableCell>
                    <Data
                      className={`text-xs ${
                        pr.linkedDoc ? 'text-text-primary' : 'text-text-tertiary'
                      }`}
                    >
                      {pr.linkedDoc || '—'}
                    </Data>
                  </TableCell>
                  <TableCell className="text-right">
                    <ChevronRight
                      size={16}
                      className="text-text-tertiary inline-block"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={14}
                  className="text-center text-sm text-text-tertiary py-10"
                >
                  {t('requisitions.table.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <div className="mt-6 bg-info-soft border-l-2 border-info rounded px-4 py-3 text-sm text-text-primary flex items-start gap-2">
        <ClipboardList size={14} className="text-info shrink-0 mt-0.5" />
        <span>
          <strong className="text-info">{t('requisitions.footnote.title')}</strong>{' '}
          {t('requisitions.footnote.body')}
        </span>
      </div>

      <SidePanel
        open={selectedPR !== null}
        onClose={closePanel}
        title={selectedPR ? t('requisitions.panel.title', { number: selectedPR.prNumber }) : ''}
        footerActions={
          selectedPR && (
            <>
              {/* ⚠️ §67 — THREE AFFORDANCES RETIRED HERE, AND THE DEFECT IS
                  PRECISELY LOCATED. "Submit for approval" on a Draft, and
                  "Create PO directly" / "Create Sourcing Event" on an Approved,
                  dispatched NOTHING — no store write, no event, no state
                  change.

                  **Their COPY was already honest** ("PO creation not available
                  yet — nothing was created"), which is why this is worth
                  stating carefully rather than as a flat accusation. What lied
                  was the SHAPE: a live button in the commit slot, labelled with
                  the verb, firing a GREEN SUCCESS toast to report that nothing
                  happened. A reader decides from the affordance, not from the
                  notification they get after pressing it — and an honest
                  sentence delivered in a success variant reads as confirmation.

                  Nothing in the suite covered any of the three, which is how
                  they survived. What stands in their place is either a REAL
                  dispatch or a stated reason there is no act — never a button
                  for neither. */}
              <Button variant="secondary" onClick={closePanel}>
                {t('requisitions.panel.close')}
              </Button>

              {/* ⚠️ §68 — THE REQUESTER'S EDGE OUT OF DRAFT, AND IT CLOSES A
                  DEAD END THIS SURFACE CREATED. §67 stated here that a Draft
                  had one edge out and this surface did not offer it, on the
                  ground that a submit affordance would be a second creation
                  path beside the ratified C7 seam. THAT REASON WAS WRONG:
                  `t_pr_submit` does not create anything — it acts on a document
                  `t_pr_create` has already minted — so it adds no producer at
                  all. The consequence of the old reading was that the approval
                  queue emptied and nothing filled it. */}
              {selectedPR.status === 'Draft' && panelMode === 'view' && (
                <>
                  {submitAvailability.kind === 'held' ? (
                    <Button
                      variant="outline"
                      onClick={submitSelected}
                      disabled={submitPr.isPending}
                      data-testid="pr-submit"
                    >
                      {submitPr.isPending
                        ? t('requisitions.panel.submitting')
                        : t('requisitions.panel.submit')}
                    </Button>
                  ) : (
                    <HandoffNotice availability={submitAvailability} testId="handoff-pr-submit" />
                  )}
                </>
              )}

              {/* The recourse edge. A rejected requisition returns to the
                  REQUESTER (Rejected → Draft), never straight back to the
                  queue: an approver seeing the same document they already
                  declined learns nothing, and the two-step IS the revision. */}
              {selectedPR.status === 'Rejected' && panelMode === 'view' && (
                <>
                  {reviseAvailability.kind === 'held' ? (
                    <Button
                      variant="outline"
                      onClick={() => setPanelMode('revising')}
                      data-testid="pr-revise-open"
                    >
                      {t('requisitions.panel.revise')}
                    </Button>
                  ) : (
                    <HandoffNotice availability={reviseAvailability} testId="handoff-pr-revise" />
                  )}
                </>
              )}

              {selectedPR.status === 'Rejected' && panelMode === 'revising' && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setPanelMode('view');
                      setReviseNote('');
                    }}
                  >
                    {t('requisitions.panel.reviseCancel')}
                  </Button>
                  {/* DP2-BUTTON-01 — OUTLINE, and the contrast with the reject
                      commit below is the rule working. Solid is reserved for
                      the irreversible commit; a revision returns a declined
                      document to its own author's hands and is undone by
                      declining it again. Reject is named in the reserved list;
                      revise is not, and neither is submit. */}
                  <Button
                    variant="outline"
                    onClick={reviseSelected}
                    disabled={!canRevise || revisePr.isPending}
                    data-testid="pr-revise-confirm"
                  >
                    {revisePr.isPending
                      ? t('requisitions.panel.revising')
                      : t('requisitions.panel.reviseConfirm')}
                  </Button>
                </>
              )}

              {selectedPR.status === 'Pending Approval' && panelMode === 'view' && (
                <>
                  {/* The wait, not a gap: a seat without the atom reads the
                      OWNER of the act rather than an empty footer. Derived per
                      verb from `rolesHolding`, so moving `pr:approve` to another
                      bundle tomorrow changes this line with it. */}
                  {rejectAvailability.kind === 'held' ? (
                    <Button
                      variant="outline"
                      onClick={() => setPanelMode('rejecting')}
                      data-testid="pr-reject-open"
                    >
                      {t('requisitions.panel.reject')}
                    </Button>
                  ) : (
                    <HandoffNotice availability={rejectAvailability} testId="handoff-pr-reject" />
                  )}
                  {approveAvailability.kind === 'held' ? (
                    <Button
                      variant="outline"
                      onClick={approveSelected}
                      disabled={approvePr.isPending}
                      data-testid="pr-approve"
                    >
                      {approvePr.isPending
                        ? t('requisitions.panel.approving')
                        : t('requisitions.panel.approve')}
                    </Button>
                  ) : (
                    <HandoffNotice availability={approveAvailability} testId="handoff-pr-approve" />
                  )}
                </>
              )}

              {selectedPR.status === 'Pending Approval' && panelMode === 'rejecting' && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setPanelMode('view');
                      setRejectReason('');
                    }}
                  >
                    {t('requisitions.panel.rejectCancel')}
                  </Button>
                  {/* DP2-BUTTON-01 — SOLID, and Reject is named in the reserved
                      list. The opener above stays outline because it only
                      switches panel mode; THIS is the irreversible commit, and
                      it is the only solid on the surface (the approve button is
                      not rendered in `rejecting` mode). */}
                  <Button
                    variant="outline"
                    onClick={rejectSelected}
                    disabled={!canReject || rejectPr.isPending}
                    data-testid="pr-reject-confirm"
                  >
                    {rejectPr.isPending
                      ? t('requisitions.panel.rejecting')
                      : t('requisitions.panel.rejectConfirm')}
                  </Button>
                </>
              )}
            </>
          )
        }
      >
        {selectedPR && (
          <div className="space-y-6">
            {/* ⚠️ THE REASON CAPTURE, AND IT IS NOT DISMISSIBLE-BESIDE-REQUIRED.
                The commit button is disabled until this is non-empty, so there
                is no path from here to a blank rejection — and no path around
                it either: `PR_REJECT_REASON_AUTHORED` refuses a blank string at
                the verb for any caller that never renders this box. */}
            {panelMode === 'rejecting' && selectedPR.status === 'Pending Approval' && (
              <section>
                <h3 className="text-label text-text-tertiary uppercase mb-3">
                  {t('requisitions.panel.rejectSection')}
                </h3>
                <label htmlFor="pr-reject-reason" className="sr-only">
                  {t('requisitions.panel.rejectSrLabel', { number: selectedPR.prNumber })}
                </label>
                <textarea
                  id="pr-reject-reason"
                  data-testid="pr-reject-reason"
                  className="w-full text-sm border border-border-subtle rounded-md px-3 py-2 bg-bg-surface text-text-primary"
                  rows={3}
                  placeholder={t('requisitions.panel.rejectPlaceholder')}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <div className="mt-2 text-xs text-text-tertiary">
                  {t('requisitions.panel.rejectNote')}
                </div>
              </section>
            )}

            {/* The revision note capture. Same shape and same rule as the
                rejection reason above — and this one closes the sharper of the
                two defects: `revisionNote` had been REQUIRED by the verb since
                PF-1a with no field on the document, no capture anywhere, and no
                caller. The dispatcher refused without it and the text was
                dropped before the document was written. */}
            {panelMode === 'revising' && selectedPR.status === 'Rejected' && (
              <section>
                <h3 className="text-label text-text-tertiary uppercase mb-3">
                  {t('requisitions.panel.reviseSection')}
                </h3>
                <label htmlFor="pr-revise-note" className="sr-only">
                  {t('requisitions.panel.reviseSrLabel', { number: selectedPR.prNumber })}
                </label>
                <textarea
                  id="pr-revise-note"
                  data-testid="pr-revise-note"
                  className="w-full text-sm border border-border-subtle rounded-md px-3 py-2 bg-bg-surface text-text-primary"
                  rows={3}
                  placeholder={t('requisitions.panel.revisePlaceholder')}
                  value={reviseNote}
                  onChange={(e) => setReviseNote(e.target.value)}
                />
                <div className="mt-2 text-xs text-text-tertiary">
                  {t('requisitions.panel.reviseNote')}
                </div>
              </section>
            )}

            {/* E2E-1 — SAID BEFORE THE ACT: whose name the decision carries, or
                that this seat names nobody and will be refused. The notice that
                stood here said the decision "is recorded as unattributed"; a
                named person approving read it beside their own name, and by
                ruling an unnamed seat no longer decides at all
                (`PR_DECIDER_NAMED`). */}
            {selectedPR.status === 'Pending Approval' &&
              (approveAvailability.kind === 'held' || rejectAvailability.kind === 'held') && (
                <section className="rounded-md border border-border-subtle bg-bg-muted px-3 py-2">
                  <ActorPreActNotice
                    unattributedKey="identity.preAct.namedRequired"
                    className="text-xs text-text-secondary"
                    testId="pr-attribution-note"
                  />
                </section>
              )}

            {/* The recorded rejection, read back on the document it belongs to.
                This is the half the invoice lane never built — there the
                required text reaches the store seam and is discarded. */}
            {selectedPR.rejectionReason && (
              <section
                data-testid="pr-rejection-reason"
                className="rounded-md border border-danger/30 bg-danger-soft/40 px-3 py-2"
              >
                <h3 className="text-label text-text-tertiary uppercase mb-1">
                  {t('requisitions.panel.rejectedBecause')}
                </h3>
                <p className="text-sm text-text-primary">{selectedPR.rejectionReason}</p>
              </section>
            )}

            {/* What changed, read back on the document it belongs to — the
                other half of the same conversation. Both survive the edges
                deliberately: the reason says why it came back, the note says
                what was done about it, and an approver looking at a
                re-submitted requisition needs to read them together. */}
            {selectedPR.revisionNote && (
              <section
                data-testid="pr-revision-note"
                className="rounded-md border border-border-subtle bg-bg-muted px-3 py-2"
              >
                <h3 className="text-label text-text-tertiary uppercase mb-1">
                  {t('requisitions.panel.revisedBecause')}
                </h3>
                <p className="text-sm text-text-primary">{selectedPR.revisionNote}</p>
              </section>
            )}

            {/* ⚠️ APPROVED IS A DEAD END TODAY AND THE SURFACE SAYS SO.
                `t_pr_source` and `t_pr_convert` are `trigger: 'cascade'` and
                NO SOURCE NAMES EITHER in `cascades.ts` — both are
                `unauthored-cascade` rows in the loose-end census. The two
                buttons that used to sit here implied a next step the platform
                cannot produce, which is the false-affordance class exactly. An
                approved requisition that LOOKS like it is going somewhere is
                worse than one that plainly is not. */}
            {/* ⚠️ **C.3 — THIS SECTION USED TO SAY THE LANE STOPPED HERE, AND IT
                HAD ALREADY STOPPED BEING TRUE.** Its body read *"no producer is
                wired for either yet. Nothing on this screen advances an approved
                requisition further."* C.2 wired a producer — an RFQ raised from
                a requisition moves it to `Sourcing Event` — so the first clause
                became false at that merge, WITH NOBODY EDITING THIS FILE. That
                is the shape worth naming: a sentence that is true when written
                and is falsified by a capability shipping NEXT DOOR, on a surface
                its author never touched. Nothing in the suite could fail for it,
                because a stale prose claim is not a broken behaviour.

                The section survives rather than being deleted, on §68's
                precedent one state over: a state WITH an affordance still owes
                the reader an account of where the document is, and retiring the
                account would leave a lone button and no context. What changed is
                that the account is now true, and it says what remains undone
                (PO conversion) instead of claiming everything is. */}
            {selectedPR.status === 'Approved' && (
              <section
                data-testid="pr-approved-terminal"
                className="rounded-md border border-border-subtle bg-bg-muted px-3 py-2"
              >
                <h3 className="text-label text-text-tertiary uppercase mb-1">
                  {t('requisitions.panel.sourcing.title')}
                </h3>
                <p className="text-sm text-text-secondary mb-2">
                  {t('requisitions.panel.sourcing.body')}
                </p>
                {sourcingAvailability.kind === 'held' ? (
                  <Button
                    variant="outline"
                    data-testid="pr-raise-sourcing"
                    onClick={() => raiseSourcingEvent(selectedPR)}
                  >
                    {t('requisitions.panel.sourcing.cta')}
                  </Button>
                ) : (
                  /* Pending-with-an-owner, in the standing grammar — never an
                     absent affordance, never a disabled control. A requisitioner
                     holds `pr:create` and `pr:submit` and no `rfq:create`, so
                     this is the seat that actually meets this notice: their own
                     approved requisition, and procurement is who takes it on. */
                  <HandoffNotice
                    availability={sourcingAvailability}
                    testId="handoff-pr-sourcing"
                  />
                )}
              </section>
            )}

            {/* ⚠️ §68 — THIS NOTE USED TO EXPLAIN WHY NOTHING HERE SUBMITTED
                THE REQUISITION. Something does now, so what it explains has
                changed: a Draft is not yet in front of an approver, and the
                requester is the one who decides when it should be. The section
                stays because a state with an affordance still owes the reader
                an account of where the document IS — retiring it would leave a
                lone button and no context. */}
            {selectedPR.status === 'Draft' && (
              <section
                data-testid="pr-draft-note"
                className="rounded-md border border-border-subtle bg-bg-muted px-3 py-2"
              >
                <h3 className="text-label text-text-tertiary uppercase mb-1">
                  {t('requisitions.panel.draftNote.title')}
                </h3>
                <p className="text-sm text-text-secondary">
                  {t('requisitions.panel.draftNote.body')}
                </p>
              </section>
            )}

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t('requisitions.panel.keyFacts')}
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-text-tertiary">{t('requisitions.panel.field.material')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedPR.material}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('requisitions.panel.field.category')}</dt>
                  <dd className="text-text-primary font-medium">
                    {orSap(selectedPR, 'category')}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('requisitions.panel.field.quantity')}</dt>
                  <Data as="dd" className="text-text-primary font-medium">
                    {formatNumber(selectedPR.quantity)} {selectedPR.uom}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('requisitions.panel.field.requiredDate')}</dt>
                  <dd className="text-text-primary font-medium">
                    {orSap(selectedPR, 'requiredDate', (v) => <Data>{formatDate(v)}</Data>)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('requisitions.panel.field.estValue')}</dt>
                  <Data as="dd" className="text-text-primary font-semibold">
                    {formatIDR(selectedPR.estimatedValue, { compact: true })}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('requisitions.panel.field.priority')}</dt>
                  <dd className="text-text-primary font-medium">
                    {/* ⚠️ ABSENT IS SAID, NOT GUESSED. The target used to coerce a
                        missing priority to 'Medium', so a plan-grid push showed
                        a choice nobody made. Same shape as the approval band
                        below, which has said "Not assigned" since §69. */}
                    {selectedPR.priority
                      ? el(selectedPR.priority)
                      : t('requisitions.panel.priority.unset')}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('requisitions.panel.field.requestor')}</dt>
                  <dd className="text-text-primary font-medium">
                    {requestorOf(selectedPR)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('requisitions.panel.field.costCenter')}</dt>
                  <dd className="text-text-primary font-medium">
                    {orSap(selectedPR, 'costCenter')}
                  </dd>
                </div>
                {/* ⚠️ §68 LABELLED IT A DESTINATION; §69 SAYS WHERE THE
                    DESTINATION CAME FROM, BECAUSE THE ROW STILL LOOKED
                    COMPUTED. The values track `estimatedValue` closely enough
                    to read as a derived band — 43M → Section Head, 79M/105M →
                    Procurement Head, 210M → VP Procurement — and NOTHING
                    DERIVES THEM. Measured at §69: zero relational or arithmetic
                    reads of `estimatedValue` exist anywhere in the tree, and no
                    threshold number is written anywhere in `src/` or `docs/`.

                    Deriving one here was the alternative and was REFUSED: the
                    fixture constrains only ≤43M, [67M,105M] and ≥210M, so the
                    intervals (43,67) and (105,210) would have to be INVENTED —
                    a computed-looking band with invented numbers is strictly
                    worse than an authored one, and putting the numbers in code
                    is C10 §4.1's second cost (a Tuesday decision becomes a
                    deploy) taken in a hook instead of in a state. */}
                <div>
                  <dt className="text-text-tertiary">
                    {t('requisitions.panel.field.approvalLevel')}
                  </dt>
                  <dd
                    className="text-text-primary font-medium"
                    data-testid="pr-approval-level"
                  >
                    {selectedPR.approvalLevel ||
                      t('requisitions.panel.approvalLevel.unassigned')}
                  </dd>
                  {/* On EVERY row, including the unassigned one: the claim is
                      about the FIELD's provenance, not about the value it
                      happens to hold. A note that appeared only when a band was
                      present would read as a caveat on that band. */}
                  <dd
                    className="mt-1 text-[11px] text-text-tertiary"
                    data-testid="pr-approval-level-provenance"
                  >
                    {t('requisitions.panel.approvalLevel.authored')}
                  </dd>
                </div>
                {/* ── WHERE THIS REQUISITION CAME FROM (A1-R3, rendered at A2) ──
                    ⚠️ **THE APPROVER READS THE OVERRIDE HERE, ON THE DOCUMENT,
                    AND UNTIL NOW THEY COULD NOT READ IT ANYWHERE.** The plan
                    grid refused to dispatch without a reason, the payload
                    carried it, and the target dropped it — so it survived only
                    on the DR-10 event, **and no surface in this tree renders an
                    event** (C7-FIND-02). A ledger nobody reads is not an answer
                    to the one person whose decision depends on it.

                    Audit on the event and provenance on the document are
                    different jobs: the event answers *what happened, in order,
                    to whom* and is append-only; this answers *what am I looking
                    at* to the approver, on the row in front of them.

                    Every row is conditional, and absence is the honest
                    statement: a requisition raised on the New PR form has no
                    intake line, no bucket and no override, and an absent
                    `decision` means nobody overrode anything — never "the
                    override was unexplained". */}
                {selectedPR.periodBucket && (
                  <div>
                    <dt className="text-text-tertiary">
                      {t('requisitions.panel.field.periodBucket')}
                    </dt>
                    {/* ⚠️ **RENDERED AS A BUCKET, NEVER THROUGH `formatDate`.**
                        A month is the one form `Date` happily parses, so that
                        call turns `'2026-09'` into `01 Sept 2026` — a specific
                        day nobody entered, which reads as an answer. */}
                    <Data as="dd" className="text-text-primary font-medium" data-testid="pr-period-bucket">
                      {selectedPR.periodBucket}
                    </Data>
                    <dd className="mt-1 text-[11px] text-text-tertiary">
                      {t('requisitions.panel.periodBucket.note')}
                    </dd>
                  </div>
                )}
                {selectedPR.intakeLineId && (
                  <div>
                    <dt className="text-text-tertiary">
                      {t('requisitions.panel.field.intakeLine')}
                    </dt>
                    <Data as="dd" className="text-text-primary font-medium" data-testid="pr-intake-line">
                      {selectedPR.intakeLineId}
                    </Data>
                  </div>
                )}
                {selectedPR.decision && (
                  <div className="sm:col-span-2">
                    <dt className="text-text-tertiary">
                      {t('requisitions.panel.field.decision')}
                    </dt>
                    <dd
                      className="text-text-primary font-medium"
                      data-testid="pr-decision"
                    >
                      <Data className="text-sm">
                        {formatNumber(selectedPR.decision.from)}
                        {' → '}
                        {formatNumber(selectedPR.decision.to)}
                      </Data>
                    </dd>
                    <dd className="mt-1 text-text-secondary" data-testid="pr-decision-reason">
                      {selectedPR.decision.reason}
                    </dd>
                    {/* ⚠️ **THE BASELINE IS NAMED, BECAUSE A FROM/TO WITHOUT ONE
                        IS AMBIGUOUS AND THE AMBIGUITY IS THE DEFECT A1-R2
                        CLOSED.** `from` is the PRODUCER's delivered quantity,
                        so this row is the planner's own change and nobody
                        else's. Read against `suggestedQty` it would charge a
                        human for the producer's arithmetic. */}
                    <dd className="mt-1 text-[11px] text-text-tertiary">
                      {t('requisitions.panel.decision.baseline')}
                    </dd>
                  </div>
                )}
                {/* And WHO decided, present only once somebody has. Absent
                    before the act rather than pre-filled — which is the whole
                    difference between this row and the one above it. */}
                {selectedPR.approvedBy && (
                  <div>
                    <dt className="text-text-tertiary">
                      {t('requisitions.panel.field.approvedBy')}
                    </dt>
                    <dd className="text-text-primary font-medium" data-testid="pr-approved-by">
                      {renderAttribution(selectedPR.approvedBy)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-text-tertiary">{t('requisitions.panel.field.status')}</dt>
                  <dd>
                    <StatusPill variant={STATUS_VARIANT[selectedPR.status]}>
                      {selectedPR.status}
                    </StatusPill>
                    <span className="mt-1 block">
                      <NextActLine act={nextAct} testId="next-act-buyer-pr" />
                    </span>
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t('requisitions.panel.source.title')}
              </h3>
              {isSetInSap(selectedPR, 'sourceOfSupply') ? (
                <div className="border-l-2 border-border-subtle rounded bg-bg-subtle px-3 py-3 text-sm" data-testid="pr-source-set-in-sap">
                  <div className="font-semibold text-text-primary">{t('requisitions.setInSap')}</div>
                  <div className="text-text-secondary mt-1">{t('requisitions.panel.source.setInSap')}</div>
                </div>
              ) : (
              <div
                className={`border-l-2 rounded px-3 py-3 text-sm ${
                  selectedPR.sourceOfSupply === 'PIR exists'
                    ? 'bg-success-soft border-success text-success'
                    : 'bg-warning-soft border-warning text-warning-hover'
                }`}
              >
                <div className="font-semibold">
                  {selectedPR.sourceOfSupply === 'PIR exists'
                    ? t('requisitions.panel.source.found')
                    : t('requisitions.panel.source.none')}
                </div>
                <div className="text-text-secondary mt-1">
                  {selectedPR.sourceOfSupply === 'PIR exists'
                    ? t('requisitions.panel.source.pirExists', { material: selectedPR.material })
                    : t('requisitions.panel.source.noPir', { material: selectedPR.material })}
                </div>
              </div>
              )}
              {selectedPR.linkedDoc && (
                <div className="mt-3 text-sm text-text-secondary">
                  {t('requisitions.panel.linkedDocument')}{' '}
                  <Data className="text-text-primary">
                    {selectedPR.linkedDoc}
                  </Data>
                </div>
              )}
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-2">
                {t('requisitions.panel.justification')}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {orSap(selectedPR, 'justification')}
              </p>
            </section>
          </div>
        )}
      </SidePanel>

      <SidePanel
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title={t('requisitions.new.title')}
        footerActions={
          <>
            <Button variant="secondary" onClick={() => setNewOpen(false)}>
              {t('requisitions.new.cancel')}
            </Button>
            <Button
              variant="outline"
              disabled={!canSubmit}
              onClick={submitNewPR}
            >
              {t('requisitions.new.submit')}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <FormSection
            eyebrow={t('requisitions.new.step1.eyebrow')}
            title={t('requisitions.new.step1.title')}
            description={t('requisitions.new.step1.desc')}
          >
            <div>
              <label className={labelClass}>{t('requisitions.new.field.material')}</label>
              <input
                className={inputClass}
                placeholder={t('requisitions.new.placeholder.material')}
                value={form.material}
                onChange={(e) =>
                  setForm({ ...form, material: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-[1fr_100px] gap-3">
              <div>
                <label className={labelClass}>{t('requisitions.new.field.quantity')}</label>
                {/* type=text + inputmode=decimal (ruling 6.2): type=number
                    rejects the separators this field exists to adjudicate. */}
                <input
                  type="text"
                  inputMode="decimal"
                  className={inputClass}
                  placeholder={t('requisitions.new.placeholder.quantity')}
                  aria-label={t('requisitions.new.field.quantity')}
                  aria-invalid={form.qty.trim() !== '' && !parsedQty.ok}
                  value={form.qty}
                  onChange={(e) => setForm({ ...form, qty: e.target.value })}
                />
                {/* An untouched blank does not nag; a TYPED token that cannot be
                    read says so, and says what to type instead. */}
                {form.qty.trim() !== '' && !parsedQty.ok && (
                  <div
                    role="alert"
                    data-testid="new-pr-qty-refusal"
                    className="mt-1 text-[11px] text-danger"
                  >
                    {t(QTY_REFUSAL_KEY[parsedQty.reason])}{' '}
                    <GlossaryTermChip
                      refTo={{ sourceType: 'QtyRefusalReason', term: parsedQty.reason }}
                    />
                  </div>
                )}
                <div className="mt-1 text-[11px] text-text-tertiary">
                  {t('requisitions.new.qty.hint')}
                </div>
              </div>
              <div>
                <label className={labelClass}>{t('requisitions.new.field.uom')}</label>
                <select
                  className={inputClass}
                  value={form.uom}
                  onChange={(e) => setForm({ ...form, uom: e.target.value })}
                >
                  {UOM_OPTIONS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
          </FormSection>

          <FormSection
            eyebrow={t('requisitions.new.step2.eyebrow')}
            title={t('requisitions.new.step2.title')}
            description={t('requisitions.new.step2.desc')}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>{t('requisitions.new.field.requiredDate')}</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>{t('requisitions.new.field.costCenter')}</label>
                <select
                  className={inputClass}
                  value={form.costCenter}
                  onChange={(e) =>
                    setForm({ ...form, costCenter: e.target.value })
                  }
                >
                  <option value="">{t('requisitions.new.select.placeholder')}</option>
                  {COST_CENTERS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>{t('requisitions.new.field.priority')}</label>
              <select
                className={inputClass}
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: e.target.value })
                }
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {el(p)}
                  </option>
                ))}
              </select>
            </div>
          </FormSection>

          <FormSection
            eyebrow={t('requisitions.new.step3.eyebrow')}
            title={t('requisitions.new.step3.title')}
            description={t('requisitions.new.step3.desc')}
          >
            <textarea
              className={`${inputClass} min-h-[72px] resize-y`}
              placeholder={t('requisitions.new.placeholder.justification')}
              value={form.justification}
              onChange={(e) =>
                setForm({ ...form, justification: e.target.value })
              }
            />
            <div className="bg-info-soft border-l-2 border-info rounded px-3 py-2 text-xs text-text-primary">
              {t('requisitions.new.info')}
            </div>
          </FormSection>
        </div>
      </SidePanel>
    </AppShellV2>
  );
};

export default BuyerRequisitions;
