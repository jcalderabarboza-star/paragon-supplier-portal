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

  it('copies publicationId/planVersion/material/period from the rendered objects, supplierId from identity', () => {
    const payload = buildRequirementResponsePayload(pub, line, 'sup-002', {
      confirmedQty: '6,000',
      committedDate: '2026-08-20',
    });
    expect(payload).toEqual({
      publicationId: 'PUB-2026-08-RM-R2',
      planVersion: 'PV-2026-08.2',
      materialCode: 'RM-EMUL-3310',
      periodBucket: '2026-08',
      supplierId: 'sup-002',
      confirmedQty: 6000, // comma-tolerant coercion
      committedDate: '2026-08-20',
    });
  });

  it('never carries a uom — the master owns the unit (invariant #2)', () => {
    const payload = buildRequirementResponsePayload(pub, line, 'sup-002', {
      confirmedQty: '10',
    });
    expect('uom' in payload).toBe(false);
  });

  it('an empty qty resolves to 0 — a legal "cannot supply" short confirmation (F-2), never NaN', () => {
    const payload = buildRequirementResponsePayload(pub, line, 'sup-002', {
      confirmedQty: '',
      rootCause: { level1: 'capacity' },
    });
    expect(payload.confirmedQty).toBe(0);
    expect(payload.rootCause).toEqual({ level1: 'capacity' });
  });

  it('omits absent optionals rather than sending empty markers', () => {
    const payload = buildRequirementResponsePayload(pub, line, 'sup-002', {
      confirmedQty: '100',
    });
    expect('committedDate' in payload).toBe(false);
    expect('capacityConstraint' in payload).toBe(false);
    expect('rootCause' in payload).toBe(false);
  });
});
