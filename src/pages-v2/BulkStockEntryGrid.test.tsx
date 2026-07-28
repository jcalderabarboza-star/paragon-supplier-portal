import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

// ── The import route into the grid's row state (CP-0 · 2d′-a) ────────────────
//
// The ONLY way to put a batch row into this grid from jsdom: the DSG body is
// virtualized and lays out no editable cell under a zero-height viewport (that
// is asserted, not assumed — see the last case in the 2d′-a block). So the
// import panel is both the demonstrable state AND the test seam, and it is the
// honest one: these are real fixture bytes going through the real parse, the
// real mapping, and the real `coerceRows`.
const fixtureBytes = (name: string): Buffer =>
  readFileSync(join(__dirname, '..', 'services', 'sdc', '__tests__', 'fixtures', name));

const importFixture = async (name: string) => {
  fireEvent.click(screen.getByTestId('sdcsup-import-open'));
  const input = screen.getByTestId('sdcsup-import-file') as HTMLInputElement;
  const bytes = fixtureBytes(name);
  const file = new File([new Uint8Array(bytes)], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  // jsdom's File does not implement arrayBuffer() from a Node Buffer reliably.
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  });
  fireEvent.change(input, { target: { files: [file] } });
  await screen.findByTestId('sdcsup-import-confirm');
  fireEvent.click(screen.getByTestId('sdcsup-import-confirm'));
  // The panel closes once the rows land in the grid.
  await waitFor(() => expect(screen.queryByTestId('sdcsup-import-panel')).toBeNull());
};

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

// ────────────────────────────────────────────────────────────────────────────
// CP-0 · 2d′-a — the Σ ITSELF stops fabricating.
//
// 2d fixed the header total and left the sum beside it reading
// `s + (typeof r.qty === 'number' ? r.qty : 0)` — the `|| 0` in costume, and
// the more dangerous half. A row carrying a batch NUMBER but no readable
// quantity contributed a silent zero, so the banner printed a Σ that omitted
// the row while claiming to account for it.
//
// The proof below is the worst case rather than an obvious one: under a stated
// total of 4000, `single-sheet.xlsx` gives 1800 + 2200 + one refused cell, and
// the old banner announced "Batch total: 4.000 of 4.000 PCS" — a PERFECT
// reconciliation, arrived at by counting an unknown quantity as nothing. A
// wrong number invites a second look; a right-looking one does not.
//
// These assertions are deliberately CELL-TYPE-AGNOSTIC (banner text only), so
// they survive 2d′-b's `BatchGridRow.qty: number|null → string` migration
// verbatim and act as its regression lock.
// ────────────────────────────────────────────────────────────────────────────
describe('BulkStockEntryGrid — the Σ never sums across an unknown (CP-0 · 2d′-a)', () => {
  // POSITIVE TWIN — the SAME code path (open → upload → map → confirm → banner)
  // with the single variable changed: every quantity in this sheet reads. It
  // establishes that the Σ line renders for IMPORTED batch rows at all, so the
  // "no Σ" assertions below stand against something real rather than against a
  // banner that never renders a Σ under jsdom in the first place.
  it('a sheet whose quantities ALL read renders the batch total', async () => {
    renderGrid();
    pickMaterial();
    setTotal('500');
    await importFixture('multi-sheet.xlsx'); // Jan Stock: JAN-1, 500
    await waitFor(() => expect(banner().textContent).toMatch(/Batch total/));
    expect(banner().textContent).toContain('500');
  });

  it('an UNREADABLE batch quantity suppresses the Σ — never a zero silently summed in', async () => {
    renderGrid();
    pickMaterial();
    setTotal('4000');
    await importFixture('single-sheet.xlsx'); // 1800 + 2200 + "1,050" (refused)
    await waitFor(() => expect(banner().textContent).toMatch(/could not be read: 1/i));
    const text = banner().textContent ?? '';
    // The two negations, each standing against the positive twin above:
    //  · /Batch total/ was SEEN to render there → its absence here is meaningful.
    //  · the exact fabricated string the old code produced.
    expect(text).not.toMatch(/Batch total/);
    expect(text).not.toMatch(/4\.000 of 4\.000/);
    expect(text.trim()).not.toBe(''); // honest silence is never literal silence
  });

  it('the refusal is about READABILITY, not reconciliation — a readable mismatch still shows its Σ', async () => {
    // Narrowness check: suppressing the Σ must not swallow the ordinary
    // Σ≠total case, which is a DIFFERENT and still-informative failure.
    renderGrid();
    pickMaterial();
    setTotal('9000');
    await importFixture('multi-sheet.xlsx'); // 500 vs a stated 9000
    await waitFor(() => expect(banner().textContent).toMatch(/Batch total/));
    const text = banner().textContent ?? '';
    expect(text).toContain('500');
    expect(text).toContain('9.000');
    expect(text).toMatch(/batches must sum to the total/);
  });

  it('says so in Indonesian too', async () => {
    await i18n.changeLanguage('id');
    try {
      renderGrid();
      pickMaterial();
      setTotal('4000');
      await importFixture('single-sheet.xlsx');
      await waitFor(() =>
        expect(banner().textContent).toMatch(/tidak dapat dibaca: 1/i),
      );
      expect(banner().textContent).not.toMatch(/Total batch:/);
    } finally {
      await i18n.changeLanguage('en');
    }
  });

  // VERIFIED, not inherited from a comment: this is why no test in the repo has
  // ever asserted on a datasheet cell, and why the `intColumn` truncation (2d′-b)
  // has been invisible to the suite for the whole series. The grid CONTAINER is
  // in the document — that is the positive — but the virtualized body lays out
  // no editable input under jsdom's zero-height viewport. Cell-level proof
  // therefore belongs in Browser QA, not here. If a future DSG upgrade changes
  // this, this case fails and tells us the constraint has lifted.
  it('the DSG body lays out no editable cell under jsdom (why cell proof is Browser QA)', () => {
    const { container } = renderGrid();
    pickMaterial();
    expect(container.querySelector('.sdc-bulk-grid')).not.toBeNull();
    expect(container.querySelectorAll('.dsg-input')).toHaveLength(0);
  });
});
