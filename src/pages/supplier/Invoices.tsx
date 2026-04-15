import React, { useState } from 'react';

const NAVY  = '#0D1B2A';
const TEAL  = '#0097A7';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const SUCCESS = '#107E3E';
const WARNING = '#E9730C';
const ERROR = '#BB0000';

interface SupplierInvoice {
  id: string;
  invoiceNumber: string;
  poNumber: string;
  amount: number;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Payment Released' | 'Remittance Received' | 'Overdue' | 'Disputed';
  submittedDate: string;
  dueDate: string;
  paymentDate: string | null;
  paymentRef: string | null;
  bankAccount: string;
  sapFiDoc: string | null;
  channel: string;
  buyerContact: string;
  remittanceNote: string | null;
}

const INVOICES: SupplierInvoice[] = [
  { id: 'si-001', invoiceNumber: 'INV-2025-BRL-0042', poNumber: 'PO-2025-00107', amount: 320_000_000, status: 'Payment Released', submittedDate: '2025-04-10', dueDate: '2025-05-10', paymentDate: '2025-04-13', paymentRef: 'PAY-2026-85241', bankAccount: 'BCA 028-111-2222', sapFiDoc: 'FI-5100009441', channel: 'WhatsApp', buyerContact: 'Procurement Officer', remittanceNote: 'Payment for PO-2025-00107 · 50,000 PCS PET Bottle 100ml Airless Pump · Batch BRL-2026-0234' },
  { id: 'si-002', invoiceNumber: 'INV-2025-BRL-0043', poNumber: 'PO-2025-00108', amount: 185_000_000, status: 'Disputed', submittedDate: '2025-04-12', dueDate: '2025-05-12', paymentDate: null, paymentRef: null, bankAccount: 'BCA 028-111-2222', sapFiDoc: null, channel: 'WhatsApp', buyerContact: 'Finance Controller', remittanceNote: null },
  { id: 'si-003', invoiceNumber: 'INV-2026-BRL-0051', poNumber: 'PO-2025-00115', amount: 275_000_000, status: 'Pending Approval', submittedDate: '2026-04-01', dueDate: '2026-05-01', paymentDate: null, paymentRef: null, bankAccount: 'BCA 028-111-2222', sapFiDoc: 'FI-5100009512', channel: 'Web', buyerContact: 'Procurement Officer', remittanceNote: null },
  { id: 'si-004', invoiceNumber: 'INV-2026-BRL-0055', poNumber: 'PO-2026-00003', amount: 410_000_000, status: 'Draft', submittedDate: '2026-04-08', dueDate: '2026-05-08', paymentDate: null, paymentRef: null, bankAccount: 'BCA 028-111-2222', sapFiDoc: null, channel: 'Web', buyerContact: 'Procurement Officer', remittanceNote: null },
];

const STATUS_CFG: Record<string, { bg: string; color: string }> = {
  'Draft':            { bg: '#F1F5F9', color: MUTED },
  'Pending Approval': { bg: '#FEF9C3', color: WARNING },
  'Approved':         { bg: '#DBEAFE', color: NAVY },
  'Payment Released': { bg: '#DCFCE7', color: SUCCESS },
  'Remittance Received': { bg: '#DCFCE7', color: SUCCESS },
  'Overdue':          { bg: '#FEE2E2', color: ERROR },
  'Disputed':         { bg: '#FEE2E2', color: ERROR },
};

function fmtIDR(n: number): string {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  return `Rp ${Math.round(n / 1_000_000)}jT`;
}

function fmtIDRFull(n: number): string {
  return `Rp ${n.toLocaleString('id-ID')}`;
}

function fmtDate(s: string | null): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const Invoices: React.FC = () => {
  const [toast, setToast] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const totalPaid    = INVOICES.filter(i => i.status === 'Payment Released').reduce((a, b) => a + b.amount, 0);
  const totalPending = INVOICES.filter(i => ['Pending Approval', 'Approved'].includes(i.status)).reduce((a, b) => a + b.amount, 0);
  const totalDisputed = INVOICES.filter(i => i.status === 'Disputed').reduce((a, b) => a + b.amount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: NAVY, color: 'white', padding: '12px 20px', borderRadius: '6px', zIndex: 500, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', fontSize: '13px', borderLeft: `3px solid ${TEAL}` }}>{toast}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: NAVY, marginBottom: '4px' }}>My Invoices</div>
          <div style={{ fontSize: '13px', color: MUTED }}>Submit and track invoices · View payment status and remittance advice</div>
        </div>
        <button onClick={() => showToast('Downloading invoice report...')} style={{ background: TEAL, color: 'white', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ New Invoice</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Payments Received', value: fmtIDR(totalPaid), color: SUCCESS, bg: '#DCFCE7', count: INVOICES.filter(i => i.status === 'Payment Released').length },
          { label: 'Pending Payment', value: fmtIDR(totalPending), color: WARNING, bg: '#FEF9C3', count: INVOICES.filter(i => ['Pending Approval','Approved'].includes(i.status)).length },
          { label: 'Disputed', value: fmtIDR(totalDisputed), color: ERROR, bg: '#FEE2E2', count: INVOICES.filter(i => i.status === 'Disputed').length },
        ].map(({ label, value, color, bg, count }) => (
          <div key={label} style={{ background: 'white', border: `1px solid ${BORDER}`, borderLeft: `4px solid ${color}`, borderRadius: 8, padding: '14px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color, marginBottom: 2 }}>{value}</div>
            <div style={{ fontSize: 11, color: MUTED }}>{count} invoice{count !== 1 ? 's' : ''}</div>
          </div>
        ))}
      </div>

      {INVOICES.some(i => i.status === 'Disputed') && (
        <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8, padding: '10px 16px', fontSize: 13, color: WARNING }}>
          ! Invoice dispute: {INVOICES.filter(i => i.status === 'Disputed').map(i => i.invoiceNumber).join(', ')} — Quantity mismatch. Credit note required before payment can be released.
        </div>
      )}

      <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: NAVY, color: 'white' }}>
              {['Invoice #', 'PO Reference', 'Amount', 'Status', 'Due Date', 'Payment Date', 'Action'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INVOICES.map((inv, idx) => {
              const cfg = STATUS_CFG[inv.status] ?? { bg: '#F1F5F9', color: MUTED };
              const isExpanded = expandedId === inv.id;
              const isPaid = inv.status === 'Payment Released' || inv.status === 'Remittance Received';
              return (
                <React.Fragment key={inv.id}>
                  <tr style={{ background: idx % 2 === 0 ? 'white' : '#F8FAFC', borderTop: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700, color: TEAL, whiteSpace: 'nowrap' }}>{inv.invoiceNumber}</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 11, color: '#354A5F' }}>{inv.poNumber}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: NAVY, whiteSpace: 'nowrap' }}>
                      {fmtIDR(inv.amount)}
                      <div style={{ fontSize: 10, color: MUTED, fontWeight: 400 }}>{fmtIDRFull(inv.amount)}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 9999, padding: '2px 10px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{inv.status}</span>
                    </td>
                    <td style={{ padding: '12px 14px', color: MUTED, fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(inv.dueDate)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {inv.paymentDate
                        ? <span style={{ color: SUCCESS, fontWeight: 600 }}>{fmtDate(inv.paymentDate)}</span>
                        : <span style={{ color: MUTED }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      {isPaid ? (
                        <button onClick={() => setExpandedId(isExpanded ? null : inv.id)} style={{ background: SUCCESS, color: 'white', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                          {isExpanded ? '▲ Hide' : 'View Remittance'}
                        </button>
                      ) : inv.status === 'Draft' ? (
                        <button onClick={() => showToast(`${inv.invoiceNumber} submitted for approval`)} style={{ background: TEAL, color: 'white', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Submit</button>
                      ) : inv.status === 'Disputed' ? (
                        <button onClick={() => showToast('Contact Paragon Finance Controller to resolve dispute')} style={{ background: ERROR, color: 'white', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Resolve</button>
                      ) : (
                        <button onClick={() => showToast(`Viewing ${inv.invoiceNumber}`)} style={{ background: 'white', color: NAVY, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>View</button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && isPaid && (
                    <tr>
                      <td colSpan={7} style={{ padding: 0, borderTop: `2px solid ${SUCCESS}` }}>
                        <div style={{ background: '#F0FDF4', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ background: SUCCESS, color: 'white', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>✓</span>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>Remittance Advice Received</div>
                          </div>
                          <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                              {[
                                { label: 'Invoice No', value: inv.invoiceNumber, mono: true },
                                { label: 'Amount Paid', value: fmtIDRFull(inv.amount), mono: false },
                                { label: 'Payment Date', value: fmtDate(inv.paymentDate), mono: false },
                                { label: 'Bank Account Credited', value: inv.bankAccount, mono: false },
                                { label: 'Reference Number', value: inv.paymentRef, mono: true },
                              ].map(({ label, value, mono }) => (
                                <div key={label} style={{ background: 'white', borderRadius: 6, padding: '10px 12px', border: `1px solid ${BORDER}` }}>
                                  <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, fontFamily: mono ? 'monospace' : 'inherit' }}>{value ?? '—'}</div>
                                </div>
                              ))}
                            </div>
                            <div style={{ fontSize: 12, color: '#354A5F', background: 'white', padding: '10px 14px', borderRadius: 6, border: `1px solid ${BORDER}` }}>
                              Payment has been credited to your account. Keep this remittance advice for your records.
                            </div>
                            {inv.remittanceNote && (
                              <div style={{ fontSize: 12, color: MUTED, background: 'white', padding: '8px 12px', borderRadius: 6, border: `1px solid ${BORDER}` }}>
                                <strong>Payment note:</strong> {inv.remittanceNote}
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => showToast('Downloading remittance advice PDF...')} style={{ padding: '7px 14px', background: 'white', color: SUCCESS, border: `1px solid ${SUCCESS}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Download PDF</button>
                              <button onClick={() => setExpandedId(null)} style={{ padding: '7px 14px', background: 'white', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ background: '#E0F7FA', border: '1px solid #0097A744', borderRadius: 8, padding: '12px 16px', fontSize: 12, color: '#006064', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>Full e-invoicing with SAP Ariba integration is planned for Phase 2 of the Paragon Odyssey program.</span>
      </div>
    </div>
  );
};

export default Invoices;
