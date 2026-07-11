import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PackageCheck } from 'lucide-react';
import ExpandableWidget from '../../components/ui-v2/ExpandableWidget';
import Table from '../../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../../components/ui-v2/TableHeader';
import TableRow from '../../components/ui-v2/TableRow';
import TableCell from '../../components/ui-v2/TableCell';
import Data from '../../components/ui-v2/Data';
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
        No goods receipts need action.
      </div>
    ) : (
      <Table>
        <TableHeader>
          <TableHeaderCell>GR #</TableHeaderCell>
          <TableHeaderCell>PO #</TableHeaderCell>
          <TableHeaderCell>Supplier</TableHeaderCell>
          <TableHeaderCell>Received</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
        </TableHeader>
        <tbody>
          {needing.map((gr) => (
            <TableRow key={gr.id}>
              <TableCell>
                <Data className="text-xs font-bold text-text-primary">
                  {gr.grNumber}
                </Data>
              </TableCell>
              <TableCell>
                <Data className="text-text-secondary">{gr.poNumber}</Data>
              </TableCell>
              <TableCell className="text-text-secondary">
                {gr.supplierName}
              </TableCell>
              <TableCell className="whitespace-nowrap text-text-secondary">
                <Data>{formatDate(gr.receivedDate)}</Data>
              </TableCell>
              <TableCell>
                <StatusPill variant={statusTone(gr.status)}>
                  {gr.status}
                </StatusPill>
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    );

  return (
    <ExpandableWidget
      title={t('widget.goodsReceipt.title')}
      icon={PackageCheck}
      count={count}
      live
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
