// ────────────────────────────────────────────────────────────────────────────
// OPS-2 · RECEIVING AT THE SURFACE.
//
// R-OPS P0-4 and P0-5 were found in the browser, so they are held here at the
// page: a receipt that EXISTS is worked to its end from the list (no second
// receipt is made), a hold is placed and left, a material nobody has ruled on
// blocks with its owner named, Compliance rules and the ruling is shown where it
// decides, and the supplier's dock tab reads its own shipments.
//
// Every walk goes through the shipped pages against the seeded stores; a ruling
// is recorded through the dispatcher, never written into a store by hand.
// ────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import {
  renderWithProviders,
  BUYER,
  BUYER_NAMED_COMPLIANCE,
  SUPPLIER,
} from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import { goodsReceiptStore } from '../services/data/mock/stores/goodsReceiptStore';
import { asnStore } from '../services/data/mock/stores/asnStore';
import { materialRulingStore } from '../services/data/mock/stores/materialRulingStore';
import { enforcementSettingStore } from '../services/data/mock/stores/enforcementSettingStore';
import type { QueryScope } from '../services/data/types';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';
import { MATERIAL_MASTER } from '../services/sdc/fixtures';
import { bpomOf } from '../services/sdc/bpom';
import { mockShipments } from '../data/mockShipments';
import { personLabel } from '../services/identity/personLabel';
import i18n from '../lib/i18n';
import BuyerGoodsReceipt from './BuyerGoodsReceipt';
import BuyerCompliance from './BuyerCompliance';
import SupplierShipments, { dockAppointmentsOf } from './SupplierShipments';
import { useToast } from '../hooks/useToast';
import { usePinnedDemoClock } from '../test/demoClock';

const svc = new MockCommandService();
const t = (k: string, o?: Record<string, unknown>) => i18n.t(k, o) as string;

function ToastSpy() {
  const { toasts } = useToast();
  return (
    <ul data-testid="toast-spy">
      {toasts.map((x) => (
        <li key={x.id}>{`${x.title} ${x.description ?? ''}`}</li>
      ))}
    </ul>
  );
}
const Receiving = () => (
  <>
    <BuyerGoodsReceipt />
    <ToastSpy />
  </>
);
const Compliance = () => (
  <>
    <BuyerCompliance />
    <ToastSpy />
  </>
);

const COMPLIANCE_ACTOR = BUYER_NAMED_COMPLIANCE.actor!;
const COMPLIANCE_ID = COMPLIANCE_ACTOR.kind === 'RESOLVED' ? COMPLIANCE_ACTOR.person.personId : '';
const complianceScope: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['compliance'] as QueryScope['businessRoles'],
  actor: COMPLIANCE_ACTOR,
};
const rule = (materialCode: string, regime: 'halal' | 'bpom', applicable: boolean, reason: string) =>
  svc.dispatch(complianceScope, {
    transitionId: 't_material_ruling_set',
    entity: 'materialRuling',
    entityId: materialCode,
    payload: { regime, applicable, reason },
  });

const byNumber = (grNumber: string) => goodsReceiptStore.all().find((g) => g.grNumber === grNumber)!;
const openRow = async (grNumber: string) => {
  await screen.findByText('Rejection Rate (30d)');
  fireEvent.click(await screen.findByText(grNumber));
};
const next = () => screen.getByRole('button', { name: 'Next' });
const submit = () => screen.getByRole('button', { name: 'Submit inspection results' });
const toasts = () => screen.getByTestId('toast-spy').textContent ?? '';

beforeEach(() => {
  goodsReceiptStore.reset();
  asnStore.reset();
  materialRulingStore.reset();
  enforcementSettingStore.reset();
});
afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('OPS-2 · P0-4 — a receipt that exists is worked from the list', () => {
  it('GR-2026-002: Start inspection resumes THAT receipt — inspected, approved and posted, and no second receipt is made', async () => {
    const before = goodsReceiptStore.all().length;
    const seeded = byNumber('GR-2026-002');
    expect(seeded.status).toBe('Pending Inspection');

    renderWithProviders(<Receiving />);
    await openRow('GR-2026-002');
    fireEvent.click(await screen.findByRole('button', { name: 'Start inspection' }));

    // The form opens ON the receipt: no source step, and it says which receipt.
    const banner = await screen.findByTestId('gr-resume-banner');
    expect(banner).toHaveTextContent('Working receipt');
    expect(banner).toHaveTextContent('GR-2026-002');
    expect(banner).toHaveTextContent(seeded.asnNumber);
    expect(banner).toHaveTextContent(seeded.poNumber);
    expect(screen.queryByText('Select inbound at dock')).not.toBeInTheDocument();
    // Its own line, with what the receipt recorded as received.
    expect(screen.getByLabelText('Received quantity for PK-PETB-8801')).toHaveValue('120000');

    fireEvent.click(next()); // → quality
    // Packaging is asked the seal check (halal applies by default), is answered
    // by a SAMPLE certificate on file, and owes no BPOM lot check.
    expect(screen.queryByTestId('gr-halal-refusal-0')).not.toBeInTheDocument();
    expect(screen.getByTestId('gr-cert-valid-0')).toHaveTextContent('SAMPLE-HALAL-0007F');
    expect(screen.queryByText('BPOM Lot Tracking')).not.toBeInTheDocument();
    expect(next()).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: /Halal Seal Check.*Pass/ }));
    expect(next()).toBeEnabled();
    fireEvent.click(next()); // → disposition
    fireEvent.click(submit());

    await waitFor(() => expect(byNumber('GR-2026-002').status).toBe('Posted to SAP'), { timeout: 4000 });
    const done = byNumber('GR-2026-002');
    expect(done.sapMaterialDoc).toBeTruthy();
    expect(done.inspectionResults[0]).toMatchObject({
      materialCode: 'PK-PETB-8801',
      qtyAccepted: 120000,
      qtyRejected: 0,
      visualCheck: 'Pass',
      packagingCheck: 'Pass',
      halalSealCheck: 'Pass',
    });
    // ⚠️ THE DEFECT, INVERTED: nothing was created.
    expect(goodsReceiptStore.all()).toHaveLength(before);
    await waitFor(() => expect(toasts()).toMatch(/GR-2026-002 posted to SAP/));
  }, 20000);

  it('GR-2026-008: Submit inspection results places a hold with its reason; a retest returns it; it is then decided', async () => {
    const before = goodsReceiptStore.all().length;
    expect(byNumber('GR-2026-008').status).toBe('Under Inspection');

    const first = renderWithProviders(<Receiving />);
    await openRow('GR-2026-008');
    fireEvent.click(await screen.findByRole('button', { name: 'Submit inspection results' }));
    await screen.findByTestId('gr-resume-banner');
    fireEvent.click(next()); // → quality
    fireEvent.click(screen.getByRole('radio', { name: /Halal Seal Check.*Pass/ }));
    fireEvent.click(next()); // → disposition

    // The hold is a choice with a reason — the commit is disabled until it has one.
    fireEvent.click(screen.getByTestId('gr-hold-instead'));
    expect(submit()).toBeDisabled();
    fireEvent.change(screen.getByTestId('gr-hold-reason'), {
      target: { value: 'Print registration off; lab to confirm.' },
    });
    expect(submit()).toBeEnabled();
    fireEvent.click(submit());

    await waitFor(() => expect(byNumber('GR-2026-008').status).toBe('Quality Hold'));
    expect(byNumber('GR-2026-008').notes).toBe('Print registration off; lab to confirm.');
    // The inspection was recorded before the hold, and nothing was posted.
    expect(byNumber('GR-2026-008').inspectionResults[0].halalSealCheck).toBe('Pass');
    expect(byNumber('GR-2026-008').sapMaterialDoc).toBeFalsy();
    await waitFor(() => expect(toasts()).toMatch(/GR-2026-008 is on quality hold/));
    first.unmount();

    // Hold → retest → the same form on the same receipt → decided.
    renderWithProviders(<Receiving />);
    await openRow('GR-2026-008');
    fireEvent.click(await screen.findByRole('button', { name: 'Request lab retest' }));
    await waitFor(() => expect(byNumber('GR-2026-008').status).toBe('Under Inspection'));
    fireEvent.click(await screen.findByRole('button', { name: 'Submit inspection results' }));
    await screen.findByTestId('gr-resume-banner');
    fireEvent.click(next());
    // What was recorded before the hold opens as recorded.
    expect(screen.getByRole('radio', { name: /Halal Seal Check.*Pass/ })).toBeChecked();
    fireEvent.click(next());
    fireEvent.click(submit());
    await waitFor(() => expect(byNumber('GR-2026-008').status).toBe('Posted to SAP'), { timeout: 4000 });
    expect(goodsReceiptStore.all()).toHaveLength(before);
  }, 30000);

  it('a new receipt opens its received date on the declared present', async () => {
    renderWithProviders(<Receiving />);
    await screen.findByText('Rejection Rate (30d)');
    fireEvent.click(screen.getByRole('button', { name: /New GR/i }));
    const dock = mockShipments.find((s) => s.status === 'At Dock')!;
    fireEvent.click(await screen.findByText(dock.asnNumber));
    fireEvent.click(next());
    const date = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(date.value).toBe(DECLARED_PRESENT);
    expect(date.value).not.toBe('2026-05-20');
    expect(date).not.toBeDisabled();
  });

  it('a resumed receipt shows the date it was received and does not offer to rewrite it', async () => {
    renderWithProviders(<Receiving />);
    await openRow('GR-2026-002');
    fireEvent.click(await screen.findByRole('button', { name: 'Start inspection' }));
    await screen.findByTestId('gr-resume-banner');
    const date = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(date.value).toBe(byNumber('GR-2026-002').receivedDate);
    expect(date).toBeDisabled();
  });
});

/** GR-2026-007 is seeded on Quality Hold; its one line is a raw material with no BPOM ruling. */
const PENDING_CODE = 'RM-EMUL-3320';

const openHeldReceipt = async () => {
  renderWithProviders(<Receiving />);
  await openRow('GR-2026-007');
  fireEvent.click(await screen.findByRole('button', { name: 'Request lab retest' }));
  await waitFor(() => expect(byNumber('GR-2026-007').status).toBe('Under Inspection'));
  fireEvent.click(await screen.findByRole('button', { name: 'Submit inspection results' }));
  await screen.findByTestId('gr-resume-banner');
  fireEvent.click(next()); // → quality
};

describe('OPS-2 · P0-5 — applicability is ruled by Compliance and read at receipt', () => {
  // ⚠️ THE CLOCK IS PINNED TO THE DECLARED PRESENT, AND THE REASON IS A FINDING.
  // The receiving form reads certificate validity at the REAL clock (one instant
  // captured when it opens — the H4 design, unchanged here). This receipt's
  // supplier holds a halal certificate that expires ON the declared present
  // (creg-0015, 2026-08-31), so at any later real date the line is stopped by
  // its certificate whatever Compliance rules about BPOM. The specs below are
  // about the RULING, so they are asked at the instant the corpus was written
  // for; the block after this one holds the other half, a day later.
  usePinnedDemoClock();

  it('the population is real — the line is BPOM-pending in the master, and not every material is', () => {
    expect(byNumber('GR-2026-007').inspectionResults.map((r) => r.materialCode)).toEqual([PENDING_CODE]);
    expect(bpomOf(PENDING_CODE)).toMatchObject({ ok: false, reason: 'UNDETERMINED_APPLICABILITY' });
    expect(bpomOf('AI-NIAC-6601')).toEqual({ ok: true, applicable: true });
  });

  it('a BPOM-pending material blocks the receipt, says it is pending, and names who rules', async () => {
    await openHeldReceipt();
    const refusal = screen.getByTestId('gr-bpom-refusal-0');
    expect(refusal).toHaveAttribute('role', 'alert');
    expect(refusal).toHaveTextContent('BPOM: pending — Compliance to rule.');
    expect(refusal).toHaveTextContent(`Nobody has ruled whether BPOM applies to ${PENDING_CODE}.`);
    expect(refusal).toHaveTextContent('until Compliance rules on it, on the Compliance page under Material applicability');
    // No lot check is offered on a question nobody has answered…
    expect(screen.queryByText('BPOM Lot Tracking')).not.toBeInTheDocument();
    // …and answering everything else does not release the step.
    fireEvent.click(screen.getByRole('radio', { name: /Halal Seal Check.*Pass/ }));
    expect(next()).toBeDisabled();
  }, 15000);

  it('after Compliance rules BPOM does not apply, the same receipt shows the ruling and can be finished', async () => {
    const res = await rule(PENDING_CODE, 'bpom', false, 'Process emulsifier; not a notifiable cosmetic ingredient lot.');
    expect(res.status, res.reason).toBe('done');
    await openHeldReceipt();
    expect(screen.queryByTestId('gr-bpom-refusal-0')).not.toBeInTheDocument();
    const ruling = screen.getByTestId('gr-bpom-ruling-0');
    expect(ruling).toHaveTextContent('BPOM does not apply — ruled by Compliance. No lot check is asked for.');
    expect(ruling).toHaveTextContent(`Ruled by ${personLabel(COMPLIANCE_ID, t)}`);
    expect(ruling).toHaveTextContent('Reason: Process emulsifier; not a notifiable cosmetic ingredient lot.');
    // No person id reaches the reader.
    expect(document.body.textContent).not.toContain(COMPLIANCE_ID);
    expect(screen.queryByText('BPOM Lot Tracking')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /Halal Seal Check.*Pass/ }));
    expect(next()).toBeEnabled();
  }, 15000);

  it('and when Compliance rules BPOM DOES apply, the line asks for the lot check instead', async () => {
    expect((await rule(PENDING_CODE, 'bpom', true, 'Enters a notified formulation.')).status).toBe('done');
    await openHeldReceipt();
    expect(screen.queryByTestId('gr-bpom-refusal-0')).not.toBeInTheDocument();
    expect(screen.getByTestId('gr-bpom-ruling-0')).toHaveTextContent('BPOM applies — ruled by Compliance.');
    expect(screen.getByText('BPOM Lot Tracking')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /Halal Seal Check.*Pass/ }));
    expect(next()).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: /BPOM Lot Tracking.*Pass/ }));
    expect(next()).toBeEnabled();
  }, 15000);

  it('the pending sentence names the owner in Indonesian too', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<Receiving />);
    fireEvent.click(await screen.findByText('GR-2026-007'));
    fireEvent.click(await screen.findByRole('button', { name: 'Minta uji ulang lab' }));
    await waitFor(() => expect(byNumber('GR-2026-007').status).toBe('Under Inspection'));
    fireEvent.click(await screen.findByRole('button', { name: 'Kirim hasil inspeksi' }));
    expect(await screen.findByTestId('gr-resume-banner')).toHaveTextContent('Mengerjakan penerimaan');
    fireEvent.click(screen.getByRole('button', { name: /^(Berikutnya|Lanjut|Selanjutnya)$/ }));
    const refusal = screen.getByTestId('gr-bpom-refusal-0');
    expect(refusal).toHaveTextContent('BPOM: menunggu — Kepatuhan yang memutuskan.');
    expect(refusal).not.toHaveTextContent('Compliance to rule');
  }, 15000);
});

describe('OPS-2 · a ruling does not stand in for a certificate — one day after the declared present', () => {
  usePinnedDemoClock('2026-09-01T09:00:00.000Z');

  it('BPOM is ruled out, and the same line is still stopped: its halal certificate expired the day before', async () => {
    expect((await rule(PENDING_CODE, 'bpom', false, 'Process emulsifier.')).status).toBe('done');
    await openHeldReceipt();
    // The BPOM block is gone — the ruling did what a ruling does…
    expect(screen.queryByTestId('gr-bpom-refusal-0')).not.toBeInTheDocument();
    expect(screen.getByTestId('gr-bpom-ruling-0')).toBeInTheDocument();
    // …and the certificate block is its own fact, named, with its own remedy.
    const notice = screen.getByTestId('gr-cert-notice-0');
    expect(notice).toHaveAttribute('role', 'alert');
    expect(notice).toHaveTextContent(/expired on/i);
    expect(screen.getByTestId('gr-cert-consequence-0')).toHaveTextContent(
      'This line cannot pass the quality step. A valid halal certificate from this supplier for this material must be on file — or Compliance rules that halal does not apply to this material.',
    );
    fireEvent.click(screen.getByRole('radio', { name: /Halal Seal Check.*Pass/ }));
    expect(next()).toBeDisabled();
  }, 15000);
});

describe('OPS-2 · the Compliance surface — Material applicability', () => {
  const pendingCodes = Object.keys(MATERIAL_MASTER).filter((c) => {
    const o = bpomOf(c);
    return !o.ok && o.reason === 'UNDETERMINED_APPLICABILITY';
  });
  const panel = async () => within(await screen.findByTestId('material-applicability'));

  it('opens on what is waiting for a ruling — exactly the materials the master has not determined', async () => {
    expect(pendingCodes).toContain('RM-COCO-8200');
    expect(pendingCodes).not.toContain('PK-PETB-8801');
    renderWithProviders(<Compliance />, { identity: BUYER_NAMED_COMPLIANCE });
    const p = await panel();
    for (const code of pendingCodes) {
      expect(await p.findByTestId(`applicability-bpom-${code}`)).toHaveTextContent('Pending — Compliance to rule');
      // Halal is answered for every one of them — by the master's default.
      expect(p.getByTestId(`applicability-halal-${code}`)).toHaveTextContent('Applies');
    }
    // A packaging row is not waiting: it is not in this filter.
    expect(p.queryByTestId('applicability-halal-PK-PETB-8801')).not.toBeInTheDocument();
    expect(p.getByText(`Pending a ruling (${pendingCodes.length})`)).toBeInTheDocument();
  });

  it('Compliance rules a packaging material not applicable; the row, the ledger and the history say who and why', async () => {
    renderWithProviders(<Compliance />, { identity: BUYER_NAMED_COMPLIANCE });
    const p = await panel();
    fireEvent.click(await p.findByText(`All materials (${Object.keys(MATERIAL_MASTER).length})`));
    const cell = await p.findByTestId('applicability-halal-PK-CART-9901');
    expect(cell).toHaveTextContent('Applies');
    expect(cell).toHaveTextContent('halal applies to every material unless Compliance rules otherwise');

    fireEvent.click(p.getByTestId('applicability-rule-halal-PK-CART-9901'));
    // Said before the act: whose name it will carry.
    expect(p.getByTestId('applicability-attribution')).toHaveTextContent(
      `This ruling will be recorded under ${personLabel(COMPLIANCE_ID, t)}`,
    );
    // The commit waits for an answer AND a reason — each alone is not enough.
    expect(p.getByTestId('applicability-commit')).toBeDisabled();
    fireEvent.change(p.getByTestId('applicability-reason'), {
      target: { value: 'Secondary carton; no product contact.' },
    });
    expect(p.getByTestId('applicability-commit')).toBeDisabled(); // a reason, no answer
    fireEvent.click(p.getByTestId('applicability-choice-no'));
    expect(p.getByTestId('applicability-commit')).toBeEnabled();
    fireEvent.change(p.getByTestId('applicability-reason'), { target: { value: '   ' } });
    expect(p.getByTestId('applicability-commit')).toBeDisabled(); // an answer, no reason
    fireEvent.change(p.getByTestId('applicability-reason'), {
      target: { value: 'Secondary carton; no product contact.' },
    });
    fireEvent.click(p.getByTestId('applicability-commit'));

    await waitFor(() => expect(materialRulingStore.all()).toHaveLength(1));
    expect(materialRulingStore.all()[0]).toMatchObject({
      materialCode: 'PK-CART-9901',
      regime: 'halal',
      applicable: false,
      reason: 'Secondary carton; no product contact.',
      setBy: COMPLIANCE_ACTOR,
    });
    await waitFor(() =>
      expect(p.getByTestId('applicability-halal-PK-CART-9901')).toHaveTextContent('Does not apply'),
    );
    expect(p.getByTestId('applicability-halal-PK-CART-9901')).toHaveTextContent(
      `Ruled by ${personLabel(COMPLIANCE_ID, t)}`,
    );
    fireEvent.click(p.getByTestId('applicability-history-PK-CART-9901'));
    expect(p.getByTestId('applicability-ledger-PK-CART-9901')).toHaveTextContent(
      'Reason: Secondary carton; no product contact.',
    );
    expect(document.body.textContent).not.toContain(COMPLIANCE_ID);
    await waitFor(() => expect(toasts()).toMatch(/Ruling recorded for PK-CART-9901/));
    // BPOM for the same material is untouched.
    expect(p.getByTestId('applicability-bpom-PK-CART-9901')).toHaveTextContent('Does not apply');
    expect(p.getByTestId('applicability-bpom-PK-CART-9901')).toHaveTextContent('Material master');
  }, 15000);

  it('a seat that names nobody is told so before the act, and is refused by name', async () => {
    renderWithProviders(<Compliance />, { identity: BUYER });
    const p = await panel();
    fireEvent.click(await p.findByTestId('applicability-rule-bpom-RM-COCO-8200'));
    expect(p.getByTestId('applicability-attribution')).toHaveTextContent(
      'This seat names no person, so the ruling will be refused.',
    );
    fireEvent.click(p.getByTestId('applicability-choice-no'));
    fireEvent.change(p.getByTestId('applicability-reason'), { target: { value: 'x' } });
    fireEvent.click(p.getByTestId('applicability-commit'));
    await waitFor(() =>
      expect(toasts()).toMatch(/a ruling is recorded against the person who made it/),
    );
    expect(materialRulingStore.all()).toHaveLength(0);
    // The form stays open: nothing was recorded, so nothing is dismissed.
    expect(p.getByTestId('applicability-form')).toBeInTheDocument();
  }, 15000);

  it('a seat without the atom reads the table and is told whose act it is — no Rule control anywhere', async () => {
    const RECEIVING_ONLY: CurrentIdentity = { ...BUYER, businessRoles: ['receiving'] };
    renderWithProviders(<Compliance />, { identity: RECEIVING_ONLY });
    const p = await panel();
    expect(await p.findByTestId('handoff-material-rule')).toHaveTextContent('Awaiting Compliance');
    expect(await p.findByTestId('applicability-bpom-RM-COCO-8200')).toHaveTextContent('Pending — Compliance to rule');
    expect(p.queryByText('Rule')).not.toBeInTheDocument();
  });

  it('the same ruling twice is refused, and the copy says a ruling records a change', async () => {
    expect((await rule('RM-COCO-8200', 'bpom', false, 'First.')).status).toBe('done');
    renderWithProviders(<Compliance />, { identity: BUYER_NAMED_COMPLIANCE });
    const p = await panel();
    fireEvent.click(await p.findByText('Ruled by Compliance (1)'));
    // The filter holds what Compliance ruled and nothing else: one row.
    expect(await p.findByTestId('applicability-bpom-RM-COCO-8200')).toHaveTextContent('Does not apply');
    expect(p.queryByTestId('applicability-bpom-RM-STEAR-7300')).not.toBeInTheDocument();
    expect(p.queryByTestId('applicability-halal-PK-PETB-8801')).not.toBeInTheDocument();
    fireEvent.click(await p.findByTestId('applicability-rule-bpom-RM-COCO-8200'));
    fireEvent.click(p.getByTestId('applicability-choice-no'));
    fireEvent.change(p.getByTestId('applicability-reason'), { target: { value: 'Again.' } });
    fireEvent.click(p.getByTestId('applicability-commit'));
    await waitFor(() => expect(toasts()).toMatch(/already ruled that way\. A ruling records a change\./));
    expect(materialRulingStore.all()).toHaveLength(1);
  }, 15000);

  it('the section is translated — Indonesian reads the pending state and the owner', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<Compliance />, { identity: BUYER_NAMED_COMPLIANCE });
    const p = await panel();
    expect(p.getByText('Penerapan material — halal dan BPOM')).toBeInTheDocument();
    expect(await p.findByTestId('applicability-bpom-RM-COCO-8200')).toHaveTextContent(
      'Menunggu — Kepatuhan yang memutuskan',
    );
    expect(p.queryByText(/Compliance to rule/)).not.toBeInTheDocument();
  });
});

describe('OPS-2 · the supplier dock tab reads the supplier’s own shipments', () => {
  const openDock = async () => {
    fireEvent.click(await screen.findByText(/^Dock Appointments/));
    return within(await screen.findByTestId('dock-appointments'));
  };

  it('the derivation keeps a shipment with a dock slot that has not been delivered, and nothing else', () => {
    const own = mockShipments.filter((s) => s.supplierId === 'sup-007');
    const appts = dockAppointmentsOf(own);
    expect(appts.map((s) => s.asnNumber).sort()).toEqual(['ASN-2026-012', 'ASN-2026-013']);
    // KNOWN-BAD — a delivered shipment and one with no slot are both left out.
    expect(dockAppointmentsOf([{ ...own[0], status: 'Delivered' }])).toEqual([]);
    expect(dockAppointmentsOf([{ ...own[0], dockAssignment: undefined }])).toEqual([]);
  });

  it('PT Sample Packaging sees its two recorded slots — and not the card that used to be hardcoded', async () => {
    renderWithProviders(<SupplierShipments />, { identity: SUPPLIER });
    // The tab counts what it holds — it read a hardcoded 1 for every supplier.
    expect((await screen.findByText(/^Dock Appointments/)).closest('button')).toHaveTextContent('2');
    const dock = await openDock();
    const a = await dock.findByTestId('dock-appointment-ASN-2026-012');
    expect(a).toHaveTextContent('Dock B-3');
    expect(a).toHaveTextContent('14:00');
    expect(a).toHaveTextContent('PO-2025-00107');
    expect(dock.getByTestId('dock-appointment-ASN-2026-013')).toHaveTextContent('Dock A-2');
    expect(dock.queryByTestId('dock-empty')).not.toBeInTheDocument();
    // The fabricated appointment: ASN-2026-001, Dock 3, Monday 7 April 2026.
    expect(dock.queryByText('ASN-2026-001')).not.toBeInTheDocument();
    expect(dock.queryByText('Dock 3')).not.toBeInTheDocument();
    expect(dock.queryByText(/7 April 2026/)).not.toBeInTheDocument();
    // And the promise nothing kept — a WhatsApp confirmation within two hours.
    expect(dock.queryByText(/within 2 hours/)).not.toBeInTheDocument();
  });

  it('a supplier with no recorded slot reads an honest empty state, not somebody else’s appointment', async () => {
    const SUP_002: CurrentIdentity = { ...SUPPLIER, supplierId: 'sup-002', supplierName: 'PT Sample Oleochemicals' };
    expect(dockAppointmentsOf(mockShipments.filter((s) => s.supplierId === 'sup-002'))).toEqual([]);
    renderWithProviders(<SupplierShipments />, { identity: SUP_002 });
    expect((await screen.findByText(/^Dock Appointments/)).closest('button')).toHaveTextContent('0');
    const dock = await openDock();
    expect(await dock.findByTestId('dock-empty')).toHaveTextContent(
      'No dock appointment is recorded on any of your shipments that are still on the way.',
    );
    expect(dock.queryByTestId('dock-appointment-ASN-2026-012')).not.toBeInTheDocument();
    expect(dock.getByText(/Requesting or changing a slot from this page is not available\./)).toBeInTheDocument();
  });
});
