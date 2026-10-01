// ────────────────────────────────────────────────────────────────────────────
// G1 · THE GUIDE REGISTRY'S SHAPE (Design 5 §B.1).
//
// A guide is authored as markdown in `docs/guides/<entity>.<locale>.md` and
// parsed at build by `scripts/guides/build.mjs` into `generated/guides.json`.
// These types are what the app, the page and the co-pilot (SE-20) read. The
// bilateral gates that hold the JSON to the tree are `guides.test.ts`.
// ────────────────────────────────────────────────────────────────────────────

import type { TransitionId } from '../services/transitions/schema';

export type GuideLocale = 'en' | 'id';

/** Who owns the ACT — an unwired flow names its external owner (D7). */
export type GuideOwner = 'portal' | 's4hana' | 'tms' | 'bank' | 'substrate';

export type GuideStepKind =
  | 'operator-action'
  | 'system-driven'
  | 'cascade'
  | 'external-fact'
  | 'records-fact'
  | 'not-active'
  | 'modelled-not-active';

export type GuideSectionKey =
  | 'summary'
  | 'lifecycle'
  | 'steps'
  | 'forks'
  | 'flags'
  | 'linked'
  | 'history'
  | 'troubleshooting'
  | 'testdata';

export interface GuideStep {
  readonly transitionId: TransitionId;
  readonly label: string;
  readonly stepKind: GuideStepKind;
  /** The lane(s), as text. */
  readonly role: string;
  /** The block's `From → to` line, as text. */
  readonly fromTo: string;
  readonly operator: { readonly where: string; readonly do: string; readonly fill: string };
  readonly tester: { readonly expectedState: string; readonly confirm: string; readonly triggerEvent: TransitionId };
  /** Policy hooks, plain. */
  readonly checks: string;
  readonly glossary: readonly string[];
  readonly honesty: string;
  /** The hidden `<!-- src -->` notes, kept for the reviewer and the co-pilot. */
  readonly sources: readonly string[];
}

export interface GuideTestRow {
  readonly state: string;
  readonly fixtureIds: readonly string[];
  readonly number?: string;
  readonly note?: string;
}

export interface ProcessGuide {
  readonly entity: string;
  readonly locale: GuideLocale;
  readonly title: string;
  readonly wired: boolean;
  readonly owner: GuideOwner;
  readonly sourceSha: string;
  /** Repo-relative path of the markdown this was parsed from. */
  readonly sourceFile: string;
  /** The front matter's transition list, verbatim — the bilateral pin. */
  readonly transitions: readonly TransitionId[];
  /** The transition blocks in file order, DUPLICATES KEPT, so the gate can see one. */
  readonly stepOrder: readonly TransitionId[];
  /** Markdown per section, the `<!-- src -->` notes lifted out. `steps` is any prose before the first block. */
  readonly sections: Readonly<Record<GuideSectionKey, string>>;
  readonly sectionSources: Readonly<Record<GuideSectionKey, readonly string[]>>;
  readonly steps: Readonly<Record<TransitionId, GuideStep>>;
  readonly testData: readonly GuideTestRow[];
}

export interface GuideRegistry {
  readonly schema: 1;
  readonly guides: readonly ProcessGuide[];
}
