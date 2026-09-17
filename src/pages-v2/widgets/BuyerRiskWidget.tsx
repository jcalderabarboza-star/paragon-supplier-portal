import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import ExpandableWidget, {
  type FlagSeverity,
} from '../../components/ui-v2/ExpandableWidget';
import Table from '../../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../../components/ui-v2/TableHeader';
import TableRow from '../../components/ui-v2/TableRow';
import TableCell from '../../components/ui-v2/TableCell';
import StatusPill from '../../components/ui-v2/StatusPill';
import RecordRowLink from './RecordRowLink';
import { useRiskAlerts } from '../../services/query/hooks';
import type { RiskAlert, RiskAlertLevel } from '../../services/data/types';

// Capability "risk": a buyer-side fixture (no risk engine in the spine yet, so no
// wired CommandTarget) → the LivenessRegistry derives SIMULATED → amber "Sample"
// pill. Flag severity still derives honestly from the fixture's real alert levels.
const LEVEL_TONE: Record<RiskAlertLevel, 'danger' | 'warning' | 'info'> = {
  critical: 'danger',
  warning: 'warning',
  info: 'info',
};

const isActionable = (a: RiskAlert): boolean =>
  a.level === 'critical' || a.level === 'warning';

const BuyerRiskWidget: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const query = useRiskAlerts();

  const active = useMemo(
    () => (query.data?.items ?? []).filter(isActionable),
    [query.data],
  );
  const count = active.length;
  const critical = useMemo(
    () => active.filter((a) => a.level === 'critical').length,
    [active],
  );
  const severity: FlagSeverity =
    critical > 0 ? 'critical' : count > 0 ? 'warning' : 'none';

  const expandedRows =
    count === 0 ? (
      <div className="text-sm text-text-tertiary">{t('widget.risk.empty')}</div>
    ) : (
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('widget.risk.col.level')}</TableHeaderCell>
          <TableHeaderCell>{t('widget.risk.col.alert')}</TableHeaderCell>
          <TableHeaderCell>{t('widget.risk.col.detail')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {active.map((a) => (
            <TableRow key={a.id} className="relative">
              <TableCell>
                <StatusPill variant={LEVEL_TONE[a.level]}>{a.level}</StatusPill>
              </TableCell>
              <TableCell className="font-medium text-text-primary">
                {/* /buyer/risk has NO per-alert detail panel, so this link does
                    what the tree's one existing URL-selection site does: it
                    lands on the row itself, scrolled to and highlighted
                    (`Glossary.tsx`'s `?term=` chip). No panel is invented and
                    the page is not redesigned. */}
                <RecordRowLink path="/buyer/risk" id={a.id} label={a.title} />
              </TableCell>
              <TableCell className="text-text-secondary">{a.body}</TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    );

  return (
    <ExpandableWidget
      title={t('widget.risk.title')}
      icon={ShieldAlert}
      count={count}
      capability="risk"
      flagSeverity={severity}
      flagLabel={
        count > 0
          ? critical > 0
            ? t('widget.risk.flag.withCritical', { count, critical })
            : t('widget.risk.flag.active', { count })
          : undefined
      }
      actionLabel={count > 0 ? t('widget.risk.action') : undefined}
      onAction={count > 0 ? () => navigate('/buyer/risk') : undefined}
      expandedRows={expandedRows}
    />
  );
};

export default BuyerRiskWidget;
