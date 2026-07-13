import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList } from 'lucide-react';
import ExpandableWidget, {
  type FlagSeverity,
} from '../../components/ui-v2/ExpandableWidget';
import Table from '../../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../../components/ui-v2/TableHeader';
import TableRow from '../../components/ui-v2/TableRow';
import TableCell from '../../components/ui-v2/TableCell';
import Button from '../../components/ui-v2/Button';
import Data from '../../components/ui-v2/Data';
import StatusPill from '../../components/ui-v2/StatusPill';
import { statusTone } from '../../lib/statusTone';
import { formatIDR, formatDate } from '../../lib/format';
import { usePurchaseOrders } from '../../services/query/hooks';
import { usePurchaseOrderConfirm } from '../../services/query/commandHooks';
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
      <Table>
        <TableHeader>
          <TableHeaderCell>PO #</TableHeaderCell>
          <TableHeaderCell>Order date</TableHeaderCell>
          <TableHeaderCell className="text-right">Items</TableHeaderCell>
          <TableHeaderCell className="text-right">Value</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell className="text-right">Action</TableHeaderCell>
        </TableHeader>
        <tbody>
          {confirmable.map((po) => (
            <TableRow key={po.id}>
              <TableCell>
                <Data className="text-xs font-bold text-text-primary">
                  {po.poNumber}
                </Data>
              </TableCell>
              <TableCell className="whitespace-nowrap text-text-secondary">
                <Data>{formatDate(po.orderDate)}</Data>
              </TableCell>
              <TableCell className="text-right text-text-secondary">
                {po.lineItems.length}
              </TableCell>
              <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                <Data>{formatIDR(po.totalValue)}</Data>
              </TableCell>
              <TableCell>
                <StatusPill variant={statusTone(po.status)}>
                  {po.status}
                </StatusPill>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  onClick={() => confirm(po)}
                  disabled={confirmMutation.isPending}
                >
                  Confirm
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
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
