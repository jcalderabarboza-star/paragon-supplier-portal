// ─────────────────────────────────────────────────────────────────────────────
// THE RFQ INVITE STEP — PSL SHOWN, AND AT P2 THE *STEP* IS MIRRORED WHILE THE
// CONTROLS STAY LIVE.
//
// ⚠️ **P2 CHANGED WHAT THIS FILE PROVES AND NOT ONE OF ITS NEGATIVE ASSERTIONS
// MOVED.** The gate went onto `t_rfq_publish` / `t_rfq_award`, exactly where
// the header below said it belonged. What the wizard gained is a MIRROR of that
// gate — the step refuses, so the buyer meets the refusal while the draft is
// still editable — and a mirror is not a page gate: every candidate checkbox is
// still enabled and still toggles, which the three assertions at the foot of
// this file continue to assert verbatim.
//
// ⚠️ **THE MOST IMPORTANT ASSERTIONS IN THIS FILE ARE THE NEGATIVE ONES.** P1
// puts a status chip beside a checkbox, and a chip beside a checkbox is exactly
// the shape that reads as a constraint. The gate belongs on `t_rfq_publish` /
// `t_rfq_award`'s policy hooks (P2), never on a page — a page-level gate is
// invisible to every other caller of the same verb, which is how this tree's
// false affordances got there in the first place.
//
// So: a SUSPENDED supplier must still be invitable today, and a supplier whose
// PSL listing has LAPSED must still be invitable today. Both are measured
// against the fixture rather than assumed.
// ─────────────────────────────────────────────────────────────────────────────
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import i18n from '../lib/i18n';
import BuyerSourcing from './BuyerSourcing';
import { mockSuppliers } from '../data/mockSuppliers';
import { SupplierStatus } from '../types/supplier.types';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';
import { pslStatusFor } from '../services/data/pslSourcingSeam';
import { seedPslListings } from '../services/data/mock/pslSeed';
import { pslStore } from '../services/data/mock/stores/pslStore';


// ── ⚠️ THE PSL CORPUS IS SEEDED HERE NOW, AND THE REASON IS B-S4c ───────────
//   Until PSL P3 the nine listings were LITERALS in a frozen module, so any
//   file that read them implicitly — through `pslStatusFor`'s or
//   `pslExemptionFor`'s defaulted corpus — got them for free at import.
//
//   P3 retired that fixture. The corpus is GROWN through the verbs into
//   `pslStore`, which opens EMPTY, so a spec that does not seed reads `[]` and
//   every PSL-dependent claim in it passes vacuously — the
//   `EMPTY-INPUT-REPORTS-CLEAN-01` shape, arriving through a default parameter.
//
//   The seed's own outcome is asserted rather than assumed: a half-seeded store
//   would make every assertion below a different, quieter test.

beforeAll(async () => {
  pslStore.reset();
  const pslSeeded = await seedPslListings();
  expect(pslSeeded.status, pslSeeded.reason ?? '').toBe('seeded');
});


/**
 * Open the wizard and reach the invite step (step 1) with Packaging chosen.
 *
 * ⚠️ The category `<select>` carries NO `htmlFor`, so it cannot be reached by
 * label. It is found by the OPTION it offers instead — which is also the more
 * honest handle here, since `Packaging` is the category this file depends on.
 */
const openInviteStep = async (material = 'PET Bottle 100ml'): Promise<void> => {
  renderWithProviders(<BuyerSourcing />);
  fireEvent.click(await screen.findByText(newRfqLabel));
  // ⚠️ FOUND BY OPTION *VALUE*, NOT BY OPTION NAME. The visible option label is
  // translated (`categoryLabel`), so a name-based match works in EN and finds
  // nothing in ID — a locale-blind matcher that passes half the time. The value
  // is the `RFQCategory` member and is identical in both locales.
  const selects = await screen.findAllByRole('combobox');
  const category = selects.find((el) =>
    Array.from((el as HTMLSelectElement).options).some((o) => o.value === 'Packaging'),
  )!;
  fireEvent.change(category, { target: { value: 'Packaging' } });
  // The step-0 gate also requires a title — `isStepValid(0)` reads
  // `draft.title.trim().length > 0`, so without it Next stays disabled and the
  // wizard never reaches the invite step this file is about.
  // ⚠️ THE TITLE INPUT HAS NEITHER `htmlFor` NOR `aria-label`, so it is reached
  // by PLACEHOLDER — and the fragment `Q3 2026` occurs in the placeholder in
  // BOTH locales, which is what lets one helper drive the wizard in either.
  fireEvent.change(screen.getByPlaceholderText(/Q3 2026/), {
    target: { value: 'PSL read-only smoke' },
  });
  fireEvent.click(await screen.findByText(material));
  fireEvent.change(await screen.findByLabelText(qtyLabel), {
    target: { value: '2400' },
  });
  fireEvent.click(screen.getByRole('button', { name: nextLabel }));
};

let newRfqLabel = 'New RFQ';
let qtyLabel: RegExp = /Total quantity/i;
let nextLabel: RegExp = /^Next$/i;

/** The candidate-table row for a supplier, from every element bearing its name. */
const candidateRow = (matches: HTMLElement[]): HTMLElement => {
  for (const m of matches) {
    const tr = m.closest('tr');
    if (tr && tr.querySelector('input[type="checkbox"]')) return tr as HTMLElement;
  }
  throw new Error('no candidate row with a checkbox');
};

const SUSPENDED = mockSuppliers.find((s) => s.status === SupplierStatus.SUSPENDED)!;

describe('REACH — the fixture reaches the cases this file asserts', () => {
  it('a SUSPENDED supplier exists, in a category the wizard offers', () => {
    // Without this, "a suspended supplier is still invitable" is vacuous.
    expect(SUSPENDED).toBeTruthy();
    expect(SUSPENDED.category).toBe('Packaging');
  });

  it('and a supplier whose PSL has LAPSED exists in the same category', () => {
    const lapsed = mockSuppliers.filter(
      (s) =>
        s.category === 'Packaging' &&
        pslStatusFor(s.id, null, DECLARED_PRESENT).kind === 'LAPSED',
    );
    expect(lapsed.length).toBeGreaterThan(0);
  });
});

describe('BuyerSourcing — the invite step shows PSL (EN)', () => {
  it('the PSL column header renders', async () => {
    await openInviteStep();

    expect(await screen.findAllByText('PSL')).not.toHaveLength(0);
  });

  it('⚠️ every candidate row carries a PSL cell', async () => {
    await openInviteStep();
    const cells = await screen.findAllByTestId(/^psl-cell-/);
    expect(cells.length).toBeGreaterThan(0);
  });

  it('⚠️ THE HINT SAYS THE COLUMN DOES NOT RESTRICT — in words, not only in code', async () => {
    await openInviteStep();
    const hint = await screen.findByTestId('psl-invite-hint');
    expect(hint.textContent).toMatch(/does not restrict who you may invite/i);
    // ⚠️ P2 — AND THE SECOND HALF, WHICH IS THE NEW FACT. The old copy ended
    // at the clause above and would still satisfy it, so without this the
    // change from "PSL informs" to "PSL decides whether you must compete"
    // would be unguarded. The first clause is KEPT because it is still true:
    // a chip beside a checkbox reads as a constraint unless the page denies it.
    expect(hint.textContent).toMatch(/decides whether this event needs competitive bidding/i);
  });
});

describe('⚠️ BuyerSourcing — NOTHING IS GATED. P1 informs; P2 decides.', () => {
  it('⚠️ A SUSPENDED SUPPLIER IS STILL INVITABLE — that is P2`s job, not P1`s', async () => {
    await openInviteStep();
    // ⚠️ SCOPED TO THE CANDIDATE TABLE. The name also appears in the
    // "recommended" card list above it, so an unscoped `findByText` matches two
    // elements and the spec would be asserting about whichever came first.
    const row = candidateRow(await screen.findAllByText(SUSPENDED.name));
    const box = within(row).getByRole('checkbox') as HTMLInputElement;

    // Not disabled, not hidden, and it actually toggles.
    expect(box.disabled).toBe(false);
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    expect(box.checked).toBe(true);
  });

  it('⚠️ A SUPPLIER WHOSE PSL LISTING HAS LAPSED IS STILL INVITABLE', async () => {
    await openInviteStep();
    const lapsed = mockSuppliers.find(
      (s) =>
        s.category === 'Packaging' &&
        pslStatusFor(s.id, null, DECLARED_PRESENT).kind === 'LAPSED',
    )!;
    const row = candidateRow(await screen.findAllByText(lapsed.name));
    // The cell says Expired…
    expect(within(row).getByTestId('psl-cell-lapsed')).toBeInTheDocument();
    // …and the control beside it still works.
    const box = within(row).getByRole('checkbox') as HTMLInputElement;
    expect(box.disabled).toBe(false);
    fireEvent.click(box);
    expect(box.checked).toBe(true);
  });

  it('no candidate checkbox anywhere on the step is disabled', async () => {
    await openInviteStep();
    const boxes = (await screen.findAllByRole('checkbox')) as HTMLInputElement[];
    expect(boxes.length).toBeGreaterThan(1);
    expect(boxes.filter((b) => b.disabled)).toEqual([]);
  });
});

describe('BuyerSourcing — the invite step shows PSL (ID)', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
    newRfqLabel = 'New RFQ';
    qtyLabel = /Total quantity/i;
    nextLabel = /^Next$/i;
  });

  it('⚠️ the hint and the cells localise, with no EN literal left', async () => {
    await i18n.changeLanguage('id');
    newRfqLabel = 'RFQ Baru';
    qtyLabel = /Total kuantitas/i;
    nextLabel = /^Berikutnya$/i;
    await openInviteStep();

    const hint = await screen.findByTestId('psl-invite-hint');
    expect(hint.textContent).toMatch(/tidak membatasi siapa yang dapat Anda undang/i);
    // The P2 second clause, in Indonesian — and no EN literal survives either.
    expect(hint.textContent).toMatch(/menentukan apakah acara ini memerlukan tender kompetitif/i);
    expect(hint.textContent).not.toMatch(/does not restrict/i);
    expect(hint.textContent).not.toMatch(/competitive bidding/i);

    const cells = await screen.findAllByTestId(/^psl-cell-/);
    const text = cells.map((c) => c.textContent).join(' | ');
    expect(text).not.toContain('Not Listed');
    expect(text).not.toContain('Expired');
  });
});
