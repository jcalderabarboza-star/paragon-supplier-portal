import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import { asnStore } from '../services/data/mock/stores/asnStore';
import { goodsReceiptStore } from '../services/data/mock/stores/goodsReceiptStore';
import type { IDataService, ASN } from '../services/data/types';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import { enforcementSettingStore } from '../services/data/mock/stores/enforcementSettingStore';
import { seedEnforcementLedger, SEEDED_CHECKS } from '../services/data/mock/enforcementSeed';
import BuyerGoodsReceipt from './BuyerGoodsReceipt';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// Buyer-only aggregate — empty is reached by an empty result, not a persona.
const noGRs: IDataService = {
  ...mockDataService,
  procurement: new Proxy(mockDataService.procurement, {
    get(target, prop, receiver) {
      if (prop === 'getGoodsReceipts') return async () => ({ items: [] });
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }),
};

describe('BuyerGoodsReceipt — four honest states', () => {
  it('data: renders the QC workspace with wired reads', async () => {
    renderWithProviders(<BuyerGoodsReceipt />);
    // KPI strip only renders in the data branch.
    expect(await screen.findByText('Rejection Rate (30d)')).toBeInTheDocument();
    expect(screen.getByText('Goods Receipt & Quality Control')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<BuyerGoodsReceipt />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Rejection Rate (30d)')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<BuyerGoodsReceipt />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState when there are no goods receipts', async () => {
    renderWithProviders(<BuyerGoodsReceipt />, { service: noGRs });
    expect(await screen.findByText('No goods receipts yet')).toBeInTheDocument();
  });
});

// A live, receivable ASN seeded straight into the store — the UI-path proof that
// the GR source selector resolves ASNs from the service seam, not fixtures only.
const uiTestAsn = (): ASN => ({
  asnNumber: 'ASN-UITEST-1',
  supplierId: 'sup-007',
  poReference: 'PO-2025-00108',
  status: 'Submitted',
  carrier: 'JNE',
  trackingNumber: 'TRK-UI-1',
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
      // ⚠️ THIS CODE HAS MOVED TWICE, UNDER THE SAME PRESSURE, AND BOTH MOVES
      // ARE RECORDED RATHER THAN ABSORBED. The spec's subject is the ASN source
      // seam, not compliance — but each regulatory gate that lands makes a
      // receipt harder to reach, and that pressure is worth seeing.
      //
      //   · `PK-UITEST-1` → `PK-PETB-8804` (2B-4b). The BPOM check began reading
      //     the material master and REFUSING a code it cannot resolve, so an
      //     invented code could no longer reach step 4. The UNKNOWN_MATERIAL
      //     path did not vanish with it: it is exercised deliberately in
      //     `GRInspectionWizard.test.tsx`, the only place in the tree that can
      //     reach it, because no fixture feeds the wizard an unresolvable code.
      //   · `PK-PETB-8804` → `AI-NIAC-6601` (CP-3 · H2). The halal seed leaves
      //     every PACKAGING row `'UNDETERMINED'` (Seat 3, `D-COMP-HALAL-1` —
      //     BPOM excludes packaging, halal may not), so the PET bottle now
      //     REFUSES on halal.
      //
      // ⚠️ AND THERE IS NO LONGER A "QUIET" MATERIAL TO PICK. In today's master
      // BPOM-`NOT_APPLICABLE` ⇔ packaging ⇔ halal-`UNDETERMINED`, so **no
      // material anywhere clears the quality step without a human answer.**
      // `AI-NIAC-6601` is MG-04: both regimes can answer it, and both ASK. The
      // specs below tick both, which is exactly what a clerk now has to do.
      materialCode: 'AI-NIAC-6601',
      description: 'UI test carton',
      orderedQty: 100,
      shippedQty: 100,
      lotNumber: 'LOT-UI-1',
    },
  ],
});

/**
 * CP-3 · H2 — tick both regulatory checks on the quality step.
 *
 * Neither is seeded (`REQUIRED-OPENS-PRE-ANSWERED-01`) and both now block
 * (`INFERBPOM-REGULATORY-01` for BPOM, `INFERHALAL-READS-PROSE-01` for halal),
 * so a spec whose subject is the ASN source seam has to do what a clerk does.
 * Written as `getByRole` on the accessible name rather than a test id, so it
 * fails loudly if either control stops being asked for — silence here would
 * mean the gate had gone quiet, which is the whole defect class.
 */
const answerRegulatoryChecks = () => {
  fireEvent.click(screen.getByRole('radio', { name: /Halal Seal Check.*Pass/ }));
  fireEvent.click(screen.getByRole('radio', { name: /BPOM Lot Tracking.*Pass/ }));
};

describe('BuyerGoodsReceipt — GR from a live store ASN (UI path)', () => {
  it('receives a GR from a store ASN via the source selector, not fixtures only', async () => {
    goodsReceiptStore.reset();
    asnStore.reset();
    asnStore.add(uiTestAsn());

    renderWithProviders(<BuyerGoodsReceipt />);
    await screen.findByText('Rejection Rate (30d)'); // data branch loaded

    fireEvent.click(screen.getByRole('button', { name: /New GR/i }));

    // The live submitted ASN is offered as a receivable source (dock ∪ store).
    const sourceRow = await screen.findByText('ASN-UITEST-1');
    fireEvent.click(sourceRow);

    // Step through the wizard (all accepted), ANSWERING BOTH REGULATORY CHECKS —
    // there are no "defaults" for those any more, by design.
    fireEvent.click(screen.getByRole('button', { name: 'Next' })); // → details
    fireEvent.click(screen.getByRole('button', { name: 'Next' })); // → quality
    answerRegulatoryChecks();
    fireEvent.click(screen.getByRole('button', { name: 'Next' })); // → disposition
    fireEvent.click(screen.getByRole('button', { name: 'Create GR' }));

    // A real GR was created for the store ASN — through the command seam — and
    // the supplier is derived from the ASN's PO (not left blank).
    await waitFor(() => {
      const gr = goodsReceiptStore.all().find((g) => g.asnNumber === 'ASN-UITEST-1');
      expect(gr).toBeTruthy();
      expect(gr!.supplierName).not.toBe('—');
      expect(gr!.supplierName.length).toBeGreaterThan(0);
    });
  });

  it('mixed quantities → derived Partially Approved → posted → ASN discrepancy cascade', async () => {
    goodsReceiptStore.reset();
    asnStore.reset();
    asnStore.add(uiTestAsn());

    renderWithProviders(<BuyerGoodsReceipt />);
    await screen.findByText('Rejection Rate (30d)');

    fireEvent.click(screen.getByRole('button', { name: /New GR/i }));
    fireEvent.click(await screen.findByText('ASN-UITEST-1'));

    // Step 1 → Details, then accept 60 of 100 received (40 rejected → mixed line).
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(
      screen.getByLabelText('Accepted quantity for AI-NIAC-6601'),
      { target: { value: '60' } },
    );
    fireEvent.change(
      await screen.findByLabelText('Rejection reason for AI-NIAC-6601'),
      { target: { value: '40 cartons crushed in transit' } },
    );

    // Details → Quality (answer both checks) → Disposition.
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    answerRegulatoryChecks();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    // The header disposition is DERIVED and displayed (no free-choice radio).
    expect(screen.getByText(/Header Disposition/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create GR' }));

    // Partial-approve is the only path that both POSTS and cascades: the GR posts
    // to SAP and the linked ASN flips to Discrepancy.
    await waitFor(() => {
      const gr = goodsReceiptStore.all().find((g) => g.asnNumber === 'ASN-UITEST-1');
      expect(gr?.status).toBe('Posted to SAP');
    });
    expect(asnStore.get('ASN-UITEST-1')!.status).toBe('Discrepancy');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CP-3 · E4 — THE LEDGER REACHES THE GATE, THROUGH THE REAL READ.
//
// ⚠️ WHY THIS SUITE EXISTS AND THE WIZARD'S OWN ONE IS NOT ENOUGH. Every spec
// in `GRInspectionWizard.test.tsx` hands the ledger in as a PROP, so all of
// them would still pass if `BuyerGoodsReceipt` passed a hard-coded `[]` and
// never called `useEnforcementSettings()` at all — the behaviour today would
// be identical (an empty ledger derives the same `BLOCK`), and the migration
// would be COSMETIC: a registry read wired to nothing, with the consequence
// still effectively in the code.
//
// So the proof has to run the whole path — store → seam → scoped hook → page →
// wizard → clause — and it has to run it with a mode that MOVES, because a
// disconnected wire and a connected one are indistinguishable at `BLOCK`.
// ───────────────────────────────────────────────────────────────────────────

/** A named person. Required because relaxing is a LOOSENING, and only a test
 *  can supply one — nothing in the product can name a human (F1). */
const NAMED_IN_A_TEST = {
  kind: 'RESOLVED',
  person: { personId: 'usr-014', displayName: 'Rina Wijaya' },
};

/** Record OBSERVE for both shipped checks, through the real verb. */
const relaxBothChecks = async () => {
  const svc = new MockCommandService();
  for (const entityId of SEEDED_CHECKS) {
    const res = await svc.dispatch(
      { personaType: 'buyer', supplierId: null },
      {
        transitionId: 't_enforcement_set',
        entity: 'enforcement',
        entityId,
        payload: { mode: 'OBSERVE', reviewBy: '2099-12-31', setBy: NAMED_IN_A_TEST },
      },
    );
    // A silent refusal here would make the spec below assert nothing.
    expect(res.status).toBe('done');
  }
};

/** Open the wizard on the live ASN and stop on the quality step, ANSWERING
 *  NOTHING — the state in which the two governed clauses decide the outcome. */
const openQualityUnanswered = async () => {
  goodsReceiptStore.reset();
  asnStore.reset();
  asnStore.add(uiTestAsn());
  renderWithProviders(<BuyerGoodsReceipt />);
  await screen.findByText('Rejection Rate (30d)');
  fireEvent.click(screen.getByRole('button', { name: /New GR/i }));
  fireEvent.click(await screen.findByText('ASN-UITEST-1'));
  fireEvent.click(screen.getByRole('button', { name: 'Next' })); // → details
  fireEvent.click(screen.getByRole('button', { name: 'Next' })); // → quality
  return () => screen.getByRole('button', { name: 'Next' });
};

describe('BuyerGoodsReceipt — CP-3 · E4, the enforcement ledger reaches the gate', () => {
  beforeEach(() => {
    enforcementSettingStore.reset();
  });

  it('⚠️ THE SHIPPED LEDGER STILL STOPS THE STEP — the delta at the page is zero', async () => {
    // `AI-NIAC-6601` is MG-04: halal REQUIRED and BPOM applicable, so both
    // governed clauses are live and neither is answered. Under the ledger the
    // product boots with, the step does not advance — exactly as it did before
    // E4, when the wizard asserted the consequence instead of reading it.
    await seedEnforcementLedger();
    const next = await openQualityUnanswered();
    expect(screen.getByRole('radio', { name: /Halal Seal Check.*Pass/ })).not.toBeChecked();
    expect(next()).toBeDisabled();
  });

  it('⚠️ AND AN `OBSERVE` LEDGER REACHES IT — so the read is WIRED, not decorative', async () => {
    // The same page, the same ASN, the same unanswered checks — and the step
    // advances, because a recorded relaxation travelled the whole path. This is
    // the spec that would fail if `BuyerGoodsReceipt` stopped reading the seam
    // and handed the wizard an empty array.
    //
    // ⚠️ AND BOTH QUESTIONS ARE STILL ASKED. Relaxing enforcement is not
    // relaxing honesty: the radios still render, still open unanswered, and the
    // inspector is still asked. Only the CONSEQUENCE moved.
    await relaxBothChecks();
    const next = await openQualityUnanswered();
    expect(screen.getByRole('radio', { name: /Halal Seal Check.*Pass/ })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /BPOM Lot Tracking.*Pass/ })).not.toBeChecked();
    expect(next()).not.toBeDisabled();
  });

  it('⚠️ A SUPPLIER NEVER SEES THIS PAGE, so the buyer-only read is not a gap here', async () => {
    // `getEnforcementSettings` REFUSES a supplier with SCOPE_DENIED rather than
    // answering with an empty page (E2's build decision). Reaching that refusal
    // through this page would need a supplier on a buyer route; what a supplier
    // is owed is the STAMP on its own receipt, which rides E3. Recorded so the
    // absence of a supplier spec here reads as a boundary, not an oversight.
    await seedEnforcementLedger();
    await expect(
      mockDataService.enforcement.getEnforcementSettings({
        personaType: 'supplier',
        supplierId: 'sup-007',
      }),
    ).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
  });
});
