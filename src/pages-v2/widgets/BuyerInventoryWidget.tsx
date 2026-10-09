import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Boxes } from 'lucide-react';
import ExpandableWidget, {
  type FlagSeverity,
} from '../../components/ui-v2/ExpandableWidget';
import DataTable from '../../components/ui-v2/DataTable';
import Data from '../../components/ui-v2/Data';
import RecordRowLink from './RecordRowLink';
import StatusPill from '../../components/ui-v2/StatusPill';
import { statusTone } from '../../lib/statusTone';
import { useInventory } from '../../services/query/hooks';
import { StockStatus } from '../../types/supplier.types';
import type { InventoryRecord } from '../../types/supplier.types';

// Capability "inventory": SDC-3b repointed it at the wired InventoryDeclaration
// target (gate-1 LIVE), but it stays harvest-gated on a live supplier feed
// (gate-2) → the LivenessRegistry keeps isLive() false → still an amber pill,
// now reading the specific "Sample — awaiting live supplier feed" waiting-state.
// The urgency flag is still honestly derived from the fixture's real stockStatus.
const isLow = (r: InventoryRecord): boolean =>
  r.stockStatus === StockStatus.CRITICAL || r.stockStatus === StockStatus.LOW;

const BuyerInventoryWidget: React.FC = () => {
  const { t } = useTranslation();
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
    critical > 0 ? 'critical' : count > 0 ? 'warning' : 'none';

  const expandedRows =
    count === 0 ? (
      <div className="text-sm text-text-tertiary">{t('widget.inventory.empty')}</div>
    ) : (
      <DataTable
        card={false}
        rows={low}
        rowKey={(r) => r.id}
        rowProps={() => ({ className: 'relative' })}
        columns={[
          {
            id: 'material',
            header: t('widget.inventory.col.material'),
            kind: 'id',
            cell: (r) => (
              <RecordRowLink
                path="/buyer/inventory"
                id={r.id}
                name={r.materialCode}
                label={<Data>{r.materialCode}</Data>}
              />
            ),
          },
          {
            id: 'description',
            header: t('widget.inventory.col.description'),
            kind: 'text',
            cell: (r) => <span className="text-text-secondary">{r.materialDescription}</span>,
          },
          {
            id: 'onHand',
            header: t('widget.inventory.col.onHand'),
            kind: 'number',
            cell: (r) => (
              <Data>
                {r.qtyOnHand} {r.uom}
              </Data>
            ),
          },
          {
            id: 'daysSupply',
            header: t('widget.inventory.col.daysSupply'),
            kind: 'number',
            cell: (r) => <Data>{r.daysOfSupply}d</Data>,
          },
          {
            id: 'status',
            header: t('widget.inventory.col.status'),
            kind: 'status',
            cell: (r) => <StatusPill variant={statusTone(r.stockStatus)}>{r.stockStatus}</StatusPill>,
          },
        ]}
      />
    );

  return (
    <ExpandableWidget
      title={t('widget.inventory.title')}
      icon={Boxes}
      count={count}
      capability="inventory"
      flagSeverity={severity}
      flagLabel={
        count > 0
          ? critical > 0
            ? t('widget.inventory.flag.withCritical', { count, critical })
            : t('widget.inventory.flag.plain', { count })
          : undefined
      }
      actionLabel={count > 0 ? t('widget.inventory.action') : undefined}
      onAction={count > 0 ? () => navigate('/buyer/inventory') : undefined}
      expandedRows={expandedRows}
    />
  );
};

export default BuyerInventoryWidget;
