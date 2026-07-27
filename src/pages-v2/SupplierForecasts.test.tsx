import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import SupplierForecasts from './SupplierForecasts';
import { requirementResponseStore } from '../services/data/mock/stores/requirementResponseStore';
import { incomingShipmentStore } from '../services/data/mock/stores/incomingShipmentStore';
import {
  supplierVisiblePublications,
  FORECAST_PUBLICATIONS,
  consolidationRows,
} from '../services/sdc';
import { isLive } from '../services/liveness';
import i18n from '../lib/i18n';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';

// ────────────────────────────────────────────────────────────────────────────
// SupplierForecasts (SDC-2b) — the P1 supplier surface, honest-render +
// own-facts + governed-submit contract.
//
// The seeded persona is sup-007 (PT Berlina Packaging): after F-1(a) it owns
// THREE fanned lines of the current publication (R2) — PK-PETB-8810 2026-08
// firm, PK-CAPF-8820 2026-09 semi-firm, AI-NIAC-6601 2026-10 visibility-only.
// Everything else (glycerin / cetearyl / sup-005's PET line) belongs to OTHER
// suppliers and must never render here (FORK-3b-C own-facts-only).
// ────────────────────────────────────────────────────────────────────────────

const SUP002: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-002',
  supplierName: 'PT Lautan Luas Tbk',
};

beforeEach(() => {
  requirementResponseStore.reset();
  incomingShipmentStore.reset();
});

const renderPage = (identity: CurrentIdentity = SUPPLIER) =>
  renderWithProviders(<SupplierForecasts />, { identity, route: '/supplier/forecasts' });

// Open the confirm panel for a line card identified by its material code.
async function openConfirmFor(materialCode: string) {
  const lines = await screen.findByTestId('sdcsup-lines');
  const card = within(lines)
    .getByText(materialCode)
    .closest('div.bg-bg-surface') as HTMLElement;
  fireEvent.click(within(card).getByRole('button', { name: /^Confirm$/ }));
  await screen.findByLabelText(/Confirmed quantity/);
}

const setQty = (value: string) =>
  fireEvent.change(screen.getByLabelText(/Confirmed quantity/), { target: { value } });

const submitPanel = () =>
  fireEvent.click(screen.getByRole('button', { name: /Submit confirmation/ }));

describe('SupplierForecasts — own-facts-only (the load-bearing isolation)', () => {
  it('renders ONLY sup-007 fanned lines — no other supplier material leaks', async () => {
    renderPage();
    const lines = await screen.findByTestId('sdcsup-lines');
    // sup-007's three fanned lines (F-1a depth + the visibility-only active).
    expect(within(lines).getByText('PK-PETB-8810')).toBeInTheDocument();
    expect(within(lines).getByText('PK-CAPF-8820')).toBeInTheDocument();
    expect(within(lines).getByText('AI-NIAC-6601')).toBeInTheDocument();
    // Other suppliers' materials NEVER render (sup-002 glycerin/cetearyl).
    expect(screen.queryByText('RM-EMUL-3310')).not.toBeInTheDocument();
    expect(screen.queryByText('RM-EMUL-3320')).not.toBeInTheDocument();
  });

  it('another supplier identity sees ITS lines, not sup-007 packaging', async () => {
    renderPage(SUP002);
    const lines = await screen.findByTestId('sdcsup-lines');
    expect(within(lines).getByText('RM-EMUL-3310')).toBeInTheDocument();
    expect(screen.queryByText('PK-CAPF-8820')).not.toBeInTheDocument();
  });

  it('My responses shows OWN records with STATUS only — no rank/score, no others', async () => {
    renderPage(SUP002);
    fireEvent.click(await screen.findByRole('tab', { name: /My responses/ }));
    const panel = await screen.findByTestId('sdcsup-responses');
    // sup-002's own fixtures (rr-0001 submitted, rr-0003 draft) — never sup-005's.
    expect(within(panel).getByText('rr-0001')).toBeInTheDocument();
    expect(within(panel).queryByText('rr-0002')).not.toBeInTheDocument();
    expect(within(panel).queryByText('rr-0004')).not.toBeInTheDocument();
    // Status vocabulary only — no competitive framing anywhere on the page.
    expect(screen.queryByText(/rank/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/score/i)).not.toBeInTheDocument();
  });
});

describe('SupplierForecasts — FLAG-2 honest render', () => {
  it('the governed LIVE lane is empty and the sample renders only under the banner + pill', async () => {
    // The predicate IS the gate: every fixture publication filters out.
    expect(supplierVisiblePublications(FORECAST_PUBLICATIONS)).toEqual([]);
    expect(isLive('forecastPublications')).toBe(false);
    renderPage();
    // The registry-derived pill (green structurally unreachable).
    expect(await screen.findByText(/awaiting SOMO C8 feed/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Live$/)).not.toBeInTheDocument();
    // The honest empty state of the live lane, stated on the sample banner.
    expect(screen.getByText(/no live publication yet/i)).toBeInTheDocument();
    expect(screen.getByText(/simulated sample data/i)).toBeInTheDocument();
  });

  it('speaks commitmentClass ONLY — the P2 provenance grammar never renders', async () => {
    renderPage();
    const lines = await screen.findByTestId('sdcsup-lines');
    expect(within(lines).getByText('Firm')).toBeInTheDocument();
    expect(within(lines).getByText('Semi-firm')).toBeInTheDocument();
    expect(within(lines).getByText('Visibility only')).toBeInTheDocument();
    // No PlanCellMarker / internal liveness-axis vocabulary on this surface.
    expect(screen.queryByText(/SIMULATED/)).not.toBeInTheDocument();
    expect(screen.queryByText(/PLANNED/)).not.toBeInTheDocument();
  });

  it('a visibility-only line offers ACKNOWLEDGE, never Confirm (nothing to commit)', async () => {
    renderPage();
    const lines = await screen.findByTestId('sdcsup-lines');
    // 3 fanned lines: 2 Confirm buttons (firm + semi-firm) and 1 Acknowledge
    // (the visibility-only line — SDC-2b-EXT response affordance + the hint).
    expect(within(lines).getAllByRole('button', { name: /^Confirm$/ })).toHaveLength(2);
    expect(within(lines).getAllByRole('button', { name: /^Acknowledge$/ })).toHaveLength(1);
    expect(within(lines).getByText(/no commitment requested/i)).toBeInTheDocument();
  });
});

describe('SupplierForecasts — the visibility response (SDC-2b-EXT)', () => {
  it('acknowledges the visibility line with a note → records honestly, never as a confirmation', async () => {
    renderPage();
    const lines = await screen.findByTestId('sdcsup-lines');
    fireEvent.click(within(lines).getByRole('button', { name: /^Acknowledge$/ }));
    fireEvent.change(await screen.findByLabelText(/Note \(optional signal\)/), {
      target: { value: 'Current stock covers this horizon.' },
    });
    // The panel commit is OUTLINE "Acknowledge" — solid stays reserved for
    // commitments. Two "Acknowledge" buttons exist (line card + panel commit);
    // the panel's is the last in DOM order.
    const ackButtons = screen.getAllByRole('button', { name: /^Acknowledge$/ });
    fireEvent.click(ackButtons[ackButtons.length - 1]);
    const panel = await screen.findByTestId('sdcsup-responses');
    const minted = requirementResponseStore
      .all()
      .find((r) => r.supplierId === 'sup-007' && r.acknowledgment && r.id.startsWith('rr-9'));
    expect(minted).toBeDefined();
    expect(minted!.acknowledgment).toEqual({ note: 'Current stock covers this horizon.' });
    expect(minted!.forecastConfirmation).toBeUndefined(); // no number to misread
    expect(minted!.planVersion).toBe('PV-2026-08.2');
    // The seed rr-0005 answered the same thread → this re-ack versions up to 2.
    expect(minted!.submissionVersion).toBe(2);
    // My responses renders "Acknowledged" — and no qty for this record.
    expect(within(panel).getAllByText('Acknowledged').length).toBeGreaterThan(0);
  });

  it('the seeded acknowledgment (rr-0005) renders as Acknowledged with its note — no qty, no "confirmed"', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: /My responses/ }));
    const panel = await screen.findByTestId('sdcsup-responses');
    expect(within(panel).getByText('rr-0005')).toBeInTheDocument();
    expect(within(panel).getByText('Acknowledged')).toBeInTheDocument();
    expect(within(panel).getByText(/no concern yet/)).toBeInTheDocument();
    expect(within(panel).queryByText(/confirmed/i)).not.toBeInTheDocument();
  });
});

describe('SupplierForecasts — the governed submit (t_requirementresponse_submit)', () => {
  it('confirms the FIRM line in full → lands in My responses as Submitted v1', async () => {
    renderPage();
    await openConfirmFor('PK-PETB-8810');
    setQty('40000');
    submitPanel();
    // The scoped invalidation re-derives My responses from the mutated store.
    const panel = await screen.findByTestId('sdcsup-responses');
    const minted = requirementResponseStore
      .all()
      .find((r) => r.supplierId === 'sup-007' && r.materialCode === 'PK-PETB-8810');
    expect(minted).toBeDefined();
    expect(minted!.status).toBe('Submitted');
    expect(minted!.submissionVersion).toBe(1);
    expect(minted!.forecastConfirmation.confirmedQty).toBe(40000);
    expect(minted!.forecastConfirmation.uom).toBe('PCS'); // master, not caller
    expect(minted!.planVersion).toBe('PV-2026-08.2'); // bound to the rendered snapshot
    expect(within(panel).getByText(minted!.id)).toBeInTheDocument();
  });

  it('a SHORT confirm without a root cause is blocked at the form; with one it submits', async () => {
    renderPage();
    await openConfirmFor('PK-CAPF-8820');
    setQty('50000'); // < the requested 60 000
    submitPanel();
    // Blocked at the form (root-cause toast): nothing minted, the panel stays open.
    expect(
      requirementResponseStore.all().some((r) => r.materialCode === 'PK-CAPF-8820'),
    ).toBe(false);
    expect(screen.getByRole('button', { name: /Submit confirmation/ })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: 'capacity' } });
    submitPanel();
    await waitFor(() =>
      expect(
        requirementResponseStore.all().some((r) => r.materialCode === 'PK-CAPF-8820'),
      ).toBe(true),
    );
    const minted = requirementResponseStore
      .all()
      .find((r) => r.materialCode === 'PK-CAPF-8820')!;
    expect(minted.rootCause?.level1).toBe('capacity');
    expect(minted.forecastConfirmation.confirmedQty).toBe(50000);
  });

  it('F-2: zero-qty + root cause is a LEGAL "cannot supply at all" short', async () => {
    renderPage();
    await openConfirmFor('PK-PETB-8810');
    setQty('0');
    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: 'capacity' } });
    fireEvent.change(screen.getByLabelText(/^Note$/), {
      target: { value: 'No bridgeable volume this cycle.' },
    });
    submitPanel();
    await waitFor(() =>
      expect(
        requirementResponseStore
          .all()
          .some((r) => r.supplierId === 'sup-007' && r.forecastConfirmation.confirmedQty === 0),
      ).toBe(true),
    );
    const minted = requirementResponseStore
      .all()
      .find((r) => r.supplierId === 'sup-007' && r.forecastConfirmation.confirmedQty === 0)!;
    expect(minted.status).toBe('Submitted');
    expect(minted.rootCause).toEqual({
      level1: 'capacity',
      note: 'No bridgeable volume this cycle.',
    });
  });

  it('an EMPTY quantity is not a submission (0 must be stated, not defaulted)', async () => {
    renderPage();
    const before = requirementResponseStore.all().length;
    await openConfirmFor('PK-PETB-8810');
    submitPanel();
    // Blocked at the form (quantity toast): nothing minted, the panel stays open.
    expect(requirementResponseStore.all().length).toBe(before);
    expect(screen.getByRole('button', { name: /Submit confirmation/ })).toBeInTheDocument();
  });

  it('re-confirming the same line VERSIONS UP — the prior response is not overwritten', async () => {
    renderPage();
    await openConfirmFor('PK-PETB-8810');
    setQty('40000');
    submitPanel();
    await screen.findByTestId('sdcsup-responses');
    // Back to the lines tab; confirm again with a revised (short) quantity.
    fireEvent.click(screen.getByRole('tab', { name: /Published lines/ }));
    await openConfirmFor('PK-PETB-8810');
    setQty('38000');
    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: 'capacity' } });
    submitPanel();
    await waitFor(() => {
      const thread = requirementResponseStore.forResponseKey(
        'sup-007',
        'PK-PETB-8810',
        '2026-08',
        'PUB-2026-08-RM-R2',
      );
      expect(thread).toHaveLength(2);
      expect(thread.map((r) => r.submissionVersion).sort()).toEqual([1, 2]);
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// CP-0 · W1 · PR-2c — the forecast commitment is PARSED, and the FALSE-DEFICIT
// CHAIN is broken at its source.
//
// A misread here does not stay a bad number. "40.000" against the 40,000 PCS
// firm line became 40, which tripped `isShort`, which forced the supplier to
// pick a shortfall root cause for a quantity they had committed IN FULL, which
// shipped a 39,960-unit deficit to the planner's collaboration board. These
// tests lock BOTH halves: the false accusation is gone, and genuine shortfall
// detection still works — a fix that simply stopped detecting shorts would pass
// the first half and be worse than the bug.
// ────────────────────────────────────────────────────────────────────────────

// The root-cause requirement is rendered as a danger `*` appended to the
// "Category" label when `isShort` holds — that marker IS the accusation the
// false-deficit chain begins with, so it is what these tests assert. (Asserting
// a literal "Root cause *" string would never match and would pass vacuously.)
const categoryIsRequired = () =>
  screen.getAllByText(/Category/).some((el) => /\*/.test(el.textContent ?? ''));

describe('SupplierForecasts — the false-deficit chain (CP-0 · 2c)', () => {
  it('an AMBIGUOUS quantity REFUSES — it is never read as a shortfall', async () => {
    renderPage();
    const before = requirementResponseStore.all().length;
    await openConfirmFor('PK-PETB-8810'); // firm, 40 000 PCS
    setQty('40.000'); // 40000 under id, 40 under en — one reading of two

    // A quantity nobody can read is not a shortfall. The root-cause section must
    // NOT demand an explanation for a deviation that has not been established.
    const refusal = screen.getByTestId('confirm-qty-refusal');
    expect(refusal.textContent?.trim()).not.toBe(''); // a reason is never blank
    // THE FALSE ACCUSATION: this used to read 40, trip `isShort`, and demand a
    // shortfall category for a quantity committed in full.
    expect(categoryIsRequired()).toBe(false);

    // Nothing reaches the spine.
    submitPanel();
    await waitFor(() => expect(requirementResponseStore.all()).toHaveLength(before));
    expect(
      requirementResponseStore.all().some((r) => r.forecastConfirmation?.confirmedQty === 40),
    ).toBe(false);
  });

  it('a FULL quantity does not trip isShort, forces no root cause, and surfaces NO deficit', async () => {
    renderPage();
    await openConfirmFor('PK-PETB-8810');
    setQty('40000'); // exactly the requested quantity
    expect(screen.queryByTestId('confirm-qty-refusal')).not.toBeInTheDocument();
    expect(categoryIsRequired()).toBe(false); // nothing to explain

    // Submitted WITHOUT ever choosing a root cause — the whole chain's trigger.
    submitPanel();
    await waitFor(() =>
      expect(
        requirementResponseStore.all().some((r) => r.materialCode === 'PK-PETB-8810'),
      ).toBe(true),
    );
    const minted = requirementResponseStore
      .all()
      .find((r) => r.materialCode === 'PK-PETB-8810' && r.supplierId === 'sup-007')!;
    expect(minted.forecastConfirmation.confirmedQty).toBe(40000);
    expect(minted.rootCause).toBeUndefined(); // no fabricated shortfall explanation

    // The downstream link: consolidation derives the planner's deficit from this
    // stored quantity. A full confirmation must derive `confirmed-full`, so
    // BuyerCollaboration has no deficit to render.
    const rows = consolidationRows(FORECAST_PUBLICATIONS, requirementResponseStore.all());
    const row = rows.find(
      (r) => r.line.supplierId === 'sup-007' && r.line.materialCode === 'PK-PETB-8810',
    )!;
    expect(row.state.kind).toBe('confirmed-full');
    expect(row.state).not.toHaveProperty('deficitQty');
  });

  it('CONTROL — a GENUINELY short quantity still trips every guard (the fix did not disable detection)', async () => {
    renderPage();
    await openConfirmFor('PK-CAPF-8820'); // semi-firm, 60 000 PCS
    setQty('50000'); // really short by 10 000

    // The accusation is CORRECT here and must still be made.
    expect(categoryIsRequired()).toBe(true);

    // Blocked without a root cause, exactly as before.
    submitPanel();
    expect(
      requirementResponseStore.all().some((r) => r.materialCode === 'PK-CAPF-8820'),
    ).toBe(false);
    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: 'capacity' } });
    submitPanel();
    await waitFor(() =>
      expect(
        requirementResponseStore.all().some((r) => r.materialCode === 'PK-CAPF-8820'),
      ).toBe(true),
    );

    // And the REAL deficit still reaches the planner.
    const rows = consolidationRows(FORECAST_PUBLICATIONS, requirementResponseStore.all());
    const row = rows.find(
      (r) => r.line.supplierId === 'sup-007' && r.line.materialCode === 'PK-CAPF-8820',
    )!;
    expect(row.state.kind).toBe('short');
    expect(row.state).toMatchObject({ deficitQty: 10000 });
  });

  it('a blank quantity is not a zero commitment — and a TYPED zero still is', async () => {
    renderPage();
    const before = requirementResponseStore.all().length;
    await openConfirmFor('PK-PETB-8810');
    submitPanel(); // nothing typed
    expect(requirementResponseStore.all()).toHaveLength(before);

    // The same field, now stating 0 — a binding "I cannot supply any of this".
    setQty('0');
    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: 'capacity' } });
    submitPanel();
    await waitFor(() =>
      expect(
        requirementResponseStore
          .all()
          .some((r) => r.supplierId === 'sup-007' && r.forecastConfirmation?.confirmedQty === 0),
      ).toBe(true),
    );
  });
});

describe('SupplierForecasts — the Σ-banner reads the SAME parse as the payload (CP-0 · 2c)', () => {
  const openSoh = async () => {
    renderPage();
    // The declare CTA lives on the Stock (SOH) tab, not the default lines tab.
    fireEvent.click(await screen.findByRole('tab', { name: /Stock \(SOH\)/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Declare stock/i }));
    await screen.findByLabelText(/Total quantity/);
  };
  const setTotal = (v: string) =>
    fireEvent.change(screen.getByLabelText(/Total quantity/), { target: { value: v } });

  // Two batch rows of 1,200 each — Σ 2,400, matching the total under the ID
  // reading of "2.400" and mismatching under the EN one. That is the whole point.
  const addTwoBatches = () => {
    fireEvent.click(screen.getByRole('button', { name: /Add batch/i }));
    fireEvent.click(screen.getByRole('button', { name: /Add batch/i }));
    fireEvent.change(screen.getByLabelText('Batch number 1'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Batch quantity 1'), { target: { value: '1200' } });
    fireEvent.change(screen.getByLabelText('Batch number 2'), { target: { value: 'B' } });
    fireEvent.change(screen.getByLabelText('Batch quantity 2'), { target: { value: '1200' } });
  };

  it('an AMBIGUOUS total states the refusal — never a fabricated Σ mismatch', async () => {
    await openSoh();
    setTotal('2.400'); // 2400 under id, 2.4 under en
    addTwoBatches();

    // The banner used to compute 2,4 from its OWN parse, declare the batches
    // mismatched, and block — accusing the supplier of arithmetic they had not
    // got wrong. The honest answer is that the total cannot be read at all.
    const banner = screen.getByTestId('soh-batch-sum');
    expect(banner.textContent).not.toMatch(/do not add up|2,4/);
    expect(banner.textContent?.trim()).not.toBe('');
  });

  it('a READABLE total and matching batches agree — banner and payload derive from one parse', async () => {
    await openSoh();
    setTotal('2400');
    addTwoBatches();

    const banner = screen.getByTestId('soh-batch-sum');
    // 2.400 is formatNumber(2400) — id-ID grouping, the display convention.
    expect(banner.textContent).toContain('2.400');
    expect(banner.textContent).not.toMatch(/do not add up/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// CP-0 · W1 · PR-2d — the shipment quantity. This surface had NO tests before
// this batch, so everything here is additive.
//
// A shipment quantity is not a leaf: it sums into the buyer's incoming-coverage
// read and it drives the delivery drawdown, where the schedule line's variance
// is `qty - plannedQty` AND the matching shipment is picked by the smallest
// absolute variance. "6.000" read as 6 does not just report a wrong number — it
// can match the wrong shipment to a released line. The parse is the guard.
// ────────────────────────────────────────────────────────────────────────────
describe('SupplierForecasts — the shipment quantity is parsed, never coerced (CP-0 · 2d)', () => {
  // sup-007 (the seeded persona) owns PK-PETB-8810 and four own ASNs, so the
  // material select, the direction and the ASN link are all reachable by hand
  // on ONE form — the smoke path, exercised here.
  // The SOH panel and the shipment panel are BOTH mounted, and both carry a
  // "Material" label — so these address the shipment panel's fields by their
  // own ids (the same ids the labels' htmlFor points at). A missing id throws
  // rather than silently matching the wrong panel.
  const field = <T extends HTMLElement>(id: string): T => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`shipment panel field #${id} is not in the document`);
    return el as T;
  };

  const openShipment = async (
    tab: RegExp = /Shipments/,
    report: RegExp = /^Report shipment$/,
  ) => {
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: tab }));
    fireEvent.click(await screen.findByRole('button', { name: report }));
    await waitFor(() => expect(document.getElementById('sdcsup-ship-material')).not.toBeNull());
    fireEvent.change(field('sdcsup-ship-material'), { target: { value: 'PK-PETB-8810' } });
    fireEvent.change(field('sdcsup-ship-direction'), { target: { value: 'to-paragon' } });
    fireEvent.change(field('sdcsup-ship-asn'), { target: { value: 'ASN-2025-00211' } });
  };
  const setShipQty = (v: string) =>
    fireEvent.change(field('sdcsup-ship-qty'), { target: { value: v } });
  const reportBtn = () => screen.getByTestId('sdcsup-ship-submit');
  const ownShipments = () =>
    incomingShipmentStore.all().filter((s) => s.materialCode === 'PK-PETB-8810');

  // POSITIVE — establishes that `ship-qty-refusal` is a selector that MATCHES.
  // Every absence assertion below leans on this one having been seen to pass.
  it('an AMBIGUOUS quantity renders the refusal and withdraws the commit', async () => {
    await openShipment();
    setShipQty('6.000'); // 6000 under id, 6 under en — one reading of two
    const refusal = screen.getByTestId('ship-qty-refusal');
    expect(refusal.textContent?.trim()).not.toBe(''); // a reason is never blank
    expect(reportBtn()).toBeDisabled();
  });

  it('an AMBIGUOUS quantity reaches NEITHER the spine NOR the store', async () => {
    await openShipment();
    const before = ownShipments().length;
    setShipQty('6.000');
    fireEvent.click(reportBtn()); // disabled, but the backstop is asserted too
    await waitFor(() => expect(ownShipments()).toHaveLength(before));
    // Specifically: not the 6 the old blanket coercion would have shipped into
    // the coverage sum and the drawdown match.
    expect(ownShipments().some((s) => s.qty === 6)).toBe(false);
  });

  it('a READABLE quantity reports — and the number stored is the number typed', async () => {
    await openShipment();
    setShipQty('6000');
    // The inverse of the positive above, now that the selector is known good.
    expect(screen.queryByTestId('ship-qty-refusal')).not.toBeInTheDocument();
    expect(reportBtn()).not.toBeDisabled();

    fireEvent.click(reportBtn());
    await waitFor(() => expect(ownShipments().some((s) => s.qty === 6000)).toBe(true));
    const minted = ownShipments().find((s) => s.qty === 6000)!;
    expect(minted.supplierId).toBe('sup-007');
    expect(minted.asnRef).toBe('ASN-2025-00211');
    expect(Number.isFinite(minted.qty)).toBe(true); // never a NaN through the spine
  });

  it('a blank quantity is not a zero shipment — and a TYPED zero still is', async () => {
    await openShipment();
    const before = ownShipments().length;
    fireEvent.click(reportBtn()); // nothing typed
    await waitFor(() => expect(ownShipments()).toHaveLength(before));
    // THE `|| 0`: an untouched field used to become a reported shipment of 0,
    // which posts a variance of minus the whole planned quantity downstream.
    expect(ownShipments().some((s) => s.qty === 0)).toBe(false);

    // The same field, now STATING zero — a real fact, and it must be recorded.
    setShipQty('0');
    fireEvent.click(reportBtn());
    await waitFor(() => expect(ownShipments().some((s) => s.qty === 0)).toBe(true));
  });

  it('refuses in Indonesian too — the guard is not an English-only affordance', async () => {
    await i18n.changeLanguage('id');
    try {
      await openShipment(/Pengiriman/, /^Laporkan pengiriman$/);
      setShipQty('6.000');
      const refusal = screen.getByTestId('ship-qty-refusal');
      expect(refusal.textContent).toMatch(/dibaca dua cara/);
      expect(reportBtn()).toBeDisabled();
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});

describe('SupplierForecasts — i18n (ID)', () => {
  it('localizes the header, banner, and tabs to Indonesian', async () => {
    await i18n.changeLanguage('id');
    try {
      renderPage();
      expect(await screen.findByText('Komitmen Prakiraan')).toBeInTheDocument();
      expect(screen.getByText(/belum ada publikasi live/i)).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Baris terbit/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Respons Saya/ })).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
