import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FileWarning } from 'lucide-react';
import ExpandableWidget, {
  type FlagSeverity,
} from '../../components/ui-v2/ExpandableWidget';
import DataTable from '../../components/ui-v2/DataTable';
import Data from '../../components/ui-v2/Data';
import RecordRowLink from './RecordRowLink';
import StatusPill from '../../components/ui-v2/StatusPill';
import { formatDate } from '../../lib/format';
import { useComplianceRegistry } from '../../services/query/hooks';
import { computeStatus, daysRemaining } from '../../services/data/complianceProjection';
import { certTypeLabelKey } from '../../lib/complianceView';
import { statusTone } from '../../lib/statusTone';
import { PRESENT_ISO } from '../dashboard/buyerDashboardDerivations';

// Capability "compliance": the canonical registry is a buyer-side fixture (no
// wired CommandTarget) → the LivenessRegistry derives SIMULATED → amber "Sample"
// pill. Flag severity still derives honestly from the COMPUTED expiry state.
// I3.2: re-pointed from the 8-row `ComplianceRow` read (`risk.getCompliance`) to
// the canonical `getComplianceRegistry` — page + widget now read ONE dataset (the
// two-unlinked-datasets divergence is retired for these two surfaces).

const BuyerComplianceWidget: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // ⚠️ **THE DECLARED PRESENT, NOT THE WALL CLOCK.** This widget used to read
  // `new Date()`, which put it on a different instant from `/buyer/compliance`
  // — the page the card links to — so the two showed DIFFERENT ROWS for the
  // same question. Measured: the flagged TOTAL is 7 either way, but at the wall
  // clock it is 6 expired + 1 expiring and at P it is 4 + 3. A count-only check
  // cannot see that, which is why the spec pins the expired subset by cert
  // number.
  const now = PRESENT_ISO;
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
        {t('widget.compliance.empty')}
      </div>
    ) : (
      <DataTable
        card={false}
        rows={flagged}
        rowKey={(r) => r.entry.id}
        rowProps={() => ({ className: 'relative' })}
        columns={[
          /* /buyer/compliance has no per-certificate detail panel — its
             only SidePanel is the document-REQUEST flow — so this lands
             on the ROW, scrolled to and highlighted, the way
             `Glossary.tsx`'s `?term=` chip does. Operator ruling. */
          {
            id: 'supplier',
            header: t('widget.compliance.col.supplier'),
            kind: 'text',
            cell: ({ entry }) => (
              <span className="text-text-secondary">
                <RecordRowLink
                  path="/buyer/compliance"
                  id={entry.id}
                  name={entry.certNumber}
                  label={entry.supplierName}
                />
              </span>
            ),
          },
          {
            id: 'certificate',
            header: t('widget.compliance.col.certificate'),
            kind: 'text',
            className: 'font-medium',
            cell: ({ entry }) => t(certTypeLabelKey(entry.certType)),
          },
          {
            id: 'expires',
            header: t('widget.compliance.col.expires'),
            kind: 'date',
            cell: ({ entry }) => (
              <>
                <Data className="block text-[11px] text-text-tertiary">{entry.certNumber}</Data>
                <Data>{formatDate(entry.expiryDate)}</Data>
              </>
            ),
          },
          {
            id: 'daysLeft',
            header: t('widget.compliance.col.daysLeft'),
            kind: 'number',
            cell: ({ days }) => <Data>{days ?? '—'}d</Data>,
          },
          {
            id: 'status',
            header: t('widget.compliance.col.status'),
            kind: 'status',
            cell: ({ status }) => <StatusPill variant={statusTone(status)}>{status}</StatusPill>,
          },
        ]}
      />
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
