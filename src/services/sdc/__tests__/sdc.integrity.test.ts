// ─────────────────────────────────────────────────────────────────────────────
// SDC-0 integrity suite — the batch's verification (tsc + these green; no browser).
//
// Encodes the §B5 invariant suite adjudicated for SDC-0. The fixtures typecheck
// as instances of the SDC-0 types (compile-time); these tests enforce the
// data-level invariants the types can't express. Written against the CANON, not
// the current fixtures — they must stay green as SDC-1 grows fixture depth.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  MATERIAL_MASTER,
  FORECAST_PUBLICATIONS,
  REQUIREMENT_RESPONSES,
  INVENTORY_DECLARATIONS,
  INCOMING_SHIPMENTS,
  SUBMISSION_SESSIONS,
  SUPPLIER_MATERIAL_RELATIONSHIPS,
} from '../fixtures';
import type {
  CommitmentClass,
  ForecastLine,
  ShipmentDirection,
  ShipmentLifecycle,
  Uom,
} from '../types';

// Flatten every forecast line once for the line-level invariants.
const ALL_LINES: readonly ForecastLine[] = FORECAST_PUBLICATIONS.flatMap((p) => p.lines);

// Every qty-bearing record, normalised to { materialCode, uom } for invariant #2.
// An acknowledgment response carries NO qty (that's its point — invariant #11),
// so only commitment responses appear here.
const QTY_BEARING: ReadonlyArray<{ where: string; materialCode: string; uom: Uom }> = [
  ...ALL_LINES.map((l) => ({ where: `ForecastLine ${l.materialCode}/${l.periodBucket}`, materialCode: l.materialCode, uom: l.uom })),
  ...REQUIREMENT_RESPONSES.filter((r) => r.forecastConfirmation).map((r) => ({ where: `RequirementResponse ${r.id}`, materialCode: r.materialCode, uom: r.forecastConfirmation!.uom })),
  ...INVENTORY_DECLARATIONS.flatMap((d) => d.batches.map((b) => ({ where: `InventoryDeclaration ${d.id}/${b.batchNumber}`, materialCode: d.materialCode, uom: b.uom }))),
  ...INCOMING_SHIPMENTS.map((s) => ({ where: `IncomingShipment ${s.id}`, materialCode: s.materialCode, uom: s.uom })),
];

const UOMS: readonly Uom[] = ['KG', 'PCS', 'L', 'ROLL'];
const COMMITMENT_CLASSES: readonly CommitmentClass[] = ['firm', 'semi-firm', 'visibility-only'];
const DIRECTIONS: readonly ShipmentDirection[] = ['principal-to-distributor', 'to-paragon'];
const LIFECYCLES: readonly ShipmentLifecycle[] = ['Booked', 'Shipped', 'Arrived', 'Cancelled'];

describe('SDC-0 fixture depth (P2-shaped, ruling §4)', () => {
  it('fans ≥1 material×period to multiple suppliers', () => {
    const byGroup = new Map<string, Set<string>>();
    for (const l of ALL_LINES) {
      const k = `${l.materialCode}|${l.periodBucket}`;
      (byGroup.get(k) ?? byGroup.set(k, new Set()).get(k)!).add(l.supplierId);
    }
    expect([...byGroup.values()].some((s) => s.size >= 2)).toBe(true);
  });

  it('carries ≥1 line of each commitmentClass', () => {
    for (const c of COMMITMENT_CLASSES) {
      expect(ALL_LINES.some((l) => l.commitmentClass === c)).toBe(true);
    }
  });

  it('carries ≥1 distributor with a principal + ≥1 shipment of each direction', () => {
    expect(
      SUPPLIER_MATERIAL_RELATIONSHIPS.some(
        (r) => r.supplierType === 'distributor' && (r.principals?.length ?? 0) >= 1,
      ),
    ).toBe(true);
    for (const d of DIRECTIONS) {
      expect(INCOMING_SHIPMENTS.some((s) => s.direction === d)).toBe(true);
    }
  });
});

describe('Invariant #2 — uom on every qty field keys off the material master', () => {
  it('every material referenced exists in the master', () => {
    for (const q of QTY_BEARING) {
      expect(MATERIAL_MASTER[q.materialCode], `${q.where}: unknown material`).toBeDefined();
    }
  });

  it('every qty uom equals its material canonical uom (not merely present)', () => {
    for (const q of QTY_BEARING) {
      expect(UOMS).toContain(q.uom);
      expect(q.uom, `${q.where}: uom conflicts with master`).toBe(
        MATERIAL_MASTER[q.materialCode].canonicalUom,
      );
    }
  });
});

describe('Invariant #3 — firm ⇒ approved split (the ⭐ allocation fix)', () => {
  it('every firm-period line carries allocation.approvedBy + approvedAt', () => {
    for (const l of ALL_LINES.filter((x) => x.commitmentClass === 'firm')) {
      expect(l.allocation.approvedBy, `${l.materialCode}/${l.periodBucket}`).toBeTruthy();
      expect(l.allocation.approvedAt, `${l.materialCode}/${l.periodBucket}`).toBeTruthy();
    }
  });
});

describe('Invariant #4 — fan-out never over-allocates the frozen total', () => {
  it('Σ fanned forecastQty ≤ materialPeriodTotal, and the total is shared per group', () => {
    // SDC-1 grain correction: the frozen total is a PER-PUBLICATION fact — each
    // governed snapshot freezes its own material×period total, and across
    // versions a total legitimately MOVES (net-change, design §3.2). The
    // original grouping omitted publicationId, which held only while exactly
    // one publication existed; the invariant itself is unchanged.
    const groups = new Map<string, ForecastLine[]>();
    for (const p of FORECAST_PUBLICATIONS) {
      for (const l of p.lines) {
        const k = `${p.publicationId}|${l.materialCode}|${l.periodBucket}`;
        (groups.get(k) ?? groups.set(k, []).get(k)!).push(l);
      }
    }
    for (const [k, lines] of groups) {
      const totals = new Set(lines.map((l) => l.allocation.materialPeriodTotal));
      expect(totals.size, `${k}: lines disagree on the frozen total`).toBe(1);
      const total = lines[0].allocation.materialPeriodTotal;
      const summed = lines.reduce((s, l) => s + l.forecastQty, 0);
      expect(summed, `${k}: fan-out over-allocates`).toBeLessThanOrEqual(total);
    }
  });
});

describe('Invariant #5 — IncomingShipment lifecycle is linear + Cancelled (no ETARevised)', () => {
  it('every lifecycle is an allowed state and eta is only ever a field', () => {
    for (const s of INCOMING_SHIPMENTS) {
      expect(LIFECYCLES, `${s.id}`).toContain(s.lifecycle);
      // 'ETARevised' was the modeled-as-a-state bug (addendum §2) — it must not exist.
      expect(LIFECYCLES).not.toContain('ETARevised' as ShipmentLifecycle);
      if (s.eta !== undefined) expect(typeof s.eta).toBe('string');
    }
  });
});

describe('Invariant #6 — InventoryDeclaration batches[] plural + well-formed', () => {
  it('batches is an array with complete batch records', () => {
    for (const d of INVENTORY_DECLARATIONS) {
      expect(Array.isArray(d.batches)).toBe(true);
      expect(d.batches.length).toBeGreaterThan(0);
      for (const b of d.batches) {
        expect(b.batchNumber).toBeTruthy();
        expect(b.qty).toBeGreaterThan(0);
        expect(UOMS).toContain(b.uom);
      }
    }
  });
});

describe('Invariant #7 — RequirementResponse binds + answers a real published line', () => {
  it('carries its snapshot keys and matches a fanned line (own-facts-only)', () => {
    for (const r of REQUIREMENT_RESPONSES) {
      expect(r.publicationId).toBeTruthy();
      expect(r.planVersion).toBeTruthy();
      expect(r.periodBucket).toBeTruthy();
      const pub = FORECAST_PUBLICATIONS.find((p) => p.publicationId === r.publicationId);
      expect(pub, `${r.id}: publication not found`).toBeDefined();
      expect(pub!.planVersion, `${r.id}: plan version mismatch`).toBe(r.planVersion);
      const line = pub!.lines.find(
        (l) =>
          l.supplierId === r.supplierId &&
          l.materialCode === r.materialCode &&
          l.periodBucket === r.periodBucket,
      );
      expect(line, `${r.id}: answers a line never fanned to this supplier`).toBeDefined();
    }
  });

  it('a Draft response has no submittedAt; a Submitted one does', () => {
    for (const r of REQUIREMENT_RESPONSES) {
      if (r.status === 'Draft') expect(r.submittedAt).toBeUndefined();
      if (r.status === 'Submitted') expect(r.submittedAt).toBeTruthy();
    }
  });
});

describe('Invariant #11 — commitment XOR acknowledgment (SDC-2b-EXT)', () => {
  it('every response carries EXACTLY ONE of forecastConfirmation | acknowledgment', () => {
    for (const r of REQUIREMENT_RESPONSES) {
      const kinds = [r.forecastConfirmation, r.acknowledgment].filter(Boolean).length;
      expect(kinds, `${r.id}: must be exactly one kind`).toBe(1);
    }
  });

  it('an acknowledgment only ever answers a visibility-only line (never dodges a commitment)', () => {
    for (const r of REQUIREMENT_RESPONSES.filter((x) => x.acknowledgment)) {
      const pub = FORECAST_PUBLICATIONS.find((p) => p.publicationId === r.publicationId);
      const line = pub?.lines.find(
        (l) =>
          l.supplierId === r.supplierId &&
          l.materialCode === r.materialCode &&
          l.periodBucket === r.periodBucket,
      );
      expect(line?.commitmentClass, `${r.id}`).toBe('visibility-only');
    }
  });
});

describe('Invariant #8 — IncomingShipment direction ↔ ASN linkage', () => {
  it('to-paragon LINKS an ASN; principal-to-distributor carries none', () => {
    for (const s of INCOMING_SHIPMENTS) {
      expect(DIRECTIONS).toContain(s.direction);
      if (s.direction === 'to-paragon') {
        expect(s.asnRef, `${s.id}: to-paragon must link an ASN, not duplicate it`).toBeTruthy();
      } else {
        expect(s.asnRef, `${s.id}: principal-to-distributor is not a Paragon-inbound leg`).toBeUndefined();
      }
    }
  });
});

describe('Invariant #9 — SubmissionSession is structurally status-less (the envelope)', () => {
  it('no session carries a status/state/lifecycle field, and refs resolve', () => {
    const forbidden = ['status', 'state', 'lifecycle'];
    const rrIds = new Set(REQUIREMENT_RESPONSES.map((r) => r.id));
    const invIds = new Set(INVENTORY_DECLARATIONS.map((d) => d.id));
    const ishIds = new Set(INCOMING_SHIPMENTS.map((s) => s.id));
    for (const s of SUBMISSION_SESSIONS) {
      for (const key of forbidden) {
        expect(Object.prototype.hasOwnProperty.call(s, key), `${s.sessionId}: has '${key}'`).toBe(false);
      }
      for (const ref of s.attempted) {
        const pool = ref.kind === 'RequirementResponse' ? rrIds : ref.kind === 'InventoryDeclaration' ? invIds : ishIds;
        expect(pool.has(ref.objectId), `${s.sessionId}: dangling ref ${ref.objectId}`).toBe(true);
      }
    }
  });
});

describe('Invariant #10 — provenance: SIMULATED seed, no forked tier, source-correct', () => {
  it('all seed data is SIMULATED (FLAG-2: never supplier-visible)', () => {
    for (const p of FORECAST_PUBLICATIONS) {
      expect(p.provenance.liveness).toBe('SIMULATED');
      expect(p.provenance.source).toBe('SOMO');
      for (const l of p.lines) {
        expect(l.provenance.liveness).toBe('SIMULATED');
        expect(l.provenance.source).toBe('SOMO');
      }
    }
    const supplierRecords = [
      ...REQUIREMENT_RESPONSES.map((r) => r.provenance),
      ...INVENTORY_DECLARATIONS.map((d) => d.provenance),
      ...INCOMING_SHIPMENTS.map((s) => s.provenance),
    ];
    for (const prov of supplierRecords) {
      expect(prov.liveness).toBe('SIMULATED');
      expect(prov.source).toBe('SUPPLIER');
    }
  });
});

describe('Honesty extras — distributor-principal + period-global firm (design §3.1/§7)', () => {
  it('a distributor relationship carries ≥1 principal; a manufacturer carries none', () => {
    for (const r of SUPPLIER_MATERIAL_RELATIONSHIPS) {
      if (r.supplierType === 'distributor') {
        expect((r.principals?.length ?? 0), `${r.supplierId}/${r.materialCode}`).toBeGreaterThanOrEqual(1);
      } else {
        expect(r.principals ?? [], `${r.supplierId}/${r.materialCode}`).toHaveLength(0);
      }
    }
  });

  it('period-global lock: any period with a firm line has ONLY firm lines', () => {
    for (const p of FORECAST_PUBLICATIONS) {
      const firmPeriods = new Set(p.lines.filter((l) => l.commitmentClass === 'firm').map((l) => l.periodBucket));
      for (const period of firmPeriods) {
        const lines = p.lines.filter((l) => l.periodBucket === period);
        expect(lines.every((l) => l.commitmentClass === 'firm'), `${p.publicationId}/${period}`).toBe(true);
      }
    }
  });
});
