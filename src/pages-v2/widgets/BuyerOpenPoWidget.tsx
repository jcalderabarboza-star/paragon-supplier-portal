import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import ExpandableWidget from '../../components/ui-v2/ExpandableWidget';
import DataTable from '../../components/ui-v2/DataTable';
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
      <DataTable
        card={false}
        rows={open}
        rowKey={(po) => po.id}
        rowProps={() => ({ className: 'relative' })}
        columns={[
          {
            id: 'po',
            header: t('widget.openPo.col.po'),
            kind: 'id',
            cell: (po) => (
              <RecordRowLink
                path="/buyer/orders"
                id={po.id}
                name={po.poNumber}
                label={<Data>{po.poNumber}</Data>}
              />
            ),
          },
          {
            id: 'supplier',
            header: t('widget.openPo.col.supplier'),
            kind: 'text',
            cell: (po) => po.supplierName,
          },
          {
            id: 'orderDate',
            header: t('widget.openPo.col.orderDate'),
            kind: 'date',
            cell: (po) => <Data>{formatDate(po.orderDate)}</Data>,
          },
          /* The status pill already SAYS Sent or Viewed. A second chip
             repeating "not acknowledged" beside it would be the same
             fact twice, and the retired one ('>48h') was a different,
             clock-bound claim that no longer exists. */
          {
            id: 'status',
            header: t('widget.openPo.col.status'),
            kind: 'status',
            cell: (po) => <StatusPill variant={statusTone(po.status)}>{po.status}</StatusPill>,
          },
        ]}
      />
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
