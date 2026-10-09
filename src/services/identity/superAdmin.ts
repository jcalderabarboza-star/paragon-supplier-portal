// ─────────────────────────────────────────────────────────────────────────────
// ADM-1 · THE SUPER ADMIN EXEMPTION (operator ruling, 9 October 2026).
//
// The Super Admin (the Architect) is exempt from the four-eyes and segregation
// checks and from the sample-identity governance locks. The exemption is never
// silent: a rule that stands aside is NAMED on the audit event, the act needs a
// one-line reason, and it is refused by name without one.
//
// ⚠️ **THE EXEMPTION IS A PROPERTY OF THE SEAT'S ROLE ID, NOT OF ITS ATOMS.**
// `admin` holds the same atoms and gets none of this; a custom role copied from
// `super_admin` holds the atoms and is not a member of `businessRoles` under
// this id, so it gets none of it either.
//
// ⚠️ **A NAMED PERSON, ALWAYS.** A seat that holds the role and names nobody is
// not exempt — there would be nobody to record the bypass against.
//
// ⚠️ **AND NOT A SAMPLE PERSON IN PRODUCTION.** The sample holder exists for the
// demonstration build. Where the deployment is production, a sample identity is
// barred (`moduleDeployment.barsActor`, the rule `t_module_set` already reads),
// so the exemption needs a real signed-in person there — the SE Team decides who.
// ─────────────────────────────────────────────────────────────────────────────
import { asActorAttribution, isAttributed } from '../../lib/enforcement';
import { moduleDeployment } from '../modules/deployment';

/** The role id the exemption reads. A `SystemRoleId`; spelled once, here. */
export const SUPER_ADMIN_ROLE = 'super_admin';

/**
 * The name the reason check is refused under, in the place a policy hook's name
 * stands: `POLICY_REJECTED:super_admin_bypass_reasoned:<head>: …`. It is not a
 * registered hook — it is the dispatcher's own check — and it reads like one so
 * every refusal reader matches it the same way.
 */
export const SUPER_ADMIN_BYPASS_REASONED = 'super_admin_bypass_reasoned';

/** The refusal head for a bypass with no stated reason. */
export const SUPER_ADMIN_REASON_REQUIRED = 'SUPER_ADMIN_REASON_REQUIRED';

/**
 * What a reader is told when the refusal reaches a surface (the prompt was
 * cancelled, or nobody was listening). Both locales, beside the head, in the
 * shape `COMMAND_REFUSAL_GLOSSARY` uses — `describeRefusal` returns it whole,
 * so no surface prints the developer sentence.
 */
export const SUPER_ADMIN_REASON_REQUIRED_TEXT: Readonly<{ en: string; id: string }> = Object.freeze({
  en: 'This act passes a four-eyes check on the Super Admin exemption, and it is not taken without a one-line reason. Take the act again and state the reason.',
  id: 'Tindakan ini melewati pemeriksaan empat-mata dengan pengecualian Super Admin, dan tidak diambil tanpa alasan satu baris. Ambil kembali tindakan itu dan nyatakan alasannya.',
});

/** The longest reason recorded. One line; a paragraph belongs on the document. */
export const BYPASS_REASON_MAX = 300;

/** Does this seat hold the Super Admin role, whoever (if anyone) it names? */
export function holdsSuperAdmin(seat: { readonly businessRoles?: readonly string[] }): boolean {
  return (seat.businessRoles ?? []).includes(SUPER_ADMIN_ROLE);
}

/**
 * Is this seat EXEMPT — the role, a named person, and not a sample person on a
 * production deployment? The one predicate the dispatcher and the surfaces read.
 */
export function isSuperAdminSeat(seat: {
  readonly businessRoles?: readonly string[];
  readonly actor?: unknown;
}): boolean {
  if (!holdsSuperAdmin(seat)) return false;
  const actor = asActorAttribution(seat.actor);
  if (!actor || !isAttributed(actor)) return false;
  return !moduleDeployment.barsActor(actor);
}

/**
 * May this seat READ the Super Admin activity view? The Super Admin and
 * Compliance (operator ruling). Asked of role ids: the view fires no
 * transition, so no atom could express it (C10 §3.3).
 */
export function maySeeSuperAdminActivity(seat: {
  readonly businessRoles?: readonly string[];
}): boolean {
  return holdsSuperAdmin(seat) || (seat.businessRoles ?? []).includes('compliance');
}

/**
 * The reason as it is recorded, or `null` when it is not one: absent, blank,
 * more than one line, or longer than the limit.
 */
export function readBypassReason(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const reason = raw.trim();
  if (reason === '' || /[\r\n]/.test(reason) || reason.length > BYPASS_REASON_MAX) return null;
  return reason;
}

/** What an event carries when a Super Admin act passed a rule that would have refused. */
export interface SuperAdminBypass {
  /** The refusal heads that stood aside, in the order the checks ran. */
  readonly rules: readonly string[];
  /** The one-line reason the Super Admin stated. */
  readonly reason: string;
}
