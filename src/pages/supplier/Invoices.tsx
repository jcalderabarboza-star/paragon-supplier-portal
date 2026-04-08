import React, { useState } from 'react';
import { mockPurchaseOrders } from '../../data/mockPurchaseOrders';
import { POStatus } from '../../types/purchaseOrder.types';

// ─── Design tokens ────────────────────────────────────────────────────────────
const NAVY   = '#0D1B2A';
const TEAL   = '#0097A7';
const MID    = '#354A5F';
const MUTED  = '#64748B';
const BORDER = '#E2E8F0';

// ─── Types ────────────────────────────────────────────────────────────────────
type InvoiceStatus = 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Disputed' | 'Payment Released';

interface Invoice {
  id: string;
  invoiceNumber: string;
  poId: string;
  poNumber: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  submittedDate: string;
  dueDate: string;
  paymentDate: string | null;
  matchStatus: '3-way Match ✓' | 'Pending GR' | 'Qty Mismatch' | 'Price Variance';
  sapFiDoc: string | null;
  notes: string;
}

// ─── Mock invoice data (linked to real PO data for sup-007 = Berlina) ─────────
const DEMO_SUPPLIER_ID = 'sup-007';

const MOCK_INVOICES: Invoice[] = [
  {
    id: 'sinv-001',
    invoiceNumber: 'INV-2025-BRL-041',
    poId: 'po-009',
    poNumber: 'PO-2025-00109',
    amount: 95_000_000,
    currency: 'IDR',
    status: 'Payment Released',
    submittedDate: '2025-03-08',
    dueDate: '2025-04-07',
    paymentDate: '2025-04-05',
    matchStatus: '3-way Match ✓',
    sapFiDoc: 'FI-5100009234',
    notes: 'Indo Karton carton boxes — fully delivered',
  },
  {
    id: 'sinv-002',
    invoiceNumber: 'INV-2025-BRL-042',
    poId: 'po-007',
    poNumber: 'PO-2025-00107',
    amount: 320_000_000,
    currency: 'IDR',
    status: 'Approved',
    submittedDate: '2025-04-10',
    dueDate: '2025-05-10',
    paymentDate: null,
    matchStatus: '3-way Match ✓',
    sapFiDoc: 'FI-5100009441',
    notes: 'PET Bottle 200ml Frosted — Wardah Series',
  },
  {
    id: 'sinv-003',
    invoiceNumber: 'INV-2025-BRL-043',
    poId: 'po-008',
    poNumber: 'PO-2025-00108',
    amount: 185_000_000,
    currency: 'IDR',
    status: 'Disputed',
    submittedDate: '2025-04-12',
    dueDate: '2025-05-12',
    paymentDate: null,
    matchStatus: 'Qty Mismatch',
    sapFiDoc: null,
    notes: 'Disputed — ASN quantity 148,500 PCS vs invoice 150,000 PCS. Awaiting credit note.',
  },
  {
    id: 'sinv-draft-001',
    invoiceNumber: 'DRAFT',
    poId: 'po-017',
    poNumber: 'PO-2025-00117',
    amount: 50_000_000,
    currency: 'IDR',
    status: 'Draft',
    submittedDate: '',
    dueDate: '',
    paymentDate: null,
    matchStatus: 'Pending GR',
    sapFiDoc: null,
    notes: 'Emina Bright Stuff shipper boxes — awaiting GR confirmation before submission',
  },
];

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<InvoiceStatus, { bg: string; color: string }> = {
  'Draft':             { bg: '#F1F5F9', color: '#475569' },
  'Submitted':         { bg: '#FEF9C3', color: '#854D0E' },
  'Under Review':      { bg: '#EFF6FF', color: '#1E40AF' },
  'Approved':          { bg: '#DCFCE7', color: '#166534' },
  'Disputed':          { bg: '#FEE2E2', color: '#991B1B' },
  'Payment Released':  { bg: '#F0FDF4', color: '#166534' },
};

const MATCH_CFG: Record<string, { bg: string; color: string }> = {
  '3-way Match ✓': { bg: '#DCFCE7', color: '#166534' },
  'Pending GR':    { bg: '#FEF9C3', color: '#854D0E' },
  'Qty Mismatch':  { bg: '#FEE2E2', color: '#991B1B' },
  'Price Variance':{ bg: '#FEE2E2', color: '#991B1B' },
};

function fmt(n: number): string {
  return `Rp ${(n / 1_000_000).toFixed(0)}jT`;
}
function fmtFull(n: number): string {
  return `Rp ${n.toLocaleString('id-ID')}`;
}
function fmtDate(s: string): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function Pill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return <span style={{ background: bg, color, borderRadius: 9999, padding: '2px 9px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>;
}

// ─── Submission form (for draft invoices) ─────────────────────────────────────
function SubmitForm({ invoice, po, onClose, onSubmit }: {
  invoice: Invoice;
  po: typeof mockPurchaseOrders[0] | undefined;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [bankRef, setBankRef]   = useState('BCA-028-3456789-0');
  const [invDate, setInvDate]   = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes]       = useState('');
  const [submitted, setSubmit]  = useState(false);

  const handleSubmit = () => {
    setSubmit(true);
    setTimeout(() => { onSubmit(); onClose(); }, 1800);
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px',
    border: `1px solid ${BORDER}`, borderRadius: 6,
    fontSize: 13, color: NAVY, fontFamily: 'inherit', outline: 'none',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 800,
    }}>
      <div style={{
        background: 'white', borderRadius: 12, padding: 28,
        maxWidth: 520, width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>Invoice Submitted</div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>
              Pending Paragon 3-way match verification
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 4 }}>
              Submit Invoice
            </div>
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>
              PO {invoice.poNumber} · {fmtFull(invoice.amount)}
            </div>

            {/* PO summary */}
            {po && (
              <div style={{
                background: '#F8FAFC', border: `1px solid ${BORDER}`,
                borderRadius: 8, padding: '12px 14px', marginBottom: 16,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  PO Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 12 }}>
                  <div><span style={{ color: MUTED }}>PO Number: </span><span style={{ fontWeight: 600 }}>{po.poNumber}</span></div>
                  <div><span style={{ color: MUTED }}>Status: </span><span style={{ fontWeight: 600 }}>{po.status}</span></div>
                  <div><span style={{ color: MUTED }}>Amount: </span><span style={{ fontWeight: 600 }}>{fmtFull(po.totalValue)}</span></div>
                  <div><span style={{ color: MUTED }}>Delivery: </span><span style={{ fontWeight: 600 }}>{fmtDate(po.requestedDeliveryDate)}</span></div>
                </div>
              </div>
            )}

            {/* Form fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: MID, display: 'block', marginBottom: 4 }}>
                  Invoice Date *
                </label>
                <input type="date" value={invDate} onChange={e => setInvDate(e.target.value)} style={fieldStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: MID, display: 'block', marginBottom: 4 }}>
                  Invoice Amount (IDR) *
                </label>
                <input
                  type="text"
                  value={fmtFull(invoice.amount)}
                  readOnly
                  style={{ ...fieldStyle, background: '#F8FAFC', color: MUTED }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: MID, display: 'block', marginBottom: 4 }}>
                  Bank Account Reference *
                </label>
                <input type="text" value={bankRef} onChange={e => setBankRef(e.target.value)} style={fieldStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: MID, display: 'block', marginBottom: 4 }}>
                  Notes / Reference
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Delivery batch reference, COA number, etc."
                  style={{ ...fieldStyle, resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ marginTop: 8, fontSize: 11, color: MUTED }}>
              ⓘ Paragon will perform 3-way match (PO / GR / Invoice) before approval. GR must be confirmed in SAP before payment is released.
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={onClose} style={{
                padding: '8px 18px', border: `1px solid ${BORDER}`, borderRadius: 6,
                background: 'white', color: MID, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Cancel</button>
              <button onClick={handleSubmit} style={{
                padding: '8px 18px', border: 'none', borderRadius: 6,
                background: TEAL, color: 'white', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Submit Invoice</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
const Invoices: React.FC = () => {
  const [invoices, setInvoices]   = useState<Invoice[]>(MOCK_INVOICES);
  const [submitInv, setSubmitInv] = useState<Invoice | null>(null);
  const [toast, setToast]         = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmitted = (invId: string) => {
    setInvoices(prev => prev.map(inv =>
      inv.id === invId ? { ...inv, status: 'Submitted' as InvoiceStatus, submittedDate: new Date().toISOString().slice(0, 10) } : inv
    ));
    showToast('Invoice submitted — pending 3-way match verification');
  };

  const totalApproved   = invoices.filter(i => i.status === 'Approved' || i.status === 'Payment Released').reduce((a, b) => a + b.amount, 0);
  const totalPending    = invoices.filter(i => ['Submitted', 'Under Review'].includes(i.status)).reduce((a, b) => a + b.amount, 0);
  const totalDisputed   = invoices.filter(i => i.status === 'Disputed').reduce((a, b) => a + b.amount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Submit modal */}
      {submitInv && (
        <SubmitForm
          invoice={submitInv}
          po={mockPurchaseOrders.find(p => p.id === submitInv.poId)}
          onClose={() => setSubmitInv(null)}
          onSubmit={() => handleSubmitted(submitInv.id)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem',
          background: NAVY, color: 'white',
          padding: '0.75rem 1.25rem', borderRadius: 8,
          zIndex: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          fontSize: 13, borderLeft: `3px solid ${TEAL}`,
        }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 4 }}>My Invoices</div>
          <div style={{ fontSize: 13, color: MUTED }}>
            Submit invoices · Track 3-way match status · Monitor payments
          </div>
        </div>
        <button
          onClick={() => showToast('New invoice — select a delivered PO to begin')}
          style={{
            background: TEAL, border: 'none', borderRadius: 6,
            padding: '8px 16px', fontSize: 13, fontWeight: 600,
            color: 'white', cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          ＋ New Invoice
        </button>
      </div>

      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Approved / Paid',   value: fmt(totalApproved),  color: '#107E3E', icon: '✅' },
          { label: 'Pending Review',     value: fmt(totalPending),   color: '#E9730C', icon: '⏳' },
          { label: 'Disputed',           value: fmt(totalDisputed),  color: '#BB0000', icon: '⚠️' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{
            background: 'white', border: `1px solid ${BORDER}`,
            borderLeft: `4px solid ${color}`,
            borderRadius: 8, padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
              {icon} {label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Disputes banner */}
      {invoices.some(i => i.status === 'Disputed') && (
        <div style={{
          background: '#FEE2E2', border: '1px solid #FCA5A5',
          borderRadius: 8, padding: '12px 16px',
          fontSize: 13, color: '#991B1B',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <span>❗</span>
          <div>
            <strong>Invoice dispute: </strong>
            {invoices.filter(i => i.status === 'Disputed').map(i => i.notes).join(' — ')}
          </div>
        </div>
      )}

      {/* Invoice table */}
      <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: NAVY, color: 'white' }}>
              {['Invoice #', 'PO Reference', 'Amount', '3-Way Match', 'Status', 'Submitted', 'Due / Payment', 'SAP FI Doc', 'Action'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv, idx) => {
              const sCfg = STATUS_CFG[inv.status];
              const mCfg = MATCH_CFG[inv.matchStatus] ?? { bg: '#F1F5F9', color: '#475569' };
              const po   = mockPurchaseOrders.find(p => p.id === inv.poId);
              return (
                <tr key={inv.id} style={{
                  background: idx % 2 === 0 ? 'white' : '#F8FAFC',
                  borderTop: `1px solid ${BORDER}`,
                }}>
                  <td style={{ padding: '12px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: TEAL, whiteSpace: 'nowrap' }}>
                    {inv.invoiceNumber === 'DRAFT'
                      ? <span style={{ color: MUTED, fontStyle: 'italic', fontFamily: 'inherit' }}>— Draft —</span>
                      : inv.invoiceNumber}
                  </td>
                  <td style={{ padding: '12px 12px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: MID, fontWeight: 600 }}>{inv.poNumber}</div>
                    {po && <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{po.supplierName.split(' ').slice(0, 2).join(' ')}</div>}
                  </td>
                  <td style={{ padding: '12px 12px', fontWeight: 700, color: NAVY, whiteSpace: 'nowrap' }}>
                    {fmt(inv.amount)}
                    <div style={{ fontSize: 10, color: MUTED, fontWeight: 400 }}>
                      {fmtFull(inv.amount)}
                    </div>
                  </td>
                  <td style={{ padding: '12px 12px' }}>
                    <Pill label={inv.matchStatus} bg={mCfg.bg} color={mCfg.color} />
                  </td>
                  <td style={{ padding: '12px 12px' }}>
                    <Pill label={inv.status} bg={sCfg.bg} color={sCfg.color} />
                  </td>
                  <td style={{ padding: '12px 12px', fontSize: 11, color: MUTED, whiteSpace: 'nowrap' }}>
                    {fmtDate(inv.submittedDate)}
                  </td>
                  <td style={{ padding: '12px 12px', fontSize: 11, whiteSpace: 'nowrap' }}>
                    {inv.paymentDate ? (
                      <div>
                        <div style={{ color: '#107E3E', fontWeight: 600 }}>Paid {fmtDate(inv.paymentDate)}</div>
                      </div>
                    ) : inv.dueDate ? (
                      <div style={{ color: MUTED }}>{fmtDate(inv.dueDate)}</div>
                    ) : (
                      <span style={{ color: MUTED }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 12px', fontFamily: 'var(--font-mono)', fontSize: 10, color: inv.sapFiDoc ? '#107E3E' : MUTED }}>
                    {inv.sapFiDoc ?? '—'}
                  </td>
                  <td style={{ padding: '12px 12px' }}>
                    {inv.status === 'Draft' ? (
                      <button
                        onClick={() => setSubmitInv(inv)}
                        style={{
                          background: TEAL, color: 'white', border: 'none',
                          borderRadius: 5, padding: '5px 12px',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        Submit
                      </button>
                    ) : inv.status === 'Disputed' ? (
                      <button
                        onClick={() => showToast('Opening dispute resolution — contact Paragon AP team')}
                        style={{
                          background: '#FEE2E2', color: '#991B1B',
                          border: '1px solid #FCA5A5',
                          borderRadius: 5, padding: '5px 12px',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        Resolve
                      </button>
                    ) : (
                      <button
                        onClick={() => showToast(`Viewing ${inv.invoiceNumber}...`)}
                        style={{
                          background: 'white', color: MID,
                          border: `1px solid ${BORDER}`,
                          borderRadius: 5, padding: '5px 12px',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        View
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
        background: '#E0F7FA', border: '1px solid #0097A744',
        borderRadius: 8, padding: '12px 16px',
        fontSize: 12, color: '#006064',
        display: 'flex', alignItems: 'flex-start', gap: 8,
      }}>
        <span>💡</span>
        <span>
          <strong>Payment process:</strong> Invoice → 3-way match (PO + GR + Invoice) → Finance approval → SAP FI document posted → Payment released to bank account.
          Standard payment terms: <strong>Net 30 from GR date</strong>. E-invoicing via SAP will be enabled in Phase 2.
        </span>
      </div>
    </div>
  );
};

export default Invoices;
