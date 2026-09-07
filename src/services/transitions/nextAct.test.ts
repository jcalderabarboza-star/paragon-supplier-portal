// ─────────────────────────────────────────────────────────────────────────────
// WHO ACTS NEXT — the gate. The arms are the axes, so the assertions are too.
//
// ⚠️ **POPULATION CONTROL FIRST, ASSERTING MEMBERSHIP AND NEVER A COUNT**
// (`EMPTY-INPUT-REPORTS-CLEAN-01`, §42b). Nearly everything below walks the
// registry and filters; a filter over an EMPTY registry passes. Importing
// `./index` rather than `./registry` is what makes the flows self-register, and
// the control is what proves they did.
//
// ⚠️ **AND THE POPULATION IS DERIVED FROM SOMETHING THE SUBJECT CANNOT REACH**
// (§86). `ownerlessScope.test.ts` derived its rows by asking the predicate under
// test, so mutating that predicate emptied the population and the assertions
// passed vacuously over zero rows while the suite went red on its own control —
// indistinguishable from a kill. Here the population comes from each flow's OWN
// `states` and `transitions`, which sit above `nextActFor` entirely: mutate the
// composition and every row still exists to be judged.
//
// ⚠️ **NO CARDINALITY IS RESTATED** (`FLOOR-IN-PROSE-01`). The stranded set was
// 25 across 10 flows before the boundary batch and 28 across 11 after it, with
// nobody editing a spec — because nothing here asserts either figure. What is
// asserted is that each arm's MEMBERSHIP is what the data says it is.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { getKnownFlows } from './index';
import { nextActFor, EXTERNAL_OWNER_ORDER, type NextAct } from './nextAct';
import { isTerminalState, userVerbsFrom } from './legality';
import type { ExternalFactOwner } from './schema';
import { PERSONA_SYSTEM_ROLES } from './businessRoles';
import { NEXT_ACT_KEY } from '../../lib/i18n/nextAct';
import { rolesEn, rolesId } from '../../lib/i18n/roles';

const BUYER = PERSONA_SYSTEM_ROLES.buyer;
const SUPPLIER = PERSONA_SYSTEM_ROLES.supplier;

/** Every (flow, state) pair in the tree — derived from the flows' own `states`. */
const everyState = (): { entity: string; state: string }[] =>
  getKnownFlows().flatMap((f) => f.states.map((state) => ({ entity: f.entity, state })));

const actsOf = (roles: readonly string[]) =>
  everyState().map((s) => ({ ...s, act: nextActFor(s.entity, s.state, roles as never) }));

describe('POPULATION CONTROL — the assertions below filter, and a filter over nothing passes', () => {
  it('the registry is populated, with a known-true and a known-false member', () => {
    const flows = getKnownFlows();
    expect(flows.map((f) => f.entity)).toContain('purchaseOrder');
    expect(flows.map((f) => f.entity)).not.toContain('__no_such_flow__');
    expect(everyState().length).toBeGreaterThan(0);
  });

  it('the derived population is reachable ABOVE the subject — it survives a broken composition', () => {
    // The rows come from `flow.states`, never from `nextActFor`. This is the
    // property §86 says to assert: mutating the composition must not empty the
    // population, or a kill and a vacuous pass look identical.
    const rows = everyState();
    expect(rows.some((r) => r.entity === 'purchaseOrder' && r.state === 'Confirmed')).toBe(true);
    expect(rows.some((r) => r.entity === 'purchaseOrder' && r.state === '__nope__')).toBe(false);
  });

  it('EVERY arm the type declares is REACHED by real data, on a real seat', () => {
    // An arm nothing reaches is untested copy. Both seats are swept because
    // `mine` and `theirs` are seat-relative and swap between them.
    const kinds = new Set<NextAct['kind']>([
      ...actsOf(BUYER).map((r) => r.act.kind),
      ...actsOf(SUPPLIER).map((r) => r.act.kind),
    ]);
    for (const k of Object.keys(NEXT_ACT_KEY) as NextAct['kind'][]) {
      expect(kinds, `arm '${k}' is unreachable — it is untested copy`).toContain(k);
    }
  });
});

describe('the two halves are composed, and neither answered this before', () => {
  it('⚠️ THE STATE THIS EXISTS FOR: a PO in Confirmed names S/4HANA, on BOTH personas', () => {
    // Before this, the buyer and the supplier both saw a status word and
    // nothing else. `userVerbsFrom` returns [] here — which is what made the
    // old instruments silent — so this is the composition's third read talking.
    expect(userVerbsFrom('purchaseOrder', 'Confirmed')).toEqual([]);
    for (const seat of [BUYER, SUPPLIER]) {
      const act = nextActFor('purchaseOrder', 'Confirmed', seat);
      expect(act.kind).toBe('external');
      expect(act.kind === 'external' && act.owners).toEqual(['s4hana']);
    }
  });

  it('a verb the seat HOLDS is `mine`; the same verb on the other seat is `theirs`', () => {
    // `po:confirm` is fulfilment's. The supplier holds it; the buyer does not,
    // and must be TOLD whose it is rather than shown a gap.
    const supplier = nextActFor('purchaseOrder', 'Sent', SUPPLIER);
    expect(supplier.kind).toBe('mine');
    const buyer = nextActFor('purchaseOrder', 'Sent', BUYER);
    expect(buyer.kind).toBe('theirs');
    expect(buyer.kind === 'theirs' && buyer.owners.length).toBeGreaterThan(0);
  });
});

describe('⚠️ RULING 1 — `settling` is OURS in flight, and is NOT `external`', () => {
  // The distinction the arm exists for: folding these into `external(owner)`
  // would name S/4HANA as the OWNER of an act PARAGON originated, inverting what
  // the owner union means (what the portal never originates).
  const settlingStates = () =>
    getKnownFlows().flatMap((f) =>
      f.transitions
        .filter((t) => (t as { sapBoundary?: boolean }).sapBoundary)
        .map((t) => ({ entity: f.entity, state: t.to, settlesTo: (t as { settlesTo?: string }).settlesTo })),
    );

  it('every SAP-boundary landing state resolves `settling`, naming what it waits for', () => {
    const rows = settlingStates();
    expect(rows.length, 'no sapBoundary edge found — population empty').toBeGreaterThan(0);
    for (const r of rows) {
      const act = nextActFor(r.entity, r.state, BUYER);
      expect(act.kind, `${r.entity}/${r.state}`).toBe('settling');
      expect(act.kind === 'settling' && act.settlesTo).toBe(r.settlesTo);
    }
  });

  it('NO settling state is reported `external` — the inversion, asserted directly', () => {
    for (const r of settlingStates()) {
      for (const seat of [BUYER, SUPPLIER]) {
        expect(nextActFor(r.entity, r.state, seat).kind).not.toBe('external');
      }
    }
  });
});

describe('⚠️ RULING 2 — a state we cannot name honestly stays UNNAMED', () => {
  it('the dead ends are `silent`, and the reason is derived, not listed', () => {
    // DERIVED: non-terminal, no surfaceable exit, no unsurfaced exit, and no
    // settlement out. The three that satisfy it today are goodsReceiptLine/
    // Quarantined and invoiceMatch's two variance states — but nothing here
    // names them, so a state that gains an exit leaves this set on its own.
    const deadEnds = getKnownFlows().flatMap((f) =>
      f.states
        .filter((s) => !f.terminals.includes(s))
        .filter((s) => f.transitions.every((t) => !t.from.includes(s)))
        .filter((s) =>
          f.transitions.every(
            (t) => !((t as { sapBoundary?: boolean }).sapBoundary && t.to === s),
          ),
        )
        .map((state) => ({ entity: f.entity, state })),
    );
    expect(deadEnds.length, 'population empty — nothing was judged').toBeGreaterThan(0);
    for (const d of deadEnds) {
      const act = nextActFor(d.entity, d.state, BUYER);
      expect(act.kind, `${d.entity}/${d.state}`).toBe('silent');
      expect(act.kind === 'silent' && act.because).toBe('no-exit');
    }
  });

  it('a `silent` arm has NO copy key — nothing can render a sentence for it', () => {
    // The ruling made structural: even a caller that wanted to say something
    // has no string to say it with.
    expect(NEXT_ACT_KEY.silent).toBeNull();
    expect(NEXT_ACT_KEY.ended).toBeNull();
  });

  it('⚠️ S2a — `settling` defers to the surface, and the SURFACES still cover it', () => {
    // The arm resolves (asserted in the ruling-1 block above) and renders
    // NOTHING, because both settling states sit on surfaces that already say
    // it better. Pinned HERE rather than left implicit: the guard that this
    // loses no information is that every settling state has a surface owning
    // an in-flight account — `grSettleRemedy.test.tsx` and
    // `BuyerInvoices.test.tsx` assert exactly ONE such sentence each, and
    // would go red the day two of them speak again.
    expect(NEXT_ACT_KEY.settling).toBeNull();
    // …and the settling POPULATION is still exactly the SAP boundaries, so
    // "both surfaces cover it" remains a claim about all of them, not most.
    const settling = getKnownFlows().flatMap((f) =>
      f.transitions
        .filter((t) => (t as { sapBoundary?: boolean }).sapBoundary)
        .map((t) => `${f.entity}/${t.to}`),
    );
    expect(settling.length, 'no settling state — the claim above is vacuous').toBeGreaterThan(0);
    expect([...new Set(settling)].sort()).toEqual([
      'goodsReceipt/Posting to SAP',
      'invoice/Releasing Payment',
    ]);
  });
});

describe('an ENDED document has nobody acting next', () => {
  it('every declared terminal is `ended`, on both seats', () => {
    const terminals = getKnownFlows().flatMap((f) =>
      f.terminals.map((state) => ({ entity: f.entity, state })),
    );
    expect(terminals.length).toBeGreaterThan(0);
    for (const t of terminals) {
      for (const seat of [BUYER, SUPPLIER]) {
        expect(nextActFor(t.entity, t.state, seat).kind, `${t.entity}/${t.state}`).toBe('ended');
      }
    }
  });

  it('`ended` never coexists with a claim that somebody acts', () => {
    for (const r of [...actsOf(BUYER), ...actsOf(SUPPLIER)]) {
      if (isTerminalState(r.entity, r.state)) expect(r.act.kind).toBe('ended');
    }
  });
});

describe('IT SAYS WHO ACTS — IT NEVER GRANTS', () => {
  it('`mine` only ever names verbs that are LEGAL from this state AND held by the seat', () => {
    // The narrow claim, asserted narrowly: every verb reported is one
    // `userVerbsFrom` already offers. It is not a permission — the dispatcher
    // still checks scope, fields and policy — but it must never name a verb the
    // machine does not allow from here.
    let checked = 0;
    for (const seat of [BUYER, SUPPLIER]) {
      for (const r of actsOf(seat)) {
        if (r.act.kind !== 'mine') continue;
        const legal = userVerbsFrom(r.entity, r.state).map((v) => v.id);
        for (const v of r.act.verbs) {
          expect(legal, `${r.entity}/${r.state}`).toContain(v.id);
          checked++;
        }
      }
    }
    expect(checked, 'no `mine` verb was examined — vacuous').toBeGreaterThan(0);
  });

  it('an unknown entity or state is `silent`, never a guess', () => {
    expect(nextActFor('__nope__', 'Whatever', BUYER)).toEqual({ kind: 'silent', because: 'no-exit' });
    expect(nextActFor('purchaseOrder', '__nope__', BUYER)).toEqual({
      kind: 'silent',
      because: 'no-exit',
    });
  });
});

describe('the copy is bilateral — an arm with no key, or a key with no arm, is red', () => {
  it('every arm that renders has a key, resolving in BOTH locales', () => {
    let rendered = 0;
    for (const [kind, key] of Object.entries(NEXT_ACT_KEY)) {
      if (key === null) continue;
      rendered++;
      expect(rolesEn[key], `${kind} EN`).toBeTruthy();
      expect(rolesId[key], `${kind} ID`).toBeTruthy();
      // A divergent token per locale: a key spelled identically in both would
      // make the render assertions unable to fail.
      expect(rolesEn[key], `${kind} EN/ID identical — untestable`).not.toBe(rolesId[key]);
    }
    expect(rendered, 'no arm renders — vacuous').toBeGreaterThan(0);
    expect(rolesEn['nextAct.label']).toBeTruthy();
    expect(rolesId['nextAct.label']).toBeTruthy();
  });

  it('no `nextAct.` key exists that no arm claims', () => {
    const claimed = new Set(Object.values(NEXT_ACT_KEY).filter(Boolean) as string[]);
    claimed.add('nextAct.label');
    const orphans = Object.keys(rolesEn)
      .filter((k) => k.startsWith('nextAct.'))
      .filter((k) => !claimed.has(k));
    expect(orphans).toEqual([]);
  });

  it('the owner order is TOTAL over `ExternalFactOwner` — a missing member vanishes silently', () => {
    const declared = Object.keys({
      s4hana: true,
      tms: true,
      bank: true,
    } satisfies Record<ExternalFactOwner, true>) as ExternalFactOwner[];
    expect([...EXTERNAL_OWNER_ORDER].sort()).toEqual([...declared].sort());
  });
});
