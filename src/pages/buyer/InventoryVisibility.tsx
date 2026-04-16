import React, { useState, useMemo } from 'react';
import { Title, Text, Button, MessageStrip } from '@ui5/webcomponents-react';
import { mockInventory } from '../../data/mockInventory';
import { mockSuppliers } from '../../data/mockSuppliers';
import { StockStatus } from '../../types/supplier.types';

// ─── Colour maps ──────────────────────────────────────────────────────────────

const STATUS_ROW_BG: Record<StockStatus, string> = {
  [StockStatus.CRITICAL]: '#FFEBEE',
  [StockStatus.LOW]: '#FFF3E0',
  [StockStatus.NORMAL]: 'transparent',
  [StockStatus.EXCESS]: 'transparent',
};

const STATUS_CELL_COLOR: Record<StockStatus, string> = {
  [StockStatus.CRITICAL]: '#BB0000',
  [StockStatus.LOW]: '#E9730C',
  [StockStatus.NORMAL]: '#107E3E',
  [StockStatus.EXCESS]: '#0097A7',
};

const STATUS_TILE_BG: Record<StockStatus, string> = {
  [StockStatus.CRITICAL]: '#FFEBEE',
  [StockStatus.LOW]: '#FFF3E0',
  [StockStatus.NORMAL]: '#E8F5E9',
  [StockStatus.EXCESS]: '#E3F2FD',
};

const HEATMAP_CELL_BG: Record<string, string> = {
  [StockStatus.CRITICAL]: '#BB0000',
  [StockStatus.LOW]: '#E9730C',
  [StockStatus.NORMAL]: '#107E3E',
  [StockStatus.EXCESS]: '#0097A7',
  'No Data': '#E2E8F0',
};

const SOURCE_CHIPS: Record<string, { bg: string; color: string }> = {
  'API Push': { bg: '#E0F7FA', color: '#0097A7' },
  'Manual':   { bg: '#F8FAFC', color: '#64748B' },
  'EDI 846':  { bg: '#F1F5F9', color: '#354A5F' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dosColor(days: number): string {
  if (days < 7) return '#BB0000';
  if (days < 14) return '#E9730C';
  if (days <= 30) return '#107E3E';
  return '#0097A7';
}

function fmtDate(s: string): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTs(d: Date): string {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

const Heatmap: React.FC = () => {
  const materials = useMemo(() => {
    const seen = new Set<string>();
    const list: { code: string; desc: string }[] = [];
    for (const inv of mockInventory) {
      if (!seen.has(inv.materialCode)) {
        seen.add(inv.materialCode);
        list.push({ code: inv.materialCode, desc: inv.materialDescription });
      }
      if (list.length >= 8) break;
    }
    return list;
  }, []);

  const suppliers = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; name: string; short: string }[] = [];
    for (const inv of mockInventory) {
      if (!seen.has(inv.supplierId)) {
        seen.add(inv.supplierId);
        const short = inv.supplierName.replace(/^PT /, '').split(' ').slice(0, 2).join(' ');
        list.push({ id: inv.supplierId, name: inv.supplierName, short });
      }
      if (list.length >= 6) break;
    }
    return list;
  }, []);

  const lookup = useMemo(() => {
    const map = new Map<string, typeof mockInventory[0]>();
    for (const inv of mockInventory) {
      map.set(`${inv.materialCode}|${inv.supplierId}`, inv);
    }
    return map;
  }, []);

  return (
    <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px' }}>
      <div style={{ fontWeight: 700, fontSize: '14px', color: '#354A5F', marginBottom: '1rem' }}>
        Stock Status Heatmap — Materials × Suppliers
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: '4px' }}>
          <thead>
            <tr>
              <th style={{ fontSize: '11px', color: '#6c757d', textAlign: 'left', paddingRight: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', minWidth: '120px' }}>
                Material
              </th>
              {suppliers.map(sup => (
                <th key={sup.id} style={{ fontSize: '11px', color: '#354A5F', fontWeight: 600, textAlign: 'center', width: '80px', whiteSpace: 'nowrap' }}>
                  {sup.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {materials.map(mat => (
              <tr key={mat.code}>
                <td style={{ fontSize: '11px', color: '#354A5F', paddingRight: '0.75rem', whiteSpace: 'nowrap', fontFamily: 'monospace', verticalAlign: 'middle' }}>
                  {mat.code}
                </td>
                {suppliers.map(sup => {
                  const rec = lookup.get(`${mat.code}|${sup.id}`);
                  const bg = rec ? HEATMAP_CELL_BG[rec.stockStatus] : HEATMAP_CELL_BG['No Data'];
                  const textColor = rec ? 'white' : '#9e9e9e';
                  const tipText = rec
                    ? `Material: ${mat.code} | Supplier: ${sup.name} | DOS: ${rec.daysOfSupply} days | Status: ${rec.stockStatus}`
                    : `Material: ${mat.code} | Supplier: ${sup.name} | No Data`;
                  return (
                    <td key={sup.id} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <div
                        title={tipText}
                        style={{
                          width: '64px', height: '40px', borderRadius: '6px', background: bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 700, color: textColor,
                          cursor: rec ? 'help' : 'default',
                          margin: '0 auto',
                        }}
                      >
                        {rec ? `${rec.daysOfSupply}d` : '—'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Critical', color: HEATMAP_CELL_BG[StockStatus.CRITICAL] },
          { label: 'Low', color: HEATMAP_CELL_BG[StockStatus.LOW] },
          { label: 'Normal', color: HEATMAP_CELL_BG[StockStatus.NORMAL] },
          { label: 'Excess', color: HEATMAP_CELL_BG[StockStatus.EXCESS] },
          { label: 'No Data', color: HEATMAP_CELL_BG['No Data'] },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#6c757d' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const InventoryVisibility: React.FC = () => {
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const supplierChannelMap = useMemo(
    () => Object.fromEntries(mockSuppliers.map(s => [s.id, s.preferredChannel])),
    []
  );

  const supplierCertMap = useMemo(() => {
    return Object.fromEntries(mockSuppliers.map(s => {
      const days = (new Date(s.certExpiryDate).getTime() - Date.now()) / 86400000;
      const status = days <= 0 ? 'expired' : days <= 90 ? 'expiring' : 'valid';
      return [s.id, { status, expiryDate: s.certExpiryDate }];
    }));
  }, []);

  const criticalCount = useMemo(() => mockInventory.filter(i => i.stockStatus === StockStatus.CRITICAL).length, []);
  const lowCount = useMemo(() => mockInventory.filter(i => i.stockStatus === StockStatus.LOW).length, []);
  const normalCount = useMemo(() => mockInventory.filter(i => i.stockStatus === StockStatus.NORMAL).length, []);
  const excessCount = useMemo(() => mockInventory.filter(i => i.stockStatus === StockStatus.EXCESS).length, []);

  const tileSummary = [
    { label: 'Critical', sub: '< 7 days', count: criticalCount, status: StockStatus.CRITICAL },
    { label: 'Low', sub: '7–14 days', count: lowCount, status: StockStatus.LOW },
    { label: 'Normal', sub: '14–30 days', count: normalCount, status: StockStatus.NORMAL },
    { label: 'Excess', sub: '> 30 days', count: excessCount, status: StockStatus.EXCESS },
  ];

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <Title level="H2">Inventory Visibility</Title>
          <Text style={{ color: '#6c757d', fontSize: '13px', display: 'block', marginBottom: 2 }}>
            RM/PM stock levels · Days of supply · Supplier coverage · Critical alerts
          </Text>
          <Text style={{ color: '#6c757d', fontSize: '13px' }}>
            Last updated: {fmtDate(lastRefreshed.toISOString().slice(0, 10))} {fmtTs(lastRefreshed)}
          </Text>
        </div>
        <Button design="Default" icon="refresh" onClick={() => {
          setLastRefreshed(new Date());
          showToast('Inventory data refreshed');
        }}>
          Refresh
        </Button>
      </div>

      {/* Alert bar */}
      {criticalCount > 0 && (
        <MessageStrip design="Negative" hideCloseButton>
          {criticalCount} material{criticalCount !== 1 ? 's' : ''} at CRITICAL stock level — immediate procurement action required
        </MessageStrip>
      )}

      {/* Stock status tiles */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {tileSummary.map(({ label, sub, count, status }) => (
          <div key={label} style={{
            flex: '1 1 140px', borderRadius: '8px', padding: '16px 20px',
            background: 'white', border: `1px solid #E2E8F0`,
            borderLeft: `4px solid ${STATUS_CELL_COLOR[status]}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: STATUS_CELL_COLOR[status], margin: '0.2rem 0' }}>{count}</div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Inventory table */}
      <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '1100px' }}>
          <thead>
            <tr style={{ background: '#354A5F', color: 'white' }}>
              {['Material Code', 'Description', 'Supplier', 'Location', 'Qty Available', 'UoM', 'Days of Supply', 'Avg Daily Demand', 'Status', 'Last Updated', 'Source', 'Actions'].map(h => (
                <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap', fontSize: '12px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockInventory.map((inv, idx) => {
              const rowBg = hoveredRow === inv.id ? '#E6F3FF' : STATUS_ROW_BG[inv.stockStatus] || (idx % 2 === 0 ? 'white' : '#F7F7F7');
              const chip = SOURCE_CHIPS[inv.dataSource] ?? { bg: '#f5f5f5', color: '#6c757d' };
              const channel = supplierChannelMap[inv.supplierId] ?? 'WhatsApp';
              return (
                <tr key={inv.id} style={{ background: rowBg, transition: 'background 0.1s' }}
                  onMouseEnter={() => setHoveredRow(inv.id)}
                  onMouseLeave={() => setHoveredRow(null)}>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#0097A7', whiteSpace: 'nowrap' }}>{inv.materialCode}</td>
                  <td style={{ padding: '8px 12px', maxWidth: '200px' }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={inv.materialDescription}>{inv.materialDescription}</div>
                  </td>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', color: '#354A5F' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>{inv.supplierName}</span>
                      {supplierCertMap[inv.supplierId]?.status === 'expired' && (
                        <span title={`Cert EXPIRED — ${supplierCertMap[inv.supplierId].expiryDate}`}
                          style={{ background: '#FEE2E2', color: '#BB0000', borderRadius: 9999, padding: '1px 6px', fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          CERT EXPIRED
                        </span>
                      )}
                      {supplierCertMap[inv.supplierId]?.status === 'expiring' && (
                        <span title={`Cert expiring — ${supplierCertMap[inv.supplierId].expiryDate}`}
                          style={{ background: '#FEF3C7', color: '#E9730C', borderRadius: 9999, padding: '1px 6px', fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          EXPIRING
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', color: '#6c757d' }}>{inv.location}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{inv.qtyAvailable.toLocaleString()}</td>
                  <td style={{ padding: '8px 12px', color: '#6c757d' }}>{inv.uom}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: dosColor(inv.daysOfSupply) }}>{inv.daysOfSupply}d</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#6c757d' }}>{inv.avgDailyDemand.toLocaleString()}/{inv.uom}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      background: STATUS_TILE_BG[inv.stockStatus], color: STATUS_CELL_COLOR[inv.stockStatus],
                      fontWeight: 700, fontSize: '11px', padding: '3px 10px', borderRadius: '12px',
                      border: `1px solid ${STATUS_CELL_COLOR[inv.stockStatus]}44`,
                    }}>{inv.stockStatus}</span>
                  </td>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', color: '#6c757d' }}>{fmtDate(inv.lastUpdated)}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      background: chip.bg, color: chip.color, fontWeight: 600,
                      fontSize: '11px', padding: '3px 9px', borderRadius: '12px',
                      whiteSpace: 'nowrap',
                    }}>{inv.dataSource}</span>
                  </td>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {(inv.stockStatus === StockStatus.CRITICAL || inv.stockStatus === StockStatus.LOW) && (
                      <Button design="Emphasized" style={{ fontSize: '12px', padding: '0.2rem 0.5rem', background: '#BB0000', border: 'none' }}
                        onClick={() => showToast(`Creating PO for ${inv.materialCode} — ${inv.supplierName} · ${inv.daysOfSupply}d supply remaining`)}>
                        + Create PO
                      </Button>
                    )}
                    <Button design="Default" style={{ fontSize: '12px', padding: '0.2rem 0.5rem' }}
                      onClick={() => showToast(`Update request sent to ${inv.supplierName} via ${channel}`)}>
                      Request Update
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Heatmap */}
      <Heatmap />
    </div>
  );
};

export default InventoryVisibility;
