// ─────────────────────────────────────────────────────────────────────────────
// OPS-3 · SUPPLIER SHIP NOTICES ON THE BUYER'S SHIPMENTS PAGE.
//
// A supplier who submitted a ship notice in this portal could not be seen from
// `/buyer/shipments`: that page reads the carrier and warehouse shipment
// records, and a notice the supplier just sent has no such record. The notice
// existed, receiving could open it, and the page a buyer goes to for "what is
// on its way" did not hold it.
//
// This section lists those notices in their OWN state — the ship-notice
// machine's (`Submitted`, `In Transit`, `Delivered`, `Discrepancy`). They are
// deliberately NOT folded into the shipment rows above: a shipment row carries
// a mode, a route, a dock and a carrier-reported state, and a notice has none
// of them. Projecting one into the other would mean inventing those fields.
//
// A `Draft` is the supplier's own working copy and is not shown here.
//
// The read is this section's own: a failed or pending read is stated here and
// never gates the page.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight } from 'lucide-react';
import StatusPill from '../../components/ui-v2/StatusPill';
import { Card } from '../../components/ui-v2/Card';
import { IconButton } from '../../components/ui-v2/Actions';
import Data from '../../components/ui-v2/Data';
import { FieldList, Field } from '../../components/ui-v2/Field';
import DataTable, { CellSub, type Column } from '../../components/ui-v2/DataTable';
import { useASNs, useGoodsReceipts } from '../../services/query/hooks';
import { receiptsOfNotice } from '../../services/data/orderReceipt';
import { ReceivedOnNotice } from '../../components/v2-features/ReceivedBlock';
import type { ASN, AsnStatus } from '../../services/data/types';
import { statusLabelKey } from '../../lib/statusLabel';
import { formatDate, formatNumber } from '../../lib/format';

const STATE_TONE: Record<AsnStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  Draft: 'neutral',
  Submitted: 'neutral',
  'In Transit': 'warning',
  Delivered: 'success',
  Discrepancy: 'danger',
};

/** The notices a buyer is shown: every one the supplier has SENT. */
export const sentShipNotices = (asns: readonly ASN[]): ASN[] =>
  asns.filter((a) => a.status !== 'Draft');

type NoticeLine = ASN['lineItems'][number];

const dash = (v: string | undefined): string => (v && v !== '—' ? v : '—');

interface Props {
  /** The page's search box, so one search covers both lists. */
  search: string;
  /** Supplier names, resolved by the page's own supplier read. */
  supplierName: (supplierId: string) => string;
}

const SupplierShipNotices: React.FC<Props> = ({ search, supplierName }) => {
  const { t } = useTranslation();
  const query = useASNs();
  // E2E-2 — the receipt recorded against each notice, read not written.
  const receiptsQuery = useGoodsReceipts();
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());

  const notices = useMemo(() => sentShipNotices(query.data?.items ?? []), [query.data]);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notices;
    return notices.filter(
      (a) =>
        a.asnNumber.toLowerCase().includes(q) ||
        a.poReference.toLowerCase().includes(q) ||
        supplierName(a.supplierId).toLowerCase().includes(q) ||
        a.trackingNumber.toLowerCase().includes(q),
    );
  }, [notices, search, supplierName]);

  const toggle = (asnNumber: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(asnNumber)) next.delete(asnNumber);
      else next.add(asnNumber);
      return next;
    });

  const columns: Column<ASN>[] = [
    {
      id: 'toggle',
      header: '',
      kind: 'actions',
      headerClassName: 'w-8',
      className: 'w-8',
      cell: (a) => {
        const isOpen = open.has(a.asnNumber);
        return (
          <IconButton
            icon={isOpen ? ChevronDown : ChevronRight}
            onClick={() => toggle(a.asnNumber)}
            aria-expanded={isOpen}
            aria-label={t('shipments.notices.toggle', { asn: a.asnNumber })}
          />
        );
      },
    },
    {
      id: 'asnPo',
      header: t('shipments.table.col.asnPo'),
      kind: 'id',
      cell: (a) => (
        <>
          <Data as="div">{a.asnNumber}</Data>
          <CellSub>{a.poReference}</CellSub>
        </>
      ),
    },
    {
      id: 'supplier',
      header: t('shipments.table.col.supplier'),
      kind: 'text',
      cell: (a) => supplierName(a.supplierId),
    },
    {
      id: 'carrier',
      header: t('shipments.notices.col.carrier'),
      kind: 'text',
      cell: (a) => (
        <>
          {dash(a.carrier)}
          <CellSub>{dash(a.trackingNumber)}</CellSub>
        </>
      ),
    },
    {
      id: 'shipDate',
      header: t('shipments.table.col.shipDate'),
      kind: 'date',
      cell: (a) => <Data>{formatDate(a.details.shipDate)}</Data>,
    },
    {
      id: 'eta',
      header: t('shipments.table.col.eta'),
      kind: 'date',
      cell: (a) => <Data>{formatDate(a.eta === '—' ? '' : a.eta)}</Data>,
    },
    {
      id: 'packages',
      header: t('shipments.table.col.packages'),
      kind: 'number',
      cell: (a) => (
        <Data>{a.details.totalCartons ? formatNumber(a.details.totalCartons) : '—'}</Data>
      ),
    },
    {
      id: 'weight',
      header: t('shipments.notices.col.weight'),
      kind: 'number',
      cell: (a) => (
        <Data>
          {a.details.grossWeightKg ? `${formatNumber(a.details.grossWeightKg)} kg` : '—'}
        </Data>
      ),
    },
    {
      id: 'status',
      header: t('shipments.table.col.status'),
      kind: 'status',
      cell: (a) => (
        <StatusPill variant={STATE_TONE[a.status]}>
          {t(statusLabelKey(a.status) ?? a.status)}
        </StatusPill>
      ),
    },
  ];

  const lineColumns: Column<NoticeLine>[] = [
    {
      id: 'material',
      header: t('shipments.notices.line.material'),
      kind: 'id',
      cell: (li) => (
        <>
          <Data as="div">{li.materialCode}</Data>
          <CellSub>{li.description}</CellSub>
        </>
      ),
    },
    {
      id: 'ordered',
      header: t('shipments.notices.line.ordered'),
      kind: 'number',
      cell: (li) => <Data>{formatNumber(li.orderedQty)}</Data>,
    },
    {
      id: 'shipped',
      header: t('shipments.notices.line.shipped'),
      kind: 'number',
      cell: (li) => (
        <Data className={li.shippedQty < li.orderedQty ? 'text-warning-hover' : ''}>
          {formatNumber(li.shippedQty)}
        </Data>
      ),
    },
    {
      id: 'lot',
      header: t('shipments.notices.line.lot'),
      kind: 'id',
      cell: (li) => <Data>{li.lotNumber || '—'}</Data>,
    },
  ];

  return (
    <Card
      as="section"
      padding="none"
      className="overflow-hidden mb-6"
      data-testid="supplier-ship-notices"
    >
      <div className="px-4 py-3 border-b border-border-subtle bg-bg-subtle">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-text-primary">
            {t('shipments.notices.title')}
          </span>
          {!query.isPending && !query.isError && (
            <span className="ml-auto text-xs text-text-tertiary" data-testid="ship-notices-count">
              {t('shipments.notices.count', { count: shown.length })}
            </span>
          )}
        </div>
        <p className="text-xs text-text-secondary mt-1">{t('shipments.notices.explainer')}</p>
      </div>

      {query.isPending ? (
        <div className="px-4 py-6 text-sm text-text-tertiary">{t('shipments.notices.loading')}</div>
      ) : query.isError ? (
        <div className="px-4 py-6 text-sm text-critical" role="alert">
          {t('shipments.notices.failed')}
        </div>
      ) : shown.length === 0 ? (
        <div className="px-4 py-6 text-sm text-text-tertiary">{t('shipments.notices.empty')}</div>
      ) : (
        <DataTable<ASN>
          card={false}
          columns={columns}
          rows={shown}
          rowKey={(a) => a.asnNumber}
          rowProps={(a) => ({ 'data-testid': `ship-notice-${a.asnNumber}` })}
          rowDetail={(a) =>
            open.has(a.asnNumber) ? (
              <div
                className="bg-bg-subtle rounded-md px-3 py-3"
                data-testid={`ship-notice-detail-${a.asnNumber}`}
              >
                <div className="mb-3">
                  <ReceivedOnNotice
                    receipts={receiptsOfNotice(a.asnNumber, receiptsQuery.data?.items ?? [])}
                    testId={`ship-notice-received-${a.asnNumber}`}
                  />
                </div>
                <FieldList columns={2} className="lg:grid-cols-3 mb-3">
                  <Field label={t('shipments.notices.batch')} kind="id">
                    {a.details.batchNumber ?? '—'}
                  </Field>
                  <Field label={t('shipments.notices.packingList')} kind="text">
                    {a.details.packingListName
                      ? t('shipments.notices.packingListName', {
                          name: a.details.packingListName,
                        })
                      : '—'}
                  </Field>
                  <Field label={t('shipments.notices.notes')} kind="text">
                    {a.details.notes ?? '—'}
                  </Field>
                </FieldList>
                <DataTable<NoticeLine>
                  density="compact"
                  card={false}
                  columns={lineColumns}
                  rows={a.lineItems}
                  rowKey={(li) => li.materialCode}
                />
              </div>
            ) : null
          }
        />
      )}
    </Card>
  );
};

export default SupplierShipNotices;
