// ────────────────────────────────────────────────────────────────────────────
// RFx-2 · THE RFQ STORE WRITES A GUARDED FIELD ONLY FOR THE VERB THAT GUARDS IT.
//
// The RFQ target was not told which verb it was applying, so it decided what to
// write from the SHAPE of the payload: a `quote` key appended a rate to the
// ledger, an `awardedSupplierId` key recorded an awardee. The checks on a rate
// (`rfq_fx_pin_well_formed`) and on an awardee (`rfq_award_awardee_integrity`,
// the stage, the FX basis, a named person) hang on `t_rfq_fx_pin` and
// `t_rfq_award`. A hand-made dispatch of ANY OTHER verb carrying those keys ran
// none of them and was written all the same.
//
// The first block is that dispatch, as it was measured at RFx-1: a close. The
// second derives every (verb, field group) pair from the flow, so a verb added
// tomorrow is probed without anybody editing this file. Every "writes nothing"
// is paired with the owning verb still writing its own.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import { stageResponseStore } from './stores/stageResponseStore';
import { getFlow } from '../../transitions';
import { SAMPLE_ACTORS } from '../../identity/sampleActors';
import { NO_PERSON } from '../../../context/noPerson';
import type { RFQ } from '../../../data/mockRfqs';
import type { QueryScope } from '../types';

const svc = new MockCommandService();

const named: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['procurement'],
  actor: SAMPLE_ACTORS.procurement1,
};
const supplier = (supplierId: string): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: ['supplier', 'commercial'],
  actor: NO_PERSON,
});

const LATER = '2026-10-15';
const THREE = ['sup-002', 'sup-005', 'sup-007'];

const rfqVerb = (transitionId: string, entityId: string, payload: Record<string, unknown> = {}) =>
  svc.dispatch(named, { transitionId, entity: 'rfq', entityId, payload });

const raise = async (stage?: string): Promise<string> => {
  const res = await svc.dispatch(named, {
    transitionId: 't_rfq_create',
    entity: 'rfq',
    payload: {
      title: 'RFx-2 probe — payload shape',
      materialCategory: 'Packaging',
      totalQty: 1000,
      invitedSupplierIds: THREE,
      materialIds: [],
      responseDeadline: LATER,
      awardDeadline: '2026-10-30',
      ...(stage ? { stage } : {}),
    },
  });
  expect(res.status, res.reason).toBe('done');
  return res.entityId!;
};

const ok = async (p: Promise<{ status: string; reason?: string }>) => {
  const res = await p;
  expect(res.status, res.reason).toBe('done');
};

const quote = async (supplierId: string, rfqId: string): Promise<string> => {
  const res = await svc.dispatch(supplier(supplierId), {
    transitionId: 't_quotation_submit',
    entity: 'quotation',
    payload: {
      rfqId,
      supplierId,
      unitPrice: 14_200,
      leadTimeDays: 10,
      currency: 'IDR',
      validUntil: '2026-12-31',
      paymentTermsOffered: 'Net 30',
    },
  });
  expect(res.status, res.reason).toBe('done');
  return res.entityId!;
};

// ── The guarded field groups, and the one verb that may write each ──────────
//
// `foreign` is what a hand-made dispatch would carry; `read` is what the store
// holds for the group afterwards. `written` says whether `read` moved.
interface Guarded {
  readonly name: string;
  readonly owner: string;
  readonly foreign: Record<string, unknown>;
  readonly read: (r: RFQ) => unknown;
}

const GUARDED: readonly Guarded[] = [
  {
    name: 'the rate ledger',
    owner: 't_rfq_fx_pin',
    // Malformed on every count `rfq_fx_pin_well_formed` reads: not a permitted
    // currency, not a number, not a date, not a known source.
    foreign: { quote: 'XXX', rate: 'not a rate', asOf: 'never', source: 'SOMEBODY_SAID' },
    read: (r) => r.fxPins,
  },
  {
    name: 'the awardee',
    owner: 't_rfq_award',
    foreign: { awardedSupplierId: 'sup-999', awardedQuotationId: 'q-does-not-exist' },
    read: (r) => [r.awardedSupplierId, r.awardedQuotationId, r.awardedAt],
  },
  {
    name: 'the stage, the invite list and the advance ledger',
    owner: 't_rfq_advance',
    foreign: { shortlistSupplierIds: ['sup-005'], shortlistReason: 'x' },
    read: (r) => [r.stage, r.invitedSupplierIds, r.stageHistory],
  },
  {
    name: 'the conclude reason and day',
    owner: 't_rfq_conclude',
    foreign: { concludeReason: 'not a conclude' },
    read: (r) => [r.concludeReason, r.concludedAt],
  },
  {
    // RFx-2 — the questionnaire is written on a Draft only, by its own verb.
    name: 'the questionnaire',
    owner: 't_rfq_questionnaire_set',
    foreign: { questions: [{ id: 'q1', prompt: 'Smuggled?', type: 'yes_no', required: true }] },
    read: (r) => r.questionnaire,
  },
];

// ── One walk per verb: an event the verb is legal on, and its own payload ───
//
// `payload` is the least the verb needs to pass its own checks. A verb with no
// walk here fails the population test below rather than going unprobed.
interface Walk {
  readonly setup: () => Promise<string>;
  readonly payload: (rfqId: string) => Record<string, unknown>;
}

const openRfq = async (): Promise<string> => {
  const id = await raise();
  await ok(rfqVerb('t_rfq_publish', id));
  return id;
};
const closedRfi = async (): Promise<string> => {
  const id = await raise('RFI');
  await ok(rfqVerb('t_rfq_publish', id));
  for (const s of THREE) {
    await ok(
      svc.dispatch(supplier(s), {
        transitionId: 't_stageresponse_submit',
        entity: 'stageResponse',
        payload: { rfqId: id, supplierId: s },
      }),
    );
  }
  await ok(rfqVerb('t_rfq_close', id));
  return id;
};

let quotedId = '';
const WALKS: Readonly<Record<string, Walk>> = {
  t_rfq_questionnaire_set: {
    setup: () => raise('RFI'),
    payload: () => ({
      questions: [{ id: 'q1', prompt: 'Can you supply this format?', type: 'yes_no', required: true }],
    }),
  },
  t_rfq_publish: { setup: () => raise(), payload: () => ({}) },
  t_rfq_close: { setup: openRfq, payload: () => ({}) },
  t_rfq_award: {
    setup: async () => {
      const id = await openRfq();
      quotedId = await quote('sup-005', id);
      return id;
    },
    payload: () => ({ awardedSupplierId: 'sup-005', awardedQuotationId: quotedId }),
  },
  t_rfq_fx_pin: {
    setup: openRfq,
    payload: () => ({ quote: 'USD', rate: 16_250, asOf: '2026-09-01', source: 'MANUAL' }),
  },
  t_rfq_advance: {
    setup: closedRfi,
    payload: () => ({ shortlistSupplierIds: THREE, responseDeadline: LATER }),
  },
  t_rfq_conclude: { setup: openRfq, payload: () => ({ concludeReason: 'Nobody was able.' }) },
  t_rfq_cancel: { setup: () => raise(), payload: () => ({}) },
  t_rfq_reopen: {
    setup: async () => {
      const id = await openRfq();
      await ok(rfqVerb('t_rfq_close', id));
      return id;
    },
    payload: () => ({}),
  },
};

const VERBS = getFlow('rfq')!
  .transitions.filter((t) => t.from.length > 0)
  .map((t) => t.id);

beforeEach(() => {
  stageResponseStore.reset();
  quotationStore.reset();
  rfqStore.reset();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('A · the measured dispatch: a hand-made close carrying a rate and an awardee', () => {
  it('writes neither — the event is Closed and nothing else moved', async () => {
    const id = await openRfq();
    const res = await rfqVerb('t_rfq_close', id, {
      quote: 'XXX',
      rate: 'not a rate',
      asOf: 'never',
      source: 'SOMEBODY_SAID',
      awardedSupplierId: 'sup-999',
      awardedQuotationId: 'q-does-not-exist',
    });
    expect(res.status, res.reason).toBe('done');
    const after = rfqStore.get(id)!;
    expect(after.status).toBe('Closed');
    expect(after.fxPins).toBeUndefined();
    expect(after.awardedSupplierId).toBeUndefined();
    expect(after.awardedQuotationId).toBeUndefined();
  });

  it('KNOWN-GOOD — the pin verb still appends a well-formed rate, and refuses that one', async () => {
    const id = await openRfq();
    await ok(rfqVerb('t_rfq_fx_pin', id, { quote: 'USD', rate: 16_250, asOf: '2026-09-01', source: 'MANUAL' }));
    expect(rfqStore.get(id)!.fxPins).toHaveLength(1);
    expect(rfqStore.get(id)!.fxPins![0]).toMatchObject({ quote: 'USD', rate: 16_250 });
    const bad = await rfqVerb('t_rfq_fx_pin', id, {
      quote: 'XXX',
      rate: 'not a rate',
      asOf: 'never',
      source: 'SOMEBODY_SAID',
    });
    expect(bad.status).toBe('failed');
    expect(rfqStore.get(id)!.fxPins).toHaveLength(1);
  });

  it('KNOWN-GOOD — the award verb still records its awardee and the day', async () => {
    const id = await openRfq();
    const q = await quote('sup-005', id);
    await ok(rfqVerb('t_rfq_award', id, { awardedSupplierId: 'sup-005', awardedQuotationId: q }));
    const after = rfqStore.get(id)!;
    expect(after.status).toBe('Awarded');
    expect(after.awardedSupplierId).toBe('sup-005');
    expect(after.awardedQuotationId).toBe(q);
    expect(after.awardedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('B · every verb × every guarded field group, derived from the flow', () => {
  it('POPULATION — every non-creation verb on the flow has a walk, and every owner is one of them', () => {
    expect(VERBS).toContain('t_rfq_close');
    expect(VERBS).toContain('t_rfq_award');
    expect(VERBS).not.toContain('t_rfq_create');
    expect(VERBS.filter((v) => !WALKS[v])).toEqual([]);
    for (const g of GUARDED) expect(VERBS, g.name).toContain(g.owner);
  });

  const PAIRS = VERBS.flatMap((verb) =>
    GUARDED.filter((g) => g.owner !== verb).map((g) => ({ verb, group: g.name, g })),
  );

  it.each(PAIRS)('$verb carrying $group writes none of it', async ({ verb, g }) => {
    const walk = WALKS[verb];
    const id = await walk.setup();
    const before = g.read(rfqStore.get(id)!);
    const res = await rfqVerb(verb, id, { ...g.foreign, ...walk.payload(id) });
    // A verb may REFUSE the foreign keys (reopen refuses a shortlist). Refused
    // or applied, the group it does not own is where it was.
    expect(['done', 'failed'], res.reason).toContain(res.status);
    expect(g.read(rfqStore.get(id)!), `${verb} moved ${g.name}`).toEqual(before);
  });

  it.each(GUARDED)('KNOWN-GOOD — $owner writes $name', async (g) => {
    const walk = WALKS[g.owner];
    const id = await walk.setup();
    const before = g.read(rfqStore.get(id)!);
    await ok(rfqVerb(g.owner, id, walk.payload(id)));
    expect(g.read(rfqStore.get(id)!)).not.toEqual(before);
  });
});
