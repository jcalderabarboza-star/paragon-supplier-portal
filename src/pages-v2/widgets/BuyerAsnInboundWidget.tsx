import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
import { pendingAsns, discrepancyAsns, asnTier } from './buyerDerivations';

// Buyer inbound — LIVE from the ASN store. Count is in-flight ASNs (submitted /
// in transit); a Discrepancy is the red exception that needs reconciliation.
const BuyerAsnInboundWidget: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const query = useASNs();

  const items = query.data?.items ?? [];
  const pending = useMemo(() => pendingAsns(items), [query.data]);
  const discrepancy = useMemo(() => discrepancyAsns(items).length, [query.data]);
  const count = pending.length;

  const expandedRows =
    count === 0 ? (
      <div className="text-sm text-text-tertiary">{t('widget.asnInbound.empty')}</div>
    ) : (
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('widget.asnInbound.col.asn')}</TableHeaderCell>
          <TableHeaderCell>{t('widget.asnInbound.col.poRef')}</TableHeaderCell>
          <TableHeaderCell>{t('widget.asnInbound.col.carrier')}</TableHeaderCell>
          <TableHeaderCell>{t('widget.asnInbound.col.eta')}</TableHeaderCell>
          <TableHeaderCell>{t('widget.asnInbound.col.status')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {pending.map((asn) => (
            <TableRow key={asn.asnNumber} className="relative">
              <TableCell>
                {/* ⚠️ **THESE ROWS ARE DELIBERATELY NOT LINKS, AND THE REASON IS
                    A MEASUREMENT.** Every other window drills into its record;
                    this one has nowhere to drill to. Derived: the ASN corpus
                    and the shipment corpus DO NOT JOIN — ASNs are numbered
                    `ASN-2025-*` and every shipment's `asnNumber` is
                    `ASN-2026-*`, so the intersection is empty and a link to
                    `/buyer/shipments` would land on a board that has never
                    heard of this row. The only other surface that reads ASNs is
                    the goods-receipt page, where an ASN opens the RECEIVING
                    WIZARD — a write path, not a detail view, and one with an
                    open finding against its interior.
                    A link that goes nowhere is the dead affordance the ratchet
                    exists to stop, so the window keeps its count, its rows and
                    its CTA, and offers no click it cannot honour. */}
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
      title={t('widget.asnInbound.title')}
      icon={Truck}
      count={count}
      capability="advanceShipNotices"
      flagSeverity={asnTier(items)}
      flagLabel={
        count > 0
          ? discrepancy > 0
            ? t('widget.asnInbound.flag.withDiscrepancy', { count, discrepancy })
            : t('widget.asnInbound.flag.plain', { count })
          : undefined
      }
      actionLabel={count > 0 ? t('widget.asnInbound.action') : undefined}
      onAction={count > 0 ? () => navigate('/buyer/shipments') : undefined}
      expandedRows={expandedRows}
    />
  );
};

export default BuyerAsnInboundWidget;
