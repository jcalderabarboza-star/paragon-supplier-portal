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
import { formatDate } from '../../lib/format';
import { useComplianceRegistry } from '../../services/query/hooks';
import { computeStatus, daysRemaining } from '../../services/data/complianceProjection';
import { certTypeLabelKey } from '../../lib/complianceView';
import { statusTone } from '../../lib/statusTone';

// Capability "compliance": the canonical registry is a buyer-side fixture (no
// wired CommandTarget) → the LivenessRegistry derives SIMULATED → amber "Sample"
// pill. Flag severity still derives honestly from the COMPUTED expiry state.
// I3.2: re-pointed from the 8-row `ComplianceRow` read (`risk.getCompliance`) to
// the canonical `getComplianceRegistry` — page + widget now read ONE dataset (the
// two-unlinked-datasets divergence is retired for these two surfaces).

const BuyerComplianceWidget: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const now = useMemo(() => new Date().toISOString(), []);
  const query = useComplianceRegistry();

  // Flagged = a computed Expiring/Expired status (law 0.5 — derived, not stored).
  const flagged = useMemo(
    () =>
      (query.data?.items ?? [])
        .map((entry) => ({
          entry,
          status: computeStatus(entry, now),
          days: daysRemaining(entry, now),
        }))
        .filter((r) => r.status === 'Expiring' || r.status === 'Expired'),
    [query.data, now],
  );

  const count = flagged.length;
  const expired = useMemo(
    () => flagged.filter((r) => r.status === 'Expired').length,
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
          {flagged.map(({ entry, status, days }) => (
            <TableRow key={entry.id}>
              <TableCell className="text-text-secondary">
                {entry.supplierName}
              </TableCell>
              <TableCell className="font-medium text-text-primary">
                {t(certTypeLabelKey(entry.certType))}
              </TableCell>
              <TableCell className="whitespace-nowrap text-text-secondary">
                <Data>{formatDate(entry.expiryDate)}</Data>
              </TableCell>
              <TableCell className="text-right text-text-secondary">
                <Data>{days ?? '—'}d</Data>
              </TableCell>
              <TableCell>
                <StatusPill variant={statusTone(status)}>{status}</StatusPill>
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    );

  return (
    <ExpandableWidget
      title={t('widget.compliance.title')}
      icon={FileWarning}
      count={count}
      capability="compliance"
      flagSeverity={severity}
      flagLabel={
        count > 0
          ? expired > 0
            ? t('widget.compliance.flag.withExpired', { count, expired })
            : t('widget.compliance.flag.expiring', { count })
          : undefined
      }
      actionLabel={count > 0 ? t('widget.compliance.action') : undefined}
      onAction={count > 0 ? () => navigate('/buyer/compliance') : undefined}
      expandedRows={expandedRows}
    />
  );
};

export default BuyerComplianceWidget;
