import { describe, expect, it } from 'vitest';
import { deriveUnifiedChase } from '../unifiedReducer';
import { severityOf } from '../unifiedChase';
import type { ChaseSeverity, DeliveryChaseEntry } from '../deliveryChase';
import { deriveDeliveryChase } from '../deliveryChase';
import type { ChaseEntry, ChaseReason } from '../../sdc/consolidation';
import { deriveAgreementView } from '../../delivery/views';
import { SCHEDULING_AGREEMENT_DEMO, DELIVERY_DEMO_SHIPMENTS } from '../../delivery/demoFixtures';
import { SDC_SIMULATED_NOW } from '../../sdc';

// ─────────────────────────────────────────────────────────────────────────────
// SDC-5c — the two-grain reducer. RESULTS-IN: two already-derived result arrays →
// one SupplierChaseView per supplier. Tests the union key set, the deterministic
// worst-first sort (the risk-concentration lock), no phantom views, and coherence
// over the real sa-0002 delivery chase.
// ─────────────────────────────────────────────────────────────────────────────

function dataEntry(supplierId: string, reason: ChaseReason): ChaseEntry {
  return { supplierId, reason, awaitingLines: 1, dueAt: '2026-08-22T00:00:00.000Z' };
}

function commit(supplierId: string, severity: ChaseSeverity, releaseSeq = 1): DeliveryChaseEntry {
  return {
    supplierId,
    agreementId: `sa-${supplierId}`,
    itemSeq: 10,
    releaseSeq,
    mode: 'non-compliance-alert',
    type: severity === 'hard' ? 'firm' : 'semi-firm',
    severity,
    dueDate: '2026-07-01',
    materialCode: 'PK-PETB-8810',
  };
}

describe('deriveUnifiedChase — the union bind', () => {
  it('one view per supplier — both-families, data-only, and commitment-only all compose', () => {
    const views = deriveUnifiedChase(
      [dataEntry('sup-both', 'overdue'), dataEntry('sup-data', 'partial-response')],
      [commit('sup-both', 'soft'), commit('sup-commit', 'hard')],
    );
    const by = new Map(views.map((v) => [v.supplierId, v]));
    expect(views).toHaveLength(3);

    // Both families under one supplier — sibling arrays, neither flattened.
    expect(by.get('sup-both')!.dataReasons).toEqual(['overdue']);
    expect(by.get('sup-both')!.commitmentEntries).toHaveLength(1);
    expect(by.get('sup-both')!.chaseCount).toBe(2);

    // Data-only: reasons present, commitmentEntries empty.
    expect(by.get('sup-data')!.dataReasons).toEqual(['partial-response']);
    expect(by.get('sup-data')!.commitmentEntries).toEqual([]);

    // Commitment-only: the reverse.
    expect(by.get('sup-commit')!.dataReasons).toEqual([]);
    expect(by.get('sup-commit')!.commitmentEntries).toHaveLength(1);
  });

  it('collects ALL of a supplier’s data reasons + all its commitment entries', () => {
    const views = deriveUnifiedChase(
      [dataEntry('sup-007', 'overdue'), dataEntry('sup-007', 'partial-response')],
      [commit('sup-007', 'soft', 1), commit('sup-007', 'soft', 2)],
    );
    expect(views).toHaveLength(1);
    expect(views[0].dataReasons).toEqual(['overdue', 'partial-response']);
    expect(views[0].commitmentEntries).toHaveLength(2);
    expect(views[0].chaseCount).toBe(4);
  });

  it('NO phantom view — a supplier in neither family never appears; empty input → empty output', () => {
    expect(deriveUnifiedChase([], [])).toEqual([]);
    const views = deriveUnifiedChase([dataEntry('sup-a', 'overdue')], []);
    expect(views.map((v) => v.supplierId)).toEqual(['sup-a']);
  });

  it('severity + chaseCount come from 5b (consistent with severityOf over the same arrays)', () => {
    const views = deriveUnifiedChase([dataEntry('sup-x', 'overdue')], [commit('sup-x', 'hard')]);
    expect(views[0].overallSeverity).toBe('hard'); // firm miss dominates the data reason
    expect(views[0].overallSeverity).toBe(severityOf(views[0]));
    expect(views[0].chaseCount).toBe(2);
  });
});

describe('deriveUnifiedChase — the determinism lock', () => {
  it('sorts worst-first regardless of input/union iteration order', () => {
    // A data-only SOFT supplier inserted FIRST; a commitment-only HARD supplier
    // inserted SECOND. Naive union iteration would keep [sup-a-soft, sup-z-hard];
    // the explicit worst-first sort must invert it to [sup-z-hard, sup-a-soft].
    const views = deriveUnifiedChase(
      [dataEntry('sup-a-soft', 'overdue')],
      [commit('sup-z-hard', 'hard')],
    );
    expect(views.map((v) => v.supplierId)).toEqual(['sup-z-hard', 'sup-a-soft']);
    expect(views.map((v) => v.overallSeverity)).toEqual(['hard', 'soft']);
  });

  it('tie-breaks by chaseCount desc, then supplierId asc — stable across runs', () => {
    // Three soft suppliers: sup-m (count 2), sup-z (count 1), sup-a (count 1).
    // Expect count-desc then id-asc → [sup-m, sup-a, sup-z].
    const data: ChaseEntry[] = [
      dataEntry('sup-z', 'overdue'),
      dataEntry('sup-a', 'overdue'),
      dataEntry('sup-m', 'overdue'),
    ];
    const commitments: DeliveryChaseEntry[] = [commit('sup-m', 'soft')]; // sup-m → count 2
    const a = deriveUnifiedChase(data, commitments);
    const b = deriveUnifiedChase([...data].reverse(), commitments);
    expect(a.map((v) => v.supplierId)).toEqual(['sup-m', 'sup-a', 'sup-z']);
    expect(b.map((v) => v.supplierId)).toEqual(a.map((v) => v.supplierId)); // order-independent
  });
});

describe('deriveUnifiedChase — over the real sa-0002 delivery chase', () => {
  it('binds the real commitment chase (sup-007) with a data reason into a coherent list', () => {
    const view = deriveAgreementView(SCHEDULING_AGREEMENT_DEMO, DELIVERY_DEMO_SHIPMENTS, SDC_SIMULATED_NOW, 'PT Berlina');
    const commitmentEntries = deriveDeliveryChase([view], SDC_SIMULATED_NOW); // 4 rows, all sup-007, soft
    const dataEntries: ChaseEntry[] = [dataEntry('sup-007', 'overdue'), dataEntry('sup-005', 'partial-response')];

    const unified = deriveUnifiedChase(dataEntries, commitmentEntries);
    const by = new Map(unified.map((v) => [v.supplierId, v]));

    // sup-007 carries BOTH: 1 data reason + the 4 real commitment entries → count 5.
    expect(by.get('sup-007')!.chaseCount).toBe(1 + commitmentEntries.length);
    expect(by.get('sup-007')!.dataReasons).toEqual(['overdue']);
    expect(by.get('sup-007')!.overallSeverity).toBe('soft'); // all sa-0002 chase is semi-firm

    // sup-005 is data-only.
    expect(by.get('sup-005')!.commitmentEntries).toEqual([]);
    expect(by.get('sup-005')!.overallSeverity).toBe('soft');

    // Both soft → higher chaseCount first: sup-007 (5) before sup-005 (1).
    expect(unified.map((v) => v.supplierId)).toEqual(['sup-007', 'sup-005']);
  });
});
