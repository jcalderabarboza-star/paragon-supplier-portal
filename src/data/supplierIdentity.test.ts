// ─────────────────────────────────────────────────────────────────────────────
// DISCOVERY-REAL-SUBJECTS-01 · batch A — the supplier master names no real party.
//
// ── WHY THIS IS A DERIVATION AND NOT A LIST ──────────────────────────────────
//   PF-2a's endorsement guard is a denylist of fourteen names. A denylist can
//   only ever find what somebody already knew to write down, a miss is silent,
//   and it trains the next author to append. THE RULE THAT GENERALISES IS THE
//   DERIVATION ITSELF, and this is where it matters most.
//
//   The census rule, re-implemented here as a gate:
//     a CAPITALISED TOKEN in a fixture that NEVER APPEARS LOWERCASE,
//     minus EMAIL/URL masking, minus the KNOWN-FICTIONAL ROSTER.
//   It FAILS CLOSED on a name nobody has thought of yet. A list does not.
//
//   The email/URL masking is not incidental — it is census defeat #1 made into
//   code. A contact address at a supplier's own corporate domain supplied a
//   LOWERCASE spelling of that supplier's brand, which disqualified the brand
//   from the never-lowercase rule and hid it. (The address itself is not quoted
//   here: batch D removed the real domains, and re-listing one in a comment is
//   how a name comes back — PF-2a's header describes its deleted endorsers
//   rather than repeating them, for the same reason.) Mask the domains, or the
//   rule silently exonerates every brand that owns one.
//
// ── THE ROSTER IS A POSITIVE VOCABULARY, NOT A DENYLIST ──────────────────────
//   `ALLOWED` says what a supplier identity MAY be built from. A new REAL name
//   reddens this without anyone editing the test; adding a new FICTIONAL one is
//   a deliberate edit to a vocabulary, which is the direction that should cost
//   something. That asymmetry is the whole point.
//
// ── SCOPE, STATED ────────────────────────────────────────────────────────────
//   The supplier master and the buyer-dashboard health rows — A's population.
//   It does NOT sweep `buyerDiscovery.ts`, which has its own guard, nor the
//   material master. Both were cleaned by batches C and B respectively and are
//   asserted there. Real CERTIFIERS and REGULATORS (BPJPH/MUI/BPOM/TÜV/ECHA) and
//   real BANKS stay real BY RULING and are not in this population at all —
//   fictionalising them would destroy the domain, and once the SUBJECT is
//   fictional the sentence is unobjectionable.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { mockSuppliers } from './mockSuppliers';
import { SUPPLIER_HEALTH } from '../services/data/mock/fixtures/buyerDashboard';

/** Tokens a fictional supplier identity may be built from: the `Sample` marker,
 *  jurisdiction/legal forms, industry words, and geography. Anything else that
 *  looks like a proper noun is an unrecognised name and fails. */
const ALLOWED = new Set(
  [
    // the marker that makes it unmistakable at a glance
    'Sample',
    // legal / jurisdiction forms — these are NOT company names
    'PT', 'CV', 'GmbH', 'SE', 'AG', 'NV', 'BV', 'Ltd', 'Ltd.', 'Inc', 'Inc.', 'Co', 'Co.',
    'Sdn', 'Sdn.', 'Bhd', 'Bhd.', 'Pte', 'Pte.', 'LLC',
    // industry / descriptive vocabulary
    'Oleochemicals', 'Specialty', 'Fats', 'Fragrance', 'House', 'Aromatics', 'Aroma',
    'Personal', 'Care', 'Emulsifiers', 'Emulsifier', 'Chemicals', 'Packaging', 'Carton',
    'Kemas', 'Vitamins', 'Halal', 'Salicylics', 'Niacinamide', 'PET', 'Bottle',
    'Manufacturer', 'Bioscience', 'Consumer', 'Goods', 'Raw', 'Material', 'Active',
    'Ingredient', 'Natural', 'Botanical',
    // geography — real places are not company names and stay real
    'Indonesia', 'Malaysia', 'France', 'Germany', 'China', 'Singapore', 'Batam', 'Medan',
    'Jakarta', 'Tangerang', 'Surabaya', 'Bogor', 'Hangzhou', 'Hefei', 'Paris', 'Frankfurt',
    'Duesseldorf', 'Petaling', 'Jaya', 'Riau', 'Islands', 'Banten', 'Jawa', 'Barat',
    'Cikarang', 'APAC', 'SG', 'ID', 'MY', 'DE', 'FR', 'CN',
  ].map((s) => s.toLowerCase()),
);

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const URLISH = /https?:\/\/[^\s]+|\bwww\.[A-Za-z0-9.-]+/g;

/** Every proper-noun-shaped token, with emails and URLs masked first (census
 *  defeat #1). In PROSE, a sentence-initial capital is grammar, not a name — so
 *  prose drops the first token of each sentence before judging. Single letters
 *  ("Q" of "Q3") are never names. */
const properNouns = (value: string, prose = false): string[] => {
  const masked = value.replace(EMAIL, ' ').replace(URLISH, ' ');
  const parts = prose ? masked.split(/(?<=[.!?])\s+/) : [masked];
  return parts.flatMap((sentence) => {
    const toks = sentence.match(/[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’.\-]*/g) || [];
    return (prose ? toks.slice(1) : toks).filter((t) => /^[A-ZÀ-Þ]/.test(t) && t.length > 1);
  });
};

/** Identity NAME fields — judged against the closed vocabulary. Statutory
 *  identifiers and domains have their own dedicated assertions below, because a
 *  document number is not a name and a vocabulary is the wrong instrument for it. */
const nameStrings = (s: (typeof mockSuppliers)[number]): Array<[string, string]> =>
  ([['name', s.name], ['legalName', s.legalName]] as Array<[string, string | undefined]>).filter(
    (p): p is [string, string] => typeof p[1] === 'string' && p[1].length > 0,
  );

describe('DISCOVERY-REAL-SUBJECTS-01 · the supplier master names no real party', () => {
  it('is non-vacuous — the master is populated and every row is marked Sample', () => {
    expect(mockSuppliers.length).toBeGreaterThanOrEqual(12);
    const unmarked = mockSuppliers.filter((s) => !/\bSample\b/.test(s.name)).map((s) => s.name);
    expect(unmarked, `supplier names without the Sample marker: ${unmarked.join(' | ')}`).toEqual([]);
    expect(SUPPLIER_HEALTH.length).toBeGreaterThan(0);
  });

  it('every proper noun in a supplier NAME is in the allowed vocabulary', () => {
    const unknown: string[] = [];
    for (const s of mockSuppliers) {
      for (const [field, value] of nameStrings(s)) {
        for (const tok of properNouns(value)) {
          if (!ALLOWED.has(tok.toLowerCase().replace(/[.,]$/, ''))) {
            unknown.push(`${s.id}.${field}: "${tok}" (in "${value}")`);
          }
        }
      }
    }
    expect(
      unknown,
      `unrecognised proper noun in a supplier name — if this is a real company it must go; ` +
        `if it is fictional, add the token to ALLOWED deliberately:\n${unknown.join('\n')}`,
    ).toEqual([]);
  });

  it('supplier PROSE names no unrecognised party (sentence-initial capitals excluded)', () => {
    const unknown: string[] = [];
    for (const s of mockSuppliers) {
      if (!s.intelligenceNote) continue;
      for (const tok of properNouns(s.intelligenceNote, true)) {
        if (!ALLOWED.has(tok.toLowerCase().replace(/[.,]$/, ''))) {
          unknown.push(`${s.id}.intelligenceNote: "${tok}" (in "${s.intelligenceNote}")`);
        }
      }
    }
    expect(unknown, `unrecognised proper noun in supplier prose:\n${unknown.join('\n')}`).toEqual([]);
  });

  it('every supplier domain is under the reserved .example TLD', () => {
    // RFC 2606 reserves `.example`; these can never resolve to a real company.
    // Census defeat #1 lived here: a real corporate domain identifies without
    // being a name, and A's rename does not reach it unless it is taken.
    const bad: string[] = [];
    for (const s of mockSuppliers) {
      for (const [field, v] of [
        ['website', s.website],
        ['email', s.email],
        ['contactEmail', s.contactEmail],
      ] as Array<[string, string | undefined]>) {
        if (v && !/\.example$/.test(v)) bad.push(`${s.id}.${field}=${v}`);
      }
    }
    expect(bad, `supplier domain outside the reserved .example TLD: ${bad.join(', ')}`).toEqual([]);
    expect(mockSuppliers.filter((s) => s.email).length).toBeGreaterThan(0);
  });

  it('every statutory identifier carries the SAMPLE marker', () => {
    const bad = mockSuppliers
      .flatMap((s) => [
        ...(s.taxId && !s.taxId.startsWith('SAMPLE-') ? [`${s.id}.taxId=${s.taxId}`] : []),
        ...(s.businessRegNo && !s.businessRegNo.startsWith('SAMPLE-')
          ? [`${s.id}.businessRegNo=${s.businessRegNo}`]
          : []),
      ]);
    expect(bad, `statutory identifier without the SAMPLE marker: ${bad.join(', ')}`).toEqual([]);
  });

  it('buyer-dashboard health rows name no unrecognised party', () => {
    const unknown: string[] = [];
    for (const row of SUPPLIER_HEALTH) {
      for (const tok of properNouns(row.name)) {
        if (!ALLOWED.has(tok.toLowerCase().replace(/[.,]$/, ''))) {
          unknown.push(`SUPPLIER_HEALTH "${row.name}": ${tok}`);
        }
      }
    }
    expect(unknown, `unrecognised party carrying a health grade:\n${unknown.join('\n')}`).toEqual([]);
  });

  it('no statutory identifier is presented in a real document format', () => {
    // NPWP is dd.ddd.ddd.d-ddd.ddd; NIB is 13 digits. A fabricated value in a
    // REAL format is the strongest claim the census found — it must not return.
    const NPWP = /^\d{2}\.\d{3}\.\d{3}\.\d-\d{3}\.\d{3}$/;
    const NIB = /^\d{13}$/;
    const bad = mockSuppliers
      .flatMap((s) => [
        ...(s.taxId && NPWP.test(s.taxId) ? [`${s.id}.taxId=${s.taxId}`] : []),
        ...(s.businessRegNo && NIB.test(s.businessRegNo) ? [`${s.id}.businessRegNo=${s.businessRegNo}`] : []),
      ]);
    expect(bad, `statutory identifier in a real document format: ${bad.join(', ')}`).toEqual([]);
    // Non-vacuous: the rows that carry identifiers still carry them.
    expect(mockSuppliers.filter((s) => s.taxId).length).toBeGreaterThan(0);
  });

  it('no supplier claims a listed-company status it cannot have', () => {
    // `Tbk.` (Terbuka) asserts an IDX listing — a FALSE CORPORATE-STATUS claim,
    // distinct in kind from a false performance claim. Deleted, not relabelled.
    const listed = mockSuppliers
      .filter((s) => /\bTbk\.?\b|\bPLC\b|\bAG\b$/.test(`${s.name} ${s.legalName ?? ''}`))
      .map((s) => s.id);
    expect(listed, `supplier asserting a listed status: ${listed.join(', ')}`).toEqual([]);
  });
});
