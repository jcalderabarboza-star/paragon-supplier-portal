// ─────────────────────────────────────────────────────────────────────────────
// OPS-2 — THE TWO PEOPLE AN INVOICE RELEASE NEEDS, for specs.
//
// An approval is recorded against a named person and its payment is released by
// a DIFFERENT named person; a seeded Approved invoice names nobody, and money is
// not released on it (`INVOICE_APPROVAL_UNNAMED`). A spec whose SUBJECT is the
// release — the SAP boundary, the settle faults, the handoff notice, the stamp —
// starts from `seedNamedApprovals()` and releases as `INVOICE_RELEASER`.
//
// The approval is put there THROUGH THE DISPATCHER (`t_invoice_reapprove`), so
// what a spec releases against is an approval the shipped rule accepted — never
// a field written by hand.
// ─────────────────────────────────────────────────────────────────────────────
import { SAMPLE_PEOPLE } from '../services/identity/sampleRoster';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import { invoiceStore } from '../services/data/mock/stores/invoiceStore';
import type { QueryScope } from '../services/data/types';

type Actor = NonNullable<QueryScope['actor']>;

const personWith = (role: string): Actor => {
  const p = SAMPLE_PEOPLE.find((x) => x.role === role);
  if (!p) throw new Error(`no sample person with role ${role}`);
  return { kind: 'RESOLVED', person: { personId: p.personId } };
};

/** Read off the roster, never spelled. */
export const INVOICE_APPROVER: Actor = personWith('finance');
/** A different person from the approver, holding every buyer lane. */
export const INVOICE_RELEASER: Actor = personWith('buyer_all');

const commands = new MockCommandService();

/**
 * Reset the invoice store, then have `INVOICE_APPROVER` approve again every
 * Approved invoice that names no approver.
 */
export async function seedNamedApprovals(): Promise<void> {
  invoiceStore.reset();
  await nameUnnamedApprovals();
}

/** The same, WITHOUT the reset — for a spec that has already arranged its rows. */
export async function nameUnnamedApprovals(): Promise<void> {
  const owed = invoiceStore
    .all()
    .filter((i) => i.status === 'Approved' && i.approvedBy?.kind !== 'RESOLVED');
  for (const inv of owed) {
    const res = await commands.dispatch(
      {
        personaType: 'buyer',
        supplierId: null,
        businessRoles: ['finance'] as QueryScope['businessRoles'],
        actor: INVOICE_APPROVER,
      },
      { transitionId: 't_invoice_reapprove', entity: 'invoice', entityId: inv.id, payload: {} },
    );
    if (res.status === 'failed') {
      throw new Error(`nameUnnamedApprovals: ${inv.invoiceNumber}: ${res.reason}`);
    }
  }
}
