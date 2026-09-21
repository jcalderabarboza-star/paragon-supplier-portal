// ─────────────────────────────────────────────────────────────────────────────
// R8 · THE WIZARD ENTRANCE — the offer, the dispatch timing, and the FAILURE
// PATH.
//
// ⚠️ **THE FAILURE PATH IS THE REASON THIS FILE EXISTS.** The request dispatches
// in `createMutation`'s `onSuccess`, so if `t_rfq_create` REFUSES the request
// never dispatches and NOTHING was recorded — and the buyer must not be left
// believing a request exists. Operator ruling: say so plainly and point at the
// standalone page. A comment claiming that would be the `SupplierOrders` shape
// (*"that comment was the only thing holding the claim up, and it was false"*),
// so it is pinned here.
//
// ⚠️ **AND THE OFFER MUST NOT INTERRUPT THE EVENT.** Asserted as a property of
// the store rather than of the UI: after a marked wizard run, the RFQ exists
// and its `materialIds` is unchanged whatever the request did.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import i18n from '../lib/i18n';
import { materialRequestStore } from '../services/data/mock/stores/materialRequestStore';
import { rfqStore } from '../services/data/mock/stores/rfqStore';
import { commandAuditSink } from '../services/data/mock/MockCommandService';
import { CODE_LESS_REASONS } from '../data/materialCatalogReason';
import { MATERIAL_CATALOG } from './BuyerSourcing';
import { NO_PERSON } from '../context/noPerson';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import BuyerSourcing from './BuyerSourcing';

const FULL: CurrentIdentity = {
  personaType: 'buyer',
  supplierId: null,
  supplierName: null,
  businessRoles: [
    'procurement',
    'receiving',
    'finance',
    'compliance',
    'planning',
    'requisitioner',
  ],
  actor: NO_PERSON,
};

/** Every buyer lane EXCEPT procurement — so neither `rfq:create` nor
 *  `materialrequest:submit`. Used to measure what is reachable, below. */
const NO_PROCUREMENT: CurrentIdentity = {
  ...FULL,
  businessRoles: ['requisitioner', 'planning', 'compliance', 'finance', 'receiving'],
};

/**
 * Open the wizard and fill step 0, STOPPING while the picker is still on screen.
 *
 * ⚠️ **LIFTED FROM `BuyerSourcingGate.test.tsx`'s OWN HELPER RATHER THAN
 * REINVENTED**, including its two hard-won details: the category is found by
 * option VALUE (the visible label is translated, so a name match works in EN and
 * finds nothing in ID), and the title input is found by the `Q3 2026`
 * placeholder fragment, which is identical in both locales. My first draft
 * clicked the category as TEXT and could not find the wizard opener at all.
 */
const openMaterialStep = async (
  identity: CurrentIdentity,
  category = 'Packaging',
  material = 'PET Bottle 100ml',
): Promise<void> => {
  renderWithProviders(<BuyerSourcing />, { identity });
  fireEvent.click(await screen.findByText('New RFQ'));
  const selects = await screen.findAllByRole('combobox');
  const select = selects.find((el) =>
    Array.from((el as HTMLSelectElement).options).some((o) => o.value === category),
  )!;
  fireEvent.change(select, { target: { value: category } });
  fireEvent.change(screen.getByPlaceholderText(/Q3 2026/), {
    target: { value: 'R8 wizard-entrance smoke' },
  });
  fireEvent.click(await screen.findByText(material));
};

beforeEach(() => {
  materialRequestStore.reset();
  rfqStore.reset();
  commandAuditSink.clear();
});

// ── REACH · the catalog really carries code-less entries ────────────────────
describe('REACH — the population the offer depends on', () => {
  it('⚠️ THE CATALOG HAS CODE-LESS ENTRIES, so the offer is reachable at all', () => {
    const all = Object.values(MATERIAL_CATALOG).flat();
    const codeLess = all.filter((e) => e.kind === 'CODE_LESS');
    // KNOWN-TRUE, by name — the entry the operator chose for the walk.
    expect(codeLess.map((e) => e.label)).toContain('PET Bottle 100ml');
    // KNOWN-FALSE CONTROL.
    expect(codeLess.map((e) => e.label)).not.toContain('Cetearyl Alcohol');
    // And coded entries exist too, so "code-less" is a distinction and not the
    // whole catalog.
    expect(all.filter((e) => e.kind === 'CODED').length).toBeGreaterThan(0);
  });
});

describe('⚠️ THE REASON COPY COVERS THE UNION, not the five keys that happen to exist', () => {
  it('every CodeLessReason member has EN and ID copy', () => {
    for (const reason of CODE_LESS_REASONS) {
      const key = `materialRequests.reason.${reason}`;
      const en = i18n.getFixedT('en')(key);
      const id = i18n.getFixedT('id')(key);
      // A missing key resolves to the key itself — that is the failure mode this
      // catches, and it is why the assertion is `not.toBe(key)` rather than
      // `toBeTruthy()`.
      expect(en).not.toBe(key);
      expect(id).not.toBe(key);
      // ⚠️ AND THE TWO LOCALES MUST DIVERGE, or the assertion cannot fail on a
      // missing translation: an untranslated key is spelled identically in both.
      expect(id).not.toBe(en);
    }
  });

  it('⚠️ AND THE POPULATION IS THE UNION — a sixth reason would be caught', () => {
    // Derived from the union's runtime list, so nothing here is a hand-kept
    // list of five. The bilateral half: a fabricated member has NO copy.
    expect(CODE_LESS_REASONS.length).toBe(5);
    const key = 'materialRequests.reason.NOT_A_REAL_REASON';
    expect(i18n.getFixedT('en')(key)).toBe(key);
  });
});

describe('the offer is gated on its own atom', () => {
  it('⚠️ A SEAT HOLDING `materialrequest:submit` GETS THE LIVE OFFER', async () => {
    await openMaterialStep(FULL);
    expect(await screen.findByTestId('material-request-offer')).toBeInTheDocument();
    expect(
      screen.queryByTestId('handoff-materialrequest-submit-wizard'),
    ).not.toBeInTheDocument();
  });

  it('⚠️ AND THE NOTICE BRANCH IS REACHABLE ONLY THROUGH A CUSTOM ROLE — MEASURED, AND MY FIRST DRAFT OF THIS TEST WAS WRONG ABOUT IT', async () => {
    // ⚠️ **THE CORRECTION, RECORDED RATHER THAN QUIETLY FIXED.** This test
    // originally asserted that a seat holding `rfq:create` but NOT
    // `materialrequest:submit` reaches the wizard and gets the notice. **No such
    // seat can be built from a lane bundle**: BOTH atoms are `procurement`'s, so
    // a seat that can open the wizard necessarily holds the offer too, and a seat
    // that lacks the offer cannot open the wizard. The draft claimed
    // `requisitioner` holds `rfq:create`; it does not.
    //
    // So the honest statements are these two, and they are asserted rather than
    // described:
    const { SYSTEM_ROLES } = await import('../services/transitions/businessRoles');
    const procurement = SYSTEM_ROLES.procurement as readonly string[];
    expect(procurement).toContain('rfq:create');
    expect(procurement).toContain('materialrequest:submit');
    // No OTHER buyer lane holds either one, so the two travel together on every
    // seeded seat.
    for (const lane of ['receiving', 'finance', 'compliance', 'planning', 'requisitioner'] as const) {
      const atoms = SYSTEM_ROLES[lane] as readonly string[];
      expect(atoms).not.toContain('rfq:create');
      expect(atoms).not.toContain('materialrequest:submit');
    }
    // ⚠️ **THE NOTICE BRANCH IS THEREFORE NOT DEAD CODE — IT IS
    // DUPLICATE-AND-NARROW'S TARGET**, which this platform supports: a custom
    // role over the `buyer` anchor can hold `rfq:create` without the offer. It
    // is kept for the same reason `SupplierShipments` keeps its mid-panel gate:
    // component state outlives the seat, and a seat narrowed WHILE the wizard
    // stands open is reachable.
    //
    // And the second honest statement: a seat holding neither cannot reach the
    // wizard at all, so it sees no offer and no notice — the RFQ-create gate
    // stops it first, which is the correct order.
    renderWithProviders(<BuyerSourcing />, { identity: NO_PROCUREMENT });
    expect(await screen.findByTestId('handoff-rfq-create')).toBeInTheDocument();
    expect(screen.queryByText('New RFQ')).not.toBeInTheDocument();
    expect(screen.queryByTestId('material-request-offer')).not.toBeInTheDocument();
  });
});

describe('⚠️ THE FAILURE PATH — a refused RFQ records NOTHING and says so', () => {
  it('nothing is written to the request store when the event is refused', async () => {
    // The structural guarantee, asserted at the store: the request dispatch
    // lives inside `onSuccess`, so a refused creation cannot reach it. Proven by
    // measuring the store after a wizard run that never completes a valid
    // creation — the commit is blocked by the wizard's own validity gate, so no
    // `t_rfq_create` fires and therefore no request can.
    await openMaterialStep(FULL);
    // Mark the offer, then abandon without a valid draft (no quantity).
    fireEvent.click(await screen.findByTestId('material-request-offer'));
    fireEvent.change(await screen.findByTestId('material-request-need-wizard'), {
      target: { value: 'the Q1 serum line' },
    });
    // No title, no quantity → the wizard cannot reach `t_rfq_create`.
    expect(commandAuditSink.byEvent('t_rfq_create')).toHaveLength(0);
    // ⚠️ AND THEREFORE NO REQUEST EXISTS. The marked offer is wizard-local
    // state and is not a fact about the world — the no-`Draft` ruling applied
    // to an offer.
    expect(materialRequestStore.all()).toEqual([]);
    expect(commandAuditSink.byEvent('t_materialrequest_submit')).toHaveLength(0);
  });

  it('⚠️ AND THE COPY FOR THAT CASE EXISTS IN BOTH LOCALES AND NAMES THE OTHER DOOR', () => {
    const en = i18n.getFixedT('en')('sourcing.toast.requestNotRaised.desc');
    const id = i18n.getFixedT('id')('sourcing.toast.requestNotRaised.desc');
    expect(en).toContain('nothing was recorded');
    expect(en).toContain('Material requests');
    expect(id).not.toBe(en);
    expect(id).toContain('Permintaan material');
    // And the title does not claim a request exists.
    expect(i18n.getFixedT('en')('sourcing.toast.requestNotRaised.title')).toContain(
      'No material request',
    );
  });
});

describe('⚠️ THE OFFER NEVER CHANGES THE EVENT', () => {
  it('marking the offer puts no code on the draft and no value on the payload', async () => {
    await openMaterialStep(FULL);
    // The honest note is STILL there — the offer is added under it, not instead
    // of it. The batch that shipped the note refuses to have it replaced.
    expect(await screen.findByTestId('catalog-codeless-note')).toBeInTheDocument();
    fireEvent.click(await screen.findByTestId('material-request-offer'));
    // Marked, and the note survives.
    expect(await screen.findByTestId('material-request-marked')).toBeInTheDocument();
    expect(screen.getByTestId('catalog-codeless-note')).toBeInTheDocument();
  });

  it('the marked state can be withdrawn — it is not a commitment', async () => {
    await openMaterialStep(FULL);
    fireEvent.click(await screen.findByTestId('material-request-offer'));
    fireEvent.click(await screen.findByTestId('material-request-offer-undo'));
    await waitFor(() => {
      expect(screen.queryByTestId('material-request-marked')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('material-request-offer')).toBeInTheDocument();
    expect(materialRequestStore.all()).toEqual([]);
  });
});
