// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE CHANGE HISTORY SHOWS WHAT WAS DISPATCHED — BY NAMED TRANSITION ID.
//
// The history view is a DERIVED fold over the agreement's own stamps, not a
// second record. That is its strength (it cannot fall out of step with the
// thing it describes) and it is also the thing that needs proving: a fold could
// silently show an act nothing dispatched, or miss one that was.
//
// So this binds the two populations together in the direction that matters:
// take the DR-10 events the dispatcher really emitted, and require the history
// to carry one row per act, in both directions. **By named transition id, never
// by a count** — a count is satisfied by the wrong three.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService, commandAuditSink } from '../../data/mock/MockCommandService';
import { MockDeliveryService } from '../../data/mock/MockDeliveryService';
import { schedulingAgreementStore } from '../stores/schedulingAgreementStore';
import { deriveAgreementHistory } from '../history';
import { DECLARED_PRESENT } from '../../data/fixturePresent';
import { SAMPLE_PEOPLE } from '../../identity/sampleRoster';
import type { QueryScope } from '../../data/types';

const commands = new MockCommandService();

/**
 * Adjust a draft line the way the SURFACE does — a direct dispatch.
 *
 * ⚠️ **THERE IS NO `svc.delivery.adjustLine`, AND THAT IS A RULING.**
 * `C1-methods.md` enumerates `IDeliveryService`'s methods and pins them EQUAL
 * to the interface, so a fifth method would be a contract amendment. An
 * adjust is one command against one address with nothing to orchestrate, so
 * it is dispatched directly (`useAdjustLine`, on the `commandHooks` pattern)
 * — and this helper is that same call, so the spec exercises the shipped
 * path rather than a convenience the product does not have.
 */
async function adjustLine(
  scope: QueryScope,
  agreementId: string,
  itemSeq: number,
  releaseSeq: number,
  patch: { plannedQty?: number; releaseDate?: string },
) {
  const line = schedulingAgreementStore
    .get(agreementId)
    ?.items.find((i) => i.lineSeq === itemSeq)
    ?.scheduleLines.find((l) => l.releaseSeq === releaseSeq);
  if (!line) return { ok: false as const, reason: 'UNKNOWN_RELEASE_SEQ' };
  const r = await commands.dispatch(scope, {
    transitionId: 't_delivery_adjust',
    entity: 'deliveryRelease',
    entityId: line.releaseRef,
    payload: {
      ...(patch.plannedQty !== undefined ? { plannedQty: patch.plannedQty } : {}),
      ...(patch.releaseDate !== undefined ? { releaseDate: patch.releaseDate } : {}),
    },
  });
  return r.status === 'failed'
    ? { ok: false as const, reason: r.reason ?? 'REFUSED' }
    : { ok: true as const };
}
const delivery = new MockDeliveryService(commands);

const PERSON = SAMPLE_PEOPLE.find((p) => p.role === 'procurement')!;
const COMPLIANCE_PERSON = SAMPLE_PEOPLE.find((p) => p.role === 'compliance')!;

const scopeFor = (roles: readonly string[], personId: string): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: [...roles],
  actor: { kind: 'RESOLVED', person: { personId } },
});
const PROCUREMENT = scopeFor(['procurement'], PERSON.personId);
const COMPLIANCE = scopeFor(['compliance'], COMPLIANCE_PERSON.personId);

const ANCHOR = 'sa-0001';
const FUTURE = '2027-09-09';

beforeEach(() => {
  schedulingAgreementStore.reset();
  commandAuditSink.clear();
});

function anchorItem() {
  return schedulingAgreementStore.get(ANCHOR)!.items[0];
}

describe('REACH — the seeded history is non-empty before anything is dispatched', () => {
  it('⚠️ THE DEMO ALREADY HAS ROWS, AND THEY NAME NOBODY', () => {
    const demo = schedulingAgreementStore.get('sa-0002')!;
    const rows = deriveAgreementHistory(demo);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.kind === 'released')).toBe(true);
    // Seeded acts were taken in no session, so they name nobody — and the view
    // renders that as an absence rather than inventing a person.
    expect(rows.every((r) => r.actor.kind === 'UNATTRIBUTED')).toBe(true);
  });

  it('⚠️ AND THE PRISTINE ANCHOR HAS NONE — the honest empty state is reachable', () => {
    expect(deriveAgreementHistory(schedulingAgreementStore.get(ANCHOR)!)).toEqual([]);
  });
});

describe('⚠️ EVERY ROW THE VIEW SHOWS WAS DISPATCHED, AND EVERY DISPATCH SHOWS', () => {
  it('three acts on the anchor produce three rows, matched by named verb', async () => {
    const item = anchorItem();
    const past = item.scheduleLines.find((l) => l.releaseDate < DECLARED_PRESENT)!;

    // 1 · adjust the past-dated line forward (the back-dating remedy)
    const adjusted = await adjustLine(PROCUREMENT, ANCHOR, item.lineSeq, past.releaseSeq, {
      releaseDate: FUTURE,
    });
    expect(adjusted.ok).toBe(true);
    // 2 · release it
    const released = await delivery.releaseLines(PROCUREMENT, ANCHOR, item.lineSeq, {
      releaseSeqs: [past.releaseSeq],
    });
    expect(released.ok).toBe(true);
    // 3 · tighten the tolerance (compliance's atom, not procurement's)
    const tightened = await delivery.editPolicy(COMPLIANCE, ANCHOR, item.lineSeq, {
      tolerancePct: 0.01,
      enforcement: 'block',
      reason: 'tightened for the history probe',
    });
    expect(tightened.ok).toBe(true);

    const rows = deriveAgreementHistory(schedulingAgreementStore.get(ANCHOR)!);

    // ── The view's side, BY KIND AND ADDRESS, never a count ──────────────────
    const seen = rows.map((r) => `${r.kind}:${r.lineSeq}:${r.releaseSeq ?? '-'}`);
    expect(seen).toContain(`adjusted:${item.lineSeq}:${past.releaseSeq}`);
    expect(seen).toContain(`released:${item.lineSeq}:${past.releaseSeq}`);
    expect(seen).toContain(`policy:${item.lineSeq}:-`);

    // ── The dispatcher's side, BY NAMED TRANSITION ID ────────────────────────
    const emitted = commandAuditSink
      .all()
      .filter((e) => e.event.startsWith('t_delivery_'))
      .map((e) => e.event);
    expect(emitted).toContain('t_delivery_adjust');
    expect(emitted).toContain('t_delivery_release');
    expect(emitted).toContain('t_delivery_policy_set');

    // ── And the two agree: one row per DONE delivery event ───────────────────
    const done = commandAuditSink
      .all()
      .filter((e) => e.event.startsWith('t_delivery_') && e.outcome === 'done');
    expect(rows.length).toBe(done.length);
  });

  it('⚠️ A REFUSED ACT LEAVES NO HISTORY ROW — a refusal is not a change', async () => {
    const item = anchorItem();
    const past = item.scheduleLines.find((l) => l.releaseDate < DECLARED_PRESENT)!;
    const refused = await delivery.releaseLines(PROCUREMENT, ANCHOR, item.lineSeq, {
      releaseSeqs: [past.releaseSeq],
    });
    expect(refused.ok).toBe(false);
    // The DR-10 trail records the attempt (that is what an audit is for) …
    expect(commandAuditSink.all().some((e) => e.event === 't_delivery_release')).toBe(true);
    // … and the CHANGE history stays empty, because nothing changed.
    expect(deriveAgreementHistory(schedulingAgreementStore.get(ANCHOR)!)).toEqual([]);
  });

  it('⚠️ AND A DISPATCHED ACT NAMES ITS ACTOR ON THE ROW', async () => {
    const item = anchorItem();
    const future = item.scheduleLines.find((l) => l.releaseDate >= DECLARED_PRESENT)!;
    await delivery.releaseLines(PROCUREMENT, ANCHOR, item.lineSeq, {
      releaseSeqs: [future.releaseSeq],
    });
    const row = deriveAgreementHistory(schedulingAgreementStore.get(ANCHOR)!).find(
      (r) => r.kind === 'released',
    )!;
    expect(row.actor).toEqual({ kind: 'RESOLVED', person: { personId: PERSON.personId } });
  });

  it('newest first, with a total order over equal stamps', async () => {
    const item = anchorItem();
    const futures = item.scheduleLines
      .filter((l) => l.releaseDate >= DECLARED_PRESENT)
      .slice(0, 2)
      .map((l) => l.releaseSeq);
    expect(futures.length).toBe(2);
    await delivery.releaseLines(PROCUREMENT, ANCHOR, item.lineSeq, { releaseSeqs: futures });
    const rows = deriveAgreementHistory(schedulingAgreementStore.get(ANCHOR)!);
    // Both stamped at the SAME simulated instant — the tie-break by address is
    // what keeps the order stable between renders rather than shuffling.
    expect(rows.length).toBe(2);
    expect(rows[0].at).toBe(rows[1].at);
    expect(rows[0].key.localeCompare(rows[1].key)).toBeLessThan(0);
  });
});
