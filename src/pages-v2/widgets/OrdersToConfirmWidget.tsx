import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList } from 'lucide-react';
import ExpandableWidget, {
  type FlagSeverity,
} from '../../components/ui-v2/ExpandableWidget';
import DataTable from '../../components/ui-v2/DataTable';
import Button from '../../components/ui-v2/Button';
import Data from '../../components/ui-v2/Data';
import StatusPill from '../../components/ui-v2/StatusPill';
import { statusTone } from '../../lib/statusTone';
import { formatIDR, formatDate } from '../../lib/format';
import { usePurchaseOrders } from '../../services/query/hooks';
import { usePurchaseOrderConfirm } from '../../services/query/commandHooks';
import { useVerbAvailability } from '../../hooks/useVerbAvailability';
import { HandoffNotice } from '../../components/ui-v2/HandoffNotice';
import { POStatus } from '../../services/data/types';
import type { PurchaseOrder } from '../../services/data/types';

// ────────────────────────────────────────────────────────────────────────────
// Reference adapter (proving pair) — Supplier "Orders to confirm". The thin
// adapter shape every dashboard module follows: a hook → the ExpandableWidget
// contract. Fully LIVE: the count derives from the real PO store, and the
// action routes through the existing `t_po_confirm` command, so a confirm
// invalidates the scope and the flag visibly clears (no local seeded copy).
// ────────────────────────────────────────────────────────────────────────────

const isConfirmable = (po: PurchaseOrder): boolean =>
  po.status === POStatus.SENT || po.status === POStatus.ACKNOWLEDGED;

// Confirm-as-ordered: the honest default is the ordered quantity per line — no
// fabricated over/under receipt. (Line-level edits live on the full PO detail.)
const orderedQuantities = (po: PurchaseOrder): number[] =>
  po.lineItems.map((li) => li.quantity);

const severityFor = (n: number): FlagSeverity =>
  n === 0 ? 'none' : n >= 3 ? 'warning' : 'info';

const OrdersToConfirmWidget: React.FC = () => {
  const { t } = useTranslation();
  const posQuery = usePurchaseOrders();
  const confirmMutation = usePurchaseOrderConfirm();
  // ⚠️ THE DASHBOARD COPY OF `po:confirm`, AND IT IS THE §72a SHAPE EXACTLY:
  // gating `SupplierOrders` and leaving this live would ship the same withheld
  // verb as a working button one route away. Derive coverage as
  // (surface × verb) — a widget is a surface.
  const confirmAvailability = useVerbAvailability('po:confirm');

  const confirmable = useMemo(
    () => (posQuery.data?.items ?? []).filter(isConfirmable),
    [posQuery.data],
  );
  const count = confirmable.length;

  const confirm = (po: PurchaseOrder) =>
    confirmMutation.mutate({
      poId: po.id,
      confirmedQuantities: orderedQuantities(po),
    });

  const expandedRows =
    count === 0 ? (
      <div className="text-sm text-text-tertiary">
        No purchase orders are awaiting your confirmation.
      </div>
    ) : (
      <DataTable
        card={false}
        rows={confirmable}
        rowKey={(po) => po.id}
        columns={[
          {
            id: 'po',
            header: 'PO #',
            kind: 'id',
            cell: (po) => <Data>{po.poNumber}</Data>,
          },
          {
            id: 'orderDate',
            header: 'Order date',
            kind: 'date',
            cell: (po) => <Data>{formatDate(po.orderDate)}</Data>,
          },
          {
            id: 'items',
            header: 'Items',
            kind: 'number',
            cell: (po) => po.lineItems.length,
          },
          {
            id: 'value',
            header: 'Value',
            kind: 'money',
            cell: (po) => <Data>{formatIDR(po.totalValue)}</Data>,
          },
          {
            id: 'status',
            header: 'Status',
            kind: 'status',
            cell: (po) => <StatusPill variant={statusTone(po.status)}>{po.status}</StatusPill>,
          },
          {
            id: 'action',
            header: 'Action',
            kind: 'actions',
            cell: (po) =>
              confirmAvailability.kind === 'held' ? (
                <Button
                  variant="outline"
                  onClick={() => confirm(po)}
                  disabled={confirmMutation.isPending}
                >
                  Confirm
                </Button>
              ) : (
                <HandoffNotice
                  availability={confirmAvailability}
                  testId="handoff-widget-po-confirm"
                />
              ),
          },
        ]}
      />
    );

  return (
    <ExpandableWidget
      title={t('widget.ordersToConfirm.title')}
      icon={ClipboardList}
      count={count}
      capability="purchaseOrders"
      flagSeverity={severityFor(count)}
      flagLabel={count > 0 ? t('widget.ordersToConfirm.flag', { count }) : undefined}
      actionLabel={count > 0 ? t('widget.ordersToConfirm.action') : undefined}
      onAction={count > 0 ? () => confirm(confirmable[0]) : undefined}
      actionDisabled={confirmMutation.isPending}
      expandedRows={expandedRows}
    />
  );
};

export default OrdersToConfirmWidget;
