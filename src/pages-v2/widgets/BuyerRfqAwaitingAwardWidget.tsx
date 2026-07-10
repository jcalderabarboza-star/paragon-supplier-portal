import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gavel } from 'lucide-react';
import ExpandableWidget from '../../components/ui-v2/ExpandableWidget';
import Table from '../../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../../components/ui-v2/TableHeader';
import TableRow from '../../components/ui-v2/TableRow';
import TableCell from '../../components/ui-v2/TableCell';
import Data from '../../components/ui-v2/Data';
import StatusPill from '../../components/ui-v2/StatusPill';
import { statusTone } from '../../lib/statusTone';
import { formatDate } from '../../lib/format';
import { useRFQs, useQuotations } from '../../services/query/hooks';
import {
  pendingAwardRfqs,
  awardOverdue,
  quoteCountByRfq,
  rfqAwardTier,
} from './buyerDerivations';

// Buyer sourcing — LIVE: RFQs with quotations in but not yet Awarded, read from
// the RFQ + quotation stores (award verb, PR #41). The award is a decision, so
// the action routes to the sourcing board rather than auto-awarding.
const BuyerRfqAwaitingAwardWidget: React.FC = () => {
  const navigate = useNavigate();
  const rfqQuery = useRFQs();
  const quoteQuery = useQuotations();

  const now = new Date();
  const pending = useMemo(
    () => pendingAwardRfqs(rfqQuery.data?.items ?? [], quoteQuery.data?.items ?? []),
    [rfqQuery.data, quoteQuery.data],
  );
  const quoteCounts = useMemo(
    () => quoteCountByRfq(quoteQuery.data?.items ?? []),
    [quoteQuery.data],
  );
  const count = pending.length;
  const overdue = awardOverdue(pending, now).length;

  const expandedRows =
    count === 0 ? (
      <div className="text-sm text-text-tertiary">
        No RFQs are awaiting an award decision.
      </div>
    ) : (
      <Table>
        <TableHeader>
          <TableHeaderCell>RFQ #</TableHeaderCell>
          <TableHeaderCell>Title</TableHeaderCell>
          <TableHeaderCell className="text-right">Quotes</TableHeaderCell>
          <TableHeaderCell>Award by</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
        </TableHeader>
        <tbody>
          {pending.map((rfq) => (
            <TableRow key={rfq.id}>
              <TableCell>
                <Data className="text-xs font-bold text-text-primary">
                  {rfq.rfqNumber}
                </Data>
              </TableCell>
              <TableCell className="text-text-secondary">{rfq.title}</TableCell>
              <TableCell className="text-right text-text-secondary">
                <Data>{quoteCounts.get(rfq.id) ?? 0}</Data>
              </TableCell>
              <TableCell className="whitespace-nowrap text-text-secondary">
                <Data>{formatDate(rfq.awardDeadline)}</Data>
              </TableCell>
              <TableCell>
                <StatusPill variant={statusTone(rfq.status)}>
                  {rfq.status}
                </StatusPill>
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    );

  return (
    <ExpandableWidget
      title="RFQs awaiting award"
      icon={Gavel}
      count={count}
      live
      flagSeverity={rfqAwardTier(
        rfqQuery.data?.items ?? [],
        quoteQuery.data?.items ?? [],
        now,
      )}
      flagLabel={
        count > 0
          ? overdue > 0
            ? `${count} pending · ${overdue} past deadline`
            : `${count} to award`
          : undefined
      }
      actionLabel={count > 0 ? 'Go to sourcing' : undefined}
      onAction={count > 0 ? () => navigate('/buyer/sourcing') : undefined}
      expandedRows={expandedRows}
    />
  );
};

export default BuyerRfqAwaitingAwardWidget;
