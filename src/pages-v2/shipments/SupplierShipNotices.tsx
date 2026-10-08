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
import Data from '../../components/ui-v2/Data';
import { useASNs } from '../../services/query/hooks';
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

  return (
    <section
      className="border border-border-subtle rounded-lg bg-white overflow-hidden mb-6"
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
        <div className="px-4 py-6 text-sm text-danger" role="alert">
          {t('shipments.notices.failed')}
        </div>
      ) : shown.length === 0 ? (
        <div className="px-4 py-6 text-sm text-text-tertiary">{t('shipments.notices.empty')}</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-bg-hover text-xs text-text-tertiary uppercase tracking-wider">
            <tr>
              <th className="w-8" />
              <th className="text-left px-3 py-2 font-semibold">{t('shipments.table.col.asnPo')}</th>
              <th className="text-left px-3 py-2 font-semibold">{t('shipments.table.col.supplier')}</th>
              <th className="text-left px-3 py-2 font-semibold">{t('shipments.notices.col.carrier')}</th>
              <th className="text-left px-3 py-2 font-semibold">{t('shipments.table.col.shipDate')}</th>
              <th className="text-left px-3 py-2 font-semibold">{t('shipments.table.col.eta')}</th>
              <th className="text-right px-3 py-2 font-semibold">{t('shipments.table.col.packages')}</th>
              <th className="text-right px-3 py-2 font-semibold">{t('shipments.notices.col.weight')}</th>
              <th className="text-left px-3 py-2 font-semibold">{t('shipments.table.col.status')}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((a) => {
              const isOpen = open.has(a.asnNumber);
              return (
                <React.Fragment key={a.asnNumber}>
                  <tr
                    className="border-t border-border-subtle"
                    data-testid={`ship-notice-${a.asnNumber}`}
                  >
                    <td className="pl-3">
                      <button
                        type="button"
                        onClick={() => toggle(a.asnNumber)}
                        aria-expanded={isOpen}
                        aria-label={t('shipments.notices.toggle', { asn: a.asnNumber })}
                        className="p-1 text-text-tertiary hover:text-text-primary"
                      >
                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <Data as="div" className="font-semibold">
                        {a.asnNumber}
                      </Data>
                      <Data as="div" className="text-xs text-text-tertiary">
                        {a.poReference}
                      </Data>
                    </td>
                    <td className="px-3 py-2 text-text-primary">{supplierName(a.supplierId)}</td>
                    <td className="px-3 py-2">
                      <div className="text-text-primary">{dash(a.carrier)}</div>
                      <Data as="div" className="text-xs text-text-tertiary">
                        {dash(a.trackingNumber)}
                      </Data>
                    </td>
                    <td className="px-3 py-2">
                      <Data>{formatDate(a.details.shipDate)}</Data>
                    </td>
                    <td className="px-3 py-2">
                      <Data>{formatDate(a.eta === '—' ? '' : a.eta)}</Data>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Data>{a.details.totalCartons ? formatNumber(a.details.totalCartons) : '—'}</Data>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Data>
                        {a.details.grossWeightKg
                          ? `${formatNumber(a.details.grossWeightKg)} kg`
                          : '—'}
                      </Data>
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill variant={STATE_TONE[a.status]}>
                        {t(statusLabelKey(a.status) ?? a.status)}
                      </StatusPill>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-bg-subtle" data-testid={`ship-notice-detail-${a.asnNumber}`}>
                      <td />
                      <td colSpan={8} className="px-3 py-3">
                        <dl className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5 text-xs mb-3">
                          <div>
                            <dt className="text-text-tertiary">{t('shipments.notices.batch')}</dt>
                            <dd className="text-text-primary">
                              <Data>{a.details.batchNumber ?? '—'}</Data>
                            </dd>
                          </div>
                          <div>
                            <dt className="text-text-tertiary">{t('shipments.notices.packingList')}</dt>
                            <dd className="text-text-primary">
                              {a.details.packingListName
                                ? t('shipments.notices.packingListName', {
                                    name: a.details.packingListName,
                                  })
                                : '—'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-text-tertiary">{t('shipments.notices.notes')}</dt>
                            <dd className="text-text-primary">{a.details.notes ?? '—'}</dd>
                          </div>
                        </dl>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-text-tertiary uppercase">
                              <th className="text-left py-1">{t('shipments.notices.line.material')}</th>
                              <th className="text-right py-1">{t('shipments.notices.line.ordered')}</th>
                              <th className="text-right py-1">{t('shipments.notices.line.shipped')}</th>
                              <th className="text-left py-1 pl-4">{t('shipments.notices.line.lot')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {a.lineItems.map((li) => (
                              <tr key={li.materialCode} className="border-t border-border-subtle">
                                <td className="py-1.5">
                                  <Data className="text-text-tertiary">{li.materialCode}</Data>{' '}
                                  <span className="text-text-primary">{li.description}</span>
                                </td>
                                <td className="py-1.5 text-right">
                                  <Data>{formatNumber(li.orderedQty)}</Data>
                                </td>
                                <td
                                  className={`py-1.5 text-right ${
                                    li.shippedQty < li.orderedQty ? 'text-warning-hover font-semibold' : ''
                                  }`}
                                >
                                  <Data>{formatNumber(li.shippedQty)}</Data>
                                </td>
                                <td className="py-1.5 pl-4">
                                  <Data>{li.lotNumber || '—'}</Data>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
};

export default SupplierShipNotices;
