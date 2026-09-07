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
// ⚠️ `|| d.status === 'Expired'` IS GONE BECAUSE THE UNION MEMBER IS.
// `'Expired'` was produced by nothing — 0 of 16 fixture rows, no function
// returning it, no transition reaching it — so this arm never once selected a
// document, and the `critical` severity and `withExpired` flag it fed were
// dead by construction rather than merely unused. Behaviour is unchanged:
// what was unreachable is now also unwritable.
//
// ⚠️ **AND THE DIVERGENCE THIS EXPOSES IS FILED, NOT FIXED HERE.** This widget
// asks the STATUS field what "expiring" means; `SupplierDocuments.tsx` asks
// the CLOCK (`daysUntil(expiryDate) <= 180`). They can disagree on the same
// document, and after this change only the page can ever say "expired" at all.
const isExpiring = (d: SupplierDocument): boolean => d.status === 'Expiring Soon';

const SupplierCertsExpiringWidget: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const query = useDocuments();

  const expiring = useMemo(
    () => (query.data?.items ?? []).filter(isExpiring),
    [query.data],
  );
  const count = expiring.length;
  // `critical` was reachable only through an `expired` count that could never
  // be non-zero. Removed with its cause rather than left as a branch nothing
  // can enter — an unreachable severity is a claim the widget cannot honour.
  const severity: FlagSeverity = count > 0 ? 'warning' : 'none';

  const expandedRows =
    count === 0 ? (
      <div className="text-sm text-text-tertiary">
        No certificates expiring.
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
      flagLabel={count > 0 ? t('widget.certsExpiring.flag.expiring', { count }) : undefined}
      actionLabel={count > 0 ? t('widget.certsExpiring.action') : undefined}
      onAction={count > 0 ? () => navigate('/supplier/documents') : undefined}
      expandedRows={expandedRows}
    />
  );
};

export default SupplierCertsExpiringWidget;
