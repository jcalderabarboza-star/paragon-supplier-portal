// ────────────────────────────────────────────────────────────────────────────
// §69 — THE BAND SAYS WHERE IT CAME FROM.
//
// §68 renamed `approver` → `approvalLevel` and re-labelled the row "Routes to",
// which fixed WHAT the field names. It left WHERE THE VALUE CAME FROM unstated,
// and the values look computed: 43M → Section Head, 79M/105M → Procurement
// Head, 210M → VP Procurement. Nothing computes them, on two independent
// grounds that are measured rather than asserted (see the guard beside this).
//
// ⚠️ The operator's alternative was to DERIVE the band. Refused, and the reason
// belongs in a test rather than only in a note: the fixture constrains ≤43M,
// [67M,105M] and ≥210M and leaves (43,67) and (105,210) unassigned, so any
// derivation invents its own boundaries — a computed-LOOKING band with invented
// numbers, which is a worse half-truth than an authored one honestly labelled.
//
// ⚠️ RULE 4 — the known-GOOD render is asserted FIRST in each pair. "The note is
// absent" is indistinguishable from "the panel never opened".
// ────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../test/test-utils';
import { purchaseRequisitionStore } from '../services/data/mock/stores/purchaseRequisitionStore';
import BuyerRequisitions from './BuyerRequisitions';

/** The seeded row in the approval queue — carries an authored band. */
const BANDED_PR = 'PR-2026-00344'; // pr-004, 43M, 'Section Head'
/** The seeded Draft — carries NO band at all. */
const UNBANDED_PR = 'PR-2026-00345'; // pr-005, 84M, ''

const open = async (number: string) => {
  await screen.findByText('Purchase Requisitions');
  fireEvent.click(await screen.findByText(number));
  await screen.findByText(`PR ${number}`);
};

beforeEach(() => {
  purchaseRequisitionStore.reset();
});

describe('§69 · the population this file rests on', () => {
  it('⚠️ FIRST — the two rows differ in the way the batch is about', () => {
    // Every claim below is meaningless if both rows carry the same thing.
    expect(purchaseRequisitionStore.get('pr-004')!.approvalLevel).toBe('Section Head');
    expect(purchaseRequisitionStore.get('pr-005')!.approvalLevel).toBe('');
    // …and they are NOT distinguished by value magnitude in the direction the
    // band implies: the UNBANDED row is worth twice the banded one. A rule that
    // assigned bands by value could not have produced this pair.
    expect(purchaseRequisitionStore.get('pr-005')!.estimatedValue).toBeGreaterThan(
      purchaseRequisitionStore.get('pr-004')!.estimatedValue,
    );
  });
});

describe('⚠️ §69 · A BAND THAT LOOKS COMPUTED SAYS THAT IT IS NOT', () => {
  it('✅ an authored band renders, WITH its provenance beside it', () => {
    renderWithProviders(<BuyerRequisitions />, { identity: BUYER });
    return open(BANDED_PR).then(() => {
      expect(screen.getByTestId('pr-approval-level')).toHaveTextContent('Section Head');
      expect(screen.getByTestId('pr-approval-level-provenance')).toHaveTextContent(
        /not derived from the estimated value/i,
      );
    });
  });

  it('⚠️ AND THE PROVENANCE IS ON THE UNBANDED ROW TOO — the claim is about the FIELD', () => {
    // A note that appeared only when a band was present would read as a caveat
    // on that band rather than as a fact about where the field comes from.
    renderWithProviders(<BuyerRequisitions />, { identity: BUYER });
    return open(UNBANDED_PR).then(() => {
      expect(screen.getByTestId('pr-approval-level-provenance')).toBeInTheDocument();
    });
  });

  it('⚠️ an unassigned band SAYS "Not assigned" — it no longer shares a glyph with the fallback', () => {
    // pr-005 stored a literal '—' and the renderer fell back to '—', so "no band
    // assigned", "field empty" and "nothing to show" were one character. After
    // §68 every created PR stores '' too, which made the collision the common
    // case rather than a fixture quirk.
    renderWithProviders(<BuyerRequisitions />, { identity: BUYER });
    return open(UNBANDED_PR).then(() => {
      const cell = screen.getByTestId('pr-approval-level');
      expect(cell).toHaveTextContent('Not assigned');
      expect(cell.textContent).not.toBe('—');
    });
  });

  it('the row is still labelled as a destination, not as an actor (§68 holds)', () => {
    renderWithProviders(<BuyerRequisitions />, { identity: BUYER });
    return open(BANDED_PR).then(() => {
      expect(screen.getByText('Routes to')).toBeInTheDocument();
      // …and nobody has approved it, so the row that names a DECIDER is absent.
      expect(screen.queryByTestId('pr-approved-by')).not.toBeInTheDocument();
    });
  });
});
