import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import ExpandableWidget from '../../components/ui-v2/ExpandableWidget';
import Table from '../../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../../components/ui-v2/TableHeader';
import TableRow from '../../components/ui-v2/TableRow';
import TableCell from '../../components/ui-v2/TableCell';
import Data from '../../components/ui-v2/Data';
import StatusPill from '../../components/ui-v2/StatusPill';
import { statusTone } from '../../lib/statusTone';
import { formatIDR } from '../../lib/format';
import { useBuyerInvoices } from '../../services/query/hooks';
import { overdueInvoices, maxDaysOutstanding, invoiceTier } from './buyerDerivations';

// Buyer AP aging — LIVE: overdue is computed at read (invoiceProjection: an open,
// unpaid invoice past its due date), so nothing here fabricates a payment state.
const BuyerInvoiceAgingWidget: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const query = useBuyerInvoices();

  const overdue = useMemo(
    () => overdueInvoices(query.data?.items ?? []),
    [query.data],
  );
  const count = overdue.length;
  const maxDays = maxDaysOutstanding(overdue);

  const expandedRows =
    count === 0 ? (
      <div className="text-sm text-text-tertiary">No overdue invoices.</div>
    ) : (
      <Table>
        <TableHeader>
          <TableHeaderCell>Invoice #</TableHeaderCell>
          <TableHeaderCell>Supplier</TableHeaderCell>
          <TableHeaderCell className="text-right">Amount</TableHeaderCell>
          <TableHeaderCell className="text-right">Days past due</TableHeaderCell>
          <TableHeaderCell>Match</TableHeaderCell>
        </TableHeader>
        <tbody>
          {overdue.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell>
                <Data className="text-xs font-bold text-text-primary">
                  {inv.invoiceNumber}
                </Data>
              </TableCell>
              <TableCell className="text-text-secondary">
                {inv.supplierName}
              </TableCell>
              <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                <Data>{formatIDR(inv.amount)}</Data>
              </TableCell>
              <TableCell className="text-right text-danger">
                <Data>{inv.daysOutstanding}d</Data>
              </TableCell>
              <TableCell>
                <StatusPill variant={statusTone(inv.matchStatus)}>
                  {inv.matchStatus}
                </StatusPill>
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    );

  return (
    <ExpandableWidget
      title={t('widget.invoiceAging.title')}
      icon={CreditCard}
      count={count}
      capability="invoices"
      flagSeverity={invoiceTier(query.data?.items ?? [])}
      flagLabel={count > 0 ? t('widget.invoiceAging.flag', { count, maxDays }) : undefined}
      actionLabel={count > 0 ? t('widget.invoiceAging.action') : undefined}
      onAction={count > 0 ? () => navigate('/buyer/invoices') : undefined}
      expandedRows={expandedRows}
    />
  );
};

export default BuyerInvoiceAgingWidget;
