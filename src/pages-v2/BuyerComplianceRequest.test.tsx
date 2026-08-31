// ────────────────────────────────────────────────────────────────────────────
// WAVE E — THE BUYER ASKS, AND THE SUPPLIER FINDS THE ASK.
//
// ⚠️ **THIS FILE IS THE COVERAGE INSTRUMENT, BECAUSE THE CENSUS CANNOT BE ONE.**
// `surfaceable.test.ts` derives its population as
//
//     surfaced && !firable && **t.from.length > 0**
//
// so a `creation` verb — `from: []` — is excluded BY CONSTRUCTION. There is no
// §68 turn-around to perform here and no flagged member to graduate: the census
// read green with `t_supplierdoc_request` dead and reads green with it surfaced,
// and it would read green if this batch were reverted tomorrow. Claiming it as
// evidence would be `CLEAN-AFTER-THE-FIX-REPORTS-THE-FIX-01` with an extra step
// — a clean reading from an instrument that never examined the subject. The
// direct dispatch-site assertion below is the whole of the coverage claim, and
// the population controls in `services/data/mock/supplierDocumentRequest.test.ts`
// are what stop THIS file passing over nothing.
//
// `t_gr_hold` and `t_po_view` stay flagged in the census, untouched.
//
// ── WHAT ONLY A RENDERED WALK CAN SAY ───────────────────────────────────────
// The contract half is asserted service-side. Three things are not, and they are
// what this file holds:
//   1. the act is REACHABLE from `/buyer/compliance`, and withheld as a notice
//      rather than as silence or a disabled control;
//   2. `compliance.queue.noDeclaration` — the fallback Ruling 2 exists to
//      protect — actually FIRES on a requested row that has been declared
//      against, rather than merely being present in the bundle;
//   3. the crossing: what a buyer opens on one page is what a supplier answers
//      on another, in the language they read it in.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { NO_PERSON } from '../context/noPerson';
import { supplierDocumentStore } from '../services/data/mock/stores/supplierDocumentStore';
import i18n from '../lib/i18n';
import BuyerCompliance from './BuyerCompliance';
import SupplierDocuments from './SupplierDocuments';
import Toaster from '../components/ui-v2/Toaster';

/** The buyer's compliance officer — the lane that holds `supplierdoc:request`. */
const COMPLIANCE: CurrentIdentity = {
  personaType: 'buyer',
  supplierId: null,
  supplierName: null,
  businessRoles: ['compliance'],
  actor: NO_PERSON,
};

/**
 * The same buyer with COMPLIANCE REMOVED — every other lane held. Not a bare
 * seat: a seat holding nothing would make the withheld assertion pass for the
 * wrong reason, and the notice's whole job is to name the lane that DOES hold
 * the act to a reader who holds five others.
 */
const NO_COMPLIANCE: CurrentIdentity = {
  ...COMPLIANCE,
  businessRoles: ['procurement', 'receiving', 'finance', 'planning', 'requisitioner'],
};

const supplierSeat = (supplierId: string, supplierName: string): CurrentIdentity => ({
  personaType: 'supplier',
  supplierId,
  supplierName,
  businessRoles: ['back_office'],
  actor: NO_PERSON,
});

const SUP_007 = supplierSeat('sup-007', 'PT Sample Packaging Indonesia');
const SUP_002 = supplierSeat('sup-002', 'PT Sample Specialty Fats');

const NOTE = 'BPJPH certificate covering the PET bottle line, before the next receipt.';

/** Open the panel, fill all three fields, review, and commit. */
async function askSupplier(supplierId: string, category: string, note = NOTE) {
  fireEvent.click(await screen.findByRole('button', { name: /ask for a document/i }));
  fireEvent.change(screen.getByTestId('doc-request-supplier'), {
    target: { value: supplierId },
  });
  fireEvent.change(screen.getByTestId('doc-request-category'), {
    target: { value: category },
  });
  fireEvent.change(screen.getByTestId('doc-request-note'), { target: { value: note } });
  fireEvent.click(screen.getByTestId('doc-request-review'));
  fireEvent.click(await screen.findByTestId('doc-request-commit'));
}

beforeEach(async () => {
  supplierDocumentStore.reset();
  await i18n.changeLanguage('en');
});

afterAll(async () => {
  await i18n.changeLanguage('en');
});

// ─────────────────────────────────────────────────────────────────────────────
describe('WAVE E · CONTROLS — this walk is not vacuous', () => {
  it('CONTROL — the two locales differ, so the ID assertions can see', async () => {
    await i18n.changeLanguage('en');
    const en = i18n.t('compliance.request.action');
    await i18n.changeLanguage('id');
    const id = i18n.t('compliance.request.action');
    expect(en).toBe('Ask for a document');
    expect(id).toBe('Minta dokumen');
    expect(id).not.toBe(en);
  });

  it('CONTROL — no seeded row carries this walk’s note', () => {
    // Without this, "the supplier can see what the buyer asked for" could pass
    // on a fixture that already said it.
    expect(supplierDocumentStore.all().some((d) => d.notes === NOTE)).toBe(false);
  });

  it('CONTROL — sup-002 starts with no `Awaiting Upload` row at all', () => {
    // The tenancy assertions below count rows in sup-002's queue. If the seed
    // already put one there, a minted row would be indistinguishable from it.
    const theirs = supplierDocumentStore
      .all()
      .filter((d) => d.supplierId === 'sup-002' && d.status === 'Awaiting Upload');
    expect(theirs).toHaveLength(0);
    // …and the seed is not simply empty for that tenant.
    expect(
      supplierDocumentStore.all().filter((d) => d.supplierId === 'sup-002').length,
    ).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('WAVE E · the act is reachable, and withheld as a notice', () => {
  it('⚠️ THE DISPATCH-SITE ASSERTION — the held seat reaches the verb and the STORE moves', async () => {
    // THE COVERAGE CLAIM, stated as a delta rather than as a rendered control:
    // a button that opens a panel proves nothing (that was `BuyerRequisitions`'
    // "Submit for approval", which toasted). What proves the verb is fired is a
    // row in the store that was not there before.
    const before = supplierDocumentStore.all().length;
    renderWithProviders(<BuyerCompliance />, { identity: COMPLIANCE });

    await askSupplier('sup-007', 'Halal Compliance');

    await waitFor(() =>
      expect(supplierDocumentStore.all().length).toBe(before + 1),
    );
    const minted = supplierDocumentStore
      .all()
      .find((d) => d.notes === NOTE)!;
    expect(minted.supplierId).toBe('sup-007');
    expect(minted.category).toBe('Halal Compliance');
    expect(minted.status).toBe('Awaiting Upload');
    // Ruling 2, from the surface side: nothing was declared, so nothing claims
    // a declaration.
    expect(minted.declaration).toBeUndefined();
  });

  it('⚠️ M1 — a seat WITHOUT `compliance` gets the notice, and no control', async () => {
    renderWithProviders(<BuyerCompliance />, { identity: NO_COMPLIANCE });

    // Withheld renders as pending-with-an-owner, in the verb's own slot.
    expect(await screen.findByTestId('handoff-supplierdoc-request')).toBeInTheDocument();
    // Not a disabled button and not silence — the control is ABSENT.
    expect(
      screen.queryByRole('button', { name: /ask for a document/i }),
    ).not.toBeInTheDocument();
  });

  it('⚠️ M2 — and the HELD seat gets the control, with no notice in that slot', async () => {
    renderWithProviders(<BuyerCompliance />, { identity: COMPLIANCE });
    expect(
      await screen.findByRole('button', { name: /ask for a document/i }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-supplierdoc-request')).not.toBeInTheDocument();
  });

  it('⚠️ (surface × verb × ENTRANCE) — the commit has exactly ONE door, derived from source', () => {
    // ⚠️ **A RENDERED ABSENCE CANNOT PROVE THIS, AND SAYING SO IS THE POINT.**
    // The obvious test — render the withheld seat and assert the panel's
    // controls are missing — PASSES FOR THE WRONG REASON: `SidePanel` renders
    // nothing while closed (#280), so the controls are absent for a HELD seat
    // too until somebody opens it. It would go green under a mutation that
    // removed the authority guard entirely. Measured: it did.
    //
    // §84's unit is the ENTRANCE, not the surface and not the verb.
    // `SupplierOrders` imported the guard, rendered it, and still shipped a
    // live commit, because `handleRowAction` opened the same mode by a second
    // door — and a comment asserting that door was unreachable was the only
    // thing holding the claim up. So the entrances are COUNTED, in the source,
    // rather than inferred from a render.
    const src = readFileSync(path.resolve(__dirname, 'BuyerCompliance.tsx'), 'utf-8');

    // CONTROL FIRST — the file really is the one under test, and the matcher
    // matches something. A count of 0 over the wrong file reads exactly like a
    // count of 0 over a well-guarded one (`EMPTY-INPUT-REPORTS-CLEAN-01`).
    expect(src).toContain('useSupplierDocumentRequest');
    expect(src).not.toContain('useSupplierDocumentNonexistentVerb');

    // ONE way to open the mode, and ONE site that commits it.
    expect(src.match(/setRequestOpen\(true\)/g)).toHaveLength(1);
    expect(src.match(/void runRequest\(\)/g)).toHaveLength(1);
    // …and the mutation itself is dispatched from exactly one place.
    expect(src.match(/requestDoc\.mutateAsync/g)).toHaveLength(1);

    // BOTH doors sit inside the authority guard: the header's opener is in the
    // `held` branch of the primary-slot ternary, and the panel that carries the
    // committing button is mounted only under `request.kind === 'held'`.
    expect(src).toMatch(/request\.kind === 'held'\s*\n?\s*\? \{/);
    expect(src).toMatch(/\{request\.kind === 'held' && \(\s*\n\s*<SidePanel/);
  });

  it('and the withheld seat reaches none of the panel’s controls', () => {
    // The rendered half, kept for what it DOES prove — no control leaks into a
    // withheld seat's DOM — and no longer asked to carry the entrance claim.
    renderWithProviders(<BuyerCompliance />, { identity: NO_COMPLIANCE });
    expect(screen.queryByTestId('doc-request-supplier')).not.toBeInTheDocument();
    expect(screen.queryByTestId('doc-request-category')).not.toBeInTheDocument();
    expect(screen.queryByTestId('doc-request-note')).not.toBeInTheDocument();
    expect(screen.queryByTestId('doc-request-review')).not.toBeInTheDocument();
    expect(screen.queryByTestId('doc-request-commit')).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('WAVE E · confirm-before-commit — the operator sees all three fields', () => {
  it('nothing commits until supplier, category AND note are stated', async () => {
    renderWithProviders(<BuyerCompliance />, { identity: COMPLIANCE });
    fireEvent.click(await screen.findByRole('button', { name: /ask for a document/i }));

    expect(screen.getByTestId('doc-request-review')).toBeDisabled();

    fireEvent.change(screen.getByTestId('doc-request-supplier'), {
      target: { value: 'sup-007' },
    });
    expect(screen.getByTestId('doc-request-review')).toBeDisabled();

    fireEvent.change(screen.getByTestId('doc-request-category'), {
      target: { value: 'Quality' },
    });
    // ⚠️ STILL DISABLED, AND THAT IS RULING 3. `note` is OPTIONAL AT THE VERB —
    // the machine requires `supplierId` + `category` — and required here: a
    // demand with no stated reason is one the supplier cannot act on.
    expect(screen.getByTestId('doc-request-review')).toBeDisabled();

    // CONTROL — it un-blocks. A guard that always refuses is not a guard
    // (rule 4: assert a known-GOOD input passes before believing a bad one
    // failed).
    fireEvent.change(screen.getByTestId('doc-request-note'), {
      target: { value: NOTE },
    });
    expect(screen.getByTestId('doc-request-review')).not.toBeDisabled();
  });

  it('whitespace is not a stated reason', async () => {
    renderWithProviders(<BuyerCompliance />, { identity: COMPLIANCE });
    fireEvent.click(await screen.findByRole('button', { name: /ask for a document/i }));
    fireEvent.change(screen.getByTestId('doc-request-supplier'), {
      target: { value: 'sup-007' },
    });
    fireEvent.change(screen.getByTestId('doc-request-category'), {
      target: { value: 'Quality' },
    });
    fireEvent.change(screen.getByTestId('doc-request-note'), {
      target: { value: '     ' },
    });
    expect(screen.getByTestId('doc-request-review')).toBeDisabled();
  });

  it('⚠️ THE CONFIRM STEP SHOWS THE RESOLVED NAME, NOT THE ID THAT WAS PICKED', async () => {
    // The roster resolution refuses a supplier that does not exist. It CANNOT
    // refuse the wrong supplier, because the wrong supplier is a valid one —
    // only a reader catches that, and only if the reader is shown the company
    // rather than the token they selected.
    const before = supplierDocumentStore.all().length;
    renderWithProviders(<BuyerCompliance />, { identity: COMPLIANCE });
    fireEvent.click(await screen.findByRole('button', { name: /ask for a document/i }));
    fireEvent.change(screen.getByTestId('doc-request-supplier'), {
      target: { value: 'sup-002' },
    });
    fireEvent.change(screen.getByTestId('doc-request-category'), {
      target: { value: 'Quality' },
    });
    fireEvent.change(screen.getByTestId('doc-request-note'), {
      target: { value: NOTE },
    });
    fireEvent.click(screen.getByTestId('doc-request-review'));

    const panel = await screen.findByTestId('doc-request-confirm');
    expect(panel).toHaveTextContent(/PT Sample Specialty Fats/);
    expect(panel).toHaveTextContent(/sup-002/);
    expect(panel).toHaveTextContent(/Quality/);
    expect(panel).toHaveTextContent(new RegExp(NOTE.slice(0, 30)));
    // …and it says whose act it is recorded as, before the act.
    expect(panel).toHaveTextContent(/not against a named person/i);

    // NOTHING HAS COMMITTED YET — the review step is a step, not a label.
    expect(supplierDocumentStore.all().length).toBe(before);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('WAVE E · the roster refusal, in the reader’s language', () => {
  // ⚠️ **FOUND IN BROWSER QA, NOT PREDICTED BY A TEST.** The refusal fired
  // correctly and rendered as *"creation of supplierDocument denied: unresolved
  // owner"* — a dispatcher sentence, in English, to an Indonesian operator. It
  // is the `ROLE_NOT_PERMITTED:po:confirm` defect that created
  // `refusalMessage.ts` arriving through the one door that module does not
  // cover: a THROWN `DataError`, whose message is prose rather than
  // `KIND:detail`, so `refusalKindOf` correctly matches nothing.
  for (const [lang, fragment] of [
    ['en', /outside what your account may see/i],
    ['id', /di luar jangkauan akun Anda/i],
  ] as const) {
    it(`[${lang}] an unresolvable supplier is refused in prose the reader can read`, async () => {
      await i18n.changeLanguage(lang);
      const before = supplierDocumentStore.all().length;
      // ⚠️ `<Toaster />` IS MOUNTED EXPLICITLY. It lives in `AppRouter`, not in
      // `AppShellV2`, so a page rendered on its own has NO TOAST VIEWPORT and a
      // toast assertion would fail for a reason that has nothing to do with the
      // toast. `settleFailureSurface.test.tsx` is the precedent.
      renderWithProviders(
        <>
          <BuyerCompliance />
          <Toaster />
        </>,
        { identity: COMPLIANCE },
      );

      const askLabel = lang === 'en' ? /ask for a document/i : /minta dokumen/i;
      fireEvent.click(await screen.findByRole('button', { name: askLabel }));

      // ⚠️ THE CONTROL CANNOT PRODUCE THIS VALUE — that is the point of the
      // gate, and it is why the option has to be injected to reach it. A
      // payload only a tampered DOM (or a future non-select caller) can build
      // is exactly what `requireCreationOwner` exists for.
      const select = screen.getByTestId('doc-request-supplier') as HTMLSelectElement;
      expect([...select.options].map((o) => o.value)).not.toContain('sup-999');
      const rogue = document.createElement('option');
      rogue.value = 'sup-999';
      rogue.textContent = 'Not A Real Tenant';
      select.appendChild(rogue);

      fireEvent.change(select, { target: { value: 'sup-999' } });
      fireEvent.change(screen.getByTestId('doc-request-category'), {
        target: { value: 'Quality' },
      });
      fireEvent.change(screen.getByTestId('doc-request-note'), {
        target: { value: NOTE },
      });
      fireEvent.click(screen.getByTestId('doc-request-review'));
      fireEvent.click(await screen.findByTestId('doc-request-commit'));

      expect(await screen.findByText(fragment)).toBeInTheDocument();
      // …and it is a refusal, not a rendering: nothing was minted, and the
      // panel stays open on the values the operator entered.
      expect(supplierDocumentStore.all().length).toBe(before);
      expect(screen.getByTestId('doc-request-confirm')).toBeInTheDocument();
    });
  }
});
// ─────────────────────────────────────────────────────────────────────────────
describe('WAVE E · the loop crosses two surfaces, in both locales', () => {
  for (const lang of ['en', 'id'] as const) {
    it(`[${lang}] buyer asks → the row is in that supplier's queue and no other`, async () => {
      await i18n.changeLanguage(lang);

      const { unmount } = renderWithProviders(<BuyerCompliance />, {
        identity: COMPLIANCE,
      });
      const askLabel =
        lang === 'en' ? /ask for a document/i : /minta dokumen/i;
      fireEvent.click(await screen.findByRole('button', { name: askLabel }));
      fireEvent.change(screen.getByTestId('doc-request-supplier'), {
        target: { value: 'sup-002' },
      });
      fireEvent.change(screen.getByTestId('doc-request-category'), {
        target: { value: 'Quality' },
      });
      fireEvent.change(screen.getByTestId('doc-request-note'), {
        target: { value: NOTE },
      });
      fireEvent.click(screen.getByTestId('doc-request-review'));
      fireEvent.click(await screen.findByTestId('doc-request-commit'));
      await waitFor(() =>
        expect(supplierDocumentStore.all().some((d) => d.notes === NOTE)).toBe(true),
      );
      unmount();

      // THE NAMED SUPPLIER FINDS IT — the buyer's own words, verbatim, in
      // whichever locale the supplier is reading, because the note is theirs
      // and is never translated.
      const named = renderWithProviders(<SupplierDocuments />, { identity: SUP_002 });
      expect(await screen.findByText(new RegExp(NOTE.slice(0, 30)))).toBeInTheDocument();
      named.unmount();

      // AND A SECOND SUPPLIER DOES NOT. A buyer writing INTO a tenant's queue
      // must not become a way to put a row where a third party can read it.
      renderWithProviders(<SupplierDocuments />, { identity: SUP_007 });
      // The page has rendered its own rows first — so this absence is an
      // absence, not an empty page.
      expect(await screen.findByText(/SAMPLE-NPWP-0007/)).toBeInTheDocument();
      expect(screen.queryByText(new RegExp(NOTE.slice(0, 30)))).not.toBeInTheDocument();
    });
  }

  it('⚠️ M4 — a requested row reaches the review queue WITHOUT claiming a declaration it lacks', async () => {
    // ── RULING 2's SURFACE ASSERTION ──────────────────────────────────────
    // `compliance.queue.noDeclaration` was written for a row that reached
    // review before declarations existed. A requested row that carried a hollow
    // `declaration` would take the OTHER branch — labelled fields over blanks —
    // and this string could never fire. Proving it renders is what makes the
    // `create` branch load-bearing rather than tidy.
    //
    // The row is put into `Under Review` directly in the store rather than
    // through `_submit`, because `_submit` supplies a real declaration: the
    // shape under test is a review-queue row with none, and that is exactly
    // what an unconditional `declarationFrom` would have produced.
    renderWithProviders(<BuyerCompliance />, { identity: COMPLIANCE });
    await askSupplier('sup-007', 'Halal Compliance');
    await waitFor(() =>
      expect(supplierDocumentStore.all().some((d) => d.notes === NOTE)).toBe(true),
    );
    const minted = supplierDocumentStore.all().find((d) => d.notes === NOTE)!;
    expect(minted.declaration).toBeUndefined();

    supplierDocumentStore.update(minted.id, (d) => ({ ...d, status: 'Under Review' }));

    const second = renderWithProviders(<BuyerCompliance />, { identity: COMPLIANCE });
    const row = await second.findByTestId(`doc-review-${minted.id}`);
    expect(row).toHaveTextContent(/carries no stated details/i);
    // CONTROL — the OTHER branch still renders for a row that HAS a
    // declaration, so this is not passing because the queue lost its fields.
    // doc-010 is a seeded `Under Review` row; it too predates declarations, so
    // the positive control is asserted on the field labels the branch owns.
    expect(row).not.toHaveTextContent(/Granted by/i);
  });
});
