import React from 'react';
import { useTranslation } from 'react-i18next';

import Data from '../ui-v2/Data';
import StatusPill from '../ui-v2/StatusPill';
import { formatDate, formatIDR, formatNumber } from '../../lib/format';
import type { OrderReceived, ReceiptRef } from '../../services/data/orderReceipt';
import type { InvoiceLineItem } from '../../services/data/types';
import SectionHeading from '../ui-v2/SectionHeading';

// ─────────────────────────────────────────────────────────────────────────────
// E2E-2 · WHAT WAS RECEIVED, SHOWN ON THE ORDER AND ON THE SHIP NOTICE.
//
// Both blocks are READS over the goods receipts the portal holds
// (`services/data/orderReceipt.ts`); neither the order nor the ship notice is
// written to. The order's status is SAP's, and the block says so in words — a
// reader who sees "Confirmed" above "fully received" is owed the reason the two
// can both be true.
//
// One component per document, shared by the buyer's and the supplier's page, so
// the two sides cannot describe one receipt two ways. A supplier's page passes
// the receipts ITS read returned — its own.
// ─────────────────────────────────────────────────────────────────────────────

const ReceiptRow: React.FC<{ r: ReceiptRef; testId: string }> = ({ r, testId }) => {
  const { t } = useTranslation();
  return (
    <li className="text-xs text-text-secondary" data-testid={testId}>
      <Data>{r.grNumber}</Data> · <Data>{formatDate(r.receivedDate)}</Data> ·{' '}
      {/* A receipt of several materials is not summed: kilograms of one and
          pieces of another are not one quantity. */}
      {r.materials === 0 ? (
        t('received.receipt.noneOfOrder')
      ) : r.materials > 1 ? (
        t('received.receipt.materials', { count: r.materials })
      ) : (
        <>
          {t('received.receipt.accepted', { qty: formatNumber(r.accepted) })}
          {r.rejected > 0 ? <> · {t('received.receipt.rejected', { qty: formatNumber(r.rejected) })}</> : null}
        </>
      )}
      {' · '}
      {r.settled && r.sapMaterialDoc ? (
        <>
          {t('received.receipt.sapDoc')} <Data>{r.sapMaterialDoc}</Data>
        </>
      ) : r.settled ? (
        t('received.receipt.posted')
      ) : (
        t('received.receipt.posting')
      )}
    </li>
  );
};

/** On an order: each line's accepted quantity, the receipts, and whose the status is. */
export const ReceivedOnOrder: React.FC<{ received: OrderReceived; testId?: string }> = ({
  received,
  testId = 'order-received',
}) => {
  const { t } = useTranslation();
  const any = received.receipts.length > 0;
  return (
    <section data-testid={testId}>
      <div className="flex items-center gap-2 mb-3">
        <SectionHeading level="group">{t('received.order.title')}</SectionHeading>
        {received.fullyReceived && (
          <span data-testid={`${testId}-full`}>
            <StatusPill variant="success">{t('received.order.full')}</StatusPill>
          </span>
        )}
      </div>
      {any ? (
        <>
          <ul className="space-y-1 mb-2" data-testid={`${testId}-lines`}>
            {received.lines.map((l, i) => (
              <li key={`${l.materialCode}-${i}`} className="text-sm text-text-primary">
                <Data>{l.materialCode}</Data> ·{' '}
                {t('received.order.line', {
                  accepted: formatNumber(l.accepted),
                  confirmed: formatNumber(l.confirmedQty),
                  uom: l.uom,
                })}
              </li>
            ))}
          </ul>
          <ul className="space-y-1" data-testid={`${testId}-receipts`}>
            {received.receipts.map((r) => (
              <ReceiptRow key={r.grNumber} r={r} testId={`${testId}-receipt-${r.grNumber}`} />
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-text-secondary" data-testid={`${testId}-none`}>
          {t('received.order.none')}
        </p>
      )}
      <p className="mt-2 text-xs text-text-tertiary" data-testid={`${testId}-sap-note`}>
        {t('received.order.sapOwns')}
      </p>
    </section>
  );
};

/** On a ship notice: the receipt(s) recorded against it, or that none is posted yet. */
export const ReceivedOnNotice: React.FC<{ receipts: readonly ReceiptRef[]; testId: string }> = ({
  receipts,
  testId,
}) => {
  const { t } = useTranslation();
  return (
    <div data-testid={testId}>
      <SectionHeading level="group" className="mb-1">{t('received.notice.title')}</SectionHeading>
      {receipts.length > 0 ? (
        <ul className="space-y-1">
          {receipts.map((r) => (
            <ReceiptRow key={r.grNumber} r={r} testId={`${testId}-receipt-${r.grNumber}`} />
          ))}
        </ul>
      ) : (
        <p className="text-xs text-text-secondary" data-testid={`${testId}-none`}>
          {t('received.notice.none')}
        </p>
      )}
      <p className="mt-1 text-xs text-text-tertiary">{t('received.notice.sapOwns')}</p>
    </div>
  );
};

/** On an invoice: the lines the supplier stated — quantity at the order's price. */
export const InvoicedLines: React.FC<{ lines: readonly InvoiceLineItem[]; testId: string }> = ({
  lines,
  testId,
}) => {
  const { t } = useTranslation();
  return (
    <section data-testid={testId}>
      <SectionHeading level="group" className="mb-3">{t('received.invoice.lines')}</SectionHeading>
      <ul className="space-y-1">
        {lines.map((l) => (
          <li key={l.materialCode} className="text-sm text-text-primary">
            <Data>{l.materialCode}</Data> · <Data>{formatNumber(l.qty)}</Data> ×{' '}
            <Data>{formatIDR(l.unitPrice)}</Data> = <Data>{formatIDR(l.qty * l.unitPrice)}</Data>
          </li>
        ))}
      </ul>
    </section>
  );
};
