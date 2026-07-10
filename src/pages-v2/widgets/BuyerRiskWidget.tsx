import React, { useMemo } from 'react';
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
import { useRiskAlerts } from '../../services/query/hooks';
import type { RiskAlert, RiskAlertLevel } from '../../services/data/types';

// SAMPLE (live=false): risk alerts are a buyer-side fixture (no risk engine in
// the spine yet) → amber "Sample data" pill. Flag severity derives honestly from
// the fixture's real alert levels.
const LEVEL_TONE: Record<RiskAlertLevel, 'danger' | 'warning' | 'info'> = {
  critical: 'danger',
  warning: 'warning',
  info: 'info',
};

const isActionable = (a: RiskAlert): boolean =>
  a.level === 'critical' || a.level === 'warning';

const BuyerRiskWidget: React.FC = () => {
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
      <div className="text-sm text-text-tertiary">No active risk alerts.</div>
    ) : (
      <Table>
        <TableHeader>
          <TableHeaderCell>Level</TableHeaderCell>
          <TableHeaderCell>Alert</TableHeaderCell>
          <TableHeaderCell>Detail</TableHeaderCell>
        </TableHeader>
        <tbody>
          {active.map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                <StatusPill variant={LEVEL_TONE[a.level]}>{a.level}</StatusPill>
              </TableCell>
              <TableCell className="font-medium text-text-primary">
                {a.title}
              </TableCell>
              <TableCell className="text-text-secondary">{a.body}</TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    );

  return (
    <ExpandableWidget
      title="Risk alerts"
      icon={ShieldAlert}
      count={count}
      live={false}
      flagSeverity={severity}
      flagLabel={
        count > 0
          ? critical > 0
            ? `${count} active · ${critical} critical`
            : `${count} active`
          : undefined
      }
      actionLabel={count > 0 ? 'View risk' : undefined}
      onAction={count > 0 ? () => navigate('/buyer/risk') : undefined}
      expandedRows={expandedRows}
    />
  );
};

export default BuyerRiskWidget;
