// ────────────────────────────────────────────────────────────────────────────
// Supplier storefront fixtures.
//
// Relocated from src/pages-v2/SupplierMyStorefront.tsx and
// src/pages-v2/SupplierStorefront.tsx in Phase 1B Batch 2. Every row carries
// supplierId so applySupplierScope enforces identity boundaries structurally.
// ────────────────────────────────────────────────────────────────────────────

import type {
  CatalogItem,
  ProfileCert,
  StorefrontProduct,
} from '../../types';

export const INITIAL_CATALOG: CatalogItem[] = [
  { id: 'c1', supplierId: 'sup-007', material: 'PET Bottle 100ml Airless Pump', sapCode: 'MAT-10045', category: 'Packaging Primary', moq: '10,000', uom: 'PCS', leadTime: '14', unitPrice: '3,700', currency: 'IDR', certs: ['Halal BPJPH', 'ISO 9001'], capacity: '200,000', visible: true },
  { id: 'c2', supplierId: 'sup-007', material: 'PET Bottle 200ml Standard Pump', sapCode: 'MAT-10046', category: 'Packaging Primary', moq: '10,000', uom: 'PCS', leadTime: '14', unitPrice: '4,200', currency: 'IDR', certs: ['Halal BPJPH', 'ISO 9001'], capacity: '150,000', visible: true },
  { id: 'c3', supplierId: 'sup-007', material: 'Airless Pump 15ml Travel Size', sapCode: 'MAT-10089', category: 'Packaging Secondary', moq: '5,000', uom: 'PCS', leadTime: '21', unitPrice: '2,800', currency: 'IDR', certs: ['ISO 9001'], capacity: '100,000', visible: true },
];

export const INITIAL_CERTS: ProfileCert[] = [
  { supplierId: 'sup-007', name: 'BPOM Registration', visible: true, status: 'valid', expiry: '2026-12-31' },
  { supplierId: 'sup-007', name: 'ISO 9001:2015', visible: true, status: 'valid', expiry: '2026-08-14' },
  { supplierId: 'sup-007', name: 'BPJPH Halal Cert', visible: false, status: 'missing', expiry: null },
  { supplierId: 'sup-007', name: 'SNI Compliance', visible: true, status: 'expiring', expiry: '2026-05-01' },
];

export const PRODUCTS_DEFAULT: StorefrontProduct[] = [
  { supplierId: 'sup-007', name: 'Signature ingredient (per request)', code: 'CAT-0001', moq: '1,000 KG', leadTime: '14 days' },
  { supplierId: 'sup-007', name: 'Premium grade variant', code: 'CAT-0002', moq: '500 KG', leadTime: '21 days' },
  { supplierId: 'sup-007', name: 'Industrial grade variant', code: 'CAT-0003', moq: '5,000 KG', leadTime: '10 days' },
  { supplierId: 'sup-007', name: 'Specialty derivative', code: 'CAT-0004', moq: '250 KG', leadTime: '28 days' },
  { supplierId: 'sup-007', name: 'Bulk fulfilment SKU', code: 'CAT-0005', moq: '10,000 KG', leadTime: '35 days' },
  { supplierId: 'sup-007', name: 'Sample / trial kit', code: 'CAT-0006', moq: '5 KG', leadTime: '7 days' },
];
