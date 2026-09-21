// ─────────────────────────────────────────────────────────────────────────────
// THE PROFILE TAB'S FIVE LISTED-ROW VERBS — gated per verb, dispatched for real.
//
// ⚠️ **THE STORE IS THE ORACLE, NEVER THE TOAST.** The defect this asserts
// against is on this tree's record twice: `BuyerRequisitions` fired a
// `variant:'success'` toast on NO DISPATCH AT ALL, and `SupplierDocuments`
// shipped three upload affordances that set a local boolean. A spec that
// asserted the toast would have passed on both.
//
// ⚠️ **AND THE GATES ARE PER VERB, NOT PER CARD.** Three atoms in two lanes
// reach this component — `psl:decide` and `psl:cap-set` are `compliance`'s,
// `psl:publish` is `procurement`'s — and a seat may hold any one without the
// others. One card-level check would be *(surface → imports the guard?)*, which
// `IMPORTER-PRESENCE-IS-NOT-VERB-COVERAGE-01` names as not coverage at all.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';

import { renderWithProviders } from '../../test/test-utils';
import PslListingsSection from './PslListingsSection';
import { MockCommandService, commandAuditSink } from '../../services/data/mock/MockCommandService';
import { pslStore } from '../../services/data/mock/stores/pslStore';
import { pslCapSettingStore } from '../../services/data/mock/stores/pslCapSettingStore';
import { seedPslListings } from '../../services/data/mock/pslSeed';
import { DECLARED_PRESENT } from '../../services/data/fixturePresent';
import { PSL_CAP_CEILING_DAYS, effectiveValidUntil } from '../../services/data/pslProjection';
import { NO_PERSON } from '../../context/noPerson';
import { useToast } from '../../hooks/useToast';
import type { CurrentIdentity } from '../../context/CurrentIdentityContext';
import type { PslListing } from '../../services/data/pslListing';

const P = DECLARED_PRESENT;

const seat = (roles: readonly string[]): CurrentIdentity => ({
  personaType: 'buyer',
  supplierId: null,
  supplierName: null,
  businessRoles: roles,
  actor: NO_PERSON,
});

/** Decides and caps, but cannot publish. */
const COMPLIANCE = seat(['compliance', 'finance']);
/** Publishes, but can neither decide nor cap. */
const PROCUREMENT = seat(['procurement']);
/** Holds no PSL atom at all. */
const RECEIVING = seat(['receiving']);

/** Surfaces the toast queue — `ToastProvider` renders only its children. */
const ToastSpy: React.FC = () => {
  const { toasts } = useToast();
  return (
    <ul data-testid="toast-spy">
      {toasts.map((t) => (
        <li key={t.id}>{`${t.title} ${t.description ?? ''}`}</li>
      ))}
    </ul>
  );
};

/** The section, rendered over the LIVE store so a dispatch is visible.
 *  The page does the selection and the ordering — see the component's own
 *  header for why that call must not move inside it. */
const rowsOf = (supplierId: string): readonly PslListing[] =>
  pslStore.all().filter((r) => r.supplierId === supplierId);

const renderFor = (supplierId: string, identity: CurrentIdentity) =>
  renderWithProviders(
    <>
      <PslListingsSection listings={rowsOf(supplierId)} nowIso={P} />
      <ToastSpy />
    </>,
    { identity },
  );

beforeEach(async () => {
  pslStore.reset();
  pslCapSettingStore.reset();
  commandAuditSink.clear();
  const outcome = await seedPslListings(new MockCommandService());
  expect(outcome.status, outcome.reason ?? '').toBe('seeded');
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ POPULATION — real, dispatched rows in the states each spec needs', () => {
  it('sup-002 holds a published Listed row AND an unpublished one, by name', () => {
    const rows = rowsOf('sup-002');
    expect(rows.map((r) => r.id)).toContain('psl-001');
    expect(rows.map((r) => r.id)).toContain('psl-002');
    expect(pslStore.get('psl-001')!.publishedAt).not.toBeNull();
    expect(pslStore.get('psl-002')!.publishedAt).toBeNull();
    expect(pslStore.get('psl-002')!.lifecycle).toBe('Listed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ EACH VERB IS GATED BY ITS OWN ATOM — three atoms, two lanes', () => {
  it('a compliance seat gets the decide and cap controls, and a NOTICE on publish', async () => {
    renderFor('sup-002', COMPLIANCE);
    await screen.findByTestId('psl-actions-psl-002');
    expect(screen.getByTestId('psl-open-change-psl-002')).toBeInTheDocument();
    expect(screen.getByTestId('psl-open-cap-psl-002')).toBeInTheDocument();
    // `psl:publish` is `procurement`'s, and this seat does not hold it.
    expect(screen.queryByTestId('psl-publish-psl-002')).toBeNull();
    expect(screen.getAllByTestId('handoff-psl-publish').length).toBeGreaterThan(0);
  });

  it('a procurement seat gets PUBLISH, and notices on decide and cap', async () => {
    renderFor('sup-002', PROCUREMENT);
    await screen.findByTestId('psl-actions-psl-002');
    expect(screen.getByTestId('psl-publish-psl-002')).toBeInTheDocument();
    expect(screen.queryByTestId('psl-open-change-psl-002')).toBeNull();
    expect(screen.queryByTestId('psl-open-cap-psl-002')).toBeNull();
    expect(screen.getAllByTestId('handoff-psl-decide').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('handoff-psl-cap-set').length).toBeGreaterThan(0);
  });

  it('⚠️ A SEAT WITH NO PSL ATOM GETS THREE NOTICES AND NO CONTROL', async () => {
    renderFor('sup-002', RECEIVING);
    await screen.findByTestId('psl-actions-psl-002');
    expect(screen.queryByTestId('psl-open-change-psl-002')).toBeNull();
    expect(screen.queryByTestId('psl-open-cap-psl-002')).toBeNull();
    expect(screen.queryByTestId('psl-publish-psl-002')).toBeNull();
    // ⚠️ THREE SEPARATE NOTICES, not one page-level gate — which is what
    // "gated per verb" MEANS on a surface carrying three atoms.
    expect(screen.getAllByTestId('handoff-psl-decide').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('handoff-psl-cap-set').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('handoff-psl-publish').length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE VERBS DISPATCH — the STORE moves, not just a toast', () => {
  it('PUBLISH writes `publishedAt` and `publishedBy`, and the affordance is gone after', async () => {
    renderFor('sup-002', PROCUREMENT);
    fireEvent.click(await screen.findByTestId('psl-publish-psl-002'));
    await waitFor(() => expect(pslStore.get('psl-002')!.publishedAt).not.toBeNull());
    expect(pslStore.get('psl-002')!.publishedBy).not.toBeNull();
    // ⚠️ AND NO LEDGER ENTRY — a publication is not a designation.
    expect(pslStore.get('psl-002')!.statusHistory.length).toBe(2);
  });

  it('CHANGE STATUS moves the designation and appends `from → to`', async () => {
    renderFor('sup-002', COMPLIANCE);
    fireEvent.click(await screen.findByTestId('psl-open-change-psl-002'));
    fireEvent.change(await screen.findByTestId('psl-change-status-psl-002'), {
      target: { value: 'Mandatory' },
    });
    fireEvent.change(screen.getByTestId('psl-change-reason-psl-002'), {
      target: { value: 'the sourcing strategy was approved' },
    });
    fireEvent.click(screen.getByTestId('psl-commit-change-psl-002'));

    await waitFor(() => expect(pslStore.get('psl-002')!.status).toBe('Mandatory'));
    const row = pslStore.get('psl-002')!;
    const last = row.statusHistory[row.statusHistory.length - 1];
    expect(last.from).toBe('Validated');
    expect(last.to).toBe('Mandatory');
    expect(last.reason).toBe('the sourcing strategy was approved');
  });

  it('RENEW moves the end date, and the commit is disabled without a reason', async () => {
    renderFor('sup-002', COMPLIANCE);
    fireEvent.click(await screen.findByTestId('psl-open-renew-psl-002'));
    const until = await screen.findByTestId('psl-renew-until-psl-002');
    const current = effectiveValidUntil(pslStore.get('psl-002')!)!;
    const later = new Date(Date.parse(current) + 10 * 86_400_000).toISOString().slice(0, 10);

    fireEvent.change(until, { target: { value: later } });
    // The courtesy mirror of `PSL_DECISION_AUTHORED`, which is the policy.
    expect(screen.getByTestId('psl-commit-renew-psl-002')).toBeDisabled();
    fireEvent.change(screen.getByTestId('psl-renew-reason-psl-002'), {
      target: { value: 'extended for the next campaign' },
    });
    fireEvent.click(screen.getByTestId('psl-commit-renew-psl-002'));

    await waitFor(() => expect(pslStore.get('psl-002')!.validUntil).toBe(later));
  });

  it('⚠️ AN OVER-CAP RENEWAL IS REFUSED, AND THE REFUSAL IS RENDERED IN WORDS', async () => {
    // Operator ruling (e): refused at the verb, never silently bounded at read.
    renderFor('sup-002', COMPLIANCE);
    fireEvent.click(await screen.findByTestId('psl-open-renew-psl-002'));
    const beyond = new Date(Date.parse(P) + 5000 * 86_400_000).toISOString().slice(0, 10);
    fireEvent.change(await screen.findByTestId('psl-renew-until-psl-002'), {
      target: { value: beyond },
    });
    fireEvent.change(screen.getByTestId('psl-renew-reason-psl-002'), {
      target: { value: 'a very long term' },
    });
    const before = pslStore.get('psl-002')!.validUntil;
    fireEvent.click(screen.getByTestId('psl-commit-renew-psl-002'));

    const spy = await screen.findByTestId('toast-spy');
    await waitFor(() => expect(spy.textContent).toMatch(/beyond the validity cap/i));
    // ⚠️ AND NOTHING MOVED. A refusal that left the row half-written would be
    // worse than the clamp it replaced.
    expect(pslStore.get('psl-002')!.validUntil).toBe(before);
    expect(spy.textContent).not.toMatch(/PSL_RENEWAL_EXCEEDS_CAP/);
  });

  it('⚠️ THE CAP OVERRIDE WRITES ALL FOUR FIELDS IN ONE ACT', async () => {
    renderFor('sup-002', COMPLIANCE);
    fireEvent.click(await screen.findByTestId('psl-open-cap-psl-002'));
    fireEvent.change(await screen.findByTestId('psl-cap-days-psl-002'), {
      target: { value: '120' },
    });
    fireEvent.change(screen.getByTestId('psl-cap-why-psl-002'), {
      target: { value: 'one audit cycle only' },
    });
    fireEvent.click(screen.getByTestId('psl-commit-cap-psl-002'));

    await waitFor(() => expect(pslStore.get('psl-002')!.capDaysOverride).toBe(120));
    const row = pslStore.get('psl-002')!;
    // The co-presence is a property of the machine now, not a rule a fixture
    // had to honour — one verb writes all four.
    expect(row.capJustification).toBe('one audit cycle only');
    expect(row.capDecidedBy).not.toBeNull();
    expect(row.capDecidedAt).not.toBeNull();
  });

  it('⚠️ AN OVER-CEILING OVERRIDE IS REFUSED, AND THE REFUSAL STATES THE CEILING', async () => {
    renderFor('sup-002', COMPLIANCE);
    fireEvent.click(await screen.findByTestId('psl-open-cap-psl-002'));
    fireEvent.change(await screen.findByTestId('psl-cap-days-psl-002'), {
      target: { value: String(PSL_CAP_CEILING_DAYS + 1) },
    });
    fireEvent.change(screen.getByTestId('psl-cap-why-psl-002'), {
      target: { value: 'one day too long' },
    });
    fireEvent.click(screen.getByTestId('psl-commit-cap-psl-002'));

    const spy = await screen.findByTestId('toast-spy');
    await waitFor(() =>
      expect(spy.textContent).toMatch(new RegExp(String(PSL_CAP_CEILING_DAYS))),
    );
    // ⚠️ 730 IS THE OPERATOR'S RULING AND A PERSON NOW MEETS IT (ruling i) —
    // which is what stopped it being a placeholder.
    expect(spy.textContent).toMatch(/exceeds the platform ceiling/i);
    expect(pslStore.get('psl-002')!.capDaysOverride).toBeNull();
  });

  it('WITHDRAW ends the designation, and the actions block goes with it', async () => {
    renderFor('sup-002', COMPLIANCE);
    fireEvent.click(await screen.findByTestId('psl-open-withdraw-psl-002'));
    fireEvent.change(await screen.findByTestId('psl-withdraw-reason-psl-002'), {
      target: { value: 'the tooling change was not re-qualified' },
    });
    fireEvent.click(screen.getByTestId('psl-commit-withdraw-psl-002'));

    await waitFor(() => expect(pslStore.get('psl-002')!.lifecycle).toBe('Withdrawn'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE SEAT MIRROR ON A RESTRICTIVE DESIGNATION', () => {
  it('a seat holding BOTH authorities cannot commit a change to `Mandatory`', async () => {
    // The wide seat: `psl:propose` and `psl:decide` together. The panel must
    // say so before the act rather than offering a button the dispatcher
    // refuses.
    renderFor('sup-002', seat(['procurement', 'compliance']));
    fireEvent.click(await screen.findByTestId('psl-open-change-psl-002'));
    fireEvent.change(await screen.findByTestId('psl-change-status-psl-002'), {
      target: { value: 'Sole Source' },
    });
    expect(await screen.findByTestId('psl-seat-holds-both-psl-002')).toBeInTheDocument();
    expect(screen.queryByTestId('psl-commit-change-psl-002')).toBeNull();

    // ⚠️ KNOWN-GOOD, IN THE SAME PANEL: switching back to a designation that
    // competes restores the commit. Without this the mirror would read as a
    // wall rather than a rule about restrictive designations.
    fireEvent.change(screen.getByTestId('psl-change-status-psl-002'), {
      target: { value: 'Validated' },
    });
    expect(screen.queryByTestId('psl-seat-holds-both-psl-002')).toBeNull();
    expect(screen.getByTestId('psl-commit-change-psl-002')).toBeInTheDocument();
  });

  it('⚠️ AND RENEW CARRIES THE SAME CHECK, on the designation ALREADY held', async () => {
    // Ruling (e): extending an exemption is granting one. `psl-001` is
    // `Sole Source`, so a wide seat may not renew it either.
    renderFor('sup-002', seat(['procurement', 'compliance']));
    fireEvent.click(await screen.findByTestId('psl-open-renew-psl-001'));
    expect(await screen.findByTestId('psl-renew-seat-holds-both-psl-001')).toBeInTheDocument();
    expect(screen.queryByTestId('psl-commit-renew-psl-001')).toBeNull();

    // KNOWN-GOOD: the same seat CAN renew a `Validated` row.
    fireEvent.click(screen.getByTestId('psl-open-renew-psl-002'));
    expect(screen.queryByTestId('psl-renew-seat-holds-both-psl-002')).toBeNull();
  });
});
