import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileWarning } from 'lucide-react';
import ExpandableWidget, {
  type FlagSeverity,
} from '../../components/ui-v2/ExpandableWidget';
import Table from '../../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../../components/ui-v2/TableHeader';
import TableRow from '../../components/ui-v2/TableRow';
import TableCell from '../../components/ui-v2/TableCell';
import Data from '../../components/ui-v2/Data';
import StatusPill from '../../components/ui-v2/StatusPill';
import { formatDate } from '../../lib/format';
import { useCompliance } from '../../services/query/hooks';
import type { ComplianceRow, ComplianceState } from '../../services/data/types';

// SAMPLE (live=false): supplier compliance is a buyer-side fixture → amber
// "Sample data" pill. Flag severity derives honestly from the real expiry state.
const STATE_TONE: Record<ComplianceState, 'success' | 'warning' | 'danger'> = {
  ok: 'success',
  expiring: 'warning',
  expired: 'danger',
};

const isFlagged = (c: ComplianceRow): boolean =>
  c.status === 'expiring' || c.status === 'expired';

const BuyerComplianceWidget: React.FC = () => {
  const navigate = useNavigate();
  const query = useCompliance();

  const flagged = useMemo(
    () => (query.data?.items ?? []).filter(isFlagged),
    [query.data],
  );
  const count = flagged.length;
  const expired = useMemo(
    () => flagged.filter((c) => c.status === 'expired').length,
    [flagged],
  );
  const severity: FlagSeverity =
    expired > 0 ? 'critical' : count > 0 ? 'warning' : 'none';

  const expandedRows =
    count === 0 ? (
      <div className="text-sm text-text-tertiary">
        No certificates expiring or expired.
      </div>
    ) : (
      <Table>
        <TableHeader>
          <TableHeaderCell>Supplier</TableHeaderCell>
          <TableHeaderCell>Certificate</TableHeaderCell>
          <TableHeaderCell>Expires</TableHeaderCell>
          <TableHeaderCell className="text-right">Days left</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
        </TableHeader>
        <tbody>
          {flagged.map((c, i) => (
            <TableRow key={`${c.supplier}-${c.type}-${i}`}>
              <TableCell className="text-text-secondary">{c.supplier}</TableCell>
              <TableCell className="font-medium text-text-primary">
                {c.type}
              </TableCell>
              <TableCell className="whitespace-nowrap text-text-secondary">
                <Data>{formatDate(c.expires)}</Data>
              </TableCell>
              <TableCell className="text-right text-text-secondary">
                <Data>{c.daysLeft}d</Data>
              </TableCell>
              <TableCell>
                <StatusPill variant={STATE_TONE[c.status]}>
                  {c.status}
                </StatusPill>
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    );

  return (
    <ExpandableWidget
      title="Compliance — expiring certs"
      icon={FileWarning}
      count={count}
      live={false}
      flagSeverity={severity}
      flagLabel={
        count > 0
          ? expired > 0
            ? `${count} flagged · ${expired} expired`
            : `${count} expiring`
          : undefined
      }
      actionLabel={count > 0 ? 'View compliance' : undefined}
      onAction={count > 0 ? () => navigate('/buyer/compliance') : undefined}
      expandedRows={expandedRows}
    />
  );
};

export default BuyerComplianceWidget;
