import React, { useState, useMemo } from 'react';
import { Title, Text, Button } from '@ui5/webcomponents-react';
import { mockPurchaseOrders } from '../../data/mockPurchaseOrders';
import { POStatus, ChannelType, PurchaseOrder } from '../../types/purchaseOrder.types';
import StatusBadge from '../../components/shared/StatusBadge';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtIDR(v: number): string {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `Rp ${Math.round(v / 1_000_000)}jT`;
  return `Rp ${v.toLocaleString()}`;
}

function fmtDate(s: string): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const CHANNEL_EMOJI: Record<ChannelType, string> = {
  [ChannelType.WHATSAPP]: '📱',
  [ChannelType.EMAIL]: '📧',
  [ChannelType.WEB]: '🌐',
  [ChannelType.API]: '⚙️',
};

function ackColor(h: number): string {
  if (h === 0) return '#6c757d';
  if (h < 24) return '#107E3E';
  if (h <= 48) return '#E9730C';
  return '#BB0000';
}

function daysOverdueLabel(d: number): { label: string; color: string } {
  if (d < 0) return { label: `▲ ${Math.abs(d)} day${Math.abs(d) !== 1 ? 's' : ''} early`, color: '#107E3E' };
  if (d === 0) return { label: 'On time', color: '#6c757d' };
  return { label: `▼ ${d} day${d !== 1 ? 's' : ''} late`, color: '#BB0000' };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  height: '36px',
  border: '1px solid #c9c9c9',
  borderRadius: '4px',
  padding: '0 0.5rem',
  fontSize: '0.875rem',
  background: 'white',
  color: '#354A5F',
  outline: 'none',
};

const tileStyle: React.CSSProperties = {
  flex: '1 1 160px',
  background: 'white',
  border: '1px solid #e0e0e0',
  borderRadius: '6px',
  padding: '0.875rem 1.125rem',
};

const STATUS_ORDER: POStatus[] = [
  POStatus.SENT,
  POStatus.VIEWED,
  POStatus.ACKNOWLEDGED,
  POStatus.CONFIRMED,
  POStatus.PARTIALLY_DELIVERED,
  POStatus.DELIVERED,
  POStatus.CLOSED,
];

function statusReached(current: POStatus, target: POStatus): boolean {
  return STATUS_ORDER.indexOf(current) >= STATUS_ORDER.indexOf(target);
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

const DetailPanel: React.FC<{
  po: PurchaseOrder;
  onClose: () => void;
  onToast: (msg: string) => void;
}> = ({ po, onClose, onToast }) => {
  const timeline: { icon: string; label: string; date: string }[] = [];

  timeline.push({ icon: '📤', label: `Sent via ${po.channel}`, date: po.orderDate });
  if (statusReached(po.status, POStatus.VIEWED))
    timeline.push({ icon: '👁', label: 'Viewed by supplier', date: po.orderDate });
  if (statusReached(po.status, POStatus.ACKNOWLEDGED))
    timeline.push({ icon: '✅', label: 'Acknowledged', date: po.orderDate });
  if (statusReached(po.status, POStatus.CONFIRMED))
    timeline.push({ icon: '📋', label: 'Confirmed', date: po.confirmedDeliveryDate || po.orderDate });
  if (statusReached(po.status, POStatus.PARTIALLY_DELIVERED))
    timeline.push({ icon: '🚚', label: 'Partially Delivered', date: po.deliveryDate });
  if (statusReached(po.status, POStatus.DELIVERED))
    timeline.push({ icon: '📦', label: 'Delivered', date: po.deliveryDate });

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 200 }}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 0,
          width: '380px',
          background: 'white',
          zIndex: 201,
          overflowY: 'auto',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: '#354A5F',
            color: 'white',
            padding: '1rem 1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: '1rem', fontFamily: 'monospace' }}>
            {po.poNumber}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '1.25rem',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
          {/* Supplier + channel */}
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#354A5F' }}>{po.supplierName}</div>
            <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '0.25rem' }}>
              {CHANNEL_EMOJI[po.channel]} {po.channel}
            </div>
          </div>

          {/* Status */}
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>Status</div>
            <StatusBadge status={po.status.toLowerCase().replace(' ', '_')} />
          </div>

          {/* Dates + value */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {[
              { label: 'Order Date', val: fmtDate(po.orderDate) },
              { label: 'Req. Delivery', val: fmtDate(po.requestedDeliveryDate) },
              { label: 'Conf. Delivery', val: fmtDate(po.confirmedDeliveryDate) },
              { label: 'Total Value', val: fmtIDR(po.totalValue) },
            ].map(({ label, val }) => (
              <div key={label}>
                <div style={{ fontSize: '0.7rem', color: '#6c757d' }}>{label}</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Line items */}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#354A5F', marginBottom: '0.5rem' }}>
              Line Items
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  {['Material', 'Qty', 'UoM', 'Unit Price', 'Conf. Qty'].map((h) => (
                    <th key={h} style={{ padding: '0.35rem 0.4rem', textAlign: 'left', color: '#6c757d', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {po.lineItems.map((li) => (
                  <tr key={li.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '0.35rem 0.4rem', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={li.description}>
                      {li.materialCode}
                    </td>
                    <td style={{ padding: '0.35rem 0.4rem', textAlign: 'right' }}>{li.qty.toLocaleString()}</td>
                    <td style={{ padding: '0.35rem 0.4rem' }}>{li.uom}</td>
                    <td style={{ padding: '0.35rem 0.4rem', textAlign: 'right' }}>{fmtIDR(li.unitPrice)}</td>
                    <td style={{ padding: '0.35rem 0.4rem', textAlign: 'right' }}>{li.confirmedQty.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Timeline */}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#354A5F', marginBottom: '0.5rem' }}>
              Activity Timeline
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {timeline.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.8rem' }}>
                  <span>{t.icon}</span>
                  <div>
                    <div>{t.label}</div>
                    <div style={{ color: '#6c757d', fontSize: '0.7rem' }}>{fmtDate(t.date)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
            <Button design="Emphasized" onClick={() => onToast(`Reminder sent via ${po.channel}`)}>
              Send Reminder
            </Button>
            <Button design="Negative" onClick={() => onToast(`PO ${po.poNumber} marked as Closed`)}>
              Close PO
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const PurchaseOrders: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('All');
  const [channelFilter, setChannelFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // ── Filtering ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockPurchaseOrders.filter((po) => {
      if (statusFilter !== 'All' && po.status !== statusFilter) return false;
      if (channelFilter !== 'All' && po.channel !== channelFilter) return false;
      if (q && !po.poNumber.toLowerCase().includes(q) && !po.supplierName.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [statusFilter, channelFilter, search]);

  // ── Summary tiles ────────────────────────────────────────────────────────────
  const totalValue = useMemo(() => filtered.reduce((s, po) => s + po.totalValue, 0), [filtered]);
  const overdueCount = useMemo(() => filtered.filter((po) => po.daysOverdue > 0).length, [filtered]);
  const avgAck = useMemo(() => {
    const withAck = filtered.filter((po) => po.acknowledgmentTimeHours > 0);
    if (withAck.length === 0) return 0;
    return Math.round(withAck.reduce((s, po) => s + po.acknowledgmentTimeHours, 0) / withAck.length);
  }, [filtered]);
  const unackOver48 = useMemo(
    () => filtered.filter((po) => po.acknowledgmentTimeHours > 48).length,
    [filtered]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
      {/* ── Toast ──────────────────────────────────────────────────────────────── */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: selectedPO ? '400px' : '2rem',
            background: '#354A5F',
            color: 'white',
            padding: '0.75rem 1.25rem',
            borderRadius: '6px',
            zIndex: 300,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            fontSize: '0.875rem',
            maxWidth: '320px',
            transition: 'right 0.2s ease',
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* ── Page header ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <Title level="H2">Purchase Orders</Title>
          <Text style={{ color: '#6c757d', fontSize: '0.875rem' }}>
            {filtered.length} order{filtered.length !== 1 ? 's' : ''}
            {filtered.length < mockPurchaseOrders.length && ` (filtered from ${mockPurchaseOrders.length})`}
          </Text>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button design="Default" icon="excel-attachment" onClick={() => showToast('Export started — file will download shortly')}>
            Export
          </Button>
          <Button design="Emphasized" icon="add" onClick={() => showToast('New PO workflow coming soon')}>
            New PO
          </Button>
        </div>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          background: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '6px',
          padding: '0.75rem 1rem',
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#6c757d', fontWeight: 600 }}>STATUS</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
            <option value="All">All Statuses</option>
            {Object.values(POStatus).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#6c757d', fontWeight: 600 }}>CHANNEL</span>
          <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)} style={inputStyle}>
            <option value="All">All Channels</option>
            {Object.values(ChannelType).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1, minWidth: '200px' }}>
          <span style={{ fontSize: '0.7rem', color: '#6c757d', fontWeight: 600 }}>SEARCH</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by PO number or supplier..."
            style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
          />
        </label>

        {(statusFilter !== 'All' || channelFilter !== 'All' || search) && (
          <button
            onClick={() => { setStatusFilter('All'); setChannelFilter('All'); setSearch(''); }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#0097A7',
              cursor: 'pointer',
              fontSize: '0.875rem',
              padding: '0.25rem',
              alignSelf: 'flex-end',
              marginBottom: '2px',
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* ── Summary tiles ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={tileStyle}>
          <div style={{ fontSize: '0.7rem', color: '#6c757d', fontWeight: 600, textTransform: 'uppercase' }}>Total Value</div>
          <div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#354A5F', marginTop: '0.25rem' }}>
            {fmtIDR(totalValue)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>{filtered.length} orders</div>
        </div>

        <div style={tileStyle}>
          <div style={{ fontSize: '0.7rem', color: '#6c757d', fontWeight: 600, textTransform: 'uppercase' }}>Overdue</div>
          <div style={{ fontSize: '1.375rem', fontWeight: 700, color: overdueCount > 0 ? '#BB0000' : '#107E3E', marginTop: '0.25rem' }}>
            {overdueCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>past requested delivery</div>
        </div>

        <div style={tileStyle}>
          <div style={{ fontSize: '0.7rem', color: '#6c757d', fontWeight: 600, textTransform: 'uppercase' }}>Avg Ack Time</div>
          <div style={{ fontSize: '1.375rem', fontWeight: 700, color: ackColor(avgAck), marginTop: '0.25rem' }}>
            {avgAck}h
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>target: &lt;24h</div>
        </div>

        <div style={tileStyle}>
          <div style={{ fontSize: '0.7rem', color: '#6c757d', fontWeight: 600, textTransform: 'uppercase' }}>Unack &gt;48h</div>
          <div style={{ fontSize: '1.375rem', fontWeight: 700, color: unackOver48 > 0 ? '#BB0000' : '#107E3E', marginTop: '0.25rem' }}>
            {unackOver48}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>need immediate action</div>
        </div>
      </div>

      {/* ── Main table ─────────────────────────────────────────────────────────── */}
      <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '6px', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', minWidth: '900px' }}>
          <thead>
            <tr style={{ background: '#354A5F', color: 'white' }}>
              {['PO Number', 'Supplier', 'Order Date', 'Req. Delivery', 'Value', 'Status', 'Ack Time', 'Days', 'Actions'].map((h) => (
                <th key={h} style={{ padding: '0.625rem 0.75rem', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
                  No purchase orders match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((po, idx) => {
                const isHovered = hoveredRow === po.id;
                const overdueInfo = daysOverdueLabel(po.daysOverdue);
                const rowBg = isHovered ? '#E6F3FF' : idx % 2 === 0 ? 'white' : '#F7F7F7';
                return (
                  <tr
                    key={po.id}
                    style={{ background: rowBg, cursor: 'default', transition: 'background 0.1s' }}
                    onMouseEnter={() => setHoveredRow(po.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    {/* PO Number */}
                    <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace', fontWeight: 700, color: '#0097A7', whiteSpace: 'nowrap' }}>
                      {po.poNumber}
                    </td>
                    {/* Supplier + channel */}
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <div>{po.supplierName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                        {CHANNEL_EMOJI[po.channel]} {po.channel}
                      </div>
                    </td>
                    {/* Order Date */}
                    <td style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap' }}>{fmtDate(po.orderDate)}</td>
                    {/* Req. Delivery */}
                    <td style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap' }}>{fmtDate(po.requestedDeliveryDate)}</td>
                    {/* Value */}
                    <td style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {fmtIDR(po.totalValue)}
                    </td>
                    {/* Status */}
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <StatusBadge status={po.status.toLowerCase().replace(' ', '_')} />
                    </td>
                    {/* Ack Time */}
                    <td style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap', fontWeight: 600, color: ackColor(po.acknowledgmentTimeHours) }}>
                      {po.acknowledgmentTimeHours === 0 ? '—' : `${po.acknowledgmentTimeHours}h`}
                    </td>
                    {/* Days overdue */}
                    <td style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap', color: overdueInfo.color, fontWeight: 600, fontSize: '0.75rem' }}>
                      {overdueInfo.label}
                    </td>
                    {/* Actions */}
                    <td style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <Button
                          design="Transparent"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          onClick={() => setSelectedPO(po)}
                        >
                          View
                        </Button>
                        <Button
                          design="Default"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          onClick={() => showToast(`Reminder sent via ${po.channel} to ${po.supplierName}`)}
                        >
                          Remind
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Detail panel ───────────────────────────────────────────────────────── */}
      {selectedPO && (
        <DetailPanel
          po={selectedPO}
          onClose={() => setSelectedPO(null)}
          onToast={showToast}
        />
      )}
    </div>
  );
};

export default PurchaseOrders;
