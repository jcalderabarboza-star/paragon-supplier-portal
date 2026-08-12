import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, GitBranch, Link2, HelpCircle } from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import SearchBar from '../components/ui-v2/SearchBar';
import StatusPill from '../components/ui-v2/StatusPill';
import Data from '../components/ui-v2/Data';
import { GLOSSARY_REGISTRIES } from '../lib/glossary';
import {
  buildGlossaryView,
  type FlowAppearance,
  type GlossaryTermView,
  type RelatedTerm,
} from './glossary/appearances';

// ────────────────────────────────────────────────────────────────────────────
// GL-1 · THE GLOSSARY SURFACE — the page GL-0 shipped headless.
//
// ⚠️ **THIS IS NOT A REFERENCE PAGE, AND TREATING IT AS ONE MISSES WHY IT
// EXISTS.** The procurement review is running. A glossary is what makes their
// vocabulary corrections CHEAP: a term is ONE definition in ONE place, so
// *"that is not what we call a quality hold"* becomes an EDIT rather than an
// archaeology across nineteen surfaces. Everything about this page is arranged
// for that — the source union is printed beside every term so a reviewer can
// say exactly which word they mean, and the honest marker says out loud that
// the definitions are provisional and being ELICITED (§37), not published.
//
// ── WHAT IS REAL HERE, AND WHAT IS NOT (D-CENSUS-8) ────────────────────────
//   REAL: the terms. Every word is a member of a closed union the portal ships,
//   `satisfies`-pinned at build time — a word cannot appear without the code
//   having it, and cannot survive the code dropping it.
//   REAL: the appearance lists and the related-term links. Both derived at read
//   time (`glossary/appearances.ts`) from `getKnownFlows()` and from
//   `REFUSALS_OUTSIDE_ENFORCEMENT`. Neither is authored, and where a derivation
//   comes back empty NOTHING renders — no placeholder, no plausible guess.
//   AUTHORED: every definition. Written by hand, both locales, beside its union.
//   NOT ANSWERED: the remedy. See below.
//
// ── ⚠️ THE HALF THIS PAGE DOES NOT CLOSE ───────────────────────────────────
//   `HALAL-REFUSAL-DEAD-ENDS-01` has two halves. The DEFINITIONAL half closes
//   here: a refusal that told a clerk only that they were stuck can now be
//   looked up. **THE ROUTING HALF STAYS OPEN** — who rules on a halal
//   determination, where, and what happens to the delivery meanwhile
//   (D-COMP-HALAL-4). `remedyRoute` is declared and ABSENT on every entry, and
//   the page states the gap in the reader's own language rather than letting a
//   working link imply an answer that does not exist.
//
// ── FENCES THIS PAGE HOLDS ─────────────────────────────────────────────────
//   · NO KPI TERMS (GL-2). KPI names are free-text fixture fields; a glossary
//     over them would summarise fixtures.
//   · NO BENCHMARKS. An authored industry figure with no source is the
//     fabricated-claims class this tree spent five batches retracting.
//   · NO FLOW-STATE OR TRANSITION PROSE. `services/transitions/annotations.ts`
//     + `lib/i18n/processFlowPurpose.ts` ALREADY ARE that glossary, bilaterally
//     pinned to the registry. This page LINKS to Process Flows and does not
//     restate one word of it — a second copy is the half that goes wrong
//     silently, and that file's own header forbids it.
// ────────────────────────────────────────────────────────────────────────────

const APPEARANCE_KIND_KEY = {
  state: 'glossary.appears.kind.state',
  transition: 'glossary.appears.kind.transition',
  field: 'glossary.appears.kind.field',
  hook: 'glossary.appears.kind.hook',
} as const;

const RELATION_KEY = {
  'shared-word': 'glossary.related.sharedWord',
  'outside-enforcement': 'glossary.related.outsideEnforcement',
} as const;

/** The machines this word occurs in. Renders only when the derivation found some. */
const Appearances: React.FC<{ appearances: readonly FlowAppearance[] }> = ({ appearances }) => {
  const { t } = useTranslation();
  if (appearances.length === 0) return null;
  return (
    <div className="mt-3 border-t border-border-subtle pt-2.5">
      <span className="flex items-center gap-1.5 text-label uppercase tracking-wider text-text-tertiary">
        <GitBranch size={11} aria-hidden="true" />
        {t('glossary.appears.title')}
      </span>
      <ul className="mt-1.5 space-y-1">
        {appearances.map((a) => (
          <li key={a.entity} className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <Data className="text-[11px]">{a.entity}</Data>
            {a.kinds.map((k) => (
              <StatusPill key={k} variant="neutral" className="text-[10px]">
                {t(APPEARANCE_KIND_KEY[k])}
              </StatusPill>
            ))}
            {a.isInitial && (
              <span className="text-[10px] text-text-tertiary">{t('glossary.appears.initial')}</span>
            )}
            {a.isTerminal && (
              <span className="text-[10px] text-text-tertiary">{t('glossary.appears.terminal')}</span>
            )}
            {a.transitionIds.length > 0 && (
              <span className="text-[10px] text-text-tertiary">
                {t('glossary.appears.edges', { count: a.transitionIds.length })}
              </span>
            )}
          </li>
        ))}
      </ul>
      {/* The DEFERRAL, made navigable. What each state and verb is FOR is
          authored once, in `annotations.ts`, and rendered on Process Flows. A
          sentence about it here would be the second copy. */}
      <Link
        to="/buyer/process-flows"
        className="mt-1.5 inline-block text-[11px] text-teal hover:underline"
      >
        {t('glossary.appears.seeFlows')}
      </Link>
    </div>
  );
};

/** Terms the shipped code relates this one to. Absent where it relates none. */
const Related: React.FC<{
  related: readonly RelatedTerm[];
  onJump: (anchor: string) => void;
}> = ({ related, onJump }) => {
  const { t } = useTranslation();
  if (related.length === 0) return null;
  return (
    <div className="mt-3 border-t border-border-subtle pt-2.5">
      <span className="flex items-center gap-1.5 text-label uppercase tracking-wider text-text-tertiary">
        <Link2 size={11} aria-hidden="true" />
        {t('glossary.related.title')}
      </span>
      <ul className="mt-1.5 space-y-1">
        {related.map((r) => (
          <li key={`${r.relation}#${r.sourceType}.${r.term}`} className="text-[11px] leading-relaxed">
            <button
              type="button"
              onClick={() => onJump(`${r.sourceType}.${r.term}`)}
              className="text-teal hover:underline"
            >
              <Data className="text-[11px] text-teal">
                {r.sourceType}.{r.term}
              </Data>
            </button>
            <span className="text-text-tertiary"> — {t(RELATION_KEY[r.relation])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const TermCard: React.FC<{
  view: GlossaryTermView;
  indonesian: boolean;
  highlighted: boolean;
  onJump: (anchor: string) => void;
}> = ({ view, indonesian, highlighted, onJump }) => {
  const { t } = useTranslation();
  return (
    <article
      id={view.anchor}
      data-testid={`glossary-term-${view.anchor}`}
      aria-label={t('glossary.term.aria', { term: view.term })}
      className={`scroll-mt-8 rounded-md border bg-bg-surface p-4 ${
        highlighted ? 'border-teal ring-1 ring-teal/40' : 'border-border-subtle'
      }`}
    >
      <h3 className="flex flex-wrap items-baseline gap-2">
        <Data className="text-[14px]">{view.term}</Data>
        <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
          {t('glossary.term.definedBy')}{' '}
          <Data className="text-[10px] text-text-tertiary">{view.sourceType}</Data>
        </span>
      </h3>
      {/* THE ONE AUTHORED THING ON THE ROW. The active locale's sentence, read
          straight off the entry — there is no second store of definitions and no
          i18n key for one, which is what keeps a correction to one edit. */}
      <p className="mt-1.5 max-w-prose text-meta leading-relaxed text-text-secondary">
        {indonesian ? view.entry.id : view.entry.en}
      </p>
      <Data className="mt-1.5 block text-[10px] text-text-tertiary">{view.sourceFile}</Data>
      <Appearances appearances={view.appearances} />
      <Related related={view.related} onJump={onJump} />
    </article>
  );
};

const Glossary: React.FC = () => {
  const { t, i18n } = useTranslation();
  const indonesian = i18n.language?.toLowerCase().startsWith('id') ?? false;
  // Derived once. The registries are in the bundle and the flow registry is
  // seeded at import, so this cannot fail and has no loading or error state.
  const all = useMemo(() => buildGlossaryView(), []);

  const [params, setParams] = useSearchParams();
  const deepLinked = params.get('term');

  const [query, setQuery] = useState('');
  const [vocabulary, setVocabulary] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // A chip at a refusal site lands here with `?term=Vocabulary.MEMBER`. Widen the
  // filter to that term's vocabulary first — landing on a filtered list that
  // excludes the very term the reader clicked is the shape of a broken link.
  useEffect(() => {
    if (!deepLinked) return;
    const target = all.find((v) => v.anchor === deepLinked);
    if (!target) return;
    setVocabulary(null);
    setQuery('');
    // `getElementById`, not a CSS selector: an anchor may contain dots
    // (`GovernedCheckId.halal.seal`), which a selector would read as classes.
    // The capability check is not defensive noise — jsdom ships no
    // `scrollIntoView`, and an unguarded call throws out of the effect and takes
    // the whole page down in every test that deep-links.
    const node = document.getElementById(target.anchor);
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'center' });
    }
  }, [deepLinked, all]);

  const jumpTo = (anchor: string): void => {
    setVocabulary(null);
    setQuery('');
    setParams({ term: anchor });
  };

  const needle = query.trim().toLowerCase();
  const shown = all.filter((v) => {
    if (vocabulary !== null && v.sourceType !== vocabulary) return false;
    if (needle === '') return true;
    // Search the TERM and BOTH locales' definitions. A reviewer who read the
    // Indonesian sentence and searches an English word should still find the row.
    return (
      v.term.toLowerCase().includes(needle) ||
      v.entry.en.toLowerCase().includes(needle) ||
      v.entry.id.toLowerCase().includes(needle)
    );
  });

  // Group the visible rows by vocabulary, preserving registry order — which,
  // inside the refusal registries, is the PRECEDENCE the checks evaluate in.
  const groups = GLOSSARY_REGISTRIES.map((r) => ({
    sourceType: r.sourceType as string,
    rows: shown.filter((v) => v.sourceType === r.sourceType),
  })).filter((g) => g.rows.length > 0);

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={[t('glossary.crumb.platform'), t('glossary.crumb.glossary')]}
        title={t('glossary.header.title')}
        subtitle={t('glossary.header.subtitle')}
      />
      <PageMetaLine className="-mt-4 mb-4">
        {t('glossary.meta.summary', {
          terms: all.length,
          vocabularies: GLOSSARY_REGISTRIES.length,
        })}
      </PageMetaLine>

      {/* The honest marker for the route (D-CENSUS-8). Four claims, each about a
          different axis — what is read, what is written, how settled it is, and
          how the appearance lists are matched. */}
      <section className="mb-4 rounded-md border border-border-subtle bg-bg-surface p-4">
        <h2 className="text-section text-text-primary">{t('glossary.honesty.title')}</h2>
        <p className="mt-1 max-w-4xl text-meta text-text-secondary">
          {t('glossary.honesty.derived')}
        </p>
        <p className="mt-1 max-w-4xl text-meta text-text-secondary">
          {t('glossary.honesty.authored')}
        </p>
        {/* §37 — the review is ELICITATION. This page must not read as settled. */}
        <p className="mt-1 max-w-4xl text-meta text-text-secondary">
          {t('glossary.honesty.provisional')}
        </p>
        <p className="mt-1 max-w-4xl text-meta text-text-tertiary">
          {t('glossary.honesty.matching')}
        </p>
      </section>

      {/* The OPEN half, stated as loudly as the closed one. */}
      <section
        data-testid="glossary-remedy-gap"
        className="mb-6 rounded-md border border-warning/40 bg-warning-soft/40 p-4"
      >
        <h2 className="flex items-center gap-2 text-section text-text-primary">
          <HelpCircle size={15} className="text-warning-hover" aria-hidden="true" />
          {t('glossary.remedy.title')}
        </h2>
        <p className="mt-1 max-w-4xl text-meta text-text-secondary">{t('glossary.remedy.body')}</p>
      </section>

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav aria-label={t('glossary.filter.aria')} className="w-full shrink-0 lg:w-72">
          <h2 className="mb-2 text-label uppercase text-text-tertiary">
            {t('glossary.filter.title')}
          </h2>
          <ul className="space-y-1">
            <li>
              <button
                type="button"
                data-testid="glossary-filter-all"
                onClick={() => setVocabulary(null)}
                aria-current={vocabulary === null ? 'true' : undefined}
                className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-left text-[12px] transition-colors ${
                  vocabulary === null
                    ? 'border-action bg-action-soft'
                    : 'border-border-subtle bg-bg-surface hover:bg-bg-hover'
                }`}
              >
                <span className="text-text-primary">{t('glossary.filter.all')}</span>
                <span className="text-[11px] text-text-tertiary">{all.length}</span>
              </button>
            </li>
            {GLOSSARY_REGISTRIES.map((r) => {
              const count = all.filter((v) => v.sourceType === r.sourceType).length;
              const active = vocabulary === r.sourceType;
              return (
                <li key={r.sourceType}>
                  <button
                    type="button"
                    data-testid={`glossary-filter-${r.sourceType}`}
                    onClick={() => setVocabulary(active ? null : r.sourceType)}
                    aria-current={active ? 'true' : undefined}
                    className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-left transition-colors ${
                      active
                        ? 'border-action bg-action-soft'
                        : 'border-border-subtle bg-bg-surface hover:bg-bg-hover'
                    }`}
                  >
                    <Data className="truncate text-[11px]">{r.sourceType}</Data>
                    <span className="text-[11px] text-text-tertiary">{count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 flex-1" ref={containerRef}>
          <SearchBar
            value={query}
            onChange={setQuery}
            ariaLabel={t('glossary.search.label')}
            placeholder={t('glossary.search.placeholder')}
          />
          <p className="mt-2 text-meta text-text-tertiary" data-testid="glossary-count">
            {t('glossary.count.showing', { shown: shown.length, total: all.length })}
          </p>

          {shown.length === 0 ? (
            <p className="mt-4 rounded-md border border-border-subtle bg-bg-surface p-4 text-meta text-text-secondary">
              {t('glossary.empty.noMatch', { query: query.trim() })}
            </p>
          ) : (
            <div className="mt-4 space-y-6">
              {groups.map((g) => (
                <section key={g.sourceType} data-testid={`glossary-group-${g.sourceType}`}>
                  <h2 className="mb-2 flex items-center gap-2 text-section text-text-primary">
                    <BookOpen size={14} className="text-teal" aria-hidden="true" />
                    <Data className="text-[13px]">{g.sourceType}</Data>
                    <span className="text-[11px] font-normal text-text-tertiary">
                      {g.rows.length}
                    </span>
                  </h2>
                  <div className="space-y-2">
                    {g.rows.map((v) => (
                      <TermCard
                        key={v.anchor}
                        view={v}
                        indonesian={indonesian}
                        highlighted={v.anchor === deepLinked}
                        onJump={jumpTo}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShellV2>
  );
};

export default Glossary;
