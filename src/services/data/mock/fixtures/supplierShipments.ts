// ────────────────────────────────────────────────────────────────────────────
// Supplier shipments / ASN fixtures.
//
// Relocated from src/pages-v2/SupplierShipments.tsx in Phase 1B Batch 2.
// Every row carries supplierId so applySupplierScope can enforce identity
// boundaries structurally — a supplier query CANNOT see another supplier's
// ASNs.
// ────────────────────────────────────────────────────────────────────────────

import type { ASN } from '../../types';

export const MOCK_ASNS: ASN[] = [
  {
    asnNumber: 'ASN-2025-00211',
    supplierId: 'sup-007',
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
    supplierId: 'sup-007',
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
    supplierId: 'sup-007',
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
    supplierId: 'sup-007',
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
