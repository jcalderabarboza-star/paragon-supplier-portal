import { describe, it, expect } from 'vitest';
import { screen, fireEvent, cleanup } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import { mockShipments } from '../../data/mockShipments';
import { asnStore } from '../../services/data/mock/stores/asnStore';
import { bpomOf } from '../../services/sdc/bpom';
import { halalOf } from '../../services/sdc/halal';
import { MATERIAL_MASTER } from '../../services/sdc/fixtures';
import GRInspectionWizard from './GRInspectionWizard';
import { enforcementSettingStore } from '../../services/data/mock/stores/enforcementSettingStore';
import { seedEnforcementLedger, SEEDED_CHECKS } from '../../services/data/mock/enforcementSeed';
import {
  GOVERNED_CHECK_IDS,
  blocks,
  effectiveEnforcement,
  type EnforcementSetting,
} from '../../lib/enforcement';

// ────────────────────────────────────────────────────────────────────────────
// GRInspectionWizard (CP-0 · W1 · 2f-a) — the FIRST spec this wizard has ever
// had. It posts goods receipts, and it was previously uncovered entirely, which
// is how a bare `Number(e.target.value)` on the quantity closest to inventory
// truth survived the whole locale cutover.
//
// THE DURABLE LOCK IS THE INPUT CONTRACT (the 4b lesson, 4b-FIND-01). A
// behavioural spec typing "1.500" would pass over a broken surface, because
// jsdom does no locale parsing and en-US `type="number"` returns some tokens
// verbatim. `type="text"` + `inputMode` is the property whose absence caused the
// defect, and it is locale-independent and jsdom-visible. The behavioural specs
// stack on top of it.
// ────────────────────────────────────────────────────────────────────────────

/**
 * The ledger every pre-E4 spec renders against — EMPTY, which derives
 * `BLOCK / NO_SETTING_RECORDED` for every check and is therefore byte-for-byte
 * the consequence those specs were written under. They assert the SAME things
 * they asserted before the migration, and they had to keep passing unchanged;
 * that is half of "the delta is zero".
 */
const EMPTY_LEDGER: readonly EnforcementSetting[] = [];

// A shipment the wizard actually offers: only 'At Dock' / 'Unloading' are
// eligible GR sources (ELIGIBLE_STATUSES), and it must carry a line to inspect.
const RECEIVABLE = mockShipments.find(
  (s) =>
    (s.status === 'At Dock' || s.status === 'Unloading') && s.lineItems.length > 0,
)!;

const renderWizard = () => {
  asnStore.reset();
  return renderWithProviders(
    <GRInspectionWizard
      onClose={() => {}}
      onComplete={() => {}}
      shipments={mockShipments}
      asns={[...asnStore.all()]}
      enforcementSettings={EMPTY_LEDGER}
    />,
  );
};

/** Reach step 2 (the inspection lines) by picking the first dock source. */
const openLines = async () => {
  renderWizard();
  fireEvent.click(await screen.findByText(RECEIVABLE.asnNumber));
  fireEvent.click(screen.getByRole('button', { name: /Next/i }));
  const code = RECEIVABLE.lineItems[0].materialCode;
  return {
    received: await screen.findByLabelText(`Received quantity for ${code}`),
    accepted: screen.getByLabelText(`Accepted quantity for ${code}`),
  };
};

describe('GRInspectionWizard — the quantity inputs are text, so the parser is load-bearing', () => {
  it('THE LOCK — neither quantity input is type="number" (Ruling 6.2)', async () => {
    const { received, accepted } = await openLines();
    expect(received).toHaveAttribute('type', 'text');
    expect(accepted).toHaveAttribute('type', 'text');
    expect(received).toHaveAttribute('inputmode', 'decimal');
    expect(accepted).toHaveAttribute('inputmode', 'decimal');
    // `min`/`max` went with the number-input contract; `received >= 0` and
    // `accepted <= received` are enforced in `receiptValid`, where they are
    // actually checked. An attribute that vanishes with the type was never the
    // guarantee (the 2e-b-4b precedent).
    expect(received).not.toHaveAttribute('min');
    expect(accepted).not.toHaveAttribute('max');
  });

  it('POSITIVE TWIN — the form opens on its seeded values with NO refusal', async () => {
    // The IntakeAdjustDrawer trap: a grouped seed would make the form refuse its
    // own untouched default. Nothing is refused before anyone types.
    const { received } = await openLines();
    expect(received).toHaveValue(String(RECEIVABLE.lineItems[0].qty));
    expect(screen.queryByTestId('gr-received-refusal-0')).not.toBeInTheDocument();
    expect(received).toHaveAttribute('aria-invalid', 'false');
  });

  it('a CLEARED received quantity refuses, and says to type 0 instead', async () => {
    const { received } = await openLines();
    fireEvent.change(received, { target: { value: '' } });

    const refusal = screen.getByTestId('gr-received-refusal-0');
    expect(refusal).toHaveAttribute('role', 'alert');
    // The whole finding: this used to become 0 and satisfy every guard.
    expect(refusal.textContent).toMatch(/enter 0/i);
    expect(received).toHaveAttribute('aria-invalid', 'true');
  });

  it('a cross-convention quantity refuses, naming the ambiguity', async () => {
    const { received } = await openLines();
    fireEvent.change(received, { target: { value: '1.500' } });
    expect(screen.getByTestId('gr-received-refusal-0').textContent).toMatch(
      /can be read two ways/i,
    );
  });

  it('the ACCEPTED half refuses independently of the received half', async () => {
    const { accepted } = await openLines();
    fireEvent.change(accepted, { target: { value: 'abc' } });
    expect(screen.getByTestId('gr-accepted-refusal-0').textContent).toMatch(
      /not a quantity/i,
    );
    // The received half is untouched and must not be blamed for it.
    expect(screen.queryByTestId('gr-received-refusal-0')).not.toBeInTheDocument();
  });

  it('a TYPED zero is accepted — nothing arrived, and it is a real assertion', async () => {
    const { received, accepted } = await openLines();
    fireEvent.change(received, { target: { value: '0' } });
    fireEvent.change(accepted, { target: { value: '0' } });
    expect(screen.queryByTestId('gr-received-refusal-0')).not.toBeInTheDocument();
    expect(screen.queryByTestId('gr-accepted-refusal-0')).not.toBeInTheDocument();
    expect(received).toHaveAttribute('aria-invalid', 'false');
  });

  it('under a refusal the rejected figure is UNASKABLE — an em dash, not a product of a guess', async () => {
    const { received } = await openLines();
    fireEvent.change(received, { target: { value: '1.500' } });
    // The derived cell shows nothing rather than deriving from a value that does
    // not exist. Same principle as the receipt guard, applied to the surface.
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
  // ── THE LOAD-BEARING ASSERTION ────────────────────────────────────────────
  // The field message is chrome; THIS is the fact. `receiptValid` gates step 2
  // (`stepValid(1)`), so a refusing line must make the wizard unadvanceable —
  // otherwise the refusal is decoration and a false receipt still posts.
  it('THE LOCK — a refusing line BLOCKS the wizard: Next is disabled', async () => {
    const { received } = await openLines();
    const next = () => screen.getByRole('button', { name: /Next/i });
    // POSITIVE TWIN FIRST: the seeded, readable form advances. A gate that
    // blocked everything would pass the negative below on its own.
    expect(next()).toBeEnabled();

    fireEvent.change(received, { target: { value: '' } });
    expect(next()).toBeDisabled();

    // And a TYPED zero un-blocks it — the distinction, enforced at the gate and
    // not merely at the message.
    fireEvent.change(received, { target: { value: '0' } });
    fireEvent.change(
      screen.getByLabelText(`Accepted quantity for ${RECEIVABLE.lineItems[0].materialCode}`),
      { target: { value: '0' } },
    );
    expect(next()).toBeEnabled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// CP-2 · 2B-4b — THE BPOM GATE, FAIL-CLOSED.
//
// `INFERBPOM-REGULATORY-01`'s behavioural half. The wizard used to decide
// whether a received lot needs a BPOM lot check by parsing the first three
// characters of its material code, and an unrecognised code came back `false` —
// "no check required". It now reads the material master through `bpomOf`, and
// an absent determination REFUSES THE LINE BY NAME.
//
// EVERY SOURCE BELOW IS DERIVED FROM THE FIXTURES, never named. A spec that
// hardcodes `ASN-2026-014` passes for a while and then silently tests nothing
// when a fixture moves; a spec that asks "the eligible source whose line the
// master cannot answer for" either finds one or fails loudly.
// ────────────────────────────────────────────────────────────────────────────

/** Eligible GR sources, in the wizard's own terms (ELIGIBLE_STATUSES). */
const ELIGIBLE = mockShipments.filter(
  (s) => (s.status === 'At Dock' || s.status === 'Unloading') && s.lineItems.length > 0,
);

/** The first eligible source whose lines all satisfy `pick`. */
const sourceWhere = (pick: (code: string) => boolean) =>
  ELIGIBLE.find((s) => s.lineItems.every((li) => pick(li.materialCode)));

const REQUIRES = sourceWhere((c) => {
  const o = bpomOf(c);
  return o.ok && o.applicable;
});
const NOT_REQUIRED = sourceWhere((c) => {
  const o = bpomOf(c);
  return o.ok && !o.applicable;
});
const REFUSES = sourceWhere((c) => !bpomOf(c).ok);

/**
 * ⚠️ CP-3 · H2 — A SECOND REGULATORY GATE NOW SHARES THIS STEP.
 *
 * Every BPOM spec below asserts something about whether the wizard MOVES, and
 * `qualityValid` is an AND over both regimes. So a spec that ends "Next is
 * enabled" would be carried, or silently blocked, by the halal gate's state
 * unless the halal question is dealt with explicitly.
 *
 * This helper answers the halal question WHEN ONE IS ASKED, so the BPOM specs
 * stay about BPOM. It is deliberately visible rather than folded into
 * `openQuality`: the cross-gate coupling is a real fact about the surface, and
 * hiding it inside a helper is how the next reader comes to believe these specs
 * still test one gate.
 *
 * ⚠️ WHERE HALAL REFUSES, THERE IS NOTHING TO ANSWER. Those lines cannot reach
 * an enabled Next at all, and the specs say so rather than routing around it.
 */
const settleHalal = () => {
  const pass = screen.queryByRole('radio', { name: /Halal Seal Check.*Pass/ });
  if (pass) fireEvent.click(pass);
};

/** Reach step 3 (Quality) from a named dock source. */
const openQuality = async (asnNumber: string) => {
  renderWizard();
  fireEvent.click(await screen.findByText(asnNumber));
  const next = () => screen.getByRole('button', { name: /Next/i });
  fireEvent.click(next()); // → step 2, receipt
  fireEvent.click(next()); // → step 3, quality
  return next;
};

describe('GRInspectionWizard — the BPOM gate reads the master and fails closed', () => {
  it('THE FIXTURES REACH ALL THREE STATES — else every spec below is vacuous', () => {
    // The guard that stops this whole block passing because the derivation found
    // nothing. `EMPTY-INPUT-REPORTS-CLEAN-01`, four instances deep, and the
    // shape it takes in a spec is a `find` that returns undefined.
    expect(REQUIRES, 'no eligible source REQUIRES a BPOM check').toBeDefined();
    expect(NOT_REQUIRED, 'no eligible source is determined NOT to need one').toBeDefined();
    expect(REFUSES, 'no eligible source REFUSES — the fail-closed path is untested').toBeDefined();
  });

  it('POSITIVE TWIN — a determined NOT_APPLICABLE line shows no BPOM check and no BPOM refusal', async () => {
    // Packaging genuinely needs no BPOM lot check. The absence of a BPOM row
    // here is a DETERMINATION, and it must look nothing like the refusal below —
    // if the gate blocked everything, the negative specs would pass on their own.
    const next = await openQuality(NOT_REQUIRED!.asnNumber);
    expect(screen.queryByTestId('gr-bpom-refusal-0')).not.toBeInTheDocument();
    expect(screen.queryByText('BPOM Lot Tracking')).not.toBeInTheDocument();

    // ⚠️ AMENDED AT CP-3 · H2, AND THE AMENDMENT IS A FINDING, NOT A FIX-UP.
    // This spec used to end `expect(next()).toBeEnabled()`. It cannot any more,
    // and NOT because BPOM changed: every BPOM-not-applicable source in the
    // fixtures is PACKAGING, and packaging is exactly what the halal seed leaves
    // `'UNDETERMINED'` (Seat 3, `D-COMP-HALAL-1` — BPOM excludes packaging,
    // halal may not). So the step is now blocked by the OTHER regime.
    //
    // Asserted rather than deleted, and asserted as a CROSS-GATE fact: the block
    // is present, and the thing producing it is the halal refusal, so nobody can
    // read this as the BPOM gate having become stricter.
    expect(screen.getByTestId('gr-halal-refusal-0')).toBeInTheDocument();
    expect(next()).toBeDisabled();
  });

  // ⚠️ INVERTED AT CP-3 (`REQUIRED-OPENS-PRE-ANSWERED-01`), NOT DELETED. This
  // spec used to end `expect(next()).toBeEnabled()` — and it was GREEN, because
  // the form had already answered the check for the inspector. The assertion was
  // true and the behaviour it described was the defect. It now ends disabled,
  // and the tick that un-blocks it is asserted in the same spec so the inversion
  // cannot be read as "the gate blocks everything now".
  it('⚠️ an APPLICABLE line asks for the check — and the wizard STOPS until it is answered', async () => {
    const next = await openQuality(REQUIRES!.asnNumber);
    expect(screen.getByText('BPOM Lot Tracking')).toBeInTheDocument();
    expect(screen.queryByTestId('gr-bpom-refusal-0')).not.toBeInTheDocument();
    // CP-3 · H2 — the halal question on this line is answered FIRST, so the
    // block below is unambiguously BPOM's. See `settleHalal`.
    settleHalal();
    // The question is asked, and NOT answered.
    expect(next()).toBeDisabled();
    // A human answers it, and only then does the wizard move.
    fireEvent.click(screen.getByRole('radio', { name: /BPOM Lot Tracking.*Pass/ }));
    expect(next()).toBeEnabled();
  });

  it('⚠️ THE LOCK — an UNDETERMINED line BLOCKS the wizard: Next is disabled', async () => {
    // THE LOAD-BEARING ASSERTION. The message is chrome; this is the fact. Under
    // the prefix rule this line rendered NOTHING, owed NOTHING, and posted a
    // receipt asserting no BPOM check was required — a negative nobody had any
    // basis for. A REGULATORY GATE THAT FAILS OPEN IS WORSE THAN ONE THAT FAILS
    // LOUD.
    const next = await openQuality(REFUSES!.asnNumber);
    // Proof we are on the QUALITY step and blocked THERE — a disabled Next two
    // steps earlier would pass this just as well, and mean nothing.
    expect(screen.getByTestId('gr-bpom-refusal-0')).toBeInTheDocument();
    expect(next()).toBeDisabled();
  });

  it('the refusal NAMES the material and the absence — it is not a hidden skip', async () => {
    await openQuality(REFUSES!.asnNumber);
    const refusal = screen.getByTestId('gr-bpom-refusal-0');
    expect(refusal).toHaveAttribute('role', 'alert');
    // ⚠️ FOUND BY A MUTATION PROBE (M6), which flipped the render condition so
    // the Pass/Fail control appeared BESIDE the refusal and nothing went red.
    // A refused line must offer NO check to record: inviting an inspector to
    // tick Pass on an applicability the system has just said it cannot
    // determine is a determination with extra steps.
    expect(screen.queryByText('BPOM Lot Tracking')).not.toBeInTheDocument();
    // The code, so an operator knows which material to chase.
    expect(refusal.textContent).toContain(REFUSES!.lineItems[0].materialCode);
    // And WHICH absence: the master HAS the row and records no determination.
    // The other reason ("does not name") would be a different sentence, and
    // conflating them is how a refusal becomes unactionable.
    expect(refusal.textContent).toMatch(/records no BPOM determination/i);
    expect(refusal.textContent).not.toMatch(/does not name/i);
  });

  it('⚠️ AN UNRESOLVABLE CODE REFUSES TOO — and IDENTICALLY, only the sentence differs', async () => {
    // THE OTHER HALF OF FAIL-CLOSED, and the only place in the tree that can
    // reach it. No fixture feeds the wizard a code the master cannot resolve —
    // that is the discharged 2B-4 gate, and it means the UNKNOWN_MATERIAL path
    // is unreachable from real data and would go untested by default. So the
    // spec constructs one.
    //
    // ⚠️ `'UNDETERMINED' IS NOT QUARANTINE` is a claim about EFFECT, and this is
    // where it is checked as one: the two reasons produce the same blocked step
    // and the same absent determination. `reason` names the gap; it is not a
    // dial a caller can turn to proceed.
    asnStore.reset();
    asnStore.add({
      ...[...asnStore.all()][0],
      asnNumber: 'ASN-UNKNOWN-MAT',
      status: 'Submitted',
      lineItems: [
        {
          materialCode: 'PK-NOT-IN-THE-MASTER',
          description: 'A code no master row names',
          orderedQty: 10,
          shippedQty: 10,
          lotNumber: 'LOT-X',
        },
      ],
    });
    expect(bpomOf('PK-NOT-IN-THE-MASTER')).toEqual({
      ok: false,
      reason: 'UNKNOWN_MATERIAL',
      materialCode: 'PK-NOT-IN-THE-MASTER',
    });

    renderWithProviders(
      <GRInspectionWizard
        onClose={() => {}}
        onComplete={() => {}}
        shipments={[]}
        asns={[...asnStore.all()]}
        enforcementSettings={EMPTY_LEDGER}
      />,
    );
    fireEvent.click(await screen.findByText('ASN-UNKNOWN-MAT'));
    const next = () => screen.getByRole('button', { name: /Next/i });
    fireEvent.click(next());
    fireEvent.click(next());

    const refusal = screen.getByTestId('gr-bpom-refusal-0');
    // SAME testid, SAME role, SAME block — the effect is indistinguishable.
    expect(refusal).toHaveAttribute('role', 'alert');
    expect(next()).toBeDisabled();
    // Only the named absence differs, which is the whole permitted use of
    // `reason`: this master has no such row, rather than has one and is silent.
    expect(refusal.textContent).toMatch(/does not name/i);
    expect(refusal.textContent).not.toMatch(/records no BPOM determination/i);
    expect(refusal.textContent).toContain('PK-NOT-IN-THE-MASTER');
  });

  it('⚠️ THE ROW THE MASTER WON — a code the prefix rule called `false` now asks for the check', async () => {
    // `RM-EMUL-9440`. The prefix rule returned false; the master says APPLICABLE
    // on `doc-201`, a BPOM Notification linked to this line's own parent PO.
    // Where they disagreed, the master wins — asserted at the surface, not just
    // in the lookup, because "the master wins" is a claim about what an
    // inspector is shown.
    const asn = [...asnStore.all()].find((a) =>
      a.lineItems.some((li) => li.materialCode === 'RM-EMUL-9440'),
    );
    expect(asn, 'RM-EMUL-9440 is no longer on a receivable ASN').toBeDefined();
    // The retired rule's answer, restated so the before-and-after is in one place.
    expect('RM-EMUL-9440'.startsWith('AI-') || 'RM-EMUL-9440'.startsWith('FR-')).toBe(false);

    renderWithProviders(
      <GRInspectionWizard
        onClose={() => {}}
        onComplete={() => {}}
        shipments={mockShipments}
        asns={[...asnStore.all()]}
        enforcementSettings={EMPTY_LEDGER}
      />,
    );
    fireEvent.click(await screen.findByText(asn!.asnNumber));
    const next = () => screen.getAllByRole('button', { name: /Next/i })[0];
    fireEvent.click(next());
    fireEvent.click(next());
    expect(screen.getAllByText('BPOM Lot Tracking').length).toBeGreaterThan(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// CP-3 · `REQUIRED-OPENS-PRE-ANSWERED-01` — A REQUIRED CHECK OPENS UNANSWERED.
//
// 2B-4b made the system decide, from the material master, that a lot needs a
// BPOM check. The form then TICKED PASS ON IT before an inspector looked —
// `inferBpom(...) ? 'Pass' : undefined`, carried forward verbatim into
// `bpomOf(...)`. A derived fact hand-stamped, on a regulatory control.
//
// ⚠️ WHAT THESE SPECS ARE FOR IS THE MIDDLE STATE. There have always been three
// — NOT REQUIRED, REQUIRED AND UNANSWERED, REQUIRED AND ANSWERED — and the
// second one had never rendered in the product's life, so nothing could pin it.
// The lock is not "a marker appears"; the lock is that the wizard STOPS.
// ────────────────────────────────────────────────────────────────────────────

/** The Pass radio of a named check, disambiguated by its own accessible name. */
const radioFor = (check: string, v: 'Pass' | 'Fail') =>
  screen.getByRole('radio', { name: new RegExp(`${check}.*${v}`) });

describe('GRInspectionWizard — a required check opens UNANSWERED, and blocks', () => {
  it('⚠️ THE DEFECT, DIRECTLY — neither BPOM radio is checked on open', async () => {
    // The observed browser fact, inverted: `bpom-0`, value `Pass`,
    // `checked: true`, before anyone touched anything. If a seed ever comes
    // back, THIS is the spec that names it, without any reasoning about gates.
    await openQuality(REQUIRES!.asnNumber);
    expect(radioFor('BPOM Lot Tracking', 'Pass')).not.toBeChecked();
    expect(radioFor('BPOM Lot Tracking', 'Fail')).not.toBeChecked();
  });

  it('⚠️ THE LOCK — an unanswered required check DISABLES Next, on the quality step', async () => {
    // The load-bearing assertion. The marker below is chrome; this is the fact.
    const next = await openQuality(REQUIRES!.asnNumber);
    // Proof we are blocked HERE and not by some earlier step: the quality
    // surface is on screen, and no refusal is in play (this line resolves fine).
    expect(screen.getByText('BPOM Lot Tracking')).toBeInTheDocument();
    expect(screen.queryByTestId('gr-bpom-refusal-0')).not.toBeInTheDocument();
    expect(next()).toBeDisabled();
  });

  it('⚠️ FAIL UN-BLOCKS IT TOO — the gate demands an ANSWER, not a PASS', async () => {
    // The failure mode this guards against is subtle and worse than the one it
    // replaces: a gate that only clears on `Pass` would be the SAME fabrication
    // wearing a workflow, quietly making "record what you found" mean "record
    // that it was fine". An inspector who finds a bad lot must be able to say so
    // and move on — the receipt then rolls up Rejected, which is the point.
    const next = await openQuality(REQUIRES!.asnNumber);
    settleHalal(); // CP-3 · H2 — isolate the BPOM gate; see `settleHalal`.
    expect(next()).toBeDisabled();
    fireEvent.click(radioFor('BPOM Lot Tracking', 'Fail'));
    expect(next()).toBeEnabled();
  });

  it('THE THREE STATES ARE TOLD APART BY SHAPE — not by a fourth token', async () => {
    // NOT REQUIRED: no row, no marker, nothing owed. Distinguishable from
    // REQUIRED-AND-UNANSWERED by the ABSENCE of the control, which is why no
    // 'Pending' / 'N/A' token was invented for the middle state — a third radio
    // option would have made the two look alike again.
    await openQuality(NOT_REQUIRED!.asnNumber);
    expect(screen.queryByText('BPOM Lot Tracking')).not.toBeInTheDocument();
    expect(screen.queryByTestId('gr-bpom-unanswered-0')).not.toBeInTheDocument();
    // ⚠️ AMENDED AT CP-3 · H2. The `toBeEnabled()` that stood here is gone for
    // the reason recorded in the POSITIVE TWIN spec above: every BPOM-not-
    // applicable fixture source is packaging, and packaging is halal-
    // `'UNDETERMINED'`. **THE THREE STATES ARE STILL TOLD APART BY SHAPE — that
    // is what this spec is about** — but the SHAPE is the presence or absence of
    // the control, never the Next button, and pinning the button here would be
    // pinning a fact about a different gate.
    cleanup();

    // REQUIRED AND UNANSWERED: the control, nothing selected, a marker, blocked.
    const required = await openQuality(REQUIRES!.asnNumber);
    settleHalal();
    const marker = screen.getByTestId('gr-bpom-unanswered-0');
    expect(marker).toBeInTheDocument();
    // Polite, NOT an alert — an outstanding question is not a fault. The BPOM
    // *refusal* keeps role="alert"; conflating them would tell a clerk they had
    // done something wrong by opening the form.
    expect(marker).toHaveAttribute('role', 'status');
    expect(marker.textContent).toMatch(/not answered/i);
    expect(required()).toBeDisabled();

    // REQUIRED AND ANSWERED: the marker goes, the answer stays, the wizard moves.
    fireEvent.click(radioFor('BPOM Lot Tracking', 'Pass'));
    expect(screen.queryByTestId('gr-bpom-unanswered-0')).not.toBeInTheDocument();
    expect(radioFor('BPOM Lot Tracking', 'Pass')).toBeChecked();
    expect(required()).toBeEnabled();
  });

  it('the required control says so to a screen reader — aria-required, on both options', async () => {
    await openQuality(REQUIRES!.asnNumber);
    expect(radioFor('BPOM Lot Tracking', 'Pass')).toHaveAttribute('aria-required', 'true');
    expect(radioFor('BPOM Lot Tracking', 'Fail')).toHaveAttribute('aria-required', 'true');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// CP-3 · H2 — THE HALAL GATE READS THE MASTER, AND IT HAS NATURAL REACH.
//
// ⚠️ THIS BLOCK IS INVERTED, NOT REWRITTEN. What stood here said the halal check
// was LIVE BUT UNREACHABLE — zero receivable lines tripped the prose parse, so
// every spec had to CONSTRUCT its subject. That is no longer true and the
// inversion is the batch: `halalOf` reaches all nine receivable lines, five gain
// a question that was never asked, four refuse, and the constructed fixture is
// gone because the real ones now exercise both paths.
//
// The prose predicate is KEPT below as the BEFORE-half of the swap. A retired
// rule has to be restated somewhere to prove it is retired
// (`bpomApplicability.test.ts`'s precedent); deleting the restatement would
// delete the evidence along with the defect.
// ────────────────────────────────────────────────────────────────────────────

/** The predicate `inferHalal` applied, kept as the record. RETIRED at H2. */
const proseParseSays = (d: string) => d.toLowerCase().includes('halal');

/** Every line a goods receipt can be fed today, derived in the wizard's own
 *  terms (ELIGIBLE_STATUSES ∪ RECEIVABLE_ASN_STATUSES, deduped by ASN). */
const receivableLines = () => {
  const eligible = mockShipments.filter(
    (s) => s.status === 'At Dock' || s.status === 'Unloading',
  );
  const seen = new Set(eligible.map((s) => s.asnNumber));
  const asns = [...asnStore.all()].filter(
    (a) => ['Submitted', 'In Transit', 'Delivered'].includes(a.status) && !seen.has(a.asnNumber),
  );
  return [
    ...eligible.flatMap((s) => s.lineItems.map((li) => ({ src: s.asnNumber, li }))),
    ...asns.flatMap((a) => a.lineItems.map((li) => ({ src: a.asnNumber, li }))),
  ];
};

describe('CP-3 · H2 — THE DELTA, LINE BY LINE, over every receivable line', () => {
  it('⚠️ THE MEASUREMENT — 5 gain a question, 4 refuse, and NOTHING loses one', () => {
    // The dispatch's standing requirement, and the pin that would have stopped
    // this batch if the firing set had moved in a direction nobody could explain.
    // Stated PER LINE rather than as counts: a count that comes out right for
    // the wrong reason is exactly what a census matching a shape looks like.
    asnStore.reset();
    const rows = receivableLines();
    expect(rows).toHaveLength(9);

    const gained = rows
      .filter(({ li }) => {
        const o = halalOf(li.materialCode);
        return o.ok && o.required;
      })
      .map(({ li }) => li.materialCode)
      .sort();
    const refused = rows
      .filter(({ li }) => !halalOf(li.materialCode).ok)
      .map(({ li }) => li.materialCode)
      .sort();

    // FIVE LINES GAIN A QUESTION THAT WAS NEVER ASKED. Four are ingredients,
    // one is an emulsifier — and `RM-PSTN-7150` (RBD Palm Stearin) is the row
    // the register kept naming: halal turns on the processing chain, and the
    // prose parse said nothing because the label happens not to carry the word.
    expect(gained).toEqual([
      'FR-ROUD-4470',
      'FR-WARD-4410',
      'RM-COCO-8200',
      'RM-EMUL-9440',
      'RM-PSTN-7150',
    ]);

    // FOUR LINES CHANGE FROM A CONFIDENT `false` TO AN HONEST REFUSAL. All four
    // are PACKAGING — the class BPOM excludes and halal may not (Seat 3,
    // `D-COMP-HALAL-1`). ⚠️ THE OPERATOR'S EXPECTATION WAS THAT `RM-COCO-8200`
    // and `RM-PSTN-7150` would refuse; MEASURED, THEY DO NOT. Both are MG-10,
    // which the halal class rule marks `REQUIRED` — they refuse under BPOM,
    // which is a different regime and a state they were already in. Recorded
    // because a dispatch expectation that is quietly not met is a finding.
    expect(refused).toEqual([
      'PK-ALCP-2450',
      'PK-PETB-8801',
      'PK-PETB-8802',
      'PK-PETB-8804',
    ]);

    // EVERY LINE IS NOW ANSWERED OR REFUSED — no third outcome, nothing silent.
    expect(gained.length + refused.length).toBe(9);

    // ⚠️ AND NOTHING MOVED FROM CHECKED TO UNCHECKED. The prose parse said
    // `false` on ALL NINE, so the delta is one-directional by measurement, not
    // by argument: no line lost a question it used to be asked.
    expect(rows.filter(({ li }) => proseParseSays(li.description))).toEqual([]);
  });

  it('the prose parse is not dead-by-typo — it still fires SOMEWHERE, and on the wrong things', () => {
    // Without this half the assertion above would also pass if the predicate had
    // been broken rather than out of reach. It fires on four MASTER LABELS, and
    // `HALAL-PROSE-READS-AN-ANSWER-01` is what they have in common: every one
    // CLAIMS THE MATERIAL ALREADY IS HALAL.
    const hits = Object.values(MATERIAL_MASTER)
      .filter((e) => proseParseSays(e.label))
      .map((e) => e.materialCode)
      .sort();
    expect(hits).toEqual(['RM-EMUL-9410', 'RM-EMUL-9430', 'RM-LAURIC-7200', 'RM-STEAR-7300']);
  });
});

describe('CP-3 · H2 — the halal gate on a REAL receivable line', () => {
  /**
   * The first eligible dock source whose every line the master marks halal
   * REQUIRED **and** BPOM applicable.
   *
   * ⚠️ BOTH CONDITIONS, DELIBERATELY. A source that is halal-required and
   * BPOM-REFUSING also exists (`RM-COCO-8200`, MG-10) — and on it a disabled
   * Next proves nothing about the halal clause, because the BPOM refusal is
   * already blocking. Isolating the new gate needs a line where the old one is
   * ANSWERABLE.
   */
  const HALAL_REQUIRED = ELIGIBLE.find((s) =>
    s.lineItems.every((li) => {
      const h = halalOf(li.materialCode);
      const b = bpomOf(li.materialCode);
      return h.ok && h.required && b.ok && b.applicable;
    }),
  );
  /** …and one whose every line the master REFUSES to rule on. */
  const HALAL_REFUSED = ELIGIBLE.find((s) =>
    s.lineItems.every((li) => !halalOf(li.materialCode).ok),
  );

  it('THE FIXTURES REACH BOTH STATES — else the specs below are vacuous', () => {
    // `EMPTY-INPUT-REPORTS-CLEAN-01`, and the reason these are DERIVED rather
    // than named: a spec that hardcodes an ASN passes for a while and then
    // silently tests nothing when a fixture moves.
    expect(
      HALAL_REQUIRED,
      'no eligible source is halal-REQUIRED with an ANSWERABLE BPOM check — the two gates cannot be told apart',
    ).toBeDefined();
    expect(HALAL_REFUSED, 'no eligible source REFUSES — the fail-closed path is untested').toBeDefined();
  });

  it('⚠️ NATURAL REACH — a REQUIRED line asks, opens UNANSWERED, and STOPS the wizard', async () => {
    // The inversion, in one spec. Before H2 this could only be demonstrated on a
    // fixture the test wrote itself, because no receivable line tripped the
    // parse. It is now a line a clerk can actually open.
    const next = await openQuality(HALAL_REQUIRED!.asnNumber);
    expect(screen.getByText('Halal Seal Check')).toBeInTheDocument();
    expect(screen.queryByTestId('gr-halal-refusal-0')).not.toBeInTheDocument();
    expect(radioFor('Halal Seal Check', 'Pass')).not.toBeChecked();
    expect(radioFor('Halal Seal Check', 'Fail')).not.toBeChecked();

    // SAME marker, SAME sentence as the BPOM check — one rule, not two.
    const marker = screen.getByTestId('gr-halal-unanswered-0');
    expect(marker).toHaveAttribute('role', 'status');
    expect(marker.textContent).toMatch(/not answered/i);
    expect(next()).toBeDisabled();

    // ⚠️ THE HALAL CLAUSE BLOCKS ON ITS OWN. This line also owes a BPOM answer;
    // answering ONLY that must NOT release the step, or the two gates are really
    // one gate and the second is decoration.
    fireEvent.click(radioFor('BPOM Lot Tracking', 'Pass'));
    expect(next()).toBeDisabled();
    fireEvent.click(radioFor('Halal Seal Check', 'Pass'));
    expect(screen.queryByTestId('gr-halal-unanswered-0')).not.toBeInTheDocument();
    expect(next()).toBeEnabled();
  });

  it('⚠️ FAIL UN-BLOCKS IT TOO — the gate demands an ANSWER, not a PASS', async () => {
    // The same rule the BPOM gate carries: a gate that only clears on `Pass`
    // quietly makes "record what you found" mean "record that it was fine".
    const next = await openQuality(HALAL_REQUIRED!.asnNumber);
    fireEvent.click(radioFor('BPOM Lot Tracking', 'Pass'));
    expect(next()).toBeDisabled();
    fireEvent.click(radioFor('Halal Seal Check', 'Fail'));
    expect(next()).toBeEnabled();
  });

  it('⚠️ THE LOCK — an UNDETERMINED line REFUSES BY NAME and blocks', async () => {
    // THE LOAD-BEARING ASSERTION. Under the prose parse this line rendered
    // NOTHING, owed NOTHING, and posted a receipt asserting no halal check was
    // required — a negative nobody had any basis for, on a PET bottle that
    // `doc-001` links a halal certificate to.
    const next = await openQuality(HALAL_REFUSED!.asnNumber);
    const refusal = screen.getByTestId('gr-halal-refusal-0');
    expect(refusal).toHaveAttribute('role', 'alert');
    // It NAMES the material — a refusal that cannot say what it is about is a
    // hidden skip with better manners.
    expect(refusal.textContent).toContain(HALAL_REFUSED!.lineItems[0].materialCode);
    expect(next()).toBeDisabled();

    // ⚠️ M6's LESSON, APPLIED TO THE NEW GATE: a refused line must offer NO
    // check to record. Inviting an inspector to tick Pass on an applicability
    // the system has just said it cannot determine is a determination with
    // extra steps.
    expect(screen.queryByText('Halal Seal Check')).not.toBeInTheDocument();
  });

  it('⚠️ `H2-NOT-REQUIRED-IS-UNREACHABLE-01` — the positive twin CANNOT be tested, and here is why', () => {
    // FOUND BY A MUTATION PROBE, and reported rather than papered over. Widening
    // the render condition from `halal.ok && halal.required` to `halal.ok` —
    // which would ask an inspector for a seal check on a material the master has
    // ruled NOT_REQUIRED — SURVIVES the whole suite.
    //
    // It survives because the mutation is currently UNREACHABLE, not because the
    // suite is careless: **no row in the master is `'NOT_REQUIRED'`** (H1's
    // 31/0/11 split, and the zero is an assertion — nothing here has a basis for
    // saying a halal determination is unnecessary). The BPOM gate has this twin
    // covered (`POSITIVE TWIN — a determined NOT_APPLICABLE line shows no
    // check`) precisely because packaging gives it one.
    //
    // ⚠️ THIS ASSERTION IS THE FACT THAT MAKES THE GAP TRUE, so it SELF-
    // INVALIDATES: the day `D-COMP-HALAL-1` rules any group `'NOT_REQUIRED'`,
    // this goes red and whoever lands that ruling writes the UI twin that is
    // impossible to write today. It is not a placeholder and it is not skipped —
    // it asserts something real about the master.
    expect(
      Object.values(MATERIAL_MASTER).filter((e) => e.halalApplicable === 'NOT_REQUIRED'),
    ).toEqual([]);
  });

  it('THE TWO REGIMES ARE NAMED SEPARATELY — a refusal says WHICH regulator has not ruled', async () => {
    // These four lines are BPOM-determined and halal-undetermined at once, which
    // is the shape that would be lost by one shared "compliance cannot be
    // determined" banner. The halal refusal renders; the BPOM one does not.
    await openQuality(HALAL_REFUSED!.asnNumber);
    expect(screen.getByTestId('gr-halal-refusal-0').textContent).toMatch(/halal/i);
    expect(screen.queryByTestId('gr-bpom-refusal-0')).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CP-3 · E4 — THE SHIPPED BLOCKS, MIGRATED UNDER THE REGISTRY.
//
// The wizard used to ASSERT that a required-and-unanswered check stops the
// step. It now ASKS the enforcement registry whether it does. That is the whole
// batch, and the standing requirement on it is a number:
//
//   THE DELTA MUST BE ZERO.
//
// Measured here twice over, on the H2 precedent — once at the CLAUSE (the
// consequence the registry returns is the consequence the wizard hard-coded)
// and once PER RECEIVABLE LINE (no line moves, in either direction, under any
// combination of answers, at any instant). A migration that changes behaviour
// is not a migration, and a delta asserted in prose is a promise with no
// verifier.
// ───────────────────────────────────────────────────────────────────────────

/** A named person — the attribution the portal cannot produce today, written by
 *  hand here because a LOOSENING requires one and only a test can supply it. */
const NAMED_IN_A_TEST = {
  kind: 'RESOLVED',
  person: { personId: 'usr-014', displayName: 'Rina Wijaya' },
} as const;

/** A ledger that RELAXES both shipped checks to `OBSERVE`. Constructed as data,
 *  never dispatched and never seeded — its only job is to prove the wizard
 *  genuinely READS the mode. Nothing in the product can produce it today. */
const OBSERVING_LEDGER: readonly EnforcementSetting[] = SEEDED_CHECKS.map((checkId) => ({
  checkId,
  mode: 'OBSERVE' as const,
  reviewBy: '2099-12-31',
  setBy: NAMED_IN_A_TEST,
  setAt: '2026-08-10T00:00:00.000Z',
}));

/** The ledger the product actually ships, built by running the REAL seed through
 *  the REAL verb — not a literal that could drift from it. */
const seededLedger = async (): Promise<readonly EnforcementSetting[]> => {
  enforcementSettingStore.reset();
  await seedEnforcementLedger();
  return [...enforcementSettingStore.all()];
};

/**
 * ⚠️ THE RETIRED FORM, RESTATED — `qualityValid`'s two governed clauses EXACTLY
 * as they read before E4, with the consequence hard-coded. Kept because a rule
 * that has been replaced must be restated somewhere to prove it was replaced
 * (`bpomApplicability.test.ts`'s precedent): delete the before-half and the
 * delta becomes unmeasurable, which is the same as unmeasured.
 */
const preMigration = (code: string, sealAnswered: boolean, lotAnswered: boolean): string => {
  const h = halalOf(code);
  const b = bpomOf(code);
  if (!h.ok) return 'REFUSED_HALAL';
  if (h.required && !sealAnswered) return 'BLOCKED_SEAL';
  if (!b.ok) return 'REFUSED_BPOM';
  if (b.applicable && !lotAnswered) return 'BLOCKED_LOT';
  return 'PASSES';
};

/** The MIGRATED form, with both consequences read off a ledger at an instant. */
const postMigration = (
  ledger: readonly EnforcementSetting[],
  instant: string,
  code: string,
  sealAnswered: boolean,
  lotAnswered: boolean,
): string => {
  const sealBlocks = blocks(effectiveEnforcement(ledger, 'halal.seal', instant).mode);
  const lotBlocks = blocks(effectiveEnforcement(ledger, 'bpom.lot', instant).mode);
  const h = halalOf(code);
  const b = bpomOf(code);
  if (!h.ok) return 'REFUSED_HALAL';
  if (h.required && !sealAnswered && sealBlocks) return 'BLOCKED_SEAL';
  if (!b.ok) return 'REFUSED_BPOM';
  if (b.applicable && !lotAnswered && lotBlocks) return 'BLOCKED_LOT';
  return 'PASSES';
};

/** Every combination of the two answers, including the one the wizard opens in. */
const ANSWER_STATES: ReadonlyArray<readonly [boolean, boolean]> = [
  [false, false],
  [true, false],
  [false, true],
  [true, true],
];

/** Instants spanning far past, today and far future — the ratchet is
 *  clock-derived, so a delta measured at ONE instant is a delta measured once. */
const INSTANTS = [
  '2020-01-01T00:00:00.000Z',
  '2026-08-10T08:00:00.000Z',
  '2099-01-01T00:00:00.000Z',
];

describe('CP-3 · E4 — ⚠️ THE PER-CHECK DELTA, AND IT IS ZERO', () => {
  it('⚠️ THE MEASUREMENT, PER CHECK — the registry returns what the wizard hard-coded', async () => {
    // The clause-level half. Each migrated clause is `old && blocks(mode)`, so
    // the delta is zero exactly when `blocks(mode)` is TRUE for both seeded
    // checks — stated as the per-check table the dispatch asked for rather than
    // as one boolean, because "both are fine" is not a measurement.
    const ledger = await seededLedger();
    const table = SEEDED_CHECKS.map((checkId) => {
      const e = effectiveEnforcement(ledger, checkId, INSTANTS[1]);
      return { checkId, mode: e.mode, source: e.source, blocks: blocks(e.mode) };
    });
    expect(table).toEqual([
      { checkId: 'halal.seal', mode: 'BLOCK', source: 'AS_SET', blocks: true },
      { checkId: 'bpom.lot', mode: 'BLOCK', source: 'AS_SET', blocks: true },
    ]);
  });

  it('⚠️ AND AT EVERY INSTANT — a BLOCK has no review to lapse, so nothing ratchets', async () => {
    // `AS_SET` at ten years past, never `EXPIRY_TIGHTENED`: the ceiling is a
    // fixed point and `reviewBy` is null, so there is no date for the calendar
    // to move this row against. A seed that could ratchet is a delta with a fuse.
    const ledger = await seededLedger();
    for (const instant of INSTANTS) {
      for (const checkId of SEEDED_CHECKS) {
        expect(effectiveEnforcement(ledger, checkId, instant)).toEqual({
          mode: 'BLOCK',
          source: 'AS_SET',
        });
      }
    }
  });

  it('⚠️ THE DELTA, LINE BY LINE, over every receivable line × every answer state', async () => {
    // The corpus half, over the same corpus H2 measured its delta on — ONE
    // definition of "every line a goods receipt can be fed today", shared, so
    // the two measurements cannot disagree about what they measured.
    asnStore.reset();
    const ledger = await seededLedger();
    const rows = receivableLines();
    expect(rows).toHaveLength(9);

    const moved: string[] = [];
    let compared = 0;
    for (const instant of INSTANTS) {
      for (const [seal, lot] of ANSWER_STATES) {
        for (const { li } of rows) {
          compared += 1;
          const before = preMigration(li.materialCode, seal, lot);
          const after = postMigration(ledger, instant, li.materialCode, seal, lot);
          if (before !== after) {
            moved.push(
              `${li.materialCode} @${instant} seal=${seal} lot=${lot}: ${before} → ${after}`,
            );
          }
        }
      }
    }
    // 9 lines × 4 answer states × 3 instants. Asserted so the census cannot pass
    // by measuring nothing (`EMPTY-INPUT-REPORTS-CLEAN-01`).
    expect(compared).toBe(108);
    expect(moved).toEqual([]);
  });

  it('⚠️ AND THE SAME DELTA AGAINST AN EMPTY LEDGER — the un-seeded state is the safe one', () => {
    // The seed can fail to land (the boot dispatch reports rather than throws).
    // This is the proof that a ledger which never got its opening act enforces
    // IDENTICALLY: the mode is the same `BLOCK`, only the SOURCE differs, and a
    // source is provenance rather than consequence.
    asnStore.reset();
    enforcementSettingStore.reset();
    const rows = receivableLines();
    for (const instant of INSTANTS) {
      for (const [seal, lot] of ANSWER_STATES) {
        for (const { li } of rows) {
          expect(postMigration([], instant, li.materialCode, seal, lot)).toBe(
            preMigration(li.materialCode, seal, lot),
          );
        }
      }
    }
    for (const checkId of GOVERNED_CHECK_IDS) {
      expect(effectiveEnforcement([], checkId, INSTANTS[1])).toEqual({
        mode: 'BLOCK',
        source: 'NO_SETTING_RECORDED',
      });
    }
  });

  it('⚠️ THE READ IS LOAD-BEARING — an OBSERVE ledger MOVES both clauses', () => {
    // Without this, `&& sealBlocks` could be `&& true` and every assertion above
    // would still pass. A zero delta is only evidence of a FAITHFUL migration if
    // a non-zero one is reachable; otherwise it is evidence of a no-op.
    //
    // ⚠️ This ledger is constructed in a test and is UNREACHABLE in the product:
    // relaxing to OBSERVE is a LOOSENING, which requires a NAMED actor, and
    // nothing in this system can name a human (`ENF-NO-PERSON-IN-IDENTITY-01`).
    expect(
      SEEDED_CHECKS.map((checkId) =>
        blocks(effectiveEnforcement(OBSERVING_LEDGER, checkId, INSTANTS[1]).mode),
      ),
    ).toEqual([false, false]);

    asnStore.reset();
    const rows = receivableLines();
    const differences = rows
      .map(({ li }) => ({
        code: li.materialCode,
        before: preMigration(li.materialCode, false, false),
        after: postMigration(OBSERVING_LEDGER, INSTANTS[1], li.materialCode, false, false),
      }))
      .filter((r) => r.before !== r.after);
    // FIVE lines stop blocking on the seal question under OBSERVE — the same
    // five H2 measured as GAINING one. The gate would still ASK; it would stop
    // stopping, which is exactly what OBSERVE means and exactly what nothing in
    // this build has been relaxed to.
    expect(differences.map((d) => d.code).sort()).toEqual([
      'FR-ROUD-4470',
      'FR-WARD-4410',
      'RM-COCO-8200',
      'RM-EMUL-9440',
      'RM-PSTN-7150',
    ]);
  });

  it('⚠️ THE REFUSALS ARE OUTSIDE THE MODE — asserted over the wizard own source', () => {
    // ENFORCEMENT MODE RELAXES THE CONSEQUENCE OF AN ANSWER; NOTHING MAY RELAX
    // THE ABSENCE OF A QUESTION. The two refusal branches must carry no mode
    // term, and a prose promise would not survive the next edit.
    const wizard = (
      import.meta.glob('/src/components/v2-features/GRInspectionWizard.tsx', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>
    )['/src/components/v2-features/GRInspectionWizard.tsx'];
    const code = wizard
      .split(/\r?\n/)
      .filter((l) => {
        const t = l.trimStart();
        return !t.startsWith('//') && !t.startsWith('*');
      })
      .join('\n');
    // The refusals, unchanged and mode-free.
    expect(code).toContain('if (!l.halal.ok) return false;');
    expect(code).toContain('if (!l.bpom.ok) return false;');
    // The two governed clauses, and they are the ONLY two that read a mode.
    expect(code).toContain('if (l.halal.required && !l.halalSealCheck && sealBlocks) return false;');
    expect(code).toContain('if (l.bpom.applicable && !l.bpomLotCheck && lotBlocks) return false;');
    // Six mentions and no more: the destructure (2), the derivation (2), the two
    // clauses (2). A seventh means a third site started reading a mode.
    expect(code.match(/sealBlocks|lotBlocks/g) ?? []).toHaveLength(6);
  });

  it('⚠️ `halal.certificate` IS NOT SEEDED — a row nobody took is not written', async () => {
    // The dispatch said three settings; the tree says TWO checks block today.
    // `halal.certificate` is authored at H3 and wired nowhere, so it has no
    // shipped behaviour to open at, and a `BLOCK` row for it would put a
    // decision on the record that nobody took — which is exactly why E2 refused
    // to seed at all. Corrected against the ruling by the operator at E4.
    const ledger = await seededLedger();
    expect(ledger.map((s) => s.checkId)).toEqual(['halal.seal', 'bpom.lot']);
    expect(GOVERNED_CHECK_IDS).toContain('halal.certificate');
    expect(effectiveEnforcement(ledger, 'halal.certificate', INSTANTS[1])).toEqual({
      mode: 'BLOCK',
      source: 'NO_SETTING_RECORDED',
    });
  });
});

describe('CP-3 · E4 — the migration at the SURFACE, under the shipped ledger', () => {
  /** The first eligible dock source whose every line is halal-REQUIRED and whose
   *  BPOM question is ANSWERABLE — so a disabled Next isolates the seal clause. */
  const SEAL_ONLY = ELIGIBLE.find((s) =>
    s.lineItems.every((li) => {
      const h = halalOf(li.materialCode);
      const b = bpomOf(li.materialCode);
      return h.ok && h.required && b.ok && b.applicable;
    }),
  );

  const openQualityWith = async (
    asnNumber: string,
    enforcementSettings: readonly EnforcementSetting[],
  ) => {
    cleanup();
    asnStore.reset();
    renderWithProviders(
      <GRInspectionWizard
        onClose={() => {}}
        onComplete={() => {}}
        shipments={mockShipments}
        asns={[...asnStore.all()]}
        enforcementSettings={enforcementSettings}
      />,
    );
    fireEvent.click(await screen.findByText(asnNumber));
    const next = () => screen.getAllByRole('button', { name: /Next/i })[0];
    fireEvent.click(next());
    fireEvent.click(next());
    return next;
  };

  it('the fixture reaches the state — else both specs below are vacuous', () => {
    expect(SEAL_ONLY, 'no eligible source isolates the halal seal clause').toBeDefined();
  });

  it('⚠️ THE SHIPPED LEDGER STILL STOPS THE WIZARD — same surface, read consequence', async () => {
    // The pre-E4 spec asserted this with the consequence HARD-CODED. This
    // asserts the same thing with the consequence READ, against the ledger the
    // product actually boots with. An identical outcome is the whole point.
    const ledger = await seededLedger();
    const next = await openQualityWith(SEAL_ONLY!.asnNumber, ledger);
    expect(screen.getAllByText('Halal Seal Check').length).toBeGreaterThan(0);
    expect(next()).toBeDisabled();
  });

  it('⚠️ AND UNDER `OBSERVE` IT ASKS AND DOES NOT STOP — the question survives the relaxation', async () => {
    // The proof that relaxing ENFORCEMENT is not relaxing HONESTY: the seal row
    // still renders, still opens unanswered, and the step no longer blocks on
    // it. If the row DISAPPEARED, `OBSERVE` would be the fourth mode this
    // vocabulary refuses to have.
    const next = await openQualityWith(SEAL_ONLY!.asnNumber, OBSERVING_LEDGER);
    expect(screen.getAllByText('Halal Seal Check').length).toBeGreaterThan(0);
    expect(next()).not.toBeDisabled();
  });
});
