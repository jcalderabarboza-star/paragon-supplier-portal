// ────────────────────────────────────────────────────────────────────────────
// The `intakeLine` machine (A2 / Design 1 B2) — the three verbs, their gates,
// and the two properties the surfaces are allowed to rely on.
//
// ⚠️ **EVERY DISPATCH HERE GOES THROUGH THE SHIPPED SERVICE, NOT A HARNESS.**
// The population and the gates are the real ones, so a spec cannot pass by
// agreeing with a copy of the rule it is testing.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService } from '../data/mock/MockCommandService';
import { intakeLineStore } from '../data/mock/stores/intakeLineStore';
import { purchaseRequisitionStore } from '../data/mock/stores/purchaseRequisitionStore';
import { PR_INTAKE_LINES } from '../data/mock/fixtures/prIntake';
import { getKnownFlows, getTransition } from './registry';
import { INTAKE_LINE_STATES, INTAKE_COMMIT_FIELDS } from './flows/intakeLine.flow';
import { WIRED_COMMAND_TARGETS } from '../data/mock/MockCommandService';
import { PERSONA_SYSTEM_ROLES, SYSTEM_ROLES } from './businessRoles';
import type { QueryScope } from '../data/types';
import { DataError } from '../data/types';

const svc = new MockCommandService();

const buyer: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
};
// A buyer seat that holds NO `pr:create`: `finance` is a buyer lane, so this is
// a real seat somebody can occupy rather than a synthetic empty one.
const financeOnly: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['finance'],
};
const supplier: QueryScope = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
};

// ⚠️ **A DIFFERENT LINE PER SUCCESSFUL COMMIT.** The cascade's idempotency key
// is the line id and the dispatcher's replay ledger outlives a store reset, so
// re-committing one line inside a module is answered with the first result.
// That is the mechanism, asserted deliberately in `intakeCommitIdempotency`.
const TRIMMED = 'pil-somo-002'; // 5,000 suggested / 4,500 delivered
const PLAIN = 'pil-somo-001'; // 12,000 / 12,000
const RAISED = 'pil-grid-002'; // 80,000 / 90,000
const PACK = 'pil-grid-001'; // 200,000 / 200,000

const lineOf = (id: string) => PR_INTAKE_LINES.find((l) => l.id === id)!;

const commit = (id: string, qty: number, raw?: string, reason?: string) =>
  svc.dispatch(buyer, {
    transitionId: 't_intake_commit',
    entity: 'intakeLine',
    entityId: id,
    payload: {
      acceptedQty: qty,
      acceptedQtyRaw: raw ?? String(qty),
      ...(reason !== undefined ? { overrideReason: reason } : {}),
    },
  });

const fire = (transitionId: string, id: string, scope: QueryScope = buyer) =>
  svc.dispatch(scope, { transitionId, entity: 'intakeLine', entityId: id });

beforeEach(() => {
  intakeLineStore.reset();
  purchaseRequisitionStore.reset();
});

// ── The population control runs FIRST and asserts MEMBERSHIP, never a count ──
// `EMPTY-INPUT-REPORTS-CLEAN-01`: a suite whose flow never registered would pass
// every "nothing is illegal" assertion below over an empty registry.
describe('population — the machine is registered and wired', () => {
  it('registers `intakeLine` with its three verbs', () => {
    expect(getKnownFlows().map((f) => f.entity)).toContain('intakeLine');
    for (const id of ['t_intake_dismiss', 't_intake_restore', 't_intake_commit']) {
      expect(getTransition(id)).toBeDefined();
    }
  });

  it('ships its CommandTarget in the same commit — it never joins the target-less set', () => {
    expect(WIRED_COMMAND_TARGETS).toContain('intakeLine');
    // Bilateral: the set difference that defines "authored but unwired" must
    // not contain this entity.
    const targetless = getKnownFlows()
      .map((f) => f.entity)
      .filter((e) => !WIRED_COMMAND_TARGETS.includes(e));
    expect(targetless).not.toContain('intakeLine');
    // Known-true control on the same instrument, in the same run: something IS
    // target-less, so an empty difference would be the instrument, not the tree.
    expect(targetless.length).toBeGreaterThan(0);
  });

  it('all three verbs require `pr:create`, the requisitioner lane’s atom', () => {
    for (const id of ['t_intake_dismiss', 't_intake_restore', 't_intake_commit']) {
      expect(getTransition(id)!.requiredRole).toBe('pr:create');
    }
    expect(SYSTEM_ROLES.requisitioner).toContain('pr:create');
    // And no supplier lane holds it, which is what makes this buyer-internal by
    // the MECHANISM rather than by the comment above the target.
    for (const role of PERSONA_SYSTEM_ROLES.supplier) {
      expect(SYSTEM_ROLES[role]).not.toContain('pr:create');
    }
  });
});

describe('the born state — a line exists because a producer emitted it', () => {
  it('opens Pending with no record, and there is no creation edge to mint one', () => {
    expect(intakeLineStore.get(TRIMMED)).toBeUndefined();
    expect(intakeLineStore.stateOf(TRIMMED)).toBe('Pending');
    const creations = getKnownFlows()
      .find((f) => f.entity === 'intakeLine')!
      .transitions.filter((t) => t.trigger === 'creation');
    expect(creations).toEqual([]);
  });

  it('an id no producer emitted is NOT_FOUND — the fixture is the authority', async () => {
    await expect(fire('t_intake_dismiss', 'pil-no-such-line')).rejects.toBeInstanceOf(DataError);
  });
});

describe('dismiss / restore — a decision, and its exact inverse', () => {
  it('dismiss records Dismissed; restore puts it back to Pending', async () => {
    expect((await fire('t_intake_dismiss', TRIMMED)).status).not.toBe('failed');
    expect(intakeLineStore.stateOf(TRIMMED)).toBe('Dismissed');

    expect((await fire('t_intake_restore', TRIMMED)).status).not.toBe('failed');
    expect(intakeLineStore.stateOf(TRIMMED)).toBe('Pending');
  });

  it('dismissing twice is ILLEGAL — the second press is TOLD it did nothing', async () => {
    await fire('t_intake_dismiss', TRIMMED);
    const again = await fire('t_intake_dismiss', TRIMMED);
    expect(again.status).toBe('failed');
    expect(again.reason).toMatch(/ILLEGAL_TRANSITION/);
  });

  it('restore is only reachable FROM Dismissed', async () => {
    const r = await fire('t_intake_restore', TRIMMED); // still Pending
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/ILLEGAL_TRANSITION/);
  });

  it('a dismissal records the STATE and nothing else — no invented substance', async () => {
    await fire('t_intake_dismiss', TRIMMED);
    expect(intakeLineStore.get(TRIMMED)).toEqual({ lineId: TRIMMED, state: 'Dismissed' });
  });

  it('a buyer seat without `pr:create` is refused — dismiss is a governed act now', async () => {
    const r = await fire('t_intake_dismiss', TRIMMED, financeOnly);
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/ROLE_NOT_PERMITTED/);
    expect(intakeLineStore.stateOf(TRIMMED)).toBe('Pending');
  });

  it('a supplier is denied at SCOPE, before the role gate — intake is buyer-internal', async () => {
    await expect(fire('t_intake_dismiss', TRIMMED, supplier)).rejects.toMatchObject({
      code: 'SCOPE_DENIED',
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// THE THREE HOOKS. Each is probed BOTH WAYS on the SAME line in the SAME run:
// a known-good input must pass before a known-bad refusal means anything.
// ────────────────────────────────────────────────────────────────────────────

describe('INTAKE_QTY_FLOOR — a requisition for nothing is a commitment to nothing', () => {
  it('admits the delivered quantity (the known-good control)', async () => {
    expect((await commit(PLAIN, 12_000)).status).not.toBe('failed');
  });

  it('refuses zero BY NAME, and the line stays Pending', async () => {
    const r = await commit(TRIMMED, 0, '0', 'demand withdrawn');
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/INTAKE_QTY_FLOOR/);
    expect(intakeLineStore.stateOf(TRIMMED)).toBe('Pending');
  });

  it('refuses a negative quantity and a non-finite one', async () => {
    expect((await commit(TRIMMED, -5, '-5', 'why')).reason).toMatch(/INTAKE_QTY_FLOOR/);
    expect((await commit(TRIMMED, Number.NaN, 'x', 'why')).reason).toMatch(/INTAKE_QTY_FLOOR/);
  });
});

describe('INTAKE_QTY_AGREES — the only guard that sees what the human typed', () => {
  it('admits canonical digits that re-parse to the number (known-good control)', async () => {
    expect((await commit(PACK, 200_000, '200000')).status).not.toBe('failed');
  });

  // ⚠️ **THE PROBE FIRES AT A DEFECT THE TREE REALLY SHIPPED**, not at a
  // synthetic one: this field ran `Number(e.target.value)` behind a
  // `type="number"` input, and `Number('4.500')` is `4.5` — so an Indonesian
  // buyer's 4,500 KG was minted as 4.5 KG. A floor check passes 4.5 happily.
  it('refuses the exact locale misread this field once shipped', async () => {
    const r = await commit(TRIMMED, 4.5, '4.500', 'trimmed');
    expect(r.status).toBe('failed');
    // It is caught as UNREADABLE rather than as a mismatch: '4.500' is legal
    // under both conventions with different values, so the parser refuses to
    // pick one rather than agreeing with the wrong caller.
    expect(r.reason).toMatch(/INTAKE_QTY_AGREES/);
    expect(r.reason).toMatch(/AMBIGUOUS_QTY/);
  });

  it('refuses a raw token that reads as a DIFFERENT number from the one committed', async () => {
    const r = await commit(TRIMMED, 4_500, '4200', 'trimmed');
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/INTAKE_QTY_AGREES/);
    expect(r.reason).toMatch(/4200/);
  });

  // ⚠️ **AN EMPTY RAW TOKEN NEVER REACHES THIS HOOK, AND THE SPEC SAYS SO
  // RATHER THAN ACCEPTING EITHER ANSWER.** The dispatcher's `requiredFields`
  // emptiness check refuses `''` two gates earlier, so the refusal is
  // `MISSING_FIELDS` and not a hook's. Written as an `or` this would pass
  // whichever gate happened to fire and would stop being evidence about either.
  it('an empty raw token is refused by requiredFields, BEFORE any hook runs', async () => {
    const r = await commit(TRIMMED, 0, '');
    expect(r.status).toBe('failed');
    expect(r.reason).toBe('MISSING_FIELDS:acceptedQtyRaw');
    expect(intakeLineStore.stateOf(TRIMMED)).toBe('Pending');
  });
});

describe('INTAKE_OVERRIDE_REASONED — the baseline is the PRODUCER’s delivered qty', () => {
  it('a producer-trimmed line commits its DELIVERED qty with NO reason (A1-R2)', async () => {
    expect([lineOf(TRIMMED).suggestedQty, lineOf(TRIMMED).acceptedQty]).toEqual([5_000, 4_500]);
    const r = await commit(TRIMMED, 4_500);
    expect(r.status).not.toBe('failed');
    expect(intakeLineStore.get(TRIMMED)?.overrideReason).toBeUndefined();
  });

  it('but the PLANNER leaving it is refused until they say why', async () => {
    const bare = await commit(RAISED, 85_000);
    expect(bare.status).toBe('failed');
    expect(bare.reason).toMatch(/INTAKE_OVERRIDE_REASONED/);
    // Whitespace is not a reason — the dispatcher's own emptiness check admits
    // the space bar, which is why this hook exists beside `requiredFields`.
    expect((await commit(RAISED, 85_000, '85000', '   ')).reason).toMatch(
      /INTAKE_OVERRIDE_REASONED/,
    );
    const ok = await commit(RAISED, 85_000, '85000', 'line yield revised');
    expect(ok.status).not.toBe('failed');
  });

  // The operand that moved. Committing the producer's SUGGESTION on an adjusted
  // line is the planner moving the number, and owes a reason like any other move.
  it('committing the producer’s SUGGESTION on an adjusted line is itself an override', async () => {
    const r = await commit(PACK, lineOf(RAISED).suggestedQty, '80000');
    // PACK is un-adjusted, so 80,000 is simply a different number from its
    // 200,000 baseline — the point is that the SUGGESTION has no privilege.
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/INTAKE_OVERRIDE_REASONED/);
  });

  // ⚠️ **AN UNRESOLVABLE LINE IS REFUSED, NOT WAVED THROUGH.** A gate whose
  // failure mode is to stop gating would make a missing line the one way to
  // commit any quantity with no reason.
  it('refuses when the baseline cannot be read at all', async () => {
    await expect(commit('pil-ghost', 1)).rejects.toBeInstanceOf(DataError);
  });
});

describe('the committed record — what the machine stores, and what it does not', () => {
  it('stores the quantity, the reason and the instant; derives everything else', async () => {
    await commit(RAISED, 85_000, '85000', '  line yield revised  ');
    const rec = intakeLineStore.get(RAISED)!;
    expect(rec.state).toBe('Committed');
    expect(rec.committedQty).toBe(85_000);
    expect(rec.overrideReason).toBe('line yield revised'); // trimmed at the write
    expect(typeof rec.committedAt).toBe('string');
    // NOT stored: the three values something else already determines.
    expect('wasAdjusted' in rec).toBe(false);
    expect('planState' in rec).toBe(false);
    expect('prNumber' in rec).toBe(false);
  });

  it('`Committed` is terminal — no verb on this machine leaves it', async () => {
    await commit(PLAIN, 12_000);
    for (const id of ['t_intake_commit', 't_intake_dismiss', 't_intake_restore']) {
      const r = await svc.dispatch(buyer, {
        transitionId: id,
        entity: 'intakeLine',
        entityId: PLAIN,
        payload: { acceptedQty: 12_000, acceptedQtyRaw: '12000' },
      });
      expect(r.status).toBe('failed');
      expect(r.reason).toMatch(/ILLEGAL_TRANSITION/);
    }
    expect(
      getKnownFlows().find((f) => f.entity === 'intakeLine')!.terminals,
    ).toEqual(['Committed']);
  });

  it('a dismissed line cannot be committed — triage precedes the commit', async () => {
    await fire('t_intake_dismiss', TRIMMED);
    const r = await commit(TRIMMED, 4_500);
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/ILLEGAL_TRANSITION/);
  });

  it('declares exactly the three states, and the commit’s two required fields', () => {
    expect(getKnownFlows().find((f) => f.entity === 'intakeLine')!.states).toEqual([
      ...INTAKE_LINE_STATES,
    ]);
    expect(getTransition('t_intake_commit')!.requiredFields).toEqual([...INTAKE_COMMIT_FIELDS]);
    // `overrideReason` is NOT a required field: it is owed conditionally, and
    // `requiredFields` cannot say "required when".
    expect(getTransition('t_intake_commit')!.requiredFields).not.toContain('overrideReason');
  });
});
