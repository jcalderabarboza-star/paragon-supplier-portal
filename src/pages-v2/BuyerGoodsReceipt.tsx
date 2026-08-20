import React, { useMemo, useState } from 'react';
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
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import SubTabs from '../components/ui-v2/SubTabs';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import SearchBar from '../components/ui-v2/SearchBar';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import SidePanel from '../components/ui-v2/SidePanel';
import Data from '../components/ui-v2/Data';
import Timeline, { TimelineEvent } from '../components/ui-v2/Timeline';
import Button from '../components/ui-v2/Button';
import GRInspectionWizard from '../components/v2-features/GRInspectionWizard';
import { useToast } from '../hooks/useToast';
import { useTranslation } from 'react-i18next';
import { useEnumLabel } from '../hooks/useEnumLabel';
import {
  useGoodsReceiptPost,
  useGoodsReceiptRequestRetest,
  useGoodsReceiptSettle,
} from '../services/query/commandHooks';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import {
  useGoodsReceipts,
  useSuppliers,
  useShipments,
  useASNs,
  useEnforcementSettings,
  useComplianceRegistry,
} from '../services/query/hooks';
import type { EnforcementSetting } from '../lib/enforcement';
import type {
  GoodsReceipt,
  GRStatus,
  InspectionResult,
  Supplier,
  Shipment,
  ASN,
  ComplianceRegistryEntry,
} from '../services/data/types';

const TODAY = '2026-05-20';

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

const formatNumber = (n: number): string =>
  new Intl.NumberFormat('id-ID').format(n);

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
}

const GoodsReceiptWorkspace: React.FC<GoodsReceiptWorkspaceProps> = ({
  goodsReceipts,
  suppliers,
  shipments,
  asns,
  enforcementSettings,
  complianceRegistry,
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
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
        return (
          <Button
            variant="outline"
            onClick={() => {
              setWizardAsnId(g.asnId);
              setSelectedId(null);
              setWizardOpen(true);
            }}
          >
            {t('goodsReceipt.footer.startInspection')}
          </Button>
        );
      case 'Under Inspection':
        return (
          <Button
            variant="outline"
            onClick={() =>
              toast({
                variant: 'info',
                title: t('goodsReceipt.toast.submitResults.title'),
                description: t('goodsReceipt.toast.submitResults.desc'),
              })
            }
          >
            {t('goodsReceipt.footer.submitResults')}
          </Button>
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
            <Button
              variant="secondary"
              disabled={retestMutation.isPending}
              onClick={() => handleRequestRetest(g)}
            >
              {retestMutation.isPending
                ? t('goodsReceipt.retest.submitting')
                : t('goodsReceipt.footer.requestRetest')}
            </Button>
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
              variant="primary"
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
        return (
          <Button
            variant="primary"
            disabled={postMutation.isPending}
            onClick={() => handlePostToSap(g)}
          >
            {t('gr.post.action')}
          </Button>
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
              description: t('gr.post.failed.desc', { reason: res.reason ?? '' }),
            });
            return;
          }
          toast({
            variant: 'info',
            title: t('gr.post.posting.title', { grNumber: g.grNumber }),
            description: t('gr.post.posting.desc'),
          });
          const { correlationId } = res;
          window.setTimeout(() => {
            settleMutation.mutate(
              { correlationId },
              {
                onSuccess: () =>
                  toast({
                    variant: 'success',
                    title: t('gr.post.posted.title', { grNumber: g.grNumber }),
                    description: t('gr.post.posted.desc'),
                  }),
              },
            );
          }, 1200);
        },
        onError: () =>
          toast({ variant: 'error', title: t('gr.denied.title'), description: t('gr.denied.desc') }),
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
              description: res.reason ?? t('goodsReceipt.retest.failed.desc'),
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

  const handleWizardComplete = () => setWizardOpen(false);

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={[t('goodsReceipt.crumb.transact'), t('goodsReceipt.crumb.gr')]}
        title={t('goodsReceipt.header.title')}
        subtitle={t('goodsReceipt.header.subtitle')}
        actions={
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
            primary={{ label: t('gr.create.action'), icon: Plus, onClick: handleNewGR }}
          />
        }
      />

      <PageMetaLine className="mb-6">
        {counts.all === 1
          ? t('goodsReceipt.meta.count.one', { count: counts.all })
          : t('goodsReceipt.meta.count.other', { count: counts.all })}{' '}
        · {t('goodsReceipt.meta.lastPosted')} <Data>{formatDate(TODAY)}</Data>
        {/* D-CENSUS-8 — PARTLY REAL, both axes. `goodsReceipt` is wired: Post and
            Settle genuinely dispatch, run the E4 enforcement checks and write the
            DR-10 trail. The receipts listed are fixtures. */}
        <ProvenanceMarker capability="goodsReceipts" className="ml-3 align-middle" />
      </PageMetaLine>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          eyebrow={t('goodsReceipt.kpi.pending.eyebrow')}
          value={formatNumber(counts.pending)}
          icon={ClipboardCheck}
          subtitle={t('goodsReceipt.kpi.pending.subtitle')}
        />
        <KpiCard
          eyebrow={t('goodsReceipt.kpi.hold.eyebrow')}
          value={
            <span className="text-danger">{formatNumber(counts.hold)}</span>
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
      </div>

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
        className="mb-6"
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex-1 min-w-[280px]">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={t('goodsReceipt.search.placeholder')}
          />
        </div>
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
      </div>

      <div className="border border-border-subtle rounded-lg bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('goodsReceipt.table.col.grRefs')}</TableHeaderCell>
            <TableHeaderCell>{t('goodsReceipt.table.col.supplier')}</TableHeaderCell>
            <TableHeaderCell>{t('goodsReceipt.table.col.received')}</TableHeaderCell>
            <TableHeaderCell>{t('goodsReceipt.table.col.receivedBy')}</TableHeaderCell>
            <TableHeaderCell>{t('goodsReceipt.table.col.items')}</TableHeaderCell>
            <TableHeaderCell>{t('goodsReceipt.table.col.status')}</TableHeaderCell>
            <TableHeaderCell>{t('goodsReceipt.table.col.disposition')}</TableHeaderCell>
            <TableHeaderCell>{t('goodsReceipt.table.col.sapDoc')}</TableHeaderCell>
            <TableHeaderCell> </TableHeaderCell>
          </TableHeader>
          <tbody>
            {filtered.map((g) => {
              const sup = supplierById.get(g.supplierId);
              return (
                <TableRow
                  key={g.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(g.id)}
                >
                  <TableCell>
                    <div className="font-semibold text-text-primary">
                      <Data>{g.grNumber}</Data>
                    </div>
                    <Data as="div" className="text-xs text-text-tertiary">
                      {g.asnNumber} · {g.poNumber}
                    </Data>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-text-primary">
                      {g.supplierName}
                    </div>
                    <div className="text-xs text-text-tertiary">
                      {sup
                        ? COUNTRY_FLAG[sup.country] ?? sup.country
                        : '—'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-text-secondary">
                      <Data>{formatDate(g.receivedDate)}</Data>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-text-secondary">
                      {g.receivedBy}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-text-primary">
                      {g.inspectionResults.length === 1
                        ? t('goodsReceipt.items.count.one', { count: g.inspectionResults.length })
                        : t('goodsReceipt.items.count.other', { count: g.inspectionResults.length })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={STATUS_VARIANT[g.status]}>
                      {g.status}
                    </StatusPill>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-text-secondary">
                      {el(g.disposition)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Data className="text-xs text-text-secondary">
                      {g.sapMaterialDoc ?? '—'}
                    </Data>
                  </TableCell>
                  <TableCell className="text-right">
                    <ChevronRight
                      size={16}
                      className="text-text-tertiary inline"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="py-10 text-center text-sm text-text-tertiary"
                >
                  {t('goodsReceipt.table.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

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
                  <div className="text-text-primary">{selected.receivedBy}</div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">{t('goodsReceipt.panel.field.status')}</div>
                  <StatusPill variant={STATUS_VARIANT[selected.status]}>
                    {selected.status}
                  </StatusPill>
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
                <Table>
                  <TableHeader>
                    <TableHeaderCell>{t('goodsReceipt.panel.col.material')}</TableHeaderCell>
                    <TableHeaderCell className="text-right">
                      {t('goodsReceipt.panel.col.exp')}
                    </TableHeaderCell>
                    <TableHeaderCell className="text-right">
                      {t('goodsReceipt.panel.col.recv')}
                    </TableHeaderCell>
                    <TableHeaderCell className="text-right">
                      {t('goodsReceipt.panel.col.acc')}
                    </TableHeaderCell>
                    <TableHeaderCell className="text-right">
                      {t('goodsReceipt.panel.col.rej')}
                    </TableHeaderCell>
                    <TableHeaderCell>{t('goodsReceipt.panel.col.checks')}</TableHeaderCell>
                  </TableHeader>
                  <tbody>
                    {selected.inspectionResults.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Data as="div" className="text-xs text-text-primary">
                            {r.materialCode}
                          </Data>
                          <div className="text-xs text-text-tertiary truncate max-w-[180px]">
                            {r.description}
                          </div>
                          {r.rejectionReason && (
                            <div className="text-xs text-danger mt-1">
                              {r.rejectionReason}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          <Data>{formatNumber(r.qtyExpected)}</Data>
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          <Data>{formatNumber(r.qtyReceived)}</Data>
                        </TableCell>
                        <TableCell className="text-right text-xs text-success">
                          <Data>{formatNumber(r.qtyAccepted)}</Data>
                        </TableCell>
                        <TableCell className="text-right text-xs text-danger">
                          <Data>{formatNumber(r.qtyRejected)}</Data>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <StatusPill
                              variant={CHECK_VARIANT[r.visualCheck] ?? 'neutral'}
                            >
                              V
                            </StatusPill>
                            <StatusPill
                              variant={
                                CHECK_VARIANT[r.packagingCheck] ?? 'neutral'
                              }
                            >
                              P
                            </StatusPill>
                            {r.halalSealCheck && (
                              <StatusPill
                                variant={
                                  CHECK_VARIANT[r.halalSealCheck] ?? 'neutral'
                                }
                              >
                                H
                              </StatusPill>
                            )}
                            {r.bpomLotCheck && (
                              <StatusPill
                                variant={
                                  CHECK_VARIANT[r.bpomLotCheck] ?? 'neutral'
                                }
                              >
                                B
                              </StatusPill>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </tbody>
                </Table>
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
          onClose={() => setWizardOpen(false)}
          onComplete={handleWizardComplete}
          initialAsnId={wizardAsnId}
          shipments={shipments}
          asns={asns}
          enforcementSettings={enforcementSettings}
          complianceRegistry={complianceRegistry}
        />
      )}
    </AppShellV2>
  );
};

// Wrapper: reads the QC command-center data through the scoped hooks and renders
// the four honest states; the workspace inner holds the local (Phase-2′,
// non-persisting) inspection-wizard state seeded from the resolved reads.
const BuyerGoodsReceipt: React.FC = () => {
  const { t } = useTranslation();
  const GR_CRUMB = [t('goodsReceipt.crumb.transact'), t('goodsReceipt.crumb.gr')];
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

  if (
    grQuery.isPending ||
    suppliersQuery.isPending ||
    shipmentsQuery.isPending ||
    asnsQuery.isPending ||
    enforcementQuery.isPending ||
    registryQuery.isPending
  )
    return <LoadingState breadcrumb={GR_CRUMB} />;
  if (
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
          registryQuery.error
        }
        onRetry={() => {
          grQuery.refetch();
          suppliersQuery.refetch();
          shipmentsQuery.refetch();
          asnsQuery.refetch();
          enforcementQuery.refetch();
          registryQuery.refetch();
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
    />
  );
};

export default BuyerGoodsReceipt;
