// ─────────────────────────────────────────────────────────────────────────────
// CP-3 · E1 — THE ENFORCEMENT VOCABULARY, PINNED.
//
// Eight claims:
//   1. THE ORDER IS THE RAMP — `rigour` / `blocks` / `tighten` all derive from
//      one array, and the derivation is asserted rather than the values.
//   2. ⚠️ THERE IS NO FOURTH MODE BELOW `OBSERVE`, and the ABSENCE is what is
//      pinned — by count, by first member, by lexicon, and over the source.
//   3. `GovernedCheckId` is closed and contains NO REFUSAL SHAPE.
//   4. ⚠️ THE BOUNDARY: the mode governs answered-and-adverse and
//      asked-and-unanswered, and NOTHING ELSE. The two refusal reasons are
//      indistinguishable in effect AT EVERY MODE — and appear in the module's
//      code exactly once each, in the census that derives them.
//   5. THE RATCHET (D-ENF-3) tightens ONE STEP past `reviewBy`, at both
//      boundaries, at ten years, and never past the ceiling.
//   6. ⚠️ ITS DETERMINISM IS PROVABLE — the same arguments give the same answer
//      while the AMBIENT CLOCK IS MOVED 79 YEARS between the two calls. That
//      test is only writable because `dispatchInstant` is an argument.
//   7. THE STAMP binds its override to its own verdict, and an override is
//      coherent at exactly one mode.
//   8. ⚠️ HEADLESS — no store, no consumer, no clock. By census over `/src/**`.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from 'vitest';

import {
  ENFORCEMENT_MODES,
  GOVERNED_CHECK_IDS,
  GOVERNED_VERDICTS,
  OVERRIDE_REASONS,
  REFUSALS_OUTSIDE_ENFORCEMENT,
  blocks,
  effectiveMode,
  isCoherentStamp,
  isEnforcementMode,
  isGovernedCheckId,
  isGovernedVerdict,
  overrideAllowed,
  rigour,
  tighten,
} from './enforcement';
import type {
  ActingPerson,
  EnforcementMode,
  EnforcementSetting,
  GovernedCheckStamp,
} from './enforcement';
import { bpomOf } from '../services/sdc/bpom';
import { halalOf } from '../services/sdc/halal';
import { MATERIAL_MASTER } from '../services/sdc/fixtures';

// ─── Fixtures local to the suite. E1 SEEDS NONE IN THE TREE ──────────────────

const PERSON: ActingPerson = { personId: 'usr-014', displayName: 'Rina Wijaya' };

/**
 * A setting, built loosely on purpose: the cast is what lets the suite build
 * the MALFORMED shapes the type forbids but a seam can still deliver at E2 —
 * a relaxation with no review date, a review date that is not a date.
 */
const setting = (
  mode: EnforcementMode,
  reviewBy: string | null | undefined,
): EnforcementSetting =>
  ({
    checkId: 'halal.certificate',
    setBy: PERSON,
    setAt: '2026-08-01T09:00:00.000Z',
    mode,
    reviewBy,
  }) as unknown as EnforcementSetting;

// Instants, all supplied — never read from a clock.
const REVIEW_BY = '2026-09-30';
const BEFORE = '2026-09-01T00:00:00.000Z';
const ON_THE_DAY = '2026-09-30T23:59:59.999Z';
const DAY_AFTER = '2026-10-01T00:00:00.000Z';
const TEN_YEARS_ON = '2036-10-01T00:00:00.000Z';

// ─── Source access, for the census assertions ────────────────────────────────

const sources = () =>
  import.meta.glob('/src/**/*.{ts,tsx}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

/** Comment lines dropped. Comments are exempt throughout: this module's header
 *  DISCUSSES the fail-open modes it refuses to declare and the stale stored
 *  clock values on main, and a census that could not tell code from record
 *  would force deleting the evidence along with the defect (H2/H3 precedent). */
const codeOf = (text: string) =>
  text
    .split('\n')
    .filter((line) => !/^\s*(?:\/\/|\/\*|\*)/.test(line))
    .join('\n');

const moduleText = () => {
  const text = sources()['/src/lib/enforcement.ts'];
  expect(text).toBeDefined();
  return text;
};

// ─── 1. The ramp ─────────────────────────────────────────────────────────────

describe('E1 — the ramp: ORDER IS RIGOUR, and everything derives from it', () => {
  it('is exactly three modes, in ascending order of rigour', () => {
    // NOT sorted before comparing. The order IS the contract; a suite that
    // sorted first would pass on a shuffled ramp.
    expect([...ENFORCEMENT_MODES]).toEqual(['OBSERVE', 'BLOCK_OVERRIDABLE', 'BLOCK']);
  });

  it('`rigour` strictly increases along the array', () => {
    const ranks = ENFORCEMENT_MODES.map(rigour);
    expect(ranks).toEqual([0, 1, 2]);
    for (let i = 1; i < ranks.length; i += 1) expect(ranks[i]).toBeGreaterThan(ranks[i - 1]);
  });

  it('`blocks` IS the index comparison — from BLOCK_OVERRIDABLE upward', () => {
    expect(blocks('OBSERVE')).toBe(false);
    expect(blocks('BLOCK_OVERRIDABLE')).toBe(true);
    expect(blocks('BLOCK')).toBe(true);
    for (const mode of ENFORCEMENT_MODES) {
      expect(blocks(mode)).toBe(rigour(mode) >= rigour('BLOCK_OVERRIDABLE'));
    }
  });

  it('`tighten` is ONE STEP UP THE ARRAY — derived, not a second table', () => {
    ENFORCEMENT_MODES.forEach((mode, i) => {
      const next = ENFORCEMENT_MODES[i + 1];
      // The last mode is the ceiling and tightens to itself; every other one
      // tightens to its immediate successor IN THIS ARRAY. Reordering the array
      // therefore reorders the ratchet, which is the single-source property.
      expect(tighten(mode)).toBe(next ?? mode);
    });
  });

  it('`BLOCK` is a FIXED POINT — the ceiling that makes the ratchet terminate', () => {
    expect(tighten('BLOCK')).toBe('BLOCK');
    expect(tighten(tighten(tighten('OBSERVE')))).toBe('BLOCK');
  });

  it('⚠️ AN UNRECOGNISED MODE FAILS CLOSED — it ranks at the CEILING, not at −1', () => {
    // It cannot arrive through the type, but it can arrive through a seam at E2
    // as a string nobody narrowed. `indexOf`'s −1 would make `blocks` return
    // FALSE, so a TYPO IN A SETTING WOULD TURN THE GATE OFF. Ranking it at full
    // rigour is the only direction that is safe to be wrong in.
    const typo = 'BLOKC' as EnforcementMode;
    expect(rigour(typo)).toBe(rigour('BLOCK'));
    expect(blocks(typo)).toBe(true);
    expect(overrideAllowed(typo)).toBe(false);
    expect(tighten(typo)).toBe(typo);
  });

  it('the narrowing boundaries answer honestly for both vocabularies', () => {
    // How a caller at E2 finds out, instead of guessing (`isBidCurrency`).
    expect(isEnforcementMode('OBSERVE')).toBe(true);
    expect(isEnforcementMode('BLOKC')).toBe(false);
    expect(isEnforcementMode('OFF')).toBe(false);
    expect(isGovernedCheckId('halal.seal')).toBe(true);
    expect(isGovernedCheckId('halal')).toBe(false);
  });

  it('an override is permitted at EXACTLY ONE mode', () => {
    expect(ENFORCEMENT_MODES.filter(overrideAllowed)).toEqual(['BLOCK_OVERRIDABLE']);
    // OBSERVE never blocked, so there is nothing to override; BLOCK is full
    // rigour, and an override there is the relaxation it exists to deny.
    expect(overrideAllowed('OBSERVE')).toBe(false);
    expect(overrideAllowed('BLOCK')).toBe(false);
  });
});

// ─── 2. The absent fourth mode ───────────────────────────────────────────────

describe('E1 — ⚠️ THE ABSENT FOURTH MODE IS THE MECHANISM, NOT A CONVENTION', () => {
  /** The fail-open lexicon: names for a mode that HIDES THE QUESTION. This is
   *  what `inferBpom` and `inferHalal` were retired for, and the reason there is
   *  no member below `OBSERVE`. */
  const FAIL_OPEN = ['OFF', 'DISABLED', 'SKIP', 'IGNORE', 'NONE', 'SILENT', 'BYPASS', 'EXEMPT'];

  it('the floor of the ramp is OBSERVE, and there are three members — not four', () => {
    expect(ENFORCEMENT_MODES).toHaveLength(3);
    expect(ENFORCEMENT_MODES[0]).toBe('OBSERVE');
  });

  it('no mode name carries the fail-open lexicon', () => {
    for (const mode of ENFORCEMENT_MODES) {
      for (const word of FAIL_OPEN) expect(mode).not.toContain(word);
    }
  });

  it('⚠️ and no such literal exists ANYWHERE in the module code', () => {
    // Declaring `'OFF'` as a fourth mode — or as an override reason, or a
    // verdict — turns this red. Comments are exempt: the header names the
    // lexicon in order to refuse it.
    const code = codeOf(moduleText());
    for (const word of FAIL_OPEN) expect(code).not.toContain(`'${word}'`);
  });

  it('the four vocabularies are FROZEN — a mode cannot be pushed on at runtime', () => {
    for (const vocab of [
      ENFORCEMENT_MODES,
      GOVERNED_CHECK_IDS,
      GOVERNED_VERDICTS,
      OVERRIDE_REASONS,
    ]) {
      expect(Object.isFrozen(vocab)).toBe(true);
    }
  });

  it('⚠️ OBSERVE IS NOT "off" — it is the weakest thing a setting can SAY', () => {
    // The floor still poses the question and still records the answer; what it
    // relaxes is the CONSEQUENCE. Both non-passing verdicts remain in its
    // domain — the mode changes what happens next, never what was asked.
    expect(blocks('OBSERVE')).toBe(false);
    expect(GOVERNED_VERDICTS.filter((v) => v !== 'PASS')).toEqual(['ADVERSE', 'UNANSWERED']);
  });
});

// ─── 3. The governed checks ──────────────────────────────────────────────────

describe('E1 — `GovernedCheckId`: closed, append-only, and refusals are not in it', () => {
  it('names exactly the three checks a mode may govern', () => {
    expect([...GOVERNED_CHECK_IDS]).toEqual([
      'halal.seal',
      'halal.certificate',
      'bpom.lot',
    ]);
  });

  it('⚠️ REFUSALS ARE NOT CHECKS — no refusal shape is a check id', () => {
    // They are not checks; they are absences. Nothing can hang a setting on
    // them, because there is no id to hang it on.
    for (const refusal of REFUSALS_OUTSIDE_ENFORCEMENT) {
      expect(GOVERNED_CHECK_IDS as readonly string[]).not.toContain(refusal);
    }
  });
});

// ─── 4. The boundary ─────────────────────────────────────────────────────────

describe('E1 — ⚠️ THE BOUNDARY: mode relaxes the CONSEQUENCE OF AN ANSWER', () => {
  it('the governed verdicts are the two non-passing shapes, plus PASS', () => {
    expect([...GOVERNED_VERDICTS]).toEqual(['PASS', 'ADVERSE', 'UNANSWERED']);
  });

  it('the refusal shapes are DERIVED from the two lookups, and there are two', () => {
    // `REFUSALS_OUTSIDE_ENFORCEMENT` is `Object.keys` of a `satisfies
    // Record<HalalRefusalReason | BpomRefusalReason, true>` census — so a third
    // refusal reason authored in `halalOf` or `bpomOf` fails the BUILD here
    // until somebody consciously places it, rather than drifting in as a verdict.
    expect([...REFUSALS_OUTSIDE_ENFORCEMENT].sort()).toEqual([
      'UNDETERMINED_APPLICABILITY',
      'UNKNOWN_MATERIAL',
    ]);
  });

  it('the two vocabularies are DISJOINT — no refusal is a governed verdict', () => {
    const verdicts = new Set<string>(GOVERNED_VERDICTS);
    expect(REFUSALS_OUTSIDE_ENFORCEMENT.filter((r) => verdicts.has(r))).toEqual([]);
  });

  it('⚠️ and the two refusals are INDISTINGUISHABLE IN EFFECT AT EVERY MODE', () => {
    // The claim in full: whatever the mode, the enforcement vocabulary can do
    // NOTHING with either refusal, and it does the same nothing with both. A
    // mode that could tell them apart would be a mode acting on an absence.
    for (const mode of ENFORCEMENT_MODES) {
      const answers = REFUSALS_OUTSIDE_ENFORCEMENT.map((reason) => ({
        mode,
        governed: isGovernedVerdict(reason),
      }));
      expect(answers).toEqual([
        { mode, governed: false },
        { mode, governed: false },
      ]);
      expect(answers[0].governed).toBe(answers[1].governed);
    }
  });

  it('`UNANSWERED` is NOT a refusal — asked-and-unanswered is inside the domain', () => {
    // The distinction the whole boundary rests on: `UNANSWERED` says the
    // question was posed and nobody answered it; a refusal says the question
    // COULD NOT BE POSED. Folding the first into the second would let a mode
    // relax an absence.
    expect(isGovernedVerdict('UNANSWERED')).toBe(true);
    expect(isGovernedVerdict('UNKNOWN_MATERIAL')).toBe(false);
    expect(isGovernedVerdict('UNDETERMINED_APPLICABILITY')).toBe(false);
  });

  it('the REAL lookups refuse with shapes this vocabulary cannot govern', () => {
    // Behavioural anchor, not a restatement: `halalOf` and `bpomOf` are driven
    // to an actual refusal and the reason they produce is checked against the
    // enforcement domain.
    const unknown = halalOf('NOT-A-MATERIAL-CODE');
    expect(unknown.ok).toBe(false);
    if (unknown.ok) return;
    expect(isGovernedVerdict(unknown.reason)).toBe(false);
    expect(REFUSALS_OUTSIDE_ENFORCEMENT).toContain(unknown.reason);

    const unknownBpom = bpomOf('NOT-A-MATERIAL-CODE');
    expect(unknownBpom.ok).toBe(false);
    if (unknownBpom.ok) return;
    expect(isGovernedVerdict(unknownBpom.reason)).toBe(false);

    // And the second refusal, off a REAL master row — 11 of the 42 are
    // `UNDETERMINED` (H1), so this is reachable through the fixture rather than
    // built for the test.
    const undetermined = Object.keys(MATERIAL_MASTER)
      .map((code) => halalOf(code))
      .find((outcome) => !outcome.ok && outcome.reason === 'UNDETERMINED_APPLICABILITY');
    expect(undetermined).toBeDefined();
    expect(isGovernedVerdict('UNDETERMINED_APPLICABILITY')).toBe(false);
  });

  it('⚠️ NO BRANCH CONSUMES A REFUSAL — each name appears in code exactly once', () => {
    // Measured, not claimed. One occurrence each, both inside the census that
    // DERIVES them. A second occurrence would be a branch somewhere deciding
    // what to do with an absence, which is the thing that may never exist.
    const code = codeOf(moduleText());
    for (const refusal of REFUSALS_OUTSIDE_ENFORCEMENT) {
      expect(code.split(refusal)).toHaveLength(2);
    }
  });
});

// ─── 5. The ratchet ──────────────────────────────────────────────────────────

describe('E1 — THE RATCHET (D-ENF-3): one step, and never past the ceiling', () => {
  it('before the review date, the mode is AS SET', () => {
    expect(effectiveMode(setting('OBSERVE', REVIEW_BY), BEFORE)).toEqual({
      mode: 'OBSERVE',
      source: 'AS_SET',
    });
  });

  it('⚠️ ON the review day it is still AS SET — the boundary, stated', () => {
    // "Past `reviewBy`" has two defensible readings and an unstated one is a
    // defect waiting for a timezone. Ruled: a review due BY the 30th is in
    // force THROUGH the 30th, to its last millisecond, and lapses on the 31st.
    expect(effectiveMode(setting('OBSERVE', REVIEW_BY), ON_THE_DAY)).toEqual({
      mode: 'OBSERVE',
      source: 'AS_SET',
    });
  });

  it('the day AFTER, it tightens ONE step and says so', () => {
    expect(effectiveMode(setting('OBSERVE', REVIEW_BY), DAY_AFTER)).toEqual({
      mode: 'BLOCK_OVERRIDABLE',
      source: 'EXPIRY_TIGHTENED',
    });
  });

  it('⚠️ ONE STEP, NOT A HARD STOP — a lapsed OBSERVE still permits an override', () => {
    // A calendar lapse must not close a dock. The tightened mode is the one
    // where a named person can still let the lot through, on the record.
    const effective = effectiveMode(setting('OBSERVE', REVIEW_BY), DAY_AFTER);
    expect(blocks(effective.mode)).toBe(true);
    expect(overrideAllowed(effective.mode)).toBe(true);
  });

  it('BLOCK_OVERRIDABLE lapses to BLOCK', () => {
    expect(effectiveMode(setting('BLOCK_OVERRIDABLE', REVIEW_BY), DAY_AFTER)).toEqual({
      mode: 'BLOCK',
      source: 'EXPIRY_TIGHTENED',
    });
  });

  it('⚠️ TEN YEARS PAST IS STILL EXACTLY ONE STEP — it is a ratchet, not a decay', () => {
    // The relaxation degrades by one notch and no further, however long it is
    // left. What it may not do is OUTLIVE THE LAST DELIBERATE DECISION ABOUT
    // IT — and at BLOCK_OVERRIDABLE it no longer does: nothing passes silently.
    expect(effectiveMode(setting('OBSERVE', REVIEW_BY), TEN_YEARS_ON)).toEqual({
      mode: 'BLOCK_OVERRIDABLE',
      source: 'EXPIRY_TIGHTENED',
    });
  });

  it('the ceiling does not tighten, and does not claim to: BLOCK reads AS_SET', () => {
    // `source` names whether the returned mode DIFFERS from the recorded one.
    // A lapsed review on a BLOCK changed nothing, so saying EXPIRY_TIGHTENED
    // would be a true-sounding statement about an event that did not occur.
    expect(effectiveMode(setting('BLOCK', REVIEW_BY), TEN_YEARS_ON)).toEqual({
      mode: 'BLOCK',
      source: 'AS_SET',
    });
  });

  it('a BLOCK with NO review date never lapses — there is nothing to renew', () => {
    expect(effectiveMode(setting('BLOCK', null), TEN_YEARS_ON)).toEqual({
      mode: 'BLOCK',
      source: 'AS_SET',
    });
  });

  it('⚠️ UNREADABLE IS LAPSED — a malformed date tightens rather than holds', () => {
    // The `isStalePin` discipline: an unparseable date is not evidence that a
    // relaxation is still current, and defaulting to "in force" would turn a
    // typo into a silent relaxation.
    for (const bad of ['soon', '30-09-2026', '2026-9-30', '2026-13-45', '']) {
      expect(effectiveMode(setting('OBSERVE', bad), BEFORE)).toEqual({
        mode: 'BLOCK_OVERRIDABLE',
        source: 'EXPIRY_TIGHTENED',
      });
    }
    expect(effectiveMode(setting('OBSERVE', REVIEW_BY), 'whenever')).toEqual({
      mode: 'BLOCK_OVERRIDABLE',
      source: 'EXPIRY_TIGHTENED',
    });
  });

  it('⚠️ and a RELAXATION THAT ARRIVES WITHOUT A REVIEW DATE is lapsed too', () => {
    // The type forbids it; this is the same rule biting AT RUNTIME, because the
    // setting comes from behind a seam at E2 and a type guarantee is only as
    // strong as the authoring on the other side. Absent on BLOCK is legal;
    // absent on a relaxation is malformed, and malformed tightens.
    for (const missing of [null, undefined]) {
      expect(effectiveMode(setting('OBSERVE', missing), BEFORE)).toEqual({
        mode: 'BLOCK_OVERRIDABLE',
        source: 'EXPIRY_TIGHTENED',
      });
      expect(effectiveMode(setting('BLOCK_OVERRIDABLE', missing), BEFORE)).toEqual({
        mode: 'BLOCK',
        source: 'EXPIRY_TIGHTENED',
      });
    }
  });

  it('every mode, lapsed, is exactly one step up — and the ceiling holds', () => {
    for (const mode of ENFORCEMENT_MODES) {
      expect(effectiveMode(setting(mode, REVIEW_BY), DAY_AFTER).mode).toBe(tighten(mode));
    }
  });

  it('`reviewBy` is REQUIRED below BLOCK — asserted over the DECLARATION', () => {
    // The type rule cannot be exercised at runtime (it is the shape that
    // refuses, at compile time) and `tsconfig` excludes test files from `tsc`,
    // so a `@ts-expect-error` here would assert nothing. The declaration itself
    // is therefore the thing measured: the relaxed arm's `reviewBy` is
    // `string`, and only the BLOCK arm's is nullable.
    const code = codeOf(moduleText());
    const relaxed = /readonly mode: RelaxedMode;[\s\S]*?readonly reviewBy: ([^;]+);/.exec(code);
    const blocking = /readonly mode: 'BLOCK';[\s\S]*?readonly reviewBy: ([^;]+);/.exec(code);
    expect(relaxed?.[1].trim()).toBe('string');
    expect(blocking?.[1].trim()).toBe('string | null');
  });
});

// ─── 6. Determinism ──────────────────────────────────────────────────────────

describe('E1 — ⚠️ THE INSTANT IS AN ARGUMENT, SO DETERMINISM IS PROVABLE', () => {
  it('the same arguments give the same answer, repeatedly', () => {
    const s = setting('OBSERVE', REVIEW_BY);
    expect(effectiveMode(s, DAY_AFTER)).toEqual(effectiveMode(s, DAY_AFTER));
  });

  it('⚠️ and the AMBIENT CLOCK MOVED 79 YEARS between calls changes nothing', () => {
    // THE TEST THE REPORT ASKS FOR. This is only writable because
    // `dispatchInstant` is an argument: a function that read `Date.now()` would
    // return a different mode on the second call, and no assertion could have
    // caught it without the two calls being identical in every other respect.
    // It is also the mechanised form of law 0.5 — the ratchet is CLOCK-DERIVED,
    // so it may never be stored and may never read the clock it derives from.
    const s = setting('OBSERVE', REVIEW_BY);
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2020-01-01T00:00:00.000Z'));
      const early = effectiveMode(s, DAY_AFTER);
      const earlyInForce = effectiveMode(s, BEFORE);
      vi.setSystemTime(new Date('2099-01-01T00:00:00.000Z'));
      const late = effectiveMode(s, DAY_AFTER);
      const lateInForce = effectiveMode(s, BEFORE);
      expect(late).toEqual(early);
      expect(lateInForce).toEqual(earlyInForce);
      // And the two differ from each other — so the pair above is not two
      // copies of one constant answer.
      expect(early).not.toEqual(earlyInForce);
    } finally {
      vi.useRealTimers();
    }
  });
});

// ─── 7. The stamp ────────────────────────────────────────────────────────────

describe('E1 — the override vocabulary', () => {
  it('is four reasons, and NO CATCH-ALL', () => {
    expect([...OVERRIDE_REASONS]).toEqual([
      'EVIDENCE_HELD_OUTSIDE_PORTAL',
      'CERTIFIER_CONFIRMED_DIRECTLY',
      'ACCEPTED_TO_QUARANTINE',
      'COMMERCIAL_RISK_ACCEPTED',
    ]);
    // One `OTHER` collapses a closed vocabulary into free text wearing an
    // enum's clothes — and a reason nobody can count is a reason nobody can
    // review.
    for (const reason of OVERRIDE_REASONS) {
      for (const catchAll of ['OTHER', 'MISC', 'GENERAL', 'UNSPECIFIED', 'N_A']) {
        expect(reason).not.toContain(catchAll);
      }
    }
  });
});

describe('E1 — the stamp: an override is coherent at exactly one mode', () => {
  const stamp = (
    mode: EnforcementMode,
    withOverride: boolean,
  ): GovernedCheckStamp => {
    const base = {
      checkId: 'halal.certificate',
      verdict: 'ADVERSE',
      mode,
      modeSource: 'AS_SET',
    } as const;
    return withOverride
      ? {
          ...base,
          override: {
            overriddenBy: PERSON,
            reason: 'ACCEPTED_TO_QUARANTINE',
            overriddenVerdict: 'ADVERSE',
          },
        }
      : base;
  };

  it('a stamp WITHOUT an override is coherent at every mode', () => {
    // ⚠️ Including OBSERVE. A stamp is written at every mode — that is the
    // whole difference between relaxing enforcement and relaxing honesty.
    for (const mode of ENFORCEMENT_MODES) expect(isCoherentStamp(stamp(mode, false))).toBe(true);
  });

  it('an override is coherent at BLOCK_OVERRIDABLE and NOWHERE ELSE', () => {
    expect(isCoherentStamp(stamp('BLOCK_OVERRIDABLE', true))).toBe(true);
    // Under OBSERVE nothing blocked, so an override would dress a relaxation as
    // a deliberate act. Under BLOCK it is the relaxation full rigour denies.
    expect(isCoherentStamp(stamp('OBSERVE', true))).toBe(false);
    expect(isCoherentStamp(stamp('BLOCK', true))).toBe(false);
    for (const mode of ENFORCEMENT_MODES) {
      expect(isCoherentStamp(stamp(mode, true))).toBe(overrideAllowed(mode));
    }
  });

  it('the override names WHO, WHY and EXACTLY WHAT it overrode', () => {
    const withOverride = stamp('BLOCK_OVERRIDABLE', true);
    expect(withOverride.override).toEqual({
      overriddenBy: { personId: 'usr-014', displayName: 'Rina Wijaya' },
      reason: 'ACCEPTED_TO_QUARANTINE',
      overriddenVerdict: 'ADVERSE',
    });
    // The verdict overridden is the verdict stamped. An override authorises the
    // overriding of ONE SPECIFIC ADVERSE ANSWER, never of the check in general
    // — and the TYPE binds the two, so a mismatch cannot be written down.
    expect(withOverride.override?.overriddenVerdict).toBe(withOverride.verdict);
  });

  it('⚠️ the stamp type binds verdict to override — asserted over the DECLARATION', () => {
    // Same reason as the `reviewBy` census: test files are outside `tsc`, so the
    // compile-time binding is measured at its source. `PASS` gets `never`;
    // every overridable verdict gets an override parameterised by ITS OWN
    // literal, through one distributive conditional.
    const code = codeOf(moduleText());
    expect(code).toContain(
      'readonly override?: V extends OverridableVerdict ? EnforcementOverride<V> : never;',
    );
    expect(code).toContain('type StampPerVerdict<V extends GovernedVerdict> = V extends GovernedVerdict');
  });
});

// ─── 8. Headless ─────────────────────────────────────────────────────────────

describe('E1 — ⚠️ HEADLESS. NO STORE, NO CONSUMER, NO CLOCK', () => {
  /** The module's exported surface, as strings, for the consumer census. */
  const SURFACE = [
    'ENFORCEMENT_MODES',
    'GOVERNED_CHECK_IDS',
    'GOVERNED_VERDICTS',
    'OVERRIDE_REASONS',
    'REFUSALS_OUTSIDE_ENFORCEMENT',
    'EnforcementSetting',
    'EnforcementMode',
    'GovernedCheckStamp',
    'effectiveMode',
    'isCoherentStamp',
    'isEnforcementMode',
    'isGovernedCheckId',
    'overrideAllowed',
  ];

  it('the enforcement surface appears in CODE in exactly ONE file — the module', () => {
    // E2 (the store) and E3 (the consumer) arrive as their own batches. A wire
    // that turns up here without them turns this red, which is the job.
    const src = sources();
    const referencing = Object.entries(src)
      .filter(([, text]) => {
        const code = codeOf(text);
        return SURFACE.some((name) => code.includes(name));
      })
      .map(([path]) => path)
      .sort();
    expect(referencing).toEqual(['/src/lib/enforcement.ts']);

    // ⚠️ THE LIMIT OF THIS CHECK, STATED — the H2/H3 precedent. Vite's
    // `import.meta.glob` EXCLUDES THE MODULE IT IS WRITTEN IN, so the scan
    // cannot see its own file, which is itself a caller. That is why the
    // expected list has one entry and not two.
    expect(src['/src/lib/enforcement.test.ts']).toBeUndefined();
  });

  it('NO CLOCK IS READ — asserted over the module source, code lines only', () => {
    const code = codeOf(moduleText());
    expect(code).not.toContain('Date.now');
    expect(code).not.toContain('new Date');
  });

  it('NO STORE, NO SEAM, NO DISPATCHER — and only two type-only imports', () => {
    const code = codeOf(moduleText());
    for (const forbidden of [
      'useDataService',
      'mockDataService',
      'COMPLIANCE_REGISTRY',
      'MockCommandService',
      'CommandTarget',
      'AuditSink',
      'QueryScope',
    ]) {
      expect(code).not.toContain(forbidden);
    }
    const imports = code.match(/^import .*$/gm) ?? [];
    expect(imports).toEqual([
      "import type { BpomRefusalReason } from '../services/sdc/bpom';",
      "import type { HalalRefusalReason } from '../services/sdc/halal';",
    ]);
    // ⚠️ Both are TYPE-ONLY and erase at build. Naming another module's refusal
    // vocabulary in a compile-time census is not acquiring a consumer: nothing
    // here calls `halalOf` or `bpomOf`.
    expect(code).not.toContain('halalOf(');
    expect(code).not.toContain('bpomOf(');
  });

  it('the GR inspection wizard is untouched by this batch', () => {
    const wizard = Object.entries(sources()).find(([p]) => p.includes('GRInspectionWizard'));
    expect(wizard).toBeDefined();
    const code = codeOf(wizard![1]);
    expect(code).not.toContain('enforcement');
    expect(code).not.toContain('effectiveMode');
    expect(code).not.toContain('GovernedCheck');
  });

  it('NO SETTING IS SEEDED — the vocabulary ships without a single value', () => {
    // `EnforcementSetting` is declared here and supplied at E2, behind the
    // seam. A fixture in this batch would be a deploy-edited constant wearing a
    // recorded act's clothes — the exact confusion Seat 3's correction removed.
    // The declarations obviously name these fields; what must not exist is a
    // VALUE assigned to one — an object literal with a seeded setting in it.
    const code = codeOf(moduleText());
    // (`mode` is excluded from the sweep: `readonly mode: 'BLOCK';` is the
    // discriminant of the union's own declaration, not a seeded value.)
    for (const field of ['checkId', 'setBy', 'setAt', 'reviewBy']) {
      expect(code).not.toMatch(new RegExp(`${field}: ['"\`]`));
    }
  });
});
