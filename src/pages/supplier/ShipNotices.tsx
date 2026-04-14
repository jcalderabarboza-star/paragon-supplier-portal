import React, { useState, useMemo } from 'react';
import { mockPurchaseOrders } from '../../data/mockPurchaseOrders';
import { POStatus } from '../../types/purchaseOrder.types';

// ─── Design tokens ────────────────────────────────────────────────────────────

const NAVY = '#0D1B2A';
const TEAL = '#0097A7';
const BORDER = '#E2E8F0';
const SUCCESS = '#107E3E';
const WARNING = '#E9730C';
const ERROR = '#BB0000';
const MUTED = '#64748B';
const SUBTLE_BG = '#F8FAFC';

const SUPPLIER_ID = 'sup-007';

// ─── ASN types ────────────────────────────────────────────────────────────────

type AsnStatus = 'Draft' | 'Submitted' | 'In Transit' | 'Delivered' | 'Discrepancy';

interface AsnLineItem {
  materialCode: string;
  description: string;
  orderedQty: number;
  shippedQty: number;
  lotNumber: string;
}

interface AsnShipmentDetails {
  originCity: string;
  destinationWarehouse: string;
  totalCartons: number;
  grossWeightKg: number;
  temperatureRequirement: string;
}

interface Asn {
  asnNumber: string;
  poReference: string;
  status: AsnStatus;
  carrier: string;
  trackingNumber: string;
  eta: string;
  details: AsnShipmentDetails;
  lineItems: AsnLineItem[];
}

// ─── Mock ASN records (inline, as requested) ─────────────────────────────────

const MOCK_ASNS: Asn[] = [
  {
    asnNumber: 'ASN-2025-00211',
    poReference: 'PO-2025-00112',
    status: 'In Transit',
    carrier: 'JNE Express Cargo',
    trackingNumber: 'JNE-TRK-882941-X',
    eta: '2025-04-02',
    details: {
      originCity: 'Surabaya, ID',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 312,
      grossWeightKg: 4280,
      temperatureRequirement: 'Ambient (15–25°C)',
    },
    lineItems: [
      { materialCode: 'MAT-88201', description: 'Fragrance concentrate – Rose Oud', orderedQty: 1200, shippedQty: 1200, lotNumber: 'LOT-A4481' },
      { materialCode: 'MAT-88207', description: 'PET bottle 50ml – clear', orderedQty: 15000, shippedQty: 14820, lotNumber: 'LOT-A4482' },
    ],
  },
  {
    asnNumber: 'ASN-2025-00198',
    poReference: 'PO-2025-00107',
    status: 'Delivered',
    carrier: 'Pos Logistik Indonesia',
    trackingNumber: 'PLI-7723-BC-4401',
    eta: '2025-03-22',
    details: {
      originCity: 'Bandung, ID',
      destinationWarehouse: 'Paragon DC Karawang (WH-02)',
      totalCartons: 188,
      grossWeightKg: 2610,
      temperatureRequirement: 'Ambient (15–25°C)',
    },
    lineItems: [
      { materialCode: 'MAT-77014', description: 'Aluminium closure 24/410', orderedQty: 48000, shippedQty: 48000, lotNumber: 'LOT-C9911' },
    ],
  },
  {
    asnNumber: 'ASN-2025-00201',
    poReference: 'PO-2025-00109',
    status: 'Discrepancy',
    carrier: 'SiCepat Cargo',
    trackingNumber: 'SCP-X-119843-JKT',
    eta: '2025-03-27',
    details: {
      originCity: 'Jakarta, ID',
      destinationWarehouse: 'Paragon DC Cibitung (WH-01)',
      totalCartons: 94,
      grossWeightKg: 1340,
      temperatureRequirement: 'Cool chain (2–8°C)',
    },
    lineItems: [
      { materialCode: 'MAT-55022', description: 'Active emulsion – Niacinamide 5%', orderedQty: 800, shippedQty: 720, lotNumber: 'LOT-E2203' },
      { materialCode: 'MAT-55031', description: 'Active emulsion – Hyaluronic 2%', orderedQty: 600, shippedQty: 540, lotNumber: 'LOT-E2204' },
    ],
  },
  {
    asnNumber: 'ASN-2025-00215',
    poReference: 'PO-2025-00115',
    status: 'Draft',
    carrier: '—',
    trackingNumber: '—',
    eta: '',
    details: {
      originCity: '—',
      destinationWarehouse: '—',
      totalCartons: 0,
      grossWeightKg: 0,
      temperatureRequirement: '—',
    },
    lineItems: [],
  },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function fmtDate(s: string): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_COLOR: Record<AsnStatus, string> = {
  Draft: MUTED,
  Submitted: '#2563EB',
  'In Transit': WARNING,
  Delivered: SUCCESS,
  Discrepancy: ERROR,
};

const STATUS_BG: Record<AsnStatus, string> = {
  Draft: '#E2E8F0',
  Submitted: '#DBEAFE',
  'In Transit': '#FEF3C7',
  Delivered: '#DCFCE7',
  Discrepancy: '#FEE2E2',
};

// ─── Component ────────────────────────────────────────────────────────────────

const ShipNotices: React.FC = () => {
  const [toast, setToast] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AsnStatus | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleExpanded = (asnNumber: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(asnNumber)) next.delete(asnNumber);
      else next.add(asnNumber);
      return next;
    });
  };

  // KPI counts
  const counts = useMemo(() => {
    const base: Record<AsnStatus, number> = {
      Draft: 0,
      Submitted: 0,
      'In Transit': 0,
      Delivered: 0,
      Discrepancy: 0,
    };
    for (const a of MOCK_ASNS) base[a.status]++;
    return base;
  }, []);

  const filteredAsns = useMemo(
    () => (statusFilter ? MOCK_ASNS.filter(a => a.status === statusFilter) : MOCK_ASNS),
    [statusFilter]
  );

  // Pending POs: confirmed supplier POs with no ASN
  const pendingPOs = useMemo(() => {
    const asnPoRefs = new Set(MOCK_ASNS.map(a => a.poReference));
    return mockPurchaseOrders.filter(
      po => po.supplierId === SUPPLIER_ID
        && po.status === POStatus.CONFIRMED
        && !asnPoRefs.has(po.poNumber)
    );
  }, []);

  const kpiCards: { label: AsnStatus; color: string }[] = [
    { label: 'Draft', color: MUTED },
    { label: 'Submitted', color: '#2563EB' },
    { label: 'In Transit', color: WARNING },
    { label: 'Delivered', color: SUCCESS },
    { label: 'Discrepancy', color: ERROR },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            background: NAVY,
            color: 'white',
            padding: '12px 20px',
            borderRadius: '6px',
            zIndex: 500,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            fontSize: '13px',
          }}
        >
          {toast}
        </div>
      )}

      {/* 1. HEADER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: NAVY, marginBottom: '4px' }}>
            Shipments &amp; ASN
          </div>
          <div style={{ fontSize: '13px', color: MUTED }}>
            Advance Ship Notices · Paragon WMS integration · EDI 856 format
          </div>
        </div>
        <button
          onClick={() => showToast('EDI 856 export generated (mock)')}
          style={{
            background: NAVY,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Export EDI 856
        </button>
      </div>

      {/* 2. KPI CARDS ROW */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '12px',
        }}
      >
        {kpiCards.map(card => {
          const active = statusFilter === card.label;
          return (
            <button
              key={card.label}
              onClick={() => setStatusFilter(active ? null : card.label)}
              style={{
                background: 'white',
                border: `1px solid ${active ? card.color : BORDER}`,
                borderLeft: `4px solid ${card.color}`,
                borderRadius: '8px',
                padding: '14px 16px',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: active ? `0 0 0 2px ${card.color}22` : 'none',
                transition: 'box-shadow 120ms ease',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: MUTED,
                  marginBottom: '6px',
                  fontWeight: 600,
                }}
              >
                {card.label}
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: card.color }}>
                {counts[card.label]}
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. PENDING POs ALERT */}
      {pendingPOs.length > 0 && (
        <div
          style={{
            background: '#FEF3C7',
            border: `1px solid ${WARNING}`,
            borderRadius: '8px',
            padding: '14px 16px',
          }}
        >
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: NAVY,
              marginBottom: '10px',
            }}
          >
            {pendingPOs.length} confirmed purchase order{pendingPOs.length === 1 ? '' : 's'} awaiting ASN
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {pendingPOs.map(po => {
              const first = po.lineItems[0];
              return (
                <div
                  key={po.id}
                  style={{
                    background: 'white',
                    border: `1px solid ${BORDER}`,
                    borderRadius: '6px',
                    padding: '10px 12px',
                    display: 'grid',
                    gridTemplateColumns: '140px 1fr 160px 120px',
                    gap: '12px',
                    alignItems: 'center',
                    fontSize: '13px',
                  }}
                >
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: TEAL }}>
                    {po.poNumber}
                  </span>
                  <span
                    style={{
                      color: '#354A5F',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={first?.description ?? '—'}
                  >
                    {first?.description ?? '—'}
                  </span>
                  <span style={{ color: MUTED, whiteSpace: 'nowrap' }}>
                    Req. {fmtDate(po.requestedDeliveryDate)}
                  </span>
                  <button
                    onClick={() => showToast(`Create ASN for ${po.poNumber} (mock)`)}
                    style={{
                      background: TEAL,
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Create ASN
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. ASN TABLE */}
      <div
        style={{
          background: 'white',
          border: `1px solid ${BORDER}`,
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${BORDER}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 600, color: NAVY }}>
            Advance Ship Notices
            {statusFilter && (
              <span style={{ color: MUTED, fontWeight: 400, marginLeft: '8px', fontSize: '12px' }}>
                · filtered by {statusFilter}
              </span>
            )}
          </div>
          {statusFilter && (
            <button
              onClick={() => setStatusFilter(null)}
              style={{
                background: 'transparent',
                border: `1px solid ${BORDER}`,
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '12px',
                color: MUTED,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Clear filter
            </button>
          )}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: NAVY, color: 'white' }}>
              {['', 'ASN Number', 'PO Reference', 'Status', 'Carrier', 'Tracking No.', 'ETA', 'Actions'].map((h, i) => (
                <th
                  key={i}
                  style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    width: i === 0 ? '32px' : undefined,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAsns.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{ padding: '32px', textAlign: 'center', color: MUTED, fontSize: '13px' }}
                >
                  No ASNs match the selected filter.
                </td>
              </tr>
            ) : (
              filteredAsns.map((asn, idx) => {
                const isOpen = expanded.has(asn.asnNumber);
                return (
                  <React.Fragment key={asn.asnNumber}>
                    <tr
                      style={{
                        background: idx % 2 === 0 ? 'white' : SUBTLE_BG,
                        borderTop: `1px solid #F1F5F9`,
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => toggleExpanded(asn.asnNumber)}
                          aria-label={isOpen ? 'Collapse' : 'Expand'}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            color: MUTED,
                            fontSize: '14px',
                            lineHeight: 1,
                            fontFamily: 'inherit',
                            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 120ms ease',
                          }}
                        >
                          {'>'}
                        </button>
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: TEAL,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {asn.asnNumber}
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          fontFamily: 'monospace',
                          color: '#354A5F',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {asn.poReference}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            background: STATUS_BG[asn.status],
                            color: STATUS_COLOR[asn.status],
                            borderRadius: '9999px',
                            padding: '2px 10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {asn.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#354A5F', whiteSpace: 'nowrap' }}>
                        {asn.carrier}
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          fontFamily: 'monospace',
                          color: MUTED,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {asn.trackingNumber}
                      </td>
                      <td style={{ padding: '12px 16px', color: MUTED, whiteSpace: 'nowrap' }}>
                        {asn.eta ? fmtDate(asn.eta) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        {asn.status === 'Draft' && (
                          <button
                            onClick={() => showToast(`Submitted ${asn.asnNumber} (mock)`)}
                            style={{
                              background: TEAL,
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            Submit
                          </button>
                        )}
                        {asn.status === 'Discrepancy' && (
                          <button
                            onClick={() => showToast(`Resolving discrepancy on ${asn.asnNumber} (mock)`)}
                            style={{
                              background: 'transparent',
                              color: ERROR,
                              border: `1px solid ${ERROR}`,
                              borderRadius: '6px',
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            Resolve
                          </button>
                        )}
                        {asn.status !== 'Draft' && asn.status !== 'Discrepancy' && (
                          <span style={{ color: MUTED, fontSize: '12px' }}>—</span>
                        )}
                      </td>
                    </tr>

                    {isOpen && (
                      <tr style={{ background: SUBTLE_BG, borderTop: `1px solid #F1F5F9` }}>
                        <td colSpan={8} style={{ padding: '16px 24px' }}>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1.4fr',
                              gap: '20px',
                            }}
                          >
                            {/* Shipment details */}
                            <div
                              style={{
                                background: 'white',
                                border: `1px solid ${BORDER}`,
                                borderRadius: '8px',
                                padding: '14px 16px',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: '11px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                  color: MUTED,
                                  fontWeight: 600,
                                  marginBottom: '10px',
                                }}
                              >
                                Shipment details
                              </div>
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '160px 1fr',
                                  rowGap: '6px',
                                  columnGap: '12px',
                                  fontSize: '13px',
                                }}
                              >
                                <span style={{ color: MUTED }}>Origin</span>
                                <span style={{ color: '#354A5F' }}>{asn.details.originCity}</span>
                                <span style={{ color: MUTED }}>Destination warehouse</span>
                                <span style={{ color: '#354A5F' }}>{asn.details.destinationWarehouse}</span>
                                <span style={{ color: MUTED }}>Total cartons</span>
                                <span style={{ color: '#354A5F' }}>
                                  {asn.details.totalCartons ? asn.details.totalCartons.toLocaleString() : '—'}
                                </span>
                                <span style={{ color: MUTED }}>Gross weight</span>
                                <span style={{ color: '#354A5F' }}>
                                  {asn.details.grossWeightKg
                                    ? `${asn.details.grossWeightKg.toLocaleString()} kg`
                                    : '—'}
                                </span>
                                <span style={{ color: MUTED }}>Temperature</span>
                                <span style={{ color: '#354A5F' }}>{asn.details.temperatureRequirement}</span>
                              </div>
                            </div>

                            {/* Line items */}
                            <div
                              style={{
                                background: 'white',
                                border: `1px solid ${BORDER}`,
                                borderRadius: '8px',
                                padding: '14px 16px',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: '11px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                  color: MUTED,
                                  fontWeight: 600,
                                  marginBottom: '10px',
                                }}
                              >
                                Line items
                              </div>
                              {asn.lineItems.length === 0 ? (
                                <div style={{ fontSize: '13px', color: MUTED }}>
                                  No line items drafted yet.
                                </div>
                              ) : (
                                <table
                                  style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    fontSize: '12px',
                                  }}
                                >
                                  <thead>
                                    <tr style={{ color: MUTED, textAlign: 'left' }}>
                                      <th style={{ padding: '4px 8px', fontWeight: 600 }}>Material</th>
                                      <th style={{ padding: '4px 8px', fontWeight: 600 }}>Description</th>
                                      <th style={{ padding: '4px 8px', fontWeight: 600, textAlign: 'right' }}>
                                        Ordered
                                      </th>
                                      <th style={{ padding: '4px 8px', fontWeight: 600, textAlign: 'right' }}>
                                        Shipped
                                      </th>
                                      <th style={{ padding: '4px 8px', fontWeight: 600 }}>Lot</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {asn.lineItems.map((li, i) => {
                                      const short = li.shippedQty < li.orderedQty;
                                      return (
                                        <tr
                                          key={i}
                                          style={{ borderTop: `1px solid ${BORDER}` }}
                                        >
                                          <td
                                            style={{
                                              padding: '6px 8px',
                                              fontFamily: 'monospace',
                                              color: '#354A5F',
                                            }}
                                          >
                                            {li.materialCode}
                                          </td>
                                          <td style={{ padding: '6px 8px', color: '#354A5F' }}>
                                            {li.description}
                                          </td>
                                          <td
                                            style={{
                                              padding: '6px 8px',
                                              textAlign: 'right',
                                              color: '#354A5F',
                                            }}
                                          >
                                            {li.orderedQty.toLocaleString()}
                                          </td>
                                          <td
                                            style={{
                                              padding: '6px 8px',
                                              textAlign: 'right',
                                              color: short ? ERROR : SUCCESS,
                                              fontWeight: 600,
                                            }}
                                          >
                                            {li.shippedQty.toLocaleString()}
                                          </td>
                                          <td
                                            style={{
                                              padding: '6px 8px',
                                              fontFamily: 'monospace',
                                              color: MUTED,
                                            }}
                                          >
                                            {li.lotNumber}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. FOOTER INFO STRIP */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
        }}
      >
        <div
          style={{
            background: '#E0F7FA',
            border: `1px solid ${TEAL}`,
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '12px',
            color: '#055A66',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '4px', color: NAVY }}>
            Paragon WMS integration
          </div>
          ASN events sync in real time with the Paragon WMS inbound module.
          Goods receipt postings are reflected here within 5 minutes.
        </div>
        <div
          style={{
            background: '#FEF3C7',
            border: `1px solid ${WARNING}`,
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '12px',
            color: '#7A3E0A',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '4px', color: NAVY }}>
            EDI 856 · Phase 2
          </div>
          Automated EDI 856 transmission to the Paragon Odyssey B2B gateway
          is planned for Phase 2. Current exports are generated on demand.
        </div>
      </div>
    </div>
  );
};

export default ShipNotices;
