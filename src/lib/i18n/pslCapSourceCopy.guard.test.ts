// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// PSL · EVERY `PslCapSource` MEMBER HAS COPY IN BOTH LOCALES — R-G.
//
// ⚠️ **THIS EXISTS BECAUSE A LIVE MEMBER SHIPPED WITH NO KEY IN EITHER LOCALE
// AND EVERY TYPE-LEVEL GATE IN THIS TREE WAS BLIND TO IT.** Measured at P4's
// scope: `PslCapSource` has four members and `lib/i18n/psl.ts` carried three —
// `PORTAL_DEFAULT` was absent from `pslEn` AND `pslId`.
//
// The reason nothing caught it is the whole point of this file. The consumer is
// a TEMPLATE key:
//
//     t(`psl.detail.capSource.${cap.source}`)          PslListingsSection.tsx
//
// so `tsc` sees a `string`, not a member. `GlossaryOf<PslCapSource>` DOES force
// exhaustiveness — and it forces it over the GLOSSARY, which had all four. One
// indirection past both instruments, and the arm is reachable in the shipped
// product: the moment `t_psl_cap_set` records a portal default, every listing
// without its own override returns `PORTAL_DEFAULT`. This is
// `FORWARD-PROMISE-HAS-NO-HANDLER-01`'s shape on a union member.
//
// ── ⚠️ THE MEMBERS ARE DERIVED FROM THE UNION, NOT LISTED HERE ─────────────
//   A list would go stale the first time a fifth source is added — which is the
//   defect this file exists to catch, reintroduced inside its own guard.
//   `PSL_CAP_SOURCE_GLOSSARY` is `satisfies GlossaryOf<PslCapSource>`, so its
//   KEYS are the union, enforced by the checker at its own site. Reading them
//   here is reading the union.
//
//   ⚠️ It is NOT derived from `pslEn`'s keys — that would be asking the subject
//   whether it is complete, and every answer would be yes.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';

import { pslEn, pslId } from './psl';
import { PSL_CAP_SOURCE_GLOSSARY } from '../glossary/governance.glossary';

const MEMBERS = Object.keys(PSL_CAP_SOURCE_GLOSSARY);
const keyOf = (member: string): string => `psl.detail.capSource.${member}`;

describe('REACH — the instrument is looking at the real union', () => {
  it('⚠️ THE POPULATION IS THE UNION AND IT IS NOT EMPTY', () => {
    // `EMPTY-INPUT-REPORTS-CLEAN-01`: over an empty member list every
    // assertion below passes and the guard reports a clean tree it never read.
    expect(MEMBERS.length).toBeGreaterThan(3);
    // A named member, so a glossary that silently emptied is caught.
    expect(MEMBERS).toContain('PORTAL_DEFAULT');
    expect(MEMBERS).toContain('CEILING_BOUNDED');
  });

  it('⚠️ THE INSTRUMENT CAN FIRE — a fabricated member has no key, by the same test', () => {
    // The known-BAD half. Without it, "every member has a key" is consistent
    // with a lookup that answers yes to everything.
    expect(keyOf('NOT_A_CAP_SOURCE') in pslEn).toBe(false);
    expect(keyOf('NOT_A_CAP_SOURCE') in pslId).toBe(false);
  });
});

describe('⚠️ EVERY CAP SOURCE HAS COPY IN BOTH LOCALES', () => {
  it.each(MEMBERS)('%s is keyed in EN and in ID', (member) => {
    const key = keyOf(member);
    expect(key in pslEn, `${key} missing from pslEn`).toBe(true);
    expect(key in pslId, `${key} missing from pslId`).toBe(true);
    // Present-but-blank is the same defect wearing a key.
    expect(pslEn[key].trim().length, `${key} is blank in EN`).toBeGreaterThan(0);
    expect(pslId[key].trim().length, `${key} is blank in ID`).toBeGreaterThan(0);
  });

  it('⚠️ AND THE TWO LOCALES ARE NOT THE SAME STRING', () => {
    // `i18n-probe-needs-divergent-token`: a key spelled identically in both
    // locales makes an assertion that cannot fail. These four are prose, so
    // equality means one locale was copied and never translated.
    for (const member of MEMBERS) {
      const key = keyOf(member);
      expect(pslEn[key], `${key} is byte-identical across locales`).not.toBe(pslId[key]);
    }
  });
});
