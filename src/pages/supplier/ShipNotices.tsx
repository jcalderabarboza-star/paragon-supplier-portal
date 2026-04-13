import React, { useState } from 'react';
import { mockPurchaseOrders } from '../../data/mockPurchaseOrders';
import { POStatus } from '../../types/purchaseOrder.types';

const NAVY = '#0D1B2A';
const TEAL = '#0097A7';
const SUPPLIER_ID = 'sup-007';

function fmtDate(s: string): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const ShipNotices: React.FC = () => {
  const [toast, setToast] = useState<string | null>(null);

  const confirmedPOs = mockPurchaseOrders.filter(
    po => po.supplierId === SUPPLIER_ID && po.status === POStatus.CONFIRMED
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', background: NAVY,
          color: 'white', padding: '12px 20px', borderRadius: '6px',
          zIndex: 500, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', fontSize: '13px',
        }}>{toast}</div>
      )}

      {/* Header */}
      <div>
        <div style={{ fontSize: '20px', fontWeight: 600, color: NAVY, marginBottom: '4px' }}>
          Ship Notices (ASN)
        </div>
        <div style={{ fontSize: '13px', color: '#64748B' }}>
          Create Advance Ship Notices for confirmed purchase orders
        </div>
      </div>

      {confirmedPOs.length === 0 ? (
        <div style={{
          background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px',
          padding: '48px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📭</div>
          <div style={{ fontWeight: 600, color: NAVY, marginBottom: '6px' }}>No shipments pending</div>
          <div style={{ fontSize: '13px', color: '#64748B' }}>
            Confirmed orders will appear here.
          </div>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: NAVY, color: 'white' }}>
                {['PO Number', 'Material', 'Requested Delivery', 'Status', 'Action'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {confirmedPOs.map((po, idx) => {
                const matSummary = po.lineItems.length > 0
                  ? `${po.lineItems[0].description} (×${po.lineItems[0].quantity.toLocaleString()} ${po.lineItems[0].uom})`
                  : '—';
                return (
                  <tr key={po.id} style={{ background: idx % 2 === 0 ? 'white' : '#F8FAFC', borderTop: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: TEAL }}>{po.poNumber}</td>
                    <td style={{ padding: '12px 16px', color: '#354A5F', maxWidth: '280px' }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={matSummary}>
                        {matSummary}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748B', whiteSpace: 'nowrap' }}>
                      {fmtDate(po.requestedDeliveryDate)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        background: '#DBEAFE', color: '#0D1B2A',
                        borderRadius: '9999px', padding: '2px 10px',
                        fontSize: '11px', fontWeight: 600,
                      }}>
                        {po.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => showToast('ASN creation coming in Phase 2')}
                        style={{
                          background: TEAL, color: 'white', border: 'none',
                          borderRadius: '6px', padding: '6px 14px',
                          fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        Create ASN
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Info note */}
      <div style={{
        background: '#FEF9C3', border: '1px solid #FDE047', borderRadius: '8px',
        padding: '12px 16px', fontSize: '12px', color: '#E9730C',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <span>⚠️</span>
        <span>ASN submission with EDI 856 integration is planned for Phase 2 of the Paragon Odyssey program.</span>
      </div>
    </div>
  );
};

export default ShipNotices;
