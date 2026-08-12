// ─────────────────────────────────────────────────────────────────────────────
// GL-1 · WHERE A TERM APPEARS — derived from the transition registry, at read
// time. **NOTHING HERE IS AUTHORED, AND THAT IS THE ONLY REASON IT IS WORTH
// RENDERING.** A hand-written "appears in: goods receipt, invoice" beside a
// definition is a second copy of the machine, and the second copy is the one
// that rots silently — the exact failure PF-1 was built to avoid.
//
// ── THE MATCH IS EXACT STRING IDENTITY, AND THAT IS A CHOICE WITH A COST ─────
//   A term appears where its literal spelling is one of the registry's OWN
//   identifiers — a declared state, a transition id, a required field, a policy
//   hook name. Nothing is normalised, stemmed, lower-cased or fuzzy-matched.
//
//   The cost, stated rather than hidden: **THE MATCH IS BLIND TO SYNONYMY AND
//   CREDULOUS ABOUT HOMONYMY.** `ComplianceDisplayStatus.'Under Review'` matches
//   the `quotation` machine's `Under Review` state, and those are two different
//   ideas wearing one word. The page says so, in the reader's language, beside
//   the list — because a shared word across three machines is EXACTLY the kind
//   of thing the procurement review exists to correct, and hiding it behind a
//   cleverer matcher would hide the finding too.
//
//   The alternative — an authored per-term appearance list — was rejected under
//   the standing heuristic: a list written today is a list wrong next month, and
//   nothing would fail when it went wrong.
//
// ── WHY THIS LIVES UNDER `pages-v2/`, NOT `lib/glossary/` ───────────────────
//   It takes a VALUE dependency on `services/transitions`. `lib/glossary` holds
//   only type-imports of the unions it defines (the `complianceView.ts`
//   lib → services precedent is TYPE-ONLY, deliberately). Putting a runtime
//   services import into `lib/` would give the glossary contract a consumer it
//   was written not to have, so the derivation sits with its surface instead.
// ─────────────────────────────────────────────────────────────────────────────
import { getKnownFlows } from '../../services/transitions';
import { GLOSSARY_REGISTRIES, glossaryAnchor, type GlossaryEntry } from '../../lib/glossary';
import { REFUSALS_OUTSIDE_ENFORCEMENT } from '../../lib/enforcement';

/** How a term's spelling occurs in one machine. All four are registry facts. */
export type AppearanceKind = 'state' | 'transition' | 'field' | 'hook';

/** One machine a term's spelling occurs in, with what it occurs AS. */
export interface FlowAppearance {
  /** The flow's entity key, e.g. `compliance`. */
  readonly entity: string;
  /** Every role the word plays in this machine. Never empty. */
  readonly kinds: readonly AppearanceKind[];
  /** True when the flow declares this state as its starting point. */
  readonly isInitial: boolean;
  /** True when the flow declares this state as an ending. */
  readonly isTerminal: boolean;
  /** Transition ids that enter or leave the state (empty for non-state kinds). */
  readonly transitionIds: readonly string[];
}

/**
 * Every machine whose own identifiers include this exact word.
 *
 * ⚠️ **AN EMPTY RESULT IS A REAL ANSWER AND MUST RENDER AS NOTHING.** Most
 * glossary terms are refusal reasons and governance vocabulary — words the
 * machines never spell, because a refusal is what happens INSTEAD of a
 * transition. An empty list means the word is not in any transition table, which
 * is true and is not a defect; inventing a plausible list to fill the space is
 * how a reference page starts lying.
 */
export function appearancesOf(term: string): readonly FlowAppearance[] {
  const out: FlowAppearance[] = [];
  for (const flow of getKnownFlows()) {
    const kinds = new Set<AppearanceKind>();
    const transitionIds: string[] = [];

    if (flow.states.includes(term)) kinds.add('state');
    for (const t of flow.transitions) {
      if (t.id === term) kinds.add('transition');
      if (t.requiredFields.includes(term)) kinds.add('field');
      if (t.policyHooks.includes(term)) kinds.add('hook');
      if (t.from.includes(term) || t.to === term) transitionIds.push(t.id);
    }
    if (kinds.size === 0) continue;

    out.push({
      entity: flow.entity,
      kinds: [...kinds],
      isInitial: flow.initial === term,
      isTerminal: flow.terminals.includes(term),
      // Only meaningful for a state; a transition-id match has no edges of its
      // own to report, and reporting the flow's whole edge set would be noise.
      transitionIds: kinds.has('state') ? transitionIds : [],
    });
  }
  return out;
}

// ─── Related concepts ────────────────────────────────────────────────────────

/**
 * WHY two terms are related. Both arms are DERIVED FROM SHIPPED DECLARATIONS,
 * not from a hand-drawn concept map — there is no third arm, and adding one
 * would mean finding a third relationship the code already states.
 */
export type RelationKind =
  /** The same word is a defined term in another registered vocabulary. Derived
   *  by key identity across `GLOSSARY_REGISTRIES`. The halal/BPOM twins are the
   *  whole reason this exists: separate unions, identical members BY DESIGN, so
   *  a reader who found one should be told the other is not it. */
  | 'shared-word'
  /** `enforcement.ts` declares, `satisfies`-pinned, that these refusal shapes sit
   *  OUTSIDE the enforcement domain — they are the reason a check comes back
   *  `UNANSWERED` rather than `ADVERSE`. The relation is read from
   *  `REFUSALS_OUTSIDE_ENFORCEMENT`, so it cannot disagree with the census. */
  | 'outside-enforcement';

export interface RelatedTerm {
  readonly sourceType: string;
  readonly term: string;
  readonly relation: RelationKind;
}

/** The one governed verdict the out-of-domain refusals resolve to. */
const UNANSWERED_VERDICT = { sourceType: 'GovernedVerdict', term: 'UNANSWERED' } as const;

/**
 * Every term the shipped code relates this one to. Empty where the code states
 * no relationship — which is most of them, and renders as nothing.
 */
export function relatedTo(sourceType: string, term: string): readonly RelatedTerm[] {
  const out: RelatedTerm[] = [];

  for (const r of GLOSSARY_REGISTRIES) {
    if (r.sourceType === sourceType) continue;
    if (Object.prototype.hasOwnProperty.call(r.entries, term)) {
      out.push({ sourceType: r.sourceType, term, relation: 'shared-word' });
    }
  }

  const outsideEnforcement = REFUSALS_OUTSIDE_ENFORCEMENT.includes(term);
  if (outsideEnforcement && sourceType !== UNANSWERED_VERDICT.sourceType) {
    out.push({ ...UNANSWERED_VERDICT, relation: 'outside-enforcement' });
  }
  // The same declaration read the other way: standing on UNANSWERED, these are
  // the absences it must never be confused with. Same array, no second list.
  if (sourceType === UNANSWERED_VERDICT.sourceType && term === UNANSWERED_VERDICT.term) {
    for (const r of GLOSSARY_REGISTRIES) {
      for (const reason of REFUSALS_OUTSIDE_ENFORCEMENT) {
        if (Object.prototype.hasOwnProperty.call(r.entries, reason)) {
          out.push({ sourceType: r.sourceType, term: reason, relation: 'outside-enforcement' });
        }
      }
    }
  }
  return out;
}

// ─── The flattened, page-ready view ──────────────────────────────────────────

/** ONE row of the glossary surface. Definition authored; everything else read. */
export interface GlossaryTermView {
  readonly sourceType: string;
  readonly sourceFile: string;
  readonly term: string;
  readonly anchor: string;
  readonly entry: GlossaryEntry;
  readonly appearances: readonly FlowAppearance[];
  readonly related: readonly RelatedTerm[];
}

/**
 * The whole glossary, derived once. Order follows `GLOSSARY_REGISTRIES` and then
 * key-insertion order inside each registry — which, for the refusal vocabularies,
 * is the PRECEDENCE the checks evaluate in. Sorting alphabetically would destroy
 * a fact about the machine to gain nothing a search box does not already give.
 */
export function buildGlossaryView(): readonly GlossaryTermView[] {
  return GLOSSARY_REGISTRIES.flatMap((r) =>
    Object.entries(r.entries).map(([term, entry]) => ({
      sourceType: r.sourceType as string,
      sourceFile: r.sourceFile as string,
      term,
      anchor: glossaryAnchor({ sourceType: r.sourceType, term }),
      entry: entry as GlossaryEntry,
      appearances: appearancesOf(term),
      related: relatedTo(r.sourceType, term),
    })),
  );
}
