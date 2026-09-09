// ─────────────────────────────────────────────────────────────────────────────
// THE DIVERGENCE, ASSERTED AT THE SURFACE A PERSON ACTUALLY LOOKS AT.
//
// `dayProjection.test.ts` proves the FIXTURE contradicts its own stored status.
// This proves the WIDGET no longer repeats it — a different claim, and the one
// that matters to a supplier, because the projection could be perfectly correct
// while the widget kept reading `status`. That was the shipped state.
//
// ── ⚠️ THE BEHAVIOURAL PROBE IS BACK, AND WHY IT LEFT IS THE FINDING ─────────
//
//   THE HEADER THAT STOOD HERE IS QUOTED RATHER THAN DELETED, because the
//   record of a probe weakened on a premise — and of that premise later being
//   falsified with nothing going red — is worth more than the paragraph it
//   replaces:
//
//     "⚠️ THE DIVERGENCE THIS FILE WAS WRITTEN AGAINST IS CLOSED, and the
//      specs are rewritten rather than re-pinned. FIXTURE-PRESENT-01 (d)
//      anchored `supplierDocument` on its own coherent window, so every stored
//      status is TRUE at the declared present: doc-001 stores 'Expiring Soon'
//      and IS expiring; doc-005 and doc-008 store 'Valid' and ARE current.
//
//      ⚠️ AND THAT COSTS THIS FILE ITS DISCRIMINATING POWER, WHICH IS STATED
//      RATHER THAN QUIETLY ACCEPTED. The old specs could tell "reads the
//      projection" from "reads `status`" only BECAUSE the two disagreed. They
//      now agree on every row, so no rendered assertion can separate them any
//      more — a test that passes either way is not evidence. The claim is
//      therefore held STRUCTURALLY below: the widget's source must not read
//      `doc.status` at all. That is weaker than a behavioural probe and is
//      labelled as such; it is what remains provable once the data stops
//      contradicting itself."
//
//   ⚠️ **EVERY SENTENCE OF THAT WAS TRUE WHEN WRITTEN AND THE LOAD-BEARING ONE
//   IS NOW FALSE.** `doc-001` stores `'Valid'` — #325 retired `'Expiring Soon'`
//   from `SupplierDocumentStatus` entirely — while the projection still calls
//   it `expiring`. **The two disagree again, so the rendered assertion the old
//   header ruled impossible is possible, and it is restored below.**
//
//   ⚠️ **NOTHING WENT RED WHEN THAT HAPPENED, AND THAT IS THE FIFTH SILENCING
//   MODE** (`DATA-POPULATION-INSTRUMENT-SURVIVES-ITS-CORPUS-01`, `CLAUDE.md`).
//   The population control below checks that doc-001, doc-005 and doc-008 still
//   EXIST. Replacement keeps ids and changes VALUES, so an id-only control is
//   exactly the control a replacement walks through. This file was last touched
//   at #324; #325 changed the row underneath it; the suite stayed green and the
//   header stayed wrong.
//
//   THE DISCRIMINATION IS DERIVED, NOT ASSUMED — measured at `DECLARED_PRESENT`
//   (2026-08-31) over all 12 sup-007 rows before this was written:
//
//     doc-001  stored=Valid          display=expiring   <<< THE ONLY DISAGREEMENT
//     doc-002/003/004/005/007/008/009  stored=Valid     display=valid
//     doc-006  Awaiting Upload · doc-010/011 Under Review · doc-012 Rejected
//                                    (lifecycle passthrough, no clock content)
//     rows whose STORED status is 'Expiring Soon': 0
//
//   So the widget's entire rendered list is `doc-001`, and it is there ONLY
//   because the projection put it there. **A status-reading widget would render
//   its EMPTY state.** That is the strongest form this probe can take: the
//   whole list, not a label on one row, turns on which source is read.
//
//   ⚠️ **AND IT IS WRITTEN TO SURVIVE THE CLOCK.** The widget reads
//   `new Date()`, not the declared present, so a probe pinned to `expiring`
//   would decay the day doc-001's expiry passes. The widget lists `expired` AND
//   `expiring` (`rows = [...expired, ...expiring]`), and BOTH are projection-only
//   outcomes for a row stored `'Valid'` — so the rendered half asserts
//   PRESENCE, which no passage of time can falsify. The clock-sensitive half is
//   asserted against `DECLARED_PRESENT` instead, where it is stable.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { screen, within, fireEvent } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../../test/test-utils';
import SupplierCertsExpiringWidget from './SupplierCertsExpiringWidget';
import { DOCUMENTS } from '../../services/data/mock/fixtures/supplierDocuments';
import { readFileSync } from 'node:fs';
import { documentExpiry } from '../../services/data/dayProjection';
import { documentDisplayState } from '../../services/data/documentDisplayState';
import { DECLARED_PRESENT } from '../../services/data/fixturePresent';

const HALAL = 'Halal Certificate — MUI No. 01011234561020';

/** Open the widget's expanded region — where the document rows render. */
const openWidget = async (): Promise<void> => {
  fireEvent.click(await screen.findByLabelText(/expand/i));
};

describe('SupplierCertsExpiringWidget — the clock is the source, not `status`', () => {
  it('the fixture still holds the subjects of this test', () => {
    // Population control: if these rows are renamed or dropped, this file must
    // fail LOUDLY as a stale test rather than quietly as a passing one.
    const mine = DOCUMENTS.filter((d) => d.supplierId === 'sup-007');
    expect(mine.some((d) => d.id === 'doc-001')).toBe(true);
    expect(mine.some((d) => d.id === 'doc-005')).toBe(true);
    expect(mine.some((d) => d.id === 'doc-008')).toBe(true);
  });

  it('doc-001 is listed, labelled from the PROJECTION — which DISAGREES with the fixture again', async () => {
    // ⚠️ THE TITLE USED TO READ "which now agrees with the fixture" and was
    // true until #325. Corrected at the site rather than left as a second
    // stale claim beside the one this batch repairs.
    renderWithProviders(<SupplierCertsExpiringWidget />, { identity: SUPPLIER });
    const title = await screen.findByText('Certificates — expiring');
    await openWidget();
    const row = (await screen.findByText(HALAL)).closest('tr');
    expect(row, 'the halal certificate must be listed').not.toBeNull();
    expect(within(row!).queryByText('Expired')).toBeNull();
    expect(title).toBeInTheDocument();
  });

  it('⚠️ STRUCTURAL, AND WEAKER THAN A BEHAVIOURAL PROBE: the widget never reads `doc.status`', () => {
    // With the fixture coherent, no rendered assertion can distinguish the
    // projection from the stored literal. This one can, and it is why the
    // regression the widget once shipped cannot come back silently.
    const src = readFileSync(
      'src/pages-v2/widgets/SupplierCertsExpiringWidget.tsx',
      'utf8',
    );
    // ⚠️ COMMENTS ARE STRIPPED PROPERLY, NOT BY LINE PREFIX. The first version
    // of this filter dropped lines starting `//`, `*` or `/*` and therefore
    // MISSED A JSX COMMENT (`{/* … never `doc.status` … */}`) — which made the
    // gate accuse the widget of exactly the thing the comment says it does not
    // do. A widened matcher creates false accusations as readily as a narrow
    // one creates blind spots, so both directions are controlled below.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/[^\n]*/g, ' ');
    expect(code).not.toMatch(/\b(d|doc)\.status\b/);
    // CONTROL, the other direction: the stripper must not have eaten the file.
    expect(code).toContain('SupplierCertsExpiringWidget');
    // CONTROL: the projection IS what it reads, so the assertion above is not
    // passing because the file is empty or the matcher is broken.
    //
    // ⚠️ THE NAME MOVED FROM `documentExpiry` TO `documentDisplayState`, AND
    // THAT IS A STRENGTHENING RATHER THAN A RENAME. `documentExpiry` answers
    // a pure CLOCK question and is blind to the lifecycle half — it would
    // call a `Rejected` certificate `expiring` if its date were near. The
    // shared classifier is what the documents page and the dashboard also
    // read, so this control now asserts the widget is on the SAME source as
    // the other two rather than merely on A projection.
    expect(code).toContain('documentDisplayState');
  });

  it('the two CURRENT documents are correctly absent — they are not expiring any more', async () => {
    // They were listed only because the widget's clock had run past the fixture's
    // present. Anchored, they are what their stored status always said: current.
    renderWithProviders(<SupplierCertsExpiringWidget />, { identity: SUPPLIER });
    await openWidget();
    expect(
      screen.queryByText('ISO 9001:2015 Quality Management Certificate'),
    ).toBeNull();
    expect(
      screen.queryByText('Framework Supply Agreement — Paragon Corp 2025–2027'),
    ).toBeNull();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // ⚠️ THE BEHAVIOURAL PROBE — RESTORED. It separates "reads the projection"
  //    from "reads `status`", which the structural test above can only infer.
  // ───────────────────────────────────────────────────────────────────────────

  it('⚠️ THE DISAGREEMENT IS REAL AND IT IS EXACTLY ONE ROW — derived, not assumed', () => {
    // The VALUE pin this file was missing. An id-only control survives a corpus
    // replacement by construction; this one does not, because it names the
    // stored value AND the computed one on a row identified by name.
    const now = DECLARED_PRESENT + 'T00:00:00.000Z';
    const doc = DOCUMENTS.find((d) => d.id === 'doc-001');
    expect(doc, 'doc-001 is gone — this probe is vacuous').toBeDefined();
    expect(doc!.status).toBe('Valid');
    expect(documentDisplayState(doc!, now)).toBe('expiring');

    // …and it is the ONLY row that disagrees, so the probe below cannot be
    // satisfied by some other document wandering into the list.
    const disagreeing = DOCUMENTS.filter((d) => d.supplierId === 'sup-007')
      .filter((d) => documentDisplayState(d, now) !== String(d.status).toLowerCase().replace(/ /g, '-'))
      .map((d) => d.id);
    expect(disagreeing).toEqual(['doc-001']);

    // CONTROL, the other direction: the population is real and the comparison
    // is not trivially true — most rows AGREE, which is what makes the one
    // disagreement informative.
    const mine = DOCUMENTS.filter((d) => d.supplierId === 'sup-007');
    expect(mine.length).toBeGreaterThan(10);
    expect(mine.filter((d) => !disagreeing.includes(d.id)).length).toBeGreaterThan(8);
  });

  it('⚠️ NO ROW STORES AN EXPIRING STATUS — so a status-reading widget lists NOTHING', () => {
    // The counterfactual, asserted rather than reasoned about. This is what
    // makes the rendered assertion below evidence about the SOURCE rather than
    // evidence that a row happens to be listed.
    const mine = DOCUMENTS.filter((d) => d.supplierId === 'sup-007');
    expect(mine.map((d) => String(d.status))).not.toContain('Expiring Soon');
    expect(mine.filter((d) => String(d.status) === 'Expiring Soon')).toEqual([]);
  });

  it('⚠️ AND THE WIDGET LISTS THE HALAL CERT ANYWAY — the projection is the source', async () => {
    // THE PROBE THE OLD HEADER RULED IMPOSSIBLE. `doc-001` is stored `'Valid'`
    // and nothing for this seat is stored as expiring, so a widget reading
    // `status` would render its EMPTY state. It renders a row instead.
    //
    // CLOCK-ROBUST BY CONSTRUCTION: the widget reads `new Date()` and lists
    // `expired` AND `expiring`. Both are projection-only outcomes for a row
    // stored `'Valid'`, so this asserts PRESENCE and cannot decay when
    // doc-001's expiry passes. The state-specific claim is pinned at
    // `DECLARED_PRESENT` above, where it is stable.
    renderWithProviders(<SupplierCertsExpiringWidget />, { identity: SUPPLIER });
    await openWidget();
    const row = (await screen.findByText(HALAL)).closest('tr');
    expect(row, 'the halal certificate must be listed — stored `Valid`, projected expiring').not.toBeNull();
    // The empty state is NOT rendered — the negative half of the same claim.
    expect(screen.queryByText('No certificates expiring')).toBeNull();
  });

  it('⚠️ NOTHING is expired at the declared present — and the zero is a measurement', () => {
    // The widget's `critical` severity is driven by an EXPIRED count. There is no
    // expired certificate for this seat any more, so the reader is not warned
    // about a dead certificate that is not dead — the anchor, seen from the
    // surface.
    const mine = DOCUMENTS.filter((d) => d.supplierId === 'sup-007' && d.expiryDate);
    const expired = mine.filter(
      (d) => documentExpiry(d, DECLARED_PRESENT + 'T00:00:00.000Z') === 'expired',
    );
    expect(expired).toEqual([]);
    // CONTROL: the population is non-empty, so the zero is a measurement.
    expect(mine.length).toBeGreaterThan(2);
  });
});
