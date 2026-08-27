// ────────────────────────────────────────────────────────────────────────────
// §81 — `sapSync`: THE FIELD THAT SAYS WHAT THE REGISTRY IS WAITING FOR.
//
// The honest-marker discipline applied to a STORE. Before this field, every
// registry row rendered identically whether S/4HANA held it or not — not because
// anything claimed SAP had it, but because nothing denied it, and **a row that
// cannot say whether SAP has seen it is a row that implies SAP has.**
//
// ── WHAT THIS FILE DEFENDS, AND IN WHICH DIRECTION ─────────────────────────
//   1. THE VALUE SET IS A MEASUREMENT, NOT A CHOICE. `SapSyncState` has one
//      member because the derivation of what this platform can KNOW returns one
//      answer. The reachability test below re-runs that derivation every run, so
//      a second member cannot arrive without the transport that would make it
//      reachable arriving first.
//   2. THE FIELD IS READ. A stored field with no reader is the defect
//      `storedFieldGate` exists for, and this one would be the worst instance of
//      it — a marker nobody renders is indistinguishable from no marker.
//   3. THE RECEIPT GATE DOES NOT READ IT, BY RULING. See the last describe; the
//      argument is stated there rather than here because it is the one assertion
//      in this file that a future batch might reasonably want to overturn.
//
// ── ⚠️ THE POPULATION GUARD IS FIRST, AND IT ASSERTS MEMBERSHIP ────────────
//   `EMPTY-INPUT-REPORTS-CLEAN-01` (§42b): every derivation below would report a
//   clean, agreeable, entirely worthless result over an empty registry or an
//   empty glob. Both instruments are proved non-empty by NAMED members before
//   anything is concluded from them.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { COMPLIANCE_REGISTRY } from './mock/fixtures/complianceRegistry';
import type { ComplianceRegistryEntry, SapSyncState } from './types';

/** The one reachable value, written out so a rename cannot pass silently. */
const AWAITING: SapSyncState = 'AWAITING_SYNC';

/** Every `.ts`/`.tsx` under src/, raw, specs excluded by NAME — the glob reaches
 *  them and hoping it does not is how the H3 sibling assertion was wrong for a
 *  whole phase (see `halalVerification.test.ts`). */
const productSources = (): Record<string, string> =>
  Object.fromEntries(
    Object.entries(
      import.meta.glob('/src/**/*.{ts,tsx}', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>,
    ).filter(([path]) => !path.includes('.test.')),
  );

/** Comment lines stripped. Rule 2, on this file's own instrument: every doc
 *  block added in this batch NAMES the value, so an unmasked matcher would
 *  "find" assignments in prose and report the type as multi-valued because it
 *  was documented thoroughly. */
const codeOf = (text: string): string =>
  text
    .split('\n')
    .filter((line) => !/^\s*(?:\/\/|\/\*|\*)/.test(line))
    .join('\n');

describe('CONTROL — the instruments examine something', () => {
  it('the registry is non-empty and holds a NAMED row', () => {
    expect(COMPLIANCE_REGISTRY.length).toBeGreaterThan(0);
    expect(COMPLIANCE_REGISTRY.map((e) => e.id)).toContain('creg-0001');
  });

  it('the source glob is non-empty and holds a NAMED file', () => {
    const paths = Object.keys(productSources());
    expect(paths.length).toBeGreaterThan(0);
    expect(paths).toContain('/src/services/data/types.ts');
    // The negative half: specs really are excluded, so a spec that assigns a
    // test value cannot be read as product code claiming reachability.
    expect(paths.some((p) => p.includes('.test.'))).toBe(false);
  });
});

describe('§81 — every row states its standing, and states the same one', () => {
  it('carries `sapSync` on EVERY row — no row can decline to say', () => {
    const missing = COMPLIANCE_REGISTRY.filter(
      (e) => (e as Partial<ComplianceRegistryEntry>).sapSync === undefined,
    );
    expect(missing.map((e) => e.id)).toEqual([]);
  });

  it('the distinct value set across the whole registry is exactly the one member', () => {
    const distinct = [...new Set(COMPLIANCE_REGISTRY.map((e) => e.sapSync))].sort();
    expect(distinct).toEqual([AWAITING]);
  });

  it('says it for CONFIRMED certificates too — the case the ruling is about', () => {
    // A `lifecycleState: 'Valid'` row is a certificate compliance has confirmed.
    // It is exactly the row that used to imply SAP held it, so it is the row the
    // marker has to reach. An empty `confirmed` here would make the assertion
    // vacuous, hence the length guard.
    const confirmed = COMPLIANCE_REGISTRY.filter((e) => e.lifecycleState === 'Valid');
    expect(confirmed.length).toBeGreaterThan(1);
    expect(confirmed.every((e) => e.sapSync === AWAITING)).toBe(true);
  });
});

describe('§81 — the value set is DERIVED, and re-derived every run', () => {
  it('no product module assigns any `sapSync` value but the one reachable member', () => {
    const assigned = Object.entries(productSources()).flatMap(([path, text]) =>
      [...codeOf(text).matchAll(/sapSync:\s*'([^']*)'/g)].map((m) => ({
        path,
        value: m[1],
      })),
    );

    // ⚠️ KNOWN-GOOD FIRST. A matcher that finds NOTHING would satisfy the
    // assertion below by examining nothing at all — the exact shape of
    // `EMPTY-INPUT-REPORTS-CLEAN-01`, one layer down from the glob guard.
    expect(assigned.length).toBeGreaterThan(0);
    expect(assigned.map((a) => a.path)).toContain(
      '/src/services/data/mock/fixtures/complianceRegistry.ts',
    );

    const offenders = assigned.filter((a) => a.value !== AWAITING);
    expect(offenders).toEqual([]);
  });

  it('KNOWN-BAD — the matcher would catch a second value if one were assigned', () => {
    // Probe the guard the other way (rule 4): the assertion above is only worth
    // believing if the same regex, run over a string that DOES carry a second
    // value, reports it. Run against a synthetic module, not the tree.
    const synthetic = "  sapSync: 'ACKNOWLEDGED_BY_SAP',\n  scopeText: 'x',\n";
    const found = [...codeOf(synthetic).matchAll(/sapSync:\s*'([^']*)'/g)].map((m) => m[1]);
    expect(found).toEqual(['ACKNOWLEDGED_BY_SAP']);
    expect(found.filter((v) => v !== AWAITING)).not.toEqual([]);
  });

  it('the union DECLARES one member — the type and the data cannot drift apart', () => {
    const decl = productSources()['/src/services/data/types.ts'];
    expect(decl).toBeDefined();
    const line = codeOf(decl).match(/export type SapSyncState =([^;]*);/);
    expect(line).not.toBeNull();
    const members = [...line![1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
    expect(members).toEqual([AWAITING]);
  });
});

describe('§81 — the marker is READ, which is what makes it a marker', () => {
  // ⚠️ **THE MATCHER TOOK TWO CORRECTIONS, AND THE PROBE FOUND BOTH.**
  //   v1 was `includes('sapSync')` — it passed on a surface whose field read had
  //   been deleted, because the i18n keys and the test id carry the same letters.
  //   v2 was `/\.sapSync(?![\w.])/` — still green after the same mutation,
  //   because the COLUMN-HEADER key `'compliance.table.sapSync'` ends in exactly
  //   that shape. Both were caught by mutating `entry.sapSync` → `entry.certType`
  //   and observing ZERO kills; neither would have been caught by reading the
  //   regex. **Rule 1 twice on one instrument, in one batch, on the seat that
  //   wrote the rule** — and the second failure is the more instructive: v2 was
  //   a deliberate narrowing that looked obviously sufficient.
  //
  //   v3 requires the access to hang off an IDENTIFIER that is not itself part
  //   of a dotted key or a quoted string: `entry.sapSync` matches;
  //   `'compliance.table.sapSync'` does not, because `table` is preceded by a
  //   dot; `` `compliance.sapSync.${…}` `` does not, twice over. The CONTROL
  //   below pins every one of those cases in BOTH directions, so a v4 cannot be
  //   adopted on the strength of the negatives alone.
  const READS_FIELD = /(?<![\w.'"`-])[A-Za-z_$][\w$]*\.sapSync(?![\w.])/;

  it('CONTROL — the matcher rejects every KEY shape and still accepts a real read', () => {
    // Rejects — the three shapes that fooled v1 and v2.
    expect(READS_FIELD.test("t('compliance.table.sapSync')")).toBe(false);
    expect(READS_FIELD.test('t(`compliance.sapSync.${entry.certType}`)')).toBe(false);
    expect(READS_FIELD.test('data-testid={`sap-sync-note`}')).toBe(false);
    // Accepts — so the rejections above are not merely a matcher that never
    // fires, which is the whole of `EMPTY-INPUT-REPORTS-CLEAN-01` applied to a
    // regex instead of to a population.
    expect(READS_FIELD.test('entry.sapSync}')).toBe(true);
    expect(READS_FIELD.test('e.sapSync === AWAITING')).toBe(true);
  });

  it('a non-fixture, non-spec surface READS the field', () => {
    // The `storedFieldGate` obligation, asserted here as well as there: this
    // field must never become stored-and-unread. Naming the surface (rather than
    // counting readers) means moving the column to a different page is a
    // deliberate edit here, not a silent loss of the marker.
    const readers = Object.entries(productSources())
      .filter(([path]) => path.startsWith('/src/pages-v2/') || path.startsWith('/src/components/'))
      .filter(([, text]) => READS_FIELD.test(codeOf(text)))
      .map(([path]) => path)
      .sort();
    expect(readers).toContain('/src/pages-v2/BuyerCompliance.tsx');
  });
});

describe('§81 — the receipt gate does NOT read sync state, and that is a ruling', () => {
  // ── ⚠️ THE ARGUMENT, KEPT WHERE THE ASSERTION IS ──────────────────────────
  //   `verifyHalalAtReceipt` answers ONE question: was there a certificate that
  //   actually backed the halal claim for this supplier × material at the instant
  //   the lot was received? That is a fact about the CERTIFICATE and about BPJPH.
  //   **Whether Paragon's own ERP holds a copy has no bearing on whether the
  //   material is halal-certified**, so a certificate compliance has confirmed
  //   and SAP has not yet seen is still confirmed, and the gate must not narrow
  //   on it. Letting it would conflate two independent axes: `lifecycleState`
  //   already carries "has compliance confirmed this" (Missing / Under Review /
  //   Valid), and reading `sapSync` beside it would let an ERP bookkeeping fact
  //   masquerade as a certification fact — refusing lots for a reason no
  //   regulator recognises.
  //
  //   ⚠️ **THE ONE PLACE THE DISTINCTION WOULD MATTER IS NOT THIS GATE.**
  //   `docs/Halal_Compliance_Control_Design_v1.md` §67–75 puts the *block* at
  //   S/4HANA PO creation, fed by an authoritative blocklist. A block living
  //   inside SAP does need to know what SAP holds — but that is the BLOCKLIST's
  //   concern, it is unbuilt (`grep -rni blocklist src/` returns one unrelated
  //   comment), and `verifyHalalAtReceipt` is a NOTICE that cannot refuse
  //   anything (H4). If the blocklist is ever built, it reads this field; the
  //   gate still should not.
  it('`halalVerification.ts` does not reference sync state', () => {
    const gate = productSources()['/src/services/data/halalVerification.ts'];
    expect(gate).toBeDefined();
    expect(codeOf(gate)).not.toContain('sapSync');
  });

  it('`complianceProjection.ts` does not reference it either — it is stored, not projected', () => {
    const projection = productSources()['/src/services/data/complianceProjection.ts'];
    expect(projection).toBeDefined();
    expect(codeOf(projection)).not.toContain('sapSync');
  });
});
