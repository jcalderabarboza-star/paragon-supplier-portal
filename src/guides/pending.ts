// ────────────────────────────────────────────────────────────────────────────
// G1 · THE FLOWS WHOSE GUIDE HAS NOT LANDED YET — AND G2 DELETES THIS FILE.
//
// G1 lands ONE guide pair (purchaseOrder) as the proof of the structure; the
// other flows' guides are authored and land at G2. Until then the gate in
// `guides.test.ts` must accept "guide pending" — and it accepts it ONLY for a
// flow NAMED here. There is no wildcard, no "empty list means everything
// passes", and no "unknown flow is pending by default":
//
//   · a registered flow with no guide that is NOT named here is red;
//   · a name here that is not a registered flow is red;
//   · a name here whose guide HAS landed (either locale) is red — landing a
//     guide means taking its name off this list in the same change.
//
// ⚠️ **G2'S DONE-CONDITION IS THIS FILE'S DELETION**, not its emptying. An empty
// list would still be a door the next unguided flow could be added to quietly.
//
// ⚠️ **THREE NAMES BELOW HAVE NO AUTHORED GUIDE AT ALL** — `forecastPublication`,
// `intakeLine`, `moduleActivation`. Design 5 counted 25 flows; the registry
// this landed on holds 28, and the authored drafts cover the 25. Landing the
// drafts at G2 therefore cannot empty this list by itself: those three need
// guides written first. Measured at G1 from `getKnownFlows()`, not assumed.
// ────────────────────────────────────────────────────────────────────────────

export const GUIDES_PENDING_G2: readonly string[] = Object.freeze([
  'advanceShipNotice',
  'compliance',
  'contract',
  'deliveryPolicy',
  'deliveryRelease',
  'enforcement',
  'forecastPublication', // no authored guide
  'goodsReceipt',
  'goodsReceiptLine',
  'incomingShipment',
  'intakeLine', // no authored guide
  'inventoryDeclaration',
  'invoice',
  'invoiceMatch',
  'materialRequest',
  'moduleActivation', // no authored guide
  'obligation',
  'psl',
  'pslCapSetting',
  'purchaseRequisition',
  'quotation',
  'requirementResponse',
  'rfq',
  'role',
  'shipment',
  'supplierApplication',
  'supplierDocument',
]);
