// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// C11 V15 — the portal never mints a document identity. The enforcer C11 cites.
//
// Population controls first (a walker that found nothing would pass every
// assertion below), then the bilateral list, then the walker fired at the real
// defect it exists for — the `CTR-${yr}-${n}` mint retired at `f5338c2`, read
// out of git rather than re-typed, so the probe was aimed by the tree and not by
// the seat that wrote the matcher.
// ─────────────────────────────────────────────────────────────────────────────
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

import { REPO_ROOT } from '../treeMutationGate/derive';
import { NOT_A_PORTAL_MINT, documentNumberConstructions, shippedConstructions } from './derive';

const SITES = shippedConstructions();

describe('the population is derived, and it is not empty', () => {
  it('CONTROL: the walker sees a known construction in the mock backend', () => {
    expect(SITES).toContain('src/services/data/mock/stores/goodsReceiptStore.ts::`GR-2026-${900 + seq}`');
  });

  it('CONTROL: the retired contract mint is GONE from shipped source', () => {
    expect(SITES.filter((s) => s.startsWith('src/pages-v2/BuyerContracts.tsx::'))).toEqual([]);
  });
});

describe('C11 V15 — no governed document number is constructed in shipped source', () => {
  it('no shipped source constructs a governed document number outside the mock backend', () => {
    expect(SITES.filter((s) => !(s in NOT_A_PORTAL_MINT))).toEqual([]);
  });

  it('no entry outlives its construction (the list only shrinks truthfully)', () => {
    expect(Object.keys(NOT_A_PORTAL_MINT).filter((k) => !SITES.includes(k))).toEqual([]);
  });

  it('every entry states its reason', () => {
    expect(Object.entries(NOT_A_PORTAL_MINT).filter(([, why]) => why.trim().length < 20).map(([k]) => k)).toEqual([]);
  });
});

describe('the walker, fired both ways', () => {
  it('KNOWN-BAD (the real defect): the retired CTR-${year}-${n} mint at f5338c2^ is FOUND, by name', () => {
    const retired = execFileSync('git', ['show', 'f5338c2^:src/pages-v2/BuyerContracts.tsx'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
    expect(documentNumberConstructions('BuyerContracts.tsx', retired)).toEqual([
      "`CTR-${yr}-${String(nextNum).padStart(3, '0')}`",
    ]);
  });

  it('KNOWN-BAD: every governed prefix, in both construction shapes, is FOUND', () => {
    const bad = [
      'const a = `PO-${n}`;',
      'const b = `GR-2026-${n}`;',
      "const c = 'INV-' + n;",
      'const d = `CTR-${year}-${seq}`;',
      'const e = `SA-${n}`;',
    ].join('\n');
    expect(documentNumberConstructions('bad.ts', bad)).toEqual([
      '`PO-${n}`',
      '`GR-2026-${n}`',
      "'INV-' + n",
      '`CTR-${year}-${seq}`',
      '`SA-${n}`',
    ]);
  });

  it('KNOWN-GOOD: a carried number, a lowercase id, a prefix in a comment, and a non-governed prefix are NOT sites', () => {
    const good = [
      "// `CTR-${year}-${n}` was retired",
      "const carried = 'PO-2026-00421';",
      'const id = `ctr-new-${Date.now()}`;',
      'const ref = `MAT-DOC-${n}`;',
      'const asn = `ASN-${n}`;',
      'const label = `${po.poNumber} · ${po.status}`;',
    ].join('\n');
    expect(documentNumberConstructions('good.ts', good)).toEqual([]);
  });
});
