import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import BulkStockEntryGrid from './BulkStockEntryGrid';
import i18n from '../lib/i18n';
import type { CollaboratedMaterialView } from '../services/query/sdcSupplierHooks';

// ────────────────────────────────────────────────────────────────────────────
// CP-0 · W1 · PR-2d — the bulk grid's Σ-vs-total banner.
//
// This surface had no tests before this batch; everything here is additive.
//
// The banner used to run its OWN coercion of the header total
// (`Number(totalQty.replace(/,/g,''))`, then `NaN ? 0 : n`) while the adapter
// gated the dispatch through `normalizeQty`. Two parses of one cell: a total of
// "4.000" displayed as 4 while the adapter refused it, and the banner then told
// the supplier their batches did not add up. A fabricated ACCUSATION is worse
// than a fabricated value — it moves the blame onto the person who was right.
//
// (The batch CELLS are still parsed by the datasheet engine's own `intColumn`;
// replacing that column is 2d′ and is deliberately out of scope here.)
// ────────────────────────────────────────────────────────────────────────────

const MATERIALS: CollaboratedMaterialView[] = [
  { materialCode: 'PK-PETB-8810', label: 'PET Bottle 250ml', uom: 'PCS', supplierType: 'manufacturer' },
];

const renderGrid = () =>
  renderWithProviders(
    <BulkStockEntryGrid
      supplierId="sup-007"
      materials={MATERIALS}
      declarations={[]}
      causationId={() => undefined}
      recordAttempt={vi.fn()}
      onClose={vi.fn()}
      onDeclared={vi.fn()}
    />,
    { identity: SUPPLIER, route: '/supplier/forecasts' },
  );

const field = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} is not in the document`);
  return el;
};
const pickMaterial = () =>
  fireEvent.change(field('sdcsup-bulk-material'), { target: { value: 'PK-PETB-8810' } });
const setTotal = (v: string) =>
  fireEvent.change(field('sdcsup-bulk-total'), { target: { value: v } });
const banner = () => screen.getByTestId('sdcsup-bulk-summary');

describe('BulkStockEntryGrid — the Σ banner reads the ONE parse (CP-0 · 2d)', () => {
  // POSITIVE FIRST: establishes that the banner renders a readable total at all,
  // so the assertions below about what it does NOT say have something to stand
  // against. Without this, "does not contain 4" would pass on an empty banner.
  it('a READABLE total renders in the banner', () => {
    renderGrid();
    pickMaterial();
    setTotal('4000');
    // formatNumber groups id-ID, so 4000 renders as "4.000".
    expect(banner().textContent).toContain('4.000');
  });

  it('an AMBIGUOUS total states the refusal — never a fabricated Σ mismatch', () => {
    renderGrid();
    pickMaterial();
    setTotal('4.000'); // 4000 under id, 4 under en — one reading of two
    const text = banner().textContent ?? '';
    expect(text).toMatch(/could be read two ways/i);
    // The old banner computed 4 from its own parse and declared a mismatch.
    expect(text).not.toMatch(/must sum to the total/);
    expect(text.trim()).not.toBe(''); // honest silence is never literal silence
  });

  it('an UNREADABLE total says so rather than showing a confident zero', () => {
    renderGrid();
    pickMaterial();
    setTotal('plenty');
    const text = banner().textContent ?? '';
    expect(text).toMatch(/not a number/i);
    // `Number.isNaN(totalNum) ? 0 : totalNum` used to render "of 0 PCS" here —
    // a quantity the supplier never stated, presented as their declaration.
    expect(text).not.toMatch(/\bof 0\b/);
  });

  it('the total input is text + inputmode, so a separator can actually be typed', () => {
    renderGrid();
    const input = field('sdcsup-bulk-total') as HTMLInputElement;
    // Ruling 6.2: behind type="number" the refusal above is unreachable by hand.
    expect(input.getAttribute('type')).toBe('text');
    expect(input.getAttribute('inputmode')).toBe('decimal');
  });

  it('refuses in Indonesian too', async () => {
    await i18n.changeLanguage('id');
    try {
      renderGrid();
      pickMaterial();
      setTotal('4.000');
      expect(banner().textContent).toMatch(/dibaca dua cara/);
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
