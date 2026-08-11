// ─────────────────────────────────────────────────────────────────────────────
// CP-2 · 2B-5b-ii — AUTHORING THE SEVEN, AND WHAT EACH ROW ACTUALLY RESTS ON.
//
// 2B-5b was dispatched to RETIRE seven `MAT-*` ASN codes onto existing master
// rows. 5b-i found that ZERO could be: five had no candidate at all, and the two
// that looked retirable were ruled NOT retirable (R-2 `MAT-77014`, R-3
// `MAT-88201`). So all seven are ordinary members of an AUTHORING set — this is
// 2B-3's act, on a different lane.
//
// ── THE EVIDENCE STANDARD, WHICH IS THE WHOLE BATCH ─────────────────────────
//   5b-i repaired the TENANT axis of `ASN.poReference`. **THAT TELLS YOU WHO AND
//   WHEN. IT DOES NOT TELL YOU WHAT.** The material axis is open at 7 of 7 — for
//   three of these rows the repaired parent PO orders something else entirely.
//   NO LABEL BELOW IS TAKEN FROM A PO LINE, and this file asserts that rather
//   than promising it.
//
// ── TIERS ARE COMPUTED, NOT STAMPED (2B-3's rule, unchanged) ────────────────
//   No `evidenceTier` field exists and none is added — a stamp drifts from the
//   thing it describes (`MG-UNREAD-BY-ANYTHING-01`). Per row this file counts:
//     · CODE-BOUND MEANINGS  — records carrying the code AND a description;
//     · UNIT STATEMENTS      — records stating a unit for it;
//     · DOCUMENTS            — supplier documents reaching it;
//     · CONTRADICTIONS       — sources pointing somewhere else.
//   A row that gains evidence reads better automatically; a row that loses it
//   goes red. **THE COUNTS ARE ASSERTED AS AN EXACT TABLE**, so "this row rests
//   on its own description and nothing else" is a checked fact and not a
//   sentence in a header.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { MATERIAL_MASTER } from '../fixtures';
import { MATERIAL_GROUPS } from '../materialGroups';
import { MOCK_ASNS } from '../../data/mock/fixtures/supplierShipments';
import { INITIAL_CATALOG } from '../../data/mock/fixtures/supplierStorefront';
import { DOCUMENTS as SUPPLIER_DOCUMENTS } from '../../data/mock/fixtures/supplierDocuments';
import { mockPurchaseOrders } from '../../../data/mockPurchaseOrders';

/** The seven, with what they were before the retirement. Written out because
 *  the pre-retirement strings are otherwise only in git history, and half the
 *  claims in this file are about what the ASN line USED to say. */
const AUTHORED = [
  { was: 'MAT-88201', code: 'FR-ROUD-4470', wasMeaning: 'Fragrance concentrate – Rose Oud' },
  { was: 'MAT-88207', code: 'PK-PETB-8804', wasMeaning: 'PET bottle 50ml – clear' },
  { was: 'MAT-77014', code: 'PK-ALCP-2450', wasMeaning: 'Aluminium closure 24/410' },
  { was: 'MAT-55022', code: 'AI-NIAC-6612', wasMeaning: 'Active emulsion – Niacinamide 5%' },
  { was: 'MAT-55031', code: 'AI-HYALU-6615', wasMeaning: 'Active emulsion – Hyaluronic 2%' },
  { was: 'MAT-30110', code: 'RM-PSTN-7150', wasMeaning: 'Specialty fat blend — RBD stearin' },
  { was: 'MAT-40220', code: 'RM-EMUL-9440', wasMeaning: 'Sample Blend PF-20 emulsifier' },
] as const;

const CODES = AUTHORED.map((a) => a.code);
const asnLines = MOCK_ASNS.flatMap((asn) => asn.lineItems.map((line) => ({ asn, line })));

describe('2B-5b-ii — the seven are authored, and the space is empty', () => {
  it('the population is real (guards a vacuous pass)', () => {
    expect(AUTHORED).toHaveLength(7);
    expect(asnLines).toHaveLength(7);
    expect(Object.keys(MATERIAL_MASTER)).toHaveLength(42);
    expect(SUPPLIER_DOCUMENTS.length).toBeGreaterThan(5);
    expect(INITIAL_CATALOG).toHaveLength(5);
  });

  it('every authored code resolves, and every retired code names NOTHING', () => {
    for (const { was, code } of AUTHORED) {
      expect(code in MATERIAL_MASTER, `${code} authored`).toBe(true);
      expect(was in MATERIAL_MASTER, `${was} must not be authored under its old code`).toBe(false);
    }
    // Derived rather than listed: no `MAT-*` survives anywhere the ASN lane or
    // the master can reach. A prefix surviving somewhere is a different claim
    // from the space surviving, so the storefront's two unbacked pointers are
    // deliberately NOT swept up here — they are checked in `storefrontPointer`.
    expect(asnLines.filter(({ line }) => line.materialCode.startsWith('MAT-'))).toEqual([]);
    expect(Object.keys(MATERIAL_MASTER).filter((c) => c.startsWith('MAT-'))).toEqual([]);
  });

  it('the LANE took the master meaning — which is what dissolved violations B and C', () => {
    // R-1: DECLARED OWNERSHIP DECIDES. Retiring the code without retiring the
    // MEANING would have left every one of these seven stating a description
    // that disagrees with its own master row — seven brand-new
    // one-code-two-meanings violations, manufactured by the fix.
    for (const { code } of AUTHORED) {
      const lines = asnLines.filter((l) => l.line.materialCode === code);
      expect(lines, `${code} appears on an ASN`).toHaveLength(1);
      expect(lines[0].line.description, `${code} lane meaning`).toBe(
        MATERIAL_MASTER[code].label,
      );
    }
    // And the two storefront pointers agree too — they were the OTHER half of
    // violations B and C, and the label was taken FROM them, so this is the
    // check that the taking was faithful.
    for (const id of ['c101', 'c201']) {
      const row = INITIAL_CATALOG.find((c) => c.id === id)!;
      expect(row.sapCode in MATERIAL_MASTER, `${id} resolves`).toBe(true);
      expect(MATERIAL_MASTER[row.sapCode].label, `${id} meaning`).toBe(row.material);
    }
  });
});

describe('2B-5b-ii — what each row RESTS ON, counted rather than claimed', () => {
  /** Records carrying this code AND a description. */
  const codeBoundMeanings = (code: string) =>
    asnLines.filter((l) => l.line.materialCode === code && l.line.description).length;

  /** Records stating a unit for this code. `AsnLineItem` HAS NO `uom` FIELD, so
   *  the only unit statements available anywhere are storefront rows — and those
   *  bind by `sapCode`, which R-D ruled a POINTER. Corroboration, not identity. */
  const unitStatements = (code: string) =>
    INITIAL_CATALOG.filter((c) => c.sapCode === code && c.uom).length;

  /** Supplier documents reaching this code through its ASN's parent PO. */
  const documents = (code: string) => {
    const pos = new Set(
      asnLines.filter((l) => l.line.materialCode === code).map((l) => l.asn.poReference),
    );
    return SUPPLIER_DOCUMENTS.filter((d) => d.linkedTo && pos.has(d.linkedTo)).length;
  };

  it('⚠️ NO ASN LINE STATES A UNIT — the structural reason five rows are weaker', () => {
    // Asserted structurally, not by inspection: the field does not exist on the
    // type, so no amount of fixture data could supply one. Five of the seven
    // therefore take `canonicalUom` from their GROUP's convention, and the two
    // that do better do so through a POINTER.
    for (const { line } of asnLines) {
      expect('uom' in (line as Record<string, unknown>), 'AsnLineItem has no uom').toBe(false);
    }
  });

  it('THE TABLE — meanings / units / documents, per row, exact', () => {
    const table = CODES.map((code) => ({
      code,
      meanings: codeBoundMeanings(code),
      units: unitStatements(code),
      docs: documents(code),
    }));
    expect(table).toEqual([
      // ── ONE code-bound meaning, NO unit, NO document. Their own ASN
      //    description and nothing else. A LEGITIMATE TIER, RECORDED AS ITSELF.
      { code: 'FR-ROUD-4470', meanings: 1, units: 0, docs: 0 },
      { code: 'PK-PETB-8804', meanings: 1, units: 0, docs: 0 },
      { code: 'PK-ALCP-2450', meanings: 1, units: 0, docs: 0 },
      { code: 'AI-NIAC-6612', meanings: 1, units: 0, docs: 0 },
      { code: 'AI-HYALU-6615', meanings: 1, units: 0, docs: 0 },
      // ── PLUS a storefront row that states a unit.
      { code: 'RM-PSTN-7150', meanings: 1, units: 1, docs: 0 },
      // ── PLUS a unit AND a REFERENCE-BOUND DOCUMENT. The best-evidenced row.
      //    ⚠️ ONE, NOT TWO, AND THE COUNT WAS CORRECTED RATHER THAN THE
      //    PREDICATE. `doc-202` (*REACH SDS — Sample Blend PF-20*) was claimed as a second
      //    document; its `linkedTo` is the PROSE STRING 'All emulsifier grades',
      //    not a document reference, so nothing RESOLVES it to this supply.
      //    It corroborates BY NAME and is counted separately below.
      { code: 'RM-EMUL-9440', meanings: 1, units: 1, docs: 1 },
    ]);
  });

  it('the two rows with a stated unit take it from the storefront, not the group', () => {
    // The distinction the table encodes, made explicit: `KG` is right for both,
    // but for one reason on five rows and a different reason on two.
    for (const code of ['RM-PSTN-7150', 'RM-EMUL-9440']) {
      const row = INITIAL_CATALOG.find((c) => c.sapCode === code)!;
      expect(MATERIAL_MASTER[code].canonicalUom, code).toBe(row.uom);
    }
    // …and the other five agree with their group's convention, which is the
    // WEAKER basis and is asserted as such rather than left implicit.
    const conventionOf = (group: string) => {
      const siblings = Object.values(MATERIAL_MASTER).filter(
        (m) => m.materialGroup === group && !CODES.includes(m.materialCode),
      );
      const units = [...new Set(siblings.map((m) => m.canonicalUom))];
      return units.length === 1 ? units[0] : null;
    };
    for (const code of ['FR-ROUD-4470', 'PK-PETB-8804', 'PK-ALCP-2450', 'AI-NIAC-6612', 'AI-HYALU-6615']) {
      const entry = MATERIAL_MASTER[code];
      expect(conventionOf(entry.materialGroup), `${code} group convention`).toBe(
        entry.canonicalUom,
      );
    }
  });

  it('⚠️ RM-EMUL-9440 — the two documents, named, and what they separate it from', () => {
    const docs = SUPPLIER_DOCUMENTS.filter((d) => ['doc-201', 'doc-202'].includes(d.id));
    expect(docs).toHaveLength(2);
    const bpom = docs.find((d) => d.id === 'doc-201')!;
    expect(bpom.category).toBe('BPOM Regulatory');
    expect(bpom.issuedBy).toContain('BPOM');
    expect(bpom.linkedTo).toBe('PO-2025-00131');
    // That PO is this code's own ASN's parent — the link that makes the document
    // evidence about THIS supply rather than about the supplier generally.
    const asn = MOCK_ASNS.find((a) => a.lineItems.some((l) => l.materialCode === 'RM-EMUL-9440'))!;
    expect(asn.poReference).toBe('PO-2025-00131');
    expect(mockPurchaseOrders.some((p) => p.poNumber === 'PO-2025-00131')).toBe(true);

    // ⚠️ AND `doc-202` IS A DIFFERENT KIND OF EVIDENCE, counted separately
    // because conflating the two would overstate this row. Its `linkedTo` is
    // **PROSE** — 'All emulsifier grades' — not a document reference, so no
    // mechanism resolves it to this supply the way `doc-201` resolves through
    // `PO-2025-00131`. It corroborates BY NAME (the product name and the issuer
    // both match) and by nothing structural. **A DOCUMENT THAT NAMES A CATEGORY
    // IS NOT A DOCUMENT THAT NAMES A THING**, and the tier table counts only
    // the ones a machine can follow.
    const reach = docs.find((d) => d.id === 'doc-202')!;
    expect(reach.issuedBy).toContain('Sample Personal Care');
    expect(reach.name).toContain('Sample Blend PF-20');
    expect(reach.linkedTo).toBe('All emulsifier grades');
    expect(mockPurchaseOrders.some((p) => p.poNumber === reach.linkedTo)).toBe(false);

    // ⚠️ AND THE SAME EVIDENCE SEPARATES IT FROM `RM-EMUL-9410`. A Sample Personal Care/REACH
    // frame with NO halal certification is not the Indonesian halal-certified
    // emulsifier lane. Shared substrings — "SE", "emulsifier", the `RM-EMUL`
    // mnemonic — are not shared identity.
    expect(MATERIAL_MASTER['RM-EMUL-9410'].label).toContain('Halal');
    expect(MATERIAL_MASTER['RM-EMUL-9440'].label).not.toContain('Halal');
    const c201 = INITIAL_CATALOG.find((c) => c.id === 'c201')!;
    expect(c201.certs).toEqual(['REACH', 'ISO 9001']);
    expect(c201.certs.some((x) => /halal/i.test(x))).toBe(false);
  });
});

describe('2B-5b-ii — the rulings, asserted so they cannot be tidied away', () => {
  it('⚠️ R-2 — PK-ALCP-2450 is NOT PK-ALCP-2441, and the reasons are in the data', () => {
    // The two labels are near-identical and the merge will be re-proposed. The
    // ruling rests on two facts neither label shows.
    expect(MATERIAL_MASTER['PK-ALCP-2441'].label).toBe('Aluminium Cap 24/410');
    expect(MATERIAL_MASTER['PK-ALCP-2450'].label).toBe('Aluminium Closure 24/410');
    // 1. AN OPEN 2026 RFQ IS NOT EVIDENCE ABOUT A 2025 DELIVERY. `PK-ALCP-2441`
    //    rests on `RFQ-2026-011`, created 2026-04-22 and still Open;
    //    `PK-ALCP-2450`'s source ASN was Delivered with an eta of 2025-03-22.
    const source = MOCK_ASNS.find((a) =>
      a.lineItems.some((l) => l.materialCode === 'PK-ALCP-2450'),
    )!;
    expect(source.status).toBe('Delivered');
    expect(source.eta < '2026-04-22', 'the delivery precedes the RFQ').toBe(true);
    // 2. Both are MG-21 by R-1's FUNCTIONAL axis — so "same group" is not an
    //    argument for sameness, and MG-22 stays member-less with TWO aluminium
    //    closures in the tree.
    expect(MATERIAL_MASTER['PK-ALCP-2450'].materialGroup).toBe('MG-21');
    expect(
      Object.values(MATERIAL_MASTER).filter((m) => m.materialGroup === 'MG-22'),
    ).toEqual([]);
    // 3. Same neck finish, and that is ALL 24/410 fixes. The standing precedent
    //    for treating a format difference as a distinct item is asserted here so
    //    the analogy is executable rather than remembered.
    expect(MATERIAL_MASTER['PK-PETB-8810'].label).toBe('PET Bottle 250ml');
    expect(MATERIAL_MASTER['PK-PETB-8825'].label).toBe('PET Bottle 250ml Flip-Top');
  });

  it('⚠️ R-3 — FR-ROUD-4470 rests on its description ALONE, and two sources contradict it', () => {
    // **THE CONTRADICTION IS PART OF THIS ROW'S PROVENANCE AND AUTHORING DOES
    // NOT ERASE IT.** Asserted, not narrated.
    const asn = MOCK_ASNS.find((a) =>
      a.lineItems.some((l) => l.materialCode === 'FR-ROUD-4470'),
    )!;
    // (a) Its supplier is a PACKAGING converter whose declared master
    //     relationships are packaging, not fragrance.
    expect(asn.supplierId).toBe('sup-007');
    // (b) Its parent PO — repaired by 5b-i, and repaired to a PET-bottle order.
    //     A repaired reference tells you WHO and WHEN, not WHAT.
    const parent = mockPurchaseOrders.find((p) => p.poNumber === asn.poReference)!;
    expect(parent.supplierId).toBe('sup-007');
    expect(parent.lineItems.map((l) => l.materialCode)).toEqual(['PK-PETB-8801']);
    expect(parent.lineItems.map((l) => l.materialCode)).not.toContain('FR-ROUD-4470');
    // (c) And the row R-3 refused to retire onto belongs to a DIFFERENT supplier
    //     — a fragrance house. Retiring would have asserted that a packaging
    //     converter shipped Sample Aromatics's concentrate.
    const sampleAromatics = mockPurchaseOrders.find((p) =>
      p.lineItems.some((l) => l.materialCode === 'FR-WARD-4440'),
    )!;
    expect(sampleAromatics.supplierId).toBe('sup-004');
    expect(sampleAromatics.supplierId).not.toBe(asn.supplierId);
  });

  it('⚠️ RM-PSTN-7150 — stearin is NOT stearic acid, and RBD is not the feedstock', () => {
    // The near-miss that would have been wrong BY NAME, pinned so it is not
    // re-proposed. Four shared letters, two classes of substance.
    expect(MATERIAL_MASTER['RM-STEAR-7300'].label).toBe('Stearic Acid — Double Pressed (Halal)');
    expect(MATERIAL_MASTER['RM-PALM-7100'].label).toBe(
      'Palm Kernel Oil — Refined, Bleached, Deodorized',
    );
    expect(MATERIAL_MASTER['RM-PSTN-7150'].label).toBe('RBD Palm Stearin — Specialty Fat');
    // All three are MG-10 — so, exactly as with the two aluminium closures,
    // SHARING A GROUP IS NOT AN ARGUMENT FOR SHARING AN IDENTITY.
    for (const c of ['RM-STEAR-7300', 'RM-PALM-7100', 'RM-PSTN-7150']) {
      expect(MATERIAL_MASTER[c].materialGroup, c).toBe('MG-10');
    }
    // And the mnemonic `STEAR` was deliberately not reused.
    expect('RM-STEAR-7150' in MATERIAL_MASTER).toBe(false);
  });
});

describe('2B-5b-ii — groups DERIVE from the 2B-1 registry, and no group was invented', () => {
  it('every authored row sits in a DECLARED group', () => {
    const declared = new Set(MATERIAL_GROUPS.map((g) => g.group));
    for (const code of CODES) {
      expect(declared.has(MATERIAL_MASTER[code].materialGroup), code).toBe(true);
    }
  });

  it('⚠️ the two EMULSIONS are MG-04 by R-2s OWN CRITERION, not by resemblance', () => {
    // The group question the dispatch asked. MG-10 exists because 2B-1 REFUSED
    // to force oleochemical feedstocks into a formulation group, and its test is
    // written down in the registry: members are *"INPUTS TO the materials in
    // MG-01..06, not members of them"*. A dosed active emulsion ENTERS the
    // formulation grain, so it is not upstream of it.
    const mg10 = MATERIAL_GROUPS.find((g) => g.group === 'MG-10')!;
    expect(mg10.axis).toBe('upstream-input');
    expect(mg10.note).toContain('INPUTS TO the materials in MG-01..06');
    for (const code of ['AI-NIAC-6612', 'AI-HYALU-6615']) {
      expect(MATERIAL_MASTER[code].materialGroup, code).toBe('MG-04');
    }
    // ⚠️ AND THE REFUSAL TO DECLARE A NEW GROUP IS THE ASSERTION, because MG-10
    // proves this registry DOES grow when a set needs it to. The MG-01..06 axes
    // are FUNCTIONAL — they separate surfactant from emollient from active, and
    // never powder from emulsion. **THERE IS NO PHYSICAL-FORM AXIS, AND THIS SET
    // SUPPLIES NO REASON TO ADD ONE**: these two differ from `AI-NIAC-6605` in
    // concentration and form, which is ITEM grain under D-IDENTITY-GRAIN, not
    // group grain.
    const formulation = MATERIAL_GROUPS.filter((g) => g.axis === 'formulation-ingredient');
    expect(formulation.map((g) => g.group)).toEqual([
      'MG-01',
      'MG-02',
      'MG-03',
      'MG-04',
      'MG-05',
      'MG-06',
    ]);
    // No group was added by this batch — the registry is the 2B-1 registry.
    expect(MATERIAL_GROUPS).toHaveLength(13);
  });

  it('⚠️ MG-NO-EMULSIFIER-GROUP-01 is now THREE rows deep — reported, not fixed', () => {
    // `RM-EMUL-9440` goes to MG-02 *(Emollients / oils / esters)* because that
    // is where the tree's other two emulsifiers already sit. **IT IS WRONG FOR
    // ALL THREE.** An emulsifier is not an emollient, an oil or an ester.
    //
    // Placed with its siblings rather than somewhere better because moving them
    // is a REGISTRY ruling (the MG-10 shape: declare the group, then populate
    // it), and inventing MG-07 inside an authoring diff is the decision-smuggling
    // 2B-1 named. The finding grows by one and is escalated; the diff does not
    // quietly resolve it.
    const mg02 = Object.values(MATERIAL_MASTER)
      .filter((m) => m.materialGroup === 'MG-02')
      .map((m) => m.materialCode)
      .sort();
    expect(mg02).toEqual(['RM-EMUL-3320', 'RM-EMUL-9410', 'RM-EMUL-9430', 'RM-EMUL-9440']);
    expect(MATERIAL_GROUPS.find((g) => g.group === 'MG-02')!.label).toBe(
      'Emollients / oils / esters',
    );
    // Three of those four are emulsifiers by their own labels; one (Cetearyl
    // Alcohol) genuinely belongs. The count is what the finding is about.
    expect(mg02.filter((c) => /emulsifier|polysorbate|stearate/i.test(
      MATERIAL_MASTER[c].label + c,
    ))).toHaveLength(3);
  });
});

describe('2B-5b-ii — the batch changed no BEHAVIOUR, and the firing set moved anyway', () => {
  it('⚠️ THE MOVEMENT, ROW BY ROW, and it is caused by MNEMONICS', () => {
    // The dispatch required this reported line by line and a STOP if it moved in
    // a direction that could not be explained. It can be: three of the seven
    // took `AI-`/`FR-` codes and `inferBpom` parses the first three characters.
    // **NO COMPLIANCE RULE WAS CONSULTED. A NAMING CONVENTION MOVED THREE LOTS'
    // REGULATORY TREATMENT**, which is the sharpest available statement of what
    // is wrong with a prefix rule on a regulatory surface.
    const fires = (c: string) => c.startsWith('AI-') || c.startsWith('FR-');
    const moved = AUTHORED.filter(({ was, code }) => fires(code) !== fires(was));
    expect(moved.map((m) => `${m.was} → ${m.code}`)).toEqual([
      'MAT-88201 → FR-ROUD-4470',
      'MAT-55022 → AI-NIAC-6612',
      'MAT-55031 → AI-HYALU-6615',
    ]);
    // …and in the direction of MORE checking, never less. A batch that turned a
    // BPOM check OFF would be a regulatory regression regardless of its reasons.
    expect(moved.every(({ code }) => fires(code))).toBe(true);
    expect(AUTHORED.filter(({ was, code }) => fires(was) && !fires(code))).toEqual([]);
  });

  it('the master and the wizard now DISAGREE IN WRITING on exactly one row', () => {
    const fires = (c: string) => c.startsWith('AI-') || c.startsWith('FR-');
    const disagreeing = CODES.filter(
      (c) => (MATERIAL_MASTER[c].bpomApplicable === 'APPLICABLE') !== fires(c),
    );
    expect(disagreeing).toEqual(['RM-EMUL-9440']);
    // The one row whose `bpomApplicable` rests on a DOCUMENT rather than a class
    // default — so the disagreement is between evidence and a string prefix,
    // which is exactly the comparison 2B-4b has to settle.
    expect(MATERIAL_MASTER['RM-EMUL-9440'].bpomApplicable).toBe('APPLICABLE');
    expect(fires('RM-EMUL-9440')).toBe(false);
    // And one row where the master records an explicit ABSENCE of determination
    // while the prefix rule asserts a confident negative.
    expect(MATERIAL_MASTER['RM-PSTN-7150'].bpomApplicable).toBe('UNDETERMINED');
    expect(fires('RM-PSTN-7150')).toBe(false);
  });

  it('⚠️ INVERTED AT 2B-4b — the wizard runs the MASTER, and these seven rows are why', () => {
    // WAS: "nothing was wired — the wizard still runs the PREFIX rule", the
    // 2B-5b-ii constraint, checked rather than promised in the batch with the
    // most reason to break it. 2B-4b is the batch that was allowed to break it,
    // and the seven rows this file authors are the precondition that let it:
    // until they existed, a fail-closed gate would have refused live receipts
    // for a vocabulary problem rather than a compliance one.
    //
    // ⚠️ AND THE NEGATIVE HALF IS DELIBERATELY **NOT** RE-ASSERTED HERE. The
    // canonical "no consumer" pin lives in `bpomApplicability.test.ts` and works
    // by scanning the tree for the mechanism's name — so a second file naming it
    // in a string literal ADDS A SITE TO THE THING BEING COUNTED and turns that
    // pin red. `PROSE-COUNTS-AS-A-SITE-01`, THIRD APPEARANCE, met while writing
    // the file that authors seven rows the mechanism will one day read.
    // Duplicating the assertion would also have been
    // `EVIDENCE-REPLICATION-NOT-CORROBORATION-01`: a second copy of one check is
    // one check, and this one would have cost the original its accuracy.
    const wizard = import.meta.glob('/src/components/v2-features/GRInspectionWizard.tsx', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const src = Object.values(wizard)[0];
    expect(src).toBeTruthy();
    expect(src).not.toContain("materialCode.startsWith('AI-')");
    // ⚠️ `inferBpom` SURVIVES IN THIS FILE ONLY AS PROSE, and that is checked
    // rather than assumed: the wizard names it in a comment recording what was
    // retired, so the naive "the name is gone" assertion would be wrong for the
    // wrong reason. What must be gone is the PARSE, above.
    expect(src).toContain('bpomOf(');
  });
});
