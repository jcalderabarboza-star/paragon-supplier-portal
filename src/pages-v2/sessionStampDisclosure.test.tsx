// ─────────────────────────────────────────────────────────────────────────────
// THE SESSION-STAMP DISCLOSURE — asserted through the RENDERED surfaces.
//
// Two supplier-document stamps are minted by the store from the WALL CLOCK at
// the moment the act is dispatched (anti-backdating, ruled), while every
// neighbouring date is a fixture literal shifted onto `DECLARED_PRESENT`.
// `SessionStampMarker` discloses that, per VALUE. These specs assert it where a
// reader meets it.
//
// ⚠️ **THE LOAD-BEARING TEST IS THE NEGATIVE ONE.** A marker that appeared on
// every `rejectedAt` would pass every positive assertion here and be FALSE on
// `doc-012`, whose refusal is an authored literal and not an act anybody
// performed. *"The seeded row shows no marker"* is the honesty constraint, and
// it is the one assertion that cannot be satisfied by a marker that always
// renders.
//
// ⚠️ **AND ITS TWIN IS WHAT MAKES THE DISCRIMINATOR A DISCRIMINATOR.** The same
// `doc-012`, refused AGAIN through the shipped verbs, MUST show the marker — on
// the same id, with only the value changed. Together the two say the derivation
// follows the VALUE and not the ROW, which is the difference between this and
// the id-keyed version that would have shipped a false disclosure.
//
// ── ANTI-VACUITY ────────────────────────────────────────────────────────────
// Every positive case below dispatches through `MockCommandService` and the
// first control proves the STORE MOVED — that the stamp under assertion was
// really minted rather than seeded. Without it, "the marker is present" would
// be satisfied by a render that never reached a session stamp at all
// (`EMPTY-INPUT-REPORTS-CLEAN-01`).
//
// ── REACH — WHAT THIS FILE DOES NOT GUARD ───────────────────────────────────
// · **Other wall-clock-minted fields on other surfaces.** `decidedAt`,
//   `reviewStartedAt`, `pinnedAt`, `setAt`, `grantedAt`, `openedAt` and the
//   SDC `InventoryDeclaration.declaredAt` (a DIFFERENT field on a different
//   type, rendered at `SupplierForecasts.tsx`) are all out of scope by ruling
//   and carry no marker. Nothing here would notice if one acquired a false one.
// · **The C3 audit `ts`.** Frozen, wall-clock, deliberately unmarked.
// · **Whether `P` tells the authored story.** These assert the copy NAMES the
//   declared present and derives it; they say nothing about whether the shifted
//   corpus is coherent at it. Measured and NOT guarded here: `doc-012`'s seeded
//   `rejectedAt` lands 139 days AFTER `P`.
// · **Certificate validity.** Nothing here reads or asserts a scheme, an
//   expiry, an enforcement mode or a verification outcome, and the marker
//   claims none of them.
// · **Time of day.** `formatDate` is date-only; a session stamp and a seeded one
//   can render the SAME date text. That is why the negative test asserts the
//   MARKER's absence and never a date's.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, within, cleanup } from '@testing-library/react';
import { renderWithProviders, SUPPLIER, BUYER } from '../test/test-utils';
import i18n from '../lib/i18n';
import SupplierDocuments from './SupplierDocuments';
import BuyerCompliance from './BuyerCompliance';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import { supplierDocumentStore } from '../services/data/mock/stores/supplierDocumentStore';
import { DOCUMENTS } from '../services/data/mock/fixtures/supplierDocuments';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';
import { formatDate } from '../lib/format';
import { stampOrigin } from '../services/data/stampProvenance';
import { NO_PERSON } from '../context/noPerson';
import type { QueryScope } from '../services/data/types';

const svc = new MockCommandService();

/** The supplier lane that holds `supplierdoc:upload` — derived from
 *  `LANE_BUNDLES`, not guessed: `back_office`. */
const backOffice: QueryScope = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: ['back_office'],
  actor: NO_PERSON,
};

/** The buyer lane that holds `supplierdoc:reject` — `compliance`. */
const complianceSeat: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['compliance'],
  actor: NO_PERSON,
};

const DECLARATION = {
  certType: 'HALAL_BPJPH',
  certNumber: 'ID-BPJPH-STAMP-0001',
  issuer: 'BPJPH',
  issuedOn: '2026-02-01',
  expiresOn: null,
  scopeText: 'All PET bottle grades produced at the Tangerang plant',
};

async function declareOne(): Promise<string> {
  const res = await svc.dispatch(backOffice, {
    transitionId: 't_supplierdoc_declare',
    entity: 'supplierDocument',
    payload: { ...DECLARATION, supplierId: 'sup-007' },
  });
  expect(res.status, 'the declare verb must really fire').not.toBe('failed');
  return res.entityId!;
}

async function rejectOne(id: string, reason: string): Promise<void> {
  const res = await svc.dispatch(complianceSeat, {
    transitionId: 't_supplierdoc_reject',
    entity: 'supplierDocument',
    entityId: id,
    payload: { rejectionReason: reason },
  });
  expect(res.status, 'the reject verb must really fire').not.toBe('failed');
}

/** `doc-012` back through `Under Review` and refused a SECOND time — the same
 *  row, a new value. `t_supplierdoc_submit` takes `Rejected` as a `from`. */
async function refuseDoc012Again(reason: string): Promise<void> {
  const res = await svc.dispatch(backOffice, {
    transitionId: 't_supplierdoc_submit',
    entity: 'supplierDocument',
    entityId: 'doc-012',
    payload: { ...DECLARATION, supplierId: 'sup-007' },
  });
  expect(res.status, 'the re-declare must really fire').not.toBe('failed');
  await rejectOne('doc-012', reason);
}

const seededDoc012 = () => DOCUMENTS.find((d) => d.id === 'doc-012')!;

beforeEach(() => {
  supplierDocumentStore.reset();
});

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage('en');
});

describe('session-stamp disclosure — controls', () => {
  it('CONTROL — the subject exists: doc-012 is SEEDED with a refusal', () => {
    const seeded = seededDoc012();
    expect(seeded.status).toBe('Rejected');
    expect(seeded.rejectedAt, 'the seeded value is this file’s negative case').toBeTruthy();
    // The negative half: no fixture row carries a declaration, which is why the
    // declaredAt site has no seeded arm to test on the surface.
    expect(DOCUMENTS.filter((d) => d.declaration)).toHaveLength(0);
  });

  it('CONTROL — a dispatched refusal really moves the STORE off the seeded value', async () => {
    const before = supplierDocumentStore.get('doc-012')!.rejectedAt;
    expect(before).toBe(seededDoc012().rejectedAt);
    await refuseDoc012Again('Scope still excludes PK-PETB-8810.');
    const after = supplierDocumentStore.get('doc-012')!.rejectedAt;
    expect(after).toBeTruthy();
    expect(after, 'the act must mint a NEW value, or every positive test is vacuous').not.toBe(
      before,
    );
  });

  it('CONTROL — the discriminator follows the VALUE, and the id proves nothing', () => {
    const seeded = seededDoc012();
    // Same id, two values: one seeded, one not. An id-keyed discriminator
    // cannot tell these apart, which is the whole reason it was rejected.
    expect(stampOrigin('doc-012', 'rejectedAt', seeded.rejectedAt!)).toBe('SEEDED');
    expect(stampOrigin('doc-012', 'rejectedAt', '2026-09-16T04:00:00.000Z')).toBe('SESSION');
    // And a row the corpus has never held is SESSION whatever the value.
    expect(stampOrigin('doc-9001', 'rejectedAt', seeded.rejectedAt!)).toBe('SESSION');
  });
});

describe('SupplierDocuments — rejectedAt', () => {
  it('⚠️ THE HONESTY CONSTRAINT — a SEEDED refusal carries NO session marker', async () => {
    renderWithProviders(<SupplierDocuments />, { identity: SUPPLIER });
    const block = await screen.findByTestId('doc-refusal-doc-012');
    // NON-VACUITY: the block IS on screen with its seeded date, so the absent
    // marker is the marker's absence and not the row's.
    expect(block).toHaveTextContent(formatDate(seededDoc012().rejectedAt!));
    expect(screen.queryByTestId('session-stamp-rejectedAt-doc-012')).toBeNull();
  });

  it('a refusal dispatched in this session DOES carry the marker', async () => {
    const id = await declareOne();
    await rejectOne(id, 'Scope does not cover the materials we buy.');
    renderWithProviders(<SupplierDocuments />, { identity: SUPPLIER });
    const marker = await screen.findByTestId(`session-stamp-rejectedAt-${id}`);
    expect(marker).toHaveTextContent('Recorded this session');
    expect(marker).toHaveTextContent(
      /Written from this device's clock at the moment the action was recorded/,
    );
    // It sits INSIDE that document's own refusal block — beside the value it
    // is about, not loose on the page.
    const block = screen.getByTestId(`doc-refusal-${id}`);
    expect(within(block).getByTestId(`session-stamp-rejectedAt-${id}`)).toBe(marker);
  });

  it('⚠️ THE SAME SEEDED ROW, REFUSED AGAIN, DOES carry it — the value moved, the id did not', async () => {
    await refuseDoc012Again('Scope still excludes PK-PETB-8810.');
    renderWithProviders(<SupplierDocuments />, { identity: SUPPLIER });
    const marker = await screen.findByTestId('session-stamp-rejectedAt-doc-012');
    expect(marker).toHaveTextContent('Recorded this session');
  });

  it('renders the marker in ID as well, by key', async () => {
    const id = await declareOne();
    await rejectOne(id, 'Cakupan tidak mencakup material yang kami beli.');
    await i18n.changeLanguage('id');
    renderWithProviders(<SupplierDocuments />, { identity: SUPPLIER });
    const marker = await screen.findByTestId(`session-stamp-rejectedAt-${id}`);
    expect(marker).toHaveTextContent('Dicatat pada sesi ini');
    expect(marker).toHaveTextContent(/Ditulis dari jam perangkat ini pada saat tindakan dicatat/);
  });
});

describe('BuyerCompliance — declaredAt', () => {
  it('a declaration made in this session carries the marker', async () => {
    const id = await declareOne();
    renderWithProviders(<BuyerCompliance />, { identity: BUYER });
    const marker = await screen.findByTestId(`session-stamp-declaredAt-${id}`);
    expect(marker).toHaveTextContent('Recorded this session');
    // Beside the value it describes, inside that document's queue row.
    const row = screen.getByTestId(`doc-review-${id}`);
    expect(within(row).getByTestId(`session-stamp-declaredAt-${id}`)).toBe(marker);
  });

  it('renders it in ID as well, by key', async () => {
    const id = await declareOne();
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerCompliance />, { identity: BUYER });
    const marker = await screen.findByTestId(`session-stamp-declaredAt-${id}`);
    expect(marker).toHaveTextContent('Dicatat pada sesi ini');
  });
});

describe('the declared present in the copy is DERIVED, not typed', () => {
  it('the note carries formatDate(DECLARED_PRESENT) in EN', async () => {
    const id = await declareOne();
    renderWithProviders(<BuyerCompliance />, { identity: BUYER });
    const marker = await screen.findByTestId(`session-stamp-declaredAt-${id}`);
    expect(marker).toHaveTextContent(formatDate(DECLARED_PRESENT));
  });

  // ⚠️ **DO NOT TRIM THIS AS A DUPLICATE OF THE EN TEST ABOVE. IT IS THE ONLY
  // ASSERTION IN THIS FILE THAT CAN CONVICT A LITERAL DATE PUT WHERE THE
  // DERIVATION BELONGS**, and the reason is that the EN test cannot: its
  // expected value is `formatDate(DECLARED_PRESENT)` evaluated in EN, which is
  // byte-for-byte what an EN literal typed into the copy would render. Replace
  // the derivation with that literal and the EN test stays green.
  //
  // The ID run is what separates them. `formatDate` localises the month, so the
  // same constant renders differently in the two locales; an EN literal frozen
  // into the string therefore FAILS here and only here. The two tests read as
  // one test run twice. They are not.
  it('and the ID form of the SAME constant in ID — a token that genuinely differs', async () => {
    const id = await declareOne();
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerCompliance />, { identity: BUYER });
    const marker = await screen.findByTestId(`session-stamp-declaredAt-${id}`);
    const idDate = formatDate(DECLARED_PRESENT);
    expect(marker).toHaveTextContent(idDate);
    // ⚠️ THE PROBE NEEDS A DIVERGENT TOKEN OR IT CANNOT FAIL. `formatDate`
    // localises the MONTH, so EN and ID differ ("Aug" / "Agu"); asserting a
    // date that reads identically in both locales would be an assertion with
    // no content. This pins that they really diverge.
    await i18n.changeLanguage('en');
    expect(idDate, 'EN and ID must render this date differently').not.toBe(
      formatDate(DECLARED_PRESENT),
    );
  });
});
