import React, { useMemo, useState } from 'react';
import {
  Clock,
  CheckCircle2,
  Wallet,
  Truck,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import SubTabs from '../components/ui-v2/SubTabs';
import StatusPill from '../components/ui-v2/StatusPill';
import { statusTone } from '../lib/statusTone';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import SidePanel from '../components/ui-v2/SidePanel';
import Data from '../components/ui-v2/Data';
import { useTranslation } from 'react-i18next';
import { useToast } from '../hooks/useToast';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import {
  usePurchaseOrderConfirm,
  usePurchaseOrderAcknowledge,
} from '../services/query/commandHooks';
import { userVerbsFrom } from '../services/transitions';
import { useVerbAvailability } from '../hooks/useVerbAvailability';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { POStatus } from '../services/data/types';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import { useCurrentSupplier, usePurchaseOrders } from '../services/query/hooks';
import type { PurchaseOrder } from '../services/data/types';
import type { QtyRefusalReason } from '../lib/localeNumber';
import { confirmedQtyWithinBounds } from '../services/transitions/policies';
import {
  readConfirmedQty,
  readConfirmedQuantities,
  seedConfirmQty,
} from './orders/poConfirmModel';
// GL-1 - the glossary destination for this surface's refusals.
import GlossaryTermChip from '../components/ui-v2/GlossaryTermChip';
import { useRefusalText } from '../hooks/useRefusalText';

type TabKey = 'all' | 'action' | 'progress' | 'completed';
type PanelMode = 'detail' | 'editing' | 'confirmed' | 'change-request';

const ACTION_STATUSES: POStatus[] = [POStatus.SENT, POStatus.ACKNOWLEDGED];
const PROGRESS_STATUSES: POStatus[] = [
  POStatus.CONFIRMED,
  POStatus.PARTIALLY_DELIVERED,
];
const COMPLETED_STATUSES: POStatus[] = [POStatus.DELIVERED, POStatus.CLOSED];

const fmtIDR = (v: number): string => {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `Rp ${Math.round(v / 1_000_000)}jT`;
  return `Rp ${v.toLocaleString()}`;
};

const fmtDate = (s: string): string => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const filterByTab = (tab: TabKey, pos: PurchaseOrder[]): PurchaseOrder[] => {
  if (tab === 'action') return pos.filter((p) => ACTION_STATUSES.includes(p.status));
  if (tab === 'progress')
    return pos.filter((p) => PROGRESS_STATUSES.includes(p.status));
  if (tab === 'completed')
    return pos.filter((p) => COMPLETED_STATUSES.includes(p.status));
  return pos;
};

const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

// CP-0 · W1 · 2f-c — each refusal names what to type instead (the arc-wide
// copy discipline: "invalid input" teaches nothing to a buyer whose number
// reads correctly to them).
const PO_QTY_REFUSAL_KEY: Record<QtyRefusalReason, string> = {
  EMPTY_QTY: 'supplierOrders.confirm.qty.refused.empty',
  NOT_NUMERIC: 'supplierOrders.confirm.qty.refused.notNumeric',
  AMBIGUOUS_QTY: 'supplierOrders.confirm.qty.refused.ambiguous',
};

const SupplierOrders: React.FC = () => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const ORDERS_CRUMB = [
    t('supplierOrders.crumb.transact'),
    t('supplierOrders.crumb.myOrders'),
  ];
  const { toast } = useToast();
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;
  const confirmMutation = usePurchaseOrderConfirm();
  const confirmAvailability = useVerbAvailability('po:confirm');
  const acknowledgeMutation = usePurchaseOrderAcknowledge();
  // ⚠️ **ASKED SEPARATELY FROM `po:confirm`, AND §76 REQUIRES IT RATHER THAN
  // MERELY PERMITTING IT.** The two verbs are CO-REACHABLE on the same document:
  // `t_po_acknowledge` is legal from `Sent | Viewed` and `t_po_confirm` from
  // `Sent | Viewed | Acknowledged`, so a `Sent` PO offers both at once, in two
  // slots, in the same footer. One collapsed notice would name an owner for an
  // act the reader was not looking at — which is exactly the case §76 retired
  // the group notice for. Both atoms sit in `fulfilment` today, so the two
  // answers agree on every seat that exists; they are asked apart so the answer
  // stays right if the lanes ever split.
  const acknowledgeAvailability = useVerbAvailability('po:acknowledge');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('detail');
  // ⚠️ **THE MODE IS DERIVED, NOT READ, AND THAT IS WHAT MAKES THE GUARD COVER
  // EVERY ENTRANCE INSTEAD OF ONE.** `po:confirm` is FULFILMENT's. The commit
  // lives in `panelMode === 'editing'`, and that mode is component STATE reached
  // THREE ways, only one of which passed the notice below:
  //   · `startEditing` — behind the `detail`-footer notice (the guarded door);
  //   · `openOrderPanel(po, 'editing')` from the table's row action — the
  //     PRIMARY path, and it walked straight past it;
  //   · the change-request footer's back-button, re-entering from inside.
  // A seat can also be NARROWED while the panel already stands open, which is
  // reachable rather than a dead branch — `SupplierShipments` states the same
  // reason for gating its wizard TAB rather than the button that opens it.
  //
  // Collapsing 'editing' to 'detail' when the verb is not held answers all four
  // in ONE statement, and it keeps §76's one-notice-per-verb intact: an unheld
  // seat lands on the notice that is ALREADY THERE rather than meeting a second
  // one. `change-request` needs no arm — it holds no atom (its submit is a toast,
  // ungoverned per §75e) and is only reachable THROUGH 'editing'; `confirmed` is
  // only reachable after a successful dispatch, which requires the verb held.
  const effectivePanelMode: PanelMode =
    panelMode === 'editing' && confirmAvailability.kind !== 'held'
      ? 'detail'
      : panelMode;
  // CP-0 · W1 · 2f-c — RAW-BACKED (string[]), the 2f-a state-shape lesson:
  // `number[]` had no representation for a cleared cell, so `Number('')`
  // fabricated a 0 into state and left the policy to bounce it after the fact.
  const [confirmedQtyRaws, setConfirmedQtyRaws] = useState<string[]>([]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [changeText, setChangeText] = useState('');
  const [confirmedAt, setConfirmedAt] = useState<string>('');

  const supplierQuery = useCurrentSupplier();
  const posQuery = usePurchaseOrders();

  const mySupplier = supplierQuery.data ?? null;

  const MY_POS = useMemo(
    () =>
      [...(posQuery.data?.items ?? [])].sort((a, b) =>
        b.orderDate.localeCompare(a.orderDate),
      ),
    [posQuery.data],
  );

  const counts = useMemo(
    () => ({
      all: MY_POS.length,
      action: MY_POS.filter((p) => ACTION_STATUSES.includes(p.status)).length,
      progress: MY_POS.filter((p) => PROGRESS_STATUSES.includes(p.status)).length,
      completed: MY_POS.filter((p) => COMPLETED_STATUSES.includes(p.status))
        .length,
    }),
    [MY_POS],
  );

  const totalValuePending = useMemo(
    () =>
      MY_POS.filter((p) => !COMPLETED_STATUSES.includes(p.status)).reduce(
        (s, p) => s + p.totalValue,
        0,
      ),
    [MY_POS],
  );

  const displayPOs = useMemo(
    () => filterByTab(activeTab, MY_POS),
    [activeTab, MY_POS],
  );

  const maxOrderDate = useMemo(
    () => MY_POS.reduce((a, p) => (p.orderDate > a ? p.orderDate : a), MY_POS[0]?.orderDate ?? ''),
    [MY_POS],
  );

  if (!supplierId) return <NoSupplierIdentity />;
  if (supplierQuery.isPending || posQuery.isPending)
    return <LoadingState breadcrumb={ORDERS_CRUMB} />;
  if (supplierQuery.isError || posQuery.isError)
    return (
      <ErrorState
        breadcrumb={ORDERS_CRUMB}
        error={supplierQuery.error ?? posQuery.error}
        onRetry={() => {
          supplierQuery.refetch();
          posQuery.refetch();
        }}
      />
    );
  if (!mySupplier) return <NoSupplierIdentity />;
  if (MY_POS.length === 0)
    return (
      <EmptyState
        breadcrumb={ORDERS_CRUMB}
        title={t('supplierOrders.empty.title')}
        subtitle={t('supplierOrders.empty.subtitle', { supplier: mySupplier.name })}
        message={t('supplierOrders.empty.message')}
      />
    );

  // Riding fix: the drawer reads a LIVE PO from the invalidated query (not the
  // frozen open-time snapshot), so Key Facts reflects a post-command status —
  // same class as the KPI staleness. Falls back to the snapshot if the row left
  // the current view.
  const selectedLive =
    selected ? MY_POS.find((p) => p.id === selected.id) ?? selected : null;

  // ── CP-0 · W1 · 2f-c — THE ONE READ of the confirm quantities ──────────────
  // Per-line reads so each cell reports ITSELF; one composite for the dispatch.
  // All go through the same `normalizeQty` on the same strings, so a cell's
  // message, the button state and the dispatched payload cannot disagree.
  const lineReads = confirmedQtyRaws.map(readConfirmedQty);
  const qtysRead = readConfirmedQuantities(confirmedQtyRaws);
  // COURTESY MIRROR of the policy bound, per line — same predicate the policy
  // hook runs (`confirmedQtyWithinBounds`, ONE shared expression, so this
  // display structurally cannot drift from the law). The mirror is UX only:
  // it disables Confirm and explains the bound in the operator's language.
  // The POLICY refusal remains the guarantee — a dispatch that bypasses this
  // surface is still refused by the dispatcher, in its own voice.
  const lineBounds = lineReads.map((r, i) =>
    r.ok && selected
      ? confirmedQtyWithinBounds(r.value, selected.lineItems[i]?.quantity ?? 0)
      : true, // an unread cell shows its PARSE refusal; bounds wait for a number
  );
  const allBoundsOk = lineBounds.every(Boolean);
  const allQtysOk = qtysRead.ok && allBoundsOk;

  const openOrderPanel = (po: PurchaseOrder, mode: PanelMode = 'detail') => {
    setSelected(po);
    // Seeded CANONICAL (ungrouped) — these orders run to 150,000+ units, so a
    // display-formatter seed would open every line refusing its own default.
    setConfirmedQtyRaws(po.lineItems.map((li) => seedConfirmQty(li.quantity)));
    setDeliveryDate(po.requestedDeliveryDate);
    setNotes('');
    setChangeText('');
    setConfirmedAt('');
    setPanelMode(mode);
  };

  const closePanel = () => {
    setSelected(null);
    setPanelMode('detail');
  };

  const startEditing = () => setPanelMode('editing');

  // Step 3.10 proof: confirm dispatches t_po_confirm through the service seam
  // (user trigger + confirmedQuantities payload + scope + status + event +
  // invalidation). The store mutation drives the table re-derive on success.
  const confirmOrder = () => {
    if (!selected) return;
    const po = selected;
    // THE FIRST LOCK. Only parsed, in-bounds numbers may dispatch — the button
    // is disabled under any refusal, so this guard is belt-and-braces; the
    // POLICY behind the dispatcher remains the enforcement for anything that
    // does not come through this surface.
    if (!qtysRead.ok || !allBoundsOk) return;
    confirmMutation.mutate(
      { poId: po.id, confirmedQuantities: [...qtysRead.quantities] },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('po.confirm.failed.title', { poNumber: po.poNumber }),
              description: refusalText(result.reason) ?? t('po.confirm.failed.desc', { reason: result.reason ?? '' }),
            });
            return;
          }
          const time = new Date().toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          });
          setConfirmedAt(time);
          setPanelMode('confirmed');
          toast({
            variant: 'success',
            title: t('po.confirm.success.title', { poNumber: po.poNumber }),
            description: t('po.confirm.success.desc', { correlationId: result.correlationId }),
          });
        },
        onError: () => {
          toast({
            variant: 'error',
            title: t('po.confirm.denied.title'),
            description: t('po.confirm.denied.desc'),
          });
        },
      },
    );
  };

  const submitChangeRequest = () => {
    if (!selected) return;
    toast({
      variant: 'info',
      title: t('supplierOrders.toast.changeSubmitted.title', {
        poNumber: selected.poNumber,
      }),
      description: t('supplierOrders.toast.changeSubmitted.desc'),
    });
    closePanel();
  };

  const goToASN = () => {
    if (!selected) return;
    toast({
      title: t('supplierOrders.toast.asnCreation.title', {
        poNumber: selected.poNumber,
      }),
      description: t('supplierOrders.toast.asnContinue'),
    });
    closePanel();
  };

  const handleRowAction = (po: PurchaseOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    if (ACTION_STATUSES.includes(po.status)) {
      openOrderPanel(po, 'editing');
    } else if (po.status === POStatus.CONFIRMED) {
      toast({
        title: t('supplierOrders.toast.creatingAsn.title', {
          poNumber: po.poNumber,
        }),
        description: t('supplierOrders.toast.asnContinue'),
      });
    } else {
      openOrderPanel(po, 'detail');
    }
  };

  // Derived from the PARSED reads only — never summed over a guess. NULL under
  // a refusal: the diff warning is suppressed (the refusals speak instead), and
  // the confirmed-summary total — only reachable after a successful dispatch,
  // which requires every line to have read — renders an em dash rather than a
  // number nobody typed.
  const totalConfirmedQty = qtysRead.ok
    ? qtysRead.quantities.reduce((a, b) => a + b, 0)
    : null;
  const orderedTotalQty = selected
    ? selected.lineItems.reduce((a, li) => a + li.quantity, 0)
    : 0;
  const hasQtyChange =
    totalConfirmedQty !== null && totalConfirmedQty !== orderedTotalQty;
  const hasDateChange =
    selected !== null && deliveryDate !== selected.requestedDeliveryDate;

  const panelTitle = selected ? t('supplierOrders.panel.title', { poNumber: selected.poNumber }) : '';
  // ⚠️ **THE LABEL IS SEAT-DERIVED, BECAUSE THE ACT BEHIND IT ALREADY WAS.**
  // §84 made the ACT honest — `effectivePanelMode` collapses `editing` to
  // `detail` for a seat that does not hold `po:confirm`, so pressing this on an
  // actionable PO opens the order and renders the handoff notice. It did NOT
  // make the LABEL honest: the button still read "Confirm" / "Konfirmasi" and
  // still wore `outline`, DP-2's primary-action register. A control that says
  // Confirm and cannot confirm is the label-names-the-wrong-verb class, and a
  // handler-based census is blind to it — the handler is correct.
  //
  // ⚠️ **NO SECOND CONTROL AND NO SECOND NOTICE (§76 INTACT).** The unheld seat
  // falls back to `view`, a label this page already ships in both locales, which
  // names exactly what pressing it now does. The notice it lands on is the one
  // ALREADY THERE in the detail footer. `confirmAvailability` is seat-level, not
  // per-row, so this costs no per-row derivation.
  //
  // `createAsn` is untouched: it holds no atom (its handler is a toast —
  // ungoverned per §75e), so there is nothing to narrow it against.
  const canConfirmHere = confirmAvailability.kind === 'held';

  // ── ACKNOWLEDGE (`t_po_acknowledge`) ───────────────────────────────────────
  //
  // ⚠️ **LEGALITY IS ASKED OF THE MACHINE, NOT RESTATED HERE.** `userVerbsFrom`
  // reads the registered flow, so this offers the verb exactly where the
  // transition table says it is legal (`Sent | Viewed`) and nowhere else. The
  // page's own `ACTION_STATUSES` is the WRONG list for this: it is
  // `[Sent, Acknowledged]` — a TAB grouping, not a legality one — so keying on
  // it would offer acknowledge on an already-Acknowledged PO (illegal, refused
  // at dispatch) and withhold it from a `Viewed` one (legal). Deriving also
  // means a future edit to the flow reaches this control without anybody
  // remembering to edit a literal here.
  //
  // ⚠️ **AND `Viewed` IS FIXTURE-ONLY, WHICH THIS DELIBERATELY DOES NOT HIDE.**
  // Derived: `t_po_view` is the sole producer of `Viewed` and it has no hook, no
  // caller and no dispatch site anywhere in the tree, so nothing a person can do
  // moves a PO into that state. The two `Viewed` fixture rows (sup-006, sup-011)
  // are therefore stranded. Rendering the control on them is still correct —
  // acknowledge IS legal from `Viewed`, and the surface reports the machine
  // rather than the fixture population. What would be dishonest is the opposite:
  // suppressing a legal verb because today's data cannot reach its from-state.
  const acknowledgeIsLegalOn = (po: PurchaseOrder): boolean =>
    userVerbsFrom('purchaseOrder', po.status).some(
      (v) => v.id === 't_po_acknowledge',
    );

  const acknowledgeOrder = (po: PurchaseOrder) => {
    acknowledgeMutation.mutate(
      { poId: po.id },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'warning',
              title: t('supplierOrders.ack.failed.title', { poNumber: po.poNumber }),
              description:
                refusalText(res.reason) ??
                t('supplierOrders.ack.failed.desc', { reason: res.reason ?? '' }),
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('supplierOrders.ack.success.title', { poNumber: po.poNumber }),
            description: t('supplierOrders.ack.success.desc'),
          });
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('supplierOrders.ack.denied.title'),
            description: t('supplierOrders.ack.denied.desc'),
          }),
      },
    );
  };

  const panelActionLabel = (po: PurchaseOrder): string => {
    if (ACTION_STATUSES.includes(po.status))
      return canConfirmHere
        ? t('supplierOrders.action.confirm')
        : t('supplierOrders.action.view');
    if (po.status === POStatus.CONFIRMED) return t('supplierOrders.action.createAsn');
    return t('supplierOrders.action.view');
  };

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={ORDERS_CRUMB}
        title={t('supplierOrders.header.title')}
        subtitle={t('supplierOrders.header.subtitle', { supplier: mySupplier.name })}
      />

      <PageMetaLine className="-mt-6 mb-6">
        {MY_POS.length === 1
          ? t('supplierOrders.meta.orders.one', { count: MY_POS.length })
          : t('supplierOrders.meta.orders.other', { count: MY_POS.length })}{' '}
        · {t('supplierOrders.meta.lastUpdated')}{' '}
        <Data>{fmtDate(maxOrderDate)}</Data>
        {/* D-CENSUS-8 — PARTLY REAL, both axes. This is the clearest case the census
            named: Confirm/Reject here genuinely dispatch through the wired
            `purchaseOrder` target, run the legality + role + field gates and write
            the DR-10 trail. A flat "Sample" would teach the reader to discount a
            true signal; a green "Live" would claim the orders are real. Both. */}
        <ProvenanceMarker capability="purchaseOrders" className="ml-3 align-middle" />
      </PageMetaLine>

      <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        <KpiCard
          eyebrow={t('supplierOrders.kpi.openOrders.eyebrow')}
          value={counts.action.toString()}
          subtitle={
            counts.action > 0 ? (
              <span className="text-warning-hover">
                {t('supplierOrders.kpi.openOrders.needsAction')}
              </span>
            ) : (
              t('supplierOrders.kpi.openOrders.cleared')
            )
          }
          icon={Clock}
        />
        <KpiCard
          eyebrow={t('supplierOrders.kpi.inProgress.eyebrow')}
          value={counts.progress.toString()}
          subtitle={t('supplierOrders.kpi.inProgress.subtitle')}
          icon={Truck}
        />
        <KpiCard
          eyebrow={t('supplierOrders.kpi.totalValue.eyebrow')}
          value={fmtIDR(totalValuePending)}
          subtitle={t('supplierOrders.kpi.totalValue.subtitle')}
          icon={Wallet}
        />
        <KpiCard
          eyebrow={t('supplierOrders.kpi.delivered.eyebrow')}
          value={counts.completed.toString()}
          subtitle={
            <span className="text-success">
              {t('supplierOrders.kpi.delivered.subtitle')}
            </span>
          }
          icon={CheckCircle2}
        />
      </div>

      <SubTabs<TabKey>
        options={[
          { id: 'all', label: t('supplierOrders.tab.all'), count: counts.all },
          { id: 'action', label: t('supplierOrders.tab.action'), count: counts.action },
          { id: 'progress', label: t('supplierOrders.tab.progress'), count: counts.progress },
          { id: 'completed', label: t('supplierOrders.tab.completed'), count: counts.completed },
        ]}
        value={activeTab}
        onChange={setActiveTab}
        className="mb-5"
      />

      {counts.action > 0 && activeTab !== 'completed' && (
        <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 mb-4 flex items-start gap-2 text-sm text-warning-hover">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>
              {counts.action === 1
                ? t('supplierOrders.banner.needConfirmation.one', {
                    count: counts.action,
                  })
                : t('supplierOrders.banner.needConfirmation.other', {
                    count: counts.action,
                  })}{' '}
            </strong>
            {t('supplierOrders.banner.instruction')}
          </div>
        </div>
      )}

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('supplierOrders.col.po')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierOrders.col.orderDate')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierOrders.col.requestedDelivery')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('supplierOrders.col.items')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('supplierOrders.col.value')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierOrders.col.status')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('supplierOrders.col.action')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {displayPOs.map((po) => (
              <TableRow
                key={po.id}
                className="cursor-pointer"
                onClick={() => openOrderPanel(po, 'detail')}
              >
                <TableCell>
                  <Data className="text-xs font-bold text-text-primary">
                    {po.poNumber}
                  </Data>
                </TableCell>
                <TableCell className="whitespace-nowrap text-text-secondary">
                  <Data>{fmtDate(po.orderDate)}</Data>
                </TableCell>
                <TableCell className="whitespace-nowrap text-text-secondary">
                  <Data>{fmtDate(po.requestedDeliveryDate)}</Data>
                </TableCell>
                <TableCell className="text-right text-text-secondary">
                  {po.lineItems.length}
                </TableCell>
                <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                  <Data>{fmtIDR(po.totalValue)}</Data>
                </TableCell>
                <TableCell>
                  <StatusPill variant={statusTone(po.status)}>
                    {po.status}
                  </StatusPill>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant={
                      ACTION_STATUSES.includes(po.status) && canConfirmHere
                        ? 'outline'
                        : 'secondary'
                    }
                    onClick={(e) => handleRowAction(po, e)}
                  >
                    {panelActionLabel(po)}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {displayPOs.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="text-center text-sm text-text-tertiary py-10"
                >
                  {t('supplierOrders.table.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <SidePanel
        open={selected !== null}
        onClose={closePanel}
        title={panelTitle}
        footerActions={
          selected && (
            <>
              {effectivePanelMode === 'detail' && (
                <>
                  <Button variant="secondary" onClick={closePanel}>
                    {t('supplierOrders.action.close')}
                  </Button>
                  {/* ── ACKNOWLEDGE, IN ITS OWN SLOT ─────────────────────────
                      Rendered on the LIVE row, so the control disappears the
                      moment the dispatch lands and the PO leaves `Sent`. Its
                      condition is `acknowledgeIsLegalOn` — the machine's answer,
                      not `ACTION_STATUSES` (see that helper's note: the tab
                      grouping and the transition table disagree in BOTH
                      directions).

                      ⚠️ **SEPARATE FROM `po:confirm`'s NOTICE, NOT FOLDED INTO
                      IT.** On a `Sent` PO both verbs are legal at once, so a
                      seat holding neither reads two waits in two slots — which
                      is §76's rule, not an exception to it. */}
                  {acknowledgeIsLegalOn(selectedLive ?? selected) &&
                    (acknowledgeAvailability.kind === 'held' ? (
                      <Button
                        variant="secondary"
                        disabled={acknowledgeMutation.isPending}
                        onClick={() => acknowledgeOrder(selectedLive ?? selected)}
                      >
                        {acknowledgeMutation.isPending
                          ? t('supplierOrders.action.acknowledging')
                          : t('supplierOrders.action.acknowledge')}
                      </Button>
                    ) : (
                      <HandoffNotice
                        availability={acknowledgeAvailability}
                        testId="handoff-po-acknowledge"
                      />
                    ))}
                  {ACTION_STATUSES.includes((selectedLive ?? selected).status) ? (
                    // ⚠️ THE ONE NOTICE FOR `po:confirm` ON THIS SURFACE.
                    // `po:confirm` is FULFILMENT's since the supplier split, so
                    // a commercial or back-office seat reads the WAIT with the
                    // lane named instead of an affordance that would refuse at
                    // dispatch.
                    //
                    // ⚠️ **THE COMMENT THAT STOOD HERE CLAIMED THE `editing`
                    // COMMIT WAS "UNREACHABLE BEHIND THIS ONE". IT WAS MEASURED
                    // FALSE** — `handleRowAction` opened the panel straight in
                    // `editing` mode, so the row button that every actionable PO
                    // renders bypassed this notice entirely. A comment asserting
                    // a property the code does not have is the same class as a
                    // label naming an act it does not perform. What makes the
                    // claim TRUE now is `effectivePanelMode` (see its note): the
                    // mode itself is gated, so this stays the single notice.
                    confirmAvailability.kind === 'held' ? (
                      <Button variant="outline" onClick={startEditing}>
                        {t('po.confirm.action')}
                      </Button>
                    ) : (
                      <HandoffNotice
                        availability={confirmAvailability}
                        testId="handoff-po-confirm"
                      />
                    )
                  ) : (selectedLive ?? selected).status === POStatus.CONFIRMED ? (
                    <Button variant="outline" onClick={goToASN}>
                      {t('supplierOrders.action.createAsn')}
                    </Button>
                  ) : null}
                </>
              )}
              {effectivePanelMode === 'editing' && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setPanelMode('change-request')}
                  >
                    {t('supplierOrders.action.requestChange')}
                  </Button>
                  {/* Disabled-under-refusal is UX, not the lock: the parse gate
                      in confirmOrder and the dispatcher policy behind it are
                      what guarantee no unread or out-of-bounds number ships. */}
                  <Button
                    variant="outline"
                    icon={CheckCircle2}
                    onClick={confirmOrder}
                    disabled={confirmMutation.isPending || !allQtysOk}
                  >
                    {confirmMutation.isPending
                      ? t('po.confirm.submitting')
                      : t('po.confirm.action')}
                  </Button>
                </>
              )}
              {effectivePanelMode === 'change-request' && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setPanelMode('editing')}
                  >
                    {t('supplierOrders.action.backToConfirm')}
                  </Button>
                  <Button variant="outline" onClick={submitChangeRequest}>
                    {t('supplierOrders.action.submitChange')}
                  </Button>
                </>
              )}
              {effectivePanelMode === 'confirmed' && (
                <>
                  <Button variant="secondary" onClick={closePanel}>
                    {t('supplierOrders.action.close')}
                  </Button>
                  <Button variant="outline" icon={Truck} onClick={goToASN}>
                    {t('supplierOrders.action.createAsnNow')}
                  </Button>
                </>
              )}
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-6">
            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t('supplierOrders.panel.keyFacts')}
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-text-tertiary">{t('supplierOrders.col.orderDate')}</dt>
                  <dd className="text-text-primary font-medium">
                    <Data>{fmtDate(selected.orderDate)}</Data>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierOrders.col.requestedDelivery')}</dt>
                  <dd className="text-text-primary font-medium">
                    <Data>{fmtDate(selected.requestedDeliveryDate)}</Data>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierOrders.panel.lineItems')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selected.lineItems.length}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierOrders.panel.totalValue')}</dt>
                  <dd className="text-text-primary font-semibold">
                    <Data>{fmtIDR(selected.totalValue)}</Data>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierOrders.col.status')}</dt>
                  <dd>
                    <StatusPill variant={statusTone((selectedLive ?? selected).status)}>
                      {(selectedLive ?? selected).status}
                    </StatusPill>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierOrders.panel.channel')}</dt>
                  <dd className="text-text-primary font-medium">
                    {/* i18n-defer: mock/sample data (fixture-derived channel value) */}
                    {selected.channel}
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {effectivePanelMode === 'editing'
                  ? t('supplierOrders.panel.lineItemsConfirm')
                  : t('supplierOrders.panel.lineItems')}
              </h3>
              <div className="border border-border-subtle rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-bg-hover text-text-tertiary uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">
                        {t('supplierOrders.panel.col.material')}
                      </th>
                      <th className="text-right px-3 py-2 font-semibold">
                        {t('supplierOrders.panel.col.ordered')}
                      </th>
                      {effectivePanelMode === 'editing' && (
                        <th className="text-right px-3 py-2 font-semibold">
                          {t('supplierOrders.panel.col.confirmed')}
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lineItems.map((li, idx) => (
                      <tr
                        key={li.id}
                        className="border-t border-border-subtle"
                      >
                        <td className="px-3 py-2">
                          <Data as="div" className="text-xs text-text-tertiary">
                            {li.materialCode}
                          </Data>
                          <div className="text-text-primary mt-0.5">
                            {/* i18n-defer: mock/sample data (fixture line-item description) */}
                            {li.description}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-text-secondary whitespace-nowrap">
                          <Data>{li.quantity.toLocaleString()} {li.uom}</Data>
                        </td>
                        {effectivePanelMode === 'editing' && (
                          <td className="px-3 py-2 text-right">
                            {/* Ruling 6.2: text + inputMode, never type="number" —
                                the browser must not adjudicate the separators
                                this cell's parser exists to adjudicate. min/max
                                were number-input affordances that never bound
                                anything; the bound is enforced by the policy and
                                mirrored below. */}
                            <input
                              type="text"
                              inputMode="decimal"
                              value={confirmedQtyRaws[idx] ?? ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                setConfirmedQtyRaws((prev) => {
                                  const next = [...prev];
                                  next[idx] = v;
                                  return next;
                                });
                              }}
                              aria-label={`${t('supplierOrders.panel.col.confirmed')} ${li.materialCode}`}
                              aria-invalid={
                                !(lineReads[idx]?.ok ?? true) || !lineBounds[idx]
                              }
                              className={`${inputClass} text-right`}
                              style={{ width: 100, display: 'inline-block' }}
                            />
                            {/* Seeded cells: every blank is operator-cleared, so
                                a refusal shows whenever the cell does not read
                                (the GR-wizard display rule, not the 2e-a
                                untouched-blank rule). */}
                            {lineReads[idx] && !lineReads[idx].ok && (
                              <div
                                role="alert"
                                data-testid={`po-confirm-refusal-${idx}`}
                                className="mt-1 text-[11px] text-danger text-right"
                              >
                                {t(
                                  PO_QTY_REFUSAL_KEY[
                                    (lineReads[idx] as { reason: QtyRefusalReason })
                                      .reason
                                  ],
                                )}{' '}
                                <GlossaryTermChip
                                  refTo={{
                                    sourceType: 'QtyRefusalReason',
                                    term: (lineReads[idx] as { reason: QtyRefusalReason }).reason,
                                  }}
                                />
                              </div>
                            )}
                            {/* The bounds mirror — courtesy, not law (see the
                                derivation block). Renders only for a READ number
                                the policy would refuse, in the operator's
                                language with the line's own bound. */}
                            {lineReads[idx]?.ok && !lineBounds[idx] && (
                              <div
                                role="alert"
                                data-testid={`po-confirm-bounds-${idx}`}
                                className="mt-1 text-[11px] text-danger text-right"
                              >
                                {t('supplierOrders.confirm.qty.outOfBounds', {
                                  ordered: li.quantity,
                                  uom: li.uom,
                                })}
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {effectivePanelMode === 'editing' && (
              <section>
                <h3 className="text-label text-text-tertiary uppercase mb-3">
                  {t('supplierOrders.panel.deliveryNotes')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className={labelClass}>
                      {t('supplierOrders.panel.confirmedDeliveryDate')}
                    </label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t('supplierOrders.panel.notesLabel')}</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t('supplierOrders.panel.notesPlaceholder')}
                      className={inputClass}
                    />
                  </div>
                </div>
                {(hasQtyChange || hasDateChange) && (
                  <div className="bg-warning-soft border-l-2 border-warning rounded px-3 py-2 text-xs text-warning-hover">
                    {t('supplierOrders.panel.diffWarning')}
                  </div>
                )}
              </section>
            )}

            {effectivePanelMode === 'change-request' && (
              <section>
                <h3 className="text-label text-text-tertiary uppercase mb-3">
                  {t('supplierOrders.panel.changeRequest')}
                </h3>
                <p className="text-xs text-text-secondary mb-2">
                  {t('supplierOrders.panel.changeRequestHint')}
                </p>
                <textarea
                  className={`${inputClass} min-h-[96px] resize-y`}
                  value={changeText}
                  onChange={(e) => setChangeText(e.target.value)}
                  placeholder={t('supplierOrders.panel.changeRequestPlaceholder')}
                />
              </section>
            )}

            {effectivePanelMode === 'confirmed' && (
              <section className="bg-success-soft border-l-2 border-success rounded px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={16} className="text-success" />
                  <div>
                    <div className="text-sm font-bold text-success">
                      {t('supplierOrders.panel.orderConfirmed')}
                    </div>
                    <div className="text-xs text-text-secondary">
                      <Data>{selected.poNumber}</Data> ·{' '}
                      {t('supplierOrders.panel.confirmedAt')}{' '}
                      <Data>{confirmedAt}</Data>
                    </div>
                  </div>
                </div>
                <dl className="grid grid-cols-3 gap-3 mt-3">
                  <div className="bg-white rounded px-3 py-2 border border-border-subtle">
                    <dt className="text-label text-text-tertiary uppercase mb-0.5">
                      {t('supplierOrders.panel.deliveryShort')}
                    </dt>
                    <dd className="text-sm font-bold text-text-primary">
                      <Data>{fmtDate(deliveryDate)}</Data>
                    </dd>
                  </div>
                  <div className="bg-white rounded px-3 py-2 border border-border-subtle">
                    <dt className="text-label text-text-tertiary uppercase mb-0.5">
                      {t('supplierOrders.panel.totalQty')}
                    </dt>
                    <dd className="text-sm font-bold text-text-primary">
                      <Data>
                        {totalConfirmedQty !== null
                          ? `${totalConfirmedQty.toLocaleString()} ${t('supplierOrders.units')}`
                          : '—'}
                      </Data>
                    </dd>
                  </div>
                  <div className="bg-white rounded px-3 py-2 border border-border-subtle">
                    <dt className="text-label text-text-tertiary uppercase mb-0.5">
                      {t('supplierOrders.panel.next')}
                    </dt>
                    <dd className="text-sm font-bold text-teal inline-flex items-center gap-1">
                      {t('supplierOrders.action.createAsn')} <ChevronRight size={12} />
                    </dd>
                  </div>
                </dl>
                {notes && (
                  <div className="mt-3 text-xs text-text-secondary bg-white rounded px-3 py-2 border border-border-subtle">
                    {t('supplierOrders.panel.notesPrefix')} {notes}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </SidePanel>
    </AppShellV2>
  );
};

export default SupplierOrders;
