// ────────────────────────────────────────────────────────────────────────────
// B4b-1 · the publication panel ON THE PAGE (Design 2 §2.3, §10): open a draft
// from the current plan, the firm lines awaiting a signature, segregation as
// the surface renders it, Publish DISABLED WITH THE STATED REASON until the
// hooks would pass, and the ledger. Real service, real dispatcher, real store.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER, BUYER_NAMED } from '../../test/test-utils';
import i18n from '../../lib/i18n';
import type { CurrentIdentity } from '../../context/CurrentIdentityContext';
import { MockCommandService } from '../../services/data/mock/MockCommandService';
import { forecastPublicationStore } from '../../services/data/mock/stores/forecastPublicationStore';
import { SAMPLE_PEOPLE } from '../../services/identity/sampleRoster';
import PublicationPanel from './PublicationPanel';
import { ledgerRows } from './PublicationLedger';

const commands = new MockCommandService();
const CURRENT = 'PUB-2026-08-RM-R2';
const PV = 'PV-2026-08.2';

const person = (role: 'planning' | 'procurement') => SAMPLE_PEOPLE.find((p) => p.role === role && p.ordinal === 1)!.personId;
const PLANNING_ONLY: CurrentIdentity = { ...BUYER, businessRoles: ['planning'] };
const PROCUREMENT_ONLY_NAMED: CurrentIdentity = {
  ...BUYER,
  businessRoles: ['procurement'],
  actor: { kind: 'RESOLVED', person: { personId: person('procurement') } },
};

/** A carried draft, opened through the real dispatcher (three firm lines, unsigned). */
const openCarried = async () => {
  const r = await commands.dispatch(
    { personaType: 'buyer', supplierId: null, businessRoles: ['planning'] },
    {
      transitionId: 't_publication_open',
      entity: 'forecastPublication',
      payload: { planVersion: PV, grain: 'month', horizon: ['2026-08', '2026-09', '2026-10'], sourceRef: `somo-emission@${PV}`, carryForwardFrom: CURRENT },
    },
  );
  return r.entityId!;
};

const mount = (identity: CurrentIdentity = BUYER) =>
  renderWithProviders(<PublicationPanel grain="month" />, { identity, route: '/buyer/plan-grid' });

beforeEach(() => forecastPublicationStore.reset());
afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('no draft → "Open draft" from a SOMO plan version, starting from the current split', () => {
  it('offers the current plan version and the carry, and opening lands a draft that says where its split came from', async () => {
    mount();
    const select = (await screen.findByTestId('publication-plan-version')) as HTMLSelectElement;
    expect(select.value).toBe(PV);
    expect((screen.getByTestId('publication-carry') as HTMLInputElement).checked).toBe(true);
    expect(screen.getByTestId('publication-current').textContent).toContain(CURRENT);
    fireEvent.click(screen.getByTestId('publication-open'));
    const draft = await screen.findByTestId('publication-draft');
    expect(within(draft).getByTestId('publication-coverage').textContent).toBe(
      '6 material-periods allocated · 0 unallocated · 7 supplier lines · split carried from PUB-2026-08-RM-R2',
    );
    expect(forecastPublicationStore.all().filter((r) => r.state === 'Draft')).toHaveLength(1);
  });
});

describe('Publish is disabled WITH THE STATED REASON until the hooks would pass — never a toast after a refusal', () => {
  it('three carried firm lines await a signature: Publish is disabled and the reason names them', async () => {
    await openCarried();
    mount();
    const publish = (await screen.findByTestId('publication-publish')) as HTMLButtonElement;
    expect(publish.disabled).toBe(true);
    expect(screen.getByTestId('publication-blocker-UNSIGNED_FIRM').textContent).toMatch(
      /^Not yet: 3 firm lines await procurement’s signature — RM-EMUL-3310 2026-08 /,
    );
    expect(screen.getByTestId('publication-firm').textContent).toContain('Firm lines awaiting signature: 3');
  });

  it('an UNATTRIBUTED seat holding the atom is told BEFORE it clicks that a person signs', async () => {
    await openCarried();
    mount(BUYER);
    const sign = (await screen.findByTestId('publication-sign')) as HTMLButtonElement;
    expect(sign.disabled).toBe(true);
    expect(screen.getByTestId('publication-sign-needs-person')).toBeInTheDocument();
  });
});

describe('segregation on the surface — the planner splits, procurement signs', () => {
  it('a PLANNING-only seat reads the handoff naming procurement, and has no sign control', async () => {
    await openCarried();
    mount(PLANNING_ONLY);
    const notice = await screen.findByTestId('handoff-publication-approve');
    expect(notice.textContent).toMatch(/Procurement/);
    expect(screen.queryByTestId('publication-sign')).toBeNull();
    // CONTROL: the same seat DOES hold publish
    expect(screen.getByTestId('publication-publish')).toBeInTheDocument();
  });

  it('a PROCUREMENT-only named seat may sign, and reads the handoff naming planning for publish', async () => {
    await openCarried();
    mount(PROCUREMENT_ONLY_NAMED);
    const sign = (await screen.findByTestId('publication-sign')) as HTMLButtonElement;
    expect(sign.disabled).toBe(false);
    expect(screen.getByTestId('handoff-publication-publish').textContent).toMatch(/Planning/);
    expect(screen.queryByTestId('publication-publish')).toBeNull();
  });
});

describe('sign → publish → the ledger', () => {
  it('a named seat signs the firm lines, Publish enables, and publishing supersedes the current one on the record', async () => {
    const id = await openCarried();
    mount(BUYER_NAMED);
    fireEvent.click(await screen.findByTestId('publication-sign'));
    await waitFor(() => expect(screen.queryByTestId('publication-blockers')).toBeNull());
    expect(forecastPublicationStore.get(id)!.lines.filter((l) => l.commitmentClass === 'firm').map((l) => l.allocation.approvedBy)).toEqual([
      person('procurement'),
      person('procurement'),
      person('procurement'),
    ]);
    const publish = screen.getByTestId('publication-publish') as HTMLButtonElement;
    expect(publish.disabled).toBe(false);
    fireEvent.click(publish);
    await waitFor(() => expect(forecastPublicationStore.get(id)!.state).toBe('Published'));
    expect(forecastPublicationStore.get(CURRENT)!.state).toBe('Superseded');
    const ledger = await screen.findByTestId('publication-ledger-grid');
    await waitFor(() => expect(within(ledger).getAllByTestId('publication-ledger-row').length).toBeGreaterThanOrEqual(5));
    const text = ledger.textContent ?? '';
    expect(text).toContain('Published');
    expect(text).toContain('Superseded');
    expect(text).toContain('The platform (by the next publication)');
    expect(text).toContain('Sample record — not published through the portal');
    // the person is a LABEL (with its SAMPLE marker), never the raw id
    expect(text).not.toContain(person('procurement'));
    expect(text).toMatch(/SAMPLE/);
  });
});

describe('the ledger reads newest first, and a cascade sits ABOVE the act that caused it', () => {
  it('under the frozen SDC clock every act shares one instant — the recorded order decides', async () => {
    const id = await openCarried();
    const named = { personaType: 'buyer' as const, supplierId: null, businessRoles: ['procurement' as const], actor: { kind: 'RESOLVED' as const, person: { personId: person('procurement') } } };
    for (const l of forecastPublicationStore.get(id)!.lines.filter((x) => x.commitmentClass === 'firm')) {
      await commands.dispatch(named, {
        transitionId: 't_publication_approve_firm',
        entity: 'forecastPublication',
        entityId: id,
        payload: { materialCode: l.materialCode, periodBucket: l.periodBucket, supplierId: l.supplierId },
      });
    }
    // E2E-1 — publishing, discarding and withdrawing need a named person (PUBLICATION_ACTOR_NAMED).
    await commands.dispatch(
      { personaType: 'buyer', supplierId: null, businessRoles: ['planning'], actor: { kind: 'RESOLVED', person: { personId: person('planning') } } },
      { transitionId: 't_publication_publish', entity: 'forecastPublication', entityId: id, payload: {} },
    );
    expect(ledgerRows(forecastPublicationStore.all()).map((r) => `${r.verb} ${r.publicationId}`)).toEqual([
      `t_publication_supersede ${CURRENT}`,
      `t_publication_publish ${id}`,
      `t_publication_open ${id}`,
      't_publication_supersede PUB-2026-08-RM',
      `t_publication_publish ${CURRENT}`,
      't_publication_publish PUB-2026-08-RM',
    ]);
  });
});

describe('ID — the panel reads Indonesian', () => {
  it('Open draft / Publish / the blocker are Indonesian', async () => {
    await i18n.changeLanguage('id');
    mount();
    expect((await screen.findByTestId('publication-open')).textContent).toBe('Buka draf');
    fireEvent.click(screen.getByTestId('publication-open'));
    expect((await screen.findByTestId('publication-publish')).textContent).toBe('Terbitkan');
    expect(screen.getByTestId('publication-blocker-UNSIGNED_FIRM').textContent).toMatch(/^Belum bisa: 3 baris tetap menunggu tanda tangan pengadaan/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// E2E-1 · PUBLISHING AND DISCARDING NEED A NAMED PERSON
// (`PUBLICATION_ACTOR_NAMED`). A seat that names nobody is told before the act,
// is refused in its own language when it discards, and the draft stays open. A
// named seat is not shown the line and its discard ends the draft.
// ────────────────────────────────────────────────────────────────────────────
describe.each(['en', 'id'] as const)('E2E-1 · a seat that names nobody does not discard a draft [%s]', (lng) => {
  const discard = async () => {
    fireEvent.click(await screen.findByTestId('publication-discard'));
    fireEvent.click(await screen.findByTestId('publication-discard-yes'));
  };

  it('is told before the act, is refused in that language, and the draft stays open', async () => {
    const id = await openCarried();
    await i18n.changeLanguage(lng);
    mount(BUYER);
    expect(await screen.findByTestId('publication-act-needs-person')).toHaveTextContent(
      i18n.t('identity.preAct.namedRequired'),
    );
    const before = forecastPublicationStore.get(id);
    await discard();
    const failure = await screen.findByTestId('publication-failure');
    expect(failure).toHaveTextContent(i18n.t('identity.refused.namedRequired'));
    // The hook's own English sentence is not what the reader is shown.
    expect(failure.textContent).not.toContain('PUBLICATION_ACTOR_UNATTRIBUTED');
    expect(forecastPublicationStore.get(id)).toEqual(before);
    expect(forecastPublicationStore.get(id)!.state).toBe('Draft');
  });

  it('a named seat is not shown the line, and its discard ends the draft', async () => {
    const id = await openCarried();
    await i18n.changeLanguage(lng);
    mount(BUYER_NAMED);
    await screen.findByTestId('publication-discard');
    expect(screen.queryByTestId('publication-act-needs-person')).toBeNull();
    await discard();
    await waitFor(() => expect(forecastPublicationStore.get(id)!.state).toBe('Discarded'));
    expect(screen.queryByTestId('publication-failure')).toBeNull();
  });
});

describe('E2E-1 · the two sentences differ by locale', () => {
  it.each(['identity.preAct.namedRequired', 'identity.refused.namedRequired'])('%s', (key) => {
    expect(i18n.t(key, { lng: 'en' })).not.toBe(key);
    expect(i18n.t(key, { lng: 'en' })).not.toBe(i18n.t(key, { lng: 'id' }));
  });
});
