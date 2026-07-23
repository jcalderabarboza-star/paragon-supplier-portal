// ────────────────────────────────────────────────────────────────────────────
// C4c — the buyer RECORDING verb (ruled option (d)), dispatched through the REAL
// MockCommandService + real stores. The honesty crux of the arc made testable:
// "the supplier committed" (t_inventorydeclaration_declare) and "Paragon recorded
// the supplier's words" (t_inventorydeclaration_record) are two DIFFERENT,
// permanently-distinguishable facts — same declaration, same store, same state,
// but a different verb, a different role, and a truthfully-different DR-10 actor.
//
// Proven here:
//   • record mints a declaration in the SAME store + 'Declared' state as declare;
//   • the DR-10 actor is the BUYER (not the supplier) — the honesty crux;
//   • requireCreationOwner (C4b) blocks recording for a supplier × material the
//     governed data never names (the anchor works under a buyer scope);
//   • a SUPPLIER attempting :record is denied (it is a buyer verb);
//   • a BUYER attempting :declare is still ROLE_NOT_PERMITTED (distinction kept);
//   • recorded vs self-submitted are distinguishable from the event stream
//     (different transitionId + actor), with NO stored flag on the declaration;
//   • the envelope/actor split — SubmissionSession.supplierId = the SUBJECT
//     supplier, DR-10 actor = the BUYER — and channelProvenanceStore links the
//     session to the raw ChannelMessage (as in C2).
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService, commandAuditSink } from './MockCommandService';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import { openSubmissionSession, sdcClock } from '../../sdc';
import { getTransition, personaCan } from '../../transitions';
import { channelProvenanceStore } from '../../channel/provenanceStore';
import { makeProvenanceRef, type ChannelMessage } from '../../channel/types';
import { DataError } from '../types';
import type { QueryScope } from '../types';

const buyer: QueryScope = { personaType: 'buyer', supplierId: null };
// sup-002 makes glycerin (RM-EMUL-3310, manufacturer relationship + fanned).
const sup002: QueryScope = { personaType: 'supplier', supplierId: 'sup-002' };

const svc = new MockCommandService();

// The buyer records what sup-002 asserted over a channel: RM-EMUL-3310 = 4000.
const record = (overrides: Record<string, unknown> = {}) => ({
  transitionId: 't_inventorydeclaration_record',
  entity: 'inventoryDeclaration',
  payload: {
    materialCode: 'RM-EMUL-3310',
    supplierId: 'sup-002', // the SUBJECT supplier (message-bound upstream)
    totalQty: 4000,
    ...overrides,
  },
});

const declare = (overrides: Record<string, unknown> = {}) => ({
  transitionId: 't_inventorydeclaration_declare',
  entity: 'inventoryDeclaration',
  payload: {
    materialCode: 'RM-EMUL-3310',
    supplierId: 'sup-002',
    totalQty: 4000,
    ...overrides,
  },
});

const eventFor = (transitionId: string, correlationId: string) =>
  commandAuditSink.byEvent(transitionId).find((e) => e.correlationId === correlationId)!;

beforeEach(() => {
  inventoryDeclarationStore.reset();
  channelProvenanceStore.reset();
  sdcClock.reset();
});

describe('C4c — the record verb is authored + wired, distinct from declare', () => {
  it('t_inventorydeclaration_record is a buyer creation verb on the same flow/state', () => {
    const t = getTransition('t_inventorydeclaration_record')!;
    expect(t.from).toEqual([]); // creation-shape
    expect(t.trigger).toBe('creation');
    expect(t.to).toBe('Declared'); // same state as declare — a declaration is a declaration
    expect(t.requiredFields).toEqual(['materialCode', 'totalQty']);
    // The role is a BUYER role — never widened onto the supplier (the b1 trap).
    expect(personaCan('buyer', 'inventorydeclaration:record')).toBe(true);
    expect(personaCan('supplier', 'inventorydeclaration:record')).toBe(false);
    // …and declare stays the supplier's, never the buyer's (distinction preserved).
    expect(personaCan('supplier', 'inventorydeclaration:declare')).toBe(true);
    expect(personaCan('buyer', 'inventorydeclaration:declare')).toBe(false);
  });
});

describe('C4c — a buyer records; the record IS a declaration, the ACTOR is the buyer', () => {
  it('mints a declaration in the same store + Declared state as declare', async () => {
    const res = await svc.dispatch(buyer, record());
    expect(res.status).toBe('done');
    expect(res.entityId).toMatch(/^inv-9\d+$/);
    const d = inventoryDeclarationStore.get(res.entityId!)!;
    expect(d.supplierId).toBe('sup-002'); // the subject supplier
    expect(d.materialCode).toBe('RM-EMUL-3310');
    expect(d.totalQty).toBe(4000);
    // Same create() — the declaration carries no stored "recorded" flag; the
    // content author is still the supplier (source: SUPPLIER), honestly.
    expect(d.provenance).toEqual({ source: 'SUPPLIER', liveness: 'SIMULATED', planState: 'committed' });
  });

  it('THE HONESTY CRUX: the DR-10 actor is the BUYER, not the supplier', async () => {
    const res = await svc.dispatch(buyer, record());
    const ev = eventFor('t_inventorydeclaration_record', res.correlationId);
    expect(ev.actor).toBe('buyer:all'); // Paragon recorded it — truthfully
    expect(ev.scope.personaType).toBe('buyer');
  });

  it('recorded vs self-submitted are distinguishable from the event stream alone', async () => {
    // The supplier self-submits; the buyer records the same supplier × material.
    const self = await svc.dispatch(sup002, declare());
    const rec = await svc.dispatch(buyer, record());
    const evSelf = eventFor('t_inventorydeclaration_declare', self.correlationId);
    const evRec = eventFor('t_inventorydeclaration_record', rec.correlationId);
    // Different verb AND different actor — answerable forever with NO stored flag.
    expect(evSelf.event).not.toBe(evRec.event);
    expect(evSelf.actor).toBe('supplier:sup-002');
    expect(evRec.actor).toBe('buyer:all');
    // Both landed as declarations in the one store.
    expect(inventoryDeclarationStore.get(self.entityId!)!.materialCode).toBe('RM-EMUL-3310');
    expect(inventoryDeclarationStore.get(rec.entityId!)!.materialCode).toBe('RM-EMUL-3310');
  });
});

describe('C4c — the relationship anchor (C4b requireCreationOwner) holds for the buyer', () => {
  it('blocks recording for a supplier × material the governed data never names (owner null → SCOPE_DENIED)', async () => {
    const before = inventoryDeclarationStore.all().length;
    // sup-002 has no relationship and no fanned line for a packaging cap.
    await expect(
      svc.dispatch(buyer, record({ materialCode: 'PK-CAPF-8820' })),
    ).rejects.toBeInstanceOf(DataError);
    // Nothing minted — a planner cannot fabricate a declaration for an unrelated pair.
    expect(inventoryDeclarationStore.all().length).toBe(before);
  });
});

describe('C4c — the distinction is enforced at the role layer', () => {
  it('a SUPPLIER attempting :record is denied — it is a buyer verb (ROLE_NOT_PERMITTED)', async () => {
    // sup-002 records for its OWN collaborated material: creation-scope passes
    // (owner === scope), so the ROLE gate is what denies — proving :record is a
    // buyer verb, not merely a scope accident.
    const res = await svc.dispatch(sup002, record());
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ROLE_NOT_PERMITTED:inventorydeclaration:record/);
  });

  it('a BUYER attempting :declare is still denied (ROLE_NOT_PERMITTED) — declare stays the supplier act', async () => {
    const res = await svc.dispatch(buyer, declare());
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ROLE_NOT_PERMITTED:inventorydeclaration:declare/);
  });
});

describe('C4c — provenance: the envelope/actor split ("about X, done by Y")', () => {
  it('SubmissionSession.supplierId = the SUBJECT supplier while the DR-10 actor = the BUYER', async () => {
    // The session is opened for the SUBJECT supplier (bound at message capture).
    const session = openSubmissionSession('ss-c4c-1', 'sup-002', '2026-09-01T00:00:00.000Z');
    const res = await svc.dispatch(buyer, record());
    session.attempt('InventoryDeclaration', res.entityId!, res.correlationId);

    // "about X": the envelope names the subject supplier.
    expect(session.envelope().supplierId).toBe('sup-002');
    // "done by Y": the event actor is the buyer.
    expect(eventFor('t_inventorydeclaration_record', res.correlationId).actor).toBe('buyer:all');
  });

  it('channelProvenanceStore links the session to the raw ChannelMessage (as in C2)', async () => {
    const message: ChannelMessage = {
      id: 'cm-c4c-1',
      channel: 'whatsapp',
      supplierId: 'sup-002', // the app-resolved conversation binding
      receivedAt: '2026-09-01T00:00:00.000Z',
      rawText: 'Glycerin stock 4000 kg',
    };
    const session = openSubmissionSession('ss-c4c-2', message.supplierId, '2026-09-01T00:00:00.000Z');
    const res = await svc.dispatch(buyer, record());
    session.attempt('InventoryDeclaration', res.entityId!, res.correlationId);

    // Provenance points INTO sdc's stable ids from the channel side (never a payload).
    channelProvenanceStore.append(makeProvenanceRef(message.id, session.envelope()));
    const links = channelProvenanceStore.forMessage('cm-c4c-1');
    expect(links).toHaveLength(1);
    expect(links[0].sessionId).toBe('ss-c4c-2');
    expect(links[0].causationAnchor).toBe(res.correlationId); // the session's audit anchor
  });
});
