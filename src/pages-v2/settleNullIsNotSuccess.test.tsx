// ─────────────────────────────────────────────────────────────────────────────
// §90 · A `null` SETTLE MUST NOT RENDER AS SUCCESS
//
// #307 gave `settle` a scope gate whose refusal is `null` (ruling 1: "not yours"
// and "does not exist" must be the same answer). This spec covers what the
// SURFACE does with that answer.
//
// ⚠️ **THE FILED FINDING (§89h) SAID "SILENT NO-OP". IT IS NOT SILENT.**
// Measured before this fix, with `settle` forced to `null` and nothing else
// changed: the invoice stayed `Releasing Payment` with `paymentRef: null` while
// the surface toasted *"payment released — SAP assigned the FI document on
// settlement"*, and the GR stayed `Posting to SAP` with no material document
// while the surface toasted *"posted to SAP — SAP assigned the material
// document"*. A FALSE SUCCESS naming a document SAP never assigned — the exact
// law-0.6 claim the Option-B boundary exists to prevent.
//
// ⚠️ **RULE 4 — THE KNOWN-GOOD SUITE RUNS FIRST AND IS NOT DECORATION.** The
// whole fix is "make a settle fail in one more case", and a fix that made EVERY
// settle fail would satisfy every refusal assertion below. The success suite is
// what separates the two, so it is asserted first and asserts the POSITIVE
// artifact (a real `paymentRef` / a real material document), never the absence
// of an error.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import { useToast } from '../hooks/useToast';
import { mockDataService } from '../services/data/mock/mockDataService';
import { invoiceStore } from '../services/data/mock/stores/invoiceStore';
import { goodsReceiptStore } from '../services/data/mock/stores/goodsReceiptStore';
import { usePinnedDemoClock } from '../test/demoClock';
import { DataError, type IDataService } from '../services/data/types';
import BuyerInvoices from './BuyerInvoices';
import BuyerGoodsReceipt from './BuyerGoodsReceipt';
import { useGoodsReceiptSettle } from '../services/query/commandHooks';
import { BUYER } from '../test/test-utils';
import type { QueryScope } from '../services/data/types';

/** The seat `renderWithProviders` renders under, as a command scope — the
 *  driver must settle under the SAME tenancy that issued, or the known-good
 *  control would be measuring the gate instead of the conversion. */
const BUYER_SCOPE: QueryScope = {
  personaType: BUYER.personaType,
  supplierId: BUYER.supplierId,
  businessRoles: BUYER.businessRoles,
  actor: BUYER.actor,
};

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

/** Swap ONLY `settle`, rebinding the rest — a plain spread loses `this`. */
const withSettle = (settle: () => Promise<unknown>): IDataService =>
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

/** The gate's own answer, delivered verbatim to the hook. */
const settleReturnsNull = () => withSettle(async () => null);

const src = (rel: string) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');

// ─── POPULATION ──────────────────────────────────────────────────────────────
//
// ⚠️ **DERIVED UPSTREAM OF THE CODE UNDER TEST (§86).** The fix lives in
// `commandHooks.ts`; deriving "which surfaces settle?" by asking that file's
// behaviour would let a mutation collapse the population AND the assertions
// together, and a suite that goes red on its own population control cannot tell
// "I caught it" from "I have nothing to look at". So the population is read from
// the CALL SITES' own source text, which no change to the hook can reach.
describe('§90 POPULATION — every settle call site, derived from source', () => {
  const SITES: readonly { file: string; rel: string }[] = [
    { file: 'BuyerInvoices.tsx', rel: './BuyerInvoices.tsx' },
    { file: 'BuyerGoodsReceipt.tsx', rel: './BuyerGoodsReceipt.tsx' },
    { file: 'GRInspectionWizard.tsx', rel: '../components/v2-features/GRInspectionWizard.tsx' },
  ];

  it('the settle call sites are exactly the three components that consume a settle hook', () => {
    const settling = SITES.filter((s) => /use(GoodsReceiptSettle|InvoiceSettlePayment)\b/.test(src(s.rel)));
    expect(settling.map((s) => s.file).sort()).toEqual([
      'BuyerGoodsReceipt.tsx',
      'BuyerInvoices.tsx',
      'GRInspectionWizard.tsx',
    ]);

    // KNOWN-FALSE CONTROL, in the same run: a page with no settle must not match,
    // or the matcher is reporting on itself rather than on the tree (rule 1).
    expect(/use(GoodsReceiptSettle|InvoiceSettlePayment)\b/.test(src('./BuyerRequisitions.tsx'))).toBe(false);
  });

  // ⚠️ **NO EXACT COUNT HERE, DELIBERATELY.** The invariant is *"every settle
  // mutate site goes through the hook"*, not *"there are four of them"*. Pinning
  // the cardinality would redden this suite the day a legitimate FIFTH settle
  // site is added THROUGH the hook — an improving tree failing its own guard,
  // which is how a floor becomes something people edit rather than trust.
  it('every settle mutate site routes through the hook — none reaches the seam directly', () => {
    for (const s of SITES) {
      const calls = [...src(s.rel).matchAll(/settle(?:GR|Mutation)\.mutate(?:Async)?\(/g)];
      expect(calls.length).toBeGreaterThan(0);
      // The bypass this fix would not cover: a site calling the seam itself.
      expect(src(s.rel)).not.toMatch(/commands\.settle\(/);
    }
  });
});

// ─── KNOWN-GOOD FIRST ────────────────────────────────────────────────────────
describe('§90 KNOWN-GOOD FIRST — a real settle still completes and still says so', () => {
  usePinnedDemoClock();

  it('invoice: release → settle mints a REAL payment reference and toasts released', async () => {
    invoiceStore.reset();
    renderWithProviders(
      <>
        <BuyerInvoices />
        <ToastSpy />
      </>,
    );
    await screen.findByText('Invoices & Payment');
    fireEvent.click(await screen.findByText('INV-2025-GIV-0892'));
    fireEvent.click(await screen.findByRole('button', { name: 'Release payment' }));
    fireEvent.click(await screen.findByRole('button', { name: /Confirm release/ }));

    await waitFor(
      () => expect(invoiceStore.get('inv-giv-0892')!.status).toBe('Payment Released'),
      { timeout: 3000 },
    );
    // The POSITIVE artifact — a settlement that did not happen cannot mint one.
    expect(invoiceStore.get('inv-giv-0892')!.paymentRef).toMatch(/^PAY-/);
    await waitFor(() =>
      expect(screen.getByTestId('toast-spy').textContent).toMatch(/payment released/i),
    );
    expect(screen.getByTestId('toast-spy').textContent).not.toMatch(/did not complete/i);
  }, 20000);

  it('goods receipt: post → settle assigns a REAL material document and toasts posted', async () => {
    goodsReceiptStore.reset();
    const target = goodsReceiptStore.all().find((g) => g.status === 'Approved')!;
    renderWithProviders(
      <>
        <BuyerGoodsReceipt />
        <ToastSpy />
      </>,
    );
    await screen.findAllByText(/Goods Receipt/i);
    fireEvent.click(await screen.findByText(target.grNumber));
    fireEvent.click(await screen.findByRole('button', { name: 'Post to SAP' }));

    await waitFor(
      () => expect(goodsReceiptStore.get(target.id)!.status).toBe('Posted to SAP'),
      { timeout: 3000 },
    );
    expect(goodsReceiptStore.get(target.id)!.sapMaterialDoc).toMatch(/^MAT-DOC-/);
    await waitFor(() =>
      expect(screen.getByTestId('toast-spy').textContent).toMatch(/posted to sap/i),
    );
  }, 20000);
});

// ─── THE DEFECT ──────────────────────────────────────────────────────────────
describe('§90 THE DEFECT — a null settle renders a refusal, never a success', () => {
  usePinnedDemoClock();

  it('invoice: the surface does NOT claim payment released, and says a rule refused it', async () => {
    invoiceStore.reset();
    renderWithProviders(
      <>
        <BuyerInvoices />
        <ToastSpy />
      </>,
      { service: settleReturnsNull() },
    );
    await screen.findByText('Invoices & Payment');
    fireEvent.click(await screen.findByText('INV-2025-GIV-0892'));
    fireEvent.click(await screen.findByRole('button', { name: 'Release payment' }));
    fireEvent.click(await screen.findByRole('button', { name: /Confirm release/ }));

    await waitFor(
      () =>
        expect(screen.getByTestId('toast-spy').textContent).toMatch(/Settlement did not complete/i),
      { timeout: 3000 },
    );
    // ⚠️ THE REGRESSION THIS FILE EXISTS FOR — the string that used to fire.
    expect(screen.getByTestId('toast-spy').textContent).not.toMatch(/payment released/i);
    expect(screen.getByTestId('toast-spy').textContent).not.toMatch(/assigned the FI document/i);
    // The user is told WHY and what it means for the document.
    expect(screen.getByTestId('toast-spy').textContent).toMatch(/A governing rule refused/i);
    expect(screen.getByTestId('toast-spy').textContent).toMatch(/still awaiting settlement/i);
    // And the store agrees with the copy: unchanged, no fabricated reference.
    expect(invoiceStore.get('inv-giv-0892')!.status).toBe('Releasing Payment');
    expect(invoiceStore.get('inv-giv-0892')!.paymentRef).toBeNull();
  }, 20000);

  it('invoice: REFUSED is not retryable, so no retry is offered — asking again cannot help', async () => {
    invoiceStore.reset();
    renderWithProviders(
      <>
        <BuyerInvoices />
        <ToastSpy />
      </>,
      { service: settleReturnsNull() },
    );
    await screen.findByText('Invoices & Payment');
    fireEvent.click(await screen.findByText('INV-2025-GIV-0892'));
    fireEvent.click(await screen.findByRole('button', { name: 'Release payment' }));
    fireEvent.click(await screen.findByRole('button', { name: /Confirm release/ }));

    expect(await screen.findByText(/Settlement was refused/, undefined, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry settlement' })).not.toBeInTheDocument();
  }, 20000);

  it('goods receipt: no material document is claimed, and the refusal names the rule', async () => {
    goodsReceiptStore.reset();
    const target = goodsReceiptStore.all().find((g) => g.status === 'Approved')!;
    renderWithProviders(
      <>
        <BuyerGoodsReceipt />
        <ToastSpy />
      </>,
      { service: settleReturnsNull() },
    );
    await screen.findAllByText(/Goods Receipt/i);
    fireEvent.click(await screen.findByText(target.grNumber));
    fireEvent.click(await screen.findByRole('button', { name: 'Post to SAP' }));

    await waitFor(
      () =>
        expect(screen.getByTestId('toast-spy').textContent).toMatch(/Settlement did not complete/i),
      { timeout: 3000 },
    );
    expect(screen.getByTestId('toast-spy').textContent).not.toMatch(/posted to sap/i);
    expect(screen.getByTestId('toast-spy').textContent).not.toMatch(/assigned the material document/i);
    expect(goodsReceiptStore.get(target.id)!.status).toBe('Posting to SAP');
    expect(goodsReceiptStore.get(target.id)!.sapMaterialDoc).toBeUndefined();
  }, 20000);
});

// ─── THE WIZARD — COVERED BY SPEC, NOT BY A STAGED BROWSER SCENARIO ──────────
//
// `GRInspectionWizard`'s settle is unreachable in the browser: every ASN the
// fixture offers blocks at the quality step on a pre-existing halal/BPOM
// `UNDETERMINED_APPLICABILITY` refusal, upstream of any dispatch (proved
// pre-existing at #307 by serving the `main` build beside the branch build).
// Its settle therefore gets its coverage HERE. The wizard awaits `mutateAsync`
// inside a `try`, so the conversion is what makes its `settled = false` branch
// reachable at all — before it, a `null` resolved and the wizard toasted a
// success it had not earned.
describe('§90 THE WIZARD — the same conversion reaches the third site', () => {
  // A one-button driver for the hook the wizard uses, rendered through the same
  // provider stack. The wizard awaits `mutateAsync` inside a `try`; the
  // conversion is what makes its `settled = false` branch reachable at all —
  // before it a `null` RESOLVED and the wizard toasted a success it had not
  // earned.
  const WizardSettleDriver: React.FC<{ correlationId?: string }> = ({
    correlationId = 'cmd_0001',
  }) => {
    const settleGR = useGoodsReceiptSettle();
    const [outcome, setOutcome] = React.useState('idle');
    return (
      <button
        data-testid="drive"
        onClick={async () => {
          try {
            await settleGR.mutateAsync({ correlationId });
            setOutcome('RESOLVED — the wizard would toast success');
          } catch (e) {
            setOutcome(`REJECTED:${e instanceof DataError ? e.code : 'non-DataError'}`);
          }
        }}
      >
        {outcome}
      </button>
    );
  };

  it('KNOWN-GOOD: a REAL submitted command RESOLVES, so the wizard keeps its success path', async () => {
    goodsReceiptStore.reset();
    // Mint a genuine `submitted` command through the seam, under the same buyer
    // scope the driver will settle with — anything less proves only that the
    // driver renders.
    const target = goodsReceiptStore.all().find((g) => g.status === 'Approved')!;
    const posted = await mockDataService.commands.dispatch(BUYER_SCOPE, {
      transitionId: 't_gr_post',
      entity: 'goodsReceipt',
      entityId: target.id,
    });
    expect(posted.status).toBe('submitted');

    renderWithProviders(<WizardSettleDriver correlationId={posted.correlationId} />);
    fireEvent.click(screen.getByTestId('drive'));
    await waitFor(() =>
      expect(screen.getByTestId('drive').textContent).toBe(
        'RESOLVED — the wizard would toast success',
      ),
    );
    // The positive artifact: the settle really ran.
    expect(goodsReceiptStore.get(target.id)!.sapMaterialDoc).toMatch(/^MAT-DOC-/);
  }, 20000);

  it('mutateAsync REJECTS with NOT_FOUND on a null settle — the wizard`s failure branch', async () => {
    goodsReceiptStore.reset();
    renderWithProviders(<WizardSettleDriver />, { service: settleReturnsNull() });
    fireEvent.click(screen.getByTestId('drive'));
    await waitFor(() =>
      expect(screen.getByTestId('drive').textContent).toBe('REJECTED:NOT_FOUND'),
    );
  });
});
