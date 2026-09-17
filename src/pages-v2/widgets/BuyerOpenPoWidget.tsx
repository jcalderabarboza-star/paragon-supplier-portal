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
import RecordRowLink from './RecordRowLink';
import { statusTone } from '../../lib/statusTone';
import { formatDate } from '../../lib/format';
import { usePurchaseOrders } from '../../services/query/hooks';
import { openPurchaseOrders } from './buyerDerivations';
import { NOT_ACKNOWLEDGED_PO_STATUSES } from '../dashboard/buyerDashboardDerivations';

// ─────────────────────────────────────────────────────────────────────────────
// Buyer PO board — LIVE from the PO store. The count is open POs.
//
// ── ⚠️ "NOT YET ACKNOWLEDGED", NOT "UNACKNOWLEDGED >48h" ────────────────────
// The old flag asked how long ago the order was placed, against the wall clock,
// over a family (`purchaseOrder`) that is NOT anchored — so the answer moved
// with the calendar rather than with the supplier. The honest question the same
// data can answer is a STATE one: has this order left the not-acknowledged
// prefix of its own lifecycle? That is clock-free and true at any instant.
//
// The set comes from `NOT_ACKNOWLEDGED_PO_STATUSES`, which the dashboard's
// KPI tile also reads — one definition, so the tile and this window cannot
// disagree about what "acknowledged" means. It is DERIVED from `POStatus`'s own
// declaration order, never hand-listed here.
// ─────────────────────────────────────────────────────────────────────────────
const BuyerOpenPoWidget: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const query = usePurchaseOrders();

  const items = query.data?.items ?? [];
  const open = useMemo(() => openPurchaseOrders(items), [query.data]);
  const notAckIds = useMemo(
    () =>
      new Set(
        open.filter((p) => NOT_ACKNOWLEDGED_PO_STATUSES.includes(p.status)).map((p) => p.id),
      ),
    [open],
  );
  const count = open.length;
  const notAck = notAckIds.size;

  const expandedRows =
    count === 0 ? (
      <div className="text-sm text-text-tertiary">{t('widget.openPo.empty')}</div>
    ) : (
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('widget.openPo.col.po')}</TableHeaderCell>
          <TableHeaderCell>{t('widget.openPo.col.supplier')}</TableHeaderCell>
          <TableHeaderCell>{t('widget.openPo.col.orderDate')}</TableHeaderCell>
          <TableHeaderCell>{t('widget.openPo.col.status')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {open.map((po) => (
            <TableRow key={po.id} className="relative">
              <TableCell>
                <RecordRowLink
                  path="/buyer/orders"
                  id={po.id}
                  name={po.poNumber}
                  label={
                    <Data className="text-xs font-bold text-text-primary">
                      {po.poNumber}
                    </Data>
                  }
                />
              </TableCell>
              <TableCell className="text-text-secondary">
                {po.supplierName}
              </TableCell>
              <TableCell className="whitespace-nowrap text-text-secondary">
                <Data>{formatDate(po.orderDate)}</Data>
              </TableCell>
              <TableCell>
                {/* The status pill already SAYS Sent or Viewed. A second chip
                    repeating "not acknowledged" beside it would be the same
                    fact twice, and the retired one ('>48h') was a different,
                    clock-bound claim that no longer exists. */}
                <StatusPill variant={statusTone(po.status)}>{po.status}</StatusPill>
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
      capability="purchaseOrders"
      // CLOCK-FREE severity: an order still sitting in the not-acknowledged
      // prefix is worth a reader's attention; how long it has sat there is a
      // question this family cannot answer yet.
      flagSeverity={notAck > 0 ? 'info' : 'none'}
      flagLabel={notAck > 0 ? t('widget.openPo.flag', { count: notAck }) : undefined}
      actionLabel={count > 0 ? t('widget.openPo.action') : undefined}
      onAction={count > 0 ? () => navigate('/buyer/orders') : undefined}
      expandedRows={expandedRows}
    />
  );
};

export default BuyerOpenPoWidget;
