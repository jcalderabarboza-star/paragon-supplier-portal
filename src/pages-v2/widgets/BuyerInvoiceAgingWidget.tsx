import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import ExpandableWidget from '../../components/ui-v2/ExpandableWidget';
import DataTable from '../../components/ui-v2/DataTable';
import Data from '../../components/ui-v2/Data';
import StatusPill from '../../components/ui-v2/StatusPill';
import RecordRowLink from './RecordRowLink';
import { statusTone } from '../../lib/statusTone';
import { formatIDR } from '../../lib/format';
import { useBuyerInvoices } from '../../services/query/hooks';
import { overdueInvoices, maxDaysOutstanding, invoiceTier } from './buyerDerivations';

// Buyer AP aging — LIVE: overdue is computed at read (invoiceProjection: an open,
// unpaid invoice past its due date), so nothing here fabricates a payment state.
// `invoice` is an ANCHORED family read at the declared present at the service
// seam, so the day-count here is honest at any wall-clock instant.
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
      <div className="text-sm text-text-tertiary">{t('widget.invoiceAging.empty')}</div>
    ) : (
      <DataTable
        card={false}
        rows={overdue}
        rowKey={(inv) => inv.id}
        rowProps={() => ({ className: 'relative' })}
        columns={[
          {
            id: 'invoice',
            header: t('widget.invoiceAging.col.invoice'),
            kind: 'id',
            cell: (inv) => (
              <RecordRowLink
                path="/buyer/invoices"
                id={inv.id}
                name={inv.invoiceNumber}
                label={<Data>{inv.invoiceNumber}</Data>}
              />
            ),
          },
          {
            id: 'supplier',
            header: t('widget.invoiceAging.col.supplier'),
            kind: 'text',
            cell: (inv) => inv.supplierName,
          },
          {
            id: 'amount',
            header: t('widget.invoiceAging.col.amount'),
            kind: 'money',
            cell: (inv) => <Data>{formatIDR(inv.amount)}</Data>,
          },
          {
            id: 'daysPastDue',
            header: t('widget.invoiceAging.col.daysPastDue'),
            kind: 'number',
            cell: (inv) => <span className="text-critical">{inv.daysOutstanding}d</span>,
          },
          {
            id: 'match',
            header: t('widget.invoiceAging.col.match'),
            kind: 'status',
            cell: (inv) => <StatusPill variant={statusTone(inv.matchStatus)}>{inv.matchStatus}</StatusPill>,
          },
        ]}
      />
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
