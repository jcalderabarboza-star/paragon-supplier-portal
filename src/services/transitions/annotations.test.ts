import { describe, it, expect } from 'vitest';
import { getKnownFlows } from './index';
import type { FlowDefinition } from './schema';
import {
  ENTITY_PURPOSE,
  TRANSITION_PURPOSE,
  entityPurposeKey,
  transitionPurposeKey,
} from './annotations';
import { processFlowPurposeEn, processFlowPurposeId } from '../../lib/i18n/processFlowPurpose';
import { resources } from '../../lib/i18n';

// ─────────────────────────────────────────────────────────────────────────────
// PF-2 · THE BILATERAL PIN — the point of the batch, not the prose.
//
// ⚠️ **AUTHORED PROSE IS THE ONE THING ON THE PROCESS FLOWS PAGE THAT NOTHING
// DERIVES, SO IT IS THE ONE THING THAT CAN DRIFT.** Every other column is read
// off the registry at runtime and cannot disagree with it. A sentence can — and
// the drift is invisible, because nothing compares a sentence to a schema.
//
// This file is that comparison, and it runs in FOUR directions:
//
//   1. registry → annotation   a verb with no purpose is RED
//   2. annotation → registry   a purpose naming no live verb is RED
//   3. annotation → i18n       a key with no EN+ID string is RED
//   4. i18n → annotation       a string no annotation names is RED
//
// Direction 2 and 4 are the ones nothing normally checks, and they are the ones
// that rot: a sentence about a deleted verb reads exactly like a sentence about
// a live one (`CENSUS-DERIVE-BILATERAL-01`, `C9-STALE-BY-FIX-01`).
//
// Plus the rule that keeps the prose honest — NO PURPOSE RESTATES A MACHINE
// FACT — held over both languages at the bottom of this file.
// ─────────────────────────────────────────────────────────────────────────────

const FLOWS = getKnownFlows();
const ALL_TRANSITIONS = FLOWS.flatMap((f) => f.transitions);

describe('PF-2 · purpose annotations — the transition pin, both ways', () => {
  it('EVERY registered transition has an annotation (registry → annotation)', () => {
    const unannotated = ALL_TRANSITIONS.filter((t) => !(t.id in TRANSITION_PURPOSE)).map(
      (t) => t.id,
    );
    expect(unannotated, 'verbs shipping with no stated purpose').toEqual([]);
  });

  it('EVERY annotation names a LIVE transition (annotation → registry)', () => {
    const live = new Set(ALL_TRANSITIONS.map((t) => t.id));
    const orphans = Object.keys(TRANSITION_PURPOSE).filter((id) => !live.has(id));
    expect(orphans, 'purposes describing verbs the registry does not have').toEqual([]);
  });

  // The counts are DERIVED on both sides — never a number typed here. Stated as
  // an equality so a simultaneous add-and-delete cannot pass the two directions
  // above by accident.
  it('the annotation set and the registry are the same size', () => {
    expect(Object.keys(TRANSITION_PURPOSE)).toHaveLength(ALL_TRANSITIONS.length);
  });
});

describe('PF-2 · purpose annotations — the entity pin, both ways', () => {
  it('EVERY registered flow has an annotation (registry → annotation)', () => {
    const unannotated = FLOWS.filter((f) => !(f.entity in ENTITY_PURPOSE)).map((f) => f.entity);
    expect(unannotated, 'machines shipping with no stated purpose').toEqual([]);
  });

  it('EVERY annotation names a LIVE flow (annotation → registry)', () => {
    const live = new Set(FLOWS.map((f) => f.entity));
    const orphans = Object.keys(ENTITY_PURPOSE).filter((e) => !live.has(e));
    expect(orphans, 'purposes describing machines the registry does not have').toEqual([]);
  });

  it('the annotation set and the registry are the same size', () => {
    expect(Object.keys(ENTITY_PURPOSE)).toHaveLength(FLOWS.length);
  });
});

describe('PF-2 · the key is written out, and it follows the convention', () => {
  // The map is hand-written on purpose (no concatenation — see the module
  // header), so this asserts the hand-written key is the one the convention
  // predicts. It catches the typo a computed key could never have made, WITHOUT
  // reintroducing the computed lookup that would hide a missing translation.
  it('every transition key is `processFlows.purpose.<id>`', () => {
    for (const [id, ann] of Object.entries(TRANSITION_PURPOSE)) {
      expect(ann.purposeKey, id).toBe(`processFlows.purpose.${id}`);
    }
  });

  it('every entity key is `processFlows.purpose.entity.<entity>`', () => {
    for (const [entity, ann] of Object.entries(ENTITY_PURPOSE)) {
      expect(ann.purposeKey, entity).toBe(`processFlows.purpose.entity.${entity}`);
    }
  });

  it('lookups answer null — never a fabricated key — for anything unregistered', () => {
    expect(transitionPurposeKey('t_not_a_verb')).toBeNull();
    expect(entityPurposeKey('notAMachine')).toBeNull();
  });
});

describe('PF-2 · the i18n pin, both ways (MARKER-I18N-HOLE-01)', () => {
  const annotationKeys = [
    ...Object.values(TRANSITION_PURPOSE),
    ...Object.values(ENTITY_PURPOSE),
  ].map((a) => a.purposeKey);

  it('every annotation key has a NON-EMPTY string in BOTH languages', () => {
    for (const key of annotationKeys) {
      expect(processFlowPurposeEn[key], `en ${key}`).toBeTruthy();
      expect(processFlowPurposeId[key], `id ${key}`).toBeTruthy();
    }
  });

  it('every string in the fragment is named by an annotation (no orphan prose)', () => {
    const named = new Set(annotationKeys);
    const orphans = Object.keys(processFlowPurposeEn).filter((k) => !named.has(k));
    expect(orphans, 'prose about something no annotation points at').toEqual([]);
  });

  it('every annotation key is wired into the runtime resources, both locales', () => {
    const en = resources.en.translation as Record<string, string>;
    const id = resources.id.translation as Record<string, string>;
    for (const key of annotationKeys) {
      expect(en[key], `en resources ${key}`).toBeDefined();
      expect(id[key], `id resources ${key}`).toBeDefined();
    }
  });

  // Purpose prose is the class MARKER-I18N-HOLE-01 names: hand-authored, late,
  // and invisible to a sweep that only looks at today's keys. A copied English
  // string would satisfy every check above.
  it('no purpose is the English string copied into Indonesian', () => {
    const copied = Object.keys(processFlowPurposeEn).filter(
      (k) => processFlowPurposeId[k] === processFlowPurposeEn[k],
    );
    expect(copied, 'untranslated purposes').toEqual([]);
  });

  // Purpose carries no interpolation by design — a sentence with a hole in it is
  // a sentence assembled at render time, and the assembled halves are what drift
  // apart between languages. Pinned so nobody adds one without a decision.
  it('no purpose interpolates a variable', () => {
    for (const [k, v] of Object.entries({ ...processFlowPurposeEn, ...processFlowPurposeId })) {
      expect(v.includes('{{'), k).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ AUTHORED PROSE NEVER RESTATES A MACHINE FACT.
//
// `t_gr_hold moves a receipt from Under Inspection to Quality Hold` restates two
// states the diagram already draws, and it is wrong the day either is renamed.
// **A SENTENCE THAT NEVER CONTAINS THE NUMBER CANNOT DRIFT FROM IT**
// (FLOOR-IN-PROSE-01 generalised).
//
// THE LIMIT, RECORDED: this catches the LITERAL restatement, not a paraphrase.
// A test that judged paraphrase would be judging prose and would go red on
// wording somebody improved — which trains people to edit the test. The literal
// form is the drift-prone one anyway: it is the form that names a token a
// rename invalidates.
// ─────────────────────────────────────────────────────────────────────────────
const TRIGGER_WORDS = ['user', 'system', 'cascade', 'creation'];

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Every machine token the page renders BESIDE this flow's prose. */
function machineTokensOf(flow: FlowDefinition): readonly string[] {
  const tokens = new Set<string>([flow.entity, flow.initial, ...flow.states, ...flow.terminals]);
  for (const t of flow.transitions) {
    tokens.add(t.id);
    tokens.add(t.requiredRole);
    for (const f of t.requiredFields) tokens.add(f);
    for (const h of t.policyHooks) tokens.add(h);
    if (t.settlesTo) tokens.add(t.settlesTo);
  }
  for (const w of TRIGGER_WORDS) tokens.add(w);
  return [...tokens];
}

/**
 * Which tokens a sentence restates. A MULTI-WORD state (`Quality Hold`) is
 * matched as a phrase — splitting it into words would forbid `hold` and `quality`
 * separately, which is a different and much stronger rule than the one ruled.
 * A single-word token is matched on word boundaries, so `dispute` is fine while
 * `Disputed` is not: the state name is the thing a rename invalidates.
 */
function restated(text: string, tokens: readonly string[]): string[] {
  const lower = text.toLowerCase();
  return tokens.filter((token) => {
    const t = token.toLowerCase();
    return /\s/.test(t)
      ? lower.includes(t)
      : new RegExp(`\\b${escapeRe(t)}\\b`).test(lower);
  });
}

describe('PF-2 · no purpose restates a machine fact (EN and ID)', () => {
  for (const flow of FLOWS) {
    const tokens = machineTokensOf(flow);

    it(`${flow.entity}: the machine's own purpose names no machine token`, () => {
      const key = entityPurposeKey(flow.entity);
      expect(key, `${flow.entity} has no purpose key`).not.toBeNull();
      for (const [lang, bundle] of [
        ['en', processFlowPurposeEn],
        ['id', processFlowPurposeId],
      ] as const) {
        expect(restated(bundle[key as string] ?? '', tokens), `${lang} ${key}`).toEqual([]);
      }
    });

    for (const t of flow.transitions) {
      it(`${t.id}: its purpose names no machine token`, () => {
        const key = transitionPurposeKey(t.id);
        expect(key, `${t.id} has no purpose key`).not.toBeNull();
        for (const [lang, bundle] of [
          ['en', processFlowPurposeEn],
          ['id', processFlowPurposeId],
        ] as const) {
          expect(restated(bundle[key as string] ?? '', tokens), `${lang} ${key}`).toEqual([]);
        }
      });
    }
  }
});
