// ─────────────────────────────────────────────────────────────────────────────
// DISCOVERY-REAL-SUBJECTS-01 · batch D — identifying, but not a name.
//
// The census's §5 lane. These artifacts identify a real party WITHOUT being a
// proper noun, which is why every name-shaped instrument in this arc walked past
// them: a domain, a dialling code, a statutory number in a real registry format.
// Batch A's rename could not reach them, and did not.
//
// ── WHY A TREE-WIDE SOURCE SCAN, NOT A FIXTURE IMPORT ────────────────────────
//   A's guard reads `mockSuppliers` because supplier identity lives in one array.
//   THIS lane does not: the two real domains D removed were rendered in a PAGE's
//   email-preview chrome, and the statutory numbers sit in a documents fixture, a
//   PO comment, an SDC fixture and a test. A guard scoped to fixtures would have
//   passed while a real domain shipped in JSX. So the population is the SOURCE
//   TEXT, and the assertion is a property over the whole tree — the same shape as
//   H2's prose-parse pin.
//
// ── POSITIVE VOCABULARY, AGAIN ───────────────────────────────────────────────
//   `.example` is RFC 2606-reserved and can never resolve. Anything else that
//   looks like a domain must be on a NAMED, REASONED allowlist below. A new real
//   domain reddens this without anyone editing a denylist.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

const sources = () =>
  import.meta.glob('/src/**/*.{ts,tsx}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

/** This file states the offending shapes in order to forbid them, so it must not
 *  police itself — an assertion about a pattern has to be able to name it. */
const SELF = '/src/data/thirdPartyIdentifiers.test.ts';

/**
 * Domains that may appear un-reserved, each with the reason it is not exposure.
 * NOTHING is on this list because it is convenient; a domain that cannot be
 * justified in one clause belongs under `.example` instead.
 */
const ALLOWED_DOMAINS: ReadonlyArray<{ domain: string; because: string }> = [
  {
    domain: 'paragon.id',
    because:
      'FIRST PARTY — the client\'s own support contact in the client\'s own portal. ' +
      'A company may assert its own address. ⚠️ OPERATOR INPUT: if paragon.id is ' +
      'NOT theirs, this is a third party\'s domain presented as the client\'s, which ' +
      'is the shape D removed from the email-preview chrome. Confirm and correct.',
  },
  {
    domain: 'halal.go.id',
    because:
      'A REGULATOR (BPJPH). Real certifiers and regulators stay real by ruling — ' +
      'fictionalising them destroys the domain — and a link to a public authority ' +
      'asserts nothing about it.',
  },
  {
    domain: 'worldbank.org',
    because:
      'A DATA-LICENCE ATTRIBUTION in a comment (CC-BY 4.0). Citing a source is the ' +
      'opposite of the defect this arc removes; deleting it would strip provenance.',
  },
  { domain: 'example.com', because: 'RFC 2606 reserved — a placeholder by standard.' },
  { domain: 'example.org', because: 'RFC 2606 reserved.' },
  { domain: 'example.net', because: 'RFC 2606 reserved.' },
];

// ⚠️ ADDRESSABLE FORMS ONLY, AND THAT IS A STATED LIMIT.
//   The first draft of this matched any `label.tld` and flagged 40+ JS property
//   accesses — `opt.id`, `s.id`, `t.id` — because `.id` is Indonesia's ccTLD and
//   also the most common property name in this codebase. A pin that noisy trains
//   people to widen the exemption, which retires the check without anyone
//   deciding to (H2's own note on the same hazard).
//
//   So the population is domains in an ADDRESSABLE position: an email address, a
//   `scheme://` URL, or a `www.` host. That is the shape the finding actually
//   took — every artifact batch D removed was one of the three. THE LIMIT: a bare
//   domain written in prose with no `@`, scheme or `www.` is NOT caught. Named
//   here rather than left for a reader to discover.
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const URL_RE = /(?:https?:\/\/|\bwww\.)[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const hostOf = (hit: string): string =>
  hit
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/^[^@]*@/, '')
    .split('/')[0]
    .toLowerCase();

describe('DISCOVERY-REAL-SUBJECTS-01 · batch D — identifiers that are not names', () => {
  it('is non-vacuous — the scan sees the tree', () => {
    const src = sources();
    expect(Object.keys(src).length).toBeGreaterThan(400);
  });

  it('every domain in the tree is reserved, or allowed with a stated reason', () => {
    const allowed = ALLOWED_DOMAINS.map((a) => a.domain);
    const offenders: string[] = [];
    for (const [file, text] of Object.entries(sources())) {
      if (file === SELF) continue;
      text.split('\n').forEach((line, i) => {
        for (const hit of [...(line.match(EMAIL_RE) ?? []), ...(line.match(URL_RE) ?? [])]) {
          const host = hostOf(hit);
          if (host.endsWith('.example')) continue;
          if (allowed.some((a) => host === a || host.endsWith(`.${a}`))) continue;
          offenders.push(`${file}:${i + 1}  ${host}  (${hit})`);
        }
      });
    }
    expect(
      offenders,
      'un-reserved domain in the tree. If it names a real party it must move to ' +
        `.example; if it is justified, add it to ALLOWED_DOMAINS WITH A REASON:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  // ── ⚠️ BATCH B'S LANE, AND THE HONEST LIMIT ON IT ──────────────────────────
  //   B removed two real TRADEMARKS used as material identities — a fragrance
  //   house's name inside a fragrance code, and an emulsifier trademark used as
  //   the material's label.
  //
  //   THERE IS NO CHEAP DERIVATION FOR "IS THIS TOKEN A COMPANY OR A CHEMICAL",
  //   AND PRETENDING OTHERWISE WOULD BE THE WEAK INSTRUMENT WEARING A DERIVATION'S
  //   CLOTHES. Two were tried and measured before this was written:
  //     · a positive vocabulary over material labels — 115 distinct capitalised
  //       tokens, so every new material would need a list edit, which trains bulk
  //       appending in the one direction that is supposed to cost something;
  //     · a hapax rule (a company name is a one-off; chemistry recurs) — 87 of
  //       those 115 appear in exactly ONE label. Chemistry is mostly one-off too,
  //       so the rule has no precision.
  //
  //   What IS derivable is narrower, and it is asserted rather than described: a
  //   CORPORATE LEGAL FORM has no business in a material identity. That catches
  //   the commonest way a company enters this lane and has no false positives on
  //   chemistry. ⚠️ IT WOULD NOT HAVE CAUGHT EITHER OF B'S OWN CASES, because a
  //   bare brand carries no legal form — said plainly so this does not read as
  //   coverage it does not provide. The residue is covered instead by the
  //   endorsement guard's denylist sweep (which now includes `material`) and by
  //   the tree-wide scans above.
  it('no material identity carries a corporate legal form', () => {
    const LEGAL_FORM = /\b(?:PT|CV|Tbk|GmbH|AG|NV|BV|Ltd|Limited|Inc|LLC|Sdn|Bhd|Pte|Corp|Corporation|Holdings?)\b\.?/;
    const offenders: string[] = [];
    for (const [file, text] of Object.entries(sources())) {
      if (file === SELF) continue;
      for (const m of text.matchAll(/(?:label|material|materialDescription):\s*'([^']+)'/g)) {
        if (LEGAL_FORM.test(m[1])) offenders.push(`${file}  ${m[1]}`);
      }
    }
    expect(
      offenders,
      `a material identity naming a company (legal form present):\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('no statutory identifier ships in a real registry format', () => {
    // The strongest shape the census found, in every format it found it in. A
    // fabricated number in a REAL format can collide with a real registry entry,
    // which is why it is exposure even when the subject is fictional.
    const FORMATS: ReadonlyArray<{ label: string; re: RegExp }> = [
      { label: 'NPWP (Indonesian tax id)', re: /\b\d{2}\.\d{3}\.\d{3}\.\d-\d{3}\.\d{3}\b/ },
      { label: 'NIB (13-digit business registration)', re: /'\d{13}'/ },
      { label: 'BPOM notification (TD/NA prefix)', re: /\b(?:TD|NA)\.?\d{2}\.\d{2}\.\d{2}\.\d{2}\.\d{2}\.\d{4}\b/ },
      // ⚠️ WAS `[A-Z]{4}U-?\d{6,7}` — which requires FIVE letters and therefore
      //   matched nothing. The mutation probe caught it: re-inserting a real owner
      //   code left this test GREEN. An ISO 6346 code is THREE letters plus a
      //   category letter (U for freight containers, J for detachable equipment,
      //   Z for trailers), then 6–7 digits. A regex that silently matches nothing
      //   is the "gate green because it is looking at nothing" failure CP-3a
      //   exists to prevent — inside a guard written against that very failure.
      { label: 'ISO 6346 container owner code', re: /\b[A-Z]{3}[UJZ]-?\d{6,7}\b/ },
    ];
    // ⚠️ A FORMAT MASK IS NOT AN IDENTIFIER, and the guard must tell them apart.
    //   `placeholder="00.000.000.0-000.000"` on the NPWP input communicates the
    //   SHAPE a supplier should type. It cannot be anyone's tax id — every digit
    //   is zero. THE DEFECT WAS NEVER THE FORMAT; it is a PLAUSIBLE VALUE in the
    //   format, because that is what can collide with a real registry entry. So a
    //   run whose digits are all identical is a mask and passes.
    const isMask = (s: string) => {
      const digits = s.replace(/\D/g, '');
      return digits.length > 0 && new Set(digits).size === 1;
    };
    const offenders: string[] = [];
    for (const [file, text] of Object.entries(sources())) {
      if (file === SELF) continue;
      text.split('\n').forEach((line, i) => {
        for (const { label, re } of FORMATS) {
          const m = line.match(re);
          if (m && !isMask(m[0])) offenders.push(`${file}:${i + 1}  ${label}  ${m[0]}`);
        }
      });
    }
    expect(
      offenders,
      `statutory identifier in a real registry format:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });
});
