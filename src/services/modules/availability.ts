// ────────────────────────────────────────────────────────────────────────────
// M1 · THE SURFACE'S ANSWER, WITH MODULES IN IT — pure, so it is testable
// without a DOM.
//
// ⚠️ **THE ORDER IS THE DISPATCHER'S: MODULE BEFORE ROLE.** A verb whose module
// is off renders the module notice even for a seat that lacks the atom, because
// the dispatcher would refuse `MODULE_INACTIVE` before it ever reached the role
// gate. A surface that said "Awaiting Finance" over a switched-off module would
// send the reader to a person who could not act either.
//
// ⚠️ **A READ-ONLY ROUTE WINS OVER THE ATOM'S OWN MODULE.** On a page whose
// module is off, EVERY guarded verb slot renders the notice — including a verb
// that belongs to a module that is on (an invoice verb offered from the orders
// page). That is "gate the mode, not the door" (`ENTRANCE-IS-THE-UNIT-01`): the
// page is read-only, so no door on it is open.
// ────────────────────────────────────────────────────────────────────────────

import type { PersonaType } from '../../context/CurrentIdentityContext';
import type { BusinessRoleId } from '../transitions/businessRoles';
import { availabilityOfAtom, type VerbAvailability } from '../transitions/handoff';
import { atomOffReason, type ModuleActivationView, type OffReason } from './activation';

export function availabilityWithModules(
  atom: string,
  persona: PersonaType,
  seatRoles: readonly BusinessRoleId[],
  view: ModuleActivationView,
  routeOff: OffReason | null,
): VerbAvailability {
  const off = routeOff ?? atomOffReason(atom, persona, view);
  if (off) return { kind: 'module-off', off };
  return availabilityOfAtom(atom, seatRoles);
}
