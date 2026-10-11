import { useEffect, type RefObject } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// UI-1e (operator ruling, 11 October 2026) · ONE SOLID BUTTON PER CONTAINER.
//
// Inside a drawer, a wizard or a dialog, the FINAL COMMIT is the solid primary
// button, and there is one. A source scan cannot hold that: a drawer's footer
// is a ternary over the document's state, its body is three components away,
// and two solid buttons in the source may never stand on screen together —
// while two that do may sit in different files.
//
// So the container counts what it RENDERED. Every render, `SidePanel`, `Dialog`
// and `Wizard` count the solid buttons that belong to them (a container opened
// inside another counts its own). More than one is refused: thrown where a
// developer or a spec is watching, logged in a production build, where a
// reader's drawer must not fall over for a styling rule.
//
// `Button` marks a solid button `data-solid`; the containers mark themselves
// `data-solid-scope`. Nothing else may set either.
// ─────────────────────────────────────────────────────────────────────────────

export const SOLID_ATTR = 'data-solid';
export const SCOPE_ATTR = 'data-solid-scope';

/** The solid buttons that belong to `root` — not to a container nested in it. */
export function solidButtonsOf(root: Element): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[${SOLID_ATTR}]`)).filter(
    (el) => el.closest(`[${SCOPE_ATTR}]`) === root,
  );
}

export function oneSolidRefusal(scope: string, labels: readonly string[]): string {
  return `UI-1e: ${scope} renders ${labels.length} solid buttons (${labels.join(' | ')}). A container has ONE — its final commit; every other action is variant="outline".`;
}

/** `ref` is the container's root, which must carry `data-solid-scope`. */
export function useOneSolid(ref: RefObject<HTMLElement | null>, scope: string): void {
  // No dependency list on purpose: a footer changes with the document's state,
  // not with any prop this hook could name.
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const solid = solidButtonsOf(root);
    if (solid.length <= 1) return;
    const message = oneSolidRefusal(scope, solid.map((el) => (el.textContent ?? '').trim()));
    if (import.meta.env.DEV) throw new Error(message);
    console.error(message);
  });
}
