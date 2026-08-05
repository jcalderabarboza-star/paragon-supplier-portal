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
  // ⚠️ 2B-5a · R-D — `sapCode` CORRECTED FROM `MAT-10045` TO `PK-PETB-8803`.
  // `MAT-10045` was a pointer into no space at all: it appeared nowhere else in
  // the tree, while this row's own `material` string is the master's label for
  // `PK-PETB-8803` BYTE FOR BYTE. Under R-D, `sapCode` means Paragon master
  // code, so the pointer was simply wrong and now names the row it always meant.
  // ⚠️ AND THIS IS THE ROW 2B-3 CITED AS T3 "NAME-ONLY" CORROBORATION when it
  // authored `PK-PETB-8803` — it was CODE-BOUND all along, in a field the census
  // could not read. The label is unaffected; the evidence TIER was wrong.
  { id: 'c1', supplierId: 'sup-007', material: 'PET Bottle 100ml Airless Pump', sapCode: 'PK-PETB-8803', category: 'Packaging Primary', moq: '10,000', uom: 'PCS', leadTime: '14', unitPrice: '3,700', currency: 'IDR', certs: ['Halal BPJPH', 'ISO 9001'], capacity: '200,000', visible: true },
  { id: 'c2', supplierId: 'sup-007', material: 'PET Bottle 200ml Standard Pump', sapCode: 'MAT-10046', category: 'Packaging Primary', moq: '10,000', uom: 'PCS', leadTime: '14', unitPrice: '4,200', currency: 'IDR', certs: ['Halal BPJPH', 'ISO 9001'], capacity: '150,000', visible: true },
  { id: 'c3', supplierId: 'sup-007', material: 'Airless Pump 15ml Travel Size', sapCode: 'MAT-10089', category: 'Packaging Secondary', moq: '5,000', uom: 'PCS', leadTime: '21', unitPrice: '2,800', currency: 'IDR', certs: ['ISO 9001'], capacity: '100,000', visible: true },
  { id: 'c101', supplierId: 'sup-002', material: 'RBD Palm Stearin — Specialty Fat', sapCode: 'RM-PSTN-7150', category: 'Raw Material', moq: '20,000', uom: 'KG', leadTime: '30', unitPrice: '14,500', currency: 'IDR', certs: ['Halal BPJPH', 'ISO 9001', 'RSPO'], capacity: '500,000', visible: true },
  { id: 'c201', supplierId: 'sup-005', material: 'Emulgade SE-PF Emulsifier', sapCode: 'RM-EMUL-9440', category: 'Active Ingredient', moq: '1,000', uom: 'KG', leadTime: '45', unitPrice: '210,000', currency: 'IDR', certs: ['REACH', 'ISO 9001'], capacity: '60,000', visible: true },
];

export const INITIAL_CERTS: ProfileCert[] = [
  { supplierId: 'sup-007', name: 'BPOM Registration', visible: true, status: 'valid', expiry: '2026-12-31', uploaded: '2024-01-10' },
  { supplierId: 'sup-007', name: 'ISO 9001:2015', visible: true, status: 'valid', expiry: '2026-08-14', uploaded: '2023-08-15' },
  { supplierId: 'sup-007', name: 'BPJPH Halal Cert', visible: false, status: 'missing', expiry: null, uploaded: null },
  { supplierId: 'sup-007', name: 'SNI Compliance', visible: true, status: 'expiring', expiry: '2026-05-01', uploaded: '2024-05-01' },
  // D-4: a pending-review document exercises the 'pending' status variant.
  { supplierId: 'sup-007', name: 'GMP Certificate', visible: false, status: 'pending', expiry: null, uploaded: '2026-06-20' },
  { supplierId: 'sup-002', name: 'RSPO Certification', visible: true, status: 'valid', expiry: '2027-03-31', uploaded: '2025-02-10' },
  { supplierId: 'sup-005', name: 'REACH Registration', visible: true, status: 'valid', expiry: '2028-01-15', uploaded: '2026-01-05' },
];

export const PRODUCTS_DEFAULT: StorefrontProduct[] = [
  { supplierId: 'sup-007', name: 'Signature ingredient (per request)', code: 'CAT-0001', moq: '1,000 KG', leadTime: '14 days' },
  { supplierId: 'sup-007', name: 'Premium grade variant', code: 'CAT-0002', moq: '500 KG', leadTime: '21 days' },
  { supplierId: 'sup-007', name: 'Industrial grade variant', code: 'CAT-0003', moq: '5,000 KG', leadTime: '10 days' },
  { supplierId: 'sup-007', name: 'Specialty derivative', code: 'CAT-0004', moq: '250 KG', leadTime: '28 days' },
  { supplierId: 'sup-007', name: 'Bulk fulfilment SKU', code: 'CAT-0005', moq: '10,000 KG', leadTime: '35 days' },
  { supplierId: 'sup-007', name: 'Sample / trial kit', code: 'CAT-0006', moq: '5 KG', leadTime: '7 days' },
  { supplierId: 'sup-002', name: 'RBD palm stearin (bulk)', code: 'CAT-0101', moq: '20,000 KG', leadTime: '30 days' },
  { supplierId: 'sup-005', name: 'Emulgade SE-PF emulsifier', code: 'CAT-0201', moq: '1,000 KG', leadTime: '45 days' },
];
