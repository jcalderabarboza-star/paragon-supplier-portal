// ────────────────────────────────────────────────────────────────────────────
// B4a · the forecastPublication CommandTarget, the SOMO plan feed it opens
// drafts from, and the publication hooks (Design 2 §2.1).
//
// The hooks are bound HERE, in the mock layer, beside the store and the feed
// they read — the requirement-response hooks' precedent: a rule that needs a
// store or a producer's feed lives where the data does, and the flow file only
// names it.
//
// ⚠️ BUYER-ONLY. `readScopeOwner` is `null` for every publication: a supplier
// reads a publication through `getPublications` and never acts on one, so a
// supplier scope is denied at SCOPE before the role gate (§86).
// ────────────────────────────────────────────────────────────────────────────

import { bindPolicyHook, POLICY_HOOKS, type CommandTarget } from '../../transitions';
import { asActorAttribution } from '../../../lib/enforcement';
import { normalizeQty, type NumberConvention } from '../../../lib/localeNumber';
import {
  carriedLines,
  commitmentClassFor,
  isKnownMaterial,
  lineLabel,
  linesWithoutClass,
  publicationIdFor,
  requireUom,
  responseDueAtFor,
  sdcClock,
  totalKey,
  unsignedFirmLines,
  type AllocationBasis,
  type ForecastLine,
  type PublicationLedgerEntry,
} from '../../sdc';
import type { QueryScope } from '../types';
import { parseHorizon, type BucketGrain } from '../../planning/bucket';
import { planningMaster } from '../../planning/somoFixture';
import { forecastPublicationStore, type PublicationRecord } from './stores/forecastPublicationStore';
import { collaboratingSuppliers, somoPlanFeed } from './publicationFeed';

// B4b · the SOMO plan feed moved to `publicationFeed.ts`; re-exported for the
// callers that imported it from here.
export { somoPlanFeed, type PlanFeedEntry } from './publicationFeed';

/** The session's person, when one resolved — a stamp, never a label (D-ID-7). */
const personOf = (scope: QueryScope): string | null => {
  const actor = asActorAttribution(scope.actor);
  return actor && actor.kind === 'RESOLVED' ? actor.person.personId : null;
};

const withRow = (r: PublicationRecord, row: Omit<PublicationLedgerEntry, 'seq'>): readonly PublicationLedgerEntry[] =>
  Object.freeze([...r.ledger, Object.freeze({ ...row, seq: forecastPublicationStore.nextSeq() })]);

// ─── Verb discrimination ────────────────────────────────────────────────────

/**
 * Which statePreserving verb an apply on `Draft` is. `applyTransition` is not
 * handed the transition id, so the verbs are told apart by the field each one
 * REQUIRES: only allocate requires `forecastQty`. The `pslWriteVerbFor`
 * precedent; `forecastPublication.test.ts` pins the field sets disjoint on it.
 */
export function publicationVerbFor(toState: string, payload: Record<string, unknown>): 'allocate' | 'approve' | null {
  if (toState !== 'Draft') return null;
  return 'forecastQty' in payload ? 'allocate' : 'approve';
}

// ⚠️ `carried-forward` is deliberately NOT here: only the carry on open mints it.
// A planner's allocate claiming it would be the split pretending it was copied.
const ALLOCATION_BASES: readonly AllocationBasis[] = ['planner-split', 'quota', 'award-history'];

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const lineMatches = (l: ForecastLine, code: string, bucket: string, supplierId: string) =>
  l.materialCode === code && l.periodBucket === bucket && l.supplierId === supplierId;

// ─── The target ─────────────────────────────────────────────────────────────

export const forecastPublicationTarget: CommandTarget = {
  readState: (id) => forecastPublicationStore.get(id)?.state ?? null,
  readScopeOwner: () => null,
  readEntity: (id) => forecastPublicationStore.get(id) ?? null,
  // A buyer creation, owned by no supplier — the RFQ / PR buyer-verb pattern.
  creationOwner: () => null,
  create: (payload, toState, scope) => {
    const planVersion = str(payload.planVersion);
    const grain = str(payload.grain) as BucketGrain;
    const horizon = (payload.horizon as readonly string[]).map(String);
    const feed = somoPlanFeed().get(planVersion)!; // PUB_PLANVERSION_KNOWN ran
    const publicationId = publicationIdFor(grain, planVersion, forecastPublicationStore.nextRevision(grain, planVersion));
    const totals = Object.freeze(feed.totalsFor(horizon));
    // B4b · a revision starts from the current publication's split when the
    // planner asks for it (PUB_CARRY_FROM_CURRENT ran); otherwise it is empty.
    const from = typeof payload.carryForwardFrom === 'string' ? forecastPublicationStore.get(payload.carryForwardFrom) : undefined;
    const now = sdcClock.now();
    forecastPublicationStore.put({
      publicationId,
      state: toState as PublicationRecord['state'],
      planVersion,
      grain,
      horizon: Object.freeze([...horizon]),
      sourceRef: str(payload.sourceRef),
      totals,
      // Without a carry-forward the split is EMPTY: no supplier has been given
      // anything yet. With one, the carried lines keep their class and lose
      // their signature (`carriedLines`).
      lines: Object.freeze(from ? [...carriedLines(from.lines, horizon, totals)] : []),
      provenance: feed.provenance,
      openedAt: now,
      ...(from ? { carriedFrom: from.publicationId } : {}),
      ledger: Object.freeze([
        Object.freeze({ verb: 't_publication_open' as const, at: now, seq: forecastPublicationStore.nextSeq(), personId: personOf(scope) }),
      ]),
    });
    return { entityId: publicationId };
  },
  applyTransition: (id, toState, payload, scope) => {
    const r = forecastPublicationStore.get(id);
    if (!r) return;
    const now = sdcClock.now();
    if (toState === 'Published') {
      forecastPublicationStore.put({
        ...r,
        state: 'Published',
        publishedAt: now,
        responseDueAt: responseDueAtFor(now),
        ledger: withRow(r, { verb: 't_publication_publish', at: now, personId: personOf(scope) }),
      });
      return;
    }
    if (toState === 'Superseded') {
      const by = str(payload.supersededBy);
      // A cascade act: the machine retired it, so no person is named.
      forecastPublicationStore.put({
        ...r,
        state: 'Superseded',
        ...(by ? { supersededBy: by } : {}),
        ledger: withRow(r, { verb: 't_publication_supersede', at: now, personId: null }),
      });
      return;
    }
    if (toState === 'Withdrawn') {
      const reason = str(payload.reason).trim();
      forecastPublicationStore.put({
        ...r,
        state: 'Withdrawn',
        withdrawnReason: reason,
        ledger: withRow(r, { verb: 't_publication_withdraw', at: now, personId: personOf(scope), reason }),
      });
      return;
    }
    if (toState === 'Discarded') {
      // SDC-5 · the draft ends; its split is kept on the record, read by nobody
      // as a plan (`draftFor` and `currentFor` both pass it over).
      forecastPublicationStore.put({
        ...r,
        state: 'Discarded',
        ledger: withRow(r, { verb: 't_publication_discard', at: now, personId: personOf(scope) }),
      });
      return;
    }
    const verb = publicationVerbFor(toState, payload);
    const code = str(payload.materialCode);
    const bucket = str(payload.periodBucket);
    const supplierId = str(payload.supplierId);
    if (verb === 'allocate') {
      const qty = payload.forecastQty as number;
      const rest = r.lines.filter((l) => !lineMatches(l, code, bucket, supplierId));
      // A ZERO un-allocates the supplier — an absent line, never a zero line.
      // A changed split is a NEW split: any approval it carried is dropped,
      // because the signature was on the old quantity.
      const lines =
        qty === 0
          ? rest
          : [
              ...rest,
              Object.freeze({
                materialCode: code,
                supplierId,
                periodBucket: bucket,
                forecastQty: qty,
                uom: requireUom(code, planningMaster()),
                commitmentClass: commitmentClassFor(r.horizon, bucket),
                allocation: Object.freeze({
                  materialPeriodTotal: r.totals[totalKey(code, bucket)],
                  basis: payload.basis as AllocationBasis,
                }),
                provenance: r.provenance,
              }),
            ];
      forecastPublicationStore.put({ ...r, lines: Object.freeze(lines) });
      return;
    }
    if (verb === 'approve') {
      // THE SIGNATURE IS THE SESSION'S ACTOR, never a payload field (C10 §6.2),
      // and the stamp carries the `personId` ONLY (D-ID-7) — the label, with
      // its (SAMPLE) marker, is resolved at read by `personLabel`.
      const actor = asActorAttribution(scope.actor);
      if (!actor || actor.kind !== 'RESOLVED') return; // PUB_ACTOR_ATTRIBUTED ran
      const lines = r.lines.map((l) =>
        lineMatches(l, code, bucket, supplierId)
          ? Object.freeze({
              ...l,
              allocation: Object.freeze({ ...l.allocation, approvedBy: actor.person.personId, approvedAt: now }),
            })
          : l,
      );
      forecastPublicationStore.put({ ...r, lines: Object.freeze(lines) });
    }
  },
};

/** The Published publication of a grain other than `exceptId` — what a publish supersedes. */
export const previouslyPublished = (grain: BucketGrain, exceptId: string): readonly PublicationRecord[] =>
  forecastPublicationStore.all().filter((r) => r.state === 'Published' && r.grain === grain && r.publicationId !== exceptId);

// ─── The hooks ──────────────────────────────────────────────────────────────

const draftOf = (target: CommandTarget, entityId: string): PublicationRecord | null =>
  (target.readEntity(entityId) as PublicationRecord | null) ?? null;

bindPolicyHook(POLICY_HOOKS.PUB_HORIZON_ONE_GRAIN, ({ payload }) => {
  const h = payload.horizon;
  if (!Array.isArray(h) || h.some((b) => typeof b !== 'string')) {
    return { ok: false, reason: 'PUB_HORIZON_ONE_GRAIN: horizon must be a list of bucket ids' };
  }
  const parsed = parseHorizon(h as string[]);
  if (!parsed.ok) return { ok: false, reason: `PUB_HORIZON_ONE_GRAIN: the horizon is refused (${parsed.reason})` };
  if (parsed.grain !== payload.grain) {
    return { ok: false, reason: `PUB_HORIZON_ONE_GRAIN: the horizon is ${parsed.grain}-grain but grain says ${String(payload.grain)}` };
  }
  return { ok: true };
});

bindPolicyHook(POLICY_HOOKS.PUB_PLANVERSION_KNOWN, ({ payload }) => {
  const entry = somoPlanFeed().get(str(payload.planVersion));
  if (!entry) {
    return { ok: false, reason: `PUB_PLANVERSION_KNOWN: SOMO has emitted no plan version ${JSON.stringify(payload.planVersion)}` };
  }
  if (entry.sourceRef !== payload.sourceRef) {
    return {
      ok: false,
      reason: `PUB_PLANVERSION_KNOWN: plan version ${String(payload.planVersion)} arrived in ${entry.sourceRef}, not ${JSON.stringify(payload.sourceRef)}`,
    };
  }
  return { ok: true };
});

bindPolicyHook(POLICY_HOOKS.PUB_MATERIAL_KNOWN, ({ payload }) =>
  isKnownMaterial(str(payload.materialCode), planningMaster())
    ? { ok: true }
    : { ok: false, reason: `PUB_MATERIAL_KNOWN: ${JSON.stringify(payload.materialCode)} is not in the planning master` },
);

bindPolicyHook(POLICY_HOOKS.PUB_BASIS_KNOWN, ({ payload }) =>
  (ALLOCATION_BASES as readonly unknown[]).includes(payload.basis)
    ? { ok: true }
    : { ok: false, reason: `PUB_BASIS_KNOWN: basis ${JSON.stringify(payload.basis)} is not one of ${ALLOCATION_BASES.join(' | ')}` },
);

bindPolicyHook(POLICY_HOOKS.PUB_LINE_IN_HORIZON, ({ payload, target, entityId }) => {
  const d = draftOf(target, entityId);
  const bucket = str(payload.periodBucket);
  if (!d || !d.horizon.includes(bucket)) {
    return { ok: false, reason: `PUB_LINE_IN_HORIZON: ${JSON.stringify(bucket)} is not in this publication's horizon` };
  }
  if (d.totals[totalKey(str(payload.materialCode), bucket)] === undefined) {
    return {
      ok: false,
      reason: `PUB_LINE_IN_HORIZON: SOMO gave no total for ${String(payload.materialCode)} in ${bucket} — there is nothing to split`,
    };
  }
  return { ok: true };
});

bindPolicyHook(POLICY_HOOKS.PUB_QTY_FLOOR, ({ payload }) => {
  const q = payload.forecastQty;
  if (typeof q !== 'number' || !Number.isFinite(q)) return { ok: false, reason: 'PUB_QTY_FLOOR: forecastQty is not a finite number' };
  if (q < 0) return { ok: false, reason: `PUB_QTY_FLOOR: forecastQty is ${q} — an allocation cannot be negative` };
  return { ok: true };
});

bindPolicyHook(POLICY_HOOKS.PUB_QTY_AGREES, ({ payload }) => {
  const raw = payload.forecastQtyRaw;
  if (typeof raw !== 'string') return { ok: false, reason: 'PUB_QTY_AGREES: forecastQtyRaw must be the typed text' };
  const conv = payload.numberConvention;
  if (conv !== undefined && conv !== 'id' && conv !== 'en') {
    return { ok: false, reason: `PUB_QTY_AGREES: numberConvention must be 'id' or 'en' when present, got ${JSON.stringify(conv)}` };
  }
  const parsed = normalizeQty(raw, conv as NumberConvention | undefined);
  if (!parsed.ok) return { ok: false, reason: `PUB_QTY_AGREES: forecastQtyRaw is unreadable (${parsed.reason})` };
  if (parsed.value !== payload.forecastQty) {
    return { ok: false, reason: `PUB_QTY_AGREES: '${raw}' reads as ${parsed.value}, but the command allocates ${String(payload.forecastQty)}` };
  }
  return { ok: true };
});

bindPolicyHook(POLICY_HOOKS.PUB_ALLOC_WITHIN_TOTAL, ({ payload, target, entityId }) => {
  const d = draftOf(target, entityId);
  const code = str(payload.materialCode);
  const bucket = str(payload.periodBucket);
  const total = d?.totals[totalKey(code, bucket)];
  if (!d || total === undefined) return { ok: false, reason: 'PUB_ALLOC_WITHIN_TOTAL: no material-period total to measure against' };
  const others = d.lines
    .filter((l) => l.materialCode === code && l.periodBucket === bucket && l.supplierId !== payload.supplierId)
    .reduce((s, l) => s + l.forecastQty, 0);
  const sum = others + (payload.forecastQty as number);
  if (sum > total) {
    return {
      ok: false,
      reason: `PUB_ALLOC_WITHIN_TOTAL: the suppliers would be allocated ${sum} of ${code} in ${bucket}, above SOMO's total of ${total}`,
    };
  }
  return { ok: true };
});

bindPolicyHook(POLICY_HOOKS.PUB_LINE_IS_FIRM, ({ payload, target, entityId }) => {
  const line = draftOf(target, entityId)?.lines.find((l) =>
    lineMatches(l, str(payload.materialCode), str(payload.periodBucket), str(payload.supplierId)),
  );
  if (!line) return { ok: false, reason: 'PUB_LINE_IS_FIRM: there is no such allocation to approve' };
  if (line.commitmentClass !== 'firm') {
    return { ok: false, reason: `PUB_LINE_IS_FIRM: the line is ${line.commitmentClass} — only a firm split is signed` };
  }
  return { ok: true };
});

bindPolicyHook(POLICY_HOOKS.PUB_ACTOR_ATTRIBUTED, ({ scope }) => {
  const actor = asActorAttribution(scope.actor);
  if (!actor || actor.kind !== 'RESOLVED') {
    return {
      ok: false,
      reason:
        'PUB_ACTOR_ATTRIBUTED: a firm split is signed by a person, and this seat names nobody — ' +
        'adopt a person (a sample person is admitted, and marked as one) before approving',
    };
  }
  return { ok: true };
});

bindPolicyHook(POLICY_HOOKS.PUB_HAS_LINES, ({ target, entityId }) =>
  (draftOf(target, entityId)?.lines.length ?? 0) > 0
    ? { ok: true }
    : { ok: false, reason: 'PUB_HAS_LINES: the draft allocates nothing to any supplier' },
);

bindPolicyHook(POLICY_HOOKS.PUB_FIRM_LINES_APPROVED, ({ target, entityId }) => {
  // The SAME predicate the publication panel asks before it offers Publish.
  const unsigned = unsignedFirmLines(draftOf(target, entityId)?.lines ?? []);
  if (unsigned.length === 0) return { ok: true };
  return {
    ok: false,
    reason: 'PUB_FIRM_LINES_APPROVED: firm lines awaiting approval — ' + unsigned.map(lineLabel).join(', '),
  };
});

bindPolicyHook(POLICY_HOOKS.PUB_TEXT_AUTHORED, ({ payload }) =>
  str(payload.reason).trim().length >= 3
    ? { ok: true }
    : { ok: false, reason: 'PUB_TEXT_AUTHORED: a withdrawal must say why, in words' },
);

// ─── B4b · the two hooks B4a left out, and the carry-forward ────────────────

bindPolicyHook(POLICY_HOOKS.PUB_SUPPLIER_COLLABORATED, ({ payload }) => {
  const code = str(payload.materialCode);
  const supplierId = str(payload.supplierId);
  if (collaboratingSuppliers(code).has(supplierId)) return { ok: true };
  return {
    ok: false,
    reason:
      `PUB_SUPPLIER_COLLABORATED: ${supplierId} has no relationship with ${code} and has never been allocated it — ` +
      'a new pairing is not opened from a plan',
  };
});

bindPolicyHook(POLICY_HOOKS.PUB_CLASS_PROJECTION_PRESENT, ({ target, entityId }) => {
  const classless = linesWithoutClass(draftOf(target, entityId)?.lines ?? []);
  if (classless.length === 0) return { ok: true };
  return {
    ok: false,
    reason: 'PUB_CLASS_PROJECTION_PRESENT: lines without a commitment class — ' + classless.map(lineLabel).join(', '),
  };
});

bindPolicyHook(POLICY_HOOKS.PUB_ONE_OPEN_DRAFT, ({ payload }) => {
  const open = forecastPublicationStore.draftFor(str(payload.grain) as BucketGrain);
  if (!open) return { ok: true };
  return {
    ok: false,
    reason:
      `PUB_ONE_OPEN_DRAFT: ${open.publicationId} is already open for the ${String(payload.grain)} grain — ` +
      'publish it or discard it before opening another',
  };
});

bindPolicyHook(POLICY_HOOKS.PUB_CARRY_FROM_CURRENT, ({ payload }) => {
  const from = payload.carryForwardFrom;
  if (from === undefined) return { ok: true };
  const current = forecastPublicationStore.currentFor(str(payload.grain) as BucketGrain);
  if (typeof from === 'string' && current && current.publicationId === from) return { ok: true };
  return {
    ok: false,
    reason:
      `PUB_CARRY_FROM_CURRENT: ${JSON.stringify(from)} is not the current published ${String(payload.grain)} publication` +
      (current ? ` (${current.publicationId} is)` : ' (there is none)'),
  };
});
