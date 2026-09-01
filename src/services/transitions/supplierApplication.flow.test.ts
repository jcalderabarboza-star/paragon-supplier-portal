// ────────────────────────────────────────────────────────────────────────────
// B1 · THE supplierApplication MACHINE — structure, atoms, and the two things
// it deliberately does NOT have.
//
// This file is about the SHAPE. `supplierApplicationCommand.test.ts` is about
// what happens when the verbs fire; keeping them apart means a red here names a
// machine defect and a red there names a behaviour defect, rather than both
// failing as one unreadable assertion.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

import {
  getFlow,
  getTransition,
  getKnownFlows,
  validateFlow,
  catalogRoles,
  personaCan,
  supplierApplicationFlow,
  AUTOMATION_ATOMS,
  SYSTEM_ROLES,
  PERSONA_SYSTEM_ROLES,
  rolesHolding,
  CASCADES,
} from './index';
import { WIRED_COMMAND_TARGETS } from '../data/mock/MockCommandService';
import {
  APPLICATION_REQUEST_TYPES,
  APPLICATION_DECLARATION_KINDS,
  VENDOR_BEARING_REQUEST_TYPE,
  isApplicationRequestType,
  isApplicationDeclaration,
} from './flows/supplierApplication.flow';

const VERBS = [
  't_application_submit',
  't_application_start_review',
  't_application_approve',
  't_application_reject',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// THE POPULATION GUARD RUNS FIRST AND ASSERTS MEMBERSHIP, NEVER A COUNT
// (§42b, `EMPTY-INPUT-REPORTS-CLEAN-01`). Almost every assertion below is of
// the form "no verb is X" / "nothing names Y" — the exact shape that passes
// vacuously over an unregistered flow.
// ─────────────────────────────────────────────────────────────────────────────
describe('POPULATION GUARD — the machine is loaded', () => {
  it('a known-GOOD flow is registered and a known-BAD one is absent', () => {
    const entities = getKnownFlows().map((f) => f.entity);
    expect(entities).toContain('supplierApplication');
    expect(entities).toContain('purchaseOrder');
    expect(entities).not.toContain('supplierApplications');
    expect(getFlow('supplierApplication')).toBe(supplierApplicationFlow);
  });

  it('every verb this file speaks for resolves, and a near-miss does not', () => {
    for (const id of VERBS) expect(getTransition(id), id).toBeTruthy();
    expect(getTransition('t_application_decide')).toBeUndefined();
    expect(getTransition('t_application_start')).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('the machine is structurally valid, and shaped as ruled', () => {
  it('validates, and declares exactly the four states', () => {
    expect(validateFlow(supplierApplicationFlow)).toEqual({ ok: true, errors: [] });
    expect([...supplierApplicationFlow.states]).toEqual([
      'Submitted',
      'Under Review',
      'Approved',
      'Rejected',
    ]);
    expect(supplierApplicationFlow.initial).toBe('Submitted');
  });

  it('⚠️ NO Draft STATE — the wizard is the draft, and a draft is not a fact', () => {
    // Ruled: a half-filled form is not an event, so there is no row for it and
    // no reviewer can be shown somebody's abandoned typing.
    expect(supplierApplicationFlow.states).not.toContain('Draft');
    for (const t of supplierApplicationFlow.transitions) expect(t.to).not.toBe('Draft');
  });

  it('ONE birth, empty-from, landing on the declared initial', () => {
    const births = supplierApplicationFlow.transitions.filter(
      (t) => t.trigger === 'creation',
    );
    expect(births.map((t) => t.id)).toEqual(['t_application_submit']);
    expect(births[0].from).toEqual([]);
    expect(births[0].to).toBe(supplierApplicationFlow.initial);
    // Every other edge names a declared from-state.
    for (const t of supplierApplicationFlow.transitions.filter(
      (t) => t.trigger !== 'creation',
    )) {
      expect(t.from.length, t.id).toBeGreaterThan(0);
      for (const s of t.from) expect(supplierApplicationFlow.states).toContain(s);
    }
  });

  it('⚠️ BOTH ENDINGS ARE TERMINAL, and nothing leaves either of them', () => {
    expect([...supplierApplicationFlow.terminals]).toEqual(['Approved', 'Rejected']);
    for (const t of supplierApplicationFlow.transitions) {
      expect(t.from, `${t.id} leaves a terminal`).not.toContain('Approved');
      expect(t.from, `${t.id} leaves a terminal`).not.toContain('Rejected');
    }
  });

  it('no clock projection is a state (law 0.5), and no trigger is a clock', () => {
    for (const projected of ['Expired', 'Expiring', 'Overdue', 'Lapsed', 'Stale']) {
      expect(supplierApplicationFlow.states).not.toContain(projected);
    }
    for (const t of supplierApplicationFlow.transitions) {
      expect(['user', 'system', 'cascade', 'creation'], t.id).toContain(t.trigger);
    }
  });

  it('every verb is surfaced — a queue nobody can see is the dead-end shape', () => {
    for (const id of VERBS) expect(getTransition(id)!.surfaceable.surfaced, id).toBe(true);
  });

  it('emits no cascade and is named by none — B4 is PARKED, not half-built', () => {
    // Approval records a DECISION. Minting a supplier is S/4HANA's act (C10 §1),
    // so there is no fan-out here and nothing fans out INTO here.
    const allTargets = Object.values(CASCADES).flat().map((l) => l.targetTransitionId);
    for (const id of VERBS) {
      expect(CASCADES[id] ?? [], `${id} emits a cascade`).toEqual([]);
      expect(allTargets, `${id} is a cascade target`).not.toContain(id);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE ATOMS ARE BUYER-SIDE, AND THE ATOM IS THE MECHANISM', () => {
  const ATOMS = ['application:submit', 'application:review', 'application:decide'];

  it('all three are in the catalog (the bilateral bundle gate needs them there)', () => {
    const catalog = catalogRoles();
    for (const a of ATOMS) expect(catalog, a).toContain(a);
    // The verbs require exactly these and nothing else.
    expect(VERBS.map((id) => getTransition(id)!.requiredRole)).toEqual([
      'application:submit',
      'application:review',
      'application:decide',
      'application:decide',
    ]);
  });

  it('NO SUPPLIER SEAT CAN HOLD ONE — the tenancy answer, derived both ways', () => {
    for (const a of ATOMS) {
      expect(personaCan('supplier', a), a).toBe(false);
      expect(personaCan('buyer', a), a).toBe(true);
    }
    // And not through a supplier lane by another route: no supplier-side role
    // names any of them.
    for (const role of PERSONA_SYSTEM_ROLES.supplier) {
      for (const a of ATOMS) {
        expect(SYSTEM_ROLES[role] as readonly string[], `${role} holds ${a}`).not.toContain(a);
      }
    }
  });

  it('⚠️ NOT IN THE AUTOMATION GRANT — no machine decides who supplies Paragon', () => {
    for (const a of ATOMS) {
      expect(AUTOMATION_ATOMS as readonly string[], a).not.toContain(a);
    }
  });

  it('⚠️ SEGREGATION — raising and deciding are held by DIFFERENT lanes', () => {
    // `procurement` raises; `compliance` reviews and decides. Derived from the
    // bundles rather than restated: `rolesHolding` excludes the supersets, so
    // this is about OWNERS and not about `admin` being able to do everything.
    expect(rolesHolding('application:submit')).toEqual(['procurement']);
    expect(rolesHolding('application:review')).toEqual(['compliance']);
    expect(rolesHolding('application:decide')).toEqual(['compliance']);

    // The load-bearing half, stated as an intersection so a later edit that
    // widens either lane reddens here: NO lane holds both ends.
    const raise = new Set(rolesHolding('application:submit'));
    const decide = new Set(rolesHolding('application:decide'));
    expect([...raise].filter((r) => decide.has(r))).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ IT MINTS NO SIXTH VERIFICATION VOCABULARY (ruling e)', () => {
  it('the declared documents are SUBJECTS, and carry no status vocabulary', () => {
    expect([...APPLICATION_DECLARATION_KINDS]).toEqual(['npwp', 'nib', 'halal', 'iso']);
    // The words a verification vocabulary would need. None of them is a state
    // of this machine, and none is a field any verb requires.
    const VERIFICATION_WORDS = ['Valid', 'Verified', 'Missing', 'Expiring Soon', 'Expired'];
    for (const w of VERIFICATION_WORDS) {
      expect(supplierApplicationFlow.states, w).not.toContain(w);
    }
    const fields = supplierApplicationFlow.transitions.flatMap((t) => [...t.requiredFields]);
    for (const f of fields) {
      expect(f.toLowerCase(), f).not.toMatch(/verif|valid|expir/);
    }
  });

  it('verification stays in the lane that owns it, and that lane is wired', () => {
    // The contrast is the point: `supplierdoc:verify` exists, is held, and its
    // target dispatches. Nothing here duplicates it.
    expect(catalogRoles()).toContain('supplierdoc:verify');
    expect(WIRED_COMMAND_TARGETS).toContain('supplierDocument');
    expect(catalogRoles().filter((a) => a.startsWith('application:'))).toEqual([
      'application:decide',
      'application:review',
      'application:submit',
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('the closed vocabularies, probed in BOTH directions', () => {
  it('request types: the three pass, and near-misses do not', () => {
    expect([...APPLICATION_REQUEST_TYPES]).toEqual(['External SR', 'Internal SR', 'KOL']);
    for (const t of APPLICATION_REQUEST_TYPES) expect(isApplicationRequestType(t), t).toBe(true);
    for (const bad of ['external sr', 'EXTERNAL SR', 'Internal', 'SR', '', null, 7, undefined]) {
      expect(isApplicationRequestType(bad), String(bad)).toBe(false);
    }
    expect(VENDOR_BEARING_REQUEST_TYPE).toBe('Internal SR');
    expect(APPLICATION_REQUEST_TYPES).toContain(VENDOR_BEARING_REQUEST_TYPE);
  });

  it('declarations: a good one passes BEFORE a bad one is believed to fail', () => {
    // Rule 4 — assert a known-GOOD input passes first. A predicate that
    // rejected everything would look exactly like a working guard otherwise.
    expect(isApplicationDeclaration({ kind: 'halal', reference: 'MUI-1' })).toBe(true);
    expect(isApplicationDeclaration({ kind: 'npwp', reference: ' 01.234 ' })).toBe(true);
    for (const bad of [
      { kind: 'coa', reference: 'X' },          // unknown subject
      { kind: 'halal', reference: '   ' },      // blank, which `isEmpty` admits
      { kind: 'halal', reference: '' },
      { kind: 'halal' },                        // absent reference
      { reference: 'X' },                       // absent subject
      { kind: 'halal', reference: 7 },
      null,
      'halal',
      [],
    ]) {
      expect(isApplicationDeclaration(bad), JSON.stringify(bad)).toBe(false);
    }
  });
});
