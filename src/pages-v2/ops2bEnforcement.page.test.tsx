// ─────────────────────────────────────────────────────────────────────────────
// OPS-2b — the operator's rulings on OPS-2, at the receiving page.
//
// The dispatcher's refusals are asserted in `ops2bEnforcement.test.ts`. This
// file holds the other half of ruling 5 — *"the form previews the same
// predicate"* — and what a person sees for rulings 1 and 3:
//
//   · PO-2025-00105 is received end to end through the form, on SAMPLE data;
//   · the one uncertified pair is stopped at the quality step with its reason,
//     and the dispatcher refuses the same receipt for the same cause;
//   · the SAMPLE BPOM ruling is shown on the line as a ruling, marked SAMPLE.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../test/test-utils';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import { goodsReceiptStore } from '../services/data/mock/stores/goodsReceiptStore';
import { asnStore } from '../services/data/mock/stores/asnStore';
import { materialRulingStore } from '../services/data/mock/stores/materialRulingStore';
import { enforcementSettingStore } from '../services/data/mock/stores/enforcementSettingStore';
import { SAMPLE_BPOM_RULED } from '../services/data/mock/materialRulingSeed';
import { COMPLIANCE_REGISTRY } from '../services/data/mock/fixtures/complianceRegistry';
import type { ASN, QueryScope } from '../services/data/types';
import { DECLARED_PRESENT, DECLARED_PRESENT_INSTANT } from '../services/data/fixturePresent';
import { receiptComplianceBlocks } from '../services/data/receiptCompliance';
import { PERSONA_SYSTEM_ROLES } from '../services/transitions/businessRoles';
import { POLICY_HOOKS } from '../services/transitions/policyHooks';
import { refusedByPolicy } from '../services/transitions/refusalMessage';
import { NO_PERSON } from '../context/noPerson';
import i18n from '../lib/i18n';
import BuyerGoodsReceipt from './BuyerGoodsReceipt';
import { useToast } from '../hooks/useToast';

const svc = new MockCommandService();
const buyerScope: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON,
};

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

/** `originCity` carries the supplier's name — the supplier's own ASN create stamps it there. */
const asnOf = (
  asnNumber: string,
  supplierId: string,
  supplierName: string,
  poReference: string,
  codes: string[],
): ASN => ({
  asnNumber,
  supplierId,
  poReference,
  status: 'Submitted',
  carrier: 'Sample Courier',
  trackingNumber: 'TRK-OPS2B',
  eta: DECLARED_PRESENT,
  details: {
    originCity: supplierName,
    destinationWarehouse: 'NDC J6, Jakarta',
    totalCartons: 5,
    grossWeightKg: 50,
    temperatureRequirement: 'Ambient',
  },
  lineItems: codes.map((materialCode) => ({
    materialCode,
    description: materialCode,
    orderedQty: 100,
    shippedQty: 100,
    lotNumber: 'LOT-OPS2B',
  })),
});

const next = () => screen.getByRole('button', { name: 'Next' });
const radios = (name: RegExp) => screen.getAllByRole('radio', { name });

/** New GR → pick the ASN → details → quality. */
const openQualityOn = async (asnNumber: string) => {
  renderWithProviders(<Receiving />, { identity: BUYER });
  await screen.findByText('Rejection Rate (30d)');
  fireEvent.click(screen.getByRole('button', { name: /New GR/i }));
  fireEvent.click(await screen.findByText(asnNumber));
  fireEvent.click(next()); // → details
  fireEvent.click(next()); // → quality
};

beforeEach(() => {
  goodsReceiptStore.reset();
  asnStore.reset();
  materialRulingStore.reset();
  enforcementSettingStore.reset();
});
afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('OPS-2b · PO-2025-00105 is received end to end through the form', () => {
  it('both lines pass on SAMPLE data once the two checks are answered, and the receipt posts', async () => {
    asnStore.add(asnOf('ASN-OPS2B-105', 'sup-005', 'Sample Personal Care Emulsifiers GmbH', 'PO-2025-00105', ['AI-NIAC-6601', 'AI-HYALU-6610']));
    const before = goodsReceiptStore.all().length;
    await openQualityOn('ASN-OPS2B-105');

    // Each line names the certificate it rests on; the hyaluronate's is the
    // SAMPLE certificate this batch added, and it says so in its number.
    expect(screen.getByTestId('gr-cert-valid-0')).toHaveTextContent('SAMPLE-HALAL-0005B');
    expect(screen.getByTestId('gr-cert-valid-1')).toHaveTextContent('SAMPLE-HALAL-0005D');
    expect(screen.queryByTestId('gr-cert-notice-0')).not.toBeInTheDocument();
    expect(screen.queryByTestId('gr-cert-notice-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('gr-bpom-refusal-0')).not.toBeInTheDocument();

    // The step waits for the four answers — no fewer.
    expect(next()).toBeDisabled();
    for (const r of radios(/Halal Seal Check.*Pass/)) fireEvent.click(r);
    expect(next()).toBeDisabled();
    const lots = radios(/BPOM Lot Tracking.*Pass/);
    fireEvent.click(lots[0]);
    expect(next()).toBeDisabled();
    fireEvent.click(lots[1]);
    expect(next()).toBeEnabled();

    fireEvent.click(next()); // → disposition
    fireEvent.click(screen.getByRole('button', { name: 'Create GR' }));
    await waitFor(
      () => {
        const made = goodsReceiptStore.all().find((g) => g.asnNumber === 'ASN-OPS2B-105');
        expect(made?.status).toBe('Posted to SAP');
      },
      { timeout: 6000 },
    );
    const made = goodsReceiptStore.all().find((g) => g.asnNumber === 'ASN-OPS2B-105')!;
    expect(goodsReceiptStore.all()).toHaveLength(before + 1);
    expect(made.poNumber).toBe('PO-2025-00105');
    expect(made.sapMaterialDoc).toBeTruthy();
    expect(made.inspectionResults.map((l) => [l.materialCode, l.halalSealCheck, l.bpomLotCheck])).toEqual([
      ['AI-NIAC-6601', 'Pass', 'Pass'],
      ['AI-HYALU-6610', 'Pass', 'Pass'],
    ]);
  }, 30000);
});

describe('OPS-2b · the one uncertified pair is stopped, with its reason — in the form and in the dispatcher', () => {
  // sup-005 × RM-EMUL-9440 on ASN-2025-00302 — a receivable ASN in the seed, so
  // this is the walk a person can take: New GR → that ASN → the quality step.
  const CODE = 'RM-EMUL-9440';
  const ASN_NO = 'ASN-2025-00302';

  it('the quality step names the expired certificate and does not pass, whatever is answered', async () => {
    await openQualityOn(ASN_NO);

    const notice = screen.getByTestId('gr-cert-notice-0');
    expect(notice).toHaveAttribute('role', 'alert');
    expect(notice).toHaveTextContent(`The halal certificate for ${CODE} expired on`);
    // The document is named, so somebody can chase its renewal.
    expect(notice).toHaveTextContent('SAMPLE-HALAL-FRGN-0005C');
    expect(notice).toHaveTextContent('Sample Personal Care Emulsifiers GmbH');
    expect(screen.getByTestId('gr-cert-consequence-0')).toHaveTextContent(
      'This line cannot pass the quality step. A valid halal certificate from this supplier for this material must be on file — or Compliance rules that halal does not apply to this material.',
    );
    expect(screen.queryByTestId('gr-cert-valid-0')).not.toBeInTheDocument();
    // BPOM is not what stops it.
    expect(screen.queryByTestId('gr-bpom-refusal-0')).not.toBeInTheDocument();

    for (const r of radios(/Halal Seal Check.*Pass/)) fireEvent.click(r);
    for (const r of radios(/BPOM Lot Tracking.*Pass/)) fireEvent.click(r);
    expect(next()).toBeDisabled();
  }, 20000);

  it('⚠️ THE FORM IS A PREVIEW OF THE REFUSAL — the same receipt, dispatched by hand, is refused for the same cause', async () => {
    const answered = {
      materialCode: CODE,
      description: CODE,
      qtyExpected: 100,
      qtyReceived: 100,
      qtyAccepted: 100,
      qtyRejected: 0,
      visualCheck: 'Pass',
      packagingCheck: 'Pass',
      halalSealCheck: 'Pass',
      bpomLotCheck: 'Pass',
    };
    // What the form reads…
    const previewed = receiptComplianceBlocks({
      supplierId: 'sup-005',
      lines: [answered],
      rulings: materialRulingStore.all(),
      registry: COMPLIANCE_REGISTRY,
      at: DECLARED_PRESENT_INSTANT,
      stops: { seal: true, lot: true, certificate: true },
    });
    expect(previewed).toEqual([{ materialCode: CODE, kind: 'HALAL_CERTIFICATE_NOT_VALID', detail: 'EXPIRED' }]);

    // …is what the dispatcher refuses, with no form anywhere near it.
    const fire = (transitionId: string, entityId?: string, payload?: Record<string, unknown>) =>
      svc.dispatch(buyerScope, { transitionId, entity: 'goodsReceipt', entityId, payload });
    const made = await fire('t_gr_create', undefined, {
      asnReference: ASN_NO,
      receivedDate: DECLARED_PRESENT,
      receivedBy: 'QC Inspector',
      inspectionResults: [answered],
    });
    expect(made.status, made.reason).toBe('done');
    expect((await fire('t_gr_start_inspection', made.entityId!)).status).toBe('done');
    const approved = await fire('t_gr_approve', made.entityId!);
    expect(approved.status).toBe('failed');
    expect(refusedByPolicy(approved.reason, POLICY_HOOKS.GR_RECEIPT_COMPLIANT)).toBe(true);
    expect(approved.reason).toContain('RECEIPT_HALAL_CERTIFICATE_NOT_VALID:');
    expect(approved.reason).toContain(previewed[0].materialCode);
    expect(approved.reason).toContain('EXPIRED');
    expect(goodsReceiptStore.get(made.entityId!)!.status).toBe('Under Inspection');
  });

  it('the reason reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<Receiving />, { identity: BUYER });
    fireEvent.click(await screen.findByRole('button', { name: /GR Baru|Buat GR|New GR/i }));
    fireEvent.click(await screen.findByText(ASN_NO));
    const nextId = () => screen.getByRole('button', { name: /^(Berikutnya|Lanjut|Selanjutnya)$/ });
    fireEvent.click(nextId());
    fireEvent.click(nextId());
    const notice = screen.getByTestId('gr-cert-notice-0');
    expect(notice).toHaveTextContent(`Sertifikat halal untuk ${CODE} kedaluwarsa pada`);
    expect(notice).not.toHaveTextContent('expired on');
  }, 20000);
});

describe('OPS-2b · a SAMPLE BPOM ruling is shown on the line as a ruling, and says it is SAMPLE', () => {
  it('RM-STEAR-7300: BPOM applies by ruling, the person carries the SAMPLE marker, and the certificate on file is the SAMPLE one', async () => {
    expect(SAMPLE_BPOM_RULED).toContain('RM-STEAR-7300');
    asnStore.add(asnOf('ASN-OPS2B-116', 'sup-002', 'PT Sample Specialty Fats', 'PO-2025-00116', ['RM-STEAR-7300']));
    await openQualityOn('ASN-OPS2B-116');
    expect(screen.queryByTestId('gr-bpom-refusal-0')).not.toBeInTheDocument();
    const ruling = screen.getByTestId('gr-bpom-ruling-0');
    expect(ruling).toHaveTextContent('BPOM applies — ruled by Compliance.');
    expect(ruling).toHaveTextContent('(SAMPLE)');
    expect(ruling).toHaveTextContent('Reason: SAMPLE ruling — illustrative.');
    expect(screen.getByTestId('gr-cert-valid-0')).toHaveTextContent('SAMPLE-HALAL-0002F');
    for (const r of radios(/Halal Seal Check.*Pass/)) fireEvent.click(r);
    expect(next()).toBeDisabled(); // the lot check the ruling asks for is still owed
    for (const r of radios(/BPOM Lot Tracking.*Pass/)) fireEvent.click(r);
    expect(next()).toBeEnabled();
  }, 20000);

  it('the marker reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    asnStore.add(asnOf('ASN-OPS2B-116', 'sup-002', 'PT Sample Specialty Fats', 'PO-2025-00116', ['RM-STEAR-7300']));
    renderWithProviders(<Receiving />, { identity: BUYER });
    fireEvent.click(await screen.findByRole('button', { name: /GR Baru|Buat GR|New GR/i }));
    fireEvent.click(await screen.findByText('ASN-OPS2B-116'));
    const nextId = () => screen.getByRole('button', { name: /^(Berikutnya|Lanjut|Selanjutnya)$/ });
    fireEvent.click(nextId());
    fireEvent.click(nextId());
    expect(screen.getByTestId('gr-bpom-ruling-0')).toHaveTextContent('(CONTOH)');
  }, 20000);
});
