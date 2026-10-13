// ────────────────────────────────────────────────────────────────────────────
// THE DOCUMENTS EACH WIRED FLOW HOLDS — one enumerator per process.
//
// Moved here from `guides.test.ts` at FB-1, unchanged, because a second reader
// arrived: the Flow Builder states how many documents a change will meet, and a
// count needs the same population the guides' test data is held to. One table,
// two readers; a second copy would be the half that drifts.
//
// A flow's STATE is never read here — ask its command target (`readState`).
// ────────────────────────────────────────────────────────────────────────────

import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { asnStore } from './stores/asnStore';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { invoiceStore } from './stores/invoiceStore';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import { stageResponseStore } from './stores/stageResponseStore';
import { purchaseRequisitionStore } from './stores/purchaseRequisitionStore';
import { requirementResponseStore } from './stores/requirementResponseStore';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import { incomingShipmentStore } from './stores/incomingShipmentStore';
import { supplierDocumentStore } from './stores/supplierDocumentStore';
import { supplierApplicationStore } from './stores/supplierApplicationStore';
import { materialRequestStore } from './stores/materialRequestStore';
import { pslStore } from './stores/pslStore';
import { enforcementSettingStore } from './stores/enforcementSettingStore';
import { PSL_SETTING_IDS } from './stores/pslCapSettingStore';
import { forecastPublicationStore } from './stores/forecastPublicationStore';
import { schedulingAgreementStore } from '../../delivery/stores/schedulingAgreementStore';
import { PR_INTAKE_LINES } from './fixtures/prIntake';
import { itemKey } from '../../delivery/addressing';
import { MODULE_CODES } from '../../modules/registry';
import { materialMasterView } from '../../masterData/materialMasterView';
import { SYSTEM_ROLES } from '../../transitions/businessRoles';
import { flowVersionStore } from '../../flowBuilder/flowVersionStore';
import { masterDataRequestStore } from './stores/masterDataRequestStore';
import { stepLedger } from '../../flowBuilder/stepLedger';
import { stepKey } from '../../flowBuilder/stepsDue';

/**
 * The ids each wired guide's test data may name — the population a store (or,
 * for a ledger whose entities are vocabulary, the vocabulary) holds at seed.
 * A landed WIRED guide with no entry here is red, so no guide lands with test
 * data nothing checks.
 */
const ids = (rows: readonly { id: string }[]) => rows.map((r) => r.id);
export const DOCUMENT_IDS: Readonly<Record<string, () => readonly string[]>> = {
  purchaseOrder: () => ids(purchaseOrderStore.all()),
  // An ASN has no separate id: it is keyed by its number (`asnStore`).
  advanceShipNotice: () => asnStore.all().map((a) => a.asnNumber),
  goodsReceipt: () => ids(goodsReceiptStore.all()),
  invoice: () => ids(invoiceStore.all()),
  rfq: () => ids(rfqStore.all()),
  quotation: () => ids(quotationStore.all()),
  stageResponse: () => ids(stageResponseStore.all()),
  purchaseRequisition: () => ids(purchaseRequisitionStore.all()),
  requirementResponse: () => ids(requirementResponseStore.all()),
  inventoryDeclaration: () => ids(inventoryDeclarationStore.all()),
  incomingShipment: () => ids(incomingShipmentStore.all()),
  supplierDocument: () => ids(supplierDocumentStore.all()),
  supplierApplication: () => ids(supplierApplicationStore.all()),
  materialRequest: () => ids(materialRequestStore.all()),
  psl: () => ids(pslStore.all()),
  forecastPublication: () => forecastPublicationStore.all().map((p) => p.publicationId),
  intakeLine: () => ids(PR_INTAKE_LINES),
  deliveryRelease: () =>
    schedulingAgreementStore
      .all()
      .flatMap((a) => a.items.flatMap((it) => (it.scheduleLines ?? []).map((l) => l.releaseRef))),
  deliveryPolicy: () => schedulingAgreementStore.all().flatMap((a) => a.items.map((it) => itemKey(a.id, it.lineSeq))),
  enforcement: () => enforcementSettingStore.all().map((e) => e.checkId),
  // ⚠️ THE THREE LEDGERS BELOW OPEN EMPTY, AND THEIR ENTITIES ARE VOCABULARY —
  // a setting key, a system role, a module code. Each is addressable, and its
  // target's `readState` answers the machine's one state for it, which is what
  // a tester acts on, so it is what the test data may name.
  pslCapSetting: () => [...PSL_SETTING_IDS],
  role: () => Object.keys(SYSTEM_ROLES),
  moduleActivation: () => [...MODULE_CODES],
  // OPS-2 — the material ruling ledger: its entity IS a material-master code.
  materialRuling: () => Object.keys(materialMasterView()),
  // FB-1 — a change to a process. The store opens empty: nothing is seeded.
  flowVersion: () => ids(flowVersionStore.all()),
  // MD-4 — a master-data change request. The store opens empty: nothing is seeded.
  masterDataRequest: () => ids(masterDataRequestStore.all()),
  // FB-4 — the steps an active version added: one key per step taken on a
  // document. The ledger opens empty, because no version is in force at seed.
  processStep: () => [...new Set(stepLedger.all().map((r) => stepKey(r.entity, r.docId, r.stepId)))],
};
