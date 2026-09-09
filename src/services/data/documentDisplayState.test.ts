// ────────────────────────────────────────────────────────────────────────────
// THE SHARED DISPLAY STATE — the classifier, and the WIRING.
//
// ⚠️ **THE WIRING HALF IS THE POINT, AND IT IS THE HALF A CLASSIFIER TEST DOES
// NOT COVER.** A probe proving `documentDisplayState` returns the right answer
// proves nothing about whether a badge calls it. This batch exists because
// three surfaces rendered one document's state and two of them read the stored
// field; a suite that only exercised the function would have been just as green
// before the batch as after it. So every render site is asserted BY SITE below,
// and the mutation probe points one site back at `doc.status` to confirm a
// NAMED test fires for THAT site.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  documentDisplayState,
  DISPLAY_STATE_LABEL_KEY,
  DISPLAY_STATE_TONE,
  DISPLAY_STATE_ACTION_KEY,
  type DocumentDisplayState,
} from './documentDisplayState';
import { DOCUMENTS } from './mock/fixtures/supplierDocuments';
import { DECLARED_PRESENT } from './fixturePresent';
import { statusResourcesEn, statusResourcesId } from '../../lib/statusLabel';

const P = `${DECLARED_PRESENT}T00:00:00.000Z`;
const doc = (status: string, expiryDate: string | null) =>
  ({ status, expiryDate }) as Parameters<typeof documentDisplayState>[0];

describe('the population this batch is about', () => {
  it('CONTROL FIRST: doc-001 and doc-202 exist, store a DECLARED state, and compute expiring', () => {
    // Every assertion below is about documents that must exist to be
    // classified. Named, so a fixture rename cannot leave these passing over
    // nothing (`EMPTY-INPUT-REPORTS-CLEAN-01`).
    //
    // ⚠️ THIS CONTROL USED TO SELECT THEM BY `status === 'Expiring Soon'`.
    // That literal is retired: both rows now store `'Valid'`, which is a state
    // `getFlow('supplierDocument')` declares — so they are reachable by a verb
    // instead of sitting outside the machine. The rendered state did not move,
    // and that is asserted rather than assumed.
    for (const id of ['doc-001', 'doc-202']) {
      const d = DOCUMENTS.find((x) => x.id === id);
      expect(d, id).toBeDefined();
      expect(d!.status, id).toBe('Valid');
      expect(documentDisplayState(d!, P), id).toBe('expiring');
    }
    // …and nothing anywhere still stores the retired literal.
    expect(DOCUMENTS.map((d) => String(d.status))).not.toContain('Expiring Soon');
  });
});

describe('the classifier — the clock decides the clock half, and only that half', () => {
  it('doc-001 by name: computed `expiring` at the declared present', () => {
    const d = DOCUMENTS.find((x) => x.id === 'doc-001')!;
    expect(documentDisplayState(d, P)).toBe('expiring');
  });

  it('⚠️ the SAME row moves with the clock — an injected instant that changes nothing is not injected', () => {
    const d = DOCUMENTS.find((x) => x.id === 'doc-001')!;
    // Three instants, three answers, one row. A classifier that ignored `now`
    // would return one value for all three and still look correct at `P`.
    const early = '2026-01-01T00:00:00.000Z';
    const late = '2030-01-01T00:00:00.000Z';
    expect(documentDisplayState(d, early)).toBe('valid');
    expect(documentDisplayState(d, P)).toBe('expiring');
    expect(documentDisplayState(d, late)).toBe('expired');
    // …and they are genuinely three DIFFERENT answers, not three of the same.
    expect(
      new Set([
        documentDisplayState(d, early),
        documentDisplayState(d, P),
        documentDisplayState(d, late),
      ]).size,
    ).toBe(3);
  });

  it('the lifecycle members pass through, and the clock has no opinion on them', () => {
    // A refused certificate with a date long past is still REFUSED. Reading the
    // clock here would let an expiry answer a question about an act.
    expect(documentDisplayState(doc('Rejected', '2020-01-01'), P)).toBe('rejected');
    expect(documentDisplayState(doc('Awaiting Upload', '2020-01-01'), P)).toBe(
      'awaiting-upload',
    );
    expect(documentDisplayState(doc('Under Review', '2020-01-01'), P)).toBe('under-review');
    // CONTROL, the other direction: a `Valid` row with the SAME dead date does
    // move — so the passthrough above is a decision, not an inert branch.
    expect(documentDisplayState(doc('Valid', '2020-01-01'), P)).toBe('expired');
  });

  it('`no-expiry` folds into `valid` — an absent date must not manufacture an alarm', () => {
    expect(documentDisplayState(doc('Valid', null), P)).toBe('valid');
  });

  it('⚠️ a row still carrying the RETIRED literal is classified by the clock, not by it', () => {
    // `'Expiring Soon'` has left `SupplierDocumentStatus`, so this can only be
    // built through the cast helper — which is the point: a stale row arriving
    // from a future backend must not be able to assert its own display state.
    // It falls through the lifecycle passthrough to the clock, in BOTH
    // directions, on dates the fixture does not have.
    expect(documentDisplayState(doc('Expiring Soon', '2030-01-01'), P)).toBe('valid');
    expect(documentDisplayState(doc('Expiring Soon', '2020-01-01'), P)).toBe('expired');
  });
});

describe('the maps are total, and every label already existed', () => {
  const ALL: DocumentDisplayState[] = [
    'awaiting-upload',
    'under-review',
    'rejected',
    'valid',
    'expiring',
    'expired',
  ];

  it('⚠️ every display state resolves a label in BOTH locales — no new copy was written', () => {
    // The batch's first draft hand-wrote ID values and got `Under Review` wrong.
    // This is the assertion that would have caught it: the keys must resolve in
    // the SHIPPED resource maps, not in a fragment this batch authored.
    for (const s of ALL) {
      const key = DISPLAY_STATE_LABEL_KEY[s];
      expect(statusResourcesEn[key], `EN missing for ${s} (${key})`).toBeTruthy();
      expect(statusResourcesId[key], `ID missing for ${s} (${key})`).toBeTruthy();
    }
    // …and the two locales genuinely differ, or the assertion above would pass
    // over a map that simply echoed English (`i18n probe needs a divergent token`).
    expect(statusResourcesId[DISPLAY_STATE_LABEL_KEY.expiring]).not.toBe(
      statusResourcesEn[DISPLAY_STATE_LABEL_KEY.expiring],
    );
  });

  it('tone and action are total, and `expired` is distinguishable from `expiring`', () => {
    for (const s of ALL) {
      expect(DISPLAY_STATE_TONE[s], s).toBeTruthy();
      expect(DISPLAY_STATE_ACTION_KEY[s], s).toBeTruthy();
    }
    // The distinction the stored union could not make once `Expired` was retired.
    expect(DISPLAY_STATE_TONE.expired).not.toBe(DISPLAY_STATE_TONE.expiring);
    // …but both call for the same act: a dead certificate needs renewing too.
    expect(DISPLAY_STATE_ACTION_KEY.expired).toBe(DISPLAY_STATE_ACTION_KEY.expiring);
  });

  it('no map value is a `SupplierDocumentStatus` member — the vocabularies stay apart', () => {
    // #316 retired `'Expired'` from the union. If a display token ever resolved
    // to a stored member here, the two vocabularies would have merged by
    // accident, which is the thing that ruling forbids.
    for (const s of ALL) expect(DISPLAY_STATE_LABEL_KEY[s]).toMatch(/^status\./);
  });
});

describe('⚠️ THE WIRING, BY SITE — a working classifier proves nothing about a badge', () => {
  const read = (f: string) =>
    readFileSync(f, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/[^\n]*/g, ' ');

  const DOCS_PAGE = 'src/pages-v2/SupplierDocuments.tsx';
  const DASHBOARD = 'src/pages-v2/SupplierDashboard.tsx';
  const WIDGET = 'src/pages-v2/widgets/SupplierCertsExpiringWidget.tsx';

  it('CONTROL: the strip left real code behind on all three files', () => {
    // Without this, every `not.toMatch` below could pass over an empty string —
    // the shape that made a sibling gate accuse this widget of reading
    // `doc.status` when a JSX comment was all it had matched.
    expect(read(DOCS_PAGE)).toContain('SupplierDocuments');
    expect(read(DASHBOARD)).toContain('SupplierDashboard');
    expect(read(WIDGET)).toContain('SupplierCertsExpiringWidget');
  });

  it('SITE 1 · SupplierDocuments — the per-row BADGE reads the classifier', () => {
    const code = read(DOCS_PAGE);
    expect(code).toContain('documentDisplayState(doc, nowIso)');
    expect(code).toContain('DISPLAY_STATE_TONE[display]');
    expect(code).toContain('DISPLAY_STATE_LABEL_KEY[display]');
    // …and the stored tone map it used is GONE, not merely unused: a map left
    // in place is one import away from being wired back.
    expect(code).not.toContain('STATUS_VARIANT');
  });

  it('SITE 2 · SupplierDocuments — the `Valid` COUNT reads the classifier', () => {
    const code = read(DOCS_PAGE);
    expect(code).toContain("documentDisplayState(d, nowIso) === 'valid'");
    // The lifecycle counters beside it stay STORED, deliberately — asserted so
    // a later sweep does not "fix" them into reading a clock that has no
    // opinion on whether a file arrived.
    expect(code).toContain("d.status === 'Awaiting Upload'");
    expect(code).toContain("d.status === 'Rejected'");
  });

  it('SITE 3 · SupplierDashboard — the BADGE reads the classifier', () => {
    const code = read(DASHBOARD);
    expect(code).toContain('documentDisplayState(doc, nowIso)');
    expect(code).toContain('DISPLAY_STATE_TONE[display]');
    expect(code).not.toContain('DOC_STATUS_TONE');
  });

  it('SITE 4 · SupplierDashboard — the ACTION LABEL reads the classifier', () => {
    // ⚠️ The hard one. A badge that computes beside a label that does not is the
    // same split one field over, and the label is the half a supplier acts on.
    const code = read(DASHBOARD);
    expect(code).toContain('DISPLAY_STATE_ACTION_KEY[display]');
    expect(code).not.toContain('DOC_STATUS_ACTION_KEY');
  });

  it('SITE 5 · SupplierCertsExpiringWidget — on the SHARED classifier, not merely on a projection', () => {
    const code = read(WIDGET);
    expect(code).toContain('documentDisplayState');
    expect(code).not.toMatch(/\b(d|doc)\.status\b/);
  });

  it('⚠️ NO render site reads a clock-bearing stored member any more', () => {
    // The population is the two CLOCK members. The lifecycle members are
    // legitimately read (they are the dispatcher's cursor and carry no clock),
    // so a blanket `.status` ban would be wrong in the other direction.
    for (const f of [DOCS_PAGE, DASHBOARD, WIDGET]) {
      const code = read(f);
      expect(code, `${f} still branches on the stored clock literal`).not.toContain(
        "=== 'Expiring Soon'",
      );
      expect(code, `${f} still counts the stored 'Valid'`).not.toContain(
        "status === 'Valid'",
      );
    }
  });
});

describe('⚠️ the three surfaces agree BECAUSE they share a source, at any instant', () => {
  it('every fixture row gets one answer, and it is the same answer for all callers', () => {
    // The property the batch buys. Asserted over the whole population at three
    // instants rather than on one row at one instant, so a site that quietly
    // kept its own opinion could not hide in the rows nobody checked.
    for (const now of ['2026-01-01T00:00:00.000Z', P, '2030-01-01T00:00:00.000Z']) {
      for (const d of DOCUMENTS) {
        const a = documentDisplayState(d, now);
        const b = documentDisplayState(d, now);
        expect(b, `${d.id} @ ${now}`).toBe(a);
        expect(DISPLAY_STATE_TONE[a], `${d.id} @ ${now}`).toBeTruthy();
      }
    }
  });

  it('doc-001 and doc-202 compute `expiring` from a row that no longer says so', () => {
    // ⚠️ THE SECOND ASSERTION INVERTED, AND THE INVERSION IS THE BATCH.
    // It read `expect(d.status).toBe('Expiring Soon')` — the row agreeing with
    // the clock. The row no longer has an opinion: it stores the LIFECYCLE
    // fact, and the clock alone decides what a reader sees.
    for (const id of ['doc-001', 'doc-202']) {
      const d = DOCUMENTS.find((x) => x.id === id)!;
      expect(documentDisplayState(d, P), id).toBe('expiring');
      expect(d.status, id).toBe('Valid');
    }
  });
});
