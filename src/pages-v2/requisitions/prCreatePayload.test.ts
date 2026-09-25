// ─────────────────────────────────────────────────────────────────────────────
// THE `t_pr_create` PAYLOAD, PINNED TO THE VERB — and the absences kept absent.
//
// ⚠️ **THIS IS THE `materialRequestPayload.test.ts` INSTRUMENT, POINTED AT THE
// LANE THAT FILE WAS WRITTEN ABOUT.** Its header named `t_pr_create` as *"what
// two-plus entrances on an untyped payload look like in this tree today"* and
// recorded the drift as OUT OF SCOPE BY RULING. This batch is that ruling
// arriving, so the instrument is copied rather than re-invented.
//
// Two claims, and they fail independently:
//   1. the interface's REQUIRED keys are EXACTLY the verb's `requiredFields`,
//      read from source through the compiler API, in BOTH directions;
//   2. an absent optional is OMITTED from the payload, never sent as `0`,
//      `''` or `'Medium'` — because the target can only be honest about a key
//      that is not there.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getKnownFlows } from '../../services/transitions';
import { buildNewPrPayload, buildPrCreatePayload, isPriority } from './prCreatePayload';
import { SAMPLE_INTAKE_LINES } from '../plan-grid/planGridModel';

const SELF = resolve(process.cwd(), 'src/pages-v2/requisitions/prCreatePayload.ts');

/**
 * `t_pr_create`'s `requiredFields`, DERIVED FROM THE REGISTERED FLOW.
 *
 * ⚠️ Not imported as a named constant and not typed out here: the verb is the
 * authority, and reaching it through `getKnownFlows()` means a change to the
 * machine reaches this gate with nobody editing it.
 */
const verbRequiredFields = (): readonly string[] => {
  for (const flow of getKnownFlows()) {
    for (const t of flow.transitions) {
      if (t.id === 't_pr_create') return t.requiredFields ?? [];
    }
  }
  throw new Error('t_pr_create not found in any registered flow');
};

/** The interface's members split by optionality, read from SOURCE — so the
 *  instrument reports on the type rather than on my memory of it. */
const readPayloadMembers = (): { required: string[]; optional: string[] } => {
  const sf = ts.createSourceFile(SELF, readFileSync(SELF, 'utf8'), ts.ScriptTarget.Latest, true);
  const required: string[] = [];
  const optional: string[] = [];
  const walk = (n: ts.Node): void => {
    if (ts.isInterfaceDeclaration(n) && n.name.text === 'PrCreatePayload') {
      for (const m of n.members) {
        if (!ts.isPropertySignature(m) || !m.name) continue;
        const name = m.name.getText().replace(/['"]/g, '');
        if (m.questionToken) optional.push(name);
        else required.push(name);
      }
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return { required: required.sort(), optional: optional.sort() };
};

describe('REACH — both instruments found something real', () => {
  it('⚠️ the type reader read a REAL interface, not an empty file', () => {
    const { required, optional } = readPayloadMembers();
    // KNOWN-TRUE: without this, every set equality below could pass over two
    // empty arrays — `EMPTY-INPUT-REPORTS-CLEAN-01` in a type reader.
    expect(required.length + optional.length).toBeGreaterThan(8);
    expect(required).toContain('material');
    // KNOWN-FALSE: a member that does not exist is not reported.
    expect([...required, ...optional]).not.toContain('approvalLevel');
  });

  it('⚠️ the flow reader reached the registered verb', () => {
    // The registry import trap (§42b): importing `./registry` rather than
    // `./index` leaves nothing self-registered and every derivation reports
    // clean over zero flows. Membership, never a count.
    const fields = verbRequiredFields();
    expect(fields).toContain('material');
    expect(fields).toContain('quantity');
  });
});

describe("⚠️ THE TYPE AND THE VERB CANNOT DRIFT — pinned both directions", () => {
  it('the REQUIRED keys are exactly t_pr_create.requiredFields', () => {
    const { required } = readPayloadMembers();
    expect(required).toEqual([...verbRequiredFields()].sort());
  });

  it('⚠️ AND NEITHER SIDE MAY GAIN A MEMBER ALONE', () => {
    // Stated as two set differences rather than one equality, so a failure
    // names WHICH side moved.
    const { required } = readPayloadMembers();
    const verb = new Set<string>(verbRequiredFields());
    const type = new Set(required);
    expect([...type].filter((k) => !verb.has(k))).toEqual([]);
    expect([...verb].filter((k) => !type.has(k))).toEqual([]);
  });

  it('⚠️ estimatedValue and priority are OPTIONAL — the batch, as a type claim', () => {
    // If either of these ever becomes required, the New PR form cannot submit
    // and the plan grid cannot push. If either leaves the interface, the target
    // stops receiving it. Both directions matter, so both are named.
    const { optional } = readPayloadMembers();
    expect(optional).toContain('estimatedValue');
    expect(optional).toContain('priority');
  });
});

describe('the builders: an absence stays an absence', () => {
  const form = {
    material: 'Scope QA Material',
    uom: 'KG',
    date: '2026-11-30',
    costCenter: 'CC-RD-001',
    priority: 'Medium',
    justification: 'because',
  };

  it('⚠️ the New PR form sends NO estimatedValue key at all', () => {
    const out = buildNewPrPayload(form, 120);
    // `in`, not a value comparison — "absent" and "present but 0" are the two
    // states this whole batch exists to keep apart, and `=== undefined` cannot
    // tell them apart on a key that was explicitly set to undefined.
    expect('estimatedValue' in out).toBe(false);
    expect(out.quantity).toBe(120);
    expect(out.material).toBe('Scope QA Material');
  });

  it('⚠️ a priority outside the union is DROPPED, not coerced to Medium', () => {
    const out = buildNewPrPayload({ ...form, priority: 'Urgent' }, 5);
    expect('priority' in out).toBe(false);
    expect(isPriority('Urgent')).toBe(false);
    expect(isPriority('High')).toBe(true);
  });

  it('a chosen priority rides through unchanged', () => {
    expect(buildNewPrPayload({ ...form, priority: 'High' }, 5).priority).toBe('High');
  });

  it('⚠️ the intake builder sends NO priority key — the other half of the class', () => {
    const line = SAMPLE_INTAKE_LINES[0];
    const out = buildPrCreatePayload(line, line.suggestedQty, '');
    expect('priority' in out).toBe(false);
    expect('costCenter' in out).toBe(false);
    // …and it still supplies what it always supplied, so this is a statement
    // about absences and not about the builder having been thinned.
    expect(out.estimatedValue).toBe(line.estimatedValue);
    expect(out.source).toBe(line.source);
  });

  it('a typed zero is PRESERVED — emptiness is the defect, not zero', () => {
    const line = SAMPLE_INTAKE_LINES[0];
    const zeroed = { ...line, estimatedValue: 0 };
    const out = buildPrCreatePayload(zeroed, zeroed.suggestedQty, '');
    expect('estimatedValue' in out).toBe(true);
    expect(out.estimatedValue).toBe(0);
  });
});
