import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck } from 'lucide-react';
import ExpandableWidget from '../../components/ui-v2/ExpandableWidget';
import Table from '../../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../../components/ui-v2/TableHeader';
import TableRow from '../../components/ui-v2/TableRow';
import TableCell from '../../components/ui-v2/TableCell';
import Data from '../../components/ui-v2/Data';
import StatusPill from '../../components/ui-v2/StatusPill';
import { statusTone } from '../../lib/statusTone';
import { formatDate } from '../../lib/format';
import { useASNs } from '../../services/query/hooks';
import { pendingAsns, discrepancyAsns, band } from './buyerDerivations';

// Buyer inbound — LIVE from the ASN store. Count is in-flight ASNs (submitted /
// in transit); a Discrepancy is the red exception that needs reconciliation.
const BuyerAsnInboundWidget: React.FC = () => {
  const navigate = useNavigate();
  const query = useASNs();

  const items = query.data?.items ?? [];
  const pending = useMemo(() => pendingAsns(items), [query.data]);
  const discrepancy = useMemo(() => discrepancyAsns(items).length, [query.data]);
  const count = pending.length;

  const expandedRows =
    count === 0 ? (
      <div className="text-sm text-text-tertiary">No inbound shipments.</div>
    ) : (
      <Table>
        <TableHeader>
          <TableHeaderCell>ASN #</TableHeaderCell>
          <TableHeaderCell>PO ref</TableHeaderCell>
          <TableHeaderCell>Carrier</TableHeaderCell>
          <TableHeaderCell>ETA</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
        </TableHeader>
        <tbody>
          {pending.map((asn) => (
            <TableRow key={asn.asnNumber}>
              <TableCell>
                <Data className="text-xs font-bold text-text-primary">
                  {asn.asnNumber}
                </Data>
              </TableCell>
              <TableCell>
                <Data className="text-text-secondary">{asn.poReference}</Data>
              </TableCell>
              <TableCell className="text-text-secondary">{asn.carrier}</TableCell>
              <TableCell className="whitespace-nowrap text-text-secondary">
                <Data>{formatDate(asn.eta)}</Data>
              </TableCell>
              <TableCell>
                <StatusPill variant={statusTone(asn.status)}>
                  {asn.status}
                </StatusPill>
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    );

  return (
    <ExpandableWidget
      title="Inbound shipments (ASN)"
      icon={Truck}
      count={count}
      live
      flagSeverity={band(discrepancy > 0, count > 0)}
      flagLabel={
        count > 0
          ? discrepancy > 0
            ? `${count} inbound · ${discrepancy} discrepancy`
            : `${count} inbound`
          : undefined
      }
      actionLabel={count > 0 ? 'View inbound' : undefined}
      onAction={count > 0 ? () => navigate('/buyer/shipments') : undefined}
      expandedRows={expandedRows}
    />
  );
};

export default BuyerAsnInboundWidget;
