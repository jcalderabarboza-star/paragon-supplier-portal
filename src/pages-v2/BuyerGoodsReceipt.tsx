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
import {
  useGoodsReceiptPost,
  useGoodsReceiptSettle,
} from '../services/query/commandHooks';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import { useGoodsReceipts, useSuppliers, useShipments, useASNs } from '../services/query/hooks';
import type {
  GoodsReceipt,
  GRStatus,
  InspectionResult,
  Supplier,
  Shipment,
  ASN,
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
}

const GoodsReceiptWorkspace: React.FC<GoodsReceiptWorkspaceProps> = ({
  goodsReceipts,
  suppliers,
  shipments,
  asns,
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const postMutation = useGoodsReceiptPost();
  const settleMutation = useGoodsReceiptSettle();
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
        title: 'Received',
        timestamp: formatDate(g.receivedDate),
        status: 'completed',
      },
      {
        id: 't2',
        title: 'Inspection Started',
        status: at(2),
      },
      {
        id: 't3',
        title: 'Lab Results Received',
        timestamp: hasLab
          ? g.inspectionResults.find((r) => r.labResultId)?.labResultId
          : 'No lab required',
        status: hasLab ? (cur >= 3 ? 'completed' : 'current') : 'pending',
      },
      {
        id: 't4',
        title: 'Disposition Decision',
        timestamp: g.disposition !== 'Pending' ? g.disposition : undefined,
        status: at(4),
      },
      {
        id: 't5',
        title: 'Posted to SAP',
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
            Start inspection
          </Button>
        );
      case 'Under Inspection':
        return (
          <Button
            variant="outline"
            onClick={() =>
              toast({
                variant: 'info',
                title: 'Inspection results',
                description: 'Submit form will open in a future release.',
              })
            }
          >
            Submit inspection results
          </Button>
        );
      case 'Quality Hold':
        return (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                toast({
                  variant: 'info',
                  title: 'Retest requested',
                  description: 'Lab retest queued.',
                })
              }
            >
              Request lab retest
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                toast({
                  variant: 'warning',
                  title: 'Hold override requested',
                  description: 'Awaiting QC manager approval.',
                })
              }
            >
              Override hold
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
                title: 'Opening SAP',
                description: g.sapMaterialDoc ?? 'Material document',
              })
            }
          >
            View in SAP
          </Button>
        );
      default:
        return null;
    }
  };

  const handleExport = () =>
    toast({
      variant: 'info',
      title: 'Export queued',
      description: 'Goods receipts export will download shortly.',
    });

  const handleLabResults = () =>
    toast({
      variant: 'info',
      title: 'Lab results overview',
      description: 'Lab dashboard will open in a future release.',
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

  const handleWizardComplete = () => setWizardOpen(false);

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={['TRANSACT', 'GOODS RECEIPT & QC']}
        title="Goods Receipt & Quality Control"
        subtitle="Receipt posting, inspection workflows, lab results, and disposition decisions."
        actions={
          <BulkActionsBar
            actions={[
              {
                label: 'Export',
                icon: FileSpreadsheet,
                onClick: handleExport,
              },
              {
                label: 'Lab Results',
                icon: FlaskConical,
                onClick: handleLabResults,
              },
            ]}
            primary={{ label: 'New GR', icon: Plus, onClick: handleNewGR }}
          />
        }
      />

      <PageMetaLine className="mb-6">
        {counts.all} GRs this month · last posted <Data>{formatDate(TODAY)}</Data>
      </PageMetaLine>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          eyebrow="Pending Inspection"
          value={formatNumber(counts.pending)}
          icon={ClipboardCheck}
          subtitle="Awaiting QC start"
        />
        <KpiCard
          eyebrow="On Quality Hold"
          value={
            <span className="text-danger">{formatNumber(counts.hold)}</span>
          }
          icon={AlertTriangle}
          subtitle="Quarantined / retest"
        />
        <KpiCard
          eyebrow="Approved Today"
          value={formatNumber(approvedToday)}
          icon={CheckCircle2}
          subtitle={formatDate(TODAY)}
        />
        <KpiCard
          eyebrow="Rejection Rate (30d)"
          value={`${rejectionRate.toFixed(1)}%`}
          icon={TrendingDown}
          subtitle="Qty rejected / received"
        />
      </div>

      <SubTabs<GroupTab>
        options={[
          { id: 'all', label: 'All', count: counts.all },
          { id: 'pending', label: 'Pending', count: counts.pending },
          {
            id: 'under-inspection',
            label: 'Under Inspection',
            count: counts.underInspection,
          },
          { id: 'approved', label: 'Approved', count: counts.approved },
          { id: 'hold', label: 'Quality Hold', count: counts.hold },
          { id: 'rejected', label: 'Rejected', count: counts.rejected },
          { id: 'posted', label: 'Posted', count: counts.posted },
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
            placeholder="Search by GR, ASN, PO, or supplier..."
          />
        </div>
        <FilterChipsBar<DateFilter>
          options={[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This week' },
            { id: 'month', label: 'This month' },
            { id: '30d', label: 'Last 30 days' },
            { id: 'all', label: 'All time' },
          ]}
          value={dateFilter}
          onChange={setDateFilter}
        />
      </div>

      <div className="border border-border-subtle rounded-lg bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableHeaderCell>GR / Refs</TableHeaderCell>
            <TableHeaderCell>Supplier</TableHeaderCell>
            <TableHeaderCell>Received</TableHeaderCell>
            <TableHeaderCell>Received By</TableHeaderCell>
            <TableHeaderCell>Items</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Disposition</TableHeaderCell>
            <TableHeaderCell>SAP Doc</TableHeaderCell>
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
                      {g.inspectionResults.length} item
                      {g.inspectionResults.length === 1 ? '' : 's'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={STATUS_VARIANT[g.status]}>
                      {g.status}
                    </StatusPill>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-text-secondary">
                      {g.disposition}
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
                  No goods receipts match the current filters.
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
                Key facts
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-text-tertiary">GR #</div>
                  <div className="font-semibold text-text-primary">
                    <Data>{selected.grNumber}</Data>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">ASN #</div>
                  <Data as="div" className="text-text-primary">
                    {selected.asnNumber}
                  </Data>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">PO #</div>
                  <Data as="div" className="text-text-primary">
                    {selected.poNumber}
                  </Data>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">
                    SAP Material Doc
                  </div>
                  <Data as="div" className="text-text-primary">
                    {selected.sapMaterialDoc ?? '—'}
                  </Data>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-text-tertiary">Supplier</div>
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
                    Received Date
                  </div>
                  <div className="text-text-primary">
                    <Data>{formatDate(selected.receivedDate)}</Data>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">Received By</div>
                  <div className="text-text-primary">{selected.receivedBy}</div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">Status</div>
                  <StatusPill variant={STATUS_VARIANT[selected.status]}>
                    {selected.status}
                  </StatusPill>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">Disposition</div>
                  <div className="text-text-primary">{selected.disposition}</div>
                </div>
              </div>
            </section>

            <section>
              <div className="text-label text-text-tertiary uppercase mb-2">
                Line items
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableHeaderCell>Material</TableHeaderCell>
                    <TableHeaderCell className="text-right">
                      Exp
                    </TableHeaderCell>
                    <TableHeaderCell className="text-right">
                      Recv
                    </TableHeaderCell>
                    <TableHeaderCell className="text-right">
                      Acc
                    </TableHeaderCell>
                    <TableHeaderCell className="text-right">
                      Rej
                    </TableHeaderCell>
                    <TableHeaderCell>Checks</TableHeaderCell>
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
                V = Visual · P = Packaging · H = Halal Seal · B = BPOM Lot
              </div>
            </section>

            {selected.notes && (
              <section>
                <div className="text-label text-text-tertiary uppercase mb-2">
                  Inspection notes
                </div>
                <p className="text-sm text-text-secondary border border-border-subtle rounded-md p-3 bg-bg-hover">
                  {selected.notes}
                </p>
              </section>
            )}

            <section>
              <div className="text-label text-text-tertiary uppercase mb-2">
                Disposition workflow
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
        />
      )}
    </AppShellV2>
  );
};

const GR_CRUMB = ['TRANSACT', 'GOODS RECEIPT & QC'];

// Wrapper: reads the QC command-center data through the scoped hooks and renders
// the four honest states; the workspace inner holds the local (Phase-2′,
// non-persisting) inspection-wizard state seeded from the resolved reads.
const BuyerGoodsReceipt: React.FC = () => {
  const grQuery = useGoodsReceipts();
  const suppliersQuery = useSuppliers();
  const shipmentsQuery = useShipments();
  const asnsQuery = useASNs();

  if (
    grQuery.isPending ||
    suppliersQuery.isPending ||
    shipmentsQuery.isPending ||
    asnsQuery.isPending
  )
    return <LoadingState breadcrumb={GR_CRUMB} />;
  if (grQuery.isError || suppliersQuery.isError || shipmentsQuery.isError || asnsQuery.isError)
    return (
      <ErrorState
        breadcrumb={GR_CRUMB}
        error={grQuery.error ?? suppliersQuery.error ?? shipmentsQuery.error ?? asnsQuery.error}
        onRetry={() => {
          grQuery.refetch();
          suppliersQuery.refetch();
          shipmentsQuery.refetch();
          asnsQuery.refetch();
        }}
      />
    );

  const goodsReceipts = grQuery.data?.items ?? [];
  if (goodsReceipts.length === 0)
    return (
      <EmptyState
        breadcrumb={GR_CRUMB}
        title="No goods receipts yet"
        subtitle="No goods receipts have been posted."
        message="Goods receipts and QC inspections appear here as deliveries arrive."
      />
    );

  return (
    <GoodsReceiptWorkspace
      goodsReceipts={goodsReceipts}
      suppliers={suppliersQuery.data?.items ?? []}
      shipments={shipmentsQuery.data?.items ?? []}
      asns={asnsQuery.data?.items ?? []}
    />
  );
};

export default BuyerGoodsReceipt;
