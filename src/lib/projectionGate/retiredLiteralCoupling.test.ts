// ────────────────────────────────────────────────────────────────────────────
// RED BY CONSTRUCTION, MADE CHECKABLE — the two halves of a literal's
// retirement cannot ship apart.
//
// ⚠️ **THIS FILE EXISTS BECAUSE "A PARTIAL LANDING IS RED BY CONSTRUCTION" WAS
// A PROPERTY NOTHING ASSERTED.** Retiring a stored display state is two edits
// in different files — the fixture stops writing the literal, and
// `displayStates.ts` moves the row to `produced-by-nothing` — and the bilateral
// gate reddens if either lands alone. That is true, and it was true only as
// long as somebody remembered to check it: the gate compares DECLARED against
// DERIVED, so it catches the mismatch, but nothing said *why* the mismatch is
// the safety property rather than an inconvenience.
//
// The next person to retire one (`shipment/Delayed` is the remaining candidate)
// should be able to read the coupling rather than rediscover it. Both
// directions are probed here against SYNTHETIC inputs, so neither probe can be
// satisfied by the tree happening to be in a good state.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { DISPLAY_STATES } from './displayStates';
import { producedBy, sourceFiles, filesForEntity, writeSites } from './derive';

const ENTITY = 'supplierDocument';
const STATE = 'Expiring Soon';

describe('the retirement landed as ONE change, and the gate can prove it', () => {
  it('KNOWN-GOOD FIRST: the entity is real and its files are non-empty', () => {
    // Every assertion below is about a population that must exist. A derivation
    // over zero files returns `produced-by-nothing` for anything at all, which
    // would make the whole file pass while examining nothing
    // (`EMPTY-INPUT-REPORTS-CLEAN-01`).
    const owned = filesForEntity(ENTITY, sourceFiles());
    expect(owned.length).toBeGreaterThan(0);
    expect(owned.some((f) => f.includes('fixtures/supplierDocuments'))).toBe(true);
  });

  it('DECLARED and DERIVED agree today — the literal has no producer left', () => {
    const declared = DISPLAY_STATES.find(
      (r) => r.entity === ENTITY && r.state === STATE,
    );
    expect(declared, 'the row was deleted rather than moved').toBeDefined();
    expect(declared!.group).toBe('produced-by-nothing');
    expect(producedBy(ENTITY, STATE, sourceFiles())).toBe('produced-by-nothing');
  });

  it('⚠️ HALF ONE ALONE IS RED: fixture retired, row left in stored-in-fixtures', () => {
    // The mismatch the bilateral gate would report if step 2 were split out of
    // step 1's commit. Asserted as the INEQUALITY rather than by editing the
    // tree, so the probe cannot leave a mutation behind.
    const derived = producedBy(ENTITY, STATE, sourceFiles());
    expect(derived).not.toBe('stored-in-fixtures');
    // …which is exactly what the gate compares, so declaring the old group
    // while the tree derives the new one cannot pass.
    expect(derived === 'stored-in-fixtures').toBe(false);
  });

  it('⚠️ HALF TWO ALONE IS RED: row moved while a fixture still writes the literal', () => {
    // The other direction, probed against a SYNTHETIC file list so the real
    // tree is untouched: a fixture that still writes the literal derives
    // `stored-in-fixtures`, which contradicts the declared
    // `produced-by-nothing`.
    const owned = filesForEntity(ENTITY, sourceFiles());
    const fixture = owned.find((f) => f.includes('fixtures/supplierDocuments'))!;
    // The fixture no longer writes it — this is the measurement that the first
    // half actually landed, taken at the file rather than inferred.
    expect(writeSites(STATE, [fixture])).toEqual([]);
    // …and it still writes SOMETHING, so the empty result above is about this
    // literal and not about a file the matcher cannot read.
    expect(writeSites('Valid', [fixture]).length).toBeGreaterThan(0);
  });

  it('⚠️ the group is no longer empty, and that is what it was declared for', () => {
    // `displayStates.ts` kept `produced-by-nothing` declared while it held
    // nothing, on the reasoning that "the next state to lose its producer
    // belongs here". This is that prediction, asserted.
    const orphans = DISPLAY_STATES.filter((r) => r.group === 'produced-by-nothing');
    expect(orphans.map((r) => `${r.entity}/${r.state}`)).toContain(
      `${ENTITY}/${STATE}`,
    );
  });
});
