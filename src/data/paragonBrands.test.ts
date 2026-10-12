// THE PARAGON BRAND LIST, HELD TO THE RULING (operator, 12 October 2026): exactly
// these fourteen, with these codes — and no page keeps a brand list of its own.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from '../lib/treeMutationGate/derive';
import { PARAGON_BRANDS, PARAGON_BRAND_NAMES } from './paragonBrands';
import { mockContracts } from './mockContracts';

const RULED: readonly (readonly [string, string])[] = [
  ['Wardah', 'WARDAH'],
  ['Emina', 'EMINA'],
  ['Make Over', 'MAKE-OVER'],
  ['Instaperfect', 'INSTAPERFECT'],
  ['Kahf', 'KAHF'],
  ['Putri', 'PUTRI'],
  ['Crystallure', 'CRYSTALLURE'],
  ['Labore', 'LABORE'],
  ['Biodef', 'BIODEF'],
  ['Tavi', 'TAVI'],
  ['Wonderly', 'WONDERLY'],
  ['OMG', 'OMG'],
  ['Beyondly', 'BEYONDLY'],
  ['Earth Love Life', 'EARTH-LOVE-LIFE'],
];

const SRC = join(REPO_ROOT, 'src');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
const product = walk(SRC).filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));
const rel = (f: string): string => f.slice(SRC.length + 1).replace(/\\/g, '/');

describe('the Paragon brand list', () => {
  it('is exactly the ruled list, in order, name and code', () => {
    expect(PARAGON_BRANDS.map((b) => [b.name, b.code])).toEqual(RULED);
    expect(PARAGON_BRAND_NAMES).toEqual(RULED.map(([name]) => name));
    expect(new Set(PARAGON_BRANDS.map((b) => b.code)).size).toBe(RULED.length);
  });

  it('every sample contract names only brands on the list', () => {
    const named = [...new Set(mockContracts.flatMap((c) => c.brands ?? []))];
    expect(named).toContain('Wardah');
    expect(named.filter((b) => !(PARAGON_BRAND_NAMES as readonly string[]).includes(b))).toEqual([]);
  });

  it('⚠ CONTROL — the scan reads the tree: the list’s own file is found by a brand only it and the ruling name', () => {
    const naming = product.filter((f) => /'Crystallure'/.test(readFileSync(f, 'utf8'))).map(rel);
    expect(naming).toEqual(['data/paragonBrands.ts']);
  });

  it('no page keeps a brand list of its own — both readers take it from the one file', () => {
    // A second list is an array literal that opens on the first brand.
    const second = product
      .filter((f) => rel(f) !== 'data/paragonBrands.ts')
      .filter((f) => /\[\s*'Wardah'\s*,\s*'Emina'\s*,\s*'Make Over'\s*,\s*'Instaperfect'/.test(readFileSync(f, 'utf8')))
      .map(rel);
    expect(second).toEqual([]);
    const readers = product.filter((f) => /PARAGON_BRAND_NAMES/.test(readFileSync(f, 'utf8'))).map(rel).sort();
    expect(readers).toEqual(['data/paragonBrands.ts', 'pages-v2/BuyerContracts.tsx', 'pages-v2/BuyerInventory.tsx']);
  });

  it('two names that are not Paragon brands appear nowhere in the product source or the guides', () => {
    const files = [...product, ...walk(join(REPO_ROOT, 'docs', 'guides'))];
    const hits = files.filter((f) => /\bBLP\b|Scarlett/i.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
});
