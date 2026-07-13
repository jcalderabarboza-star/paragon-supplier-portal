import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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

// Capability "supplierDocuments": backed by the supplierDocument flow, which is
// registered but author-unwired (F0.4 inert — no CommandTarget) → the
// LivenessRegistry derives SIMULATED → amber "Sample" pill. The expiry flag still
// derives honestly from the fixture's real document status.
const isExpiring = (d: SupplierDocument): boolean =>
  d.status === 'Expiring Soon' || d.status === 'Expired';

const SupplierCertsExpiringWidget: React.FC = () => {
  const { t } = useTranslation();
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
    expired > 0 ? 'critical' : count > 0 ? 'warning' : 'none';

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
      title={t('widget.certsExpiring.title')}
      icon={FileWarning}
      count={count}
      capability="supplierDocuments"
      flagSeverity={severity}
      flagLabel={
        count > 0
          ? expired > 0
            ? t('widget.certsExpiring.flag.withExpired', { count, expired })
            : t('widget.certsExpiring.flag.expiring', { count })
          : undefined
      }
      actionLabel={count > 0 ? t('widget.certsExpiring.action') : undefined}
      onAction={count > 0 ? () => navigate('/supplier/documents') : undefined}
      expandedRows={expandedRows}
    />
  );
};

export default SupplierCertsExpiringWidget;
