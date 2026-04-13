import React, { useState } from 'react';

const NAVY = '#0D1B2A';
const TEAL = '#0097A7';

interface MockInvoice {
  id: string;
  invoiceNumber: string;
  poNumber: string;
  amount: string;
  status: string;
  date: string;
  action: 'view' | 'submit';
}

const MOCK_INVOICES: MockInvoice[] = [
  {
    id: 'inv-001',
    invoiceNumber: 'INV-2026-001',
    poNumber: 'PO-2025-00107',
    amount: 'Rp 320jT',
    status: 'Pending Approval',
    date: '2025-04-10',
    action: 'view',
  },
  {
    id: 'inv-002',
    invoiceNumber: 'INV-2026-002',
    poNumber: 'PO-2025-00108',
    amount: 'Rp 185jT',
    status: 'Draft',
    date: '2025-04-05',
    action: 'submit',
  },
];

const STATUS_STYLES: Record<string, [string, string]> = {
  'Pending Approval': ['#FEF9C3', '#E9730C'],
  'Draft':            ['#F1F5F9', '#475569'],
  'Approved':         ['#DCFCE7', '#107E3E'],
  'Rejected':         ['#FEE2E2', '#BB0000'],
};

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const Invoices: React.FC = () => {
  const [toast, setToast] = useState<string | null>(null);

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
          Invoices
        </div>
        <div style={{ fontSize: '13px', color: '#64748B' }}>
          Submit and track invoices against your purchase orders
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: NAVY, color: 'white' }}>
              {['Invoice #', 'PO Reference', 'Amount', 'Status', 'Date', 'Action'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_INVOICES.map((inv, idx) => {
              const [bg, color] = STATUS_STYLES[inv.status] ?? ['#F1F5F9', '#475569'];
              return (
                <tr key={inv.id} style={{ background: idx % 2 === 0 ? 'white' : '#F8FAFC', borderTop: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: TEAL }}>
                    {inv.invoiceNumber}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#354A5F' }}>
                    {inv.poNumber}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: NAVY }}>
                    {inv.amount}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: bg, color,
                      borderRadius: '9999px', padding: '2px 10px',
                      fontSize: '11px', fontWeight: 600,
                    }}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748B', whiteSpace: 'nowrap' }}>
                    {fmtDate(inv.date)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {inv.action === 'view' ? (
                      <button
                        onClick={() => showToast(`Viewing ${inv.invoiceNumber} — detail view coming in Phase 2`)}
                        style={{
                          background: 'white', color: NAVY, border: `1.5px solid #CBD5E1`,
                          borderRadius: '6px', padding: '5px 14px',
                          fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        View
                      </button>
                    ) : (
                      <button
                        onClick={() => showToast(`${inv.invoiceNumber} submitted for approval`)}
                        style={{
                          background: TEAL, color: 'white', border: 'none',
                          borderRadius: '6px', padding: '5px 14px',
                          fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        Submit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Info note */}
      <div style={{
        background: '#E0F7FA', border: '1px solid #0097A744', borderRadius: '8px',
        padding: '12px 16px', fontSize: '12px', color: '#006064',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <span></span>
        <span>Full e-invoicing with SAP Ariba integration is planned for Phase 2 of the Paragon Odyssey program.</span>
      </div>
    </div>
  );
};

export default Invoices;
