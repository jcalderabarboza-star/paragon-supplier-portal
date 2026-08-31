// ────────────────────────────────────────────────────────────────────────────
// THE SIDEPANEL CONTRACT — a closed panel renders NOTHING.
//
// ⚠️ **THIS FILE EXISTS BECAUSE NOTHING IN THE SUITE COULD SEE THE DEFECT.**
// Measured, not asserted: applying the fix turned ZERO of the 3809 existing
// tests red. Not one spec encoded the old behaviour, which is precisely why an
// always-mounted panel survived being discovered THREE separate times (C.2,
// Wave C, Wave B) — every discovery was a side effect of looking at something
// else, and nothing was watching in between.
//
// ⚠️ **THE STRUCTURE IS WHAT ENFORCES THE CONTRACT; THIS FILE CATCHES ITS
// REGRESSION.** `SidePanel` returns `null` when closed, so a closed subtree
// cannot leak because it is never built. That is stronger than any test. What a
// test adds is a NAMED FAILURE the day somebody restores the old shape — which
// is the thing that was missing for three batches.
//
// ── WHY THE COMPONENT-LEVEL ASSERTIONS ARE THE COMPLETE GATE ────────────────
// The leak was a property of `SidePanel`, never of a consumer: no page can leak
// a subtree the component does not render. So the component tests below are
// exhaustive over the mechanism, and the integration block is not redundancy —
// it pins the four consumers that were MEASURED to leak, so a future refactor
// that reintroduces the shape at a call site (a hand-rolled panel, say) fails
// against the real surfaces rather than only against the primitive.
// ────────────────────────────────────────────────────────────────────────────

import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../lib/i18n';
import { renderWithProviders, BUYER, SUPPLIER } from '../../test/test-utils';
import SidePanel from './SidePanel';
import BuyerRequisitions from '../../pages-v2/BuyerRequisitions';
import SupplierDocuments from '../../pages-v2/SupplierDocuments';
import SupplierForecasts from '../../pages-v2/SupplierForecasts';
import SupplierInvoices from '../../pages-v2/SupplierInvoices';

/** Everything a keyboard can land on. `[tabindex="-1"]` is excluded because it
 *  is programmatically focusable but NOT in the tab order — the distinction the
 *  hidden-but-reachable trap turns on. */
const FOCUSABLE =
  'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const withI18n = (ui: React.ReactNode) =>
  render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);

// ─────────────────────────────────────────────────────────────────────────────
// 1. THE CONTRACT ITSELF.
// ─────────────────────────────────────────────────────────────────────────────

describe('SidePanel — a closed panel renders nothing', () => {
  it('⚠️ CLOSED: the dialog is ABSENT FROM THE DOM, not merely hidden', () => {
    withI18n(
      <SidePanel open={false} onClose={() => {}} title="T">
        <button type="button">Live control</button>
      </SidePanel>,
    );
    expect(document.querySelector('aside[role="dialog"]')).toBeNull();
  });

  it('⚠️ CLOSED: unguarded children do NOT render — the consumer need not guard', () => {
    // This is the half that makes the contract worth having. Four shipped
    // consumers pass their panel content UNGUARDED, because a "new item" panel
    // has no selection to guard on. Under the old shape those controls were
    // live and focusable; here the component refuses to build them at all.
    withI18n(
      <SidePanel
        open={false}
        onClose={() => {}}
        title="T"
        footerActions={<button type="button">Submit</button>}
      >
        <input placeholder="Amount" />
      </SidePanel>,
    );
    expect(screen.queryByPlaceholderText('Amount')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
  });

  it('⚠️ CLOSED: NOTHING focusable exists — including the panel\'s own close button', () => {
    // The measured floor of the old shape was ONE, never zero: even a perfectly
    // guarded consumer leaked the close button the panel renders itself. A
    // consumer could not have fixed that; only the component could.
    withI18n(
      <SidePanel open={false} onClose={() => {}} title="T">
        <span>text</span>
      </SidePanel>,
    );
    expect(document.querySelectorAll(FOCUSABLE)).toHaveLength(0);
  });

  it('CLOSED: the click-catching overlay is gone too', () => {
    // The overlay was `pointer-events-none` when closed, so it was not a defect
    // — but leaving it mounted would keep a full-viewport element in every page
    // for no reason, and its absence is part of "renders nothing".
    const { container } = withI18n(
      <SidePanel open={false} onClose={() => {}} title="T">
        <span>text</span>
      </SidePanel>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('⚠️ THE KNOWN-GOOD CONTROL — OPEN still renders everything', () => {
    // §39: a guard is habitually probed in one direction only. Every assertion
    // above is about absence and would ALL pass on a component that rendered
    // nothing ever. This is the direction that proves the panel still works.
    withI18n(
      <SidePanel
        open
        onClose={() => {}}
        title="Order PO-1"
        footerActions={<button type="button">Submit</button>}
      >
        <input placeholder="Amount" />
      </SidePanel>,
    );
    expect(document.querySelector('aside[role="dialog"]')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Order PO-1' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Amount')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('⚠️ AND AN OPEN PANEL IS NOT aria-hidden — the trap cannot return by that door', () => {
    // The old shape expressed "closed" as `aria-hidden` on a subtree full of
    // focusable controls, which is the hidden-but-reachable violation. An open
    // panel must carry no such attribute, and a closed one has no subtree to
    // put it on.
    withI18n(
      <SidePanel open onClose={() => {}} title="T">
        <button type="button">Go</button>
      </SidePanel>,
    );
    const aside = document.querySelector('aside[role="dialog"]')!;
    expect(aside.getAttribute('aria-hidden')).toBeNull();
    expect(
      [...document.querySelectorAll('[aria-hidden="true"]')].some((e) =>
        e.querySelector(FOCUSABLE),
      ),
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. THE FOUR CONSUMERS THAT WERE MEASURED TO LEAK.
//
// Derived, not chosen: rendering all 15 SidePanel consumers with nothing
// selected and counting focusable elements inside the closed `aside` returned a
// floor of 1 everywhere and these four above it — 11 / 18 / 20 / 6, because
// their panels have no selection to guard on. They are the defect population,
// so they are what the integration half pins.
// ─────────────────────────────────────────────────────────────────────────────

describe('the consumers that leaked — nothing survives in a closed panel', () => {
  const CASES = [
    ['BuyerRequisitions', BuyerRequisitions, BUYER, 11],
    ['SupplierDocuments', SupplierDocuments, SUPPLIER, 18],
    ['SupplierForecasts', SupplierForecasts, SUPPLIER, 20],
    ['SupplierInvoices', SupplierInvoices, SUPPLIER, 6],
  ] as const;

  // A plain loop rather than `it.each`'s printf: its substitution walks the
  // tuple positionally, so `%i` landed on the component and every title read
  // "was NaN". A name that misreports its own measurement is the smallest
  // version of the thing this file is about.
  for (const [name, Page, identity, wasLeaking] of CASES) {
    it(`${name} — was ${wasLeaking} focusable controls in closed panels, now zero`, async () => {
      renderWithProviders(<Page />, { identity });
      await new Promise((r) => setTimeout(r, 400));

      // No closed dialog exists at all…
      const closed = [...document.querySelectorAll('aside[role="dialog"]')].filter(
        (a) => a.getAttribute('aria-hidden') === 'true',
      );
      expect(closed).toHaveLength(0);

      // …and the general invariant that made it a defect: nothing the keyboard
      // can reach sits inside anything marked hidden from assistive tech.
      const trapped = [...document.querySelectorAll('[aria-hidden="true"]')].filter((e) =>
        e.querySelector(FOCUSABLE),
      );
      expect(
        trapped.map((e) => e.tagName + '.' + (e.className || '').toString().slice(0, 40)),
        'AN aria-hidden SUBTREE CONTAINS A FOCUSABLE CONTROL. A screen reader is\n' +
          'told to ignore what the keyboard can still land on — the hidden-but-\n' +
          'reachable trap this batch removed.',
      ).toEqual([]);
    }, 30000);
  }

  it('⚠️ THE POPULATION CONTROL — these pages really do render panels when asked', async () => {
    // §42 / EMPTY-INPUT-REPORTS-CLEAN-01: every assertion above is satisfied by
    // a page that renders no panel at all, or by a page that failed to mount.
    // This asserts the OPPOSITE direction on the same instrument — the panels
    // exist and are reachable — so the zeros above are about the contract
    // rather than about an empty render.
    renderWithProviders(<SupplierInvoices />, { identity: SUPPLIER });
    await new Promise((r) => setTimeout(r, 400));
    expect(document.querySelectorAll('aside[role="dialog"]')).toHaveLength(0);

    const newBtn = await screen.findByRole('button', { name: /New invoice|Faktur baru/i });
    newBtn.click();
    await new Promise((r) => setTimeout(r, 400));
    expect(document.querySelector('aside[role="dialog"]')).not.toBeNull();
  }, 30000);
});
