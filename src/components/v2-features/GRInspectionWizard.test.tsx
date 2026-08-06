import { describe, it, expect } from 'vitest';
import { screen, fireEvent, cleanup } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import { mockShipments } from '../../data/mockShipments';
import { asnStore } from '../../services/data/mock/stores/asnStore';
import { bpomOf } from '../../services/sdc/bpom';
import GRInspectionWizard from './GRInspectionWizard';

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

  it('POSITIVE TWIN — a determined NOT_APPLICABLE line shows no check and no refusal', async () => {
    // Packaging genuinely needs no lot check. The absence of a BPOM row here is
    // a DETERMINATION, and it must look nothing like the refusal below — if the
    // gate blocked everything, the negative specs would pass on their own.
    const next = await openQuality(NOT_REQUIRED!.asnNumber);
    expect(screen.queryByTestId('gr-bpom-refusal-0')).not.toBeInTheDocument();
    expect(screen.queryByText('BPOM Lot Tracking')).not.toBeInTheDocument();
    expect(next()).toBeEnabled();
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
    expect(next()).toBeDisabled();
    fireEvent.click(radioFor('BPOM Lot Tracking', 'Fail'));
    expect(next()).toBeEnabled();
  });

  it('THE THREE STATES ARE TOLD APART BY SHAPE — not by a fourth token', async () => {
    // NOT REQUIRED: no row, no marker, nothing owed. Distinguishable from
    // REQUIRED-AND-UNANSWERED by the ABSENCE of the control, which is why no
    // 'Pending' / 'N/A' token was invented for the middle state — a third radio
    // option would have made the two look alike again.
    const notRequired = await openQuality(NOT_REQUIRED!.asnNumber);
    expect(screen.queryByText('BPOM Lot Tracking')).not.toBeInTheDocument();
    expect(screen.queryByTestId('gr-bpom-unanswered-0')).not.toBeInTheDocument();
    expect(notRequired()).toBeEnabled();
    cleanup();

    // REQUIRED AND UNANSWERED: the control, nothing selected, a marker, blocked.
    const required = await openQuality(REQUIRES!.asnNumber);
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
// THE HALAL HALF — identical defect, identical fix, and NO NATURAL REACH.
//
// `halalSealCheck` carried the same fabricated seed (`inferHalal(...) ? 'Pass'
// : undefined`). Fixing one and not the other would have left a receiving form
// where one regulatory check demands an answer and its neighbour supplies one.
//
// ⚠️ IT BLOCKS ZERO LINES TODAY, AND THAT IS MEASURED BELOW RATHER THAN
// ASSUMED. `inferHalal` reads `description` prose, and every fixture line whose
// prose trips it sits on a shipment in a NON-receivable status. So these specs
// must CONSTRUCT their subject — and the construction is honest, because
// `INFERHALAL-READS-PROSE-01`'s arc will give the mechanism reach, at which
// point the seed would have started answering real questions.
// ────────────────────────────────────────────────────────────────────────────

const inferHalal = (d: string) => d.toLowerCase().includes('halal');

describe('GRInspectionWizard — the halal check carries the identical rule', () => {
  it('⚠️ THE REACH, MEASURED — the halal check is LIVE but unreachable from a receivable line', () => {
    // A pin that explains its own green-to-red. It is NOT asserting the halal
    // check is dead: the second half proves the mechanism fires on real fixture
    // prose. It asserts that no RECEIVABLE line reaches it today.
    //
    // WHEN THIS GOES RED, nothing is broken — a fixture line has become
    // receivable with 'halal' in its description, the halal gate has just
    // acquired live reach for the first time, and it needs the operator smoke
    // the BPOM gate got. Update the count and record that the reach changed.
    const eligible = mockShipments.filter(
      (s) => s.status === 'At Dock' || s.status === 'Unloading',
    );
    const seen = new Set(eligible.map((s) => s.asnNumber));
    const receivableAsns = [...asnStore.all()].filter(
      (a) =>
        ['Submitted', 'In Transit', 'Delivered'].includes(a.status) &&
        !seen.has(a.asnNumber),
    );
    const receivableHits =
      eligible.flatMap((s) => s.lineItems).filter((li) => inferHalal(li.description)).length +
      receivableAsns.flatMap((a) => a.lineItems).filter((li) => inferHalal(li.description)).length;
    expect(receivableHits, 'the halal gate has acquired reach — smoke it').toBe(0);

    // ...and the mechanism is not dead, it is merely out of reach. Without this
    // half, the assertion above would also pass if `inferHalal` were broken.
    const anyHits = mockShipments
      .flatMap((s) => s.lineItems)
      .filter((li) => inferHalal(li.description)).length;
    expect(anyHits, 'inferHalal matches nothing at all — the pin is vacuous').toBeGreaterThan(0);
  });

  it('⚠️ CONSTRUCTED — a halal-required line opens unanswered and BLOCKS, exactly like BPOM', async () => {
    // The material is chosen so BPOM is determined NOT_APPLICABLE: the halal
    // check is then the ONLY thing outstanding, and a disabled Next can mean
    // nothing else.
    const CODE = 'PK-ALCP-2450';
    const b = bpomOf(CODE);
    expect(b.ok && !b.applicable, `${CODE} must be BPOM-determined not-applicable`).toBe(true);

    asnStore.reset();
    asnStore.add({
      ...[...asnStore.all()][0],
      asnNumber: 'ASN-HALAL-ONLY',
      status: 'Submitted',
      lineItems: [
        {
          materialCode: CODE,
          description: 'Aluminium Closure 24/410 — Halal certified line',
          orderedQty: 10,
          shippedQty: 10,
          lotNumber: 'LOT-H',
        },
      ],
    });

    renderWithProviders(
      <GRInspectionWizard
        onClose={() => {}}
        onComplete={() => {}}
        shipments={[]}
        asns={[...asnStore.all()]}
      />,
    );
    fireEvent.click(await screen.findByText('ASN-HALAL-ONLY'));
    const next = () => screen.getByRole('button', { name: /Next/i });
    fireEvent.click(next());
    fireEvent.click(next());

    // Asked, unanswered, blocked — and no BPOM control in sight, so the block is
    // unambiguously the halal one.
    expect(screen.getByText('Halal Seal Check')).toBeInTheDocument();
    expect(screen.queryByText('BPOM Lot Tracking')).not.toBeInTheDocument();
    expect(radioFor('Halal Seal Check', 'Pass')).not.toBeChecked();
    expect(next()).toBeDisabled();

    // SAME marker, SAME sentence as the BPOM check — one rule, not two.
    const marker = screen.getByTestId('gr-halal-unanswered-0');
    expect(marker).toHaveAttribute('role', 'status');
    expect(marker.textContent).toMatch(/not answered/i);

    fireEvent.click(radioFor('Halal Seal Check', 'Pass'));
    expect(screen.queryByTestId('gr-halal-unanswered-0')).not.toBeInTheDocument();
    expect(next()).toBeEnabled();
  });
});
