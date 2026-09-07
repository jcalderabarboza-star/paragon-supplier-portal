// ─────────────────────────────────────────────────────────────────────────────
// §91e · THE REMEDY THE COPY NAMES, MEASURED AS TAKEABLE
//
// `settle.failed.TRANSPORT` tells the reader the document is *"still awaiting
// settlement — run the same action again; settling twice is safe."* Until this
// batch the GR side had NO action to run: 'Posting to SAP' fell to the footer's
// `default: return null`, so the receipt was parked with no affordance and no
// account of itself.
//
// ⚠️ **THE MECHANISM §91 NAMED WAS THE WRONG ONE, AND THE DIFFERENCE DECIDES
// WHETHER THIS IS A SURFACE BATCH OR A MACHINE CHANGE.** §91 read *"run the same
// action again"* as a re-POST and concluded `t_gr_post.from` was too narrow.
// It is not: re-posting would mint a SECOND correlationId and orphan the first,
// whose `pending` entry never clears. The interim's ONE exit is the `settlesTo`
// settlement edge, so the re-attempt is the SETTLE, on the SAME correlationId —
// which `dispatcher.ts` deliberately keeps re-settleable (*"Leaving the command
// `submitted` is what makes the named remedy TRUE"*). No transition changes.
//
// ⚠️ **RULE 4 — BOTH DIRECTIONS, AND THE KNOWN-GOOD RUNS FIRST.** A surface that
// offered a retry on EVERY failure would pass every "the retry is there" spec in
// this file. So: a successful settle must leave NO remedy behind, a retryable
// fault must offer one, and the two NON-retryable classes must refuse to. And
// the retry is asserted to actually SETTLE — a button that reappears forever is
// a remedy in name only, which is the exact defect this batch exists to close.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { goodsReceiptStore } from '../services/data/mock/stores/goodsReceiptStore';
import { asnStore } from '../services/data/mock/stores/asnStore';
import type { ASN } from '../services/data/types';
import { DataError, type IDataService } from '../services/data/types';
import { useToast } from '../hooks/useToast';
import i18n from '../lib/i18n';
import BuyerGoodsReceipt from './BuyerGoodsReceipt';

const ToastSpy: React.FC = () => {
  const { toasts } = useToast();
  return (
    <ul data-testid="toast-spy">
      {toasts.map((t) => (
        <li key={t.id}>{`${t.title} ${t.description ?? ''}`}</li>
      ))}
    </ul>
  );
};

/** `mockDataService` with `commands.settle` replaced. A Proxy, not a spread —
 *  the command service is a class instance and spreading drops its prototype
 *  (the `BuyerInvoices` precedent, copied deliberately). */
const withSettle = (settle: (...a: unknown[]) => unknown): IDataService =>
  ({
    ...mockDataService,
    commands: new Proxy(mockDataService.commands, {
      get(target, prop) {
        if (prop === 'settle') return settle;
        const v = Reflect.get(target, prop, target);
        return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v;
      },
    }),
  }) as IDataService;

/** Fail the first N settles, then delegate to the real one. This is what makes
 *  "the retry is REAL" falsifiable: a retry that merely re-rendered the button
 *  would leave the store in the interim forever. */
const failFirst = (n: number, err: () => unknown) => {
  let seen = 0;
  return withSettle((...args: unknown[]) => {
    if (seen++ < n) return Promise.reject(err());
    return (mockDataService.commands.settle as (...a: unknown[]) => unknown).apply(
      mockDataService.commands,
      args,
    );
  });
};

const toasts = () => screen.getByTestId('toast-spy').textContent ?? '';

/** The Approved GR this file drives. Derived from the store, never hardcoded —
 *  a renamed fixture must fail loudly rather than silently select nothing. */
const approvedGr = () => {
  const g = goodsReceiptStore.all().find((x) => x.status === 'Approved');
  expect(g, 'no Approved GR in the store — every spec below would be vacuous').toBeDefined();
  return g!;
};

const openGr = async () => {
  const gr = approvedGr();
  const cells = await screen.findAllByText(gr.grNumber, {}, { timeout: 4000 });
  fireEvent.click(cells[0]);
  return gr;
};

const openAndPost = async () => {
  const gr = await openGr();
  fireEvent.click(await screen.findByRole('button', { name: 'Post to SAP' }));
  return gr;
};

beforeEach(async () => {
  goodsReceiptStore.reset();
  await i18n.changeLanguage('en');
});

describe('§91e — the GR interim state offers the remedy its copy names', () => {
  it('KNOWN-GOOD FIRST: a settle that SUCCEEDS records success and leaves NO remedy', async () => {
    renderWithProviders(
      <>
        <BuyerGoodsReceipt />
        <ToastSpy />
      </>,
    );
    const gr = await openAndPost();

    // The positive artifact: a real material document, minted on settle only.
    await waitFor(() => expect(goodsReceiptStore.get(gr.id)!.status).toBe('Posted to SAP'), {
      timeout: 4000,
    });
    expect(goodsReceiptStore.get(gr.id)!.sapMaterialDoc).toMatch(/^MAT-DOC-/);
    expect(toasts()).toMatch(/posted to SAP/i);
    // And nothing the failure specs below look for exists on a good path.
    expect(screen.queryByRole('button', { name: 'Retry settlement' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Settlement was refused/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Awaiting SAP settlement/)).not.toBeInTheDocument();
  });

  it('a RETRYABLE (TRANSPORT) fault parks the GR and offers a real retry', async () => {
    renderWithProviders(
      <>
        <BuyerGoodsReceipt />
        <ToastSpy />
      </>,
      { service: withSettle(() => Promise.reject(new DataError('CHAOS', 'transport down'))) },
    );
    const gr = await openAndPost();

    // The hook's `onError` classified it and named the remedy (§43).
    await waitFor(() => expect(toasts()).toMatch(/Settlement did not complete/i), {
      timeout: 4000,
    });
    expect(toasts()).toMatch(/settling twice is safe/i);
    // The GR is parked exactly where the dispatcher intends, with nothing minted.
    expect(goodsReceiptStore.get(gr.id)!.status).toBe('Posting to SAP');
    expect(goodsReceiptStore.get(gr.id)!.sapMaterialDoc).toBeUndefined();
    // ⚠️ AND THE COPY'S PROMISE NOW HAS A HANDLER.
    expect(await screen.findByRole('button', { name: 'Retry settlement' })).toBeInTheDocument();
  });

  it('⚠️ THE REMEDY IS TAKEABLE — pressing retry actually settles the receipt', async () => {
    renderWithProviders(
      <>
        <BuyerGoodsReceipt />
        <ToastSpy />
      </>,
      { service: failFirst(1, () => new DataError('UPSTREAM', 'gateway said nothing')) },
    );
    const gr = await openAndPost();

    const retry = await screen.findByRole(
      'button',
      { name: 'Retry settlement' },
      { timeout: 4000 },
    );
    expect(goodsReceiptStore.get(gr.id)!.status).toBe('Posting to SAP');

    fireEvent.click(retry);

    // The SAME correlationId settles on the second ask — which is the whole
    // claim `settle.failed.TRANSPORT` makes, now measured rather than promised.
    await waitFor(() => expect(goodsReceiptStore.get(gr.id)!.status).toBe('Posted to SAP'), {
      timeout: 4000,
    });
    expect(goodsReceiptStore.get(gr.id)!.sapMaterialDoc).toMatch(/^MAT-DOC-/);
    expect(toasts()).toMatch(/Settlement completed on retry/i);
    // The remedy clears itself once taken — it is not a permanent fixture.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Retry settlement' })).not.toBeInTheDocument(),
    );
  });

  it('a NON-RETRYABLE (REFUSED) fault offers NO retry — asking again cannot change it', async () => {
    renderWithProviders(
      <>
        <BuyerGoodsReceipt />
        <ToastSpy />
      </>,
      { service: withSettle(() => Promise.reject(new DataError('SCOPE_DENIED', 'not yours'))) },
    );
    const gr = await openAndPost();

    await waitFor(() => expect(toasts()).toMatch(/Settlement did not complete/i), {
      timeout: 4000,
    });
    expect(toasts()).toMatch(/asking again gives the same refusal/i);
    expect(goodsReceiptStore.get(gr.id)!.status).toBe('Posting to SAP');
    expect(await screen.findByText(/Settlement was refused/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry settlement' })).not.toBeInTheDocument();
  });

  it('an UNGOVERNED fault also offers NO retry — the third class, not the second', async () => {
    // A bare `Error`, the shape `registry.ts` raises. It classifies UNGOVERNED,
    // which `SETTLE_FAULT_RETRYABLE` defaults to NOT retryable — so this is a
    // distinct branch from the REFUSED spec above, not a restatement of it.
    renderWithProviders(
      <>
        <BuyerGoodsReceipt />
        <ToastSpy />
      </>,
      { service: withSettle(() => Promise.reject(new Error('flow is already registered'))) },
    );
    await openAndPost();

    await waitFor(() => expect(toasts()).toMatch(/unclassified fault/i), { timeout: 4000 });
    expect(await screen.findByText(/Settlement was refused/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry settlement' })).not.toBeInTheDocument();
  });

  it('while the settle is in flight the footer accounts for the WAIT, and offers no verb', async () => {
    renderWithProviders(<BuyerGoodsReceipt />, {
      service: withSettle(() => new Promise<never>(() => {})),
    });
    const gr = await openAndPost();

    await waitFor(() => expect(goodsReceiptStore.get(gr.id)!.status).toBe('Posting to SAP'), {
      timeout: 4000,
    });
    expect(await screen.findByText(/Awaiting SAP settlement/)).toBeInTheDocument();
    // No transition is legal from the interim, and none is offered.
    expect(screen.queryByRole('button', { name: 'Post to SAP' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry settlement' })).not.toBeInTheDocument();
  });

  it('the remedy speaks Indonesian too — the copy that names it is localized', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(
      <>
        <BuyerGoodsReceipt />
        <ToastSpy />
      </>,
      { service: withSettle(() => Promise.reject(new DataError('CHAOS', 'transport down'))) },
    );
    await openGr();
    fireEvent.click(await screen.findByRole('button', { name: 'Kirim ke SAP' }));

    await waitFor(() => expect(toasts()).toMatch(/Penyelesaian tidak tuntas/i), { timeout: 4000 });
    expect(await screen.findByRole('button', { name: 'Coba selesaikan lagi' })).toBeInTheDocument();
    // Known-false control in the same run: the EN label must be absent, so a
    // spec that silently ran in English cannot pass this.
    expect(screen.queryByRole('button', { name: 'Retry settlement' })).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §91e · THE WIZARD'S FAULT MUST REACH THE PAGE
//
// ⚠️ **THIS BLOCK EXISTS BECAUSE A MUTATION SURVIVED.** Deleting the hand-up
// (`if (failed) watchSettle(…)` in `handleWizardComplete`) left every spec above
// green: they all drive the PAGE's own `Post to SAP`, and the page keeps its own
// correlationId. The wizard is the OTHER producer — it sequences create → dispose
// → post → settle and then CLOSES — so a settle it saw fail would take the
// correlationId out of the tree with it, and the GR would land here parked with
// the remedy unreachable on the path most likely to produce it.
//
// A survivor is a hole in the gate, not a note for later: the mutant is the
// defect, and it shipped green until this block.
// ─────────────────────────────────────────────────────────────────────────────

/** A live receivable ASN — the `BuyerGoodsReceipt.test.tsx` fixture, copied so
 *  this file drives the wizard through the PAGE rather than standalone. */
const uiTestAsn = (): ASN => ({
  asnNumber: 'ASN-SETTLE-1',
  supplierId: 'sup-007',
  poReference: 'PO-2025-00108',
  status: 'Submitted',
  carrier: 'Sample Courier',
  trackingNumber: 'TRK-SETTLE-1',
  eta: '2026-05-25',
  details: {
    originCity: 'PT UI Test Supplier',
    destinationWarehouse: 'NDC J6, Jakarta',
    totalCartons: 5,
    grossWeightKg: 50,
    temperatureRequirement: 'Ambient',
  },
  lineItems: [
    {
      // MG-04: both regulatory regimes can answer it, and both ASK — so the
      // walk below does what a clerk does. See the note in BuyerGoodsReceipt.test.
      materialCode: 'AI-NIAC-6601',
      description: 'UI test carton',
      orderedQty: 100,
      shippedQty: 100,
      lotNumber: 'LOT-SETTLE-1',
    },
  ],
});

const answerRegulatoryChecks = () => {
  fireEvent.click(screen.getByRole('radio', { name: /Halal Seal Check.*Pass/ }));
  fireEvent.click(screen.getByRole('radio', { name: /BPOM Lot Tracking.*Pass/ }));
};

/** Drive the wizard from the page through to the commit. Partial approval is
 *  used deliberately: it is the disposition that POSTS, so the settle runs. */
const walkWizardToPost = async () => {
  fireEvent.click(screen.getByRole('button', { name: /New GR/i }));
  fireEvent.click(await screen.findByText('ASN-SETTLE-1'));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.change(screen.getByLabelText('Accepted quantity for AI-NIAC-6601'), {
    target: { value: '60' },
  });
  fireEvent.change(await screen.findByLabelText('Rejection reason for AI-NIAC-6601'), {
    target: { value: '40 cartons crushed in transit' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  answerRegulatoryChecks();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('button', { name: 'Create GR' }));
};

const walkedGr = () => goodsReceiptStore.all().find((g) => g.asnNumber === 'ASN-SETTLE-1');

describe('§91e — a settle the WIZARD saw fail is still remediable on the page', () => {
  beforeEach(() => {
    goodsReceiptStore.reset();
    asnStore.reset();
    asnStore.add(uiTestAsn());
  });

  it('KNOWN-GOOD FIRST: the wizard walk posts and settles, and leaves NO remedy', async () => {
    renderWithProviders(
      <>
        <BuyerGoodsReceipt />
        <ToastSpy />
      </>,
    );
    await screen.findByText('Rejection Rate (30d)');
    await walkWizardToPost();

    await waitFor(() => expect(walkedGr()?.status).toBe('Posted to SAP'), { timeout: 4000 });
    expect(walkedGr()!.sapMaterialDoc).toMatch(/^MAT-DOC-/);
    expect(screen.queryByRole('button', { name: 'Retry settlement' })).not.toBeInTheDocument();
  });

  it('⚠️ THE HAND-UP: a TRANSPORT fault inside the wizard leaves a takeable retry on the page', async () => {
    renderWithProviders(
      <>
        <BuyerGoodsReceipt />
        <ToastSpy />
      </>,
      { service: failFirst(1, () => new DataError('CHAOS', 'transport down')) },
    );
    await screen.findByText('Rejection Rate (30d)');
    await walkWizardToPost();

    // The wizard closed; the GR is parked at the boundary with nothing minted.
    await waitFor(() => expect(walkedGr()?.status).toBe('Posting to SAP'), { timeout: 4000 });
    expect(walkedGr()!.sapMaterialDoc).toBeUndefined();
    expect(toasts()).toMatch(/Settlement did not complete/i);

    // The correlationId survived the wizard's close — open the GR and take it.
    fireEvent.click((await screen.findAllByText(walkedGr()!.grNumber))[0]);
    const retry = await screen.findByRole(
      'button',
      { name: 'Retry settlement' },
      { timeout: 4000 },
    );
    fireEvent.click(retry);

    await waitFor(() => expect(walkedGr()?.status).toBe('Posted to SAP'), { timeout: 4000 });
    expect(walkedGr()!.sapMaterialDoc).toMatch(/^MAT-DOC-/);
  });

  it('and a NON-RETRYABLE fault from the wizard offers no retry either', async () => {
    renderWithProviders(
      <>
        <BuyerGoodsReceipt />
        <ToastSpy />
      </>,
      { service: withSettle(() => Promise.reject(new DataError('SCOPE_DENIED', 'not yours'))) },
    );
    await screen.findByText('Rejection Rate (30d)');
    await walkWizardToPost();

    await waitFor(() => expect(walkedGr()?.status).toBe('Posting to SAP'), { timeout: 4000 });
    fireEvent.click((await screen.findAllByText(walkedGr()!.grNumber))[0]);
    expect(await screen.findByText(/Settlement was refused/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry settlement' })).not.toBeInTheDocument();
  });
});
