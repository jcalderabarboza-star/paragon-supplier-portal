// ─────────────────────────────────────────────────────────────────────────────
// MD-2 · THE PICKERS THAT READ THE REFERENCE TABLES.
//
// Until MD-2 the sourcing wizard and the contract form each carried their own
// incoterm and payment-term lists, the receiving wizard had three warehouse
// names typed into it, and the requisition form listed five cost centres with
// their names glued to the code. Each is now a read of one reference table, so
// two forms cannot offer different lists and a value SAP adds appears in both.
//
// What each picker STORES is stated here, because it is not the same for all:
//   · incoterm, cost centre, unit — the key
//   · payment term, receiving location — the TEXT. The documents these forms
//     write carry that text today (`Net 30`, `RM Warehouse`); storing the key
//     instead is a change to those documents and is not made in this batch.
// ─────────────────────────────────────────────────────────────────────────────

import { referenceOptions, type ReferenceOption } from '../../services/masterData/lookup';

export const incotermOptions = (): readonly ReferenceOption[] => referenceOptions('incoterm');
export const paymentTermOptions = (): readonly ReferenceOption[] => referenceOptions('paymentTerm');
export const costCentreOptions = (): readonly ReferenceOption[] => referenceOptions('costCentre');

/**
 * The units a form offers. A form whose document accepts only some units (a
 * sourcing event's unit is a closed union) passes them as `accepted`: the
 * options are still read from the table, and a unit the table does not hold is
 * never offered.
 */
export const unitOptions = (accepted?: readonly string[]): readonly ReferenceOption[] =>
  referenceOptions('unit').filter((o) => !accepted || accepted.includes(o.key));

/** Where goods are received: the plant, then its storage locations. */
export const receivingLocationOptions = (): readonly ReferenceOption[] => [
  ...referenceOptions('plant'),
  ...referenceOptions('storageLocation'),
];
