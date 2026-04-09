import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { mockPurchaseOrders } from '../../data/mockPurchaseOrders';
import { POStatus } from '../../types/purchaseOrder.types';

const NAVY   = '#0D1B2A';
const TEAL   = '#0097A7';
const MID    = '#354A5F';
const MUTED  = '#64748B';
const BORDER = '#E2E8F0';
const SUCCESS = '#107E3E';
const WARNING = '#E9730C';
const ERROR   = '#BB0000';
const INFO    = '#0A6ED1';

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
  'Pending Match':    { bg: '#FEF9C3', color: '#854D0E' },
  'Approved':         { bg: '#DBEAFE', color: '#1E40AF' },
  'Disputed':         { bg: '#FEE2E2', color: '#991B1B' },
  'Payment Released': { bg: '#DCFCE7', color: '#166534' },
  'Overdue':          { bg: '#FEE2E2', color: '#991B1B' },
};

const MATCH_CFG: Record<string, { bg: string; color: string }> = {
  'Matched':        { bg: '#DCFCE7', color: '#166534' },
  'Pending GR':     { bg: '#FEF9C3', color: '#854D0E' },
  'Pending':        { bg: '#FEF9C3', color: '#854D0E' },
  'Qty Mismatch':   { bg: '#FEE2E2', color: '#991B1B' },
  'Price Variance': { bg: '#FEE2E2', color: '#991B1B' },
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
