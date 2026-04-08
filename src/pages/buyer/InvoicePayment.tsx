import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import { mockPurchaseOrders } from '../../data/mockPurchaseOrders';
import { mockSuppliers } from '../../data/mockSuppliers';
import { POStatus } from '../../types/purchaseOrder.types';

// ─── Design tokens ────────────────────────────────────────────────────────────
const NAVY   = '#0D1B2A';
const TEAL   = '#0097A7';
const MID    = '#354A5F';
const MUTED  = '#64748B';
const BORDER = '#E2E8F0';

// ─── Types ────────────────────────────────────────────────────────────────────
type InvStatus = 'Pending Match' | 'Approved' | 'Disputed' | 'Payment Released' | 'Overdue';
type ApprovalStep = 'Received' | '3-Way Match' | 'Finance Review' | 'Payment Released';

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
  channel: string;
}

// ─── Mock buyer invoices (linked to real PO data) ─────────────────────────────
const BUYER_INVOICES: BuyerInvoice[] = [
  {
    id: 'binv-001',
    invoiceNumber: 'INV-2025-ECO-0341',
    supplierName: 'PT Ecogreen Oleochemicals',
    supplierId: 'sup-001',
    poNumber: 'PO-2025-00101',
    poId: 'po-001',
    amount: 1_250_000_000,
    currency: 'IDR',
    status: 'Payment Released',
    receivedDate: '2025-03-22',
    dueDate: '2025-05-05',
    paymentDate: '2025-04-30',
    matchStatus: 'Matched',
    sapFiDoc: 'FI-5100009100',
    sapGrDoc: 'GR-4900009201',
    approver: 'Finance Controller',
    paymentTerms: 'Net 45',
    daysOutstanding: 0,
    channel: 'API',
  },
  {
    id: 'binv-002',
    invoiceNumber: 'INV-2025-GIV-0892',
    supplierName: 'Givaudan Indonesia Fragrances',
    supplierId: 'sup-003',
    poNumber: 'PO-2025-00103',
    poId: 'po-003',
    amount: 2_000_000_000,
    currency: 'IDR',
    status: 'Approved',
    receivedDate: '2025-04-01',
    dueDate: '2025-05-01',
    paymentDate: null,
    matchStatus: 'Matched',
    sapFiDoc: 'FI-5100009312',
    sapGrDoc: 'GR-4900009344',
    approver: 'VP SCM',
    paymentTerms: 'Net 30',
    daysOutstanding: 7,
    channel: 'API',
  },
  {
    id: 'binv-003',
    invoiceNumber: 'INV-2025-MUS-0214',
    supplierName: 'PT Musim Mas Specialty Fats',
    supplierId: 'sup-002',
    poNumber: 'PO-2025-00102',
    poId: 'po-002',
    amount: 875_000_000,
    currency: 'IDR',
    status: 'Pending Match',
    receivedDate: '2025-04-08',
    dueDate: '2025-05-23',
    paymentDate: null,
    matchStatus: 'Pending GR',
    sapFiDoc: null,
    sapGrDoc: null,
    approver: 'Procurement Officer',
    paymentTerms: 'Net 45',
    daysOutstanding: 0,
    channel: 'Web',
  },
  {
    id: 'binv-004',
    invoiceNumber: 'INV-2025-BAS-0561',
    supplierName: 'BASF Personal Care Emulsifiers GmbH',
    supplierId: 'sup-005',
    poNumber: 'PO-2025-00013',
    poId: 'po-013',
    amount: 560_000_000,
    currency: 'IDR',
    status: 'Payment Released',
    receivedDate: '2025-03-15',
    dueDate: '2025-04-14',
    paymentDate: '2025-04-12',
    matchStatus: 'Matched',
    sapFiDoc: 'FI-5100009198',
    sapGrDoc: 'GR-4900009189',
    approver: 'Finance Controller',
    paymentTerms: 'Net 30',
    daysOutstanding: 0,
    channel: 'API',
  },
  {
    id: 'binv-005',
    invoiceNumber: 'INV-2025-BRL-0042',
    supplierName: 'PT Berlina Packaging Indonesia',
    supplierId: 'sup-007',
    poNumber: 'PO-2025-00107',
    poId: 'po-007',
    amount: 320_000_000,
    currency: 'IDR',
    status: 'Approved',
    receivedDate: '2025-04-10',
    dueDate: '2025-05-10',
    paymentDate: null,
    matchStatus: 'Matched',
    sapFiDoc: 'FI-5100009441',
    sapGrDoc: 'GR-4900009420',
    approver: 'Procurement Officer',
    paymentTerms: 'Net 30',
    daysOutstanding: 0,
    channel: 'WhatsApp',
  },
  {
    id: 'binv-006',
    invoiceNumber: 'INV-2025-BRL-0043',
    supplierName: 'PT Berlina Packaging Indonesia',
    supplierId: 'sup-007',
    poNumber: 'PO-2025-00108',
    poId: 'po-008',
    amount: 185_000_000,
    currency: 'IDR',
    status: 'Disputed',
    receivedDate: '2025-04-12',
    dueDate: '2025-05-12',
    paymentDate: null,
    matchStatus: 'Qty Mismatch',
    sapFiDoc: null,
    sapGrDoc: 'GR-4900009488',
    approver: 'Finance Controller',
    paymentTerms: 'Net 30',
    daysOutstanding: 0,
    channel: 'WhatsApp',
  },
  {
    id: 'binv-007',
    invoiceNumber: 'INV-2025-EVO-0188',
    supplierName: 'Evonik Specialty Chemicals France',
    supplierId: 'sup-006',
    poNumber: 'PO-2025-00014',
    poId: 'po-014',
    amount: 410_000_000,
    currency: 'IDR',
    status: 'Overdue',
    receivedDate: '2025-03-25',
    dueDate: '2025-04-03',
    paymentDate: null,
    matchStatus: 'Matched',
    sapFiDoc: 'FI-5100009288',
    sapGrDoc: 'GR-4900009302',
    approver: 'Finance Controller',
    paymentTerms: 'Net 10',
    daysOutstanding: 34,
    channel: 'Email',
  },
  {
    id: 'binv-008',
    invoiceNumber: 'INV-2025-FIR-0309',
    supplierName: 'Firmenich Malaysia Sdn. Bhd.',
    supplierId: 'sup-004',
    poNumber: 'PO-2025-00018',
    poId: 'po-018',
    amount: 890_000_000,
    currency: 'IDR',
    status: 'Payment Released',
    receivedDate: '2025-03-18',
    dueDate: '2025-04-17',
    paymentDate: '2025-04-15',
    matchStatus: 'Matched',
    sapFiDoc: 'FI-5100009241',
    sapGrDoc: 'GR-4900009255',
    approver: 'VP SCM',
    paymentTerms: 'Net 30',
    daysOutstanding: 0,
    channel: 'Web',
  },
];

// ─── Aging analysis data ───────────────────────────────────────────────────────
const AGING_DATA = [
  { bucket: 'Current',   amount: 3195, count: 3 },
  { bucket: '1–30d',     amount: 320,  count: 1 },
  { bucket: '31–60d',    amount: 410,  count: 1 },
  { bucket: '61–90d',    amount: 0,    count: 0 },
  { bucket: '>90d',      amount: 0,    count: 0 },
];

const MONTHLY_SPEND = [
  { month: 'Nov 24', paid: 1800, pending: 400 },
  { month: 'Dec 24', paid: 2100, pending: 350 },
  { month: 'Jan 25', paid: 1950, pending: 500 },
  { month: 'Feb 25', paid: 2400, pending: 280 },
  { month: 'Mar 25', paid: 3100, pending: 380 },
  { month: 'Apr 25', paid: 890,  pending: 3195 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<InvStatus, { bg: string; color: string }> = {
  'Pending Match':    { bg: '#FEF9C3', color: '#854D0E' },
  'Approved':         { bg: '#DBEAFE', color: '#1E40AF' },
  'Disputed':         { bg: '#FEE2E2', color: '#991B1B' },
  'Payment Released': { bg: '#DCFCE7', color: '#166534' },
  'Overdue':          { bg: '#FEE2E2', color: '#991B1B' },
};

const MATCH_CFG: Record<string, { bg: string; color: string }> = {
  'Matched':       { bg: '#DCFCE7', color: '#166534' },
  'Pending GR':    { bg: '#FEF9C3', color: '#854D0E' },
  'Pending':       { bg: '#FEF9C3', color: '#854D0E' },
  'Qty Mismatch':  { bg: '#FEE2E2', color: '#991B1B' },
  'Price Variance':{ bg: '#FEE2E2', color: '#991B1B' },
};

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
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: Rp {p.value}jT
        </div>
      ))}
    </div>
  );
};

// ─── Approval workflow panel ───────────────────────────────────────────────────
const STEPS: ApprovalStep[] = ['Received', '3-Way Match', 'Finance Review', 'Payment Released'];

function ApprovalPanel({ invoice, onClose, onApprove }: {
  invoice: BuyerInvoice;
  onClose: () => void;
  onApprove: () => void;
}) {
  const stepIdx =
    invoice.status === 'Payment Released' ? 3 :
    invoice.status === 'Approved'         ? 2 :
    invoice.status === 'Pending Match'    ? 1 : 1;

  const [confirmed, setConfirmed] = useState(false);

  const handleApprove = () => {
    setConfirmed(true);
    setTimeout(() => { onApprove(); onClose(); }, 1600);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 800 }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 28, maxWidth: 560, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
        {confirmed ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>Invoice Approved</div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>Payment will be released on due date via SAP FI</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 4 }}>Invoice Review</div>
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>
              {invoice.invoiceNumber} · {invoice.supplierName} · {fmtFull(invoice.amount)}
            </div>

            {/* Workflow stepper */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
              {STEPS.map((step, i) => (
                <React.Fragment key={step}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: i <= stepIdx ? TEAL : '#F1F5F9',
                      color: i <= stepIdx ? 'white' : MUTED,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, marginBottom: 4,
                      border: i === stepIdx ? `2px solid ${TEAL}` : 'none',
                    }}>
                      {i < stepIdx ? '✓' : i + 1}
                    </div>
                    <div style={{ fontSize: 9, color: i <= stepIdx ? TEAL : MUTED, textAlign: 'center', fontWeight: i === stepIdx ? 700 : 400 }}>
                      {step}
                    </div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: i < stepIdx ? TEAL : '#F1F5F9', margin: '0 4px', marginBottom: 18 }} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Invoice details grid */}
            <div style={{ background: '#F8FAFC', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', fontSize: 12 }}>
                {[
                  ['PO Number',     invoice.poNumber],
                  ['Amount',        fmtFull(invoice.amount)],
                  ['Due Date',      fmtDate(invoice.dueDate)],
                  ['Payment Terms', invoice.paymentTerms],
                  ['3-Way Match',   invoice.matchStatus],
                  ['SAP GR Doc',    invoice.sapGrDoc ?? 'Pending'],
                  ['SAP FI Doc',    invoice.sapFiDoc ?? 'Pending'],
                  ['Approver',      invoice.approver],
                ].map(([label, val]) => (
                  <div key={label}>
                    <span style={{ color: MUTED }}>{label}: </span>
                    <span style={{ fontWeight: 600, color: NAVY }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {invoice.matchStatus === 'Qty Mismatch' && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#991B1B' }}>
                ⚠️ <strong>Quantity mismatch detected.</strong> ASN shows 148,500 PCS vs invoiced 150,000 PCS.
                Cannot approve until supplier issues credit note for 1,500 PCS.
              </div>
            )}

            {invoice.matchStatus === 'Pending GR' && (
              <div style={{ background: '#FEF9C3', border: '1px solid #F59E0B', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400E' }}>
                ⏳ <strong>Awaiting Goods Receipt confirmation in SAP.</strong> Invoice will auto-advance to Finance Review once GR is posted.
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ padding: '8px 18px', border: `1px solid ${BORDER}`, borderRadius: 6, background: 'white', color: MID, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Close
              </button>
              {invoice.status === 'Approved' && (
                <button
                  onClick={handleApprove}
                  style={{ padding: '8px 18px', border: 'none', borderRadius: 6, background: '#107E3E', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Release Payment
                </button>
              )}
              {invoice.status === 'Pending Match' && invoice.matchStatus !== 'Pending GR' && (
                <button
                  onClick={handleApprove}
                  style={{ padding: '8px 18px', border: 'none', borderRadius: 6, background: TEAL, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Approve Invoice
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
const InvoicePayment: React.FC = () => {
  const [invoices, setInvoices]       = useState<BuyerInvoice[]>(BUYER_INVOICES);
  const [activeTab, setActiveTab]     = useState<'queue' | 'analytics' | 'aging'>('queue');
  const [filterStatus, setFilterStatus] = useState<InvStatus | 'All'>('All');
  const [reviewInv, setReviewInv]     = useState<BuyerInvoice | null>(null);
  const [toast, setToast]             = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleApproved = (invId: string) => {
    setInvoices(prev => prev.map(inv =>
      inv.id === invId
        ? { ...inv, status: inv.status === 'Approved' ? 'Payment Released' : 'Approved' }
        : inv
    ));
    showToast('Invoice status updated — SAP FI document will be posted');
  };

  const filtered = filterStatus === 'All'
    ? invoices
    : invoices.filter(i => i.status === filterStatus);

  // Summary values
  const totalPending  = invoices.filter(i => ['Pending Match', 'Approved'].includes(i.status)).reduce((a, b) => a + b.amount, 0);
  const totalReleased = invoices.filter(i => i.status === 'Payment Released').reduce((a, b) => a + b.amount, 0);
  const totalDisputed = invoices.filter(i => i.status === 'Disputed').reduce((a, b) => a + b.amount, 0);
  const totalOverdue  = invoices.filter(i => i.status === 'Overdue').reduce((a, b) => a + b.amount, 0);

  const STATUSES: Array<InvStatus | 'All'> = ['All', 'Pending Match', 'Approved', 'Payment Released', 'Disputed', 'Overdue'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {reviewInv && (
        <ApprovalPanel
          invoice={reviewInv}
          onClose={() => setReviewInv(null)}
          onApprove={() => handleApproved(reviewInv.id)}
        />
      )}

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
          <div style={{ fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 4 }}>Invoices & Payment</div>
          <div style={{ fontSize: 13, color: MUTED }}>
            3-way match · Approval queue · Payment release · SAP FI integration
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => showToast('Export to SAP AP batch — preparing file...')}
            style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: MID, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            📤 SAP AP Export
          </button>
          <button
            onClick={() => showToast('Downloading invoice aging report PDF...')}
            style={{ background: TEAL, border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            📥 Export Report
          </button>
        </div>
      </div>

      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Pending Approval', value: fmt(totalPending),  count: invoices.filter(i => ['Pending Match','Approved'].includes(i.status)).length, color: '#E9730C', icon: '⏳' },
          { label: 'Payments Released', value: fmt(totalReleased), count: invoices.filter(i => i.status === 'Payment Released').length, color: '#107E3E', icon: '✅' },
          { label: 'Disputed',         value: fmt(totalDisputed), count: invoices.filter(i => i.status === 'Disputed').length, color: '#BB0000', icon: '⚠️' },
          { label: 'Overdue',          value: fmt(totalOverdue),  count: invoices.filter(i => i.status === 'Overdue').length, color: '#BB0000', icon: '❗' },
        ].map(({ label, value, count, color, icon }) => (
          <div key={label} style={{
            background: 'white', border: `1px solid ${BORDER}`,
            borderLeft: `4px solid ${color}`,
            borderRadius: 8, padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
              {icon} {label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
            <div style={{ fontSize: 11, color: MUTED }}>{count} invoice{count !== 1 ? 's' : ''}</div>
          </div>
        ))}
      </div>

      {/* Alert banners */}
      {invoices.some(i => i.status === 'Overdue') && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#991B1B', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span>❗</span>
          <div>
            <strong>{invoices.filter(i => i.status === 'Overdue').length} overdue invoice{invoices.filter(i => i.status === 'Overdue').length > 1 ? 's' : ''}: </strong>
            {invoices.filter(i => i.status === 'Overdue').map(i => `${i.invoiceNumber} (${i.daysOutstanding}d overdue)`).join(' · ')}
            {' '}— Late payment may affect supplier OTIF commitments and credit terms.
          </div>
        </div>
      )}
      {invoices.some(i => i.status === 'Disputed') && (
        <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#92400E', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span>⚠️</span>
          <div>
            <strong>Invoice dispute: </strong>
            {invoices.filter(i => i.status === 'Disputed').map(i => i.invoiceNumber).join(', ')} —
            Quantity mismatch on PT Berlina Packaging. Credit note required from supplier before payment can proceed.
          </div>
        </div>
      )}

      {/* Tab nav */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${BORDER}` }}>
        {([['queue', '🧾 Invoice Queue'], ['analytics', '📊 Spend Analytics'], ['aging', '📅 Aging Analysis']] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '10px 20px', border: 'none',
            borderBottom: activeTab === tab ? `2px solid ${TEAL}` : '2px solid transparent',
            background: 'transparent', color: activeTab === tab ? TEAL : MUTED,
            fontWeight: activeTab === tab ? 700 : 500,
            fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            marginBottom: -2,
          }}>{label}</button>
        ))}
      </div>

      {/* ── QUEUE TAB ── */}
      {activeTab === 'queue' && (
        <>
          {/* Filter bar */}
          <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 6, padding: 3, gap: 2, flexWrap: 'wrap', alignSelf: 'flex-start' }}>
            {STATUSES.map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} style={{
                padding: '5px 12px', border: 'none', borderRadius: 4,
                background: filterStatus === s ? 'white' : 'transparent',
                color: filterStatus === s ? NAVY : MUTED,
                fontWeight: filterStatus === s ? 700 : 500,
                fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: filterStatus === s ? '0 1px 3px rgba(0,0,0,0.1)' : undefined,
                whiteSpace: 'nowrap',
              }}>{s}</button>
            ))}
          </div>

          {/* Invoice table */}
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
                      <td style={{ padding: '11px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: TEAL, whiteSpace: 'nowrap' }}>
                        {inv.invoiceNumber}
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <div style={{ fontWeight: 600, color: NAVY, fontSize: 12 }}>
                          {inv.supplierName.replace('PT ', '').split(' ').slice(0, 3).join(' ')}
                        </div>
                        <div style={{ fontSize: 10, color: MUTED, marginTop: 1 }}>via {inv.channel}</div>
                      </td>
                      <td style={{ padding: '11px 12px', fontFamily: 'var(--font-mono)', fontSize: 10, color: MID }}>
                        {inv.poNumber}
                      </td>
                      <td style={{ padding: '11px 12px', fontWeight: 700, color: NAVY, whiteSpace: 'nowrap' }}>
                        {fmt(inv.amount)}
                        <div style={{ fontSize: 10, color: MUTED, fontWeight: 400 }}>{fmtFull(inv.amount)}</div>
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <Pill label={inv.matchStatus} bg={mCfg.bg} color={mCfg.color} />
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <Pill label={inv.status} bg={sCfg.bg} color={sCfg.color} />
                        {inv.status === 'Overdue' && (
                          <div style={{ fontSize: 10, color: '#BB0000', marginTop: 2 }}>{inv.daysOutstanding}d overdue</div>
                        )}
                      </td>
                      <td style={{ padding: '11px 12px', fontSize: 11, color: MUTED, whiteSpace: 'nowrap' }}>
                        {fmtDate(inv.dueDate)}
                        {inv.paymentDate && (
                          <div style={{ fontSize: 10, color: '#107E3E' }}>Paid {fmtDate(inv.paymentDate)}</div>
                        )}
                      </td>
                      <td style={{ padding: '11px 12px', fontFamily: 'var(--font-mono)', fontSize: 10, color: inv.sapFiDoc ? '#107E3E' : MUTED }}>
                        {inv.sapFiDoc ?? '—'}
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <button
                          onClick={() => setReviewInv(inv)}
                          style={{
                            background: inv.status === 'Approved' ? '#107E3E' :
                                        inv.status === 'Pending Match' ? TEAL :
                                        inv.status === 'Overdue' ? '#BB0000' : 'white',
                            color: ['Approved', 'Pending Match', 'Overdue'].includes(inv.status) ? 'white' : MID,
                            border: ['Approved', 'Pending Match', 'Overdue'].includes(inv.status) ? 'none' : `1px solid ${BORDER}`,
                            borderRadius: 5, padding: '5px 12px',
                            fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          {inv.status === 'Approved'      ? 'Release ▶' :
                           inv.status === 'Pending Match' ? 'Review' :
                           inv.status === 'Overdue'       ? 'Urgent' : 'View'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── ANALYTICS TAB ── */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 4, borderBottom: `2px solid ${BORDER}`, paddingBottom: 10 }}>
                Monthly Invoice Flow (Rp jT)
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={MONTHLY_SPEND} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="paid"    fill="#107E3E" name="Released" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="pending" fill={TEAL}    name="Pending"  radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 14, borderBottom: `2px solid ${BORDER}`, paddingBottom: 10 }}>
                Invoice Status by Supplier
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Supplier', 'Invoices', 'Total', 'Status'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '6px 8px', fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from(new Set(invoices.map(i => i.supplierId))).map(sid => {
                    const group = invoices.filter(i => i.supplierId === sid);
                    const total = group.reduce((a, b) => a + b.amount, 0);
                    const worst = group.find(i => i.status === 'Overdue') ? 'Overdue'
                                : group.find(i => i.status === 'Disputed') ? 'Disputed'
                                : group.find(i => i.status === 'Approved') ? 'Approved'
                                : group.find(i => i.status === 'Pending Match') ? 'Pending'
                                : 'Released';
                    const cfg = STATUS_CFG[worst as InvStatus] ?? { bg: '#DCFCE7', color: '#166534' };
                    return (
                      <tr key={sid} style={{ borderBottom: `1px solid #F8FAFC` }}>
                        <td style={{ padding: '8px 8px', fontWeight: 600, color: NAVY, fontSize: 11 }}>
                          {group[0].supplierName.split(' ').slice(0, 3).join(' ')}
                        </td>
                        <td style={{ padding: '8px 8px', color: MUTED }}>{group.length}</td>
                        <td style={{ padding: '8px 8px', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(total)}</td>
                        <td style={{ padding: '8px 8px' }}>
                          <Pill label={worst} bg={cfg.bg} color={cfg.color} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3-way match summary */}
          <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 14, borderBottom: `2px solid ${BORDER}`, paddingBottom: 10 }}>
              3-Way Match Summary
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { label: 'Auto-Matched',   count: invoices.filter(i => i.matchStatus === 'Matched').length,      color: '#107E3E', bg: '#DCFCE7' },
                { label: 'Pending GR',     count: invoices.filter(i => i.matchStatus === 'Pending GR').length,   color: '#E9730C', bg: '#FEF3C7' },
                { label: 'Qty Mismatch',   count: invoices.filter(i => i.matchStatus === 'Qty Mismatch').length, color: '#BB0000', bg: '#FEE2E2' },
                { label: 'Price Variance', count: invoices.filter(i => i.matchStatus === 'Price Variance').length, color: '#BB0000', bg: '#FEE2E2' },
              ].map(({ label, count, color, bg }) => (
                <div key={label} style={{ background: bg, borderRadius: 8, padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color }}>{count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── AGING TAB ── */}
      {activeTab === 'aging' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 14, borderBottom: `2px solid ${BORDER}`, paddingBottom: 10 }}>
              Invoice Aging Report (Rp jT)
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={AGING_DATA} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" fill={TEAL} name="Amount (jT)" radius={[4, 4, 0, 0]}
                  label={{ position: 'top', fontSize: 10, fill: MID, formatter: (v: number) => v > 0 ? `${v}jT` : '' }} />
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
                  const risk = bucket === 'Current' ? { label: 'Low', bg: '#DCFCE7', color: '#166534' }
                             : bucket === '1–30d'   ? { label: 'Medium', bg: '#FEF3C7', color: '#92400E' }
                             : { label: 'High', bg: '#FEE2E2', color: '#991B1B' };
                  return (
                    <tr key={bucket} style={{ background: idx % 2 === 0 ? 'white' : '#F8FAFC', borderTop: `1px solid ${BORDER}` }}>
                      <td style={{ padding: '11px 14px', fontWeight: 600, color: NAVY }}>{bucket}</td>
                      <td style={{ padding: '11px 14px', color: MUTED }}>{count}</td>
                      <td style={{ padding: '11px 14px', fontWeight: 600, color: amount > 0 ? NAVY : MUTED }}>{amount > 0 ? `Rp ${amount}jT` : '—'}</td>
                      <td style={{ padding: '11px 14px', color: MUTED }}>{amount > 0 ? `${pct}%` : '—'}</td>
                      <td style={{ padding: '11px 14px' }}>
                        {amount > 0 && <Pill label={risk.label} bg={risk.bg} color={risk.color} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ background: '#E0F7FA', border: '1px solid #0097A744', borderRadius: 8, padding: '12px 16px', fontSize: 12, color: '#006064', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span>💡</span>
            <span>
              <strong>Phase 2 — SAP FI Integration:</strong> Invoice aging will pull directly from SAP AP open items (FBL1N equivalent via OData).
              Automated payment runs will be triggered via SAP F110 transaction. Current data is mock-sourced.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicePayment;
