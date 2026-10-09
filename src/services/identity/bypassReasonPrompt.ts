// ─────────────────────────────────────────────────────────────────────────────
// ADM-1 · ASKING THE SUPER ADMIN FOR THE REASON, IN ONE PLACE.
//
// A Super Admin act that passes a four-eyes check is refused by name unless it
// carries a one-line reason (`SUPER_ADMIN_REASON_REQUIRED`). Every surface that
// fires such a verb would need its own reason field; instead the command seam
// asks ONCE, through the prompt the shell registers here, BEFORE it takes the
// act (it previews the command first — `Dispatcher.bypassRulesFor`). A surface
// that knows nothing about the exemption therefore still records it properly,
// and a reasoned act leaves one event on the trail, not a refusal and an act.
//
// With no prompt registered (a spec, a headless caller) nothing is asked and
// the refusal is returned as it is — refused by name, which is the ruling.
// ─────────────────────────────────────────────────────────────────────────────
import { SUPER_ADMIN_REASON_REQUIRED } from './superAdmin';

/** Asks for the reason. Resolves to it, or to `null` when the person cancels. */
export type BypassReasonPrompt = (rules: readonly string[]) => Promise<string | null>;

let prompt: BypassReasonPrompt | null = null;

/** Register the shell's prompt. Returns the function that removes it again. */
export function registerBypassReasonPrompt(fn: BypassReasonPrompt): () => void {
  prompt = fn;
  return () => {
    if (prompt === fn) prompt = null;
  };
}

/** Is anybody listening? The command seam previews a command only when so. */
export function hasBypassReasonPrompt(): boolean {
  return prompt !== null;
}

/**
 * The rules a `SUPER_ADMIN_REASON_REQUIRED` refusal names, or `null` when the
 * reason is not that refusal. Reads the sentence the dispatcher wrote:
 * `… this act passes A, B on the Super Admin exemption …`.
 */
export function bypassRulesIn(reason: string | undefined): readonly string[] | null {
  if (!reason || !reason.includes(`${SUPER_ADMIN_REASON_REQUIRED}:`)) return null;
  const m = /this act passes ([A-Z0-9_, ]+) on the Super Admin exemption/.exec(reason);
  return m ? m[1].split(',').map((r) => r.trim()).filter((r) => r !== '') : [];
}

/** Ask, if anybody is listening. `null` = nobody asked, or the person cancelled. */
export async function askBypassReason(rules: readonly string[]): Promise<string | null> {
  return prompt ? prompt(rules) : null;
}
