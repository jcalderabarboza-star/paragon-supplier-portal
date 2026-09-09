// ─────────────────────────────────────────────────────────────────────────────
// THE DIVERGENCE, ASSERTED AT THE SURFACE A PERSON ACTUALLY LOOKS AT.
//
// `dayProjection.test.ts` proves the FIXTURE contradicts its own stored status.
// This proves the WIDGET no longer repeats it — a different claim, and the one
// that matters to a supplier, because the projection could be perfectly correct
// while the widget kept reading `status`. That was the shipped state.
//
// ⚠️ **THE DIVERGENCE THIS FILE WAS WRITTEN AGAINST IS CLOSED**, and the specs
// are rewritten rather than re-pinned. `FIXTURE-PRESENT-01` (d) anchored
// `supplierDocument` on its own coherent window, so every stored status is TRUE
// at the declared present: doc-001 stores 'Expiring Soon' and IS expiring;
// doc-005 and doc-008 store 'Valid' and ARE current.
//
// ⚠️ **AND THAT COSTS THIS FILE ITS DISCRIMINATING POWER, WHICH IS STATED RATHER
// THAN QUIETLY ACCEPTED.** The old specs could tell "reads the projection" from
// "reads `status`" only BECAUSE the two disagreed. They now agree on every row,
// so no rendered assertion can separate them any more — a test that passes
// either way is not evidence. The claim is therefore held STRUCTURALLY below:
// the widget's source must not read `doc.status` at all. That is weaker than a
// behavioural probe and is labelled as such; it is what remains provable once
// the data stops contradicting itself.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { screen, within, fireEvent } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../../test/test-utils';
import SupplierCertsExpiringWidget from './SupplierCertsExpiringWidget';
import { DOCUMENTS } from '../../services/data/mock/fixtures/supplierDocuments';
import { readFileSync } from 'node:fs';
import { documentExpiry } from '../../services/data/dayProjection';
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

  it('doc-001 is listed, labelled from the PROJECTION, which now agrees with the fixture', async () => {
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
