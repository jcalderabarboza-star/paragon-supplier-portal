// ── OPS-2b — the acceptance gate (GR_RECEIPT_COMPLIANT) ──────────────────────
//
// Operator ruling: the halal-certificate, BPOM, seal and lot blocks are enforced
// in the dispatcher, and the receiving form previews the same predicate. So
// this hook states no clause of its own — it calls `receiptComplianceBlocks`,
// the function the form's quality step calls, over the receipt's OWN stored
// lines, and refuses on the first stop it returns.
//
// WHICH VERBS, AND WHY THESE TWO. `t_gr_approve` and `t_gr_partial_approve` are
// the only verbs that accept goods, and `t_gr_post` fires only from the states
// they produce — so every receipt that reaches SAP has passed here. It is NOT on
// `t_gr_create`: a receipt created uninspected is an honest record that goods
// arrived, and its lines are judged when somebody decides on them. It is NOT on
// `t_gr_post`: the seeded Approved receipts carry no recorded seal or lot
// answer, and refusing their post would strand them in a state with no other
// exit. It is NOT on `t_gr_reject`: refusing goods needs no certificate.
//
// ONE CLOCK: validity is judged at the declared present, the instant the form
// and the Compliance page read at. Nothing here reads the wall clock.
import { bindPolicyHook, POLICY_HOOKS } from '../../transitions';
import { blocks, effectiveEnforcement } from '../../../lib/enforcement';
import type { GoodsReceipt } from '../types';
import { DECLARED_PRESENT_INSTANT } from '../fixturePresent';
import { receiptComplianceBlocks, type ReceiptBlock } from '../receiptCompliance';
import { COMPLIANCE_REGISTRY } from './fixtures/complianceRegistry';
import { enforcementSettingStore } from './stores/enforcementSettingStore';
import { materialRulingStore } from './stores/materialRulingStore';

const RECEIPT_REFUSAL: Readonly<Record<ReceiptBlock['kind'], (b: ReceiptBlock) => string>> = {
  HALAL_UNRULED: (b) =>
    `RECEIPT_HALAL_UNRULED: ${b.materialCode} — nobody has ruled whether halal applies to this material; Compliance rules it before the goods are accepted`,
  HALAL_SEAL_UNANSWERED: (b) =>
    `RECEIPT_HALAL_SEAL_UNANSWERED: ${b.materialCode} — halal applies to this material and its seal check is not recorded as Pass or Fail`,
  HALAL_CERTIFICATE_NOT_VALID: (b) =>
    `RECEIPT_HALAL_CERTIFICATE_NOT_VALID: ${b.materialCode} — halal applies to this material and its supplier holds no valid halal certificate for it on file (${
      'detail' in b ? b.detail : ''
    })`,
  BPOM_UNRULED: (b) =>
    `RECEIPT_BPOM_UNRULED: ${b.materialCode} — nobody has ruled whether BPOM applies to this material; Compliance rules it before the goods are accepted`,
  BPOM_LOT_UNANSWERED: (b) =>
    `RECEIPT_BPOM_LOT_UNANSWERED: ${b.materialCode} — BPOM applies to this material and its lot check is not recorded as Pass or Fail`,
};

bindPolicyHook(POLICY_HOOKS.GR_RECEIPT_COMPLIANT, ({ entityId, target }) => {
  const gr = target.readEntity(entityId) as GoodsReceipt | null;
  if (!gr) return { ok: true }; // NOT_FOUND is the dispatcher's, raised before any hook
  const ledger = enforcementSettingStore.all();
  const stops = (check: 'halal.seal' | 'bpom.lot' | 'halal.certificate'): boolean =>
    blocks(effectiveEnforcement(ledger, check, DECLARED_PRESENT_INSTANT).mode);
  const [first] = receiptComplianceBlocks({
    supplierId: gr.supplierId,
    lines: gr.inspectionResults,
    rulings: materialRulingStore.all(),
    registry: COMPLIANCE_REGISTRY,
    at: DECLARED_PRESENT_INSTANT,
    stops: { seal: stops('halal.seal'), lot: stops('bpom.lot'), certificate: stops('halal.certificate') },
  });
  return first ? { ok: false, reason: RECEIPT_REFUSAL[first.kind](first) } : { ok: true };
});
