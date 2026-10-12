// ─────────────────────────────────────────────────────────────────────────────
// MD-1 · THE SEED RUN — the replica's opening contents, built from today's
// fixtures and stamped SAMPLE.
//
// No consumer moves in MD-1: `MATERIAL_MASTER` and the supplier fixture stay
// where they are and the replica is seeded FROM them, so the two cannot
// disagree. MD-2 turns the readers round.
//
// Every record this run delivers is `source: 'SAMPLE'`, read at the declared
// present. None of it came from SAP and no surface may say it did.
//
// The reference values are the ones the tree already uses: the unit and
// material-type unions, the material-group register, the incoterms and payment
// terms the sourcing and contract forms offer, the bid currencies, the country
// profiles, the receiving wizard's locations, the cost centres the
// requisition fixture names and the Paragon brand list. Their codes and texts are SAMPLE: SAP's own keys
// replace them when the feed is real (SE-6).
// ─────────────────────────────────────────────────────────────────────────────

import { COUNTRY_PROFILES } from '../../data/communicationProfiles';
import { mockSuppliers } from '../../data/mockSuppliers';
import { PARAGON_BRANDS } from '../../data/paragonBrands';
import { DECLARED_PRESENT_INSTANT } from '../data/fixturePresent';
import { MATERIAL_MASTER } from '../sdc/fixtures';
import { MATERIAL_GROUPS } from '../sdc/materialGroups';
import {
  MASTER_OBJECTS,
  type InboundRecord,
  type InboundRun,
  type MaterialData,
  type ReferenceAttribute,
  type ReferenceData,
  type ReferenceTable,
  type SupplierData,
} from './types';

export const SEED_RUN_ID = 'SAMPLE-RUN-0001';

type Row = readonly [key: string, text: string, attributes?: Partial<Record<ReferenceAttribute, string>>];

const reference = (object: ReferenceTable, rows: readonly Row[]): InboundRecord[] =>
  rows.map(([key, text, attributes]) => {
    const data: ReferenceData = { text, attributes: attributes ?? {} };
    return { object, key, data };
  });

const UNIT_ROWS: readonly Row[] = [
  ['KG', 'Kilogram', { dimension: 'Mass' }],
  ['PCS', 'Piece', { dimension: 'Count' }],
  ['L', 'Litre', { dimension: 'Volume' }],
  ['ROLL', 'Roll', { dimension: 'Count' }],
];

const MATERIAL_TYPE_ROWS: readonly Row[] = [
  ['ROH', 'Raw material'],
  ['VERP', 'Packaging'],
];

/** The five terms the sourcing and contract forms offer. The place is a separate field. */
const INCOTERM_ROWS: readonly Row[] = [
  ['FOB', 'Free on Board'],
  ['CIF', 'Cost, Insurance and Freight'],
  ['EXW', 'Ex Works'],
  ['DDP', 'Delivered Duty Paid'],
  ['FCA', 'Free Carrier'],
];

/** The five payment terms the same two forms offer, under sample keys. */
const PAYMENT_TERM_ROWS: readonly Row[] = [
  ['NT30', 'Net 30', { days: '30' }],
  ['NT45', 'Net 45', { days: '45' }],
  ['NT60', 'Net 60', { days: '60' }],
  ['LC00', 'Letter of Credit'],
  ['ADVP', 'Advance Payment'],
];

const CURRENCY_ROWS: readonly Row[] = [
  ['IDR', 'Indonesian Rupiah'],
  ['USD', 'US Dollar'],
  ['EUR', 'Euro'],
];

/** The receiving wizard's three locations, as one sample plant and its storage locations. */
const PLANT_ROWS: readonly Row[] = [['PL01', 'NDC J6 Jakarta', { city: 'Jakarta' }]];
const STORAGE_LOCATION_ROWS: readonly Row[] = [
  ['PL01/RM01', 'RM Warehouse', { plant: 'PL01' }],
  ['PL01/PM01', 'PM Warehouse', { plant: 'PL01' }],
];

/** The cost centres the requisition fixture names. `seed.test.ts` holds that membership. */
const COST_CENTRE_ROWS: readonly Row[] = [
  ['CC-RD-001', 'R&D formulation'],
  ['CC-RD-002', 'R&D development'],
  ['CC-RD-003', 'R&D fragrance'],
  ['CC-PKG-002', 'Packaging engineering'],
  ['CC-MFG-001', 'Production planning'],
  ['CC-SC-001', 'Supply chain planning'],
];

/**
 * The key of the payment term whose text is `text`. Throws at author time,
 * naming the value: a supplier fixture row that carries a term the table does
 * not hold is an authoring error, never a silent null.
 */
function paymentTermKey(text: string, supplierId: string): string {
  const row = PAYMENT_TERM_ROWS.find(([, t]) => t === text);
  if (!row) throw new Error(`master-data seed: supplier ${supplierId} names payment term "${text}", which the payment-term table does not hold`);
  return row[0];
}

/** `CIF Jakarta` → the term and its place. Throws, naming the value, when the term is not in the table. */
function splitIncoterm(value: string, supplierId: string): { incoterm: string; incotermPlace: string | null } {
  const [term, ...place] = value.trim().split(/\s+/);
  if (!INCOTERM_ROWS.some(([key]) => key === term)) {
    throw new Error(`master-data seed: supplier ${supplierId} names incoterm "${value}", whose term the incoterm table does not hold`);
  }
  return { incoterm: term, incotermPlace: place.length > 0 ? place.join(' ') : null };
}

function materialRecords(): InboundRecord[] {
  return Object.values(MATERIAL_MASTER).map((m) => {
    const data: MaterialData = {
      description: m.label,
      materialType: m.materialType,
      materialGroup: m.materialGroup,
      baseUnit: m.canonicalUom,
    };
    return { object: 'material', key: m.materialCode, data };
  });
}

function supplierRecords(): InboundRecord[] {
  return mockSuppliers.map((s) => {
    const terms = s.incoterms ? splitIncoterm(s.incoterms, s.id) : { incoterm: null, incotermPlace: null };
    const data: SupplierData = {
      portalSupplierId: s.id,
      name: s.name,
      legalName: s.legalName ?? null,
      country: s.country,
      city: s.city,
      taxId: s.taxId ?? null,
      businessRegNo: s.businessRegNo ?? null,
      paymentTerm: s.paymentTerms ? paymentTermKey(s.paymentTerms, s.id) : null,
      ...terms,
    };
    return { object: 'supplier', key: s.sapBpNumber, data };
  });
}

export function buildSeedRun(): InboundRun {
  return {
    id: SEED_RUN_ID,
    source: 'SAMPLE',
    at: DECLARED_PRESENT_INSTANT,
    mode: 'FULL',
    objects: MASTER_OBJECTS,
    records: [
      ...reference('unit', UNIT_ROWS),
      ...reference('materialType', MATERIAL_TYPE_ROWS),
      ...reference(
        'materialGroup',
        MATERIAL_GROUPS.map((g): Row => [g.group, g.label]),
      ),
      ...reference('incoterm', INCOTERM_ROWS),
      ...reference('paymentTerm', PAYMENT_TERM_ROWS),
      ...reference('currency', CURRENCY_ROWS),
      ...reference(
        'country',
        Object.entries(COUNTRY_PROFILES).map(([code, profile]): Row => [code, profile.name]),
      ),
      ...reference('plant', PLANT_ROWS),
      ...reference('storageLocation', STORAGE_LOCATION_ROWS),
      ...reference('costCentre', COST_CENTRE_ROWS),
      // The Paragon brand list, exactly as ruled (`data/paragonBrands.ts`), under its own codes.
      ...reference(
        'brand',
        PARAGON_BRANDS.map((b): Row => [b.code, b.name]),
      ),
      ...materialRecords(),
      ...supplierRecords(),
    ],
  };
}
