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
import { statusTone } from '../../lib/statusTone';
import { formatDate } from '../../lib/format';
import { useDocuments } from '../../services/query/hooks';
import type { SupplierDocument } from '../../services/data/types';

// SAMPLE (live=false): the document set is a fixture (no upload command mutates
// it yet) → amber "Sample data" pill. The expiry flag derives honestly from the
// fixture's real document status.
const isExpiring = (d: SupplierDocument): boolean =>
  d.status === 'Expiring Soon' || d.status === 'Expired';

const SupplierCertsExpiringWidget: React.FC = () => {
  const navigate = useNavigate();
  const query = useDocuments();

  const expiring = useMemo(
    () => (query.data?.items ?? []).filter(isExpiring),
    [query.data],
  );
  const count = expiring.length;
  const expired = useMemo(
    () => expiring.filter((d) => d.status === 'Expired').length,
    [expiring],
  );
  const severity: FlagSeverity =
    expired > 0 ? 'danger' : count > 0 ? 'warning' : 'none';

  const expandedRows =
    count === 0 ? (
      <div className="text-sm text-text-tertiary">
        No certificates expiring or expired.
      </div>
    ) : (
      <Table>
        <TableHeader>
          <TableHeaderCell>Document</TableHeaderCell>
          <TableHeaderCell>Expires</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
        </TableHeader>
        <tbody>
          {expiring.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="font-medium text-text-primary">
                {doc.name}
              </TableCell>
              <TableCell className="whitespace-nowrap text-text-secondary">
                <Data>{doc.expiryDate ? formatDate(doc.expiryDate) : '—'}</Data>
              </TableCell>
              <TableCell>
                <StatusPill variant={statusTone(doc.status)}>
                  {doc.status}
                </StatusPill>
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    );

  return (
    <ExpandableWidget
      title="Certificates — expiring"
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
      actionLabel={count > 0 ? 'View documents' : undefined}
      onAction={count > 0 ? () => navigate('/supplier/documents') : undefined}
      expandedRows={expandedRows}
    />
  );
};

export default SupplierCertsExpiringWidget;
