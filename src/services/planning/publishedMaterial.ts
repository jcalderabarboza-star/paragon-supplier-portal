// ────────────────────────────────────────────────────────────────────────────
// SDC-5 · THE MASTER A PUBLISHED LINE IS ANSWERED IN.
//
// A forecast publication is split in the PLANNING master — the real entries ∪
// the generated sample ones (`somoFixture.planningMaster`), which is what
// `PUB_MATERIAL_KNOWN` asks. The supplier's answer was checked against the real
// entries alone, so a line published on a generated code reached the supplier
// and could not be answered: `t_requirementresponse_submit` refused
// `UNKNOWN_MATERIAL` on a material Paragon had just asked about. Two masters,
// one on each side of the same line.
//
// So the collaboration lane — the answer, the stock declaration, the shipment
// leg, and every surface that names their material — resolves a code HERE, in
// the master the line was published from. `MATERIAL_MASTER` itself is untouched:
// the receipt gate, the halal registry and the document lane still see only the
// entries somebody authored.
//
// ⚠️ A GENERATED MATERIAL IS MARKED SAMPLE BY MEMBERSHIP, NEVER BY ITS `SIM-`
// PREFIX. The prefix is a namespace (`somoFixture`); a prefix test says yes to a
// code a caller invented. `isSampleMaterial` asks the generator's own set.
// ────────────────────────────────────────────────────────────────────────────

import { labelOf, uomOf, type MaterialMaster, type UomOutcome } from '../sdc';
import { isGeneratedMaterial, planningMaster } from './somoFixture';

/** The master a published line's material resolves in. */
export const publishedMaterialMaster = (): MaterialMaster => planningMaster();

/** Is this a generated sample material — one no S/4 master names? */
export const isSampleMaterial = (materialCode: string): boolean => isGeneratedMaterial(materialCode);

/** A published material's label, or the code echoed back (`labelOf`'s rule). */
export const publishedLabelOf = (materialCode: string): string => labelOf(materialCode, planningMaster());

/** A published material's canonical unit, or the refusal naming the code. */
export const publishedUomOf = (materialCode: string): UomOutcome => uomOf(materialCode, planningMaster());
