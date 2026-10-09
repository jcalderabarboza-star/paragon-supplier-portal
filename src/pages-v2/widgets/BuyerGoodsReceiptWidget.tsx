import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PackageCheck } from 'lucide-react';
import ExpandableWidget from '../../components/ui-v2/ExpandableWidget';
import DataTable from '../../components/ui-v2/DataTable';
import Data from '../../components/ui-v2/Data';
import RecordRowLink from './RecordRowLink';
import StatusPill from '../../components/ui-v2/StatusPill';
import { statusTone } from '../../lib/statusTone';
import { formatDate } from '../../lib/format';
import { useGoodsReceipts } from '../../services/query/hooks';
import { grNeedingAction, grVariance, grTier } from './buyerDerivations';

// Buyer 3-way match — LIVE from the GR store. Count is receipts needing action
// (pending inspection or a match variance); variance (hold/reject/partial) is red.
const BuyerGoodsReceiptWidget: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const query = useGoodsReceipts();

  const items = query.data?.items ?? [];
  const needing = useMemo(() => grNeedingAction(items), [query.data]);
  const variance = useMemo(() => grVariance(items).length, [query.data]);
  const count = needing.length;

  const expandedRows =
    count === 0 ? (
      <div className="text-sm text-text-tertiary">
        {t('widget.goodsReceipt.empty')}
      </div>
    ) : (
      <DataTable
        card={false}
        rows={needing}
        rowKey={(gr) => gr.id}
        rowProps={() => ({ className: 'relative' })}
        columns={[
          {
            id: 'gr',
            header: t('widget.goodsReceipt.col.gr'),
            kind: 'id',
            cell: (gr) => (
              <RecordRowLink
                path="/buyer/goods-receipt"
                id={gr.id}
                name={gr.grNumber}
                label={<Data>{gr.grNumber}</Data>}
              />
            ),
          },
          {
            id: 'po',
            header: t('widget.goodsReceipt.col.po'),
            kind: 'id',
            cell: (gr) => <Data>{gr.poNumber}</Data>,
          },
          {
            id: 'supplier',
            header: t('widget.goodsReceipt.col.supplier'),
            kind: 'text',
            cell: (gr) => gr.supplierName,
          },
          {
            id: 'received',
            header: t('widget.goodsReceipt.col.received'),
            kind: 'date',
            cell: (gr) => <Data>{formatDate(gr.receivedDate)}</Data>,
          },
          {
            id: 'status',
            header: t('widget.goodsReceipt.col.status'),
            kind: 'status',
            cell: (gr) => <StatusPill variant={statusTone(gr.status)}>{gr.status}</StatusPill>,
          },
        ]}
      />
    );

  return (
    <ExpandableWidget
      title={t('widget.goodsReceipt.title')}
      icon={PackageCheck}
      count={count}
      capability="goodsReceipts"
      flagSeverity={grTier(items)}
      flagLabel={
        count > 0
          ? variance > 0
            ? t('widget.goodsReceipt.flag.withVariance', { count, variance })
            : t('widget.goodsReceipt.flag.plain', { count })
          : undefined
      }
      actionLabel={count > 0 ? t('widget.goodsReceipt.action') : undefined}
      onAction={count > 0 ? () => navigate('/buyer/goods-receipt') : undefined}
      expandedRows={expandedRows}
    />
  );
};

export default BuyerGoodsReceiptWidget;
