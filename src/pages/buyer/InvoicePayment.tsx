import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { mockPurchaseOrders } from '../../data/mockPurchaseOrders';
import StatusBadge from '../../components/shared/StatusBadge';
import { POStatus } from '../../types/purchaseOrder.types';

const NAVY   = '#0D1B2A';
const TEAL   = '#0097A7';
const MID    = '#354A5F';
const MUTED  = '#64748B';
const BORDER = '#E2E8F0';
const SUCCESS = '#107E3E';
const WARNING = '#E9730C';
const ERROR   = '#BB0000';
const INFO    = '#0097A7';

type InvStatus = 'Pending Match' | 'Approved' | 'Disputed' | 'Payment Released' | 'Overdue';

interface BuyerInvoice {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  supplierId: string;
  poNumber: string;
  poId: string;
  amount: number;
  currency: string;
  status: InvStatus;
  receivedDate: string;
  dueDate: string;
  paymentDate: string | null;
  matchStatus: 'Matched' | 'Pending GR' | 'Qty Mismatch' | 'Price Variance' | 'Pending';
  sapFiDoc: string | null;
  sapGrDoc: string | null;
  approver: string;
  paymentTerms: string;
  daysOutstanding: number;
  bankAccount: string;
  channel: string;
}

const BUYER_INVOICES: BuyerInvoice[] = [
  { id: 'binv-001', invoiceNumber: 'INV-2025-ECO-0341', supplierName: 'PT Ecogreen Oleochemicals', supplierId: 'sup-001', poNumber: 'PO-2025-00101', poId: 'po-001', amount: 1_250_000_000, currency: 'IDR', status: 'Payment Released', receivedDate: '2025-03-22', dueDate: '2025-05-05', paymentDate: '2025-04-30', matchStatus: 'Matched', sapFiDoc: 'FI-5100009100', sapGrDoc: 'GR-4900009201', approver: 'Finance Controller', paymentTerms: 'Net 45', daysOutstanding: 0, bankAccount: 'BCA 028-345-6789', channel: 'API' },
  { id: 'binv-002', invoiceNumber: 'INV-2025-GIV-0892', supplierName: 'Givaudan Indonesia Fragrances', supplierId: 'sup-003', poNumber: 'PO-2025-00103', poId: 'po-003', amount: 2_000_000_000, currency: 'IDR', status: 'Approved', receivedDate: '2025-04-01', dueDate: '2025-05-01', paymentDate: null, matchStatus: 'Matched', sapFiDoc: 'FI-5100009312', sapGrDoc: 'GR-4900009344', approver: 'VP SCM', paymentTerms: 'Net 30', daysOutstanding: 7, bankAccount: 'Mandiri 123-456-7890', channel: 'API' },
  { id: 'binv-003', invoiceNumber: 'INV-2025-MUS-0214', supplierName: 'PT Musim Mas Specialty Fats', supplierId: 'sup-002', poNumber: 'PO-2025-00102', poId: 'po-002', amount: 875_000_000, currency: 'IDR', status: 'Pending Match', receivedDate: '2025-04-08', dueDate: '2025-05-23', paymentDate: null, matchStatus: 'Pending GR', sapFiDoc: null, sapGrDoc: null, approver: 'Procurement Officer', paymentTerms: 'Net 45', daysOutstanding: 0, bankAccount: 'BNI 456-789-0123', channel: 'Web' },
  { id: 'binv-004', invoiceNumber: 'INV-2025-BAS-0561', supplierName: 'BASF Personal Care Emulsifiers GmbH', supplierId: 'sup-005', poNumber: 'PO-2025-00013', poId: 'po-013', amount: 560_000_000, currency: 'IDR', status: 'Payment Released', receivedDate: '2025-03-15', dueDate: '2025-04-14', paymentDate: '2025-04-12', matchStatus: 'Matched', sapFiDoc: 'FI-5100009198', sapGrDoc: 'GR-4900009189', approver: 'Finance Controller', paymentTerms: 'Net 30', daysOutstanding: 0, bankAccount: 'Deutsche Bank DE89-3704', channel: 'API' },
  { id: 'binv-005', invoiceNumber: 'INV-2025-BRL-0042', supplierName: 'PT Berlina Packaging Indonesia', supplierId: 'sup-007', poNumber: 'PO-2025-00107', poId: 'po-007', amount: 320_000_000, currency: 'IDR', status: 'Approved', receivedDate: '2025-04-10', dueDate: '2025-05-10', paymentDate: null, matchStatus: 'Matched', sapFiDoc: 'FI-5100009441', sapGrDoc: 'GR-4900009420', approver: 'Procurement Officer', paymentTerms: 'Net 30', daysOutstanding: 0, bankAccount: 'BCA 028-111-2222', channel: 'WhatsApp' },
  { id: 'binv-006', invoiceNumber: 'INV-2025-BRL-0043', supplierName: 'PT Berlina Packaging Indonesia', supplierId: 'sup-007', poNumber: 'PO-2025-00108', poId: 'po-008', amount: 185_000_000, currency: 'IDR', status: 'Disputed', receivedDate: '2025-04-12', dueDate: '2025-05-12', paymentDate: null, matchStatus: 'Qty Mismatch', sapFiDoc: null, sapGrDoc: 'GR-4900009488', approver: 'Finance Controller', paymentTerms: 'Net 30', daysOutstanding: 0, bankAccount: 'BCA 028-111-2222', channel: 'WhatsApp' },
  { id: 'binv-007', invoiceNumber: 'INV-2025-EVO-0188', supplierName: 'Evonik Specialty Chemicals France', supplierId: 'sup-006', poNumber: 'PO-2025-00014', poId: 'po-014', amount: 410_000_000, currency: 'IDR', status: 'Overdue', receivedDate: '2025-03-25', dueDate: '2025-04-03', paymentDate: null, matchStatus: 'Matched', sapFiDoc: 'FI-5100009288', sapGrDoc: 'GR-4900009302', approver: 'Finance Controller', paymentTerms: 'Net 10', daysOutstanding: 34, bankAccount: 'Société Générale FR76-3000', channel: 'Email' },
  { id: 'binv-008', invoiceNumber: 'INV-2025-FIR-0309', supplierName: 'Firmenich Malaysia Sdn. Bhd.', supplierId: 'sup-004', poNumber: 'PO-2025-00018', poId: 'po-018', amount: 890_000_000, currency: 'IDR', status: 'Payment Released', receivedDate: '2025-03-18', dueDate: '2025-04-17', paymentDate: '2025-04-15', matchStatus: 'Matched', sapFiDoc: 'FI-5100009241', sapGrDoc: 'GR-4900009255', approver: 'VP SCM', paymentTerms: 'Net 30', daysOutstanding: 0, bankAccount: 'Maybank MY-1234-5678', channel: 'Web' },
];

const STATUS_CFG: Record<InvStatus, { bg: string; color: string }> = {
  'Pending Match':    { bg: '#FEF9C3', color: '#E9730C' },
  'Approved':         { bg: '#DBEAFE', color: '#0D1B2A' },
  'Disputed':         { bg: '#FEE2E2', color: '#BB0000' },
  'Payment Released': { bg: '#DCFCE7', color: '#107E3E' },
  'Overdue':          { bg: '#FEE2E2', color: '#BB0000' },
};

const MATCH_CFG: Record<string, { bg: string; color: string }> = {
  'Matched':        { bg: '#DCFCE7', color: '#107E3E' },
  'Pending GR':     { bg: '#FEF9C3', color: '#E9730C' },
  'Pending':        { bg: '#FEF9C3', color: '#E9730C' },
  'Qty Mismatch':   { bg: '#FEE2E2', color: '#BB0000' },
  'Price Variance': { bg: '#FEE2E2', color: '#BB0000' },
};

const AGING_DATA = [
  { bucket: 'Current', amount: 3195, count: 3 },
  { bucket: '1–30d',   amount: 320,  count: 1 },
  { bucket: '31–60d',  amount: 410,  count: 1 },
  { bucket: '61–90d',  amount: 0,    count: 0 },
  { bucket: '>90d',    amount: 0,    count: 0 },
];

const MONTHLY_SPEND = [
  { month: 'Nov 24', paid: 1800, pending: 400 },
  { month: 'Dec 24', paid: 2100, pending: 350 },
  { month: 'Jan 25', paid: 1950, pending: 500 },
  { month: 'Feb 25', paid: 2400, pending: 280 },
  { month: 'Mar 25', paid: 3100, pending: 380 },
  { month: 'Apr 25', paid: 890,  pending: 3195 },
];

function fmt(n: number) { return `Rp ${(n / 1_000_000).toFixed(0)}jT`; }
function fmtFull(n: number) { return `Rp ${n.toLocaleString('id-ID')}`; }
function fmtDate(s: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Pill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span style={{ background: bg, color, borderRadius: 9999, padding: '2px 9px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '8px 12px', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: NAVY }}>{label}</div>
      {payload.map((p: any) => <div key={p.name} style={{ color: p.color }}>Rp {p.value}jT</div>)}
    </div>
  );
};

function PaymentConfirmModal({ invoice, onClose, onConfirm }: {
  invoice: BuyerInvoice;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);

  const [payRef] = useState(`PAY-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`);
  const [payDate] = useState(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));

  const handleConfirm = () => {
    setConfirmed(true);
    onConfirm();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 800 }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 28, maxWidth: 520, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {confirmed ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: SUCCESS, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: 'white', fontSize: 22, fontWeight: 700 }}>✓</span>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>Payment Released</div>
                <div style={{ fontSize: 12, color: MUTED }}>{invoice.invoiceNumber} · {payDate}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#F8FAFC', borderRadius: 6, padding: '10px 12px', border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Payment Reference</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, fontFamily: 'monospace' }}>{payRef}</div>
              </div>
              <div style={{ background: '#F8FAFC', borderRadius: 6, padding: '10px 12px', border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Amount Transferred</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{fmtFull(invoice.amount)}</div>
              </div>
              <div style={{ background: '#F8FAFC', borderRadius: 6, padding: '10px 12px', border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Bank Account</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{invoice.bankAccount}</div>
              </div>
              <div style={{ background: '#F8FAFC', borderRadius: 6, padding: '10px 12px', border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>SAP FI Document</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: SUCCESS, fontFamily: 'monospace' }}>{invoice.sapFiDoc}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: MUTED, background: '#F0FDF4', padding: '10px 14px', borderRadius: 6, border: '1px solid #BBF7D0' }}>
              SAP FI payment document will be posted within 24 hours. Supplier will receive remittance advice via {invoice.channel}.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ padding: '9px 20px', border: 'none', borderRadius: 6, background: TEAL, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Done</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 24 }}>!</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>Confirm Payment Release</div>
                <div style={{ fontSize: 12, color: MUTED }}>This action cannot be undone</div>
              </div>
            </div>

            <div style={{ background: '#F8FAFC', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '16px 18px', marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', fontSize: 13 }}>
                <div><span style={{ color: MUTED }}>Supplier: </span><span style={{ fontWeight: 700, color: NAVY }}>{invoice.supplierName}</span></div>
                <div><span style={{ color: MUTED }}>Invoice: </span><span style={{ fontWeight: 700, color: NAVY }}>{invoice.invoiceNumber}</span></div>
                <div><span style={{ color: MUTED }}>PO Reference: </span><span style={{ fontWeight: 600 }}>{invoice.poNumber}</span></div>
                <div><span style={{ color: MUTED }}>Payment Terms: </span><span style={{ fontWeight: 600 }}>{invoice.paymentTerms}</span></div>
                <div><span style={{ color: MUTED }}>Bank Account: </span><span style={{ fontWeight: 600 }}>{invoice.bankAccount}</span></div>
                <div><span style={{ color: MUTED }}>SAP FI Doc: </span><span style={{ fontWeight: 600, color: SUCCESS }}>{invoice.sapFiDoc}</span></div>
              </div>
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: MUTED }}>Total Payment Amount</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: NAVY }}>{fmtFull(invoice.amount)}</span>
              </div>
            </div>

            <div style={{ background: '#FEF9C3', border: '1px solid #F59E0B', borderRadius: 6, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#E9730C' }}>
              ⚠ Payment will be transferred to <strong>{invoice.bankAccount}</strong>. Verify bank details before confirming.
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ padding: '9px 20px', border: `1px solid ${BORDER}`, borderRadius: 6, background: 'white', color: MID, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={handleConfirm} style={{ padding: '9px 20px', border: 'none', borderRadius: 6, background: SUCCESS, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Confirm Release — {fmt(invoice.amount)}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const InvoicePayment: React.FC = () => {
  const [invoices, setInvoices] = useState<BuyerInvoice[]>(() => {
    const posted: string[] = JSON.parse(localStorage.getItem('paragon_gr_posted') || '[]');
    return BUYER_INVOICES.map(inv =>
      posted.includes(inv.poNumber) && inv.status === 'Pending Match' && inv.matchStatus === 'Pending GR'
        ? { ...inv, status: 'Approved' as InvStatus, matchStatus: 'Matched' as const, sapGrDoc: `GR-490000${Math.floor(1000 + Math.random() * 9000)}` }
        : inv
    );
  });
  const [activeTab, setActiveTab]       = useState<'queue' | 'analytics' | 'aging'>('queue');
  const [filterStatus, setFilterStatus] = useState<InvStatus | 'All'>('All');
  const [confirmInv, setConfirmInv]     = useState<BuyerInvoice | null>(null);
  const [toast, setToast]               = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const handleReleased = (invId: string) => {
    setInvoices(prev => prev.map(inv =>
      inv.id === invId ? { ...inv, status: 'Payment Released' as InvStatus, paymentDate: new Date().toISOString().slice(0, 10) } : inv
    ));
    showToast('Payment released — SAP FI document will be posted within 24 hours');
  };

  const filtered = filterStatus === 'All' ? invoices : invoices.filter(i => i.status === filterStatus);

  const totalPending  = invoices.filter(i => ['Pending Match', 'Approved'].includes(i.status)).reduce((a, b) => a + b.amount, 0);
  const totalReleased = invoices.filter(i => i.status === 'Payment Released').reduce((a, b) => a + b.amount, 0);
  const totalDisputed = invoices.filter(i => i.status === 'Disputed').reduce((a, b) => a + b.amount, 0);
  const totalOverdue  = invoices.filter(i => i.status === 'Overdue').reduce((a, b) => a + b.amount, 0);

  const STATUSES: Array<InvStatus | 'All'> = ['All', 'Pending Match', 'Approved', 'Payment Released', 'Disputed', 'Overdue'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {confirmInv && (
        <PaymentConfirmModal
          invoice={confirmInv}
          onClose={() => setConfirmInv(null)}
          onConfirm={() => handleReleased(confirmInv.id)}
        />
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: NAVY, color: 'white', padding: '12px 20px', borderRadius: 8, zIndex: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', fontSize: 13, borderLeft: `3px solid ${TEAL}`, maxWidth: 360 }}>{toast}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 4 }}>Invoices & Payment</div>
          <div style={{ fontSize: 13, color: MUTED }}>3-way match · Approval queue · Payment release · SAP FI integration</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => showToast('Exporting to SAP AP batch...')} style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: MID, cursor: 'pointer', fontFamily: 'inherit' }}>
             SAP AP Export
          </button>
          <button onClick={() => showToast('Downloading aging report...')} style={{ background: TEAL, border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
             Export Report
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Pending Approval', value: fmt(totalPending),  count: invoices.filter(i => ['Pending Match','Approved'].includes(i.status)).length, color: WARNING, icon: '⏳' },
          { label: 'Payments Released', value: fmt(totalReleased), count: invoices.filter(i => i.status === 'Payment Released').length, color: SUCCESS, icon: '✓' },
          { label: 'Disputed',          value: fmt(totalDisputed), count: invoices.filter(i => i.status === 'Disputed').length, color: ERROR, icon: '!' },
          { label: 'Overdue',           value: fmt(totalOverdue),  count: invoices.filter(i => i.status === 'Overdue').length, color: ERROR, icon: '❗' },
        ].map(({ label, value, count, color, icon }) => (
          <div key={label} style={{ background: 'white', border: `1px solid ${BORDER}`, borderLeft: `4px solid ${color}`, borderRadius: 8, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>{icon} {label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
            <div style={{ fontSize: 11, color: MUTED }}>{count} invoice{count !== 1 ? 's' : ''}</div>
          </div>
        ))}
      </div>

      {invoices.some(i => i.status === 'Overdue') && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#BB0000', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span>❗</span>
          <div>
            <strong>{invoices.filter(i => i.status === 'Overdue').length} overdue invoice{invoices.filter(i => i.status === 'Overdue').length > 1 ? 's' : ''}: </strong>
            {invoices.filter(i => i.status === 'Overdue').map(i => `${i.invoiceNumber} (${i.daysOutstanding}d overdue)`).join(' · ')}
          </div>
        </div>
      )}

      {invoices.some(i => i.status === 'Disputed') && (
        <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#E9730C', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span>!</span>
          <div>
            <strong>Invoice dispute: </strong>
            {invoices.filter(i => i.status === 'Disputed').map(i => i.invoiceNumber).join(', ')} — Quantity mismatch on PT Berlina Packaging. Credit note required before payment.
          </div>
        </div>
      )}

      <div style={{ display: 'flex', borderBottom: `2px solid ${BORDER}` }}>
        {(['queue', 'analytics', 'aging'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '10px 20px', border: 'none', borderBottom: activeTab === tab ? `2px solid ${TEAL}` : '2px solid transparent', background: 'transparent', color: activeTab === tab ? TEAL : MUTED, fontWeight: activeTab === tab ? 700 : 500, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: -2, textTransform: 'capitalize' }}>
            {tab === 'queue' ? 'Invoice Queue' : tab === 'analytics' ? 'Spend Analytics' : 'Aging Analysis'}
          </button>
        ))}
      </div>

      {activeTab === 'queue' && (
        <>
          <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 6, padding: 3, gap: 2, flexWrap: 'wrap', alignSelf: 'flex-start' }}>
            {STATUSES.map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: '5px 12px', border: 'none', borderRadius: 4, background: filterStatus === s ? 'white' : 'transparent', color: filterStatus === s ? NAVY : MUTED, fontWeight: filterStatus === s ? 700 : 500, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', boxShadow: filterStatus === s ? '0 1px 3px rgba(0,0,0,0.1)' : undefined, whiteSpace: 'nowrap' }}>{s}</button>
            ))}
          </div>

          <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: NAVY, color: 'white' }}>
                  {['Invoice #', 'Supplier', 'PO Ref', 'Amount', '3-Way Match', 'Status', 'Due Date', 'SAP FI', 'Action'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv, idx) => {
                  const sCfg = STATUS_CFG[inv.status];
                  const mCfg = MATCH_CFG[inv.matchStatus] ?? { bg: '#F1F5F9', color: '#475569' };
                  return (
                    <tr key={inv.id} style={{ background: idx % 2 === 0 ? 'white' : '#F8FAFC', borderTop: `1px solid ${BORDER}` }}>
                      <td style={{ padding: '11px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: TEAL, whiteSpace: 'nowrap' }}>{inv.invoiceNumber}</td>
                      <td style={{ padding: '11px 12px' }}>
                        <div style={{ fontWeight: 600, color: NAVY, fontSize: 12 }}>{inv.supplierName.replace('PT ', '').split(' ').slice(0, 3).join(' ')}</div>
                        <div style={{ fontSize: 10, color: MUTED, marginTop: 1 }}>via {inv.channel}</div>
                      </td>
                      <td style={{ padding: '11px 12px', fontFamily: 'var(--font-mono)', fontSize: 10, color: MID }}>{inv.poNumber}</td>
                      <td style={{ padding: '11px 12px', fontWeight: 700, color: NAVY, whiteSpace: 'nowrap' }}>
                        {fmt(inv.amount)}
                        <div style={{ fontSize: 10, color: MUTED, fontWeight: 400 }}>{fmtFull(inv.amount)}</div>
                      </td>
                      <td style={{ padding: '11px 12px' }}><StatusBadge status={inv.matchStatus} /></td>
                      <td style={{ padding: '11px 12px' }}>
                        <StatusBadge status={inv.status} />
                        {inv.status === 'Overdue' && <div style={{ fontSize: 10, color: ERROR, marginTop: 2 }}>{inv.daysOutstanding}d overdue</div>}
                      </td>
                      <td style={{ padding: '11px 12px', fontSize: 11, color: MUTED, whiteSpace: 'nowrap' }}>
                        {fmtDate(inv.dueDate)}
                        {inv.paymentDate && <div style={{ fontSize: 10, color: SUCCESS }}>Paid {fmtDate(inv.paymentDate)}</div>}
                      </td>
                      <td style={{ padding: '11px 12px', fontFamily: 'var(--font-mono)', fontSize: 10, color: inv.sapFiDoc ? SUCCESS : MUTED }}>{inv.sapFiDoc ?? '—'}</td>
                      <td style={{ padding: '11px 12px' }}>
                        {inv.status === 'Approved' ? (
                          <button onClick={() => setConfirmInv(inv)} style={{ background: SUCCESS, color: 'white', border: 'none', borderRadius: 5, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Release ▶
                          </button>
                        ) : inv.status === 'Pending Match' ? (
                          <button onClick={() => showToast('Awaiting GR confirmation in SAP before approval')} style={{ background: TEAL, color: 'white', border: 'none', borderRadius: 5, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Review
                          </button>
                        ) : inv.status === 'Overdue' ? (
                          <button onClick={() => showToast('Escalating overdue payment to Finance Controller')} style={{ background: ERROR, color: 'white', border: 'none', borderRadius: 5, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Urgent
                          </button>
                        ) : (
                          <button onClick={() => showToast(`Viewing ${inv.invoiceNumber}`)} style={{ background: 'white', color: MID, border: `1px solid ${BORDER}`, borderRadius: 5, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
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
        </>
      )}

      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 14, borderBottom: `2px solid ${BORDER}`, paddingBottom: 10 }}>Monthly Invoice Flow (Rp jT)</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={MONTHLY_SPEND} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="paid"    fill={SUCCESS} name="Released" radius={[4,4,0,0]} stackId="a" />
                  <Bar dataKey="pending" fill={TEAL}    name="Pending"  radius={[4,4,0,0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 14, borderBottom: `2px solid ${BORDER}`, paddingBottom: 10 }}>3-Way Match Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Auto-Matched',  count: invoices.filter(i => i.matchStatus === 'Matched').length,       color: SUCCESS, bg: '#DCFCE7' },
                  { label: 'Pending GR',    count: invoices.filter(i => i.matchStatus === 'Pending GR').length,    color: WARNING, bg: '#FEF3C7' },
                  { label: 'Qty Mismatch',  count: invoices.filter(i => i.matchStatus === 'Qty Mismatch').length,  color: ERROR,   bg: '#FEE2E2' },
                  { label: 'Price Var.',    count: invoices.filter(i => i.matchStatus === 'Price Variance').length, color: ERROR,   bg: '#FEE2E2' },
                ].map(({ label, count, color, bg }) => (
                  <div key={label} style={{ background: bg, borderRadius: 8, padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color }}>{count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'aging' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 14, borderBottom: `2px solid ${BORDER}`, paddingBottom: 10 }}>Invoice Aging Report (Rp jT)</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={AGING_DATA} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" fill={TEAL} name="Amount (jT)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: NAVY, color: 'white' }}>
                  {['Aging Bucket', 'Invoice Count', 'Total Amount', '% of AP', 'Risk'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 11, letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {AGING_DATA.map(({ bucket, amount, count }, idx) => {
                  const totalAmt = AGING_DATA.reduce((a, b) => a + b.amount, 0);
                  const pct = totalAmt > 0 ? ((amount / totalAmt) * 100).toFixed(1) : '0.0';
                  const risk = bucket === 'Current' ? { label: 'Low', bg: '#DCFCE7', color: SUCCESS } : bucket === '1–30d' ? { label: 'Medium', bg: '#FEF3C7', color: WARNING } : { label: 'High', bg: '#FEE2E2', color: ERROR };
                  return (
                    <tr key={bucket} style={{ background: idx % 2 === 0 ? 'white' : '#F8FAFC', borderTop: `1px solid ${BORDER}` }}>
                      <td style={{ padding: '11px 14px', fontWeight: 600, color: NAVY }}>{bucket}</td>
                      <td style={{ padding: '11px 14px', color: MUTED }}>{count}</td>
                      <td style={{ padding: '11px 14px', fontWeight: 600, color: amount > 0 ? NAVY : MUTED }}>{amount > 0 ? `Rp ${amount}jT` : '—'}</td>
                      <td style={{ padding: '11px 14px', color: MUTED }}>{amount > 0 ? `${pct}%` : '—'}</td>
                      <td style={{ padding: '11px 14px' }}>{amount > 0 && <Pill label={risk.label} bg={risk.bg} color={risk.color} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ background: '#E0F7FA', border: '1px solid #0097A744', borderRadius: 8, padding: '12px 16px', fontSize: 12, color: '#006064', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span></span>
            <span><strong>Phase 2 — SAP FI Integration:</strong> Aging will pull from SAP AP open items. Payment runs triggered via SAP F110.</span>
          </div>
        </div>
      )}

    </div>
  );
};

export default InvoicePayment;

