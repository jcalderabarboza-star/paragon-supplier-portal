// ────────────────────────────────────────────────────────────────────────────
// CP-0 · 2e-c-6 — the currency arc's i18n coverage sweep.
//
// Every refusal the 2e-c arc added names its cause. This file proves the naming
// survives translation, and it does so by reading the SAME maps the surface
// renders from rather than a hand-copied inventory — a checklist maintained
// beside the thing it checks is a checklist that drifts.
//
// The two halves are deliberately different guards:
//
//   · `Record<Reason, string>` in BuyerSourcing.tsx makes a reason with NO KEY a
//     compile error. That is the half a test cannot do, because a reason union
//     widening is a type event, not a runtime one.
//   · This file makes a key that RESOLVES TO NOTHING a test failure. That is the
//     half the compiler cannot do, because a typo'd key is a perfectly valid
//     string.
//
// Neither alone is sufficient, which is why the arc shipped with neither.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { resources } from '../i18n';
import {
  FX_REFUSAL_KEY,
  FX_RATE_REFUSAL_KEY,
  FX_VINTAGE_REFUSAL_KEY,
  FX_PIN_SOURCE_KEY,
  SPREAD_SILENT_KEY,
} from '../../pages-v2/BuyerSourcing';
import { rfqsEn, rfqsId } from './rfqs';

const en = resources.en.translation as Record<string, string>;
const id = resources.id.translation as Record<string, string>;

/** Every reason→key map the arc renders through, named for the failure it maps. */
const REASON_MAPS: readonly (readonly [string, Record<string, string>])[] = [
  ['comparison refusals (2e-c-3)', FX_REFUSAL_KEY],
  ['typed-rate refusals (2e-c-4)', FX_RATE_REFUSAL_KEY],
  ['typed-vintage refusals (2e-c-4)', FX_VINTAGE_REFUSAL_KEY],
  ['pin provenance (2e-c-4)', FX_PIN_SOURCE_KEY],
  ['should-cost silence (2e-c-5)', SPREAD_SILENT_KEY],
];

describe('2e-c currency arc — every named cause is translated (i18n sweep)', () => {
  for (const [label, map] of REASON_MAPS) {
    it(`${label}: every reason resolves in EN and ID`, () => {
      for (const [reason, key] of Object.entries(map)) {
        expect(en[key], `EN ${reason} → ${key}`).toBeTruthy();
        expect(id[key], `ID ${reason} → ${key}`).toBeTruthy();
      }
    });

    it(`${label}: the Indonesian string is a TRANSLATION, not the English one`, () => {
      // A copied English string passes a key-set check and reads as a bug to an
      // Indonesian buyer. Reason keys are prose, never codes, so none of these
      // has a legitimate reason to be identical.
      for (const [reason, key] of Object.entries(map)) {
        expect(id[key], `${reason} → ${key}`).not.toBe(en[key]);
      }
    });
  }

  // ── The refusals that carry a cause in their TEXT ─────────────────────────
  // These are the ones where a dropped interpolation destroys the claim rather
  // than merely reading awkwardly, so they are asserted BY NAME on top of the
  // blanket placeholder-parity guard in fragments.test.ts.
  it('FX_UNPINNED names the currencies that need a rate — in both languages', () => {
    for (const bundle of [en, id]) {
      expect(bundle[FX_REFUSAL_KEY.FX_UNPINNED]).toContain('{{currencies}}');
    }
  });

  it('FX_STALE names both the currencies AND the vintage it is judging', () => {
    // "Too old" without saying how old leaves a buyer unable to tell this
    // morning's rate from January's — the reason 2e-c-4 added `asOf` at all.
    for (const bundle of [en, id]) {
      expect(bundle[FX_REFUSAL_KEY.FX_STALE]).toContain('{{currencies}}');
      expect(bundle[FX_REFUSAL_KEY.FX_STALE]).toContain('{{asOf}}');
    }
  });

  it('the supplier-side currency refusal names the token AND the permitted set', () => {
    // 2e-c-2. "Invalid currency" tells a supplier neither what they sent nor
    // what they may send; both halves have to survive into Indonesian.
    for (const bundle of [rfqsEn, rfqsId]) {
      expect(bundle['rfqs.toast.currencyRefused.body']).toContain('{{currency}}');
      expect(bundle['rfqs.toast.currencyRefused.body']).toContain('{{permitted}}');
    }
  });

  it('the recorded basis states its VINTAGE and its SOURCE in both languages', () => {
    // A rate is not a fact on its own; a rate AS OF a date, from a stated
    // source, is. Losing either half in translation loses the audit claim.
    for (const bundle of [en, id]) {
      expect(bundle['sourcing.cmp.fx.basis.asOf']).toContain('{{date}}');
      expect(bundle['sourcing.cmp.fx.basis.none']).toBeTruthy();
    }
  });

  it('the supersede copy says the earlier rate is KEPT — the D-1 claim, in ID too', () => {
    // The whole point of a supersede label is that it does not read as an edit.
    // If the Indonesian copy said "ubah" the freeze would be invisible to half
    // the users it governs.
    expect(id['sourcing.cmp.fx.basis.supersede']).toContain('{{currency}}');
    expect(id['sourcing.fx.dialog.body.supersede']).toContain('{{currency}}');
    expect(id['sourcing.cmp.fx.basis.superseded.one']).toContain('{{count}}');
    expect(id['sourcing.cmp.fx.basis.superseded.other']).toContain('{{count}}');
  });
});
