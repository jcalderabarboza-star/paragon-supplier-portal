import React, { useState, useMemo } from 'react';
import { Title, Button } from '@ui5/webcomponents-react';
import { mockSuppliers } from '../../data/mockSuppliers';
import { mockPurchaseOrders } from '../../data/mockPurchaseOrders';
import { PreferredChannel } from '../../types/supplier.types';
import { POStatus } from '../../types/purchaseOrder.types';
import { ClipboardList, Truck, CreditCard, Target } from 'lucide-react';

// ─── Supplier context ─────────────────────────────────────────────────────────

const SUPPLIER_ID = 'sup-007';
const mySupplier = mockSuppliers.find(s => s.id === SUPPLIER_ID)!;
const MY_POS = mockPurchaseOrders.filter(po => po.supplierId === SUPPLIER_ID);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtIDR(v: number): string {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `Rp ${Math.round(v / 1_000_000)}jT`;
  return `Rp ${v.toLocaleString()}`;
}

function fmtDate(s: string): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function perfColor(v: number): string {
  if (v >= 90) return '#107E3E';
  if (v >= 80) return '#E9730C';
  return '#BB0000';
}

const CHANNEL_LABEL: Record<PreferredChannel, string> = {
  [PreferredChannel.WHATSAPP]: 'WhatsApp',
  [PreferredChannel.WEB]: '🌐 Web Portal',
  [PreferredChannel.EMAIL]: '📧 Email',
  [PreferredChannel.API]: '⚙️ API/EDI',
};

const GRADE_COLORS: Record<string, string> = {
  A: '#107E3E', B: '#0097A7', C: '#E9730C', D: '#BB0000', F: '#BB0000',
};

function StatusPill({ status }: { status: POStatus }) {
  const map: Record<string, [string, string]> = {
    [POStatus.SENT]: ['#FFF3CD', '#856404'],
    [POStatus.VIEWED]: ['#D1ECF1', '#0C5460'],
    [POStatus.ACKNOWLEDGED]: ['#CCE5FF', '#004085'],
    [POStatus.CONFIRMED]: ['#D4EDDA', '#155724'],
    [POStatus.PARTIALLY_DELIVERED]: ['#FFF3CD', '#E9730C'],
    [POStatus.DELIVERED]: ['#C8E6C9', '#107E3E'],
    [POStatus.CLOSED]: ['#F5F5F5', '#6c757d'],
  };
  const [bg, color] = map[status] ?? ['#f5f5f5', '#6c757d'];
  return (
    <span style={{ background: bg, color, fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '12px', whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const SupplierDashboard: React.FC = () => {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3500); };

  // Quick stats
  const openOrders = useMemo(() =>
    MY_POS.filter(po => po.status !== POStatus.DELIVERED && po.status !== POStatus.CLOSED).length, []);
  const pendingASNs = useMemo(() =>
    MY_POS.filter(po => po.status === POStatus.CONFIRMED).length, []);
  const needsConfirmCount = useMemo(() =>
    MY_POS.filter(po => po.status === POStatus.SENT || po.status === POStatus.ACKNOWLEDGED).length, []);

  const otifColor = perfColor(mySupplier.otif);
  const gradeColor = GRADE_COLORS[mySupplier.scorecardGrade] ?? '#6c757d';
  const channelLabel = CHANNEL_LABEL[mySupplier.preferredChannel];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', background: '#354A5F', color: 'white',
          padding: '0.75rem 1.25rem', borderRadius: '6px', zIndex: 500,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)', fontSize: '0.875rem', maxWidth: '340px',
        }}>{toastMsg}</div>
      )}

      {/* ── Welcome Banner ──────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0097A7 0%, #354A5F 100%)',
        borderRadius: '10px', padding: '1.5rem 2rem',
        color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.4rem' }}>
            Selamat datang, {mySupplier.name} 👋
          </div>
          <div style={{ fontSize: '0.875rem', opacity: 0.88 }}>
            Paragon Corp Supplier Portal &nbsp;·&nbsp; Last login: 5 April 2026 &nbsp;·&nbsp; Channel: {channelLabel}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', opacity: 0.85, marginBottom: '0.3rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Paragon Grade</div>
            <div style={{
              width: '64px', height: '64px', borderRadius: '12px',
              border: '3px solid rgba(255,255,255,0.9)',
              background: gradeColor,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.8rem', fontWeight: 900,
            }}>
              {mySupplier.scorecardGrade}
            </div>
            <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '0.3rem' }}>82 / 100</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ fontSize: '0.78rem', opacity: 0.9, fontWeight: 600 }}>
              {mySupplier.otif >= 90 ? '● On Track' : mySupplier.otif >= 80 ? '● Needs Attention' : '● At Risk'}
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>OTIF: {mySupplier.otif}%</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Target: ≥ 95%</div>
          </div>
        </div>
      </div>

      {/* ── Quick Stats ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {[
          { icon: <ClipboardList size={20} />, label: 'Open Orders', value: openOrders, sub: 'awaiting action', color: '#0097A7', bg: 'white' },
          { icon: <Truck size={20} />, label: 'Pending ASNs', value: pendingASNs, sub: 'need shipment notice', color: '#E9730C', bg: 'white' },
          { icon: <CreditCard size={20} />, label: 'Unpaid Invoices', value: 2, sub: 'pending payment', color: '#BB0000', bg: 'white' },
          { icon: <Target size={20} />, label: 'My OTIF Score', value: `${mySupplier.otif}%`, sub: 'last 6 months', color: otifColor, bg: 'white' },
        ].map(({ icon, label, value, sub, color, bg }) => (
          <div key={label} style={{ flex: '1 1 160px', background: bg, border: '1px solid #E2E8F0', borderLeft: `4px solid ${color}`, borderRadius: '8px', padding: '1rem 1.125rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ color, marginBottom: '0.5rem', display: 'flex', alignItems: 'center' }}>{icon}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#354A5F' }}>{label}</div>
            <div style={{ fontSize: '0.72rem', color: '#6c757d' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* LEFT ── Action Required + Recent Orders */}
        <div style={{ flex: '3 1 420px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Action Required */}
          <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#354A5F' }}>Action Required</span>
              <span style={{
                background: '#BB0000', color: 'white', fontSize: '0.7rem', fontWeight: 700,
                padding: '0.1rem 0.5rem', borderRadius: '12px', minWidth: '20px', textAlign: 'center',
              }}>3</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Red — PO confirmation */}
              <div style={{ borderLeft: '4px solid #BB0000', padding: '0.875rem 1rem', background: '#FFF5F5', borderRadius: '0 6px 6px 0' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  Purchase Orders awaiting confirmation
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6c757d', marginBottom: '0.625rem' }}>
                  {needsConfirmCount} PO{needsConfirmCount !== 1 ? 's' : ''} need your acknowledgement to proceed
                </div>
                <Button design="Emphasized" onClick={() => showToast('Opening PO confirmation...')}>
                  Confirm Now →
                </Button>
              </div>

              {/* Yellow — ISO expiry */}
              <div style={{ borderLeft: '4px solid #E9730C', padding: '0.875rem 1rem', background: '#FFFBF0', borderRadius: '0 6px 6px 0' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  ISO Certificate expiring in 45 days
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6c757d', marginBottom: '0.625rem' }}>
                  Upload your renewed certificate to avoid disruption
                </div>
                <Button design="Default" onClick={() => showToast('Document upload coming in Phase 2')}>
                  Upload Certificate →
                </Button>
              </div>

              {/* Blue — Profile */}
              <div style={{ borderLeft: '4px solid #0097A7', padding: '0.875rem 1rem', background: '#F0F6FF', borderRadius: '0 6px 6px 0' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  Complete your company profile
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6c757d', marginBottom: '0.625rem' }}>
                  Add bank account details to enable faster payments
                </div>
                <Button design="Default" onClick={() => showToast('Profile editor coming in Phase 2')}>
                  Update Profile →
                </Button>
              </div>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0', fontWeight: 700, fontSize: '0.95rem', color: '#354A5F' }}>
              My Recent Purchase Orders
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#354A5F', color: 'white' }}>
                  {['PO Number', 'Order Date', 'Items', 'Value', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '0.6rem 0.875rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...MY_POS].sort((a, b) => b.orderDate.localeCompare(a.orderDate)).map((po, idx) => {
                  const isActionable = po.status === POStatus.SENT || po.status === POStatus.ACKNOWLEDGED;
                  const isConfirmed = po.status === POStatus.CONFIRMED;
                  return (
                    <tr key={po.id} style={{ background: idx % 2 === 0 ? 'white' : '#F7F7F7', borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '0.6rem 0.875rem', fontFamily: 'monospace', fontWeight: 700, color: '#0097A7' }}>{po.poNumber}</td>
                      <td style={{ padding: '0.6rem 0.875rem', whiteSpace: 'nowrap' }}>{fmtDate(po.orderDate)}</td>
                      <td style={{ padding: '0.6rem 0.875rem', textAlign: 'center' }}>{po.lineItems.length}</td>
                      <td style={{ padding: '0.6rem 0.875rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtIDR(po.totalValue)}</td>
                      <td style={{ padding: '0.6rem 0.875rem' }}><StatusPill status={po.status} /></td>
                      <td style={{ padding: '0.6rem 0.875rem' }}>
                        <Button
                          design={isActionable ? 'Emphasized' : 'Default'}
                          style={{ fontSize: '0.75rem' }}
                          onClick={() => showToast(
                            isActionable ? `Opening ${po.poNumber} for confirmation...`
                              : isConfirmed ? `Creating ASN for ${po.poNumber}...`
                              : `Viewing ${po.poNumber}`
                          )}
                        >
                          {isActionable ? 'Confirm' : isConfirmed ? 'Create ASN' : 'View'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT ── Performance + Compliance */}
        <div style={{ flex: '2 1 280px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* My Performance Card */}
          <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#354A5F' }}>My Performance Score</span>
              <div style={{
                width: '42px', height: '42px', borderRadius: '8px', background: gradeColor, color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.3rem', fontWeight: 900,
              }}>{mySupplier.scorecardGrade}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {[
                { label: 'OTIF', value: mySupplier.otif },
                { label: 'Lead Time Adherence', value: mySupplier.leadTimeAdherence },
                { label: 'Invoice Accuracy', value: mySupplier.invoiceAccuracy },
              ].map(({ label, value }) => {
                const c = perfColor(value);
                return (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.8rem', color: '#354A5F' }}>{label}</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: c }}>{value}%</span>
                    </div>
                    <div style={{ height: '7px', background: '#e9ecef', borderRadius: '4px' }}>
                      <div style={{ height: '100%', width: `${value}%`, background: c, borderRadius: '4px' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '1rem', fontSize: '0.72rem', color: '#6c757d', fontStyle: 'italic', borderTop: '1px solid #f0f0f0', paddingTop: '0.75rem' }}>
              Performance reviewed monthly by Paragon procurement team
            </div>
          </div>

          {/* Compliance Documents */}
          <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#354A5F', marginBottom: '1rem' }}>
              My Documents
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {[
                {
                  name: 'Halal Certificate',
                  valid: mySupplier.halalCertified,
                  status: mySupplier.halalCertified ? '✓ Valid' : '✗ Not Certified',
                  expiry: mySupplier.halalCertified ? `Exp: ${fmtDate(mySupplier.certExpiryDate)}` : 'Not registered',
                  color: mySupplier.halalCertified ? '#107E3E' : '#BB0000',
                  action: 'Upload',
                },
                {
                  name: 'BPOM Registration',
                  valid: mySupplier.bpomRegistered,
                  status: mySupplier.bpomRegistered ? '✓ Registered' : '✗ Not Registered',
                  expiry: 'Annual renewal',
                  color: mySupplier.bpomRegistered ? '#107E3E' : '#BB0000',
                  action: 'Apply',
                },
                {
                  name: 'ISO 9001:2015',
                  valid: false,
                  status: '! Expiring soon',
                  expiry: 'Expires in ~45 days',
                  color: '#E9730C',
                  action: 'Renew',
                },
                {
                  name: 'Business License (SIUP)',
                  valid: true,
                  status: '✓ Valid',
                  expiry: 'Exp: 01 Sep 2027',
                  color: '#107E3E',
                  action: 'View',
                },
              ].map((doc, idx, arr) => (
                <div key={doc.name} style={{
                  display: 'flex', alignItems: 'center', gap: '0.625rem',
                  padding: '0.625rem 0',
                  borderBottom: idx < arr.length - 1 ? '1px solid #f0f0f0' : 'none',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#354A5F' }}>{doc.name}</div>
                    <div style={{ fontSize: '0.73rem', color: doc.color, fontWeight: 600 }}>{doc.status}</div>
                    <div style={{ fontSize: '0.7rem', color: '#6c757d' }}>{doc.expiry}</div>
                  </div>
                  <Button design="Transparent" style={{ fontSize: '0.72rem', flexShrink: 0 }}
                    onClick={() => showToast('Document management coming in Phase 2')}>
                    {doc.action}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierDashboard;
