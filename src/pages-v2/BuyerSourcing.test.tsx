import { screen, fireEvent, waitFor } from '@testing-library/react';
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
          currency: 'IDR', // required since 2e-c-2
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

  // 2e-c-1-FIND-01 — RESOLVED (2e-c-2). This test was a WITNESS: it asserted the
  // defect on purpose so that making EUR storable could not ship the defect with
  // it. It fired exactly as designed on this batch, and is resolved by fixing the
  // rendering — not by relaxing the assertion.
  //
  //   was:  expect(screen.getByText('€3/KG'))      ← €2.85 rounded to the unit
  //   now:  expect(screen.getByText('€2.85/KG'))   ← the price the supplier quoted
  //
  // WHY: `formatMoney` was a USD-vs-domestic binary, so EUR inherited rupiah
  // conventions including `maximumFractionDigits: 0` — a ~5% misstatement of the
  // bid, in the cell a buyer awards from. It now states each currency's locale
  // and precision, EUR = en-IE by operator ruling.
  it('a EUR price renders to the cent — en-IE, and PARALLEL to its USD sibling', async () => {
    quotationStore.update('qt-009a', (q) => ({ ...q, currency: 'EUR' }));
    await openComparison();
    expect(screen.getByText('€2.85/KG')).toBeInTheDocument();
    // The point of the en-IE ruling: symbol leading, dot decimal, two fraction
    // digits — so a buyer reading DOWN this column compares like with like
    // instead of re-parsing a different convention per row.
    expect(screen.getByText('$2.70/KG')).toBeInTheDocument();
    // The rounding is gone, not hidden.
    expect(screen.queryByText('€3/KG')).not.toBeInTheDocument();
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

// ── CP-0 · 2e-c-3 — ruling (b): the ranking is WITHHELD, not approximated ────
//
// The operator's interim ruling on 2e-c-2-FIND-01. (a) — refusing a foreign
// submit — would have the portal reject a legitimate commercial act to protect
// an engine defect, inverting who is at fault. (c) — accept the exposure —
// rests on persona reachability, and QA-PERSONA-01 is precisely the finding that
// says reachability is a property of the fixture set, not a guarantee.
//
// So: honest silence. The bids are still shown, because a supplier stated them
// and they are facts. What is withheld is the RANKING, because ranking them
// would mean comparing prices in currencies with no recorded basis.
//
// RFQ-2026-009's two quotes are both USD (deliberately — the fixture says so),
// which makes it the right probe: it ranks today, so a refusal can only come
// from the currency mix this test introduces.
describe('BuyerSourcing — a comparison with no FX basis withholds the ranking', () => {
  beforeEach(() => {
    quotationStore.reset();
    rfqStore.reset();
  });

  const openComparison = async () => {
    renderWithProviders(<BuyerSourcing />);
    fireEvent.click(await screen.findByText('RFQ-2026-009'));
    return screen.findByText(/QUOTE COMPARISON/i);
  };

  const makeMixed = () =>
    quotationStore.update('qt-009a', (q) => ({ ...q, currency: 'EUR' }));

  it('BASELINE — the all-USD set still ranks, and names a top quote', async () => {
    // Without this, every assertion below could pass for an unrelated reason.
    // It is also the HOMOGENEOUS-SET EXEMPTION proved on the real surface: two
    // USD quotes, no pin anywhere, a normal ranking.
    await openComparison();
    expect(screen.getByText('Top-ranked')).toBeInTheDocument();
    expect(screen.queryByTestId('fx-refusal')).not.toBeInTheDocument();
  });

  it('THE LOCK — a mixed-currency set shows NO top-ranked quote', async () => {
    makeMixed();
    await openComparison();
    // No recommendation at all. Not a fallback to the first quote, not the
    // previous winner — there is no basis on which one bid beats another.
    expect(screen.queryByText('Top-ranked')).not.toBeInTheDocument();
  });

  it('says WHY, and names EVERY currency that needs a rate', async () => {
    makeMixed();
    await openComparison();
    const banner = screen.getByTestId('fx-refusal');
    expect(banner).toHaveTextContent(/no exchange rate has been recorded/i);
    // BOTH, because rfq-009 has no domestic bid at all: once its two USD quotes
    // become one EUR and one USD, every price on the RFQ is foreign and each
    // needs its own basis. A refusal naming only the first would send the buyer
    // back for a second round.
    expect(banner).toHaveTextContent('EUR');
    expect(banner).toHaveTextContent('USD');
  });

  it('withholds the SCORES too — an absent score is not a score of 0', async () => {
    // The subtle half of the ruling. The score cells read
    // `scoreById.get(id)?.x ?? 0` before this batch, which was harmless while
    // the engine always scored. With a refusal the map is legitimately empty,
    // and `?? 0` would paint every axis as a real score of ZERO — the worst
    // value on each bar, for quotes the engine explicitly declined to rank.
    makeMixed();
    await openComparison();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    // Em dashes where the bars were.
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('still shows the BIDS — what is withheld is the ranking, not the facts', async () => {
    // A supplier stated these prices. Hiding them because the platform cannot
    // rank them would withhold data to cover a modelling gap.
    makeMixed();
    await openComparison();
    expect(screen.getByText('€2.85/KG')).toBeInTheDocument();
    expect(screen.getByText('$2.70/KG')).toBeInTheDocument();
  });

  it('RECORDING A RATE RESTORES THE RANKING — end to end, through the real verb', async () => {
    // The remedy the banner names, actually working: dispatch the pin, and the
    // comparison the engine refused becomes one it can make.
    makeMixed();
    // BOTH currencies, because neither is the base — see the naming test above.
    const today = new Date().toISOString().slice(0, 10);
    const svc = new MockCommandService();
    for (const quote of ['EUR', 'USD'] as const) {
      const res = await svc.dispatch(
        { personaType: 'buyer', supplierId: null },
        {
          transitionId: 't_rfq_fx_pin',
          entity: 'rfq',
          entityId: 'rfq-009',
          // Today's vintage — an old one would refuse FX_STALE instead, which
          // is the next test.
          payload: { quote, rate: 18_000, asOf: today, source: 'MANUAL' },
        },
      );
      expect(res.status).toBe('done');
    }
    await openComparison();
    expect(screen.queryByTestId('fx-refusal')).not.toBeInTheDocument();
    expect(screen.getByText('Top-ranked')).toBeInTheDocument();
  });

  it('a STALE rate refuses too, and says so differently', async () => {
    makeMixed();
    const svc = new MockCommandService();
    // USD gets a CURRENT rate and EUR an old one, so the only thing left to
    // refuse is staleness — not a missing pin wearing the wrong label.
    await svc.dispatch(
      { personaType: 'buyer', supplierId: null },
      {
        transitionId: 't_rfq_fx_pin',
        entity: 'rfq',
        entityId: 'rfq-009',
        payload: {
          quote: 'USD',
          rate: 17_250,
          asOf: new Date().toISOString().slice(0, 10),
          source: 'MANUAL',
        },
      },
    );
    await svc.dispatch(
      { personaType: 'buyer', supplierId: null },
      {
        transitionId: 't_rfq_fx_pin',
        entity: 'rfq',
        entityId: 'rfq-009',
        payload: { quote: 'EUR', rate: 18_000, asOf: '2026-01-01', source: 'MANUAL' },
      },
    );
    await openComparison();
    const banner = screen.getByTestId('fx-refusal');
    // Names EUR alone — the currency that is actually stale.
    expect(banner).toHaveTextContent('EUR');
    // A recorded-but-aged rate is a different situation from no rate at all,
    // and the remedy differs (supersede vs record), so the copy must differ.
    expect(banner).toHaveTextContent(/older than this comparison allows/i);
    expect(screen.queryByText('Top-ranked')).not.toBeInTheDocument();
  });

  it('renders the refusal in Indonesian too', async () => {
    makeMixed();
    await i18n.changeLanguage('id');
    try {
      renderWithProviders(<BuyerSourcing />);
      fireEvent.click(await screen.findByText('RFQ-2026-009'));
      expect(await screen.findByTestId('fx-refusal')).toHaveTextContent(
        /belum ada kurs yang dicatat/i,
      );
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});

// ── CP-0 · 2e-c-4 — the arc becomes visible ─────────────────────────────────
//
// Batches 1-3 made the currency real, storable and scoreable. A refusal nobody
// can witness is not a delivered refusal, so this is where a buyer can SEE the
// basis, RECORD one, and SUPERSEDE it — and where a superseded rate visibly
// survives, which is D-1's whole point.
//
// RFQ-2026-009 is the probe for the same reason as batch 3: its two quotes are
// both USD, so it ranks today and any refusal can only come from the currency
// mix the test introduces.
describe('BuyerSourcing — the FX basis is visible, and recordable (2e-c-4)', () => {
  beforeEach(() => {
    quotationStore.reset();
    rfqStore.reset();
  });

  const openComparison = async () => {
    renderWithProviders(<BuyerSourcing />);
    fireEvent.click(await screen.findByText('RFQ-2026-009'));
    return screen.findByText(/QUOTE COMPARISON/i);
  };

  const makeMixed = () =>
    quotationStore.update('qt-009a', (q) => ({ ...q, currency: 'EUR' }));

  const today = () => new Date().toISOString().slice(0, 10);

  const recordPin = async (quote: 'EUR' | 'USD', rate: number, asOf = today()) =>
    new MockCommandService().dispatch(
      { personaType: 'buyer', supplierId: null },
      {
        transitionId: 't_rfq_fx_pin',
        entity: 'rfq',
        entityId: 'rfq-009',
        payload: { quote, rate, asOf, source: 'MANUAL' },
      },
    );

  it('shows the basis panel whenever a foreign bid exists — including while refused', async () => {
    // Rendered during the refusal ON PURPOSE: that is exactly when a buyer needs
    // to see what is missing and act on it.
    makeMixed();
    await openComparison();
    expect(screen.getByText('Exchange rate basis')).toBeInTheDocument();
    expect(screen.getByTestId('fx-missing-EUR')).toHaveTextContent('No rate recorded');
    expect(screen.getByTestId('fx-missing-USD')).toHaveTextContent('No rate recorded');
  });

  it('does NOT show it for an all-domestic RFQ — nothing to convert', async () => {
    // RFQ-2026-011's only quote is currency-absent (= IDR), the homogeneous
    // domestic case that is every current persona's reality.
    renderWithProviders(<BuyerSourcing />);
    fireEvent.click(await screen.findByText('RFQ-2026-011'));
    await screen.findByText(/QUOTE COMPARISON/i);
    expect(screen.queryByText('Exchange rate basis')).not.toBeInTheDocument();
  });

  it('THE LOCK — the rate in force, its VINTAGE and its SOURCE are all on screen', async () => {
    // The batch's stated intent: a buyer answers "what basis ranked this?" from
    // the screen, not from an audit query.
    makeMixed();
    await recordPin('EUR', 18_000, '2026-07-30');
    await recordPin('USD', 17_250, '2026-07-30');
    await openComparison();

    expect(screen.getByTestId('fx-vintage-EUR')).toHaveTextContent('as of 30 Jul 2026');
    expect(screen.getAllByText('Entered manually').length).toBe(2);
    // The rate itself, in the base currency, through the shared formatter.
    expect(screen.getByText('Rp 18.000')).toBeInTheDocument();
    expect(screen.getByText('Rp 17.250')).toBeInTheDocument();
  });

  it('a STALE refusal names the vintage it is judging', async () => {
    // "Too old" without saying how old leaves a buyer unable to tell this
    // morning's rate from January's.
    makeMixed();
    await recordPin('USD', 17_250);
    await recordPin('EUR', 18_000, '2026-01-15');
    await openComparison();
    expect(screen.getByTestId('fx-refusal')).toHaveTextContent('15 Jan 2026');
  });

  it('THE FREEZE, VISIBLE — a superseded rate is shown to be KEPT', async () => {
    makeMixed();
    await recordPin('EUR', 16_000, '2026-07-20');
    await recordPin('EUR', 18_000, '2026-07-30');
    await openComparison();

    // The newer rate is in force...
    expect(screen.getByText('Rp 18.000')).toBeInTheDocument();
    // ...and the older one is not gone, and the surface says so. This is what
    // makes "the prior basis is preserved" a property a buyer can observe
    // rather than a claim in a code comment.
    expect(screen.getByTestId('fx-history-EUR')).toHaveTextContent('1 earlier rate kept');
  });
});

describe('BuyerSourcing — recording a rate is confirm-before-commit (2e-c-4)', () => {
  beforeEach(() => {
    quotationStore.reset();
    rfqStore.reset();
  });

  // rfq-009 has NO domestic bid — once one of its two USD quotes becomes EUR,
  // every price on it is foreign and each currency needs its own basis. USD is
  // pre-pinned through the command service so these specs isolate the EUR
  // dialog flow rather than re-proving the engine's multi-currency arithmetic.
  const openMixedComparison = async ({ prepinUsd = true } = {}) => {
    quotationStore.update('qt-009a', (q) => ({ ...q, currency: 'EUR' }));
    if (prepinUsd) {
      await new MockCommandService().dispatch(
        { personaType: 'buyer', supplierId: null },
        {
          transitionId: 't_rfq_fx_pin',
          entity: 'rfq',
          entityId: 'rfq-009',
          payload: {
            quote: 'USD',
            rate: 17_250,
            asOf: new Date().toISOString().slice(0, 10),
            source: 'MANUAL',
          },
        },
      );
    }
    renderWithProviders(<BuyerSourcing />);
    fireEvent.click(await screen.findByText('RFQ-2026-009'));
    await screen.findByText(/QUOTE COMPARISON/i);
  };

  const eurPins = () =>
    (rfqStore.get('rfq-009')!.fxPins ?? []).filter((p) => p.quote === 'EUR');

  const openDialog = async (label: RegExp) => {
    await openMixedComparison();
    fireEvent.click(screen.getByRole('button', { name: label }));
    return screen.findByTestId('fx-pin-dialog');
  };

  it('the button reads RECORD when nothing is pinned', async () => {
    await openMixedComparison({ prepinUsd: false });
    expect(screen.getByRole('button', { name: /Record EUR rate/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Supersede EUR rate/ })).not.toBeInTheDocument();
  });

  it('nothing is written until CONFIRM — opening the dialog commits nothing', async () => {
    await openDialog(/Record EUR rate/);
    expect(eurPins()).toHaveLength(0);
  });

  // FX-DIALOG-SOURCE-DEFAULT-01 — the dialog opens on "Entered manually", and the
  // SAP rate type only exists once SAP is chosen. NOTHING in this build is wired
  // to SAP, so a SAP default would stamp a provenance that never happened onto
  // the one strip that answers "what basis ranked this" — and a default is
  // invisible in the UI right up until it is wrong. Already the behaviour on main
  // (`blankPinDraft`, since #154); locked here so it cannot regress in silence.
  it('SOURCE defaults to Entered manually, and the SAP rate type appears only for SAP', async () => {
    await openDialog(/Record EUR rate/);

    const source = screen.getByLabelText('Source') as HTMLSelectElement;
    expect(source.value).toBe('MANUAL');
    expect(screen.queryByLabelText(/SAP rate type/)).not.toBeInTheDocument();

    fireEvent.change(source, { target: { value: 'SAP_EXHGRATE' } });
    expect(await screen.findByLabelText(/SAP rate type/)).toBeInTheDocument();

    // …and switching away retires the field, so a rate type can never ride along
    // on a manually-entered rate.
    fireEvent.change(source, { target: { value: 'MANUAL' } });
    await waitFor(() =>
      expect(screen.queryByLabelText(/SAP rate type/)).not.toBeInTheDocument(),
    );
  });

  it('cancelling writes nothing', async () => {
    await openDialog(/Record EUR rate/);
    fireEvent.change(screen.getByLabelText(/Rate — IDR per 1 EUR/), {
      target: { value: '18000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(eurPins()).toHaveLength(0);
  });

  it('THE LOCK — a confirmed rate lands, and the comparison re-ranks', async () => {
    await openDialog(/Record EUR rate/);
    fireEvent.change(screen.getByLabelText(/Rate — IDR per 1 EUR/), {
      target: { value: '18000' },
    });
    fireEvent.change(screen.getByLabelText('Rate date'), {
      target: { value: new Date().toISOString().slice(0, 10) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Record rate' }));

    await waitFor(() => expect(eurPins()).toHaveLength(1));
    expect(eurPins()[0].rate).toBe(18_000);

    // AND THE OPEN PANEL RE-RANKS. This half was missing when the batch was
    // first written, and the operator smoke on the built bundle caught what the
    // spec did not: the panel held the RFQ OBJECT it was opened with, so the
    // mutation invalidated the query, the list re-fetched, and the panel went on
    // rendering a snapshot with no `fxPins` — a buyer recorded a rate and the
    // comparison kept refusing. Asserting the STORE alone passed throughout.
    // The panel now holds the id and derives the row, so this is the assertion
    // that would fail if it ever goes back to a snapshot.
    await waitFor(() =>
      expect(screen.queryByTestId('fx-refusal')).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId('fx-vintage-EUR')).toBeInTheDocument();
  });

  it('the recorded rate appears in the basis panel WITHOUT reopening the panel', async () => {
    // The same defect from the other side: the vintage a buyer just entered has
    // to show up where they are already looking.
    await openDialog(/Record EUR rate/);
    fireEvent.change(screen.getByLabelText(/Rate — IDR per 1 EUR/), {
      target: { value: '18000' },
    });
    fireEvent.change(screen.getByLabelText('Rate date'), {
      target: { value: '2026-07-29' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Record rate' }));

    expect(await screen.findByTestId('fx-vintage-EUR')).toHaveTextContent('as of 29 Jul 2026');
    expect(screen.getByText('Rp 18.000')).toBeInTheDocument();
  });

  it('THE AMBIGUOUS RATE IS REFUSED AT THE FIELD — "17.250" never reaches the ledger', async () => {
    // The defect this gate exists for, on the real surface: 17,250 in
    // Indonesian, 17.25 in English, on the basis that ranks the whole set.
    await openDialog(/Record EUR rate/);
    fireEvent.change(screen.getByLabelText(/Rate — IDR per 1 EUR/), {
      target: { value: '17.250' },
    });
    expect(screen.getByTestId('fx-rate-refusal')).toHaveTextContent(/can be read two ways/i);
    expect(screen.getByRole('button', { name: 'Record rate' })).toBeDisabled();
  });

  it('a ZERO rate is refused by its own name, not as unreadable', async () => {
    await openDialog(/Record EUR rate/);
    fireEvent.change(screen.getByLabelText(/Rate — IDR per 1 EUR/), { target: { value: '0' } });
    expect(screen.getByTestId('fx-rate-refusal')).toHaveTextContent(/Zero is not an exchange rate/i);
  });

  it('an untouched blank does NOT nag — it blocks at the button instead', async () => {
    await openDialog(/Record EUR rate/);
    expect(screen.queryByTestId('fx-rate-refusal')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record rate' })).toBeDisabled();
  });

  it('a FUTURE vintage is refused — it would never age past the staleness gate', async () => {
    await openDialog(/Record EUR rate/);
    const future = new Date(Date.now() + 86_400_000 * 3).toISOString().slice(0, 10);
    fireEvent.change(screen.getByLabelText('Rate date'), { target: { value: future } });
    expect(screen.getByTestId('fx-asof-refusal')).toHaveTextContent(/cannot be true in the future/i);
  });

  it('the SAP rate type appears only for an SAP-sourced rate', async () => {
    await openDialog(/Record EUR rate/);
    expect(screen.queryByLabelText(/SAP rate type/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Source'), { target: { value: 'SAP_EXHGRATE' } });
    expect(screen.getByLabelText(/SAP rate type/)).toBeInTheDocument();
  });
});

describe('BuyerSourcing — a supersede reads as a NEW RECORDED ACT (2e-c-4)', () => {
  beforeEach(() => {
    quotationStore.reset();
    rfqStore.reset();
  });

  const withExistingPin = async () => {
    quotationStore.update('qt-009a', (q) => ({ ...q, currency: 'EUR' }));
    await new MockCommandService().dispatch(
      { personaType: 'buyer', supplierId: null },
      {
        transitionId: 't_rfq_fx_pin',
        entity: 'rfq',
        entityId: 'rfq-009',
        payload: { quote: 'EUR', rate: 16_000, asOf: '2026-07-20', source: 'MANUAL' },
      },
    );
    renderWithProviders(<BuyerSourcing />);
    fireEvent.click(await screen.findByText('RFQ-2026-009'));
    await screen.findByText(/QUOTE COMPARISON/i);
    fireEvent.click(screen.getByRole('button', { name: /Supersede EUR rate/ }));
    return screen.findByTestId('fx-pin-dialog');
  };

  it('the button says SUPERSEDE, never "edit" — an edit cannot happen', async () => {
    await withExistingPin();
    expect(screen.queryByRole('button', { name: /Edit/ })).not.toBeInTheDocument();
  });

  it('says the existing rate is KEPT, not replaced', async () => {
    await withExistingPin();
    expect(screen.getByTestId('fx-pin-dialog')).toHaveTextContent(
      /is not changed or deleted — it stays on the RFQ/i,
    );
  });

  it('SHOWS the rate being superseded — a buyer must see what they are moving from', async () => {
    // Without it a buyer cannot tell whether they are correcting a typo or
    // reacting to a real market move.
    await withExistingPin();
    const prior = screen.getByTestId('fx-supersede-prior');
    expect(prior).toHaveTextContent('Rp 16.000');
    expect(prior).toHaveTextContent('20 Jul 2026');
  });

  it('does NOT pre-fill the old rate — a prefilled value invites an accidental re-commit', async () => {
    // Seeding the field would let a buyer confirm the OLD number as if it were
    // the new one, which is edit-in-place behaviour wearing a supersede label.
    await withExistingPin();
    expect(screen.getByLabelText(/Rate — IDR per 1 EUR/)).toHaveValue('');
  });

  it('THE FREEZE — confirming APPENDS; the prior pin survives on the RFQ', async () => {
    await withExistingPin();
    fireEvent.change(screen.getByLabelText(/Rate — IDR per 1 EUR/), {
      target: { value: '18000' },
    });
    fireEvent.change(screen.getByLabelText('Rate date'), {
      target: { value: new Date().toISOString().slice(0, 10) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Record new rate' }));

    await waitFor(() => expect(rfqStore.get('rfq-009')!.fxPins).toHaveLength(2));
    expect(rfqStore.get('rfq-009')!.fxPins!.map((p) => p.rate)).toEqual([16_000, 18_000]);
  });
});

// ── CP-0 · 2e-c-4 — the last currency coercions on this surface ──────────────
describe('BuyerSourcing — the award summary states the currency it was awarded in', () => {
  beforeEach(() => {
    quotationStore.reset();
    rfqStore.reset();
  });

  it('THE LOCK — an awarded USD quote is NOT restated as rupiah', async () => {
    // The award summary was an unconditional `formatIDR`, so the ONE row
    // recording what Paragon actually committed to renamed a $22,800 contract
    // as Rp 22.800. The last place a currency may be assumed.
    await new MockCommandService().dispatch(
      { personaType: 'buyer', supplierId: null },
      {
        transitionId: 't_rfq_award',
        entity: 'rfq',
        entityId: 'rfq-009',
        payload: { awardedQuotationId: 'qt-009a', awardedSupplierId: 'sup-006' },
      },
    );
    renderWithProviders(<BuyerSourcing />);
    fireEvent.click(await screen.findByText('RFQ-2026-009'));
    // TWICE: the award-summary row AND the comparison's total-price cell. Both
    // used to disagree — the cell said $22,800.00 while the summary directly
    // above it said Rp 22.800, for the same quote on the same screen.
    expect(await screen.findAllByText('$22,800.00')).toHaveLength(2);
    expect(screen.queryByText('Rp 22.800')).not.toBeInTheDocument();
  });
});
