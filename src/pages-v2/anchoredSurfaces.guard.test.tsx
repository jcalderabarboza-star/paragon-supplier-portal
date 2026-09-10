// ─────────────────────────────────────────────────────────────────────────────
// ANCHORED SURFACES — the guard, one named test per surface.
//
// ⚠️ **WHAT THIS ASSERTS, AND WHY IT CANNOT DECAY.** Each surface below is
// rendered at TWO instants far apart and its full rendered text is compared to
// ITSELF. Nothing is compared to a literal date, so there is no day on which
// this file starts failing with no commit involved — the property is *"the
// output does not depend on the clock"*, and that is as true in 2029 as today.
// This is the CP-0 trap inverted: the specs that broke on 2026-08-02 asserted a
// clock-derived LABEL, this asserts clock-INDEPENDENCE.
//
// ⚠️ **IT IS PER-SURFACE ON PURPOSE, AND THAT IS THE WHOLE POINT.** A single
// spec proving `DECLARED_PRESENT` is constant would prove nothing about nine
// separate wirings — it would pass with eight of them still reading
// `new Date()`. Each surface below was mutation-probed by restoring its own
// wall-clock read and confirming THIS file goes red naming THAT surface.
//
// ⚠️ **THE ANTI-VACUITY CONTROL IS NOT OPTIONAL.** Every assertion here is an
// equality between two renders, and equality is exactly what a harness that
// FAILED TO MOVE THE CLOCK also produces (`EMPTY-INPUT-REPORTS-CLEAN-01`). The
// first test proves the proxy really does move the calendar the components read,
// so the eight green equalities below it mean "anchored" rather than "the clock
// never moved". Without it this file is nine tests that cannot fail.
//
// ⚠️ **WHAT IS DELIBERATELY NOT HERE.** `BuyerDashboard` (and the two widgets
// rendered only on it) and `BuyerInvoices` are NOT anchored and are NOT guarded:
// their day-counts are projected in `MockProcurementService`, and the invoice
// fixtures are coherent at `DEMO_NOW` (2026-07-06), not at `DECLARED_PRESENT` —
// see `invoiceRead.test.ts`, which pins that instant and says so. Anchoring that
// read to `P` would freeze 13 overdue rows where the fixture intends one. They
// ride when `invoice` becomes a real anchored family.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { act } from 'react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, BUYER, SUPPLIER } from '../test/test-utils';
import { usePinnedDemoClock, DEMO_NOW } from '../test/demoClock';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';
import { formatDate } from '../lib/format';
import BuyerShipments from './BuyerShipments';
import BuyerGoodsReceipt from './BuyerGoodsReceipt';

import BuyerCompliance from './BuyerCompliance';
import BuyerContractDetail from './BuyerContractDetail';
import BuyerContracts from './BuyerContracts';
import BuyerRisk from './BuyerRisk';
import BuyerSourcing from './BuyerSourcing';
import SupplierDashboard from './SupplierDashboard';
import SupplierDocuments from './SupplierDocuments';
import SupplierStorefront from './SupplierStorefront';
import SupplierCertsExpiringWidget from './widgets/SupplierCertsExpiringWidget';

/** Two instants ~5 years apart. Both are OFFSETS from the real clock, so the
 *  pair moves with the calendar and neither is a dated literal. */
const FAR_A = 400 * 86_400_000;
const FAR_B = 2_200 * 86_400_000;

function installClock(ms: number) {
  const real = globalThis.Date;
  const offset = ms - real.now();
  globalThis.Date = new Proxy(real, {
    construct: (t, a) =>
      a.length === 0
        ? new t(real.now() + offset)
        : new t(...(a as ConstructorParameters<DateConstructor>)),
    get: (t, p, r) => (p === 'now' ? () => real.now() + offset : Reflect.get(t, p, r)),
  }) as DateConstructor;
  return () => {
    globalThis.Date = real;
  };
}

async function settle(get: () => string): Promise<string> {
  let prev = '';
  let stable = 0;
  for (let i = 0; i < 80; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 25));
    });
    const cur = get();
    if (cur === prev) {
      if (++stable >= 2) break;
    } else {
      stable = 0;
      prev = cur;
    }
  }
  return get();
}

interface Surface {
  el: React.ReactNode;
  route: string;
  path?: string;
  supplier?: boolean;
  /** Opens the region the clock-derived values live in, where it is not the
   *  default view. Without it the render is a vacuous pass for that surface. */
  reveal?: () => void;
}

async function textAt(s: Surface, at: number): Promise<string> {
  const restore = installClock(at);
  try {
    const ui = s.path ? <Routes><Route path={s.path} element={s.el} /></Routes> : s.el;
    const { container } = renderWithProviders(ui, {
      route: s.route,
      identity: s.supplier ? SUPPLIER : BUYER,
    });
    await settle(() => container.textContent ?? '');
    if (s.reveal) {
      s.reveal();
      await settle(() => container.textContent ?? '');
    }
    return (container.textContent ?? '').replace(/\s+/g, ' ').trim();
  } finally {
    cleanup();
    restore();
  }
}

/** The whole assertion: identical at two instants ~5 years apart. */
async function expectAnchored(s: Surface) {
  const a = await textAt(s, Date.now() + FAR_A);
  const b = await textAt(s, Date.now() + FAR_B);
  expect(a.length).toBeGreaterThan(200); // it really rendered
  expect(b).toBe(a);
}

afterEach(cleanup);

describe('anchored surfaces — clock-independent by construction', () => {
  // ── THE CONTROL. Must come first: it is what makes the equalities below mean
  //    something. A component reading the wall clock MUST differ across exactly
  //    the two instants every test below asserts equality at.
  it('CONTROL — the harness really moves the calendar (a wall-clock read DIFFERS)', async () => {
    const WallClockProbe: React.FC = () => <span>{new Date().toISOString().slice(0, 10)}</span>;
    const probe: Surface = { el: <WallClockProbe />, route: '/' };
    const a = await textAt(probe, Date.now() + FAR_A);
    const b = await textAt(probe, Date.now() + FAR_B);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  // ── THE KNOWN-GOOD CONTROL. The other half of the pair: the control above
  //    proves the harness MOVES the clock, this proves it does not move an
  //    ALREADY-ANCHORED surface. Without it, a harness that corrupted
  //    `DECLARED_PRESENT` would convict every anchored surface in the tree and
  //    read exactly like a successful sweep.
  //
  // ⚠️ **WHAT THIS CONTROL CATCHES AND WHAT IT DOES NOT — MEASURED, NOT
  //    ASSUMED.** Three mutations were run against it; only one killed it, and
  //    saying so is the point:
  //
  //      · proxy forwards EVERY construct as zero-arg (so `DECLARED_PRESENT`
  //        moves with the horizon) ................................... KILLED.
  //        The suite goes red and convicts *anchored* surfaces — which is
  //        exactly the symptom a corrupted harness produces, and the reason
  //        this control exists.
  //      · `const TODAY = new Date()...` at MODULE SCOPE ....... NOT killed.
  //      · the anchor text taken off every render site ......... NOT killed.
  //
  //    The module-scope miss is not a hole to patch, it is a property of every
  //    render-diff instrument: a module-scope const resolves at IMPORT, once,
  //    BEFORE any `beforeEach` installs the proxy — the same mechanism
  //    `fixturePresent.ts` cites when it rules out a clock read inside seed
  //    data ("it fails WHERE NOTHING COULD SEE IT"). A surface whose clock read
  //    is at module scope is invisible here and needs a source-level check.
  //
  //    So `toContain` below is NECESSARY, not SUFFICIENT: it proves the anchor
  //    reaches the screen, but it survived the off-screen mutation because the
  //    same date also appears in this page's fixture rows. The teeth of this
  //    control are the equality, under mutation 1.
  it('CONTROL — an ALREADY-anchored surface is unmoved, and its anchor is on screen', async () => {
    const anchorText = formatDate(DECLARED_PRESENT);
    for (const [el, route] of [
      [<BuyerShipments />, '/buyer/shipments'],
      [<BuyerGoodsReceipt />, '/buyer/goods-receipt'],
    ] as Array<[React.ReactNode, string]>) {
      const a = await textAt({ el, route }, Date.now() + FAR_A);
      const b = await textAt({ el, route }, Date.now() + FAR_B);
      expect(a).toContain(anchorText); // non-vacuity: the anchor really renders
      expect(b).toBe(a);
    }
  });

  // ⚠️ **THE PROPERTY THE WHOLE HARNESS RESTS ON, ASSERTED RATHER THAN
  //    ASSUMED.** `DECLARED_PRESENT` is built with `new Date(<number>)` — ONE
  //    argument — and the proxy above forwards every construct with arguments
  //    untouched, so the declared present is immune to the offset. If that ever
  //    stopped being true the proxy would drag every anchored surface along
  //    with the horizon and this file would convict the entire tree while
  //    looking like a working sweep. The control is the zero-arg read beside it.
  it('CONTROL — the proxy cannot move DECLARED_PRESENT (only zero-arg reads move)', async () => {
    const before = DECLARED_PRESENT;
    const restore = installClock(Date.now() + FAR_B);
    try {
      expect(DECLARED_PRESENT).toBe(before);
      expect(
        new Date(Date.parse(`${before}T00:00:00.000Z`)).toISOString().slice(0, 10),
      ).toBe(before);
      // the zero-arg read MUST have moved, or the two equalities above are vacuous
      expect(new Date().toISOString().slice(0, 10)).not.toBe(before);
    } finally {
      restore();
    }
    expect(DECLARED_PRESENT).toBe(before);
  });

  it('BuyerCompliance is anchored', async () => {
    await expectAnchored({ el: <BuyerCompliance />, route: '/buyer/compliance' });
  });

  it('BuyerContracts is anchored', async () => {
    await expectAnchored({ el: <BuyerContracts />, route: '/buyer/contracts' });
  });

  it('BuyerContractDetail is anchored', async () => {
    await expectAnchored({
      el: <BuyerContractDetail />,
      path: '/buyer/contracts/:id',
      route: '/buyer/contracts/ctr-003',
    });
  });

  // ⚠️ The clock read lives in `ComplianceRisksTab`, and the default tab is
  //    `geo` — so this MUST open the compliance tab. Rendered at the default
  //    tab this page is byte-identical whether or not it is anchored, which is
  //    how it read as acquitted in the census that preceded this batch.
  it('BuyerRisk is anchored (compliance tab — where its day-counts live)', async () => {
    await expectAnchored({
      el: <BuyerRisk />,
      route: '/buyer/risk',
      reveal: () => fireEvent.click(screen.getByText('Compliance Risks')),
    });
  });

  it('BuyerSourcing is anchored', async () => {
    await expectAnchored({ el: <BuyerSourcing />, route: '/buyer/sourcing' });
  });

  it('SupplierDashboard is anchored', async () => {
    await expectAnchored({
      el: <SupplierDashboard />,
      route: '/supplier/dashboard',
      supplier: true,
    });
  });

  it('SupplierDocuments is anchored', async () => {
    await expectAnchored({
      el: <SupplierDocuments />,
      route: '/supplier/documents',
      supplier: true,
    });
  });

  // ⚠️ Mounted under its real route: without a matching <Route> `useParams()` is
  //    empty, the page renders "not found", and the comparison passes over a
  //    surface that never rendered.
  it('SupplierStorefront is anchored', async () => {
    await expectAnchored({
      el: <SupplierStorefront />,
      path: '/marketplace/supplier/:id',
      route: '/marketplace/supplier/sup-007',
    });
  });

  it('SupplierCertsExpiringWidget is anchored', async () => {
    const a = await textAt(
      { el: <SupplierCertsExpiringWidget />, route: '/supplier/dashboard', supplier: true },
      Date.now() + FAR_A,
    );
    const b = await textAt(
      { el: <SupplierCertsExpiringWidget />, route: '/supplier/dashboard', supplier: true },
      Date.now() + FAR_B,
    );
    expect(a.length).toBeGreaterThan(20);
    expect(b).toBe(a);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// `usePinnedDemoClock` still works — the property the anchoring rests on.
//
// Anchoring a surface does NOT disable the test harness: the proxy still
// installs and still moves what `new Date()` returns. What changes is that the
// anchored surfaces no longer CONSULT it, which is the intended behaviour and
// not a regression of the harness. Every spec that pins the clock to assert a
// clock-derived label on an UNANCHORED read (e.g. `invoiceRead.test.ts`) is
// untouched — 4577 tests were green on this branch before this file was added.
// ─────────────────────────────────────────────────────────────────────────────
describe('usePinnedDemoClock is unaffected by anchoring', () => {
  usePinnedDemoClock();

  it('still pins the calendar the harness controls', () => {
    expect(new Date().toISOString().slice(0, 10)).toBe(DEMO_NOW.slice(0, 10));
    expect(new Date(Date.now()).toISOString().slice(0, 10)).toBe(DEMO_NOW.slice(0, 10));
  });

  it('and an explicit argument still moves it', () => {
    // Proves the pin is a real mechanism and not a constant that happens to match.
    expect(new Date('2026-01-02').toISOString().slice(0, 10)).toBe('2026-01-02');
  });
});
