import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import type { IDataService } from '../services/data/types';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import { quotationStore } from '../services/data/mock/stores/quotationStore';
import { rfqStore } from '../services/data/mock/stores/rfqStore';
import i18n from '../lib/i18n';
import BuyerSourcing from './BuyerSourcing';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// Buyer-only aggregate — empty is reached by an empty RFQ result, not a persona.
const noRfqs: IDataService = {
  ...mockDataService,
  procurement: new Proxy(mockDataService.procurement, {
    get(target, prop, receiver) {
      if (prop === 'getRFQs') return async () => ({ items: [] });
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }),
};

describe('BuyerSourcing — four honest states', () => {
  it('data: renders the sourcing workspace with wired reads', async () => {
    renderWithProviders(<BuyerSourcing />);
    // KPI strip only renders in the data branch.
    expect(await screen.findByText('Ready to Award')).toBeInTheDocument();
    expect(screen.getByText('Awaiting Response')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<BuyerSourcing />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Ready to Award')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<BuyerSourcing />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState when there are no RFQs', async () => {
    renderWithProviders(<BuyerSourcing />, { service: noRfqs });
    expect(await screen.findByText('No sourcing events yet')).toBeInTheDocument();
  });
});

// ── CP-0 · W1 · 2e-b-1a — the buyer is ranking on ESTIMATES, and is told so ──
// The lead time is a REQUIRED ESTIMATE at quote stage: a supplier cannot firmly
// commit before final quantity, PO date and capacity are known, so forcing
// "firm" would buy false precision. It is still scored and still ranked on —
// the tag exists so the buyer does not read it as firmer than it is. The firm
// date is confirmed at PO (a separate arc).
//
// The tag reuses the existing honest-marker grammar on ComparisonRow rather
// than inventing a rival one; "Simulated" (no live source) and "Estimated"
// (real data, indicative at this stage) are DIFFERENT qualifiers sharing it.
describe('BuyerSourcing — the lead-time axis is labelled an estimate', () => {
  const openComparison = async () => {
    renderWithProviders(<BuyerSourcing />);
    // rfq-011 is the neutral award fixture — two quotes separable only on lead
    // time, so the comparison drawer is where the label matters most.
    fireEvent.click(await screen.findByText('RFQ-2026-011'));
    return screen.findByText(/QUOTE COMPARISON/i);
  };

  it('POSITIVE TWIN — the lead-time value is still shown, and still scored', async () => {
    await openComparison();
    // The label does not hide the number or the score; qt-011a promises 4 days.
    expect(screen.getByText(/4 days/)).toBeInTheDocument();
    expect(screen.getByText('Lead Time Score')).toBeInTheDocument();
  });

  it('tags BOTH lead-time rows Estimated — the value and the score it drives', async () => {
    await openComparison();
    // Two rows carry it: the raw promise and the axis derived from it. A score
    // presented bare would be the firmer-looking of the two.
    expect(screen.getAllByText('Estimated')).toHaveLength(2);
  });

  it('explains the tag on hover — indicative now, firm at PO, still ranked on', async () => {
    await openComparison();
    const [tag] = screen.getAllByText('Estimated');
    expect(tag).toHaveAttribute(
      'title',
      expect.stringMatching(/confirms a firm delivery date at PO/i),
    );
    // And says plainly that labelling did not weaken the math.
    expect(tag.getAttribute('title')).toMatch(/Still scored and ranked on/i);
  });

  it('does NOT tag price — an offered price IS a commitment, and must not read as soft', async () => {
    await openComparison();
    // The negation that gives the tag meaning: if everything were "Estimated",
    // nothing would be.
    expect(screen.getByText('Unit Price')).toBeInTheDocument();
    expect(screen.getAllByText('Estimated')).toHaveLength(2); // not 3, not 5
  });
});

// ── CP-0 · W1 · 2e-b-2 — the buyer can finally SEE the supplier's minimum ────
// FIND-02's consequence on this surface: the quote form collected a minimum
// order quantity and dropped it before the payload, so the comparison a buyer
// awards from could not show it at all. Where a supplier's minimum EXCEEDS the
// RFQ quantity that is a real constraint on the bid — a buyer without it can
// award a quote that cannot be ordered at the quantity being sourced.
//
// Display only this batch, by dispatch. Whether a minimum above the RFQ
// quantity should warn, flag or block the award is MOQ-FIND-01.
describe('BuyerSourcing — the minimum order quantity reaches the comparison', () => {
  beforeEach(() => {
    quotationStore.reset();
    rfqStore.reset();
  });

  const openComparison = async () => {
    renderWithProviders(<BuyerSourcing />);
    fireEvent.click(await screen.findByText('RFQ-2026-011'));
    return screen.findByText(/QUOTE COMPARISON/i);
  };

  it('THE LOCK — a minimum submitted through the real spine lands in the comparison', async () => {
    // The whole chain, end to end: the dispatcher + store the supplier's submit
    // goes through, then the buyer surface reading it back. A value preserved in
    // the payload but invisible here would still be a dropped constraint.
    await new MockCommandService().dispatch(
      { personaType: 'supplier', supplierId: 'sup-007' },
      {
        transitionId: 't_quotation_submit',
        entity: 'quotation',
        payload: {
          rfqId: 'rfq-011',
          supplierId: 'sup-007',
          unitPrice: 14_000,
          leadTimeDays: 6,
          moq: 100_000,
          validUntil: '2026-06-30',
        },
      },
    );
    await openComparison();

    expect(screen.getByText('Min. Order Qty')).toBeInTheDocument();
    // 100,000 PCS against an RFQ for 80,000 — the case JJ named: a minimum that
    // EXCEEDS what is being sourced. Shown as a fact, with no verdict attached.
    expect(screen.getByText(/100\.000 PCS/)).toBeInTheDocument();
  });

  it('a quote with no stated minimum reads as an ANSWER, not as missing data', async () => {
    // qt-011a (the incumbent) states none, like every quote minted before this
    // batch. The cell says so in words — never a dash, and never a 0, which
    // would be a commercial term nobody offered.
    await openComparison();
    expect(screen.getByText('No minimum stated')).toBeInTheDocument();
    expect(screen.queryByText(/^0 PCS$/)).not.toBeInTheDocument();
  });

  it('the row carries NO honest-marker tag — this is stated supplier fact', async () => {
    // The negation that keeps the tag vocabulary meaningful: "Estimated" belongs
    // to the lead time (indicative until PO) and "Simulated" to the axes with no
    // live source. A minimum order quantity is neither — the supplier typed it.
    await openComparison();
    expect(screen.getAllByText('Estimated')).toHaveLength(2); // lead time + its score
  });
});

// ── CP-0 · W1 · 2e-b-4b — the wizard's numeric inputs, and why the TYPE is the
// test ─────────────────────────────────────────────────────────────────────────
//
// 4a shipped a correct parser that the surface never fed. `type="number"` lets
// the BROWSER rewrite the value per its own locale before React sees it, so on
// an id-ID browser "2.400" reached the review step as 2,4 — the parser was
// bypassed, not wrong. The gate cannot refuse what it never sees.
//
// That failure is invisible in this suite's locale AND in jsdom: en-US Chrome
// hands `.value` back as "2.400" verbatim, and jsdom does no locale parsing at
// all. So a behavioural spec typing "2.400" would have passed on a surface that
// was broken in production — a green test over a live defect, the exact trap
// this arc keeps hitting.
//
// The durable lock is therefore the INPUT CONTRACT itself: assert `type="text"`
// + `inputMode`, because that is the property whose absence caused the smoke to
// fail, and it is locale-independent and jsdom-visible. The behavioural specs
// below stack on top and are honest about what they can and cannot prove.
describe('BuyerSourcing — the RFQ wizard numerics are text, so the parser is load-bearing', () => {
  const openWizard = async () => {
    renderWithProviders(<BuyerSourcing />);
    fireEvent.click(await screen.findByText('New RFQ'));
    return {
      qty: await screen.findByLabelText('Total quantity'),
      budget: await screen.findByLabelText('Estimated budget (IDR)'),
    };
  };

  it('THE LOCK — neither numeric input is type="number" (Ruling 6.2)', async () => {
    const { qty, budget } = await openWizard();
    // The regression that 2e-b-4a's smoke caught. A `type="number"` here means
    // the browser adjudicates the separators this field exists to adjudicate.
    expect(qty).toHaveAttribute('type', 'text');
    expect(budget).toHaveAttribute('type', 'text');
    expect(qty).toHaveAttribute('inputmode', 'decimal');
    expect(budget).toHaveAttribute('inputmode', 'decimal');
    // `min` was part of the number-input contract; positivity now lives in
    // `isStepValid`, where it is actually enforced.
    expect(qty).not.toHaveAttribute('min');
  });

  it('POSITIVE TWIN — a readable quantity is accepted and raises no refusal', async () => {
    const { qty } = await openWizard();
    fireEvent.change(qty, { target: { value: '2400' } });
    expect(screen.queryByTestId('rfq-qty-refusal')).not.toBeInTheDocument();
  });

  it('a cross-convention quantity REFUSES on the field, naming the ambiguity', async () => {
    const { qty } = await openWizard();
    fireEvent.change(qty, { target: { value: '2.400' } });
    const refusal = screen.getByTestId('rfq-qty-refusal');
    expect(refusal).toHaveAttribute('role', 'alert');
    expect(refusal.textContent).toMatch(/can be read two ways/i);
    expect(qty).toHaveAttribute('aria-invalid', 'true');
  });

  it('an untouched blank quantity does NOT nag — it refuses at the gate instead', async () => {
    const { qty } = await openWizard();
    expect(qty).toHaveValue('');
    expect(screen.queryByTestId('rfq-qty-refusal')).not.toBeInTheDocument();
  });

  it('an unreadable BUDGET refuses rather than silently becoming "not specified"', async () => {
    // The worst case of the retired input type: a blank is LEGAL here, so a
    // browser that erased the token would have downgraded a stated budget to
    // the unstated default with nobody told.
    const { budget } = await openWizard();
    fireEvent.change(budget, { target: { value: 'TBC' } });
    expect(screen.getByTestId('rfq-budget-refusal').textContent).toMatch(
      /not an amount/i,
    );
  });

  it('a blank budget raises no refusal — absence is this field\u2019s answer', async () => {
    const { budget } = await openWizard();
    expect(budget).toHaveValue('');
    expect(screen.queryByTestId('rfq-budget-refusal')).not.toBeInTheDocument();
  });
});

// ── CP-0 · W1 · 2e-b-3 (COS-04) — the shadowing formatters are retired ───────
//
// This file carried its own `formatIDR`, `formatNumber` and `formatDate`, each a
// near-copy of the `lib/format` primitive of the SAME NAME with DIFFERENT
// behaviour. The consequential one was `formatDate`, which hardcoded `en-GB`:
// the buyer's dates stayed English in Indonesian mode while every migrated page
// localised, and it dropped the `Asia/Jakarta` pin so output depended on the
// runner's timezone.
//
// Confirmed display-only before being touched: the formatters are file-private
// (not exported), and only the default component is imported anywhere, so there
// is no shared surface to widen. Nothing stored, ranked or dispatched reads them.
describe('BuyerSourcing — dates localise (COS-04, the en-GB hardcode)', () => {
  it('renders month abbreviations in Indonesian when the UI is Indonesian', async () => {
    await i18n.changeLanguage('id');
    try {
      renderWithProviders(<BuyerSourcing />);
      // rfq-001's response deadline is 2026-05-20. id-ID abbreviates May as
      // "Mei"; the retired local formatter printed "May" in both languages.
      expect((await screen.findAllByText(/20 Mei 2026/)).length).toBeGreaterThan(0);
      // The retired output. Nothing on this surface may still say "May" in ID.
      expect(screen.queryAllByText(/20 May 2026/)).toHaveLength(0);
    } finally {
      await i18n.changeLanguage('en');
    }
  });

  it('POSITIVE TWIN — English output is unchanged (en-GB day-month-year kept)', async () => {
    renderWithProviders(<BuyerSourcing />);
    expect((await screen.findAllByText(/20 May 2026/)).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/20 Mei 2026/)).toHaveLength(0);
  });
});

// ── CP-0 · 2e-c-1 — a bid the model cannot price says so ─────────────────────
//
// The batch widened `Quotation.currency` to the three currencies the operator
// permits, while the should-cost engine still prices two. That gap is deliberate
// (policy is wider than capability — see currencyPolicy.ts), and this is the
// surface where the two meet.
//
// The failure being prevented is NOT a missing label. It is the coercion these
// tests make impossible: routing a euro price into the IDR branch, where it
// would be measured against a rupiah should-cost band and rendered as a
// perfectly confident percentage. RFQ-2026-009 is the right probe precisely
// because it DOES produce a spread — mapped material, mass unit, priced
// currency — so a silence here can only be the currency gate.
describe('BuyerSourcing — the should-cost spread refuses an unpriceable currency', () => {
  beforeEach(() => {
    quotationStore.reset();
    rfqStore.reset();
  });

  const openComparison = async () => {
    renderWithProviders(<BuyerSourcing />);
    fireEvent.click(await screen.findByText('RFQ-2026-009'));
    return screen.findByText(/QUOTE COMPARISON/i);
  };

  it('BASELINE — a USD quote on this RFQ still renders a real spread', async () => {
    // Without this, every assertion below could pass because the spread was
    // silent for some unrelated reason and nobody noticed.
    await openComparison();
    expect(screen.getAllByText(/vs modeled ~/).length).toBeGreaterThan(0);
    expect(
      screen.queryByText(/currency the model does not price/),
    ).not.toBeInTheDocument();
  });

  it('THE LOCK — a EUR quote gets honest silence, never a coerced percentage', async () => {
    quotationStore.update('qt-009a', (q) => ({ ...q, currency: 'EUR' }));
    await openComparison();

    expect(
      screen.getByText(/No should-cost reference — quoted in a currency the model does not price/),
    ).toBeInTheDocument();
    // Its USD sibling is untouched: the gate is per-quote, not per-comparison.
    expect(screen.getAllByText(/vs modeled ~/).length).toBe(1);
  });

  it('names the CURRENCY as the reason, not one of the three that would be false', async () => {
    // The material IS mapped, is NOT tail, and IS priced by weight. Reusing any
    // existing silence here would have been a cheaper diff and a false statement
    // about why the buyer has no reference.
    quotationStore.update('qt-009a', (q) => ({ ...q, currency: 'EUR' }));
    await openComparison();

    expect(screen.queryByText(/not yet mapped to a basket/)).not.toBeInTheDocument();
    expect(screen.queryByText(/tail material/)).not.toBeInTheDocument();
    expect(screen.queryByText(/priced per unit, not by weight/)).not.toBeInTheDocument();
  });

  it('still shows the buyer the PRICE — only the modeled reference is withheld', async () => {
    // Honest silence is scoped: the engine cannot price a euro against a basket,
    // which says nothing about the supplier's own quoted number. Blanking the
    // price too would hide a stated fact behind a modeling limitation.
    quotationStore.update('qt-009a', (q) => ({ ...q, currency: 'EUR' }));
    await openComparison();
    // Both the unit price and the line total keep rendering in the bid's own
    // currency — the euro sign is on the surface, not suppressed with the model.
    expect(screen.getAllByText(/€/).length).toBe(2);
  });

  // ⚠ WITNESS TEST — 2e-c-1-FIND-01. This asserts a DEFECT, on purpose.
  //
  // `formatMoney` is a USD-vs-domestic binary, so EUR falls into the domestic
  // branch and inherits `maximumFractionDigits: 0`. A €2.85/KG bid therefore
  // renders as "€3" — not a formatting blemish but a ~5% misstatement of the
  // supplier's price, on the very cell a buyer awards from.
  //
  // It is unreachable in production today: no fixture carries EUR and the
  // currency does not survive submit, so this test has to reach into the store
  // to construct the case at all. It is locked here so that the day someone
  // makes EUR storable (2e-c-2) this test fails and forces the decision, rather
  // than the rounding shipping quietly behind a green suite.
  //
  // TO FIX: give EUR its own locale and 2 fraction digits in `formatMoney`, then
  // rewrite this test to assert "€2,85". The locale choice is an operator
  // ruling — see docs/findings.md.
  it('WITNESS (2e-c-1-FIND-01) — a EUR price is currently ROUNDED TO THE UNIT', async () => {
    quotationStore.update('qt-009a', (q) => ({ ...q, currency: 'EUR' }));
    await openComparison();
    // €2.85 → "€3". The correct output is "€2,85".
    expect(screen.getByText('€3/KG')).toBeInTheDocument();
    // The USD sibling is unaffected — it has the branch with 2 decimals.
    expect(screen.getByText('$2.70/KG')).toBeInTheDocument();
  });

  it('renders the refusal in Indonesian too', async () => {
    quotationStore.update('qt-009a', (q) => ({ ...q, currency: 'EUR' }));
    await i18n.changeLanguage('id');
    try {
      // Deliberately NOT reusing `openComparison` — its wait anchors on the
      // English panel heading, which is exactly what changes under ID.
      renderWithProviders(<BuyerSourcing />);
      fireEvent.click(await screen.findByText('RFQ-2026-009'));
      expect(
        await screen.findByText(/mata uang yang tidak dihargai model/),
      ).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
