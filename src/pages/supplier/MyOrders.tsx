import React, { useState, useMemo } from 'react';
import { Title, Button } from '@ui5/webcomponents-react';
import { mockPurchaseOrders } from '../../data/mockPurchaseOrders';
import { POStatus, PurchaseOrder } from '../../types/purchaseOrder.types';

// ─── Supplier context ─────────────────────────────────────────────────────────

const SUPPLIER_ID = 'sup-007';
const MY_POS = mockPurchaseOrders
  .filter(po => po.supplierId === SUPPLIER_ID)
  .sort((a, b) => b.orderDate.localeCompare(a.orderDate));

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
    <span style={{ background: bg, color, fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '12px', whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
}

type TabKey = 'all' | 'action' | 'progress' | 'completed';

function filterByTab(tab: TabKey, pos: PurchaseOrder[]): PurchaseOrder[] {
  switch (tab) {
    case 'action': return pos.filter(po => po.status === POStatus.SENT || po.status === POStatus.ACKNOWLEDGED);
    case 'progress': return pos.filter(po => po.status === POStatus.CONFIRMED || po.status === POStatus.PARTIALLY_DELIVERED);
    case 'completed': return pos.filter(po => po.status === POStatus.DELIVERED || po.status === POStatus.CLOSED);
    default: return pos;
  }
}

// ─── Confirm Panel ────────────────────────────────────────────────────────────

interface ConfirmPanelProps {
  po: PurchaseOrder;
  onToast: (msg: string) => void;
  onClose: () => void;
}

const ConfirmPanel: React.FC<ConfirmPanelProps> = ({ po, onToast, onClose }) => {
  const [qtys, setQtys] = useState<number[]>(po.lineItems.map(li => li.qty));
  const [deliveryDate, setDeliveryDate] = useState(po.requestedDeliveryDate);
  const [notes, setNotes] = useState('');
  const [showChangeReq, setShowChangeReq] = useState(false);
  const [changeText, setChangeText] = useState('');

  const inputStyle: React.CSSProperties = {
    border: '1px solid #C9C9C9', borderRadius: '4px', padding: '0.375rem 0.5rem',
    fontSize: '13px', background: 'white', width: '100%', boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ padding: '20px', background: '#F8F9FA', borderTop: '2px solid #0097A7' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontWeight: 700, fontSize: '14px', color: '#354A5F' }}>
          Confirm PO: {po.poNumber}
        </span>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6c757d', fontSize: '1.1rem' }}>✕</button>
      </div>

      {/* Line items */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#6c757d', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
          Line Items — Confirmed Quantities
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#eaecef' }}>
              {['Material Code', 'Description', 'Ordered Qty', 'UoM', 'Confirmed Qty'].map(h => (
                <th key={h} style={{ padding: '0.4rem 0.6rem', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: '#354A5F', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {po.lineItems.map((li, idx) => (
              <tr key={li.id} style={{ borderBottom: '1px solid #dee2e6', background: 'white' }}>
                <td style={{ padding: '0.4rem 0.6rem', fontFamily: 'monospace', fontSize: '12px', color: '#0097A7' }}>{li.materialCode}</td>
                <td style={{ padding: '0.4rem 0.6rem', color: '#354A5F' }}>{li.description}</td>
                <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 600 }}>{li.qty.toLocaleString()}</td>
                <td style={{ padding: '0.4rem 0.6rem', color: '#6c757d' }}>{li.uom}</td>
                <td style={{ padding: '0.4rem 0.6rem' }}>
                  <input
                    type="number"
                    value={qtys[idx]}
                    min={0}
                    max={li.qty}
                    onChange={e => {
                      const updated = [...qtys];
                      updated[idx] = Number(e.target.value);
                      setQtys(updated);
                    }}
                    style={{ ...inputStyle, width: '100px', textAlign: 'right' }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delivery date + notes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginBottom: '1rem' }}>
        <label>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#6c757d', marginBottom: '0.25rem' }}>Confirmed Delivery Date</div>
          <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} style={inputStyle} />
        </label>
        <label>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#6c757d', marginBottom: '0.25rem' }}>Notes for Paragon team</div>
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add notes for Paragon procurement team..."
            style={inputStyle}
          />
        </label>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
        <Button design="Emphasized" onClick={() => {
          onToast(`PO ${po.poNumber} confirmed successfully! Paragon team will be notified.`);
          onClose();
        }}>
          ✓ Confirm Order
        </Button>
        <Button design="Default" onClick={() => setShowChangeReq(v => !v)}>
           Request Change
        </Button>
      </div>

      {/* Change request panel */}
      {showChangeReq && (
        <div style={{ marginTop: '0.875rem', padding: '14px', background: '#FFF8E1', border: '1px solid #FFE082', borderRadius: '6px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#E9730C', marginBottom: '0.5rem' }}>
            Describe the change needed
          </div>
          <textarea
            value={changeText}
            onChange={e => setChangeText(e.target.value)}
            placeholder="Describe the change needed (e.g. reduced quantity, alternative delivery date)..."
            rows={3}
            style={{ ...inputStyle, height: 'auto', resize: 'vertical', padding: '8px' }}
          />
          <div style={{ marginTop: '0.5rem' }}>
            <Button design="Default" onClick={() => {
              onToast(`Change request for ${po.poNumber} submitted. Paragon team will review.`);
              onClose();
            }}>
              Submit Change Request
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const MyOrders: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [expandedPO, setExpandedPO] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3500); };

  const needsActionCount = useMemo(() => MY_POS.filter(po => po.status === POStatus.SENT || po.status === POStatus.ACKNOWLEDGED).length, []);
  const inProgressCount = useMemo(() => MY_POS.filter(po => po.status === POStatus.CONFIRMED || po.status === POStatus.PARTIALLY_DELIVERED).length, []);
  const completedCount = useMemo(() => MY_POS.filter(po => po.status === POStatus.DELIVERED || po.status === POStatus.CLOSED).length, []);

  const displayPOs = useMemo(() => filterByTab(activeTab, MY_POS), [activeTab]);

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'all', label: 'All Orders', count: MY_POS.length },
    { key: 'action', label: 'Needs Action', count: needsActionCount },
    { key: 'progress', label: 'In Progress', count: inProgressCount },
    { key: 'completed', label: 'Completed', count: completedCount },
  ];

  const handleRowAction = (po: PurchaseOrder) => {
    if (po.status === POStatus.SENT || po.status === POStatus.ACKNOWLEDGED) {
      setExpandedPO(prev => prev === po.id ? null : po.id);
    } else if (po.status === POStatus.CONFIRMED) {
      showToast(`Creating ASN for ${po.poNumber}...`);
    } else {
      showToast(`Viewing ${po.poNumber}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', background: '#354A5F', color: 'white',
          padding: '12px 20px', borderRadius: '6px', zIndex: 500,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)', fontSize: '13px', maxWidth: '360px',
        }}>{toastMsg}</div>
      )}

      {/* Header */}
      <div>
        <Title level="H2">My Orders</Title>
        <div style={{ fontSize: '13px', color: '#6c757d' }}>PT Berlina Packaging Indonesia</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #e0e0e0', flexWrap: 'wrap' }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          const hasAlert = tab.key === 'action' && tab.count > 0;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setExpandedPO(null); }}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid #0097A7' : '3px solid transparent',
                padding: '0.625rem 1.25rem',
                cursor: 'pointer',
                fontWeight: isActive ? 700 : 400,
                color: isActive ? '#0097A7' : '#6c757d',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                marginBottom: '-2px',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
              <span style={{
                background: hasAlert ? '#BB0000' : isActive ? '#0097A7' : '#dee2e6',
                color: (hasAlert || isActive) ? 'white' : '#6c757d',
                fontSize: '11px', fontWeight: 700,
                padding: '0.1rem 0.45rem', borderRadius: '10px', minWidth: '18px', textAlign: 'center',
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'auto' }}>
        {displayPOs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6c757d' }}>
            No orders in this category.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '700px' }}>
            <thead>
              <tr style={{ background: '#354A5F', color: 'white' }}>
                {['PO Number', 'Order Date', 'Req. Delivery', 'Items', 'Value', 'Status', 'Action'].map(h => (
                  <th key={h} style={{ padding: '0.6rem 0.875rem', textAlign: 'left', fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayPOs.map((po, idx) => {
                const isConfirmable = po.status === POStatus.SENT || po.status === POStatus.ACKNOWLEDGED;
                const isExpanded = expandedPO === po.id;
                const rowBg = hoveredRow === po.id && !isExpanded ? '#E6F3FF' : idx % 2 === 0 ? 'white' : '#F7F7F7';

                return (
                  <React.Fragment key={po.id}>
                    <tr
                      style={{ background: rowBg, transition: 'background 0.1s', borderBottom: isExpanded ? 'none' : '1px solid #f0f0f0' }}
                      onMouseEnter={() => setHoveredRow(po.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td style={{ padding: '0.6rem 0.875rem', fontFamily: 'monospace', fontWeight: 700, color: '#0097A7' }}>{po.poNumber}</td>
                      <td style={{ padding: '0.6rem 0.875rem', whiteSpace: 'nowrap' }}>{fmtDate(po.orderDate)}</td>
                      <td style={{ padding: '0.6rem 0.875rem', whiteSpace: 'nowrap' }}>{fmtDate(po.requestedDeliveryDate)}</td>
                      <td style={{ padding: '0.6rem 0.875rem', textAlign: 'center' }}>{po.lineItems.length}</td>
                      <td style={{ padding: '0.6rem 0.875rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtIDR(po.totalValue)}</td>
                      <td style={{ padding: '0.6rem 0.875rem' }}><StatusPill status={po.status} /></td>
                      <td style={{ padding: '0.6rem 0.875rem', whiteSpace: 'nowrap' }}>
                        <Button
                          design={isConfirmable ? 'Emphasized' : 'Default'}
                          style={{ fontSize: '12px' }}
                          onClick={() => handleRowAction(po)}
                        >
                          {isConfirmable ? (isExpanded ? '▲ Cancel' : '✓ Confirm') : po.status === POStatus.CONFIRMED ? 'Create ASN' : 'View'}
                        </Button>
                      </td>
                    </tr>

                    {/* Inline confirm panel */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} style={{ padding: 0, borderBottom: '1px solid #dee2e6' }}>
                          <ConfirmPanel
                            po={po}
                            onToast={showToast}
                            onClose={() => setExpandedPO(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
