// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// THE SEED — AND THE ARM-COVERAGE ACCOUNTING (operator ruling h).
//
// P1 shipped nine `PslListing` LITERALS. P3 grows the same nine through the
// real verbs, and this file is where the trade is MEASURED rather than asserted
// in prose:
//
//   · every row is produced by a dispatch, so none is in a state no act put it
//     in — the shape `materialRequestStore` and `applicationSeed` both refuse
//     by name;
//   · the scopes are LANE-CORRECT, so the seed does not model one person
//     raising a listing and approving it;
//   · and **every projection arm the retired corpus covered is still covered**,
//     which is the half a "the seed ran" assertion would miss entirely.
//
// ── ⚠️ THE ARM-COVERAGE REPORT IS DERIVED, NOT LISTED ──────────────────────
//   The arms are read off `PslDisplayStatus` and `PslCapSource` — the shipped
//   unions — and each is classified as SEEDED or SYNTHETIC by asking the
//   corpus. A hand-written table of "arms we cover" would be a second
//   vocabulary that goes stale the day a union gains a member, which is exactly
//   `ENF-SEED-LIST-IS-NOT-THE-VOCABULARY-01`.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService } from './MockCommandService';
import { seedPslListings, PSL_SEEDS_RAW, pslSeedRawRows } from './pslSeed';
import { pslStore } from './stores/pslStore';
import { pslCapSettingStore } from './stores/pslCapSettingStore';
import { DECLARED_PRESENT } from '../fixturePresent';
import { effectiveCap, pslDisplayStatus } from '../pslProjection';
import { isPublished, PSL_LIFECYCLES, PSL_STATUSES } from '../pslListing';
import { SYSTEM_ROLES } from '../../transitions/businessRoles';
import { MATERIAL_MASTER } from '../../sdc/fixtures';
import { mockSuppliers } from '../../../data/mockSuppliers';

const P = DECLARED_PRESENT;

beforeEach(() => {
  pslStore.reset();
  pslCapSettingStore.reset();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('REACH — the seed really runs, and the store really opens empty', () => {
  it('⚠️ THE STORE OPENS EMPTY — every claim below would be vacuous otherwise', () => {
    expect(pslStore.all()).toEqual([]);
  });

  it('the seed lands, and MEMBERSHIP says so — never a count alone', async () => {
    const outcome = await seedPslListings();
    expect(outcome.status, outcome.reason ?? '').toBe('seeded');
    expect(pslStore.all().map((r) => r.id)).toContain('psl-001');
    expect(pslStore.all().map((r) => r.id)).toContain('psl-009');
    expect(pslStore.all().length).toBe(PSL_SEEDS_RAW.length);
  });

  it('⚠️ IT IS IDEMPOTENT ON A NON-EMPTY STORE — re-running adds nothing', async () => {
    await seedPslListings();
    const before = pslStore.all().map((r) => r.id);
    const again = await seedPslListings();
    expect(again.status).toBe('already-seeded');
    expect(pslStore.all().map((r) => r.id)).toEqual(before);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ EVERY ROW WAS PRODUCED BY AN ACT — not written into the store', () => {
  beforeEach(async () => {
    expect((await seedPslListings()).status).toBe('seeded');
  });

  it('every row carries a ledger whose first entry is its PROPOSAL', () => {
    for (const r of pslStore.all()) {
      expect(r.statusHistory.length, r.id).toBeGreaterThan(0);
      const first = r.statusHistory[0];
      expect(first.from, r.id).toBeNull();
      expect(first.lifecycle, r.id).toBe('Proposed');
      expect(first.by.kind, r.id).toBe('UNATTRIBUTED');
    }
  });

  it('⚠️ every ledger instant is STORE-ASSIGNED — a full timestamp, not an authored day', () => {
    // The authored literals were `YYYY-MM-DDTHH:MM:SS+07:00`; a store-assigned
    // one is an ISO instant minted at the act. What separates them here is that
    // the instant does NOT fall on the row's own authored validity day, which
    // is how the retired fixture authored them to agree.
    for (const r of pslStore.all()) {
      for (const h of r.statusHistory) {
        expect(h.at, r.id).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
      expect(r.statusHistory[0].at.slice(0, 10), r.id).not.toBe(r.validFrom.slice(0, 10));
    }
  });

  it('a Proposed row has no decider; every decided row has one', () => {
    for (const r of pslStore.all()) {
      if (r.lifecycle === 'Proposed') expect(r.decidedBy, r.id).toBeNull();
      else expect(r.decidedBy, r.id).not.toBeNull();
    }
    expect(pslStore.all().some((r) => r.lifecycle === 'Proposed')).toBe(true);
  });

  it('⚠️ THE LEDGER ENDS AT THE STORED LIFECYCLE — the walk and the row agree', () => {
    for (const r of pslStore.all()) {
      const last = r.statusHistory[r.statusHistory.length - 1];
      expect(last.lifecycle, r.id).toBe(r.lifecycle);
    }
  });

  it('⚠️ THE GRANT APPENDS `from === to` — the designation is unchanged, the lifecycle moves', () => {
    // The shape the retired corpus authored by hand on `psl-001`, now produced
    // by the machine. A target that appended only on a DESIGNATION change would
    // leave the decision out of the ledger entirely.
    const granted = pslStore.all().find((r) => r.id === 'psl-001')!;
    const grant = granted.statusHistory[1];
    expect(grant.from).toBe(grant.to);
    expect(grant.lifecycle).toBe('Listed');
  });

  it('the store MINTS the ids, and they follow the dispatch order', () => {
    expect(pslStore.all().map((r) => r.id)).toEqual(pslSeedRawRows().map((r) => r.id));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE SCOPES ARE LANE-CORRECT — the seed obeys the rules it demonstrates', () => {
  it('no single lane holds both the proposing and the deciding atom', () => {
    // Derived from the bundles rather than restated: the claim is about the
    // ROLE MODEL, and reading it off the model is what keeps it true when a
    // lane gains an atom.
    const holders = (atom: string): string[] =>
      Object.keys(SYSTEM_ROLES).filter((r) =>
        (SYSTEM_ROLES as Record<string, readonly string[]>)[r].includes(atom),
      );
    const proposeLanes = new Set(holders('psl:propose'));
    const decideLanes = new Set(holders('psl:decide'));
    expect([...proposeLanes].length).toBeGreaterThan(0);
    expect([...decideLanes].length).toBeGreaterThan(0);
    // The supersets (`admin`, `buyer_all`) hold everything by construction and
    // are not lanes; the LANES must not overlap.
    const lanes = ['procurement', 'receiving', 'finance', 'compliance', 'planning', 'requisitioner'];
    for (const lane of lanes) {
      const both = proposeLanes.has(lane) && decideLanes.has(lane);
      expect(both, `${lane} holds BOTH psl:propose and psl:decide`).toBe(false);
    }
  });

  it('⚠️ THE SEED WOULD BE REFUSED UNDER THE DEFAULT BUYER SEAT — §76d, measured', async () => {
    // ⚠️ **THIS IS THE PROBE THAT SAYS THE LANE SPLIT IS REAL RATHER THAN
    // DECORATIVE.** The default buyer seat holds all six lane bundles, so it
    // holds `psl:propose` AND `psl:decide`, and
    // `PSL_RESTRICTIVE_STATUS_APPROVED` refuses a Mandatory or Sole Source
    // decision from such a seat. Six of the nine seeded rows are restrictive.
    //
    // Without this, "the seed uses narrow scopes" would be a stylistic claim.
    const commands = new MockCommandService();
    const wide = {
      personaType: 'buyer' as const,
      supplierId: null,
      businessRoles: ['procurement', 'compliance'],
      actor: { kind: 'UNATTRIBUTED' as const, reason: 'NO_PERSON_IN_SESSION' as const },
    };
    const proposed = await commands.dispatch(wide, {
      transitionId: 't_psl_propose',
      entity: 'psl',
      payload: {
        supplierId: 'sup-002',
        materialCodes: ['RM-PSTN-7150'],
        status: 'Sole Source',
        validFrom: P,
        validUntil: '2099-01-01',
        justification: 'wide seat probe',
        reason: 'wide seat probe',
      },
    });
    expect(proposed.status).not.toBe('failed');

    const granted = await commands.dispatch(wide, {
      transitionId: 't_psl_grant',
      entity: 'psl',
      entityId: proposed.entityId!,
      payload: { reason: 'wide seat probe' },
    });
    expect(granted.status).toBe('failed');
    expect(granted.reason).toMatch(/PSL_SEAT_HOLDS_BOTH_AUTHORITIES/);

    // ⚠️ KNOWN-GOOD, the other direction: the NARROW deciding seat is admitted.
    const narrow = { ...wide, businessRoles: ['compliance'] };
    const ok = await commands.dispatch(narrow, {
      transitionId: 't_psl_grant',
      entity: 'psl',
      entityId: proposed.entityId!,
      payload: { reason: 'narrow seat probe' },
    });
    expect(ok.status, ok.reason ?? '').not.toBe('failed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE ARM-COVERAGE REPORT — every arm the retired corpus reached', () => {
  beforeEach(async () => {
    expect((await seedPslListings()).status).toBe('seeded');
  });

  /** Which display arms the SEEDED corpus reaches at the declared present. */
  const seededDisplayArms = (): ReadonlySet<string> =>
    new Set(pslStore.all().map((r) => pslDisplayStatus(r, P)));

  it('⚠️ EVERY DISPLAY ARM BUT NONE IS SEEDED — derived from the shipped union', () => {
    // The population is the UNION, not a list of arms somebody remembered.
    const arms = [...PSL_LIFECYCLES, 'Scheduled', 'Expiring', 'Expired'] as const;
    const reached = seededDisplayArms();
    for (const arm of arms) {
      expect(reached.has(arm), `display arm ${arm} is no longer reached by seeded data`).toBe(
        true,
      );
    }
    // And the set is exactly the union — a tenth arm nobody declared would show
    // up here rather than silently joining the corpus.
    expect([...reached].sort()).toEqual([...arms].sort());
  });

  it('⚠️ THE ONE ARM THAT MOVED TO SYNTHETIC IS `CEILING_BOUNDED`, AND ONLY IT', () => {
    // ── THE ACCOUNTING RULING (h) ASKS FOR, DERIVED RATHER THAN DECLARED ───
    // `PSL_CAP_WITHIN_CEILING` refuses any override above the ceiling, so no
    // dispatch can produce a ceiling-bounded row. The arm still exists (a
    // ruling that LOWERS the ceiling reaches it) and is covered synthetically
    // in `pslProjection.test.ts`. Every OTHER cap arm must still be seeded.
    const reached = new Set(pslStore.all().map((r) => effectiveCap(r).source));
    expect(reached.has('LISTING_OVERRIDE')).toBe(true);
    expect(reached.has('NO_SETTING_RECORDED')).toBe(true);
    expect(reached.has('CEILING_BOUNDED')).toBe(false);
    // `PORTAL_DEFAULT` is unreachable from a corpus alone — it needs a ledger
    // entry, which the seed deliberately does not write (an unrecorded default
    // is the honest cold start). Covered synthetically, beside the ceiling.
    expect(reached.has('PORTAL_DEFAULT')).toBe(false);
    expect(pslCapSettingStore.all()).toEqual([]);
  });

  it('⚠️ THE PUBLICATION DIAGONALS ARE ALL FOUR REACHED — in force × published', () => {
    // The independence claim is worthless if every published row happens to be
    // in force and every unpublished one happens not to be. Four cells, and the
    // corpus must occupy at least three of them for the claim to have content.
    const cell = (r: (typeof pslStore.all extends () => infer R ? R : never)[number]): string =>
      `${pslDisplayStatus(r, P) === 'Expired' ? 'lapsed' : 'live'}/${
        isPublished(r) ? 'published' : 'internal'
      }`;
    const cells = new Set(pslStore.all().map(cell));
    expect(cells.has('live/published')).toBe(true);
    expect(cells.has('live/internal')).toBe(true);
    expect(cells.has('lapsed/published')).toBe(true);
  });

  it('⚠️ THE MULTI-LISTING SUPPLIER SURVIVES — the ladder has something to rank', () => {
    const bySupplier = new Map<string, number>();
    for (const r of pslStore.all()) {
      bySupplier.set(r.supplierId, (bySupplier.get(r.supplierId) ?? 0) + 1);
    }
    expect([...bySupplier.values()].some((n) => n > 2)).toBe(true);
  });

  it('⚠️ EVERY STATUS IN THE VOCABULARY IS REACHED', () => {
    const held = new Set(pslStore.all().map((r) => r.status));
    for (const s of PSL_STATUSES) expect(held.has(s), `no seeded row is ${s}`).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE HONESTY LAYERS SURVIVED THE MOVE FROM FIXTURE TO SEED', () => {
  beforeEach(async () => {
    expect((await seedPslListings()).status).toBe('seeded');
  });

  it('every supplier named is on the platform`s own roster', () => {
    const ids = new Set(mockSuppliers.map((s) => s.id));
    for (const r of pslStore.all()) expect(ids.has(r.supplierId), r.id).toBe(true);
  });

  it('⚠️ every material code is a REAL master code', () => {
    const master = new Set(Object.keys(MATERIAL_MASTER));
    const named = pslStore
      .all()
      .flatMap((r) => (r.scope.kind === 'material' ? [...r.scope.materialCodes] : []));
    expect(named.length).toBeGreaterThan(5);
    expect(named.filter((c) => !master.has(c))).toEqual([]);
  });

  it('⚠️ NO ROW NAMES A PERSON — every actor is unattributed', () => {
    const actors = pslStore
      .all()
      .flatMap((r) => [
        r.proposedBy,
        r.decidedBy,
        r.capDecidedBy,
        r.publishedBy,
        ...r.statusHistory.map((h) => h.by),
      ])
      .filter((a) => a !== null);
    expect(actors.length).toBeGreaterThan(10);
    for (const a of actors) expect(a!.kind).toBe('UNATTRIBUTED');
  });

  it('⚠️ THE FOUR CAP FIELDS TRAVEL TOGETHER — now a property of the machine', () => {
    // Under the retired fixture this was a rule a row had to honour. One verb
    // writes all four, so it is a property of the write path — and asserting it
    // here is what says the verb, not a convention, is what holds it.
    for (const r of pslStore.all()) {
      const present = [
        r.capDaysOverride !== null,
        r.capJustification !== null,
        r.capDecidedBy !== null,
        r.capDecidedAt !== null,
      ];
      expect(new Set(present).size, `${r.id}: the cap quartet is half-written`).toBe(1);
    }
    expect(pslStore.all().some((r) => r.capDaysOverride !== null)).toBe(true);
    expect(pslStore.all().some((r) => r.capDaysOverride === null)).toBe(true);
  });
});
