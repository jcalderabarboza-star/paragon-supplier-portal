import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import ExpandableWidget from '../../components/ui-v2/ExpandableWidget';
import Table from '../../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../../components/ui-v2/TableHeader';
import TableRow from '../../components/ui-v2/TableRow';
import TableCell from '../../components/ui-v2/TableCell';
import Data from '../../components/ui-v2/Data';
import StatusPill from '../../components/ui-v2/StatusPill';
import { statusTone } from '../../lib/statusTone';
import { formatDate } from '../../lib/format';
import { usePurchaseOrders } from '../../services/query/hooks';
import {
  openPurchaseOrders,
  unacknowledgedOver48h,
  poTier,
} from './buyerDerivations';

// Buyer PO board — LIVE from the PO store. Count is open POs; the urgency flag is
// the honest exception: orders still unacknowledged more than 48h after placing.
const BuyerOpenPoWidget: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const query = usePurchaseOrders();

  const now = new Date();
  const items = query.data?.items ?? [];
  const open = useMemo(() => openPurchaseOrders(items), [query.data]);
  const unackIds = useMemo(
    () => new Set(unacknowledgedOver48h(items, now).map((p) => p.id)),
    [query.data],
  );
  const count = open.length;
  const unack = unackIds.size;

  const expandedRows =
    count === 0 ? (
      <div className="text-sm text-text-tertiary">No open purchase orders.</div>
    ) : (
      <Table>
        <TableHeader>
          <TableHeaderCell>PO #</TableHeaderCell>
          <TableHeaderCell>Supplier</TableHeaderCell>
          <TableHeaderCell>Order date</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
        </TableHeader>
        <tbody>
          {open.map((po) => (
            <TableRow key={po.id}>
              <TableCell>
                <Data className="text-xs font-bold text-text-primary">
                  {po.poNumber}
                </Data>
              </TableCell>
              <TableCell className="text-text-secondary">
                {po.supplierName}
              </TableCell>
              <TableCell className="whitespace-nowrap text-text-secondary">
                <Data>{formatDate(po.orderDate)}</Data>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <StatusPill variant={statusTone(po.status)}>
                    {po.status}
                  </StatusPill>
                  {unackIds.has(po.id) ? (
                    <StatusPill variant="danger">&gt;48h</StatusPill>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    );

  return (
    <ExpandableWidget
      title={t('widget.openPo.title')}
      icon={ShoppingCart}
      count={count}
      live
      flagSeverity={poTier(items, now)}
      flagLabel={unack > 0 ? t('widget.openPo.flag', { count: unack }) : undefined}
      actionLabel={count > 0 ? t('widget.openPo.action') : undefined}
      onAction={count > 0 ? () => navigate('/buyer/orders') : undefined}
      expandedRows={expandedRows}
    />
  );
};

export default BuyerOpenPoWidget;
