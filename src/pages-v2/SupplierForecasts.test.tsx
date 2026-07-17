import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import SupplierForecasts from './SupplierForecasts';
import { requirementResponseStore } from '../services/data/mock/stores/requirementResponseStore';
import { supplierVisiblePublications, FORECAST_PUBLICATIONS } from '../services/sdc';
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

  it('a visibility-only line offers NO confirm affordance (nothing to commit)', async () => {
    renderPage();
    const lines = await screen.findByTestId('sdcsup-lines');
    // 3 fanned lines but only 2 Confirm buttons — the visibility-only line
    // renders the no-commitment hint instead.
    expect(within(lines).getAllByRole('button', { name: /^Confirm$/ })).toHaveLength(2);
    expect(within(lines).getByText(/no commitment requested/i)).toBeInTheDocument();
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
