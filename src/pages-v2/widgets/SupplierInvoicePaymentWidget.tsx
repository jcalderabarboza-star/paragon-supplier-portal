import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import ExpandableWidget, {
  type FlagSeverity,
} from '../../components/ui-v2/ExpandableWidget';
import Table from '../../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../../components/ui-v2/TableHeader';
import TableRow from '../../components/ui-v2/TableRow';
import TableCell from '../../components/ui-v2/TableCell';
import Data from '../../components/ui-v2/Data';
import StatusPill from '../../components/ui-v2/StatusPill';
import { statusTone } from '../../lib/statusTone';
import { formatIDR, formatDate } from '../../lib/format';
import { useSupplierInvoices } from '../../services/query/hooks';
import type { SupplierInvoice } from '../../services/data/types';

// Supplier invoice payment — LIVE from the canonical invoice store (DR-7). Unpaid
// = anything before settlement; Overdue (computed at read) is the red exception.
const isUnpaid = (i: SupplierInvoice): boolean =>
  i.status !== 'Payment Released' && i.status !== 'Remittance Received';

const SupplierInvoicePaymentWidget: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const query = useSupplierInvoices();

  const unpaid = useMemo(
    () => (query.data?.items ?? []).filter(isUnpaid),
    [query.data],
  );
  const count = unpaid.length;
  const overdue = useMemo(
    () => unpaid.filter((i) => i.status === 'Overdue').length,
    [unpaid],
  );
  const severity: FlagSeverity =
    overdue > 0 ? 'critical' : count > 0 ? 'info' : 'none';

  const expandedRows =
    count === 0 ? (
      <div className="text-sm text-text-tertiary">
        No invoices are awaiting payment.
      </div>
    ) : (
      <Table>
        <TableHeader>
          <TableHeaderCell>Invoice #</TableHeaderCell>
          <TableHeaderCell>PO #</TableHeaderCell>
          <TableHeaderCell className="text-right">Amount</TableHeaderCell>
          <TableHeaderCell>Due</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
        </TableHeader>
        <tbody>
          {unpaid.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell>
                <Data className="text-xs font-bold text-text-primary">
                  {inv.invoiceNumber}
                </Data>
              </TableCell>
              <TableCell>
                <Data className="text-text-secondary">{inv.poNumber}</Data>
              </TableCell>
              <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                <Data>{formatIDR(inv.amount)}</Data>
              </TableCell>
              <TableCell className="whitespace-nowrap text-text-secondary">
                <Data>{formatDate(inv.dueDate)}</Data>
              </TableCell>
              <TableCell>
                <StatusPill variant={statusTone(inv.status)}>
                  {inv.status}
                </StatusPill>
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    );

  return (
    <ExpandableWidget
      title={t('widget.invoicePayment.title')}
      icon={CreditCard}
      count={count}
      capability="invoices"
      flagSeverity={severity}
      flagLabel={
        count > 0
          ? overdue > 0
            ? t('widget.invoicePayment.flag.withOverdue', { count, overdue })
            : t('widget.invoicePayment.flag.awaiting', { count })
          : undefined
      }
      actionLabel={count > 0 ? t('widget.invoicePayment.action') : undefined}
      onAction={count > 0 ? () => navigate('/supplier/invoices') : undefined}
      expandedRows={expandedRows}
    />
  );
};

export default SupplierInvoicePaymentWidget;
