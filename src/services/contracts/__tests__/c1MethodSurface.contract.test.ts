// ─────────────────────────────────────────────────────────────────────────────
// C1 — THE METHOD SURFACE AND THE TREE ARE PINNED TOGETHER.
//
// ── WHY THIS TEST EXISTS ────────────────────────────────────────────────────
//   `C1-methods.md` is the interface a Phase-F1 backend team implements. It was
//   harvested once, at I3.1, and never re-harvested — and NO BUILD STEP FAILS
//   WHEN A CONTRACT STATEMENT STOPS BEING TRUE. By the time this pin was built
//   the document was stale by half its shape: four sub-services missing, one
//   sub-service DESCRIBED THAT THE TREE HAS NEVER CONTAINED, and all three of
//   its headline axis figures wrong.
//
//   This is CP-2's pattern (`materialMasterRef.contract.test.ts`) pointed at
//   C1, and CP-3b's direction discipline (`ledgerTruth.test.ts`) carried with
//   it: **BOTH HALVES ARE LOAD-BEARING.** Delete a line from the document and
//   this fails; change the tree without correcting the document and this fails.
//   A pin that only catches one direction pins nothing — it certifies the
//   document against itself.
//
// ── WHAT WAS REUSED, AND WHAT HAD TO BE INVENTED ────────────────────────────
//   REUSED, verbatim in shape: C9's DOCUMENT-AS-AUTHORITY stance; its
//   read-the-markdown-as-text mechanism; its bilateral "every derived member
//   reaches the document AND every documented member exists" pairing (A-9); and
//   `ledgerTruth`'s habit of reading the CLAIM out of the document before
//   measuring the tree, so a failure message names which side moved.
//
//   INVENTED, because C9 had no need of it: C9's shape is flat data, so
//   `deriveC9FieldList.ts` reads it with a regex over the types source. C1's
//   subject is a COMPOSED interface — `IDataService` is ten property signatures
//   whose types are declared elsewhere in the module — and a regex cannot follow
//   a type reference. So the tree half is an AST/checker derivation
//   (`deriveC1Surface.ts`) rather than a text scan, computed through BOTH the
//   declared NODE and the CHECKER because §40e measured that each is blind to
//   something the other sees. Also invented: the second and third axes are not
//   AST at all — the transition catalog comes from `getKnownFlows()` and the
//   wired targets from `WIRED_COMMAND_TARGETS`, both RUNTIME reads, because a
//   grep over the flow files cannot see a transition id assembled at a call
//   site (§83).
//
// ── ⚠️ WHAT THIS PIN CANNOT SEE ─────────────────────────────────────────────
//   Stated here in the form 1c's header states its blindness, because a gate
//   whose limits are undeclared gets read as a guarantee. It compares NAMES,
//   COUNTS and MEMBERSHIP. It does NOT see:
//
//     · **A SIGNATURE THAT CHANGED SHAPE.** Parameters and return types are not
//       rendered in C1's tables, so there is nothing to compare against. A
//       method that keeps its name and changes its arguments is invisible here,
//       and that is the largest hole in this pin by far — it is precisely the
//       break a backend team would ship against and discover at integration.
//     · **A METHOD PRESENT IN BOTH AND WRONG IN BEHAVIOUR.** The pin reads
//       shape, never conduct. `getKpis` returning the wrong tenant's rows
//       passes every assertion in this file.
//     · **EVERY PROSE CLAIM IN THE DOCUMENT** — the return contract, the
//       scoping sentence, the pipeline narrative, the `Status` lines. C9 makes
//       the same admission and it is the honest one: prose is not mechanically
//       checkable and pretending otherwise would be its own dishonesty.
//     · **WHETHER THE COUNTERPARTY IMPLEMENTS ANY OF IT.** This is our shape,
//       not their conformance.
//
//   The document carries this same table under `What the pin cannot see`, so a
//   reader who never opens this file still meets the limits.
//
// ── ⚠️ THE DOCUMENT DELIBERATELY NAMES A TYPE THAT DOES NOT EXIST ───────────
//   C1's re-harvest note records that `IEngagementService` was removed from the
//   document because the tree has never had it. That name therefore appears in
//   C1 ON PURPOSE. Every check below is scoped to the SECTION whose claim it is
//   testing, never to the whole document — a whole-file matcher would accuse
//   the document of the exact defect it is recording as fixed, which is rule 2
//   (widening creates false accusations) firing on the correction itself. There
//   is a control for it: the re-harvest note must keep naming it.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildRepoProgram } from '../../../lib/storedFieldGate/derive';
import {
  NUMBER_WORDS,
  backticked,
  deriveInterfaceMembers,
  deriveServiceSurface,
  markedList,
  parseComposition,
  parseFlowTable,
  parseIfaceTable,
  parseTotal,
  section,
} from './deriveC1Surface';
import { COMMAND_REFUSALS } from '../../transitions/refusals';
import { getKnownFlows } from '../../transitions';
import { WIRED_COMMAND_TARGETS } from '../../data/mock/MockCommandService';

const ROOT = process.cwd();
const CONTRACT = readFileSync(join(ROOT, 'docs', 'contracts', 'C1-methods.md'), 'utf8');

const TYPES_PATH = join(ROOT, 'src', 'services', 'data', 'types.ts');
const DISPATCHER_PATH = join(ROOT, 'src', 'services', 'transitions', 'dispatcher.ts');

// One program for the file. `buildRepoProgram` is the helper the stored-field
// gate already ships; reusing it means both gates see the same tsconfig and a
// change to the compiler options cannot move one and not the other.
const program = buildRepoProgram(ROOT);
const surface = deriveServiceSurface(program, TYPES_PATH);

/**
 * Whitespace-collapsed view, for claims that span a line break.
 *
 * ⚠️ A prose assertion pinned to the AUTHOR'S LINE WRAPPING fails when someone
 * reflows a paragraph, which is a failure with no defect behind it. A gate that
 * cries wolf gets muted, and a muted gate is worse than none — `ledgerTruth`'s
 * own argument for refusing the naive §7 composition check. So sentence-level
 * claims are matched against this, never against the raw text.
 */
const flat = (s: string): string => s.replace(/\s+/g, ' ');

const AXIS1 = section(CONTRACT, 'Axis 1');
const AXIS2 = section(CONTRACT, 'Axis 2');
const AXIS3 = section(CONTRACT, 'Axis 3');

// ─────────────────────────────────────────────────────────────────────────────
// 0. THE POPULATION CONTROLS — first, and asserting MEMBERSHIP, never a count.
//
// `EMPTY-INPUT-REPORTS-CLEAN-01`: every comparison below is a set difference,
// and a set difference against an EMPTY derivation is empty, which reads as
// "nothing diverges". So the instrument proves it examined something before any
// conclusion is drawn from it — and proves it BOTH WAYS, a known-good found and
// a known-bad absent, on each of the three independent instruments.
// ─────────────────────────────────────────────────────────────────────────────

describe('C1 — the instruments examined something, both ways', () => {
  it('the AST derivation found the composed interface, not an empty one', () => {
    expect(surface.subServices.length).toBeGreaterThan(5);
    expect(surface.topLevelMethods).toContain('getCapabilities');

    const names = surface.subServices.map((s) => s.iface);
    expect(names, 'known-good: IProcurementService must be derived').toContain(
      'IProcurementService',
    );
    expect(names, 'known-bad: a type the tree does not declare must be absent').not.toContain(
      'IEngagementService',
    );

    const proc = surface.subServices.find((s) => s.iface === 'IProcurementService')!;
    expect(proc.methods, 'known-good method').toContain('getPurchaseOrders');
    expect(proc.methods, 'known-bad method').not.toContain('getNotAThing');
  });

  it('the flow registry is seeded, not empty', () => {
    const flows = getKnownFlows();
    expect(flows.length).toBeGreaterThan(5);
    const ids = flows.flatMap((f) => f.transitions.map((t) => t.id));
    expect(ids, 'known-good transition').toContain('t_gr_post');
    expect(ids, 'known-bad transition').not.toContain('t_gr_not_a_thing');
  });

  it('the document parsers returned rows, not silence', () => {
    expect(parseIfaceTable(AXIS1).length).toBeGreaterThan(5);
    expect(parseComposition(AXIS1).length).toBeGreaterThan(5);
    expect(parseFlowTable(AXIS2).length).toBeGreaterThan(5);
    expect(parseTotal(AXIS1)).toBeGreaterThan(0);
    expect(parseTotal(AXIS2)).toBeGreaterThan(0);

    // The section splitter must actually SPLIT — if it returned the whole file,
    // every "is it in this section" check below would pass vacuously.
    expect(AXIS1).not.toContain('## Axis 2');
    expect(AXIS2).not.toContain('## Axis 3');
    expect(AXIS1.length).toBeLessThan(CONTRACT.length);
  });

  it('the NODE and CHECKER halves of the type agree — §40e', () => {
    // They are computed independently and unioned only on disagreement. A
    // sub-service that grows an `extends` clause lands here by name rather than
    // silently under-reporting through whichever half is blind to it.
    const disagreeing = surface.subServices.filter((s) => !s.halvesAgree);
    expect(
      disagreeing.map((s) => s.iface),
      'the declared-node and checker readings of these interfaces differ — one of them is blind ' +
        'to something (inheritance, or an optional widening). Decide which, do not average them.',
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. AXIS 1 — THE SERVICE SURFACE, BOTH DIRECTIONS
// ─────────────────────────────────────────────────────────────────────────────

describe('C1 Axis 1 — the composition of IDataService', () => {
  it('every sub-service in the TREE is named in the document, and vice versa', () => {
    const tree = surface.subServices.map((s) => `${s.property}: ${s.iface}`).sort();
    const doc = parseComposition(AXIS1)
      .map((c) => `${c.property}: ${c.iface}`)
      .sort();

    // Both directions in one assertion so the failure message shows the delta
    // as SETS rather than as a count that has to be reconciled by hand.
    expect(
      doc,
      'the composition block in C1 Axis 1 does not match `IDataService`. Left = document, ' +
        'right = tree. A name only on the right is a sub-service the counterparty was never ' +
        'shown; a name only on the left is a shape they were shown and cannot implement.',
    ).toEqual(tree);
  });

  it('every sub-service has a table row, and the row count matches the composition', () => {
    const rows = parseIfaceTable(AXIS1);
    expect(rows.map((r) => r.iface).sort()).toEqual(surface.subServices.map((s) => s.iface).sort());
  });
});

describe('C1 Axis 1 — every method, per sub-service, both directions', () => {
  const rows = parseIfaceTable(AXIS1);

  for (const sub of surface.subServices) {
    it(`${sub.iface}: ${sub.methods.length} methods`, () => {
      const row = rows.find((r) => r.iface === sub.iface);
      expect(row, `C1 Axis 1 has no table row for \`${sub.iface}\``).toBeTruthy();

      // Sets, not counts — a count agreeing while the membership differs is the
      // failure mode a count-only check cannot see.
      expect(
        [...row!.methods].sort(),
        `the methods C1 lists for \`${sub.iface}\` are not the methods the tree declares`,
      ).toEqual([...sub.methods].sort());

      // The stated count must equal the membership it sits beside. This is the
      // FLOOR-IN-PROSE-01 guard for the document's own table.
      expect(row!.count, `C1's stated count for \`${sub.iface}\` disagrees with its own list`).toBe(
        sub.methods.length,
      );
    });
  }

  it('the TOTAL row equals the derived grand total, and the header repeats it', () => {
    expect(parseTotal(AXIS1)).toBe(surface.grandTotal);
    // The three headline figures at the top of the document are what a reader
    // meets first; a corrected table under a stale headline is the C9 README
    // defect (`SUMMARY-LOSS-IS-DIRECTIONAL-01`) reproduced one layer out.
    const headline = CONTRACT.split(/\r?\n/).slice(0, 6).join('\n');
    expect(headline).toContain(`**${surface.grandTotal}**`);
  });

  it('⚠️ every remaining figure in Axis 1 is derived too — headings and prose included', () => {
    // ⚠️ **THE DOCUMENT NOW CLAIMS EVERY NUMBER ON IT IS RE-DERIVED, SO EVERY
    // NUMBER ON IT HAS TO BE.** The first draft of the re-harvest left four
    // unpinned figures behind — two section headings, a spelled-out cardinal
    // and the wiring-census flow count — inside the very document whose header
    // forbids exactly that. `FLOOR-IN-PROSE-01` in the correction written to
    // cure it. They are pinned here rather than reworded, because a contract
    // reads better with the figures in it.
    expect(AXIS1.split('\n')[0]).toContain(`the ${surface.grandTotal}-method service surface`);

    const readSubs = surface.subServices.filter((s) => s.iface !== 'ICommandService');
    const m = AXIS1.match(/`IDataService` is (\w+) read sub-services/);
    expect(m, 'Axis 1 no longer states how many read sub-services there are').toBeTruthy();
    expect(
      NUMBER_WORDS[m![1]],
      `Axis 1 says "${m![1]}" read sub-services, which this pin cannot map to a number`,
    ).toBe(readSubs.length);
  });

  it('the read subtotal is the total minus the command seam and the top-level method', () => {
    const commands = surface.subServices.find((s) => s.iface === 'ICommandService');
    expect(commands, '`ICommandService` is no longer part of `IDataService`').toBeTruthy();
    const readSubtotal =
      surface.subMethodTotal - commands!.methods.length;
    const m = AXIS1.match(/^\|\s*\*\*read subtotal\*\*\s*\|\s*\*\*(\d+)\*\*/m);
    expect(m, 'C1 Axis 1 no longer carries a read-subtotal row').toBeTruthy();
    expect(Number(m![1])).toBe(readSubtotal);
  });
});

describe('C1 Axis 1 — the removals are recorded, not silently dropped', () => {
  // ⚠️ The one place the document is SUPPOSED to name a type the tree does not
  // have. Without this control, a future batch "tidying" the re-harvest note
  // would erase the record of what was corrected and nothing would notice.
  it('the re-harvest note still names what was removed and why', () => {
    expect(CONTRACT).toContain('IEngagementService');
    expect(CONTRACT).toContain('getGlobalSuppliers');
    expect(CONTRACT).toMatch(/RE-HARVEST/);
  });

  it('and those names are absent from the NORMATIVE tables — the record is not the shape', () => {
    // The distinction the whole scoping discipline exists for: recorded in the
    // note, absent from Axis 1. If either half moves, this is the failure.
    const rows = parseIfaceTable(AXIS1);
    expect(rows.map((r) => r.iface)).not.toContain('IEngagementService');
    expect(rows.flatMap((r) => r.methods)).not.toContain('getGlobalSuppliers');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. AXIS 2 — THE TRANSITION CATALOG, FROM THE REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

describe('C1 Axis 2 — the transition catalog', () => {
  const flows = getKnownFlows();
  const rows = parseFlowTable(AXIS2);

  it('every registered flow has a row, and every row is a registered flow', () => {
    expect(rows.map((r) => r.entity).sort()).toEqual(flows.map((f) => f.entity).sort());
  });

  it('every flow file named in the document exists on disk', () => {
    const onDisk = readdirSync(join(ROOT, 'src', 'services', 'transitions', 'flows'));
    for (const r of rows) {
      expect(onDisk, `C1 names \`${r.file}\`, which is not in the flows directory`).toContain(
        r.file,
      );
    }
    // And the other direction: a flow file that reaches the tree without
    // reaching the document.
    expect(onDisk.filter((f) => f.endsWith('.flow.ts')).sort()).toEqual(
      rows.map((r) => r.file).sort(),
    );
  });

  for (const flow of [...flows].sort((a, b) => a.entity.localeCompare(b.entity))) {
    it(`${flow.entity}: ${flow.transitions.length} transitions`, () => {
      const row = rows.find((r) => r.entity === flow.entity);
      expect(row, `C1 Axis 2 has no row for \`${flow.entity}\``).toBeTruthy();
      expect(
        [...row!.transitionIds].sort(),
        `the transition ids C1 lists for \`${flow.entity}\` are not the ids the registry holds`,
      ).toEqual(flow.transitions.map((t) => t.id).sort());
      expect(row!.count).toBe(flow.transitions.length);
    });
  }

  it('the TOTAL row equals the registry total, and the header repeats it', () => {
    const total = flows.reduce((n, f) => n + f.transitions.length, 0);
    expect(parseTotal(AXIS2)).toBe(total);
    expect(CONTRACT.split(/\r?\n/).slice(0, 6).join('\n')).toContain(`**${total}**`);
    // The Axis-2 heading and the wiring-census heading both restate the flow
    // count. Same rule as Axis 1: every figure in this document is derived, or
    // it is a figure this document's own header forbids.
    expect(AXIS2.split('\n')[0]).toContain(
      `the ${total}-transition catalog (${flows.length} flows)`,
    );
    expect(AXIS3).toContain(`Wiring census (${flows.length} flows`);
  });

  it('the SAP-boundary set is exactly what the flows declare', () => {
    const sap = flows
      .flatMap((f) => f.transitions)
      .filter((t) => t.sapBoundary)
      .map((t) => t.id)
      .sort();
    // ⚠️ The one C5 claim that turned out to be a C1 claim. The count is stated
    // in this document, not in C5-seams.md — see the batch report — so it is
    // pinned here, by MEMBERSHIP and then by the count beside it.
    const claim = AXIS2.slice(AXIS2.indexOf('SAP-boundary verbs'));
    for (const id of sap) {
      expect(claim, `C1 does not name SAP-boundary verb \`${id}\``).toContain(id);
    }
    const stated = claim.match(/exactly (\d+) today/);
    expect(stated, 'C1 no longer states how many SAP-boundary verbs there are').toBeTruthy();
    expect(Number(stated![1])).toBe(sap.length);
  });

  it('the trigger vocabulary the document declares is the one the flows use', () => {
    const used = new Set(flows.flatMap((f) => f.transitions).map((t) => t.trigger));
    for (const t of used) {
      expect(AXIS2, `C1 does not name the trigger \`${t}\``).toContain(t);
    }
    // `clock` is type-level impossible (law 0.5) and the document says so. If a
    // clock trigger ever reaches the registry, this is the contract-side alarm.
    expect(used.has('clock' as never)).toBe(false);
    expect(flat(AXIS2)).toContain('`clock` is type-level impossible');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. AXIS 3 — THE WIRED TARGETS AND THE CommandTarget SHAPE
// ─────────────────────────────────────────────────────────────────────────────

describe('C1 Axis 3 — the wired CommandTargets', () => {
  it('the documented wired set is exactly `WIRED_COMMAND_TARGETS`', () => {
    const documented = markedList(CONTRACT, '- **wired:**').sort();
    expect(documented).toEqual([...WIRED_COMMAND_TARGETS].sort());
  });

  it('the heading and census counts equal the derived ones', () => {
    expect(AXIS3).toContain(`the ${WIRED_COMMAND_TARGETS.length} wired CommandTargets`);
    expect(AXIS3).toContain(`**${WIRED_COMMAND_TARGETS.length} behavior-wired**`);
    expect(CONTRACT.split(/\r?\n/).slice(0, 6).join('\n')).toContain(
      `**${WIRED_COMMAND_TARGETS.length}**`,
    );
  });

  it('the Axis-2 wiring cell agrees with `WIRED_COMMAND_TARGETS`, row by row', () => {
    // The document classifies every flow in its own table. That classification
    // is checkable against the tree for the `**wired**` half — and it is the
    // half that matters, because a row wrongly marked wired tells a backend
    // team a verb is dispatchable when nothing will accept it.
    for (const row of parseFlowTable(AXIS2)) {
      expect(
        row.claimsWired,
        `C1 Axis 2 marks \`${row.entity}\` as "${row.wiring}", which disagrees with ` +
          '`WIRED_COMMAND_TARGETS`',
      ).toBe(WIRED_COMMAND_TARGETS.includes(row.entity));
    }
  });

  it('the target-less set is a SET DIFFERENCE and the census accounts for all of it', () => {
    const targetless = getKnownFlows()
      .map((f) => f.entity)
      .filter((e) => !WIRED_COMMAND_TARGETS.includes(e))
      .sort();
    // Every target-less flow must be accounted for somewhere in the census —
    // either as a rollup sub-flow or as inert. An unaccounted one is a machine
    // the contract silently implies is wired.
    const census = AXIS3.slice(AXIS3.indexOf('Wiring census'));
    for (const e of targetless) {
      expect(census, `\`${e}\` has no CommandTarget and the C1 wiring census does not mention it`)
        .toContain(e);
    }
    // And nothing WIRED is listed among the rollups or the inert rows.
    const rollupAndInert = census
      .split(/\r?\n/)
      .filter((l) => /rolled-up sub-flows|inert/.test(l))
      .join('\n');
    for (const wired of WIRED_COMMAND_TARGETS) {
      expect(
        backticked(rollupAndInert),
        `\`${wired}\` IS wired but the C1 census lists it as rollup or inert`,
      ).not.toContain(wired);
    }

    // ⚠️ **THE INERT COUNT IS DERIVED FROM THE TABLE'S OWN CLASSIFICATION, NOT
    // FROM A LIST OF ROLLUP NAMES WRITTEN HERE.** The first version of this
    // assertion hardcoded `['goodsReceiptLine', 'invoiceMatch']` to subtract the
    // rollups — an inherited list wearing a derivation's clothes, which would
    // have quietly mis-counted the day a third sub-flow was rolled up. The
    // rollup/inert split is the DOCUMENT's classification, so it is read out of
    // the document and only its ARITHMETIC is checked.
    const rows = parseFlowTable(AXIS2);
    const inert = rows.filter((r) => /inert/.test(r.wiring)).map((r) => r.entity);
    const rollup = rows.filter((r) => /rollup/.test(r.wiring)).map((r) => r.entity);
    expect(
      [...inert, ...rollup].sort(),
      'the table classifies a flow as neither wired, rollup nor inert — or classifies a wired one',
    ).toEqual(targetless);
    expect(AXIS3).toContain(`**${inert.length} inert**`);
    expect(AXIS3).toContain(`**${rollup.length} rolled-up sub-flows**`);
  });

  it('the documented `CommandTarget` shape is every member, methods AND properties', () => {
    const { methods, properties } = deriveInterfaceMembers(
      program,
      DISPATCHER_PATH,
      'CommandTarget',
    );
    const all = [...methods, ...properties];

    // ⚠️ `requireCreationOwner` is a boolean PROPERTY, and the document said
    // SIX members for exactly as long as the matcher that found them keyed on
    // call shape. Both lists are asserted so the split cannot silently collapse
    // back to one.
    expect(properties, 'the property member is gone from `CommandTarget`').toContain(
      'requireCreationOwner',
    );
    for (const m of all) {
      expect(AXIS3, `C1 Axis 3 does not document \`CommandTarget.${m}\``).toContain(m);
    }
    expect(AXIS3).toContain(`**${all.length} members**`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. THE COMMAND TYPES — the write seam's own shape
// ─────────────────────────────────────────────────────────────────────────────

describe('C1 — the command types are documented field for field', () => {
  const pipeline = section(CONTRACT, 'The dispatcher pipeline');

  for (const iface of ['CommandInput', 'CommandResult', 'CommandStatus'] as const) {
    it(`${iface}`, () => {
      const { methods, properties } = deriveInterfaceMembers(program, TYPES_PATH, iface);
      expect(methods, `\`${iface}\` has grown a method — C1 describes it as a payload`).toEqual([]);
      expect(properties.length).toBeGreaterThan(2);

      const claim = pipeline.slice(pipeline.indexOf(`\`${iface}\``));
      for (const f of properties) {
        expect(claim, `C1 does not document \`${iface}.${f}\``).toContain(f);
      }
    });
  }

  it('`expectedState` is documented as the STATE precondition, and its blindness is stated', () => {
    // The 1c contract, reaching the document a batch after it reached the code.
    // Without the second half a reader takes `expectedState` for a general
    // concurrency guarantee, which is the overstatement 1c's own header exists
    // to prevent.
    expect(pipeline).toContain('expectedState');
    expect(pipeline).toMatch(/STATE precondition, not a REVISION precondition/);
    expect(pipeline).toContain('statePreserving');
  });

  it('the pipeline’s step ORDER matches the refusal precedence the tree declares', () => {
    // ⚠️ **THIS SPEC PREVIOUSLY ASSERTED `steps === 7` UNDER THE NAME "as many
    // steps as the dispatcher constructs", AND IT NEVER READ THE DISPATCHER.**
    // A hardcoded 7 with a name claiming a derivation is a false mechanism in
    // the one place a reader will not check it — a test's own title. Replaced
    // with the claim that IS derivable: `COMMAND_REFUSALS` is order-pinned to
    // the dispatcher's construction sequence (1c, §87c), so the document's step
    // numbering has to agree with that array's ordering.
    const numbered = [...pipeline.matchAll(/^(\d+)\. \*\*(.+?)\*\*/gm)].map((m) => ({
      n: Number(m[1]),
      title: m[2],
    }));
    expect(numbered.length, 'the pipeline narrative is no longer a numbered list').toBeGreaterThan(4);
    // Contiguous from 1 — a gap is a step someone deleted from the narrative.
    expect(numbered.map((s) => s.n)).toEqual(numbered.map((_, i) => i + 1));

    const posIn = (kind: string) => COMMAND_REFUSALS.indexOf(kind as never);
    const step = (re: RegExp) => numbered.find((s) => re.test(s.title))?.n;

    const roleStep = step(/requiredRole/);
    const staleStep = step(/State precondition/);
    const legalityStep = step(/legality/i);
    expect([roleStep, staleStep, legalityStep].every(Boolean), 'a named pipeline step is missing')
      .toBe(true);

    // The document's ordering and the array's ordering must rank these three
    // identically. If 1c's precedence is ever changed in the tree, the contract
    // goes red rather than continuing to describe the old order.
    expect(roleStep! < staleStep! && staleStep! < legalityStep!).toBe(true);
    expect(
      posIn('ROLE_NOT_PERMITTED') < posIn('STALE_STATE') &&
        posIn('STALE_STATE') < posIn('ILLEGAL_TRANSITION'),
      'COMMAND_REFUSALS no longer orders role → stale → illegal, but C1 still describes that order',
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. THE RESERVED SEAM — an ABSENCE, measured as an absence
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 6. C5's SHARE OF C1's NUMBERS — pinned HERE, on purpose.
//
// ⚠️ **C5 RESTATES C1's FIGURES, AND THAT IS THE WHOLE REASON THESE LIVE IN THIS
// FILE RATHER THAN A C5 ONE.** `C5-seams.md` says the real adapter implements
// "`IDataService` (all N methods, C1)" and states the SAP-boundary count as
// "exactly two". Both are C1's numbers written down a second time, in a second
// document, with nothing holding them together — `COUNT-RESTATED-ACROSS-
// INSTRUMENTS-01`. It had already gone wrong: C5 still said 55 while C1's real
// surface was 63, and correcting C1 alone would have left the package
// self-contradicting.
//
// Pinning them against THE SAME derivation, in the same file, is the structural
// fix: there is now one instrument and two documents, instead of two documents
// and no instrument. This is deliberately NOT a general C5 pin — C5's remaining
// content is prose about seams, and the batch report says so.
// ─────────────────────────────────────────────────────────────────────────────

describe('C5 — the figures C5 borrows from C1 agree with C1’s derivation', () => {
  const C5 = readFileSync(join(ROOT, 'docs', 'contracts', 'C5-seams.md'), 'utf8');

  it('C5’s method-surface figure is the derived one', () => {
    const m = flat(C5).match(/`IDataService` \(all (\d+) methods, C1\)/);
    expect(m, 'C5 no longer restates C1’s method count — if it stopped, delete this pin').toBeTruthy();
    expect(Number(m![1])).toBe(surface.grandTotal);
  });

  it('C5’s SAP-boundary count and named verbs are the ones the flows declare', () => {
    const sap = getKnownFlows()
      .flatMap((f) => f.transitions)
      .filter((t) => t.sapBoundary)
      .map((t) => t.id)
      .sort();
    const stated = flat(C5).match(/Exactly \*\*(\w+)\*\* carry it today/);
    expect(stated, 'C5 no longer states the SAP-boundary count').toBeTruthy();
    // Written as a word, not a digit — so the pin maps rather than parses.
    expect(
      NUMBER_WORDS[stated![1]],
      `C5 states "${stated![1]}", which this pin cannot map to a number`,
    ).toBe(sap.length);
    for (const id of sap) {
      expect(C5, `C5 does not name SAP-boundary verb \`${id}\``).toContain(id);
    }
  });

  it('C5’s `httpDataService` claim is about a FILE, and the file is absent', () => {
    expect(flat(C5)).toContain('**No file exists** (glob-confirmed)');
    const files = readdirSync(join(ROOT, 'src', 'services', 'data'));
    expect(files.filter((f) => /^httpDataService\.tsx?$/.test(f))).toEqual([]);
  });
});

describe('C1 — `httpDataService` is RESERVED, and that is a claim about an IMPLEMENTATION', () => {
  it('no module in src/ implements it, and the document says so in those terms', () => {
    // ⚠️ §42: the scan matched a MENTION; the claim requires an IMPLEMENTATION.
    // Nine files under `src/` name `httpDataService` — every one as a reserved
    // future seam or a comment — so "grep returns nothing" is NOT the check,
    // and a batch that wrote it that way would have reported the contract
    // broken. The claim's site is a module that implements the interface.
    const files = readdirSync(join(ROOT, 'src', 'services', 'data'));
    expect(files.filter((f) => /^httpDataService\.tsx?$/.test(f))).toEqual([]);
    expect(flat(CONTRACT)).toContain('no module in `src/` implements `httpDataService`');
    expect(CONTRACT).toContain('ABSENCE OF AN IMPLEMENTATION');
  });
});
