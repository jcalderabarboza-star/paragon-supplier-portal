// ─────────────────────────────────────────────────────────────────────────────
// Delivery Agreement — the read view-model + the SIMULATED demo scenario.
//
// Proves the surface renders HONEST, DERIVED states: every fulfillment status
// falls out of the real deriveFulfillment over the demo shipments, the honesty
// lock holds (inferred matches never inflate deliveredQty), and the ctr-003 anchor
// stays pristine (all-draft, nothing delivered) even with shipments in the pool.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { deriveAgreementView } from '../views';
import { SCHEDULING_AGREEMENT_CTR003 } from '../fixtures';
import { DELIVERY_DEMO_SHIPMENTS, SCHEDULING_AGREEMENT_DEMO } from '../demoFixtures';

const NOW = '2026-08-25T12:00:00.000Z'; // the shared SIMULATED clock's timeline

describe('deriveAgreementView — the demo scenario derives every state honestly', () => {
  const view = deriveAgreementView(
    SCHEDULING_AGREEMENT_DEMO,
    DELIVERY_DEMO_SHIPMENTS,
    NOW,
    'PT Sample Packaging',
  );
  const itemA = view.items.find((i) => i.item.lineSeq === 10)!;
  const itemB = view.items.find((i) => i.item.lineSeq === 20)!;
  const fa = (seq: number) => itemA.fulfillment.find((f) => f.releaseSeq === seq)!;
  const fb = (seq: number) => itemB.fulfillment.find((f) => f.releaseSeq === seq)!;

  it('passes the display supplier name through', () => {
    expect(view.supplierName).toBe('PT Sample Packaging');
  });

  it('item A (FRC/Case B): fulfilled · late · missed · pending, all derived', () => {
    // Only released lines (3–6) carry fulfillment; drafts 1–2 are omitted.
    expect(itemA.fulfillment.map((f) => f.releaseSeq)).toEqual([3, 4, 5, 6]);
    expect(fa(3).fulfillment).toBe('fulfilled'); // eta 2 days early
    expect(fa(3).inferred).toBe(true); // proximity match → flagged proposal
    expect(fa(3).qtyVariance).toBe(0);
    expect(fa(4).fulfillment).toBe('late'); // eta 3 days after
    expect(fa(4).qtyVariance).toBe(-5_000); // short delivery surfaced
    expect(fa(5).fulfillment).toBe('missed'); // past grace, no shipment
    expect(fa(5).matchedRef).toBeUndefined();
    expect(fa(6).fulfillment).toBe('pending'); // future release, honest default
  });

  it('item A ledger: released 400k of 600k, deliveredQty 0 (inferred never counts)', () => {
    expect(itemA.ledger.releasedQty).toBe(400_000);
    expect(itemA.ledger.remainingQty).toBe(200_000);
    // Honesty lock: item A's matches are all inferred/unconfirmed → deliveredQty 0.
    expect(itemA.ledger.deliveredQty).toBe(0);
    expect(itemA.ledger.enforced).toBe(true); // Case B — governed
  });

  it('item B (JIT/Case C): a CONFIRMED bind + an inferred over-delivery', () => {
    expect(fb(1).fulfillment).toBe('fulfilled');
    expect(fb(1).inferred).toBe(false); // explicit binding wins — not a proposal
    expect(fb(1).matchedRef).toBe('ASN-DEMO-CAP1');
    expect(fb(2).fulfillment).toBe('fulfilled');
    expect(fb(2).inferred).toBe(true);
    expect(fb(2).qtyVariance).toBe(10_000); // over-delivery surfaced
  });

  it('item B ledger: the confirmed line feeds deliveredQty; Case C not enforced', () => {
    expect(itemB.ledger.releasedQty).toBe(400_000);
    // Only the confirmed (bound + stored actualQty) line feeds the governed total.
    expect(itemB.ledger.deliveredQty).toBe(200_000);
    expect(itemB.ledger.enforced).toBe(false); // Case C — reference envelope
  });
});

describe('deriveAgreementView — ctr-003 stays pristine (all-draft zero-state)', () => {
  it('reads no fulfillment and zero delivered even with shipments in the pool', () => {
    const view = deriveAgreementView(
      SCHEDULING_AGREEMENT_CTR003,
      DELIVERY_DEMO_SHIPMENTS,
      NOW,
      'PT Sample Packaging',
    );
    for (const iv of view.items) {
      expect(iv.fulfillment).toEqual([]); // nothing released ⇒ nothing to fulfill
      expect(iv.ledger.releasedQty).toBe(0);
      expect(iv.ledger.deliveredQty).toBe(0);
    }
  });
});
