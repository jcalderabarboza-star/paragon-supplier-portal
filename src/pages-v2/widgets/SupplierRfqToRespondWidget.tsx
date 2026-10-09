import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import ExpandableWidget, {
  type FlagSeverity,
} from '../../components/ui-v2/ExpandableWidget';
import DataTable from '../../components/ui-v2/DataTable';
import Data from '../../components/ui-v2/Data';
import StatusPill from '../../components/ui-v2/StatusPill';
import { statusTone } from '../../lib/statusTone';
import { formatDate } from '../../lib/format';
import { useCurrentIdentity } from '../../context/CurrentIdentityContext';
import { useRFQs } from '../../services/query/hooks';
import type { RFQ } from '../../services/data/types';
import { DECLARED_PRESENT } from '../../services/data/fixturePresent';
import { responseDeadlinePassed } from '../../services/data/quotationSubmitGate';

// Supplier RFQ-to-respond — LIVE from the RFQ store (PR #41). The service already
// scopes the read to RFQs this supplier was invited to; we surface the Open ones
// it hasn't responded to yet. Replaces the old hardcoded "Open Sourcing 2" KPI.
const SupplierRfqToRespondWidget: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { identity } = useCurrentIdentity();
  const supplierId = identity.supplierId;
  const query = useRFQs();

  const open = useMemo(
    () =>
      (query.data?.items ?? []).filter(
        (r: RFQ) =>
          r.status === 'Open' &&
          !!supplierId &&
          // RFx-1 — still invited. A supplier left off a shortlist keeps
          // reading the event (to be told so) and has nothing to respond to.
          r.invitedSupplierIds.includes(supplierId) &&
          !r.respondedSupplierIds.includes(supplierId),
      ),
    [query.data, supplierId],
  );
  const count = open.length;
  // SRC-2 — "past deadline" by the rule the submit verb refuses on, at the
  // declared present. It read the wall clock, so every seeded event was late.
  const late = useMemo(
    () => open.filter((r) => responseDeadlinePassed(r.responseDeadline, DECLARED_PRESENT)).length,
    [open],
  );
  const severity: FlagSeverity =
    late > 0 ? 'warning' : count > 0 ? 'info' : 'none';

  const expandedRows =
    count === 0 ? (
      <div className="text-sm text-text-tertiary">
        No open RFQs are awaiting your response.
      </div>
    ) : (
      <DataTable
        card={false}
        rows={open}
        rowKey={(rfq) => rfq.id}
        columns={[
          {
            id: 'rfq',
            header: 'RFQ #',
            kind: 'id',
            cell: (rfq) => <Data>{rfq.rfqNumber}</Data>,
          },
          {
            id: 'title',
            header: 'Title',
            kind: 'text',
            cell: (rfq) => <span className="text-text-secondary">{rfq.title}</span>,
          },
          {
            id: 'category',
            header: 'Category',
            kind: 'text',
            cell: (rfq) => <span className="text-text-secondary">{rfq.materialCategory}</span>,
          },
          {
            id: 'respondBy',
            header: 'Respond by',
            kind: 'date',
            cell: (rfq) => <Data>{formatDate(rfq.responseDeadline)}</Data>,
          },
          {
            id: 'status',
            header: 'Status',
            kind: 'status',
            cell: (rfq) => <StatusPill variant={statusTone(rfq.status)}>{rfq.status}</StatusPill>,
          },
        ]}
      />
    );

  return (
    <ExpandableWidget
      title={t('widget.rfqRespond.title')}
      icon={ClipboardList}
      count={count}
      capability="rfqs"
      flagSeverity={severity}
      flagLabel={
        count > 0
          ? late > 0
            ? t('widget.rfqRespond.flag.withLate', { count, late })
            : t('widget.rfqRespond.flag.toRespond', { count })
          : undefined
      }
      actionLabel={count > 0 ? t('widget.rfqRespond.action') : undefined}
      onAction={count > 0 ? () => navigate('/supplier/rfqs') : undefined}
      expandedRows={expandedRows}
    />
  );
};

export default SupplierRfqToRespondWidget;
