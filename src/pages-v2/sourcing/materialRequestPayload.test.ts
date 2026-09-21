// ─────────────────────────────────────────────────────────────────────────────
// R8 · THE TYPED PAYLOAD, PINNED TO THE VERB — BOTH DIRECTIONS.
//
// ⚠️ **THIS FILE EXISTS TO CLOSE THE OBJECTION THE APPLICATION LANE RAISED
// AGAINST TYPING A PAYLOAD AT ALL, RATHER THAN TO IGNORE IT.**
// `ApplicationSubmitVars.payload` is `Record<string, unknown>` on this express
// ground, quoted so it is argued with:
//
//     "a narrower type here would be a SECOND statement of what the verb
//      requires, sitting one layer above `APPLICATION_BIRTH_FIELDS` and the
//      three policy hooks, free to drift from them and **impossible to falsify
//      from either side**."
//
// The last clause is the whole objection, and it is what this file removes:
// `MaterialRequestSubmitPayload`'s REQUIRED keys are derived from the TYPE by
// the TypeScript compiler API and pinned EQUAL to
// `MATERIAL_REQUEST_BIRTH_FIELDS`, so the type and the verb are falsifiable
// from both sides and cannot drift in either direction.
//
// The type is justified by ENTRANCE COUNT, not by disagreeing with that lane:
// `useApplicationSubmit` has ONE call site, so there is nothing for a field set
// to drift between; this verb has TWO by ruling, and `t_pr_create` is what
// two-plus entrances on an untyped payload look like in this tree today.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MATERIAL_REQUEST_BIRTH_FIELDS } from '../../services/transitions/flows/materialRequest.flow';
import {
  buildMaterialRequestPayload,
  materialRequestReady,
} from './materialRequest';

const HOOKS = resolve(process.cwd(), 'src/services/query/commandHooks.ts');

/**
 * The interface's members, split by optionality, read from the SOURCE rather
 * than from a hand-written list — so this instrument reports on the type and
 * not on my memory of it.
 */
const readPayloadMembers = (): { required: string[]; optional: string[] } => {
  const sf = ts.createSourceFile(
    HOOKS,
    readFileSync(HOOKS, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const required: string[] = [];
  const optional: string[] = [];
  const walk = (n: ts.Node): void => {
    if (
      ts.isInterfaceDeclaration(n) &&
      n.name.text === 'MaterialRequestSubmitPayload'
    ) {
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

describe('REACH — the instrument found the interface', () => {
  it('⚠️ IT READ A REAL TYPE, not an empty file', () => {
    const { required, optional } = readPayloadMembers();
    // KNOWN-TRUE: the interface has members at all. Without this, every
    // set-equality below could pass over two empty arrays —
    // `EMPTY-INPUT-REPORTS-CLEAN-01` in a type reader.
    expect(required.length + optional.length).toBeGreaterThan(4);
    // KNOWN-FALSE CONTROL: a member that does not exist is not reported.
    expect([...required, ...optional]).not.toContain('materialCode');
  });
});

describe('⚠️ THE TYPE AND THE VERB CANNOT DRIFT — pinned both directions', () => {
  it('the REQUIRED keys are exactly MATERIAL_REQUEST_BIRTH_FIELDS', () => {
    const { required } = readPayloadMembers();
    expect(required).toEqual([...MATERIAL_REQUEST_BIRTH_FIELDS].sort());
  });

  it('⚠️ AND THE OPTIONAL KEYS ARE EXACTLY THE FOUR A STANDALONE REQUEST LACKS', () => {
    // These are optional BECAUSE `requiredFields` is flat and cannot say
    // "required when" — not because they are unimportant. `raisedFromRfqId`'s
    // conditional obligation lives in `MATERIALREQUEST_RFQ_RESOLVED`.
    const { optional } = readPayloadMembers();
    expect(optional).toEqual([
      'catalogReason',
      'expectedUom',
      'raisedFromRfqId',
      'specification',
    ]);
  });

  it('⚠️ AND NO REQUIRED KEY IS ABSENT FROM THE VERB, NOR VICE VERSA', () => {
    // The bilateral half stated as a set operation rather than as an equality,
    // so a failure names WHICH side gained a member.
    const { required } = readPayloadMembers();
    const verb = new Set<string>(MATERIAL_REQUEST_BIRTH_FIELDS);
    const type = new Set(required);
    expect([...type].filter((k) => !verb.has(k))).toEqual([]);
    expect([...verb].filter((k) => !type.has(k))).toEqual([]);
  });
});

describe('the builder: an absent optional is OMITTED, never sent empty', () => {
  it('a minimal input produces exactly the three required keys', () => {
    const out = buildMaterialRequestPayload({
      requestedLabel: '  Amber Dropper 30ml  ',
      category: 'Packaging',
      need: '  because  ',
    });
    expect(Object.keys(out).sort()).toEqual(['category', 'need', 'requestedLabel']);
    // And it trims, so the substance hook and the stored value agree.
    expect(out.requestedLabel).toBe('Amber Dropper 30ml');
    expect(out.need).toBe('because');
  });

  it('⚠️ `null` AND `\'\'` BOTH DROP THE KEY — they do not become values', () => {
    // `MATERIALREQUEST_RFQ_RESOLVED` returns ok on ABSENT and refuses on
    // PRESENT-and-unresolvable. Sending `''` for "no event" would be asking the
    // hook to treat a supplied value as an absence — which is the shape that
    // made `estimatedValue: 0` a stated zero one entity over.
    const out = buildMaterialRequestPayload({
      requestedLabel: 'x',
      category: 'Other',
      need: 'y',
      raisedFromRfqId: null,
      specification: '',
      expectedUom: '   ',
      catalogReason: null,
    });
    expect(Object.keys(out).sort()).toEqual(['category', 'need', 'requestedLabel']);
    expect('raisedFromRfqId' in out).toBe(false);
    expect('specification' in out).toBe(false);
    expect('expectedUom' in out).toBe(false);
    expect('catalogReason' in out).toBe(false);
  });

  it('a full input carries all seven keys', () => {
    const out = buildMaterialRequestPayload({
      requestedLabel: 'PET Bottle 100ml',
      category: 'Packaging',
      need: 'the Q1 serum line',
      catalogReason: 'AMBIGUOUS_IN_MASTER',
      raisedFromRfqId: 'rfq-001',
      specification: 'spec.pdf',
      expectedUom: 'PCS',
    });
    expect(Object.keys(out).sort()).toEqual([
      'catalogReason',
      'category',
      'expectedUom',
      'need',
      'raisedFromRfqId',
      'requestedLabel',
      'specification',
    ]);
  });

  it('⚠️ THE BUILDER VALIDATES NOTHING — that is the verb’s job', () => {
    // It will happily build a payload the dispatcher refuses. Re-checking
    // membership or substance here would be a second account of the same rules,
    // free to disagree with the hooks.
    const out = buildMaterialRequestPayload({
      requestedLabel: 'x',
      category: 'Packaging',
      need: 'y',
      // A reason the union does not contain, forced past the type.
      catalogReason: 'NOT_A_REAL_REASON' as never,
    });
    expect(out.catalogReason).toBe('NOT_A_REAL_REASON');
  });
});

describe('materialRequestReady — a COURTESY MIRROR of the verb, not the verb', () => {
  it('it mirrors the three required fields plus the substance rule', () => {
    expect(materialRequestReady({ requestedLabel: '', category: 'Other', need: 'y' })).toBe(false);
    expect(materialRequestReady({ requestedLabel: 'x', category: 'Other', need: '' })).toBe(false);
    expect(materialRequestReady({ requestedLabel: '  ', category: 'Other', need: 'y' })).toBe(false);
    expect(materialRequestReady({ requestedLabel: 'x', category: 'Other', need: '  ' })).toBe(false);
    expect(materialRequestReady({ requestedLabel: 'x', category: 'Other', need: 'y' })).toBe(true);
  });

  it('⚠️ AND THE BUILDER DOES NOT CALL IT — a caller that renders no button still meets the policy', () => {
    // Asserted structurally: the builder produces a payload for an input the
    // mirror rejects, so nothing in the dispatch path depends on the mirror.
    const notReady = { requestedLabel: '  ', category: 'Other' as const, need: '  ' };
    expect(materialRequestReady(notReady)).toBe(false);
    expect(() => buildMaterialRequestPayload(notReady)).not.toThrow();
  });
});
