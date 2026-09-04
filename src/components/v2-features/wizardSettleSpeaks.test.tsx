// ─────────────────────────────────────────────────────────────────────────────
// §91 · THE WIZARD'S `catch` DOES NOT SWALLOW — MEASURED, NOT ARGUED
//
// ⚠️ **THE FILED FINDING (§90h) SAID THE WIZARD "SHOWS NOTHING". IT IS FALSE.**
// §90h read a bare `catch {}` as a swallow without reading the four comment
// lines directly above it, which name the consumer. Driven end to end through
// the REAL component with `settle` forced to `null`, the surface says:
//
//   *"Settlement did not complete — A governing rule refused the settlement. The
//    document is unchanged and still awaiting settlement — asking again gives
//    the same refusal. Reference cmd_0008."*
//
// The hook's `onError` fires BEFORE `mutateAsync`'s promise rejects, so the
// classified refusal is already on screen by the time the `catch` runs. All the
// `catch` does is suppress the SUCCESS toast and keep the fault away from the
// outer handler, which would relabel it *'Not authorized'*. Both are correct.
//
// ⚠️ **SO THIS FILE IS THE GATE, NOT THE FIX — AND THE GATE IS THE POINT.** The
// wizard's COMPLETION path had no spec of any kind: `GRInspectionWizard.test.tsx`
// stops at the quality step, and §90's own wizard block drives a bespoke driver
// component rather than the wizard. The claim "the hook speaks for the third
// call site" was therefore true and untested — which is how §90h got written.
//
// ⚠️ **RULE 4 — THE KNOWN-GOOD RUNS FIRST AND ASSERTS A POSITIVE ARTIFACT.**
// Every refusal assertion below is satisfied by a wizard that refuses
// EVERYTHING. Only a real `MAT-DOC-…` in the store separates the two.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import { useToast } from '../../hooks/useToast';
import { mockDataService } from '../../services/data/mock/mockDataService';
import { asnStore } from '../../services/data/mock/stores/asnStore';
import { goodsReceiptStore } from '../../services/data/mock/stores/goodsReceiptStore';
import { mockShipments } from '../../data/mockShipments';
import { COMPLIANCE_REGISTRY } from '../../services/data/mock/fixtures/complianceRegistry';
import { getKnownFlows } from '../../services/transitions';
import type { IDataService } from '../../services/data/types';
import type { EnforcementSetting } from '../../lib/enforcement';
import { halalOf } from '../../services/sdc/halal';
import { bpomOf } from '../../services/sdc/bpom';
import GRInspectionWizard from './GRInspectionWizard';
import BuyerGoodsReceipt from '../../pages-v2/BuyerGoodsReceipt';

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

/** The #307 gate's own answer, delivered verbatim to the hook. */
const settleReturnsNull = () => withSettle(async () => null);

const EMPTY_LEDGER: readonly EnforcementSetting[] = [];

/**
 * ⚠️ **DERIVED, AND IT IS THE MEASUREMENT THAT RETIRES "BROWSER-UNREACHABLE".**
 * The wizard's completion needs a dock source whose every line BOTH regimes will
 * rule on — an `UNDETERMINED_APPLICABILITY` in either one disables Next and the
 * wizard can never be finished. Three of the four eligible sources are blocked
 * that way, which is what #307 measured; the fourth is not, and #307 generalised
 * from the first source it opened to all of them.
 *
 * Derived rather than named so the day a fixture moves this fails loudly at the
 * membership guard below instead of silently testing nothing.
 */
const ELIGIBLE = mockShipments.filter(
  (s) => (s.status === 'At Dock' || s.status === 'Unloading') && s.lineItems.length > 0,
);
const ANSWERABLE = ELIGIBLE.find((s) =>
  s.lineItems.every((li) => halalOf(li.materialCode).ok && bpomOf(li.materialCode).ok),
);
const BLOCKED = ELIGIBLE.find((s) =>
  s.lineItems.some((li) => !halalOf(li.materialCode).ok || !bpomOf(li.materialCode).ok),
);

const radioFor = (check: string, v: 'Pass' | 'Fail') =>
  screen.getByRole('radio', { name: new RegExp(`${check}.*${v}`) });

const toasts = () => screen.getByTestId('toast-spy').textContent ?? '';

/** Drive the REAL wizard from source selection to `Create GR`. */
const completeWizard = async (service?: IDataService) => {
  renderWithProviders(
    <>
      <ToastSpy />
      <GRInspectionWizard
        onClose={() => {}}
        onComplete={() => {}}
        shipments={mockShipments}
        asns={[...asnStore.all()]}
        enforcementSettings={EMPTY_LEDGER}
        complianceRegistry={COMPLIANCE_REGISTRY}
      />
    </>,
    service ? { service } : undefined,
  );
  const next = () => screen.getByRole('button', { name: /Next/i });
  fireEvent.click(await screen.findByText(ANSWERABLE!.asnNumber));
  fireEvent.click(next()); // → receipt
  fireEvent.click(next()); // → quality
  fireEvent.click(radioFor('BPOM Lot Tracking', 'Pass'));
  fireEvent.click(radioFor('Halal Seal Check', 'Pass'));
  // The gate genuinely opened — otherwise every assertion below is vacuous.
  expect(next(), 'the quality step never released; the walk below tests nothing').toBeEnabled();
  fireEvent.click(next()); // → summary (autoPostSap defaults ON)
  fireEvent.click(screen.getByRole('button', { name: /Create GR/i }));
};

beforeEach(() => {
  asnStore.reset();
  goodsReceiptStore.reset();
});

// ─── THE FIXTURES REACH BOTH STATES ──────────────────────────────────────────

describe('§91 REACHABILITY — the wizard can be finished, and #307 said it could not', () => {
  it('an ANSWERABLE dock source exists — else every walk below is vacuous', () => {
    // `EMPTY-INPUT-REPORTS-CLEAN-01`: a `find` that returns undefined is how a
    // spec reports on its own fixtures instead of on the tree.
    expect(
      ANSWERABLE,
      'no eligible dock source has every line ruled on by both regimes — the wizard cannot be completed at all',
    ).toBeDefined();
    expect(
      BLOCKED,
      'no eligible dock source is blocked — then the block #307 measured does not exist either',
    ).toBeDefined();
  });

  it('⚠️ the block is PER-SOURCE, not global — #307 generalised from one source to four', () => {
    // The correction, as a measurement. A clerk who opens the blocked source
    // cannot finish; a clerk who opens the answerable one can. Both are true,
    // and "the wizard's settle is browser-unreachable" is not.
    const blockedCount = ELIGIBLE.filter((s) =>
      s.lineItems.some((li) => !halalOf(li.materialCode).ok || !bpomOf(li.materialCode).ok),
    ).length;
    expect(blockedCount).toBeGreaterThan(0);
    expect(blockedCount).toBeLessThan(ELIGIBLE.length);
  });
});

// ─── KNOWN-GOOD FIRST ────────────────────────────────────────────────────────

describe('§91 KNOWN-GOOD FIRST — a real settle still posts, and still says so', () => {
  it('the wizard mints a REAL material document and toasts posted to SAP', async () => {
    await completeWizard();
    await waitFor(() => expect(toasts()).toMatch(/posted to SAP/i), { timeout: 4000 });

    // ⚠️ THE POSITIVE ARTIFACT. A wizard that refused every settle would satisfy
    // every assertion in the next block; only this one tells the two apart.
    const posted = goodsReceiptStore.all().find((g) => g.status === 'Posted to SAP' && g.sapMaterialDoc);
    expect(posted, 'no GR reached Posted to SAP — the settle never ran').toBeDefined();
    expect(posted!.sapMaterialDoc).toMatch(/^MAT-DOC-/);
  });
});

// ─── THE DEFECT AS FILED ─────────────────────────────────────────────────────

describe('§91 THE FILED DEFECT IS ABSENT — a null settle SPEAKS at the wizard', () => {
  it('⚠️ the classified refusal reaches the surface, naming the rule and the reference', async () => {
    await completeWizard(settleReturnsNull());
    await waitFor(() => expect(toasts()).toMatch(/Settlement did not complete/i), { timeout: 4000 });
    // Not merely "a toast": the REFUSED branch, which names the document's
    // unchanged state and the futility of asking again.
    expect(toasts()).toMatch(/A governing rule refused the settlement/i);
    expect(toasts()).toMatch(/asking again gives the same refusal/i);
    // The remedy carries its handle, so a report can name the command.
    expect(toasts()).toMatch(/Reference cmd_/i);
  });

  it('⚠️ and it does NOT claim the material document SAP never assigned', async () => {
    await completeWizard(settleReturnsNull());
    await waitFor(() => expect(toasts()).toMatch(/Settlement did not complete/i), { timeout: 4000 });
    expect(toasts()).not.toMatch(/posted to SAP/i);
    expect(toasts()).not.toMatch(/assigned the material document/i);
    // The store agrees with the surface — law 0.6 holds on both sides.
    expect(goodsReceiptStore.all().some((g) => g.status === 'Posted to SAP' && !g.sapMaterialDoc)).toBe(false);
  });

  it('⚠️ THE INNER CATCH EARNS ITS KEEP — the fault is not relabelled `Not authorized`', async () => {
    // This is what the `catch` is actually FOR, and the only thing it does that
    // the hook cannot: keep a settlement fault away from the outer handler,
    // whose sentence is a confidently WRONG cause.
    await completeWizard(settleReturnsNull());
    await waitFor(() => expect(toasts()).toMatch(/Settlement did not complete/i), { timeout: 4000 });
    expect(toasts()).not.toMatch(/Not authorized/i);
  });
});

// ─── THE POPULATION ──────────────────────────────────────────────────────────

const src = (rel: string) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');

describe('§91 POPULATION — only a site that AWAITS a settle can swallow one', () => {
  // ⚠️ §86: derived from the CALL SITES' own source, never by asking the hook —
  // a mutation in `commandHooks.ts` must not be able to collapse this population
  // and the assertions above together.
  const SITES = {
    wizard: src('./GRInspectionWizard.tsx'),
    grPage: src('../../pages-v2/BuyerGoodsReceipt.tsx'),
    invoices: src('../../pages-v2/BuyerInvoices.tsx'),
  };

  it('the wizard is the ONLY settle site that awaits — the other two fire and forget', () => {
    // `.mutate()` cannot reject, so there is nothing for those sites to catch and
    // no way for them to swallow. The asymmetry is structural, not an oversight:
    // the wizard awaits because it SEQUENCES create → finalize → post → settle.
    expect(SITES.wizard).toMatch(/settleGR\.mutateAsync\(/);
    expect(SITES.grPage).not.toMatch(/settle\w*\.mutateAsync\(/);
    expect(SITES.invoices).not.toMatch(/settle\w*\.mutateAsync\(/);
    // Known-false control, in the same run: a page with no settle at all.
    expect(src('../../pages-v2/BuyerRequisitions.tsx')).not.toMatch(/mutateAsync\(\{\s*correlationId/);
  });

  it('and the awaiting site catches, so a settle fault cannot reach the outer handler', () => {
    // The behavioural proof is above; this is the structural one, and it is what
    // fails first if the `try` is ever removed in a refactor.
    expect(SITES.wizard).toMatch(/await settleGR\.mutateAsync\([\s\S]{0,120}?\}\s*catch\s*\{/);
  });
});

// ─── THE REMEDY THE COMMENT USED TO PROMISE ──────────────────────────────────

describe('§91 THE INTERIM STATE — the surface and the machine must agree', () => {
  /** The declared machine is the authority on what may fire from where. */
  const postFrom = (() => {
    for (const f of getKnownFlows() as unknown as Array<{ transitions?: Array<{ id: string; from: string[] }> }>) {
      const t = (f.transitions ?? []).find((x) => x.id === 't_gr_post');
      if (t) return t.from;
    }
    return undefined;
  })();

  const openGrIn = async (status: string) => {
    goodsReceiptStore.reset();
    const target = goodsReceiptStore.all().find((g) => g.status === 'Approved')!;
    goodsReceiptStore.update(target.id, (g) => ({ ...g, status: status as never }));
    renderWithProviders(<BuyerGoodsReceipt />);
    const cell = await screen.findAllByText(target.grNumber, {}, { timeout: 4000 });
    fireEvent.click(cell[0]);
    await waitFor(() => expect(screen.getAllByText(target.grNumber).length).toBeGreaterThan(0));
    return screen.getAllByRole('button').map((b) => b.textContent?.trim()).join('|');
  };

  it('the machine is readable and t_gr_post declares its from-states', () => {
    expect(postFrom, 't_gr_post is not in any registered flow — this whole block is vacuous').toBeDefined();
    expect(postFrom).toContain('Approved');
  });

  it('CONTROL — an Approved GR DOES offer Post to SAP, through the same driving', async () => {
    // Without this, "no button on the interim state" is indistinguishable from
    // "the panel never opened" — §86's lesson, one layer down.
    expect(await openGrIn('Approved')).toMatch(/Post to SAP/i);
  });

  it('⚠️ the interim state offers the post action IFF the machine allows it — today, never', async () => {
    // ⚠️ **AN AGREEMENT ASSERTION, NOT A PINNED DEFECT.** Derived from the flow
    // declaration, so building the re-attempt (adding the interim state to
    // `from` AND offering the footer action) turns this GREEN rather than red —
    // an improving tree must not fail its own guard.
    //
    // What it holds shut is the FALSE AFFORDANCE in either direction: a button
    // the machine will refuse, or — the shape measured at §91 — copy promising
    // *"run the same action again"* with no action to run.
    const buttons = await openGrIn('Posting to SAP');
    expect(/Post to SAP/i.test(buttons)).toBe(postFrom!.includes('Posting to SAP'));
  });
});
