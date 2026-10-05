// ────────────────────────────────────────────────────────────────────────────
// B1 · THE MOCK DERIVATION OF PLANNING FACTS (Design 1 §2.4).
//
// Derives every fact from the stores that already exist plus the generated SOMO
// fixture. `httpDataService` implements the same seam at F1 from the real
// producers; nothing that reads the seam changes.
//
// ⚠️ `value: null` MEANS "THE PRODUCER GAVE NO FIGURE", AND IS NEVER A ZERO.
//
// ⚠️ WHAT THE REAL STORES CANNOT ANSWER, STATED AT THE SITE:
//  · `suggestedQty` / `acceptedQty` from the INTAKE LINES: a `PrIntakeLine`
//    carries a display string (`material: 'Niacinamide USP'`), not a
//    `materialCode`, and the strings do not match the master's labels. A join
//    on a label is a guess, and a fact minted from a guess is a fabricated fact.
//    So the intake store contributes NO planning fact until the line carries a
//    code (B0's contract half, not yet in the tree). The generated fixture
//    supplies `suggestedQty` for synthetic materials, and since B3 each such
//    proposal IS a generated SOMO intake line (`somoIntake.ts`): its
//    `acceptedQty` fact is keyed by that line and reads PLANNED until
//    `t_intake_commit` commits it.
//  · `openPo` / `received`: PO lines and GR inspection lines live in the mock
//    document identity space; a line whose code the planning master cannot
//    resolve is skipped, never given a unit (D-OPS-MASTERMISS).
//  · `rop` / `safetyStock` / `projectedStock`: SPEC. No producer — no fact.
// ────────────────────────────────────────────────────────────────────────────

import type { Tier } from '../../liveness/registry';
import { feedProvenance, liveness, type Capability } from '../../liveness/registry';
import {
  SUPPLIER_MATERIAL_RELATIONSHIPS,
  consolidationRows,
  currentPublication,
  publicationGrain,
  declarationRecency,
  isKnownMaterial,
  requireUom,
  sdcClock,
  totalKey,
  supplierCoverageEntries,
  type InventoryDeclaration,
} from '../../sdc';
import { requirementResponseStore } from './stores/requirementResponseStore';
import { intakeLineStore } from './stores/intakeLineStore';
// B4a — the publications are a store; the constant is only its seed.
import { forecastPublicationStore } from './stores/forecastPublicationStore';
import { collaborationIndex } from './publicationFeed';
import { allocationAnchor } from '../../planning/allocationAnchor';
import { somoIntakeLineId } from '../../planning/somoIntake';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import { incomingShipmentStore } from './stores/incomingShipmentStore';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { schedulingAgreementStore } from '../../delivery/stores/schedulingAgreementStore';
import { POStatus } from '../types';
import { parseHorizon, type BucketId } from '../../planning/bucket';
import { measureOf, type MeasureId, type MeasureSource } from '../../planning/measures';
import {
  bucketOf,
  somoHorizon,
  type PlanningFact,
  type PlanningFactProvenance,
  type PlanningFactsOutcome,
  type PlanningFactsQuery,
} from '../../planning/facts';
import {
  planningMaster,
  PLANNING_MATERIALS,
  generatedAllocation,
  generatedConfirmed,
  generatedDemand,
  generatedSuggested,
  isGeneratedMaterial,
  planningGrainOf,
  suppliersFor,
} from '../../planning/somoFixture';

/**
 * ⚠️ THE TIER A FACT CLAIMS WHEN ITS RECORD CARRIES NONE. Wiring alone (gate 1)
 * is not a live figure: a capability whose FEED is still a fixture reads
 * SIMULATED, whatever its CommandTarget says. A record that carries its own
 * provenance (a response, a declaration, a shipment) passes that instead.
 */
const tierOf = (capability: Capability): Tier =>
  feedProvenance(capability) === 'LIVE' ? liveness(capability) : 'SIMULATED';

const provenanceOf = (
  source: MeasureSource,
  tier: Tier,
  planState: PlanningFactProvenance['planState'] = 'committed',
): PlanningFactProvenance => ({
  source,
  liveness: tier,
  planState,
});

/**
 * Every fact for a horizon and a measure set, derived from the stores that
 * already exist plus the generated SOMO fixture. Pure over the stores' current
 * state; scope is applied by the service, not here.
 */
export function derivePlanningFacts(q: PlanningFactsQuery): PlanningFactsOutcome {
  const parsed = parseHorizon(q.horizon);
  if (!parsed.ok) return { ok: false, reason: parsed.reason, raw: parsed.raw };
  const grain = parsed.grain;
  const inHorizon = new Set(parsed.buckets.map((b) => b.id));
  const index = new Map(parsed.buckets.map((b, i) => [b.id, i]));
  const wanted = new Set(q.measures);
  const materialFilter = q.materialCodes ? new Set(q.materialCodes) : null;
  const want = (code: string) => materialFilter === null || materialFilter.has(code);
  const current = bucketOf(sdcClock.now(), grain);

  const out: PlanningFact[] = [];
  const push = (
    measureId: MeasureId,
    materialCode: string,
    supplierId: string | null,
    periodBucket: BucketId,
    value: number | null,
    sourceRef: string,
    tier?: Tier,
    planState?: PlanningFactProvenance['planState'],
    editAnchor?: string,
  ) => {
    if (!wanted.has(measureId) || !inHorizon.has(periodBucket) || !want(materialCode)) return;
    // D-OPS-MASTERMISS inside the lane: no unit, no fact.
    if (!isKnownMaterial(materialCode, planningMaster())) return;
    const spec = measureOf(measureId);
    out.push({
      materialCode,
      supplierId,
      periodBucket,
      measureId,
      value,
      uom: requireUom(materialCode, planningMaster()),
      provenance: provenanceOf(spec.source, tier ?? tierOf(spec.capability), planState),
      sourceRef,
      ...(editAnchor ? { editAnchor } : {}),
    });
  };

  // ⚠️ B4b · THE OPEN DRAFT SPEAKS FOR EVERY MATERIAL-PERIOD IT HOLDS A TOTAL
  // FOR (Design 1 §5.3). Where a draft of this grain is open, the `allocation`
  // row of such a material-period is the DRAFT's split — one row per supplier
  // who collaborates on the material, PLANNED, anchored so the grid can edit it
  // — and the published (or generated) split is not ALSO emitted for it: two
  // allocation figures for one supplier-period would be two answers in one
  // cell. Every other measure is untouched: demand, confirmation and deficit
  // still read what was PUBLISHED, which is what suppliers answered against.
  const draft = forecastPublicationStore.draftFor(grain);
  const draftKeys = new Set(
    draft ? Object.keys(draft.totals).filter((k) => inHorizon.has(k.slice(k.indexOf('|') + 1))) : [],
  );

  // — The real stores (the 42 real codes). Monthly only where the source is
  //   bucket-native at month grain; dated sources map into either grain. —
  const publications = forecastPublicationStore.publications();
  // ⚠️ SDC-1 · THE MONTHLY GRID READS THE MONTHLY PLAN. "Current" is per grain:
  // this read took the latest publication across both, so publishing one weekly
  // line took the monthly plan's published allocation and demand off the monthly
  // grid. The weekly grid still emits no fact from a publication (as before):
  // its allocation is the generator's or the open draft's.
  const pub = grain === 'month' ? currentPublication(publications, 'month') : null;
  if (pub) {
    const demandBy = new Map<string, number>();
    for (const line of pub.lines) {
      const bucket = line.periodBucket;
      if (!draftKeys.has(totalKey(line.materialCode, bucket))) {
        push('allocation', line.materialCode, line.supplierId, bucket, line.forecastQty, pub.planVersion, pub.provenance.liveness);
      }
      const k = `${line.materialCode}|${bucket}`;
      demandBy.set(k, (demandBy.get(k) ?? 0) + line.forecastQty);
    }
    for (const [k, total] of demandBy) {
      const [code, bucket] = k.split('|');
      push('demand', code, null, bucket, total, pub.planVersion, pub.provenance.liveness);
    }
    {
      // Only the monthly plan's rows: the consolidation is the union of every grain's.
      const monthly = consolidationRows(publications, requirementResponseStore.all()).filter(
        (r) => publicationGrain({ horizon: [r.line.periodBucket] }) === 'month',
      );
      for (const row of monthly) {
        const s = row.state;
        const response = 'response' in s ? s.response : null;
        const confirmed = response?.forecastConfirmation?.confirmedQty ?? null;
        if (response?.acknowledgment) continue; // an acknowledgment commits nothing
        push('confirmed', row.line.materialCode, row.line.supplierId, row.line.periodBucket, confirmed, response?.id ?? pub.planVersion, response?.provenance.liveness);
        // DERIVED: allocation − confirmed, only when both exist.
        push(
          'confirmedDeficit',
          row.line.materialCode,
          row.line.supplierId,
          row.line.periodBucket,
          confirmed === null ? null : Math.max(0, row.line.forecastQty - confirmed),
          'confirmedDeficitOf',
          'SIMULATED',
        );
      }
    }
  }

  // Supplier stock on hand — AS-OF: rendered in the current bucket only.
  const latestDecl = new Map<string, InventoryDeclaration>();
  for (const d of inventoryDeclarationStore.all()) {
    const k = `${d.supplierId}|${d.materialCode}`;
    const prev = latestDecl.get(k);
    if (!prev || declarationRecency(d) > declarationRecency(prev)) latestDecl.set(k, d);
  }
  for (const d of latestDecl.values()) push('supplierSoh', d.materialCode, d.supplierId, current, d.totalQty, d.id, d.provenance.liveness);

  // Incoming shipments in flight, by ETA bucket.
  for (const sh of incomingShipmentStore.all()) {
    if ((sh.lifecycle !== 'Booked' && sh.lifecycle !== 'Shipped') || !sh.eta) continue;
    push('incoming', sh.materialCode, sh.supplierId, bucketOf(sh.eta, grain), sh.qty, sh.id, sh.provenance.liveness);
  }

  // Released call-offs, by release bucket.
  for (const sa of schedulingAgreementStore.all()) {
    for (const item of sa.items) {
      for (const line of item.scheduleLines) {
        if (line.state !== 'released') continue;
        push('released', item.materialCode, sa.supplierId, bucketOf(line.releaseDate, grain), line.plannedQty, line.releaseRef, sa.liveness);
      }
    }
  }

  // Open PO quantity, by requested delivery bucket (skipped where unresolvable).
  const OPEN = new Set<string>([POStatus.SENT, POStatus.VIEWED, POStatus.ACKNOWLEDGED, POStatus.CONFIRMED, POStatus.PARTIALLY_DELIVERED]);
  for (const po of purchaseOrderStore.all()) {
    if (!OPEN.has(po.status) || !po.requestedDeliveryDate) continue;
    for (const li of po.lineItems) {
      push('openPo', li.materialCode, po.supplierId, bucketOf(po.requestedDeliveryDate, grain), li.quantity, po.poNumber);
    }
  }

  // Goods received and posted, by receipt bucket (skipped where unresolvable).
  for (const gr of goodsReceiptStore.all()) {
    if (gr.status !== 'Posted to SAP') continue;
    for (const r of gr.inspectionResults) {
      push('received', r.materialCode, gr.supplierId, bucketOf(gr.receivedDate, grain), r.qtyAccepted, gr.grNumber);
    }
  }

  // Supplier coverage Σ — DERIVED, MODELED, as-of the current bucket.
  if (grain === 'month') {
    for (const e of supplierCoverageEntries(
      publications,
      inventoryDeclarationStore.all(),
      incomingShipmentStore.all(),
      SUPPLIER_MATERIAL_RELATIONSHIPS,
      sdcClock.now(),
    )) {
      const ratio = e.status.kind === 'no-declaration' ? null : Number.isFinite(e.status.ratio) ? e.status.ratio : null;
      push('coverageRatio', e.materialCode, e.supplierId, current, ratio, 'supplierCoverageEntries', 'SIMULATED');
    }
  }

  // — The generated SOMO fixture (synthetic codes only), within its horizon. —
  const fixtureHorizon = new Set(somoHorizon(grain));
  const seedRef = `somo-fixture@${grain}`;
  for (const code of PLANNING_MATERIALS) {
    if (!isGeneratedMaterial(code) || !want(code)) continue;
    // PLN-2 · a material is planned at ONE grain (`PLANNING_GRAIN_OF_TYPE`).
    // Off it the generator emits no fact at all — not a row of dashes, which
    // would read as "SOMO gave no figure" for a material it never plans here.
    if (planningGrainOf(code) !== grain) continue;
    for (const b of parsed.buckets) {
      if (!fixtureHorizon.has(b.id)) continue;
      push('demand', code, null, b.id, generatedDemand(code, b.id), seedRef, 'SIMULATED');
      const suggested = generatedSuggested(code, b.id);
      push('suggestedQty', code, null, b.id, suggested, seedRef, 'SIMULATED');
      // B3 · the ACCEPTED quantity of SOMO's proposal, keyed by its intake line —
      // the `sourceRef` IS the grid cell's `seamRef`. Before a commit it is the
      // producer's delivered figure (= the proposal) and reads PLANNED; after
      // `t_intake_commit` it is the committed quantity and reads committed. The
      // triage store is read, never the overlay: nothing a planner has typed and
      // not pushed can reach this array (C6 §2).
      if (suggested !== null && wanted.has('acceptedQty')) {
        const lineId = somoIntakeLineId(code, b.id);
        const record = intakeLineStore.get(lineId);
        const done = record?.state === 'Committed' && typeof record.committedQty === 'number';
        push('acceptedQty', code, null, b.id, done ? record.committedQty! : suggested, lineId, 'SIMULATED', done ? 'committed' : 'planned');
        // ⚠️ PLN-3 · ONE INTAKE POPULATION — a line dismissed in the intake view
        // reads dismissed here too, from the same triage store (R-PLN P0 #6). It
        // read PLANNED and stayed editable, so a planner pushed it into
        // `ILLEGAL_TRANSITION:Dismissed->Committed` with no sign it was set aside.
        if (record?.state === 'Dismissed' && out[out.length - 1]?.sourceRef === lineId) {
          out[out.length - 1] = { ...out[out.length - 1], dismissed: true };
        }
      }
      for (const sup of suppliersFor(code)) {
        const alloc = generatedAllocation(code, sup, b.id);
        const conf = generatedConfirmed(code, sup, b.id, index.get(b.id) ?? 0);
        if (!draftKeys.has(totalKey(code, b.id))) push('allocation', code, sup, b.id, alloc, seedRef, 'SIMULATED');
        push('confirmed', code, sup, b.id, conf, seedRef, 'SIMULATED');
        push('confirmedDeficit', code, sup, b.id, alloc === null || conf === null ? null : Math.max(0, alloc - conf), 'confirmedDeficitOf', 'SIMULATED');
      }
    }
  }

  // — B4b · the open draft's split, one PLANNED row per collaborating supplier.
  //   A supplier with no line reads "—" (not allocated), never 0. —
  if (draft && draftKeys.size > 0 && wanted.has('allocation')) {
    const collaborators = collaborationIndex();
    for (const k of draftKeys) {
      const [code, bucket] = [k.slice(0, k.indexOf('|')), k.slice(k.indexOf('|') + 1)];
      const lines = draft.lines.filter((l) => l.materialCode === code && l.periodBucket === bucket);
      const suppliers = new Set([...collaborators(code), ...lines.map((l) => l.supplierId)]);
      for (const sup of suppliers) {
        const line = lines.find((l) => l.supplierId === sup);
        push(
          'allocation',
          code,
          sup,
          bucket,
          line ? line.forecastQty : null,
          draft.publicationId,
          draft.provenance.liveness,
          'planned',
          allocationAnchor({ publicationId: draft.publicationId, supplierId: sup, materialCode: code, periodBucket: bucket }),
        );
      }
    }
  }

  return { ok: true, grain, facts: out };
}
