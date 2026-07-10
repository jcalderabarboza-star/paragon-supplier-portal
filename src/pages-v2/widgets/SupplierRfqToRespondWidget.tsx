import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
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
import { formatDate } from '../../lib/format';
import { useCurrentIdentity } from '../../context/CurrentIdentityContext';
import { useRFQs } from '../../services/query/hooks';
import type { RFQ } from '../../services/data/types';

// Supplier RFQ-to-respond — LIVE from the RFQ store (PR #41). The service already
// scopes the read to RFQs this supplier was invited to; we surface the Open ones
// it hasn't responded to yet. Replaces the old hardcoded "Open Sourcing 2" KPI.
const SupplierRfqToRespondWidget: React.FC = () => {
  const navigate = useNavigate();
  const { identity } = useCurrentIdentity();
  const supplierId = identity.supplierId;
  const query = useRFQs();

  const open = useMemo(
    () =>
      (query.data?.items ?? []).filter(
        (r: RFQ) =>
          r.status === 'Open' &&
          !!supplierId &&
          !r.respondedSupplierIds.includes(supplierId),
      ),
    [query.data, supplierId],
  );
  const count = open.length;
  const now = new Date();
  const late = useMemo(
    () => open.filter((r) => new Date(r.responseDeadline).getTime() < now.getTime()).length,
    [open],
  );
  const severity: FlagSeverity =
    late > 0 ? 'warning' : count > 0 ? 'info' : 'none';

  const expandedRows =
    count === 0 ? (
      <div className="text-sm text-text-tertiary">
        No open RFQs are awaiting your response.
      </div>
    ) : (
      <Table>
        <TableHeader>
          <TableHeaderCell>RFQ #</TableHeaderCell>
          <TableHeaderCell>Title</TableHeaderCell>
          <TableHeaderCell>Category</TableHeaderCell>
          <TableHeaderCell>Respond by</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
        </TableHeader>
        <tbody>
          {open.map((rfq) => (
            <TableRow key={rfq.id}>
              <TableCell>
                <Data className="text-xs font-bold text-text-primary">
                  {rfq.rfqNumber}
                </Data>
              </TableCell>
              <TableCell className="text-text-secondary">{rfq.title}</TableCell>
              <TableCell className="text-text-secondary">
                {rfq.materialCategory}
              </TableCell>
              <TableCell className="whitespace-nowrap text-text-secondary">
                <Data>{formatDate(rfq.responseDeadline)}</Data>
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
      title="RFQs to respond"
      icon={ClipboardList}
      count={count}
      live
      flagSeverity={severity}
      flagLabel={
        count > 0
          ? late > 0
            ? `${count} open · ${late} past deadline`
            : `${count} to respond`
          : undefined
      }
      actionLabel={count > 0 ? 'Respond' : undefined}
      onAction={count > 0 ? () => navigate('/supplier/rfqs') : undefined}
      expandedRows={expandedRows}
    />
  );
};

export default SupplierRfqToRespondWidget;
