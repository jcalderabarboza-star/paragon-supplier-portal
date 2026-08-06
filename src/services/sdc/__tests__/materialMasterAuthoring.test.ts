// ─────────────────────────────────────────────────────────────────────────────
// CP-2 · 2B-3 — AUTHORING A MEANING, WHICH IS NOT ADOPTING ONE.
//
// `materialMasterAdoption.test.ts` pins 2B-2: the master says what the lane
// says. That question CANNOT BE ASKED HERE, because the lane says nothing. The
// five codes below are reached only through `RFQ.materialIds: string[]`, a bare
// array with no description field, and `meaningsOf` returns `[]` for every one
// of them — before this batch and after it.
//
// So this file pins a different set of claims:
//
//   · the POPULATION derives (these five, and no sixth, are RFQ-only codes);
//   · the LABEL is the RFQ title's head, and the em-dash split is DERIVED from
//     the data rather than chosen — see the `RM-HUMEC-3405` block below;
//   · the UNIT is the RFQ HEADER's, and the header's weakness is MEASURED
//     rather than hedged about in prose;
//   · authoring did NOT make the lane state a meaning. It made the code
//     RESOLVABLE. Those are different facts and the tests keep them apart.
//
// ── WHY THE EVIDENCE TIER IS DERIVED, NOT STAMPED ───────────────────────────
//   The dispatch requires the evidence tier recorded per row. It is NOT written
//   as a field on `MaterialMasterEntry`: a hand-written `evidenceTier: 'T2'`
//   is a stamp, and a stamp drifts from the thing it describes exactly the way
//   `MG-UNREAD-BY-ANYTHING-01` described. So the tier is COMPUTED here — how
//   many code-bound records state each code's meaning (zero), how many state
//   its unit (its RFQ headers), and whether the header's unit is attributable
//   to one code at all. A row that acquires better evidence later reads as
//   better evidence automatically; a row that loses it goes red.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { mockRfqs } from '../../../data/mockRfqs';
import { MATERIAL_GROUPS, groupLabel } from '../materialGroups';
import { MATERIAL_MASTER } from '../fixtures';

// ─── The derived population (the identity pin's walk, same shape) ────────────

interface Ref {
  readonly code: string;
  readonly meaning: string | null;
  readonly unit: string | null;
  readonly module: string;
}

const IS_TEST_MODULE = /\.test\.tsx?$|__tests__|^\/src\/test\//;

const sourceModules = import.meta.glob('/src/**/*.ts') as Record<
  string,
  () => Promise<Record<string, unknown>>
>;

const siblingMatching = (o: Record<string, unknown>, re: RegExp): string | null => {
  for (const k of Object.keys(o)) {
    if (re.test(k) && typeof o[k] === 'string' && o[k] !== '') return o[k] as string;
  }
  return null;
};

const REFS: Ref[] = [];
const collect = (root: unknown, module: string) => {
  const seen = new WeakSet<object>();
  const walk = (node: unknown) => {
    if (node === null || typeof node !== 'object') return;
    // ⚠️ SKIP THE MASTER ITSELF, BY REFERENCE — not by module path. The first
    // draft of this file excluded `/src/services/sdc/fixtures.ts` by name and
    // derived an EMPTY population, because `MATERIAL_MASTER` is re-exported and
    // re-imported by several modules and the walk attributed its codes to
    // whichever file it reached them through. A path exclusion is a claim about
    // where an object lives; an identity check is a fact about which object it
    // is. The same reasoning as `DERIVED-OVER-A-CHOSEN-SCOPE-01`, one level in.
    if (node === (MATERIAL_MASTER as unknown as object)) return;
    if (seen.has(node as object)) return;
    seen.add(node as object);
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const o = node as Record<string, unknown>;
    if (typeof o.materialCode === 'string' && o.materialCode !== 'materialCode') {
      REFS.push({
        code: o.materialCode,
        meaning: siblingMatching(o, /description/i),
        unit: siblingMatching(o, /^uom$|unit/i),
        module,
      });
    }
    // A bare `string[]` states no meaning — recorded as null, never skipped.
    if (Array.isArray(o.materialIds)) {
      for (const c of o.materialIds) {
        if (typeof c === 'string') REFS.push({ code: c, meaning: null, unit: null, module });
      }
    }
    for (const k of Object.keys(o)) walk(o[k]);
  };
  walk(root);
};

for (const [file, load] of Object.entries(sourceModules)) {
  if (IS_TEST_MODULE.test(file)) continue;
  for (const value of Object.values(await load())) collect(value, file);
}

const meaningsOf = (code: string) => [
  ...new Set(REFS.filter((r) => r.code === code && r.meaning).map((r) => r.meaning!)),
];
/** Modules naming a code. The master is already out of `REFS` (skipped by
 *  reference in the walk), so this answers "where did it come FROM", not "does
 *  the master hold it". */
const sourcesOf = (code: string) =>
  [...new Set(REFS.filter((r) => r.code === code).map((r) => r.module))].sort();

/**
 * THE POPULATION, DERIVED: master codes whose only non-master source in the
 * whole tree is the RFQ lane. That is not a description of the five — it is
 * their DEFINITION, and it is what made them unadoptable at 2B-2.
 *
 * Deriving it this way rather than listing five literals also means the seed
 * entry `RM-EMUL-3310` correctly stays out: it is mute in the RFQ lane too, but
 * the delivery fixtures name it with a `materialCode`, so it is not RFQ-only.
 * A literal list would have had to remember that; this does not.
 */
const AUTHORED = Object.keys(MATERIAL_MASTER)
  .filter((c) => {
    const src = sourcesOf(c);
    return src.length === 1 && src[0] === '/src/data/mockRfqs.ts';
  })
  .sort();

/** Every RFQ naming a code. The import is provably complete — see the first
 *  test, which derives that no other module sources these codes at all. */
const rfqsFor = (code: string) => mockRfqs.filter((r) => r.materialIds.includes(code));

/** The title's head — everything before the em-dash that separates the material
 *  from the sourcing event. Split, never stripped by pattern: a head with no
 *  em-dash is returned whole. */
const head = (title: string) => title.split(' — ')[0].trim();
const tail = (title: string) => title.split(' — ').slice(1).join(' — ').trim();

describe('2B-3 — the population DERIVES, and it is five', () => {
  it('collected a real population (guards a vacuous pass)', () => {
    expect(REFS.length).toBeGreaterThan(80);
    expect(mockRfqs.length).toBeGreaterThan(10);
    // ⚠️ AND `AUTHORED` ITSELF IS NON-EMPTY. Added after the first run of this
    // file derived an empty population and NINETEEN assertions passed — every
    // `for (const code of AUTHORED)` loop and every `.filter(...)` is vacuously
    // true over an empty set. The population guard has to cover the population
    // the assertions iterate, not just the raw walk that feeds it.
    expect(AUTHORED.length).toBe(5);
  });

  it('exactly five master codes are sourced ONLY by the RFQ lane', () => {
    expect(AUTHORED).toEqual([
      'AI-CENT-6900',
      'PK-ALCP-2441',
      'PK-PETB-8803',
      'PK-PETB-8825',
      'RM-HUMEC-3405',
    ]);
  });

  it('the master is now 42 — 5 seeded, 25 adopted, 5 authored 2B-3, 7 authored 2B-5b-ii', () => {
    expect(Object.keys(MATERIAL_MASTER)).toHaveLength(42);
    // ⚠️ AND THE FIVE OF *THIS* BATCH ARE STILL FIVE. The derived population
    // above is RFQ-only codes, and 2B-5b-ii's seven come from the ASN lane, so
    // they cannot leak into it — asserted rather than assumed, because "the
    // count went up and the batch's own set did not" is the exact shape that
    // makes a derived population worth having.
    expect(AUTHORED).toHaveLength(5);
  });
});

describe('2B-3 — AUTHORING, and the difference from adoption is asserted', () => {
  it('every authored code STILL states no meaning in the tree', () => {
    // ⚠️ THE CLAIM MOST LIKELY TO BE MISREAD, so it is pinned rather than
    // explained. Writing a master entry does NOT make the RFQ lane state a
    // meaning — `materialIds` is still a bare `string[]`. What changed is that
    // the code is now RESOLVABLE (`labelOf` returns a label instead of echoing
    // the raw code). Resolvable and self-describing are different properties,
    // and conflating them is how a master entry starts looking like evidence
    // for itself.
    for (const code of AUTHORED) {
      expect(meaningsOf(code), `${code} states no meaning in any lane`).toEqual([]);
    }
  });

  it('and NO authored code has a T1 source — a code-bound line with a description', () => {
    // The tier floor, measured. T1 is one record carrying the code, a
    // description AND a unit; all 25 of 2B-2's adoptions had one. Zero of these
    // do — which is exactly why this batch authors instead of ratifying.
    const t1 = REFS.filter((r) => AUTHORED.includes(r.code) && r.meaning !== null);
    expect(t1).toEqual([]);
  });

  it('the RFQ lane is their ONLY source, so reading `mockRfqs` is complete', () => {
    // Guards the one direct import in this file. If a second module ever names
    // one of these codes, the evidence base widens and this pin says so before
    // any conclusion drawn from `mockRfqs` alone can go stale.
    for (const code of AUTHORED) {
      expect(sourcesOf(code), `${code} is sourced only by the RFQ lane`).toEqual([
        '/src/data/mockRfqs.ts',
      ]);
    }
  });
});

describe('2B-3 — the label IS the RFQ title head, and the split is DERIVED', () => {
  it('each authored label equals the head of every RFQ that names it', () => {
    const disagreeing = AUTHORED.map((code) => ({
      code,
      master: MATERIAL_MASTER[code].label,
      heads: [...new Set(rfqsFor(code).map((r) => head(r.title)))],
    })).filter((r) => !(r.heads.length === 1 && r.heads[0] === r.master));
    expect(disagreeing).toEqual([]);
  });

  it('⚠️ RM-HUMEC-3405 is the PROOF the tail is not part of the meaning', () => {
    // THE WHOLE ARGUMENT FOR THE TRIM, in one code. It appears on three RFQs
    // with three DIFFERENT titles. If the tail were part of the meaning, this
    // code would state three meanings and be unadoptable under ONE CODE, ONE
    // MEANING. One head, three tails: it states ONE meaning and three sourcing
    // contexts. The trim is forced by the data, not chosen for tidiness.
    const titles = rfqsFor('RM-HUMEC-3405').map((r) => r.title);
    expect(titles).toHaveLength(3);
    expect(new Set(titles).size, 'three DISTINCT titles').toBe(3);
    expect([...new Set(titles.map(head))], 'ONE head').toEqual(['Propylene Glycol USP']);
    expect(new Set(titles.map(tail)).size, 'three DISTINCT tails').toBe(3);
  });

  it('the trim is COMPLETE — no authored label carries a sourcing-event tail', () => {
    // The 2B-2 rule, re-applied: a partial trim is worse than none, because the
    // untrimmed survivor becomes a second meaning. Here there is no lane string
    // to leave behind, so the check is on the master itself.
    const carriers = AUTHORED.filter((c) => MATERIAL_MASTER[c].label.includes(' — '));
    expect(carriers).toEqual([]);
  });

  it('and every RFQ title in the tree actually HAS this shape', () => {
    // Guards the split from being a rule that happens to fit five rows. If a
    // future RFQ title drops the separator, the head is the whole title and this
    // says so out loud rather than silently absorbing an event into a meaning.
    const untailed = mockRfqs.filter((r) => !r.title.includes(' — ')).map((r) => r.rfqNumber);
    expect(untailed).toEqual([]);
  });
});

describe('2B-3 — the unit is the RFQ HEADER, and the header is WEAKER evidence', () => {
  it('each canonical unit IS the header unit of every RFQ naming it', () => {
    const wrong = AUTHORED.map((code) => ({
      code,
      canonical: MATERIAL_MASTER[code].canonicalUom as string,
      headers: [...new Set(rfqsFor(code).map((r) => r.uom))],
    })).filter((r) => !(r.headers.length === 1 && r.headers[0] === r.canonical));
    expect(wrong).toEqual([]);
  });

  it('⚠️ THE HEADER UNIT IS NOT A PER-MATERIAL FIELD — measured, not asserted', () => {
    // WHY T2 IS A LOWER TIER, made structural. `RFQ.uom` has arity ONE;
    // `RFQ.materialIds` has arity N. The tree contains RFQs where N > 1, so for
    // those the header unit is attributable to NEITHER code. That is not a
    // hypothetical weakness described in a comment — it is three live rows.
    const multiCode = mockRfqs.filter((r) => r.materialIds.length > 1);
    expect(multiCode.map((r) => r.rfqNumber)).toEqual([
      'RFQ-2026-003',
      'RFQ-2026-004',
      'RFQ-2026-005',
    ]);
    // …and NOT ONE of the five rides that route. The mapping is unambiguous for
    // THESE ROWS, which is a property of the rows and not of the field. A sixth
    // code arriving as the second element of a `materialIds` array gets no unit
    // from here and must not be given one by analogy.
    for (const code of AUTHORED) {
      const shared = rfqsFor(code).filter((r) => r.materialIds.length > 1);
      expect(shared, `${code} is the sole code on every RFQ naming it`).toEqual([]);
    }
  });

  it('⚠️ RM-HUMEC-3405 has THREE RFQs but not three witnesses', () => {
    // The dispatch asked for this row to be noted as the only one with evidence
    // from three RFQs. Measured, the count overstates the independence:
    // RFQ-2026-013 is a DECLARED CLONE of RFQ-2026-012 — same material, same
    // suppliers, same quantity, same value, differing only in the FX ledger it
    // was built to demonstrate. A copy agrees with its original by construction.
    // THREE SOURCES OF THE SAME TIER, ONE OF WHICH IS A REPLICATION.
    const [r12, r13] = ['RFQ-2026-012', 'RFQ-2026-013'].map(
      (n) => mockRfqs.find((r) => r.rfqNumber === n)!,
    );
    expect(r13.materialIds).toEqual(r12.materialIds);
    expect(r13.totalQty).toBe(r12.totalQty);
    expect(r13.uom).toBe(r12.uom);
    expect(r13.estimatedValue).toBe(r12.estimatedValue);
    expect(head(r13.title)).toBe(head(r12.title));
    // What genuinely differs is the pin ledger — the reason the clone exists.
    expect(r12.fxPins).toBeUndefined();
    expect(r13.fxPins?.length).toBeGreaterThan(0);
  });

  it('the split is 2 KG / 3 PCS, and it follows the material', () => {
    const byUnit = (u: string) => AUTHORED.filter((c) => MATERIAL_MASTER[c].canonicalUom === u);
    expect(byUnit('KG')).toEqual(['AI-CENT-6900', 'RM-HUMEC-3405']);
    expect(byUnit('PCS')).toEqual(['PK-ALCP-2441', 'PK-PETB-8803', 'PK-PETB-8825']);
  });
});

describe('2B-3 — groups: two standing decisions PAY OUT, and one facet cannot vote', () => {
  it('every group the master uses is DECLARED (all 35 rows)', () => {
    const undeclared = Object.values(MATERIAL_MASTER)
      .map((m) => m.materialGroup)
      .filter((g) => groupLabel(g) === null);
    expect([...new Set(undeclared)]).toEqual([]);
  });

  it('materialType is DERIVED from the group axis, not asserted per row', () => {
    const axisOf = (group: string) => MATERIAL_GROUPS.find((g) => g.group === group)?.axis ?? null;
    const mismatched = Object.values(MATERIAL_MASTER)
      .map((m) => ({
        code: m.materialCode,
        group: m.materialGroup,
        type: m.materialType,
        expected: axisOf(m.materialGroup)?.startsWith('packaging') ? 'VERP' : 'ROH',
      }))
      .filter((r) => r.type !== r.expected);
    expect(mismatched).toEqual([]);
  });

  it('⚠️ MG-21 finally has its aluminium closure — R-1 PAYS OUT', () => {
    // The row the substrate-vs-function split was argued over at 2B-1, landing
    // two batches later. Under a pure substrate axis `PK-ALCP-2441` would sit in
    // MG-22 (metal), away from the plastic closures it is sourced with; R-1
    // chose function so it sits with them. The decision was recorded BEFORE its
    // member existed, which is what makes assigning it today an APPLICATION
    // rather than a decision smuggled inside an adoption diff.
    const membersOf = (g: string) =>
      Object.values(MATERIAL_MASTER)
        .filter((m) => m.materialGroup === g)
        .map((m) => m.materialCode)
        .sort();
    // ⚠️ THREE AT 2B-5b-ii. `PK-ALCP-2450` (*Aluminium Closure 24/410*) is a
    // SECOND aluminium closure filed by FUNCTION rather than substrate — and it
    // is deliberately NOT the same row as `PK-ALCP-2441` (operator ruling R-2:
    // an open 2026 RFQ is not evidence about a 2025 delivery, and 24/410 fixes
    // the neck finish only). R-1's split is no longer a rule that fired once.
    expect(membersOf('MG-21')).toEqual(['PK-ALCP-2441', 'PK-ALCP-2450', 'PK-CAPF-8820']);
    // …and MG-22 STILL has none. That is the payout, stated from the other
    // side: the tree's one metal closure did not go to the metal group.
    expect(membersOf('MG-22')).toEqual([]);
  });

  it('MG-06 gains its FIRST master member, and exactly one', () => {
    const botanicals = Object.values(MATERIAL_MASTER)
      .filter((m) => m.materialGroup === 'MG-06')
      .map((m) => m.materialCode);
    expect(botanicals).toEqual(['AI-CENT-6900']);
    expect(groupLabel('MG-06')).toBe('Botanical extracts & functional');
  });

  it('⚠️ RM-HUMEC-3405 is MG-03, and the RFQ facet that says otherwise CANNOT vote', () => {
    // All three of its RFQs carry `materialCategory: 'Emulsifiers'`, and the
    // master says humectants/glycols. That is NOT a second `MG-COLLISION-21-01`.
    // `RFQCategory` is a SIX-VALUE UI FACET with no humectant or glycol member
    // at all, so 'Emulsifiers' is a COERCED value — the nearest available
    // bucket — not a competing declaration. A vocabulary that cannot express an
    // answer has not given a different one.
    for (const r of rfqsFor('RM-HUMEC-3405')) expect(r.materialCategory).toBe('Emulsifiers');
    const facets = [...new Set(mockRfqs.map((r) => r.materialCategory))];
    expect(facets.filter((f) => /humect|glycol/i.test(f))).toEqual([]);
    // The registry, by contrast, names it exactly — so the classification that
    // CAN express the answer is the one the master follows.
    expect(groupLabel('MG-03')).toMatch(/glycol/i);
    // And the master already ruled this shape once: `RM-EMUL-3310` is a SEED
    // entry whose code says EMUL and whose group is MG-03, because glycerin is
    // a glycol. `materialCode` is opaque; the prefix decided neither row.
    expect(
      Object.values(MATERIAL_MASTER)
        .filter((m) => m.materialGroup === 'MG-03')
        .map((m) => m.materialCode)
        .sort(),
    ).toEqual(['RM-EMUL-3310', 'RM-HUMEC-3405']);
    // See `MG-NO-EMULSIFIER-GROUP-01`: the vocabulary has no emulsifier group,
    // which is why this row keeps looking like an open question and is not one.
  });
});

describe('2B-3 — PK-PETB-8825 is its OWN item (operator ruling), not an alias', () => {
  it('both bottles exist, distinctly, and neither points at the other', () => {
    // 2A withheld this row because calling 8825 the same item as the master's
    // 8810 is an ADOPTION decision, not a collision fix. Ruled: DIFFERENT ITEMS
    // — same substrate, same volume, different closure format, and under
    // `D-IDENTITY-GRAIN = SPECIFICATION` a closure format is part of the
    // purchasable item.
    expect(MATERIAL_MASTER['PK-PETB-8810'].label).toBe('PET Bottle 250ml');
    expect(MATERIAL_MASTER['PK-PETB-8825'].label).toBe('PET Bottle 250ml Flip-Top');
    // Same group, same type, same unit — the grain is the ONLY difference, which
    // is what makes it a specification split rather than two unrelated rows.
    for (const k of ['materialGroup', 'materialType', 'canonicalUom'] as const) {
      expect(MATERIAL_MASTER['PK-PETB-8825'][k]).toBe(MATERIAL_MASTER['PK-PETB-8810'][k]);
    }
    // No alias field was invented to soften the split. ⚠️ The key list is
    // EXACT, so a field added to the entry shape lands here first — which is
    // how `bpomApplicable` announced itself at 2B-4a rather than arriving
    // unremarked.
    expect(Object.keys(MATERIAL_MASTER['PK-PETB-8825']).sort()).toEqual([
      'bpomApplicable',
      'canonicalUom',
      'label',
      'materialCode',
      'materialGroup',
      'materialType',
    ]);
  });
});

describe('2B-4 GATE — the mechanism landed at 2B-4a; the BEHAVIOUR still has not', () => {
  it('all 35 rows carry bpomApplicable, and the GR wizard has never heard of it', () => {
    // ⚠️ INVERTED AT 2B-4a, NOT DELETED — see the twin in
    // `materialMasterAdoption.test.ts`. At 2B-3 this asserted ABSENCE across
    // the wider set; the field was dispatched at 2B-4a and the rule it was
    // guarding is unchanged: mechanism early, behaviour late.
    const missing = Object.values(MATERIAL_MASTER)
      .filter((m) => !('bpomApplicable' in (m as Record<string, unknown>)))
      .map((m) => m.materialCode);
    expect(missing).toEqual([]);
    expect(Object.keys(MATERIAL_MASTER)).toHaveLength(42);
    // ⚠️ THE GATE THIS PIN GUARDS IS DISCHARGED AT 2B-5b-ii — and the pin below
    // still holds, which is the whole point of separating them. The GR wizard is
    // fed `asnStore`; that space is retired and every code it can hand the
    // wizard is now in the master, so a fail-closed master gate would refuse
    // nothing legitimate. **THE BEHAVIOUR STILL HAS NOT MOVED**: the wizard has
    // never heard of `bpomApplicable` and still runs the prefix rule. Mechanism
    // early, precondition discharged, behaviour late — three separate facts,
    // and 2B-4b changes only the third.
    const wizard = import.meta.glob('/src/components/v2-features/GRInspectionWizard.tsx', {
      query: '?raw',
      import: 'default',
      eager: true,
    })['/src/components/v2-features/GRInspectionWizard.tsx'] as string;
    // ⚠️ INVERTED AT 2B-4b — the third fact moved, and only the third. The
    // sentence above is left standing because it was true when written and it
    // names what changed: mechanism early (2B-4a), precondition discharged
    // (2B-5b-ii), behaviour late (here). The wizard now reads the master.
    expect(wizard).not.toContain("materialCode.startsWith('AI-')");
    expect(wizard).toContain('bpomOf(');
  });
});
