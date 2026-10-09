import React, { useCallback, useMemo, useState } from 'react';
import {
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  ChevronRight,
  FileSpreadsheet,
  Plus,
  FlaskConical,
} from 'lucide-react';
import ListPage from '../components/ui-v2/ListPage';
import DataTable, { CellSub, type Column } from '../components/ui-v2/DataTable';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import SubTabs from '../components/ui-v2/SubTabs';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import SearchBar from '../components/ui-v2/SearchBar';
import StatusPill from '../components/ui-v2/StatusPill';
import SidePanel from '../components/ui-v2/SidePanel';
import Data from '../components/ui-v2/Data';
import Timeline, { TimelineEvent } from '../components/ui-v2/Timeline';
import Button from '../components/ui-v2/Button';
import GRInspectionWizard, { type FailedSettle } from '../components/v2-features/GRInspectionWizard';
import { useToast } from '../hooks/useToast';
import { useTranslation } from 'react-i18next';
import { useEnumLabel } from '../hooks/useEnumLabel';
import {
  useGoodsReceiptPost,
  useGoodsReceiptRequestRetest,
  useGoodsReceiptSettle,
  useAdvanceShipNoticeResolveDiscrepancy,
} from '../services/query/commandHooks';
import LoadingState from '../components/ui-v2/LoadingState';
import { useDeepLinkedSelection } from '../lib/recordDeepLink';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import {
  classifySettleFault,
  SETTLE_FAULT_RETRYABLE,
  type SettleFault,
} from '../services/transitions/settleFaults';
import { useVerbAvailabilities, useVerbAvailability, useNextAct } from '../hooks/useVerbAvailability';
import NextActLine from '../components/ui-v2/NextActLine';
import {
  useGoodsReceipts,
  useSuppliers,
  useShipments,
  useASNs,
  useEnforcementSettings,
  useComplianceRegistry,
  useMaterialRulings,
} from '../services/query/hooks';
import type { MaterialRuling } from '../services/sdc/materialRuling';
import { isAttributed, type EnforcementSetting } from '../lib/enforcement';
import { personLabel } from '../services/identity/personLabel';
import { formatSetAt } from './modules/moduleLedger';
import type {
  GoodsReceipt,
  GRStatus,
  InspectionResult,
  Supplier,
  Shipment,
  ASN,
  ComplianceRegistryEntry,
} from '../services/data/types';
import { useRefusalText } from '../hooks/useRefusalText';
import { statusTone } from '../lib/statusTone';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';
import { formatNumber } from '../lib/format';

// ⚠️ **THE THIRD PIN, RETIRED — AND THE CANON LISTED ONLY TWO.**
// `REFERENCE_TODAY` (2026-05-18) and `RFQ_TODAY_MS` (2026-04-25) went at #317.
// This one, `BuyerShipments`' and `BuyerInventory`'s survived, all three reading
// 2026-05-20 — which is EVIDENCE, not a coincidence: it is the same authoring
// generation, and it is where `goodsReceipt`'s anchor comes from.
//
// Retiring it onto the declared present is BEHAVIOUR-PRESERVING by construction:
// this page's families shift by `DECLARED_PRESENT - anchor` and so does the pin,
// so every rendered day-count is unchanged. The pin was a per-page "now"; there
// is now one, and it is declared.
const TODAY = DECLARED_PRESENT;

type GroupTab =
  | 'all'
  | 'pending'
  | 'under-inspection'
  | 'approved'
  | 'hold'
  | 'rejected'
  | 'posted';

type DateFilter = 'today' | 'week' | 'month' | '30d' | 'all';

const COUNTRY_FLAG: Record<string, string> = {
  ID: 'ID',
  MY: 'MY',
  DE: 'DE',
  FR: 'FR',
  CN: 'CN',
  SG: 'SG',
  IN: 'IN',
};

const STATUS_VARIANT: Record<
  GRStatus,
  'success' | 'warning' | 'danger' | 'info' | 'neutral'
> = {
  'Pending Inspection': 'neutral',
  'Under Inspection': 'warning',
  'Quality Hold': 'danger',
  Approved: 'success',
  'Partially Approved': 'warning',
  Rejected: 'danger',
  'Posting to SAP': 'info',
  'Posted to SAP': 'success',
};

const CHECK_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  Pass: 'success',
  Fail: 'danger',
  Pending: 'warning',
  'N/A': 'neutral',
};

// B4b-2 · the shared `formatNumber` (seat convention), not a local id-ID copy.

const formatDate = (iso?: string): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const DAY_MS = 24 * 60 * 60 * 1000;
const todayMs = new Date(TODAY).getTime();
const isInRange = (iso: string, filter: DateFilter): boolean => {
  if (filter === 'all') return true;
  const t = new Date(iso).getTime();
  const diff = todayMs - t;
  if (filter === 'today') return iso === TODAY;
  if (filter === 'week') return diff >= 0 && diff <= 7 * DAY_MS;
  if (filter === 'month') return diff >= 0 && diff <= 31 * DAY_MS;
  if (filter === '30d') return diff >= 0 && diff <= 30 * DAY_MS;
  return true;
};

const matchesGroup = (s: GRStatus, g: GroupTab): boolean => {
  if (g === 'all') return true;
  if (g === 'pending') return s === 'Pending Inspection';
  if (g === 'under-inspection') return s === 'Under Inspection';
  if (g === 'approved') return s === 'Approved' || s === 'Partially Approved';
  if (g === 'hold') return s === 'Quality Hold';
  if (g === 'rejected') return s === 'Rejected';
  if (g === 'posted') return s === 'Posted to SAP';
  return true;
};

const totals = (results: InspectionResult[]) =>
  results.reduce(
    (acc, r) => ({
      received: acc.received + r.qtyReceived,
      accepted: acc.accepted + r.qtyAccepted,
      rejected: acc.rejected + r.qtyRejected,
    }),
    { received: 0, accepted: 0, rejected: 0 }
  );

interface GoodsReceiptWorkspaceProps {
  goodsReceipts: GoodsReceipt[];
  suppliers: Supplier[];
  shipments: Shipment[];
  asns: ASN[];
  /** The append-only enforcement ledger (CP-3 · E4) — passed to the inspection
   *  wizard, which derives the mode in force with its own instant. Read here
   *  rather than in the wizard so the read shares the page's four honest states:
   *  the wizard never mounts against a pending or failed ledger. */
  enforcementSettings: readonly EnforcementSetting[];
  /** The compliance registry (I3.1) — the certificate side of the halal
   *  three-fact split, passed to the wizard for the H4 NOTICE. Read here for the
   *  same reason as the ledger above: the wizard never mounts against a pending
   *  or failed read, so a notice can never be absent because a fetch was in
   *  flight. **A NOTICE THAT SOMETIMES DOES NOT RENDER IS WORSE THAN NONE** —
   *  it teaches a clerk that no banner means no problem. */
  complianceRegistry: readonly ComplianceRegistryEntry[];
  /** OPS-2 — the material applicability rulings, read here for the reason the
   *  two reads above are: the wizard never mounts against a pending read, so a
   *  ruling can never be missing because a fetch was in flight. */
  materialRulings: readonly MaterialRuling[];
}

const GoodsReceiptWorkspace: React.FC<GoodsReceiptWorkspaceProps> = ({
  goodsReceipts,
  suppliers,
  shipments,
  asns,
  enforcementSettings,
  complianceRegistry,
  materialRulings,
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const el = useEnumLabel();
  const postMutation = useGoodsReceiptPost();
  const settleMutation = useGoodsReceiptSettle();
  const retestMutation = useGoodsReceiptRequestRetest();
  const supplierById = useMemo(
    () => new Map(suppliers.map((s) => [s.id, s])),
    [suppliers],
  );
  const [tab, setTab] = useState<GroupTab>('all');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardAsnId, setWizardAsnId] = useState<string | undefined>(undefined);
  // OPS-2 (R-OPS P0-4) — the receipt the form RESUMES, when it was opened from
  // one. `null` is the "New GR" entry, which creates.
  const [wizardResumeId, setWizardResumeId] = useState<string | null>(null);

  // ── DEEP LINK (?id=) ──────────────────────────────────────────────────────
  // A dashboard window's row links here. The filters are WIDENED first: landing
  // on a filtered list that excludes the very record the reader clicked is the
  // shape of a broken link (`Glossary.tsx`'s rule). An unknown id opens nothing
  // and says nothing — the list is still the right answer.
  //
  // It lives in the WORKSPACE, not in the page shell above: the selection state
  // and the detail panel are both here, and a hook in the shell would be
  // setting a `selectedId` that does not exist in its scope.
  useDeepLinkedSelection(
    goodsReceipts,
    (gr, id) => gr.id === id || gr.grNumber === id,
    useCallback((gr: (typeof goodsReceipts)[number]) => {
      setTab('all');
      setSearch('');
      setDateFilter('all');
      setSelectedId(gr.id);
    }, []),
  );

  // ── §91e · THE SETTLE WATCH ────────────────────────────────────────────────
  // Mirrors `BuyerInvoices`' watch verb for verb — one SAP boundary, two
  // surfaces, one account of it.
  //
  // ⚠️ **WHAT WAS WRONG WAS THE SURFACE, NOT THE MACHINE.** A settle that fails
  // leaves the command `submitted` and `pending` undeleted — `dispatcher.ts`
  // does that DELIBERATELY, so the SAME correlationId is genuinely re-settleable
  // ("Leaving the command `submitted` is what makes the named remedy TRUE").
  // Nothing on this page held the correlationId, so the only trace of a failure
  // was a toast the reader dismisses and cannot get back, and the GR then sat in
  // 'Posting to SAP' with no account of itself — while `settle.failed.TRANSPORT`
  // told them to run the same action again. The remedy named in copy now exists.
  //
  // ⚠️ **AND IT IS THE SETTLE THAT RE-ATTEMPTS, NOT `t_gr_post`.** §91 read the
  // remedy as a re-POST and therefore as a machine change (`t_gr_post.from` does
  // not contain the interim state, and must not: re-posting would mint a SECOND
  // correlationId and orphan the first, whose `pending` entry never clears).
  // Re-settling is the exit the flow already declares — `settlesTo` — reached
  // through the same command that was already issued.
  //
  // Only settles THIS session started are watched. A GR parked by an earlier
  // session shows the wait and offers nothing, because that is the truth: this
  // page cannot know that correlationId, and fabricating one would be an
  // affordance promising what it cannot do.
  const [settleWatch, setSettleWatch] = useState<
    Record<string, { correlationId: string; fault: SettleFault | null }>
  >({});
  const watchSettle = (id: string, correlationId: string, fault: SettleFault | null) =>
    setSettleWatch((w) => ({ ...w, [id]: { correlationId, fault } }));
  const clearSettle = (id: string) =>
    setSettleWatch((w) => {
      const { [id]: _done, ...rest } = w;
      return rest;
    });

  // §73 — THE SEAT'S AUTHORITY OVER THE WHOLE GR CHAIN, NOT OVER ITS FIRST
  // VERB. One click at the wizard's end fires `t_gr_create` ->
  // `t_gr_start_inspection` -> `t_gr_post`; a seat missing ANY of the three
  // cannot complete what the button starts, so the button is withheld unless
  // all three are held. The first WITHHELD one names the owner, in chain
  // order — never a merged list, because the three are one sequence and the
  // earliest blocker is the one a reader is waiting on.
  const grChain = useVerbAvailabilities({
    receive: 'gr:receive',
    inspect: 'gr:inspect',
    dispose: 'gr:disposition',
    post: 'gr:post',
  } as const);
  const grChainAvailability =
    [grChain.receive, grChain.inspect, grChain.post].find((a) => a.kind !== 'held') ??
    ({ kind: 'held' } as const);
  // OPS-2 — working a receipt that EXISTS is a different chain from creating
  // one: no `gr:receive` (nothing is received again), but the results and the
  // decision — `gr:inspect` then `gr:disposition`. The first one withheld names
  // its owner, in chain order, as above.
  const grResumeAvailability =
    [grChain.inspect, grChain.dispose].find((a) => a.kind !== 'held') ??
    ({ kind: 'held' } as const);
  const openResume = (g: GoodsReceipt) => {
    setWizardAsnId(undefined);
    setWizardResumeId(g.id);
    setSelectedId(null);
    setWizardOpen(true);
  };

  // ── ASN DISCREPANCY RECONCILIATION (`t_asn_resolve_discrepancy`) ───────────
  //
  // ⚠️ **ASKED SEPARATELY FROM `grChain`, NOT FOLDED INTO IT.** `asn:flag` and
  // the three GR atoms all sit in `receiving` today, so on the seeded seat the
  // two answers agree — and folding them would make this control's owner line
  // read off the GR chain's first blocker, which is a different verb. The GR
  // chain is ONE commit built from three atoms (hence one merged answer); this
  // is one verb with one atom, so it gets its own.
  const resolveAvailability = useVerbAvailability('asn:flag');
  const resolveDiscrepancyMutation = useAdvanceShipNoticeResolveDiscrepancy();

  // ⚠️ **THE ROW SET IS DERIVED FROM THE ASN'S OWN STATE, NEVER FROM THE GR'S.**
  // A GR that was rejected is not evidence that its ASN is still flagged —
  // reconciling clears the ASN and leaves the GR Rejected forever, which is
  // correct (the receipt really was rejected) and would make a GR-status-keyed
  // list keep offering an act the machine has already refused. `Discrepancy` is
  // the only legal from-state, so the list IS the legality.
  const discrepancyAsns = useMemo(
    () => asns.filter((a) => a.status === 'Discrepancy'),
    [asns],
  );

  const handleResolveDiscrepancy = (asnNumber: string) => {
    resolveDiscrepancyMutation.mutate(
      { asnNumber },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'warning',
              title: t('goodsReceipt.discrepancy.failed.title', { asnNumber }),
              description:
                refusalText(res.reason) ??
                t('goodsReceipt.discrepancy.failed.desc', { reason: res.reason ?? '' }),
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('goodsReceipt.discrepancy.done.title', { asnNumber }),
            description: t('goodsReceipt.discrepancy.done.desc'),
          });
        },
        onError: () =>
          toast({ variant: 'error', title: t('gr.denied.title'), description: t('gr.denied.desc') }),
      },
    );
  };


  // No local seeded copy — the list re-derives from the invalidated query after
  // each command (the standardized mutation pattern).
  const allGRs = goodsReceipts;

  const counts = useMemo(() => {
    let pending = 0;
    let underInspection = 0;
    let approved = 0;
    let hold = 0;
    let rejected = 0;
    let posted = 0;
    for (const g of allGRs) {
      if (g.status === 'Pending Inspection') pending++;
      else if (g.status === 'Under Inspection') underInspection++;
      else if (g.status === 'Approved' || g.status === 'Partially Approved')
        approved++;
      else if (g.status === 'Quality Hold') hold++;
      else if (g.status === 'Rejected') rejected++;
      else if (g.status === 'Posted to SAP') posted++;
    }
    return {
      all: allGRs.length,
      pending,
      underInspection,
      approved,
      hold,
      rejected,
      posted,
    };
  }, [allGRs]);

  const approvedToday = useMemo(
    () =>
      allGRs.filter(
        (g) =>
          (g.status === 'Approved' || g.status === 'Partially Approved') &&
          g.receivedDate === TODAY
      ).length,
    [allGRs]
  );

  const rejectionRate = useMemo(() => {
    let received = 0;
    let rejected = 0;
    for (const g of allGRs) {
      if (!isInRange(g.receivedDate, '30d')) continue;
      const t = totals(g.inspectionResults);
      received += t.received;
      rejected += t.rejected;
    }
    if (received === 0) return 0;
    return (rejected / received) * 100;
  }, [allGRs]);

  const filtered = useMemo(() => {
    return allGRs.filter((g) => {
      if (!matchesGroup(g.status, tab)) return false;
      if (!isInRange(g.receivedDate, dateFilter)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !g.grNumber.toLowerCase().includes(q) &&
          !g.asnNumber.toLowerCase().includes(q) &&
          !g.poNumber.toLowerCase().includes(q) &&
          !g.supplierName.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [allGRs, tab, dateFilter, search]);

  const selected = selectedId
    ? allGRs.find((g) => g.id === selectedId) ?? null
    : null;
  const selectedSupplier = selected
    ? supplierById.get(selected.supplierId)
    : undefined;

  // WHO ACTS NEXT (S2a). `GRStatus` matches the machine's states exactly, so
  // `status` IS the canonical state here — no projection member to fall through.
  const nextAct = useNextAct('goodsReceipt', selected?.status);

  const buildTimeline = (g: GoodsReceipt): TimelineEvent[] => {
    const order = (s: GRStatus): number => {
      switch (s) {
        case 'Pending Inspection':
          return 1;
        case 'Under Inspection':
          return 2;
        case 'Quality Hold':
          return 3;
        case 'Approved':
        case 'Partially Approved':
        case 'Rejected':
          return 4;
        case 'Posted to SAP':
          return 5;
        default:
          return 0;
      }
    };
    const cur = order(g.status);
    const hasLab = g.inspectionResults.some((r) => r.labResultId);
    const at = (n: number): 'completed' | 'current' | 'pending' =>
      n < cur ? 'completed' : n === cur ? 'current' : 'pending';

    return [
      {
        id: 't1',
        title: t('goodsReceipt.timeline.received'),
        timestamp: formatDate(g.receivedDate),
        status: 'completed',
      },
      {
        id: 't2',
        title: t('goodsReceipt.timeline.inspectionStarted'),
        status: at(2),
      },
      {
        id: 't3',
        title: t('goodsReceipt.timeline.labResultsReceived'),
        timestamp: hasLab
          ? g.inspectionResults.find((r) => r.labResultId)?.labResultId
          : t('goodsReceipt.timeline.noLabRequired'),
        status: hasLab ? (cur >= 3 ? 'completed' : 'current') : 'pending',
      },
      {
        id: 't4',
        title: t('goodsReceipt.timeline.dispositionDecision'),
        timestamp: g.disposition !== 'Pending' ? el(g.disposition) : undefined,
        status: at(4),
      },
      {
        id: 't5',
        title: t('goodsReceipt.timeline.postedToSap'),
        timestamp: g.sapMaterialDoc,
        status: g.status === 'Posted to SAP' ? 'completed' : 'pending',
      },
    ];
  };

  const footerForStatus = (g: GoodsReceipt): React.ReactNode => {
    switch (g.status) {
      case 'Pending Inspection':
        // ⚠️ OPS-2 (R-OPS P0-4) — THIS OPENED THE CREATE FORM. It passed the
        // receipt's `asnId` to the wizard as a source, and the wizard's one
        // commit fired `t_gr_create`: "Start inspection" on GR-2026-002 ended
        // with a SECOND receipt, and GR-2026-002 still pending. It now resumes
        // the receipt it was clicked on. The guard is the resume chain's, not
        // the create chain's (§75's entrance rule is unchanged: the mode is
        // gated, and both doors into it are).
        return grResumeAvailability.kind === 'held' ? (
          <Button variant="outline" onClick={() => openResume(g)}>
            {t('goodsReceipt.footer.startInspection')}
          </Button>
        ) : (
          <HandoffNotice availability={grResumeAvailability} testId="handoff-gr-start" />
        );
      case 'Under Inspection':
        // ⚠️ OPS-2 — THIS WAS A TOAST ("Submit form will open in a future
        // release"), on the one state every disposition verb fires from: a
        // receipt that reached it had no way forward. It opens the same form on
        // the same receipt; the commit records the results and then decides or
        // holds.
        return grResumeAvailability.kind === 'held' ? (
          <Button variant="outline" onClick={() => openResume(g)}>
            {t('goodsReceipt.footer.submitResults')}
          </Button>
        ) : (
          <HandoffNotice availability={grResumeAvailability} testId="handoff-gr-results" />
        );
      case 'Quality Hold':
        return (
          <div className="flex gap-2">
            {/* PF-1a — WIRED. This button rendered on `Quality Hold` and fired a
                toast while the state had NO EXIT AT ALL: the affordance promised
                an edge the schema did not have, which is closer to a defect than
                to a gap. It now dispatches `t_gr_request_retest` (Quality Hold →
                Under Inspection) through the same governed path as every other
                verb on this page. */}
            {grChain.inspect.kind === 'held' ? (
              <Button
                variant="secondary"
                disabled={retestMutation.isPending}
                onClick={() => handleRequestRetest(g)}
              >
                {retestMutation.isPending
                  ? t('goodsReceipt.retest.submitting')
                  : t('goodsReceipt.footer.requestRetest')}
              </Button>
            ) : (
              <HandoffNotice availability={grChain.inspect} testId="handoff-gr-retest" />
            )}
            {/* ⚠️ STILL A TOAST, AND DELIBERATELY SO — `DEAD-AFFORDANCE-01`,
                reported not fixed. Overriding a quality hold is a GOVERNANCE ACT
                whose entire value is accountability: this named person accepted
                this risk on this date. The platform cannot name a person
                (C10 §2, `ENF-NO-PERSON-IN-IDENTITY-01`), so wiring it today
                would write an ANONYMOUS UNLOCK into a permanent trail — the
                exact shape the enforcement lane already refuses by making an
                unattributed override unable to complete. It waits for identity,
                and the wait is the honest state. */}
            <Button
              variant="outline"
              onClick={() =>
                toast({
                  variant: 'warning',
                  title: t('goodsReceipt.toast.overrideHold.title'),
                  description: t('goodsReceipt.toast.overrideHold.desc'),
                })
              }
            >
              {t('goodsReceipt.footer.overrideHold')}
            </Button>
          </div>
        );
      case 'Approved':
      case 'Partially Approved':
        return grChain.post.kind === 'held' ? (
          <Button
            variant="outline"
            disabled={postMutation.isPending}
            onClick={() => handlePostToSap(g)}
          >
            {t('gr.post.action')}
          </Button>
        ) : (
          <HandoffNotice availability={grChain.post} testId="handoff-gr-post" />
        );
      case 'Posting to SAP':
        // ⚠️ §91e — AT THE SAP BOUNDARY, AND THIS CASE USED TO NOT EXIST: the
        // state fell to `default: return null`, so the GR was parked with no
        // affordance and no account of itself while `settle.failed.TRANSPORT`
        // told the reader to *"run the same action again"*.
        //
        // NO TRANSITION IS LEGAL FROM HERE and that is correct — the interim's
        // only exit is the `settlesTo` settlement edge, which is why the remedy
        // is a re-SETTLE and not a re-post. The footer accounts for the wait, or
        // for the failure if this session saw one, and offers the retry ONLY
        // when the classified fault says a second ask can answer differently.
        return settleWatch[g.id]?.fault ? (
          SETTLE_FAULT_RETRYABLE[settleWatch[g.id].fault!] ? (
            <Button variant="outline" onClick={() => retrySettle(g.id)}>
              {t('goodsReceipt.action.retrySettle')}
            </Button>
          ) : (
            <span className="text-xs text-critical self-center">
              {t('goodsReceipt.settle.notRetryable')}
            </span>
          )
        ) : (
          <span className="text-xs text-text-tertiary self-center">
            {t('goodsReceipt.settle.inFlight')}
          </span>
        );
      case 'Posted to SAP':
        return (
          <Button
            variant="secondary"
            onClick={() =>
              toast({
                variant: 'info',
                title: t('goodsReceipt.toast.openingSap.title'),
                description: g.sapMaterialDoc ?? t('goodsReceipt.toast.openingSap.fallbackDoc'),
              })
            }
          >
            {t('goodsReceipt.footer.viewInSap')}
          </Button>
        );
      default:
        return null;
    }
  };

  const handleExport = () =>
    toast({
      variant: 'info',
      title: t('goodsReceipt.toast.export.title'),
      description: t('goodsReceipt.toast.export.desc'),
    });

  const handleLabResults = () =>
    toast({
      variant: 'info',
      title: t('goodsReceipt.toast.labOverview.title'),
      description: t('goodsReceipt.toast.labOverview.desc'),
    });

  const handleNewGR = () => {
    setWizardAsnId(undefined);
    setWizardResumeId(null);
    setWizardOpen(true);
  };

  // Post to SAP (Option B): dispatch t_gr_post → the GR shows the interim
  // 'Posting to SAP' with NO material document; the async SAP callback settles
  // ~a moment later → 'Posted to SAP' + the real material document. Both phases
  // are observable because each command invalidates the scoped read.
  const handlePostToSap = (g: GoodsReceipt) => {
    postMutation.mutate(
      { grId: g.id },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'warning',
              title: t('gr.post.failed.title', { grNumber: g.grNumber }),
              description: refusalText(res.reason) ?? t('gr.post.failed.desc', { reason: res.reason ?? '' }),
            });
            return;
          }
          toast({
            variant: 'info',
            title: t('gr.post.posting.title', { grNumber: g.grNumber }),
            description: t('gr.post.posting.desc'),
          });
          const { correlationId } = res;
          // §91e — watched from the moment the boundary is crossed, so the
          // interim state can account for the wait as well as for a failure.
          watchSettle(g.id, correlationId, null);
          window.setTimeout(() => {
            settleMutation.mutate(
              { correlationId },
              {
                onSuccess: () => {
                  clearSettle(g.id);
                  toast({
                    variant: 'success',
                    title: t('gr.post.posted.title', { grNumber: g.grNumber }),
                    description: t('gr.post.posted.desc'),
                  });
                },
                // ⚠️ THE HOOK'S `onError` STILL FIRES — this does not replace
                // it. `useGoodsReceiptSettle` carries `useSettleErrorToast`,
                // which classifies the fault and names its remedy (§43); this
                // records the fault ON THE ROW so the account outlives the
                // toast. TanStack runs the mutation-level callback first.
                onError: (err) => watchSettle(g.id, correlationId, classifySettleFault(err)),
              },
            );
          }, 1200);
        },
        onError: () =>
          toast({ variant: 'error', title: t('gr.denied.title'), description: t('gr.denied.desc') }),
      },
    );
  };

  // §91e — re-attempt a settle THIS session started and saw fail. Honest because
  // the dispatcher leaves a failed settle `submitted` and its `pending` context
  // undeleted: the same correlationId is genuinely re-settleable, and
  // `SETTLE_FAULT_RETRYABLE` decides which faults can legitimately answer
  // differently on a second ask. A REFUSED or UNGOVERNED fault gets no button —
  // a governed answer does not change, and offering the retry anyway would be
  // the `PF-1a` shape: an affordance promising what it cannot do.
  const retrySettle = (grId: string) => {
    const watch = settleWatch[grId];
    if (!watch) return;
    settleMutation.mutate(
      { correlationId: watch.correlationId },
      {
        onSuccess: () => {
          clearSettle(grId);
          toast({
            variant: 'success',
            title: t('gr.settle.retried.title'),
            description: t('gr.settle.retried.desc'),
          });
        },
        onError: (err) => watchSettle(grId, watch.correlationId, classifySettleFault(err)),
      },
    );
  };

  // PF-1a — release a held GR for re-inspection (t_gr_request_retest). Payload-
  // free: the hold already recorded its reason. On success the GR re-derives to
  // 'Under Inspection', where the disposition verbs become legal again — which
  // is the whole point of the edge, and the reason the panel is left open rather
  // than closed: the inspector's next action is on this same GR.
  const handleRequestRetest = (g: GoodsReceipt) => {
    retestMutation.mutate(
      { grId: g.id },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'warning',
              title: t('goodsReceipt.retest.failed.title', { grNumber: g.grNumber }),
              description: refusalText(res.reason) ?? res.reason ?? t('goodsReceipt.retest.failed.desc'),
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('goodsReceipt.retest.done.title', { grNumber: g.grNumber }),
            description: t('goodsReceipt.retest.done.desc'),
          });
        },
        onError: () =>
          toast({ variant: 'error', title: t('gr.denied.title'), description: t('gr.denied.desc') }),
      },
    );
  };

  // §91e — the wizard sequences create → dispose → post → settle and then
  // CLOSES, so a settle it saw fail would take the correlationId with it and the
  // GR would land on this page parked, with the retry unreachable for the one
  // path most likely to produce it. The wizard hands the failure up; the page
  // watches it exactly as if it had issued the settle itself.
  const handleWizardComplete = (failed?: FailedSettle) => {
    setWizardOpen(false);
    if (failed) watchSettle(failed.grId, failed.correlationId, failed.fault);
  };

  const discrepancyColumns: Column<ASN>[] = [
    {
      id: 'asn',
      header: t('goodsReceipt.discrepancy.col.asn'),
      kind: 'id',
      cell: (asn) => <Data>{asn.asnNumber}</Data>,
    },
    {
      id: 'po',
      header: t('goodsReceipt.discrepancy.col.po'),
      kind: 'id',
      cell: (asn) => <Data>{asn.poReference}</Data>,
    },
    {
      id: 'carrier',
      header: t('goodsReceipt.discrepancy.col.carrier'),
      kind: 'text',
      cell: (asn) => asn.carrier,
    },
    {
      id: 'status',
      header: t('goodsReceipt.discrepancy.col.status'),
      kind: 'status',
      // Tone from the `statusTone` SSoT and the LABEL from `StatusPill`'s own
      // `statusLabelKey` lookup — the raw canonical token is passed
      // deliberately. Wrapping it in `el()` first would hand the pill an
      // already-localized string, which in ID resolves to nothing and falls
      // through to the Indonesian text as a literal.
      cell: (asn) => <StatusPill variant={statusTone(asn.status)}>{asn.status}</StatusPill>,
    },
    {
      id: 'resolve',
      header: ' ',
      kind: 'actions',
      cell: (asn) =>
        resolveAvailability.kind === 'held' ? (
          <Button
            variant="outline"
            disabled={resolveDiscrepancyMutation.isPending}
            onClick={() => handleResolveDiscrepancy(asn.asnNumber)}
          >
            {resolveDiscrepancyMutation.isPending
              ? t('goodsReceipt.discrepancy.resolving')
              : t('goodsReceipt.discrepancy.action')}
          </Button>
        ) : (
          <HandoffNotice availability={resolveAvailability} testId="handoff-asn-resolve" />
        ),
    },
  ];

  const receiptColumns: Column<GoodsReceipt>[] = [
    {
      id: 'grRefs',
      header: t('goodsReceipt.table.col.grRefs'),
      kind: 'id',
      cell: (g) => (
        <>
          <Data as="div">{g.grNumber}</Data>
          <CellSub>
            {g.asnNumber} · {g.poNumber}
          </CellSub>
        </>
      ),
    },
    {
      id: 'supplier',
      header: t('goodsReceipt.table.col.supplier'),
      kind: 'text',
      cell: (g) => {
        const sup = supplierById.get(g.supplierId);
        return (
          <>
            {g.supplierName}
            <CellSub>{sup ? COUNTRY_FLAG[sup.country] ?? sup.country : '—'}</CellSub>
          </>
        );
      },
    },
    {
      id: 'received',
      header: t('goodsReceipt.table.col.received'),
      kind: 'date',
      cell: (g) => <Data>{formatDate(g.receivedDate)}</Data>,
    },
    {
      id: 'receivedBy',
      header: t('goodsReceipt.table.col.receivedBy'),
      kind: 'text',
      cell: (g) => (
        <span data-testid={`gr-receiver-${g.id}`}>
          {/* ADM-1 — the named receiver when the receipt carries one;
              the receiving post alone on a receipt that predates it. */}
          {g.receivedByPerson && isAttributed(g.receivedByPerson)
            ? personLabel(g.receivedByPerson.person.personId, t)
            : g.receivedBy}
        </span>
      ),
    },
    {
      id: 'items',
      header: t('goodsReceipt.table.col.items'),
      kind: 'text',
      cell: (g) =>
        g.inspectionResults.length === 1
          ? t('goodsReceipt.items.count.one', { count: g.inspectionResults.length })
          : t('goodsReceipt.items.count.other', { count: g.inspectionResults.length }),
    },
    {
      id: 'status',
      header: t('goodsReceipt.table.col.status'),
      kind: 'status',
      cell: (g) => <StatusPill variant={STATUS_VARIANT[g.status]}>{g.status}</StatusPill>,
    },
    {
      id: 'disposition',
      header: t('goodsReceipt.table.col.disposition'),
      kind: 'text',
      cell: (g) => el(g.disposition),
    },
    {
      id: 'sapDoc',
      header: t('goodsReceipt.table.col.sapDoc'),
      kind: 'id',
      cell: (g) => <Data>{g.sapMaterialDoc ?? '—'}</Data>,
    },
    {
      id: 'open',
      header: ' ',
      kind: 'actions',
      cell: () => <ChevronRight size={16} className="text-text-tertiary inline" />,
    },
  ];

  const inspectionColumns: Column<InspectionResult>[] = [
    {
      id: 'material',
      header: t('goodsReceipt.panel.col.material'),
      kind: 'id',
      cell: (r) => (
        <>
          <Data as="div">{r.materialCode}</Data>
          <CellSub className="truncate whitespace-nowrap max-w-[180px]">{r.description}</CellSub>
          {r.rejectionReason && <CellSub tone="critical">{r.rejectionReason}</CellSub>}
        </>
      ),
    },
    {
      id: 'exp',
      header: t('goodsReceipt.panel.col.exp'),
      kind: 'number',
      cell: (r) => <Data>{formatNumber(r.qtyExpected)}</Data>,
    },
    {
      id: 'recv',
      header: t('goodsReceipt.panel.col.recv'),
      kind: 'number',
      cell: (r) => <Data>{formatNumber(r.qtyReceived)}</Data>,
    },
    {
      id: 'acc',
      header: t('goodsReceipt.panel.col.acc'),
      kind: 'number',
      className: 'text-success',
      cell: (r) => <Data>{formatNumber(r.qtyAccepted)}</Data>,
    },
    {
      id: 'rej',
      header: t('goodsReceipt.panel.col.rej'),
      kind: 'number',
      className: 'text-critical',
      cell: (r) => <Data>{formatNumber(r.qtyRejected)}</Data>,
    },
    {
      id: 'checks',
      header: t('goodsReceipt.panel.col.checks'),
      kind: 'status',
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          <StatusPill variant={CHECK_VARIANT[r.visualCheck] ?? 'neutral'}>V</StatusPill>
          <StatusPill variant={CHECK_VARIANT[r.packagingCheck] ?? 'neutral'}>P</StatusPill>
          {r.halalSealCheck && (
            <StatusPill variant={CHECK_VARIANT[r.halalSealCheck] ?? 'neutral'}>H</StatusPill>
          )}
          {r.bpomLotCheck && (
            <StatusPill variant={CHECK_VARIANT[r.bpomLotCheck] ?? 'neutral'}>B</StatusPill>
          )}
        </div>
      ),
    },
  ];

  return (
    <ListPage
      breadcrumb={[t('goodsReceipt.crumb.gr')]}
      title={t('goodsReceipt.header.title')}
      subtitle={t('goodsReceipt.header.subtitle')}
      actions={
          // §73 — ONE NOTICE, AT THE ENTRY, AND THE MEASUREMENT IS WHY.
          // "New GR" opens a four-step wizard whose LAST step fires the whole
          // chain in one handler: t_gr_create -> t_gr_start_inspection ->
          // t_gr_post -> settle. There is ONE commit, not four, so there is one
          // place a handoff can honestly sit. Repeating the same string at each
          // step would teach nothing after the first.
          //
          // Guarded on ALL THREE atoms, not on the first: the button starts a
          // flow that cannot finish without every one of them. Today they agree
          // in every case (all three sit in `receiving` and nowhere else), so
          // this renders exactly one behaviour — and `grChainAgrees` in the spec
          // pins that agreement, so the day a bundle splits `gr:inspect` into a
          // QA role the suite says so instead of the button silently admitting
          // a seat the commit will refuse.
          <div className="flex items-center gap-3">
            <HandoffNotice availability={grChainAvailability} testId="handoff-gr-create" />
            <BulkActionsBar
              actions={[
                {
                  label: t('goodsReceipt.action.export'),
                  icon: FileSpreadsheet,
                  onClick: handleExport,
                },
                {
                  label: t('goodsReceipt.action.labResults'),
                  icon: FlaskConical,
                  onClick: handleLabResults,
                },
              ]}
              {...(grChainAvailability.kind === 'held'
                ? {
                    primary: {
                      label: t('gr.create.action'),
                      icon: Plus,
                      onClick: handleNewGR,
                    },
                  }
                : {})}
            />
          </div>
        }
      meta={
        <>
        {counts.all === 1
          ? t('goodsReceipt.meta.count.one', { count: counts.all })
          : t('goodsReceipt.meta.count.other', { count: counts.all })}{' '}
        · {t('goodsReceipt.meta.lastPosted')} <Data>{formatDate(TODAY)}</Data>
        {/* D-CENSUS-8 — PARTLY REAL, both axes. `goodsReceipt` is wired: Post and
            Settle genuinely dispatch, run the E4 enforcement checks and write the
            DR-10 trail. The receipts listed are fixtures. */}
        <ProvenanceMarker capability="goodsReceipts" className="ml-3 align-middle" />
        </>
      }
      kpis={
        <>
        <KpiCard
          eyebrow={t('goodsReceipt.kpi.pending.eyebrow')}
          value={formatNumber(counts.pending)}
          icon={ClipboardCheck}
          subtitle={t('goodsReceipt.kpi.pending.subtitle')}
        />
        <KpiCard
          eyebrow={t('goodsReceipt.kpi.hold.eyebrow')}
          value={
            <span className="text-critical">{formatNumber(counts.hold)}</span>
          }
          icon={AlertTriangle}
          subtitle={t('goodsReceipt.kpi.hold.subtitle')}
        />
        <KpiCard
          eyebrow={t('goodsReceipt.kpi.approvedToday.eyebrow')}
          value={formatNumber(approvedToday)}
          icon={CheckCircle2}
          subtitle={formatDate(TODAY)}
        />
        <KpiCard
          eyebrow={t('goodsReceipt.kpi.rejectionRate.eyebrow')}
          value={`${rejectionRate.toFixed(1)}%`}
          icon={TrendingDown}
          subtitle={t('goodsReceipt.kpi.rejectionRate.subtitle')}
        />
        </>
      }
      lead={
      /* ── SHIPMENT DISCREPANCIES ────────────────────────────────────────────
          The exit from `Discrepancy`, on the desk that entered it.

          ⚠️ **IT IS ITS OWN SECTION RATHER THAN A CONTROL IN THE GR PANEL, AND
          THE REASON IS MEASURED, NOT STYLISTIC.** The GR panel already shows
          `selected.asnNumber`, which makes it the obvious anchor — but the GR
          fixtures reference `ASN-2026-0xx` and the ASN store holds
          `ASN-2025-002xx` / `ASN-2025-003xx`: **the intersection is EMPTY (14
          refs × 6 ASNs × 0 shared)**. A control hung off `selected.asnNumber`
          would therefore be reachable ONLY from a wizard-created GR and never
          from a seeded row — the seeded `ASN-2025-00201` would carry a
          discrepancy nobody could open. Keyed on the ASN instead, both the
          seeded row and the cascade's output are reachable on the same surface.

          ⚠️ **ABSENT WHEN EMPTY IS NOT THE WITHHELD-AS-ABSENT DEFECT.** Nothing
          is being hidden from a narrow seat here: with no flagged ASN there is
          no act for anyone, held or not. When a row EXISTS, a seat without
          `asn:flag` gets the notice in the same cell the button would occupy —
          which is the rule the grammar actually states. */
      discrepancyAsns.length > 0 && (
        <section
          className="border border-border-subtle rounded-lg bg-white overflow-hidden"
          data-testid="gr-asn-discrepancies"
        >
          <div className="px-6 py-4 border-b border-border-subtle">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <AlertTriangle size={16} className="text-warning" aria-hidden="true" />
              {t('goodsReceipt.discrepancy.heading')}
            </h2>
            <p className="mt-1 text-xs text-text-secondary">
              {t('goodsReceipt.discrepancy.subtitle')}
            </p>
          </div>
          <DataTable
            columns={discrepancyColumns}
            rows={discrepancyAsns}
            rowKey={(asn) => asn.asnNumber}
            card={false}
          />
        </section>
      )
      }
      tabs={
      <SubTabs<GroupTab>
        options={[
          { id: 'all', label: t('goodsReceipt.tab.all'), count: counts.all },
          { id: 'pending', label: t('goodsReceipt.tab.pending'), count: counts.pending },
          {
            id: 'under-inspection',
            label: t('goodsReceipt.tab.underInspection'),
            count: counts.underInspection,
          },
          { id: 'approved', label: t('goodsReceipt.tab.approved'), count: counts.approved },
          { id: 'hold', label: t('goodsReceipt.tab.hold'), count: counts.hold },
          { id: 'rejected', label: t('goodsReceipt.tab.rejected'), count: counts.rejected },
          { id: 'posted', label: t('goodsReceipt.tab.posted'), count: counts.posted },
        ]}
        value={tab}
        onChange={setTab}
      />
      }
      search={
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={t('goodsReceipt.search.placeholder')}
          />
      }
      filters={
        <FilterChipsBar<DateFilter>
          options={[
            { id: 'today', label: t('goodsReceipt.filter.today') },
            { id: 'week', label: t('goodsReceipt.filter.week') },
            { id: 'month', label: t('goodsReceipt.filter.month') },
            { id: '30d', label: t('goodsReceipt.filter.30d') },
            { id: 'all', label: t('goodsReceipt.filter.all') },
          ]}
          value={dateFilter}
          onChange={setDateFilter}
        />
      }
    >
      <DataTable
        columns={receiptColumns}
        rows={filtered}
        rowKey={(g) => g.id}
        onRowClick={(g) => setSelectedId(g.id)}
        empty={t('goodsReceipt.table.empty')}
      />

      <SidePanel
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected ? selected.grNumber : ''}
        footerActions={selected ? footerForStatus(selected) : null}
      >
        {selected && (
          <div className="flex flex-col gap-6">
            <section>
              <div className="text-label text-text-tertiary uppercase mb-2">
                {t('goodsReceipt.panel.keyFacts')}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-text-tertiary">{t('goodsReceipt.panel.field.gr')}</div>
                  <div className="font-semibold text-text-primary">
                    <Data>{selected.grNumber}</Data>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">{t('goodsReceipt.panel.field.asn')}</div>
                  <Data as="div" className="text-text-primary">
                    {selected.asnNumber}
                  </Data>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">{t('goodsReceipt.panel.field.po')}</div>
                  <Data as="div" className="text-text-primary">
                    {selected.poNumber}
                  </Data>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">
                    {t('goodsReceipt.panel.field.sapMaterialDoc')}
                  </div>
                  <Data as="div" className="text-text-primary">
                    {selected.sapMaterialDoc ?? '—'}
                  </Data>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-text-tertiary">{t('goodsReceipt.panel.field.supplier')}</div>
                  <div className="text-text-primary">
                    {selected.supplierName}{' '}
                    {selectedSupplier && (
                      <span className="text-xs text-text-tertiary">
                        ·{' '}
                        {COUNTRY_FLAG[selectedSupplier.country] ??
                          selectedSupplier.country}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">
                    {t('goodsReceipt.panel.field.receivedDate')}
                  </div>
                  <div className="text-text-primary">
                    <Data>{formatDate(selected.receivedDate)}</Data>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">{t('goodsReceipt.panel.field.receivedBy')}</div>
                  {/* ADM-1 — WHO and WHEN. The person is the seat's, stamped when
                      the receipt was raised; the post is what the wizard chose. */}
                  {selected.receivedByPerson && isAttributed(selected.receivedByPerson) ? (
                    <div className="text-text-primary" data-testid="gr-panel-receiver">
                      {personLabel(selected.receivedByPerson.person.personId, t)}
                      <span className="text-text-tertiary"> · {selected.receivedBy}</span>
                      {selected.receivedAt && (
                        <div className="text-xs text-text-tertiary" data-testid="gr-panel-received-at">
                          {t('goodsReceipt.panel.field.recordedAt')} <Data>{formatSetAt(selected.receivedAt)}</Data>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-text-primary" data-testid="gr-panel-receiver">
                      {selected.receivedBy}
                      <div className="text-xs text-text-tertiary">{t('goodsReceipt.panel.field.noNamedReceiver')}</div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">{t('goodsReceipt.panel.field.status')}</div>
                  <StatusPill variant={STATUS_VARIANT[selected.status]}>
                    {selected.status}
                  </StatusPill>
                  <span className="mt-1 block">
                    <NextActLine act={nextAct} testId="next-act-buyer-gr" />
                  </span>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">{t('goodsReceipt.panel.field.disposition')}</div>
                  <div className="text-text-primary">{el(selected.disposition)}</div>
                </div>
              </div>
            </section>

            <section>
              <div className="text-label text-text-tertiary uppercase mb-2">
                {t('goodsReceipt.panel.lineItems')}
              </div>
              <div className="overflow-x-auto">
                <DataTable
                  columns={inspectionColumns}
                  rows={selected.inspectionResults}
                  rowKey={(_r, i) => String(i)}
                  density="compact"
                  card={false}
                />
              </div>
              <div className="text-xs text-text-tertiary mt-2">
                {t('goodsReceipt.panel.legend')}
              </div>
            </section>

            {selected.notes && (
              <section>
                <div className="text-label text-text-tertiary uppercase mb-2">
                  {t('goodsReceipt.panel.inspectionNotes')}
                </div>
                <p className="text-sm text-text-secondary border border-border-subtle rounded-md p-3 bg-bg-hover">
                  {selected.notes}
                </p>
              </section>
            )}

            <section>
              <div className="text-label text-text-tertiary uppercase mb-2">
                {t('goodsReceipt.panel.dispositionWorkflow')}
              </div>
              <Timeline events={buildTimeline(selected)} />
            </section>
          </div>
        )}
      </SidePanel>

      {wizardOpen && (
        <GRInspectionWizard
          // Keyed on what it works, so opening it on a different receipt never
          // inherits the last one's draft.
          key={wizardResumeId ?? 'new'}
          onClose={() => setWizardOpen(false)}
          onComplete={handleWizardComplete}
          initialAsnId={wizardAsnId}
          shipments={shipments}
          asns={asns}
          enforcementSettings={enforcementSettings}
          complianceRegistry={complianceRegistry}
          materialRulings={materialRulings}
          resume={
            wizardResumeId ? allGRs.find((g) => g.id === wizardResumeId) : undefined
          }
        />
      )}
    </ListPage>
  );
};

// Wrapper: reads the QC command-center data through the scoped hooks and renders
// the four honest states; the workspace inner holds the local (Phase-2′,
// non-persisting) inspection-wizard state seeded from the resolved reads.
const BuyerGoodsReceipt: React.FC = () => {
  const { t } = useTranslation();
  const GR_CRUMB = [t('goodsReceipt.crumb.gr')];
  const grQuery = useGoodsReceipts();
  const suppliersQuery = useSuppliers();
  const shipmentsQuery = useShipments();
  const asnsQuery = useASNs();
  // CP-3 · E4 — the enforcement ledger joins the page's reads rather than being
  // fetched inside the wizard. A gate whose governing record is still loading
  // has no honest answer to give, and the page already owns the four states.
  const enforcementQuery = useEnforcementSettings();
  // CP-3 · H4 — the certificate side joins the same read set. Buyer scope reads
  // the superset; the service applies the scoping contract, not this page.
  const registryQuery = useComplianceRegistry();
  // OPS-2 — and the applicability rulings join it, for the same reason.
  const rulingsQuery = useMaterialRulings();

  if (
    rulingsQuery.isPending ||
    grQuery.isPending ||
    suppliersQuery.isPending ||
    shipmentsQuery.isPending ||
    asnsQuery.isPending ||
    enforcementQuery.isPending ||
    registryQuery.isPending
  )
    return <LoadingState breadcrumb={GR_CRUMB} />;
  if (
    rulingsQuery.isError ||
    grQuery.isError ||
    suppliersQuery.isError ||
    shipmentsQuery.isError ||
    asnsQuery.isError ||
    enforcementQuery.isError ||
    registryQuery.isError
  )
    return (
      <ErrorState
        breadcrumb={GR_CRUMB}
        error={
          grQuery.error ??
          suppliersQuery.error ??
          shipmentsQuery.error ??
          asnsQuery.error ??
          enforcementQuery.error ??
          registryQuery.error ??
          rulingsQuery.error
        }
        onRetry={() => {
          grQuery.refetch();
          suppliersQuery.refetch();
          shipmentsQuery.refetch();
          asnsQuery.refetch();
          enforcementQuery.refetch();
          registryQuery.refetch();
          rulingsQuery.refetch();
        }}
      />
    );

  const goodsReceipts = grQuery.data?.items ?? [];

  if (goodsReceipts.length === 0)
    return (
      <EmptyState
        breadcrumb={GR_CRUMB}
        title={t('goodsReceipt.empty.title')}
        subtitle={t('goodsReceipt.empty.subtitle')}
        message={t('goodsReceipt.empty.message')}
      />
    );

  return (
    <GoodsReceiptWorkspace
      goodsReceipts={goodsReceipts}
      suppliers={suppliersQuery.data?.items ?? []}
      shipments={shipmentsQuery.data?.items ?? []}
      asns={asnsQuery.data?.items ?? []}
      enforcementSettings={enforcementQuery.data?.items ?? []}
      complianceRegistry={registryQuery.data?.items ?? []}
      materialRulings={rulingsQuery.data?.items ?? []}
    />
  );
};

export default BuyerGoodsReceipt;
