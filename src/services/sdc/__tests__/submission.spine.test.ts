// ────────────────────────────────────────────────────────────────────────────
// SDC-2a — the P1 submission spine's pure pieces:
//   • FLAG-2 visibility gate (visibility.ts) — a SIMULATED publication is
//     NEVER supplier-visible; every current fixture publication filters OUT.
//   • SubmissionSession envelope helper (session.ts) — addendum §5: grouping +
//     audit correlation only, structurally status-less.
//   • submit payload model (submitModel.ts) — the snapshot binding is copied
//     from the rendered publication + line, never typed; uom never rides the
//     payload (invariant #2 — master-owned).
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

import {
  FORECAST_PUBLICATIONS,
  supplierVisiblePublications,
  openSubmissionSession,
  buildRequirementResponsePayload,
} from '..';
import type { ForecastPublication } from '..';

describe('FLAG-2 — supplierVisiblePublications (the publication visibility gate)', () => {
  it('every current fixture publication is SIMULATED → filters OUT (the gate holds)', () => {
    // The load-bearing assertion: there ARE publications, and a real supplier
    // may see NONE of them. The P1 governed path renders the honest empty
    // state; SIMULATED fixtures render only under explicit sample marking.
    expect(FORECAST_PUBLICATIONS.length).toBeGreaterThan(0);
    expect(supplierVisiblePublications(FORECAST_PUBLICATIONS)).toEqual([]);
  });

  it('admits ONLY liveness === LIVE — the F1 flip opens the gate with no code change', () => {
    const base = FORECAST_PUBLICATIONS[0];
    const livePub: ForecastPublication = {
      ...base,
      publicationId: 'PUB-LIVE-TEST',
      provenance: { ...base.provenance, liveness: 'LIVE' },
    };
    const visible = supplierVisiblePublications([...FORECAST_PUBLICATIONS, livePub]);
    expect(visible).toEqual([livePub]);
  });
});

describe('SubmissionSession envelope helper (addendum §5)', () => {
  it('records one attempted object and anchors the audit correlation (SDC-2 degenerate case)', () => {
    const session = openSubmissionSession('ss-9001', 'sup-002', '2026-08-25T12:00:00.000Z');
    session.attempt('RequirementResponse', 'rr-9001', 'cmd_0001');
    const env = session.envelope();
    expect(env.sessionId).toBe('ss-9001');
    expect(env.supplierId).toBe('sup-002');
    expect(env.openedAt).toBe('2026-08-25T12:00:00.000Z');
    expect(env.auditCorrelationId).toBe('cmd_0001');
    expect(env.attempted).toEqual([{ kind: 'RequirementResponse', objectId: 'rr-9001' }]);
  });

  it('SDC-3 objects join by attempting more — grouping only, first correlation anchors', () => {
    const session = openSubmissionSession('ss-9002', 'sup-005', '2026-08-25T12:00:00.000Z');
    session.attempt('RequirementResponse', 'rr-9002', 'cmd_0002');
    session.attempt('InventoryDeclaration', 'inv-9001', 'cmd_0003');
    const env = session.envelope();
    expect(env.attempted.map((a) => a.kind)).toEqual([
      'RequirementResponse',
      'InventoryDeclaration',
    ]);
    // First command's correlationId anchors. SDC-3a BUILT this seam (anchor-
    // correlationId mechanic): `causationAnchor()` hands the page that id, and
    // commands 2..n pass it as their dispatch causationId — the envelope's
    // anchor and the event grouping are the SAME id by construction. The live
    // 3-command grouping is proven in sdcObjectsCommand.test.ts.
    expect(env.auditCorrelationId).toBe('cmd_0002');
    expect(session.causationAnchor()).toBe('cmd_0002');
  });

  it('the envelope is structurally status-less (integrity invariant #9)', () => {
    const session = openSubmissionSession('ss-9003', 'sup-002', '2026-08-25T12:00:00.000Z');
    session.attempt('RequirementResponse', 'rr-9003', 'cmd_0004');
    // Exactly the SDC-0 envelope fields — no status/state/lifecycle can hide here.
    expect(Object.keys(session.envelope()).sort()).toEqual([
      'attempted',
      'auditCorrelationId',
      'openedAt',
      'sessionId',
      'supplierId',
    ]);
  });
});

describe('buildRequirementResponsePayload — the snapshot binding is structural', () => {
  // R2's sup-002 firm line — the payload keys must be COPIED from these objects.
  const pub = FORECAST_PUBLICATIONS.find((p) => p.publicationId === 'PUB-2026-08-RM-R2')!;
  const line = pub.lines.find(
    (l) => l.supplierId === 'sup-002' && l.materialCode === 'RM-EMUL-3310',
  )!;

  // LEDGER (CP-0 · 6.1 · correction 1): the draft carried `confirmedQty: '6,000'`
  // and expected 6000, annotated "comma-tolerant coercion". That token is the
  // AMBIGUOUS class exactly — 6000 under en, 6 under id — so the test asserted
  // one plausible reading of two as the correct answer, which is the guess this
  // series exists to remove. The builder no longer coerces at all (CP-0 §4), so
  // the draft now carries the number the caller already parsed.
  it('copies publicationId/planVersion/material/period from the rendered objects, supplierId from identity', () => {
    const payload = buildRequirementResponsePayload(pub, line, 'sup-002', {
      confirmedQty: 6000,
      confirmedQtyRaw: '6000',
      committedDate: '2026-08-20',
    });
    expect(payload).toEqual({
      publicationId: 'PUB-2026-08-RM-R2',
      planVersion: 'PV-2026-08.2',
      materialCode: 'RM-EMUL-3310',
      periodBucket: '2026-08',
      supplierId: 'sup-002',
      confirmedQty: 6000,
      // THE HOIST — the token rides beside the number so the TRANSITION can check
      // that they agree. `toEqual` is exact, so this assertion is also the proof
      // that the builder adds NOTHING ELSE while carrying it.
      confirmedQtyRaw: '6000',
      committedDate: '2026-08-20',
    });
  });

  // LEDGER (CP-0 · 6.1 · correction 2): '10' → 10. Mechanical — the draft field
  // is number-typed now; the assertion and its intent are untouched.
  it('never carries a uom — the master owns the unit (invariant #2)', () => {
    const payload = buildRequirementResponsePayload(pub, line, 'sup-002', {
      confirmedQty: 10,
      confirmedQtyRaw: '10',
    });
    expect('uom' in payload).toBe(false);
  });

  // LEDGER (CP-0 · 6.1 · correction 3) — THE BUG NOTARIZED AS A PASSING TEST.
  //
  // old: 'an empty qty resolves to 0 — a legal "cannot supply" short
  //       confirmation (F-2), never NaN'
  //       → buildRequirementResponsePayload(..., { confirmedQty: '' })
  //       → expect(payload.confirmedQty).toBe(0)
  //
  // why old was wrong: it conflated two different facts under one name. F-2 is
  // real — a supplier who TYPES 0 is stating "I cannot supply any of this", and
  // that binding answer must be recorded. But a supplier who typed NOTHING has
  // stated nothing, and manufacturing the strongest possible commitment out of
  // an untouched field is not F-2, it is fabrication. This test asserted the
  // fabrication as the contract, which is why the `|| 0` survived four batches.
  //
  // REPLACED (not deleted) by the two contracts that are actually true: a typed
  // zero is carried through intact, and the builder can no longer manufacture
  // one because it never sees a string. Blank refuses upstream, at the surface.
  it('a TYPED zero is carried through — the legal "cannot supply at all" short (F-2)', () => {
    const payload = buildRequirementResponsePayload(pub, line, 'sup-002', {
      confirmedQty: 0,
      confirmedQtyRaw: '0',
      rootCause: { level1: 'capacity' },
    });
    expect(payload.confirmedQty).toBe(0);
    expect(payload.rootCause).toEqual({ level1: 'capacity' });
  });

  it('is pure assembly — the number it is given is the number it ships', () => {
    // The structural guarantee: no string input, so nothing to parse, so no
    // second reading that could diverge from the gate the surface applied.
    expect(
      buildRequirementResponsePayload(pub, line, 'sup-002', {
        confirmedQty: 2400,
        confirmedQtyRaw: '2.400',
        numberConvention: 'id',
      }).confirmedQty,
    ).toBe(2400);
    expect(
      buildRequirementResponsePayload(pub, line, 'sup-002', {
        confirmedQty: 2.4,
        confirmedQtyRaw: '2.400',
        numberConvention: 'en',
      }).confirmedQty,
    ).toBe(2.4);
  });

  // ⚠️ THE BUILDER IS STILL NOT THE GUARD, AND THIS ASSERTS IT RATHER THAN
  // TRUSTING IT. The pair above ships the SAME token as two different numbers,
  // and the builder accepts both — correctly, because it is pure assembly and
  // 2.400 really does read both ways. What is new is that neither could reach
  // the store on a lie: the transition re-parses under the stated convention and
  // refuses the pairing that does not hold (`rr_submit_qty_agrees`). If a future
  // batch is tempted to make the builder check this, THIS is the reason not to —
  // a check here is one a hand-crafted dispatch skips.
  it('carries a token that DISAGREES with the number — the builder is assembly, not the guard', () => {
    const payload = buildRequirementResponsePayload(pub, line, 'sup-002', {
      confirmedQty: 999,
      confirmedQtyRaw: '6000',
    });
    expect(payload.confirmedQty).toBe(999);
    expect(payload.confirmedQtyRaw).toBe('6000');
  });

  // ⚠️ BOTH OF THESE EXIST BECAUSE THE MUTATION PROBE FOUND NOTHING WATCHING
  // THEM. Dropping the convention on the way out, and trimming the token on the
  // way out, both survived every other assertion in the batch — the first because
  // the ONE production caller passes no convention, the second because
  // `normalizeQty` trims internally so a trimmed token reads identically. Two
  // silent survivors, each a promise the prose made and nothing checked.
  it('FORWARDS a stated convention — the transition must re-parse the way the caller did', () => {
    const payload = buildRequirementResponsePayload(pub, line, 'sup-002', {
      confirmedQty: 2400,
      confirmedQtyRaw: '2.400',
      numberConvention: 'id',
    });
    expect(payload.numberConvention).toBe('id');
  });

  it('ships the token VERBATIM — padding and all, because the audit trail is the keystrokes', () => {
    // Trimming here is unobservable through the guard (normalizeQty trims), which
    // is exactly why it needs an assertion of its own: the reason not to trim is
    // that the payload is the RECORD of what the supplier typed, and a builder
    // that quietly tidies it is editing evidence.
    const payload = buildRequirementResponsePayload(pub, line, 'sup-002', {
      confirmedQty: 6000,
      confirmedQtyRaw: '  6000  ',
    });
    expect(payload.confirmedQtyRaw).toBe('  6000  ');
  });

  it('omits numberConvention when the caller had none — absence is the HINT-FREE reading', () => {
    // The supplier's confirm form is hint-free by ruling (`poConfirmModel`), so
    // its payload must carry no convention at all rather than a default one. A
    // defaulted 'id' here would silently RESOLVE ambiguity the surface refused.
    const payload = buildRequirementResponsePayload(pub, line, 'sup-002', {
      confirmedQty: 6000,
      confirmedQtyRaw: '6000',
    });
    expect('numberConvention' in payload).toBe(false);
  });

  it('omits absent optionals rather than sending empty markers', () => {
    const payload = buildRequirementResponsePayload(pub, line, 'sup-002', {
      confirmedQty: 100,
      confirmedQtyRaw: '100',
    });
    expect('committedDate' in payload).toBe(false);
    expect('capacityConstraint' in payload).toBe(false);
    expect('rootCause' in payload).toBe(false);
  });
});
