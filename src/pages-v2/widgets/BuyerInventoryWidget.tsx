import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes } from 'lucide-react';
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
import { useInventory } from '../../services/query/hooks';
import { StockStatus } from '../../types/supplier.types';
import type { InventoryRecord } from '../../types/supplier.types';

// SAMPLE (live=false): inventory is a static fixture (no command mutates it), so
// the widget wears the amber "Sample data" pill by construction. The urgency flag
// is still honestly derived from the fixture's real stockStatus values.
const isLow = (r: InventoryRecord): boolean =>
  r.stockStatus === StockStatus.CRITICAL || r.stockStatus === StockStatus.LOW;

const BuyerInventoryWidget: React.FC = () => {
  const navigate = useNavigate();
  const query = useInventory();

  const low = useMemo(
    () => (query.data?.items ?? []).filter(isLow),
    [query.data],
  );
  const count = low.length;
  const critical = useMemo(
    () => low.filter((r) => r.stockStatus === StockStatus.CRITICAL).length,
    [low],
  );
  const severity: FlagSeverity =
    critical > 0 ? 'danger' : count > 0 ? 'warning' : 'none';

  const expandedRows =
    count === 0 ? (
      <div className="text-sm text-text-tertiary">No low or blocked stock.</div>
    ) : (
      <Table>
        <TableHeader>
          <TableHeaderCell>Material</TableHeaderCell>
          <TableHeaderCell>Description</TableHeaderCell>
          <TableHeaderCell className="text-right">On hand</TableHeaderCell>
          <TableHeaderCell className="text-right">Days supply</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
        </TableHeader>
        <tbody>
          {low.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <Data className="text-xs font-bold text-text-primary">
                  {r.materialCode}
                </Data>
              </TableCell>
              <TableCell className="text-text-secondary">
                {r.materialDescription}
              </TableCell>
              <TableCell className="text-right text-text-secondary">
                <Data>
                  {r.qtyOnHand} {r.uom}
                </Data>
              </TableCell>
              <TableCell className="text-right text-text-secondary">
                <Data>{r.daysOfSupply}d</Data>
              </TableCell>
              <TableCell>
                <StatusPill variant={statusTone(r.stockStatus)}>
                  {r.stockStatus}
                </StatusPill>
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    );

  return (
    <ExpandableWidget
      title="Inventory — low stock"
      icon={Boxes}
      count={count}
      live={false}
      flagSeverity={severity}
      flagLabel={
        count > 0
          ? critical > 0
            ? `${count} low · ${critical} critical`
            : `${count} low`
          : undefined
      }
      actionLabel={count > 0 ? 'View inventory' : undefined}
      onAction={count > 0 ? () => navigate('/buyer/inventory') : undefined}
      expandedRows={expandedRows}
    />
  );
};

export default BuyerInventoryWidget;
