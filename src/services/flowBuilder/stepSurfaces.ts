// FB-1 · THE PROCESSES WITH A SURFACE THAT CAN SHOW A STEP (rule R05).
//
// A step that is due is announced on the line that says who acts next
// (`NextActLine`), so a process can be given a step only if one of its surfaces
// asks that line about it. A step nobody can open would stop the process for
// good.
//
// ⚠️ AUTHORED, AND HELD EQUAL TO THE SOURCE. A running page cannot read which
// files call `useNextAct`, so the list is written here and
// `stepSurfaces.test.ts` derives the same set from the surface files every run:
// a surface that starts or stops asking reddens it, in either direction.
export const STEP_SURFACES: readonly string[] = Object.freeze([
  'contract',
  'goodsReceipt',
  'invoice',
  'materialRequest',
  'purchaseOrder',
  'purchaseRequisition',
  'rfq',
  'shipment',
  'supplierApplication',
]);
