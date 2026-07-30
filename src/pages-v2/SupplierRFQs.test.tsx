import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { quotationStore } from '../services/data/mock/stores/quotationStore';
import { withChaos } from '../services/data/mock/withChaos';
import type { IDataService } from '../services/data/types';
import SupplierRFQs from './SupplierRFQs';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// Valid supplier (sup-007) with no invited RFQs and no quotations → empty.
const nothing: IDataService = {
  ...mockDataService,
  procurement: new Proxy(mockDataService.procurement, {
    get(target, prop, receiver) {
      if (prop === 'getRFQs' || prop === 'getQuotations')
        return async () => ({ items: [] });
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }),
};

describe('SupplierRFQs — four honest states + wired reads', () => {
  it('data: real quotations drive My-Quotes and prune already-quoted RFQs from Open (Task 3b)', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    // KPI strip only renders in the data branch.
    expect(await screen.findByText('Open Events')).toBeInTheDocument();
    // sup-007 is invited to the Open RFQ-2026-002 AND already has a real quote on
    // it (qt-002a) — so it is HONESTLY pruned from Open (no longer awaiting a
    // quote) and surfaces in My-Quotes instead. This proves both wired reads.
    expect(screen.queryByText('RFQ-2026-002')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /My Quotes/ }));
    expect(await screen.findByText('RFQ-2026-002')).toBeInTheDocument();
    // Own facts + status only — never a fabricated competitive score/rank (3b-C).
    expect(screen.queryByText(/of 4 quotes/)).not.toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<SupplierRFQs />, {
      identity: SUPPLIER,
      service: alwaysPending,
    });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Open Events')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<SupplierRFQs />, {
      identity: SUPPLIER,
      service: alwaysFails,
    });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState when there are no invited RFQs or quotes', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER, service: nothing });
    expect(await screen.findByText('No sourcing events yet')).toBeInTheDocument();
  });
});

// ── CP-0 · W1 · 2e-a — the bid-price gate, at the surface ────────────────────
// The pure refusal contract lives in rfqs/quotationPrice.test.ts and the ranking
// blast radius in rfqs/quotationPriceRanking.test.ts. What these add is the part
// only the DOM can answer: that the supplier is actually TOLD, on the field, and
// that the submit button does not quietly send anyway.
//
// This is only testable at all because ruling 6.2 flipped the field off
// `type="number"` — jsdom implements the number-input sanitization algorithm
// faithfully, so "15.000,50" and "1.500" used to arrive as "" and the refusal
// under test was literally untypeable.
describe('SupplierRFQs — the bid price is read once, and refused out loud', () => {
  const openQuotePanel = async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    // rfq-010 is the one Open RFQ sup-007 is invited to and has not quoted.
    expect(await screen.findByText('RFQ-2026-010')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /Submit Quote/i })[0]);
    return screen.getByLabelText('Unit price');
  };

  /** Submit, then assert the governed outcome: nothing minted, panel still open. */
  const expectBlocked = async (before: number) => {
    fireEvent.click(screen.getByRole('button', { name: 'Submit quotation' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Submit quotation' })).toBeInTheDocument(),
    );
    // The load-bearing assertion: no quotation exists, so nothing entered the
    // ranking. The toast is chrome; this is the fact.
    expect(quotationStore.forRfq('rfq-010')).toHaveLength(before);
  };

  it('an ambiguous price is refused on the field and mints nothing', async () => {
    const price = await openQuotePanel();
    const before = quotationStore.forRfq('rfq-010').length;
    fireEvent.change(price, { target: { value: '1.500' } });

    expect(screen.getByTestId('quote-price-refusal')).toHaveTextContent(
      /can be read two ways/i,
    );
    expect(price).toHaveAttribute('aria-invalid', 'true');
    // The total never renders a product of a price nobody can read.
    expect(screen.queryByText(/180,000/)).not.toBeInTheDocument();

    await expectBlocked(before);
  });

  it('a zero price is refused BY NAME — not as "unreadable", not as "missing"', async () => {
    const price = await openQuotePanel();
    const before = quotationStore.forRfq('rfq-010').length;
    fireEvent.change(price, { target: { value: '0' } });

    expect(screen.getByTestId('quote-price-refusal')).toHaveTextContent(
      /Zero is not a valid price/i,
    );
    await expectBlocked(before);
  });

  it('an untouched blank does not nag, but submitting one mints nothing', async () => {
    const price = await openQuotePanel();
    const before = quotationStore.forRfq('rfq-010').length;
    expect(screen.queryByTestId('quote-price-refusal')).not.toBeInTheDocument();
    expect(price).toHaveAttribute('aria-invalid', 'false');

    await expectBlocked(before);
  });

  it('POSITIVE TWIN — a clean price clears the field refusal and previews the true total', async () => {
    const price = await openQuotePanel();
    fireEvent.change(price, { target: { value: '1.500' } });
    expect(screen.getByTestId('quote-price-refusal')).toBeInTheDocument();

    // The same intent, typed unambiguously.
    fireEvent.change(price, { target: { value: '1500' } });
    expect(screen.queryByTestId('quote-price-refusal')).not.toBeInTheDocument();
    expect(price).toHaveAttribute('aria-invalid', 'false');
    // 1500 × 120,000 (rfq-010 totalQty) — the honest product, not 1.5 × qty.
    // GROUPING CORRECTED in 2e-b-3 (COS-01): was /180,000,000/ (comma), which
    // was the RUNTIME locale's grouping leaking through `toLocaleString()`. The
    // preview now uses `formatNumber`, pinned to id-ID like every other quantity
    // on this page, so the separator is a dot and no longer depends on where the
    // test happens to run.
    expect(screen.getByText(/180\.000\.000/)).toBeInTheDocument();
  });

  it('POSITIVE TWIN — a fully-formatted ID price is READ, not eaten', async () => {
    const price = await openQuotePanel();
    // The token the old number field deleted outright before anyone saw it.
    fireEvent.change(price, { target: { value: '15.000,50' } });
    expect(screen.queryByTestId('quote-price-refusal')).not.toBeInTheDocument();
    // GROUPING CORRECTED in 2e-b-3 (COS-01): was /1,800,060,000/. Same reason as
    // above — and note the fractional price survives the product exactly
    // (15000.5 × 120000), which is the point of the original spec.
    expect(screen.getByText(/1\.800\.060\.000/)).toBeInTheDocument();
  });
});

// ── CP-0 · W1 · 2e-b-1 — the lead time's four states, at the surface ─────────
// The refusal contract lives in rfqs/quotationLeadTime.test.ts and the award
// consequence in rfqs/quotationLeadTimeRecommendation.test.ts. What these add is
// the DOM-only part: that the supplier is TOLD which state they are in, that the
// submit control is actually disabled when it should be, and that the same-day
// acknowledgement is a real gate rather than a decoration.
//
// Testable only because the field is off `type="number"` — jsdom implements the
// number-input sanitization algorithm faithfully, so "abc" arrives as "" and,
// with blank now LEGAL, the browser would have silently converted an unreadable
// lead time into an honest-looking absence.
describe('SupplierRFQs — the lead time is read once, in four honest states', () => {
  beforeEach(() => quotationStore.reset());

  const openQuotePanel = async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    expect(await screen.findByText('RFQ-2026-010')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /Submit Quote/i })[0]);
    // A clean price and validity throughout — these tests are about the lead
    // time, and the price gate fires first.
    fireEvent.change(screen.getByLabelText('Unit price'), { target: { value: '15000' } });
    fireEvent.change(screen.getByLabelText('Quote valid until'), {
      target: { value: '2026-06-30' },
    });
    return screen.getByLabelText('Lead time');
  };

  const submitBtn = () => screen.getByRole('button', { name: 'Submit quotation' });
  const setLead = (v: string) =>
    fireEvent.change(screen.getByLabelText('Lead time'), { target: { value: v } });

  // ── 2e-b-1a — the value is a REQUIRED ESTIMATE, and says so ────────────────
  // Required and labelled are not in tension: the estimate is required PRECISELY
  // so the buyer can compare, and labelled because a supplier cannot firmly
  // commit before final quantity, PO date and capacity are known. Forcing "firm"
  // at quote stage would buy false precision. Asserted BEFORE the refusal specs
  // (Correction-2) — the positive framing is the point, the refusal serves it.
  it('POSITIVE TWIN — the field frames itself as an ESTIMATE, confirmed at PO', async () => {
    await openQuotePanel();
    // The framing appears on three distinct surfaces, deliberately: the section
    // heading frames the step, the field label frames the value, and the hint
    // says what happens next. A supplier who skims one still meets the others.
    expect(screen.getByText('Estimated lead time *')).toBeInTheDocument();
    expect(
      screen.getByText(/Paragon compares quotations on your estimate/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/confirm the firm delivery date if this quotation is awarded/i),
    ).toBeInTheDocument();
  });

  it('POSITIVE TWIN — a stated estimate submits and is stored as the number given', async () => {
    // Labelling changes the framing, never the math: the estimate is a real
    // governed fact that the award engine scores.
    await openQuotePanel();
    setLead('4');
    fireEvent.click(submitBtn());
    await waitFor(() => expect(quotationStore.forRfq('rfq-010')).toHaveLength(1));
    expect(quotationStore.forRfq('rfq-010')[0].leadTimeDays).toBe(4);
  });

  // ── 2e-b-1a — a DELIBERATE POLICY REVERSAL, not a bug correction ───────────
  // This spec asserted the opposite: that a blank showed a neutral "No lead time
  // stated…" note, left submit ENABLED, and minted a quotation storing an
  // absence. JJ's commercial ruling makes an incomplete bid unsubmittable.
  it('BLANK — refused as a required field, submit disabled, nothing minted', async () => {
    await openQuotePanel();
    expect(screen.getByTestId('quote-leadtime-refusal')).toHaveTextContent(
      /Give your estimated lead time/i,
    );
    // The refusal itself carries the estimate framing — it asks for an estimate,
    // not for a promise the supplier is not yet in a position to make.
    expect(screen.getByTestId('quote-leadtime-refusal')).toHaveTextContent(
      /An estimate is enough/i,
    );
    expect(screen.queryByTestId('quote-leadtime-absent')).not.toBeInTheDocument();
    expect(submitBtn()).toBeDisabled();

    fireEvent.click(submitBtn());
    await waitFor(() => expect(submitBtn()).toBeInTheDocument());
    // THE LOCK: nothing minted — and in particular no 0, which on the absolute
    // axis is the BEST possible lead-time score.
    expect(quotationStore.forRfq('rfq-010')).toHaveLength(0);
  });

  it('POSITIVE TWIN — stating one clears the refusal and re-enables submit', async () => {
    await openQuotePanel();
    expect(submitBtn()).toBeDisabled();
    setLead('4');
    expect(screen.queryByTestId('quote-leadtime-refusal')).not.toBeInTheDocument();
    expect(submitBtn()).toBeEnabled();
  });

  it('UNREADABLE — refused on the field, submit disabled, nothing minted', async () => {
    const lead = await openQuotePanel();
    setLead('abc');

    expect(screen.getByTestId('quote-leadtime-refusal')).toHaveTextContent(
      /not a lead time/i,
    );
    expect(lead).toHaveAttribute('aria-invalid', 'true');
    expect(submitBtn()).toBeDisabled();

    fireEvent.click(submitBtn());
    await waitFor(() => expect(submitBtn()).toBeInTheDocument());
    expect(quotationStore.forRfq('rfq-010')).toHaveLength(0);
  });

  it('UNREADABLE — a fractional day is refused rather than truncated (FIND-05)', async () => {
    await openQuotePanel();
    setLead('3.5');
    expect(screen.getByTestId('quote-leadtime-refusal')).toHaveTextContent(
      /whole number of days/i,
    );
    expect(submitBtn()).toBeDisabled();
    expect(quotationStore.forRfq('rfq-010')).toHaveLength(0);
  });

  it('INTEGER — an ordinary promise shows no banner at all, and submits as typed', async () => {
    await openQuotePanel();
    setLead('2');
    fireEvent.change(screen.getByDisplayValue('days'), { target: { value: 'weeks' } });

    expect(screen.queryByTestId('quote-leadtime-refusal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('quote-leadtime-absent')).not.toBeInTheDocument();
    expect(screen.queryByTestId('quote-leadtime-sameday')).not.toBeInTheDocument();
    expect(submitBtn()).toBeEnabled();

    fireEvent.click(submitBtn());
    await waitFor(() => expect(quotationStore.forRfq('rfq-010')).toHaveLength(1));
    expect(quotationStore.forRfq('rfq-010')[0].leadTimeDays).toBe(14); // 2 weeks
  });

  describe('ZERO — legal, best, and hard-gated behind a same-day acknowledgement', () => {
    it('THE GATE — the note appears inline and submit is DISABLED until it is ticked', async () => {
      await openQuotePanel();
      setLead('0');

      const gate = screen.getByTestId('quote-leadtime-sameday');
      expect(gate).toHaveTextContent(/same-day delivery — confirm this is correct/i);
      // Not a refusal — a 0 is legitimate. It is simply not sendable unaffirmed.
      expect(screen.queryByTestId('quote-leadtime-refusal')).not.toBeInTheDocument();
      expect(submitBtn()).toBeDisabled();

      fireEvent.click(submitBtn());
      await waitFor(() => expect(submitBtn()).toBeInTheDocument());
      expect(quotationStore.forRfq('rfq-010')).toHaveLength(0);
    });

    it('POSITIVE TWIN — ticked, it submits, and a real same-day promise is stored', async () => {
      await openQuotePanel();
      setLead('0');
      fireEvent.click(screen.getByLabelText(/I confirm this quotation offers same-day/i));
      expect(submitBtn()).toBeEnabled();

      fireEvent.click(submitBtn());
      await waitFor(() => expect(quotationStore.forRfq('rfq-010')).toHaveLength(1));
      expect(quotationStore.forRfq('rfq-010')[0].leadTimeDays).toBe(0);
    });

    it('the acknowledgement is RETRACTED when the number changes', async () => {
      // An ack belongs to the value it was given for. Ticking 0, editing to 5,
      // then back to 0 must not carry the old affirmation forward.
      await openQuotePanel();
      setLead('0');
      fireEvent.click(screen.getByLabelText(/I confirm this quotation offers same-day/i));
      expect(submitBtn()).toBeEnabled();

      setLead('5');
      expect(screen.queryByTestId('quote-leadtime-sameday')).not.toBeInTheDocument();

      setLead('0');
      expect(screen.getByTestId('quote-leadtime-sameday')).toBeInTheDocument();
      expect(submitBtn()).toBeDisabled(); // owed again
    });
  });
});

// ── CP-0 · W1 · 2e-b-2 — the minimum order quantity, at the surface ──────────
// The pure read contract lives in rfqs/quotationMoq.test.ts and the spine
// round-trip in services/data/mock/quotationLifecycleCommand.test.ts. What
// these add is the DOM-only part, and it is the part FIND-02 was actually
// about: that a value the supplier types into this field now LEAVES the page.
//
// Nothing here was previously red. The field wrote to form state, the state was
// never read, and no spec ever asked whether it was — a defect no test suite
// could report because there was nothing to disagree with.
describe('SupplierRFQs — the minimum order quantity stops being dropped', () => {
  beforeEach(() => quotationStore.reset());

  const openQuotePanel = async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    expect(await screen.findByText('RFQ-2026-010')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /Submit Quote/i })[0]);
    // A complete, clean quote around the field under test — the price and
    // lead-time gates both fire before this one.
    fireEvent.change(screen.getByLabelText('Unit price'), { target: { value: '15000' } });
    fireEvent.change(screen.getByLabelText('Lead time'), { target: { value: '14' } });
    fireEvent.change(screen.getByLabelText('Quote valid until'), {
      target: { value: '2026-06-30' },
    });
    return screen.getByLabelText('Minimum order quantity');
  };

  const submitBtn = () => screen.getByRole('button', { name: 'Submit quotation' });
  const minted = () => quotationStore.forRfq('rfq-010');

  it('THE LOCK — a stated minimum survives the submit and lands on the quotation', async () => {
    const moq = await openQuotePanel();
    fireEvent.change(moq, { target: { value: '100000' } });
    fireEvent.click(submitBtn());

    await waitFor(() => expect(minted()).toHaveLength(1));
    // The whole finding, in one assertion: what the supplier typed is on the
    // governed fact. Before this batch it was `undefined` here no matter what
    // they entered.
    expect(minted()[0].moq).toBe(100_000);
  });

  it('POSITIVE TWIN — the supplier reads their own stated minimum back on My Quotes', async () => {
    const moq = await openQuotePanel();
    fireEvent.change(moq, { target: { value: '100000' } });
    fireEvent.click(submitBtn());

    await waitFor(() => expect(minted()).toHaveLength(1));
    // Submitting switches to the My Quotes tab. The minimum appears on the
    // supplier's own record of the quote — the surface that used to omit a term
    // they had just stated.
    // The tile exists on every quote card, so the LABEL is plural here; the
    // VALUE is what identifies this quote, and it is the assertion that matters.
    expect((await screen.findAllByText('Min. order qty')).length).toBeGreaterThan(0);
    expect(await screen.findByText('100.000 PCS')).toBeInTheDocument();
  });

  it('BLANK is LEGAL — no refusal, submit enabled, and the quote mints without a minimum', async () => {
    await openQuotePanel();
    // An untouched blank is this field's documented default, so it must not nag
    // and must not block. Contrast the lead time, where blank refuses.
    expect(screen.queryByTestId('quote-moq-refusal')).not.toBeInTheDocument();
    expect(submitBtn()).toBeEnabled();

    fireEvent.click(submitBtn());
    await waitFor(() => expect(minted()).toHaveLength(1));
    // Absent, not zero — the distinction the whole `|| 0` arc exists to keep.
    expect(minted()[0].moq).toBeUndefined();
  });

  it('BLANK renders as the default it MEANS, not as a dash or a 0', async () => {
    await openQuotePanel();
    fireEvent.click(submitBtn());
    await waitFor(() => expect(minted()).toHaveLength(1));
    // Every quote on this surface honestly lacks a minimum — the field was
    // dropped for all of them until now — so the default sentence is plural.
    expect((await screen.findAllByText('Same as RFQ qty')).length).toBeGreaterThan(0);
    // And the shape this replaces: a fabricated quantity of zero.
    expect(screen.queryByText(/^0 PCS$/)).not.toBeInTheDocument();
  });

  it('the field states its default where a placeholder cannot — while typing', async () => {
    const moq = await openQuotePanel();
    fireEvent.change(moq, { target: { value: '100000' } });
    // A placeholder vanishes on the first keystroke; the hint is still there,
    // which is when "blank means same as RFQ qty" becomes useful to read.
    expect(
      screen.getByText(/Leave blank if you can supply the RFQ quantity with no minimum/i),
    ).toBeInTheDocument();
  });

  it('UNREADABLE — refused on the field, submit disabled, nothing minted', async () => {
    const moq = await openQuotePanel();
    fireEvent.change(moq, { target: { value: 'abc' } });

    expect(screen.getByTestId('quote-moq-refusal')).toHaveTextContent(/not a quantity/i);
    expect(moq).toHaveAttribute('aria-invalid', 'true');
    expect(submitBtn()).toBeDisabled();

    fireEvent.click(submitBtn());
    await waitFor(() => expect(submitBtn()).toBeInTheDocument());
    expect(minted()).toHaveLength(0);
  });

  it('UNREADABLE — "abc" is only typeable at all because the field left type="number"', async () => {
    // Ruling 6.2, load-bearing here: a number input erases this token to "" —
    // and "" is LEGAL on this field, so the browser would have converted an
    // unreadable minimum into a silent "no minimum" with nobody told.
    const moq = await openQuotePanel();
    expect(moq).toHaveAttribute('type', 'text');
    fireEvent.change(moq, { target: { value: 'abc' } });
    expect(moq).toHaveValue('abc');
  });

  it('AMBIGUOUS — a separator-formatted minimum is refused, not read 1000× wrong', async () => {
    const moq = await openQuotePanel();
    fireEvent.change(moq, { target: { value: '1.500' } });
    expect(screen.getByTestId('quote-moq-refusal')).toHaveTextContent(/can be read two ways/i);
    expect(submitBtn()).toBeDisabled();
  });

  it('ZERO — refused BY NAME, and told to clear the field instead', async () => {
    const moq = await openQuotePanel();
    fireEvent.change(moq, { target: { value: '0' } });
    expect(screen.getByTestId('quote-moq-refusal')).toHaveTextContent(
      /A minimum of 0 is not a minimum/i,
    );
    expect(submitBtn()).toBeDisabled();
    expect(minted()).toHaveLength(0);
  });

  it('POSITIVE TWIN — correcting a refused minimum clears it and re-enables submit', async () => {
    const moq = await openQuotePanel();
    fireEvent.change(moq, { target: { value: '1.500' } });
    expect(submitBtn()).toBeDisabled();

    fireEvent.change(moq, { target: { value: '1500' } });
    expect(screen.queryByTestId('quote-moq-refusal')).not.toBeInTheDocument();
    expect(moq).toHaveAttribute('aria-invalid', 'false');
    expect(submitBtn()).toBeEnabled();
  });
});

// ── CP-0 · W1 · 2e-b-3 — the display/read consistency pack ───────────────────
//
// Five small display defects, all confirmed display-only before being touched
// (nothing here is stored, compared, ranked or dispatched — the triage gate was
// run on each path). They are locked because "cosmetic" is not the same as
// "unverified": a runtime-locale separator and a hardcoded KPI both misinform a
// human, and both were invisible to the suite until now.
describe('SupplierRFQs — display consistency (2e-b-3)', () => {
  const render = () =>
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });

  // COS-03. `awaitingCount` was the literal `1`, rendered under "Awaiting
  // Award · Decision pending" — the same figure for every supplier, including
  // one with nothing outstanding. sup-007 holds exactly two quotations
  // (qt-002a on rfq-002, qt-005a on rfq-005), BOTH 'Under Review', so the honest
  // reading is 2. The old literal happened to be wrong for the seeded persona.
  it('the Awaiting-Award KPI is DERIVED from the supplier\u2019s own open quotes, not a literal', async () => {
    render();
    const kpi = (await screen.findByText('Awaiting Award')).closest('div')!
      .parentElement!;
    expect(kpi.textContent).toMatch(/2/);
    // The retired literal. If this ever reads 1 again for sup-007, the KPI has
    // gone back to asserting a number nobody derived.
    expect(kpi.textContent).not.toMatch(/\b1\b/);
  });

  // COS-02. The open-RFQ card grouped its quantity with bare `toLocaleString()`
  // (runtime locale) while the minimum order quantity beside it used the pinned
  // `formatNumber` — two quantities on one card, two conventions.
  it('the open-RFQ quantity groups id-ID, matching every other quantity on the card', async () => {
    render();
    // rfq-010 — 120,000 PCS, the one Open RFQ sup-007 has not yet quoted.
    expect(await screen.findByText('RFQ-2026-010')).toBeInTheDocument();
    expect(screen.getByText(/120\.000 PCS/)).toBeInTheDocument();
    // The comma form is what `toLocaleString()` produced under this runner.
    expect(screen.queryByText(/120,000 PCS/)).not.toBeInTheDocument();
  });

  // COS-07. `${q.leadTimeDays} ${t('rfqs.unit.days')}` was raw interpolation, so
  // a one-day promise read "1 days". No seeded quote states 1 day, so the
  // singular is driven through a REAL submit rather than asserted on a fixture —
  // otherwise the branch under test never executes.
  it('a lead time of exactly one day reads "1 day", not "1 days"', async () => {
    quotationStore.reset();
    render();
    expect(await screen.findByText('RFQ-2026-010')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /Submit Quote/i })[0]);
    fireEvent.change(screen.getByLabelText('Unit price'), { target: { value: '15000' } });
    fireEvent.change(screen.getByLabelText('Lead time'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Quote valid until'), {
      target: { value: '2026-06-30' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit quotation' }));

    // Submitting switches to My Quotes, where the supplier reads their own quote.
    await waitFor(() =>
      expect(quotationStore.forRfq('rfq-010')).toHaveLength(1),
    );
    expect(await screen.findByText('1 day')).toBeInTheDocument();
    // The retired output. Nothing on this surface may say "1 days".
    expect(screen.queryByText('1 days')).not.toBeInTheDocument();
  });

  // The plural branch still renders through i18n, and a grouped day count is
  // grouped — the other half of the same fix.
  it('POSITIVE TWIN — a multi-day lead time still reads through the count form', async () => {
    quotationStore.reset();
    render();
    fireEvent.click(await screen.findByRole('tab', { name: /My Quotes/ }));
    // Both seeded sup-007 quotes state 14 days, so this is plural-safe by query
    // rather than by assuming one match.
    expect((await screen.findAllByText('14 days')).length).toBeGreaterThan(0);
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
  });
});
