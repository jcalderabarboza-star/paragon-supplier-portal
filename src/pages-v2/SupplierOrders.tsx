import React, { useMemo, useState } from 'react';
import {
  Clock,
  CheckCircle2,
  Wallet,
  Truck,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import ListPage from '../components/ui-v2/ListPage';
import DataTable, { CellSub, type Column } from '../components/ui-v2/DataTable';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import SubTabs from '../components/ui-v2/SubTabs';
import StatusPill from '../components/ui-v2/StatusPill';
import NextActLine from '../components/ui-v2/NextActLine';
import { statusTone } from '../lib/statusTone';
import Button from '../components/ui-v2/Button';
import { Card } from '../components/ui-v2/Card';
import Notice from '../components/ui-v2/Notice';
import SidePanel from '../components/ui-v2/SidePanel';
import Data from '../components/ui-v2/Data';
import { FieldList, Field } from '../components/ui-v2/Field';
import SectionHeading from '../components/ui-v2/SectionHeading';
import { TextInput, TextArea, FormField } from '../components/ui-v2/Form';
import { useTranslation } from 'react-i18next';
import { useToast } from '../hooks/useToast';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import {
  usePurchaseOrderConfirm,
  usePurchaseOrderAcknowledge,
} from '../services/query/commandHooks';
import { userVerbsFrom } from '../services/transitions';
import { useVerbAvailability, useNextAct } from '../hooks/useVerbAvailability';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { POStatus } from '../services/data/types';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import { useCurrentSupplier, usePurchaseOrders, useGoodsReceipts } from '../services/query/hooks';
import { receivedOnOrder } from '../services/data/orderReceipt';
import { ReceivedOnOrder } from '../components/v2-features/ReceivedBlock';
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
import { formatIDR, formatNumber, formatDate, formatDateTime } from '../lib/format';

type TabKey = 'all' | 'action' | 'progress' | 'completed';
type PanelMode = 'detail' | 'editing' | 'confirmed' | 'change-request';
type PoLine = PurchaseOrder['lineItems'][number];

const ACTION_STATUSES: POStatus[] = [POStatus.SENT, POStatus.ACKNOWLEDGED];
// OPS-3 — the states an order holds once a confirmation is on it.
const CONFIRMED_ONWARD: POStatus[] = [
  POStatus.CONFIRMED,
  POStatus.PARTIALLY_DELIVERED,
  POStatus.DELIVERED,
  POStatus.CLOSED,
];
const PROGRESS_STATUSES: POStatus[] = [
  POStatus.CONFIRMED,
  POStatus.PARTIALLY_DELIVERED,
];
const COMPLETED_STATUSES: POStatus[] = [POStatus.DELIVERED, POStatus.CLOSED];

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

  const supplierQuery = useCurrentSupplier();
  const posQuery = usePurchaseOrders();
  // E2E-2 — the supplier's own receipts (the read is scoped to the supplier).
  // What was received is derived from them, and an order that is fully
  // received is not offered a ship notice: there is nothing left to ship.
  const receiptsQuery = useGoodsReceipts();
  const receivedOf = (po: PurchaseOrder) => receivedOnOrder(po, receiptsQuery.data?.items ?? []);
  const mayShip = (po: PurchaseOrder) =>
    po.status === POStatus.CONFIRMED && !receivedOf(po).fullyReceived;

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

  // WHO ACTS NEXT — read from the LIVE row for the same reason Key Facts is: a
  // line derived from the open-time snapshot would keep naming yesterday's
  // waiter after a confirm lands.
  //
  // ⚠️ **ABOVE EVERY EARLY RETURN, AND THAT PLACEMENT IS THE WHOLE OF IT.** This
  // component returns early five times (no identity, pending, error, no
  // supplier, empty), so a hook below them runs on some renders and not others —
  // "Rendered more hooks than during the previous render", which is how this was
  // caught. `selectedLive` is computed after those returns and cannot move; the
  // STATE STRING is all the hook needs, so it is derived here instead.
  const liveStatus = selected
    ? (MY_POS.find((p) => p.id === selected.id) ?? selected).status
    : undefined;
  const nextAct = useNextAct('purchaseOrder', liveStatus);

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
      {
        poId: po.id,
        confirmedQuantities: [...qtysRead.quantities],
        // OPS-3 — the date and the note leave the page. They used to stay in
        // component state and were shown back as if they had been sent.
        confirmedDeliveryDate: deliveryDate,
        confirmationNote: notes,
      },
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
      variant: 'info',
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
    } else if (mayShip(po)) {
      // E2E-2 — only an order with goods still owed. A fully received order's
      // row reads "View" and opens the panel, like any other.
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

  // OPS-3 — a confirmation is on the order once it has left the states that
  // still await one. Read from the LIVE row, so it turns on the moment the
  // confirm lands.
  const showsConfirmation =
    selected !== null && CONFIRMED_ONWARD.includes((selectedLive ?? selected).status);

  const panelTitle = selected ? t('supplierOrders.panel.title', { poNumber: selected.poNumber }) : '';
  // ⚠️ **THE LABEL IS SEAT-DERIVED, BECAUSE THE ACT BEHIND IT ALREADY WAS.**
  // ENTRANCE-IS-THE-UNIT-01 made the ACT honest — `effectivePanelMode` collapses `editing` to
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
    if (mayShip(po)) return t('supplierOrders.action.createAsn');
    return t('supplierOrders.action.view');
  };

  const orderColumns: Column<PurchaseOrder>[] = [
    {
      id: 'po',
      header: t('supplierOrders.col.po'),
      kind: 'id',
      cell: (po) => <Data>{po.poNumber}</Data>,
    },
    {
      id: 'orderDate',
      header: t('supplierOrders.col.orderDate'),
      kind: 'date',
      cell: (po) => <Data>{fmtDate(po.orderDate)}</Data>,
    },
    {
      id: 'requestedDelivery',
      header: t('supplierOrders.col.requestedDelivery'),
      kind: 'date',
      cell: (po) => <Data>{fmtDate(po.requestedDeliveryDate)}</Data>,
    },
    {
      id: 'items',
      header: t('supplierOrders.col.items'),
      kind: 'number',
      cell: (po) => po.lineItems.length,
    },
    {
      id: 'value',
      header: t('supplierOrders.col.value'),
      kind: 'money',
      cell: (po) => <Data>{formatIDR(po.totalValue, { compact: true })}</Data>,
    },
    {
      id: 'status',
      header: t('supplierOrders.col.status'),
      kind: 'status',
      cell: (po) => <StatusPill variant={statusTone(po.status)}>{po.status}</StatusPill>,
    },
    {
      id: 'action',
      header: t('supplierOrders.col.action'),
      kind: 'actions',
      cell: (po) => (
        <Button
          variant={
            ACTION_STATUSES.includes(po.status) && canConfirmHere ? 'outline' : 'secondary'
          }
          onClick={(e) => handleRowAction(po, e)}
        >
          {panelActionLabel(po)}
        </Button>
      ),
    },
  ];

  return (
    <ListPage
      breadcrumb={ORDERS_CRUMB}
      title={t('supplierOrders.header.title')}
      subtitle={t('supplierOrders.header.subtitle', { supplier: mySupplier.name })}
      meta={
        <>
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
        </>
      }
      kpis={
        <>
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
          value={formatIDR(totalValuePending, { compact: true })}
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
        </>
      }
      tabs={
        <SubTabs<TabKey>
          options={[
            { id: 'all', label: t('supplierOrders.tab.all'), count: counts.all },
            { id: 'action', label: t('supplierOrders.tab.action'), count: counts.action },
            { id: 'progress', label: t('supplierOrders.tab.progress'), count: counts.progress },
            { id: 'completed', label: t('supplierOrders.tab.completed'), count: counts.completed },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />
      }
    >
      {counts.action > 0 && activeTab !== 'completed' && (
        <Notice tone="warning" icon={AlertCircle} className="mb-4">
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
        </Notice>
      )}

      <DataTable<PurchaseOrder>
        columns={orderColumns}
        rows={displayPOs}
        rowKey={(po) => po.id}
        onRowClick={(po) => openOrderPanel(po, 'detail')}
        empty={t('supplierOrders.table.empty')}
      />

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
                  ) : mayShip(selectedLive ?? selected) ? (
                    <Button variant="outline" onClick={goToASN} data-testid="po-create-asn">
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
                  {selected && mayShip(selectedLive ?? selected) && (
                    <Button variant="outline" icon={Truck} onClick={goToASN}>
                      {t('supplierOrders.action.createAsnNow')}
                    </Button>
                  )}
                </>
              )}
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-6">
            <section>
              <SectionHeading level="group" as="h3" className="mb-3">
                {t('supplierOrders.panel.keyFacts')}
              </SectionHeading>
              <FieldList columns={2}>
                <Field label={t('supplierOrders.col.orderDate')} kind="date">
                  {fmtDate(selected.orderDate)}
                </Field>
                <Field label={t('supplierOrders.col.requestedDelivery')} kind="date">
                  {fmtDate(selected.requestedDeliveryDate)}
                </Field>
                <Field label={t('supplierOrders.panel.lineItems')} kind="number">
                  {selected.lineItems.length}
                </Field>
                <Field label={t('supplierOrders.panel.totalValue')} kind="money">
                  {formatIDR(selected.totalValue, { compact: true })}
                </Field>
                <Field label={t('supplierOrders.col.status')} kind="status">
                  <StatusPill variant={statusTone((selectedLive ?? selected).status)}>
                    {(selectedLive ?? selected).status}
                  </StatusPill>
                  {/* WHO ACTS NEXT — the answer the pill cannot give. A PO in
                      `Confirmed` carries no footer verb and no handoff notice
                      (there is no surfaceable atom to ask about), so before
                      this line the supplier saw a status word and nothing
                      else while both parties waited on S/4HANA. Derived from
                      the CANONICAL state, never the pill's label. */}
                  <span className="mt-1 block">
                    <NextActLine act={nextAct} testId="next-act-supplier-po" />
                  </span>
                </Field>
                <Field label={t('supplierOrders.panel.channel')} kind="text">
                  {/* i18n-defer: mock/sample data (fixture-derived channel value) */}
                  {selected.channel}
                </Field>
                {/* OPS-3 — what this supplier confirmed, read from the STORED
                    order so it is the same answer the buyer sees. Shown once
                    the order has left the states that still await a
                    confirmation; the time of the act only when one is on
                    record (a seeded order carries none). */}
                {showsConfirmation && (
                  <Field
                    label={t('supplierOrders.panel.confirmedDeliveryDate')}
                    kind="date"
                    data-testid="po-confirmed-delivery"
                  >
                    {formatDate((selectedLive ?? selected).confirmedDeliveryDate)}
                  </Field>
                )}
                {showsConfirmation && (selectedLive ?? selected).confirmedAt && (
                  <Field label={t('supplierOrders.panel.confirmedOn')} kind="date" data-testid="po-confirmed-at">
                    {formatDateTime((selectedLive ?? selected).confirmedAt)}
                  </Field>
                )}
                {showsConfirmation && (selectedLive ?? selected).confirmationNote && (
                  <Field
                    label={t('supplierOrders.panel.notesLabel')}
                    kind="text"
                    wide
                    data-testid="po-confirmation-note"
                  >
                    {(selectedLive ?? selected).confirmationNote}
                  </Field>
                )}
              </FieldList>
            </section>

            <section>
              <SectionHeading level="group" as="h3" className="mb-3">
                {effectivePanelMode === 'editing'
                  ? t('supplierOrders.panel.lineItemsConfirm')
                  : t('supplierOrders.panel.lineItems')}
              </SectionHeading>
              <Card padding="none" className="overflow-hidden">
                <DataTable<PoLine>
                  density="compact"
                  card={false}
                  rows={selected.lineItems}
                  rowKey={(li) => li.id}
                  columns={[
                    {
                      id: 'material',
                      header: t('supplierOrders.panel.col.material'),
                      kind: 'id',
                      cell: (li) => (
                        <>
                          <Data as="div">{li.materialCode}</Data>
                          <CellSub>
                            {/* i18n-defer: mock/sample data (fixture line-item description) */}
                            {li.description}
                          </CellSub>
                        </>
                      ),
                    },
                    {
                      id: 'ordered',
                      header: t('supplierOrders.panel.col.ordered'),
                      kind: 'number',
                      className: 'whitespace-nowrap',
                      cell: (li) => (
                        <Data>{formatNumber(li.quantity)} {li.uom}</Data>
                      ),
                    },
                    ...(effectivePanelMode !== 'editing' && showsConfirmation
                      ? [
                          {
                            id: 'confirmed',
                            header: t('supplierOrders.panel.col.confirmed'),
                            kind: 'number',
                            className: 'whitespace-nowrap',
                            cell: (li, idx) => (
                              <span data-testid={`po-line-confirmed-${idx}`}>
                                <Data>
                                  {formatNumber(
                                    (selectedLive ?? selected).lineItems[idx]?.confirmedQty ?? 0,
                                  )}{' '}
                                  {li.uom}
                                </Data>
                              </span>
                            ),
                          } satisfies Column<PoLine>,
                        ]
                      : []),
                    ...(effectivePanelMode === 'editing'
                      ? [
                          {
                            id: 'confirmed',
                            header: t('supplierOrders.panel.col.confirmed'),
                            kind: 'number',
                            cell: (li, idx) => (
                              <>
                                {/* Ruling 6.2: text + inputMode, never type="number" —
                                    the browser must not adjudicate the separators
                                    this cell's parser exists to adjudicate. min/max
                                    were number-input affordances that never bound
                                    anything; the bound is enforced by the policy and
                                    mirrored below. */}
                                <TextInput
                                  type="text"
                                  mono
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
                                  className="text-right"
                                  style={{ width: 100, display: 'inline-block' }}
                                />
                                {/* Seeded cells: every blank is operator-cleared, so
                                    a refusal shows whenever the cell does not read
                                    (the GR-wizard display rule, not the 2e-a
                                    untouched-blank rule). */}
                                {lineReads[idx] && !lineReads[idx].ok && (
                                  <div role="alert" data-testid={`po-confirm-refusal-${idx}`}>
                                    <CellSub tone="critical">
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
                                    </CellSub>
                                  </div>
                                )}
                                {/* The bounds mirror — courtesy, not law (see the
                                    derivation block). Renders only for a READ number
                                    the policy would refuse, in the operator's
                                    language with the line's own bound. */}
                                {lineReads[idx]?.ok && !lineBounds[idx] && (
                                  <div role="alert" data-testid={`po-confirm-bounds-${idx}`}>
                                    <CellSub tone="critical">
                                      {t('supplierOrders.confirm.qty.outOfBounds', {
                                        ordered: li.quantity,
                                        uom: li.uom,
                                      })}
                                    </CellSub>
                                  </div>
                                )}
                              </>
                            ),
                          } satisfies Column<PoLine>,
                        ]
                      : []),
                  ]}
                />
              </Card>
            </section>

            {/* E2E-2 — what Paragon has received on this order, from the
                supplier's own receipts, and whose the order's status is. */}
            {effectivePanelMode !== 'editing' && (
              <ReceivedOnOrder
                received={receivedOf(selectedLive ?? selected)}
                testId="supplier-order-received"
              />
            )}

            {effectivePanelMode === 'editing' && (
              <section>
                <SectionHeading level="group" as="h3" className="mb-3">
                  {t('supplierOrders.panel.deliveryNotes')}
                </SectionHeading>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <FormField label={t('supplierOrders.panel.confirmedDeliveryDate')}>
                    <TextInput
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                    />
                  </FormField>
                  <FormField label={t('supplierOrders.panel.notesLabel')}>
                    <TextInput
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t('supplierOrders.panel.notesPlaceholder')}
                    />
                  </FormField>
                </div>
                {(hasQtyChange || hasDateChange) && (
                  <Notice tone="warning">
                    {t('supplierOrders.panel.diffWarning')}
                  </Notice>
                )}
              </section>
            )}

            {effectivePanelMode === 'change-request' && (
              <section>
                <SectionHeading level="group" as="h3" className="mb-3">
                  {t('supplierOrders.panel.changeRequest')}
                </SectionHeading>
                <p className="text-xs text-text-secondary mb-2">
                  {t('supplierOrders.panel.changeRequestHint')}
                </p>
                <TextArea
                  className="resize-y"
                  value={changeText}
                  onChange={(e) => setChangeText(e.target.value)}
                  placeholder={t('supplierOrders.panel.changeRequestPlaceholder')}
                />
              </section>
            )}

            {effectivePanelMode === 'confirmed' && (
              <Notice tone="success" icon={CheckCircle2} title={t('supplierOrders.panel.orderConfirmed')}>
                    <div>
                      <Data>{selected.poNumber}</Data> ·{' '}
                      {t('supplierOrders.panel.confirmedAt')}{' '}
                      <Data>{formatDateTime((selectedLive ?? selected).confirmedAt)}</Data>
                    </div>
                <FieldList columns={3} className="mt-3">
                  <Field
                    label={t('supplierOrders.panel.deliveryShort')}
                    kind="date"
                  >
                    {formatDate((selectedLive ?? selected).confirmedDeliveryDate)}
                  </Field>
                  <Field
                    label={t('supplierOrders.panel.totalQty')}
                    kind="number"
                  >
                    {`${formatNumber(
                      (selectedLive ?? selected).lineItems.reduce(
                        (a, li) => a + li.confirmedQty,
                        0,
                      ),
                    )} ${t('supplierOrders.units')}`}
                  </Field>
                  <Field
                    label={t('supplierOrders.panel.next')}
                    kind="text"
                  >
                    <span className="text-teal-text inline-flex items-center gap-1">
                      {mayShip(selectedLive ?? selected) ? (
                        <>
                          {t('supplierOrders.action.createAsn')} <ChevronRight size={12} />
                        </>
                      ) : (
                        t('received.order.full')
                      )}
                    </span>
                  </Field>
                </FieldList>
                {(selectedLive ?? selected).confirmationNote && (
                  <Card
                    className="mt-3"
                    data-testid="po-confirmed-note"
                  >
                    {t('supplierOrders.panel.notesPrefix')}{' '}
                    {(selectedLive ?? selected).confirmationNote}
                  </Card>
                )}
              </Notice>
            )}
          </div>
        )}
      </SidePanel>
    </ListPage>
  );
};

export default SupplierOrders;
