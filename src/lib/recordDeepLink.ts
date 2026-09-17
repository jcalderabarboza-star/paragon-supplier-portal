// ─────────────────────────────────────────────────────────────────────────────
// RECORD DEEP LINKS — one convention, named once.
//
// A dashboard window's expanded table lists real records. Clicking a row must
// land on THAT record, not merely on the list it lives in. This module is the
// whole mechanism: a query parameter, a helper that builds the href, and a hook
// that reads it back.
//
// ── ⚠️ WHY A QUERY PARAMETER AND NOT A ROUTE SEGMENT ────────────────────────
// A route segment (`/buyer/invoices/:id`) is a second route per page, a second
// render path, and a redirect rule for the bare list — a redesign of eight
// pages. The parameter is ADDITIVE: every page already holds its own selection
// state and its own detail panel, so reading one value on mount and setting
// that state is the smallest support that makes a row land on its record.
//
// ── ⚠️ AND IT IS THE SHAPE THIS TREE ALREADY USES ───────────────────────────
// `Glossary.tsx` is the one existing URL-selection site: a term chip at a
// refusal site lands on `/glossary?term=Vocabulary.MEMBER`, read through
// `useSearchParams`, and the page WIDENS ITS OWN FILTER before selecting —
// *"landing on a filtered list that excludes the very term the reader clicked
// is the shape of a broken link"*. That sentence is the rule, not a detail of
// that page, so every consumer here follows it: clear the filters that could
// hide the target, then select.
//
// The parameter is `id` rather than `term` because the subject is a RECORD with
// an id, and `term` names a glossary anchor. One convention, two nouns.
//
// ── ⚠️ AN UNKNOWN ID IS NOT AN ERROR ────────────────────────────────────────
// A stale link, a deleted row, a typo: the page renders normally, with no panel
// open and no toast. It is not a failure the reader caused or can fix, and a
// toast for it would be the honesty defect `toastHonesty` exists to catch —
// announcing something that did not happen. The list is still the right answer
// to "show me this page".
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/** The one parameter name. Read it from here, never spell it at a call site. */
export const RECORD_PARAM = 'id';

/**
 * The href for a record on its own page.
 *
 * Returns a path string for `<Link to=…>`; the router encodes nothing for us,
 * so the id is encoded here. Ids in this tree are slug-shaped (`inv-004`,
 * `rfq-011`), but a future id with a slash or a space must not silently build a
 * different URL than the one the row means.
 */
export function recordHref(path: string, id: string): string {
  return `${path}?${RECORD_PARAM}=${encodeURIComponent(id)}`;
}

/**
 * The record id this page was deep-linked to, or `null`.
 *
 * `null` covers both "no parameter" and "an empty parameter": `?id=` names no
 * record, and treating it as the id `''` would have every page search for a row
 * that cannot exist.
 */
export function useDeepLinkedRecordId(): string | null {
  const [params] = useSearchParams();
  const raw = params.get(RECORD_PARAM);
  return raw && raw.length > 0 ? raw : null;
}

/**
 * Select the deep-linked record once its rows have loaded.
 *
 * ⚠️ **THE CALLER MUST WIDEN ITS FILTERS FIRST.** `Glossary.tsx` states the
 * rule this follows: *"landing on a filtered list that excludes the very term
 * the reader clicked is the shape of a broken link"*. Each page therefore
 * passes the UNFILTERED rows here and clears whatever narrowing it holds in
 * `onFound`, so the record is reachable whatever the reader last filtered by.
 *
 * It fires ONCE per id. A reader who then closes the panel must not have it
 * reopened on the next render, and a reader who navigates to another record
 * must have that one open instead — so the guard is the id, not a boolean.
 */
export function useDeepLinkedSelection<T>(
  rows: readonly T[] | undefined,
  match: (row: T, id: string) => boolean,
  onFound: (row: T) => void,
): void {
  const id = useDeepLinkedRecordId();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!id || handled.current === id) return;
    // ⚠️ **AN EMPTY LIST IS "NOT LOADED YET", NOT "NOT FOUND".** Pages here
    // render their rows as `query.data?.items ?? []`, so the FIRST effect runs
    // against an empty array while the read is still in flight. An earlier
    // draft marked the id handled at that moment and the panel never opened —
    // three of the six destinations failed exactly this way, and the spec that
    // caught it is `recordDeepLink.test.tsx`. Waiting costs one `find` over an
    // empty array per render; a genuinely empty page has nothing to select, so
    // the two cases are indistinguishable in effect and only one is safe.
    if (!rows || rows.length === 0) return;
    const row = rows.find((r) => match(r, id));
    // An unknown id is NOT an error: mark it handled so the search does not
    // repeat on every render, and leave the page exactly as it renders without
    // the parameter — no panel, no toast.
    handled.current = id;
    if (row) onFound(row);
  }, [id, rows, match, onFound]);
}

/**
 * The deep-linked row on a page that has NO detail panel to open.
 *
 * Returns the id to highlight, and scrolls it into view once. The element must
 * carry `id={recordAnchorId(recordId)}`. This is `Glossary.tsx`'s mechanism
 * exactly — it lands the reader ON the row rather than inventing a panel the
 * page does not have.
 */
export function recordAnchorId(recordId: string): string {
  return `record-${recordId}`;
}

export function useDeepLinkedHighlight(ready: boolean): string | null {
  const id = useDeepLinkedRecordId();
  const scrolled = useRef<string | null>(null);
  useEffect(() => {
    if (!id || !ready || scrolled.current === id) return;
    scrolled.current = id;
    // `getElementById` rather than a CSS selector, and a capability check:
    // jsdom ships no `scrollIntoView`, and a record id may contain characters a
    // selector would read as syntax. Both are `Glossary.tsx`'s reasons.
    const el = document.getElementById(recordAnchorId(id));
    el?.scrollIntoView?.({ block: 'center' });
  }, [id, ready]);
  return id;
}
