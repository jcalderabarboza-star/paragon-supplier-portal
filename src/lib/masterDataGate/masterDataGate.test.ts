// ─────────────────────────────────────────────────────────────────────────────
// MD-2 · THE MASTER-DATA GATE — one truth, held from source every run.
//
//   1  The material master and the supplier roster are read directly only by
//      the files `grandfathered.ts` names. The set is held EQUAL to the tree, so
//      a new direct reader is red and a reader that moves to the lookups must
//      leave the list: it can only shrink.
//   2  No file declares an option list for a value that has a reference table,
//      except the ones named with a reason. Held equal the same way.
//
// Each derivation is also fired at a tree with the defect in it. The option
// lists this batch removed from four pages are the probe input: the lists the
// tree really carried, put back, must be named.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { stripSourceComments } from '../sourceScan/stripComments';
import { recordsOf } from '../../services/masterData/replica';
import { REFERENCE_TABLES, type ReferenceRecord } from '../../services/masterData/types';
import {
  MASTER_FIXTURES,
  declaredLists,
  fixtureImporters,
  optionListsForReferenceValues,
  type SourceFiles,
  type TableVocabulary,
} from './derive';
import { FIXTURE_IMPORTERS, OPTION_LISTS } from './grandfathered';

const SRC = join(process.cwd(), 'src');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
const rel = (file: string): string => file.slice(SRC.length + 1).replace(/\\/g, '/');

/** Every product source file (no spec), comments removed. */
const PRODUCT: SourceFiles = Object.fromEntries(
  walk(SRC)
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
    .map((f) => [rel(f), stripSourceComments(readFileSync(f, 'utf8'), 'delete', f)]),
);

/**
 * The option-list gate does not read the sample-data modules: a fixture row
 * names reference values because it is a DOCUMENT that carries them, and the
 * master-data module's own seed is where the tables come from. Everything else
 * is read.
 */
const SAMPLE_DATA = [/^data\//, /^services\/data\/mock\/fixtures\//, /^services\/masterData\//];
const READ_FOR_LISTS: SourceFiles = Object.fromEntries(
  Object.entries(PRODUCT).filter(([file]) => !SAMPLE_DATA.some((rule) => rule.test(file))),
);

/** What each reference table recognises: its keys and its texts, as the replica holds them. */
const VOCABULARIES: readonly TableVocabulary[] = REFERENCE_TABLES.map((table) => {
  const records = recordsOf(table) as readonly ReferenceRecord[];
  return { table, values: new Set(records.flatMap((r) => [r.key, r.data.text])) };
});

describe('MD-2 · the populations are real before either gate is believed', () => {
  it('⚠ CONTROL — the scan read the tree, and the reference tables are seeded', () => {
    expect(Object.keys(PRODUCT)).toContain('services/masterData/seed.ts');
    expect(Object.keys(PRODUCT)).toContain('pages-v2/BuyerSourcing.tsx');
    expect(Object.keys(PRODUCT)).not.toContain('pages-v2/BuyerSourcing.test.tsx');
    const incoterms = VOCABULARIES.find((v) => v.table === 'incoterm');
    expect(incoterms?.values.has('CIF')).toBe(true);
    expect(incoterms?.values.has('CIF Jakarta')).toBe(false);
  });

  it('⚠ CONTROL — the list derivation finds a list the tree really declares, by name', () => {
    const names = declaredLists(PRODUCT).map((l) => `${l.file}::${l.name}`);
    expect(names).toContain('services/masterData/types.ts::KNOWN_UNITS');
    expect(names).not.toContain('pages-v2/BuyerSourcing.tsx::INCOTERMS_OPTIONS');
  });

  it('⚠ CONTROL — the sample-data rule leaves the pages and services in, and takes only data modules out', () => {
    expect(Object.keys(READ_FOR_LISTS)).toContain('pages-v2/BuyerContracts.tsx');
    expect(Object.keys(READ_FOR_LISTS)).toContain('services/data/mock/MockCommandService.ts');
    expect(Object.keys(READ_FOR_LISTS)).toContain('lib/currencyPolicy.ts');
    expect(Object.keys(READ_FOR_LISTS)).not.toContain('data/paragonBrands.ts');
    expect(Object.keys(READ_FOR_LISTS)).not.toContain('services/masterData/seed.ts');
    expect(Object.keys(PRODUCT).length - Object.keys(READ_FOR_LISTS).length).toBeLessThan(80);
  });
});

describe('MD-2 · no module outside the named ones imports the material fixture or the supplier fixture', () => {
  for (const fixture of MASTER_FIXTURES) {
    it(`${fixture.name}: the importers are exactly the named ones`, () => {
      expect(fixtureImporters(PRODUCT, fixture)).toEqual([...FIXTURE_IMPORTERS[fixture.name]].sort());
    });
  }

  it('the seed is an importer of both: it is what turns the fixtures into replica records', () => {
    for (const fixture of MASTER_FIXTURES) {
      expect(FIXTURE_IMPORTERS[fixture.name]).toContain('services/masterData/seed.ts');
    }
  });

  it('the lookups no longer import the material fixture: they read the replica', () => {
    const importers = fixtureImporters(PRODUCT, MASTER_FIXTURES[0]);
    for (const lookup of ['services/sdc/materialMaster.ts', 'services/sdc/bpom.ts', 'services/sdc/halal.ts', 'services/sdc/materialRuling.ts']) {
      expect(importers, lookup).not.toContain(lookup);
      expect(PRODUCT[lookup], lookup).toMatch(/materialMasterView\(\)/);
    }
  });

  it('⚠ PROBE — a new direct reader is named, whether it imports on one line or across several', () => {
    const withReaders: SourceFiles = {
      ...PRODUCT,
      'pages-v2/NewPage.tsx': "import { MATERIAL_MASTER } from '../services/sdc/fixtures';",
      'pages-v2/OtherPage.tsx': "import {\n  labelOf,\n  mockSuppliers,\n} from '../data/mockSuppliers';",
      'pages-v2/Innocent.tsx': "import { labelOf } from '../services/sdc/materialMaster';\nconst note = 'MATERIAL_MASTER';",
    };
    expect(fixtureImporters(withReaders, MASTER_FIXTURES[0])).toContain('pages-v2/NewPage.tsx');
    expect(fixtureImporters(withReaders, MASTER_FIXTURES[1])).toContain('pages-v2/OtherPage.tsx');
    expect(fixtureImporters(withReaders, MASTER_FIXTURES[0])).not.toContain('pages-v2/Innocent.tsx');
  });
});

describe('MD-2 · every option list for a value with a reference table is read from the table', () => {
  const found = optionListsForReferenceValues(READ_FOR_LISTS, VOCABULARIES);

  it('the lists the tree still declares are exactly the named ones', () => {
    expect(found.map((f) => f.key)).toEqual(Object.keys(OPTION_LISTS).sort());
  });

  it('every named list says why it stands, and which table it would read', () => {
    for (const finding of found) {
      const row = OPTION_LISTS[finding.key];
      expect(row?.reason.length ?? 0, finding.key).toBeGreaterThan(20);
      expect(row?.table, finding.key).toBe(finding.table);
    }
  });

  it('the four pages this batch moved keep no list for incoterms, payment terms, locations or cost centres', () => {
    const moved = ['pages-v2/BuyerSourcing.tsx', 'pages-v2/BuyerContracts.tsx', 'pages-v2/BuyerRequisitions.tsx', 'components/v2-features/GRInspectionWizard.tsx'];
    const tables = new Set(['incoterm', 'paymentTerm', 'plant', 'storageLocation', 'costCentre']);
    expect(found.filter((f) => moved.some((m) => f.key.startsWith(`${m}::`)) && tables.has(f.table))).toEqual([]);
    for (const page of moved) expect(PRODUCT[page], page).toMatch(/referencePickers'/);
  });

  it('⚠ PROBE — the lists the tree really carried, put back, are each named against their table', () => {
    const restored: SourceFiles = {
      ...PRODUCT,
      'pages-v2/Restored.tsx': [
        "const INCOTERMS_OPTIONS = ['FOB', 'CIF', 'EXW', 'DDP', 'FCA'];",
        "const PAYMENT_TERMS_OPTIONS = [\n  'Net 30',\n  'Net 45',\n  'Net 60',\n  'Letter of Credit',\n  'Advance Payment',\n];",
        "const LOCATIONS = ['NDC J6 Jakarta', 'RM Warehouse', 'PM Warehouse'];",
        "const COST_CENTERS = [\n  'CC-RD-001 — R&D',\n  'CC-PKG-002 — Packaging',\n];",
        "const WORDS = ['alpha', 'beta', 'gamma'];",
      ].join('\n'),
    };
    const named = optionListsForReferenceValues(restored, VOCABULARIES)
      .filter((f) => f.key.startsWith('pages-v2/Restored.tsx::'))
      .map((f) => `${f.key.split('::')[1]} → ${f.table}`);
    expect(named).toEqual(['INCOTERMS_OPTIONS → incoterm', 'LOCATIONS → storageLocation', 'PAYMENT_TERMS_OPTIONS → paymentTerm']);
    // The cost-centre list glued a name to each code, so no value equals a key:
    // a list is caught by what it holds, and that one held no reference value.
    expect(named.join()).not.toContain('COST_CENTERS');
    expect(named.join()).not.toContain('WORDS');
  });
});
