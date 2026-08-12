// GL-0 — the glossary's coverage, pinned bilaterally, and the population reported.
//
// `tsc` already guarantees each registry is EXHAUSTIVE over its union (the
// `satisfies` pin). What tsc cannot say is whether the SCOPE is honest: that
// every registry points at a union that still exists, and that the definitions
// are real prose in both locales rather than placeholders. That is this file.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_GLOSSARY_TERMS, GLOSSARY_REGISTRIES } from './index';

const ROOT = join(__dirname, '..', '..', '..');

describe('glossary coverage (GL-0)', () => {
  it('registers a non-empty scope — a glossary of nothing defines nothing', () => {
    expect(GLOSSARY_REGISTRIES.length).toBeGreaterThan(10);
    expect(ALL_GLOSSARY_TERMS.length).toBeGreaterThan(40);
  });

  it('every registry points at a source file that exists and names its union', () => {
    const broken = GLOSSARY_REGISTRIES.filter((r) => {
      let src: string;
      try {
        src = readFileSync(join(ROOT, r.sourceFile), 'utf8');
      } catch {
        return true;
      }
      return !new RegExp(`\\b(?:type|const)\\s+${r.sourceType}\\b`).test(src)
        && !new RegExp(`export\\s+type\\s+${r.sourceType}\\b`).test(src);
    }).map((r) => `${r.sourceType} @ ${r.sourceFile}`);
    expect(broken, `registry points at a union that is gone or moved:\n${broken.join('\n')}`)
      .toEqual([]);
  });

  it('every term carries real prose in BOTH locales', () => {
    const thin = ALL_GLOSSARY_TERMS.filter(
      (t) => t.en.trim().length < 25 || t.id.trim().length < 25,
    ).map((t) => `${t.sourceType}.${t.term}`);
    expect(thin, `placeholder-length definition:\n${thin.join('\n')}`).toEqual([]);
  });

  it('no definition is the same string in both locales — an untranslated row', () => {
    const same = ALL_GLOSSARY_TERMS.filter((t) => t.en.trim() === t.id.trim())
      .map((t) => `${t.sourceType}.${t.term}`);
    expect(same, `EN and ID identical (ID was not authored):\n${same.join('\n')}`).toEqual([]);
  });

  it('no definition merely restates its own term', () => {
    // A definition whose EN text is just the term spelled out is a summary of
    // the implementation, not a definition — the PF-2 test, which came back
    // zero of ninety-one.
    const echoes = ALL_GLOSSARY_TERMS.filter((t) => {
      const words = t.term.replace(/[._-]/g, ' ').toLowerCase().split(/\s+/).filter(Boolean);
      const en = t.en.toLowerCase();
      return words.length > 0 && words.every((w) => en.includes(w)) && t.en.trim().length < 60;
    }).map((t) => `${t.sourceType}.${t.term}`);
    expect(echoes, `definition restates the term:\n${echoes.join('\n')}`).toEqual([]);
  });

  it('remedyRoute is ABSENT everywhere — the routing half of the dead-end stays open', () => {
    // HALAL-REFUSAL-DEAD-ENDS-01: GL-0 closes the DEFINITIONAL half only. The
    // destination (who rules, where, what the clerk does meanwhile) does not
    // exist, so populating this field would make the row read as closed.
    const routed = ALL_GLOSSARY_TERMS.filter((t) => t.remedyRoute !== undefined)
      .map((t) => `${t.sourceType}.${t.term}`);
    expect(routed, `remedyRoute populated before a destination exists:\n${routed.join('\n')}`)
      .toEqual([]);
  });

  it('has no duplicate term within a registry', () => {
    for (const r of GLOSSARY_REGISTRIES) {
      const keys = Object.keys(r.entries);
      expect(new Set(keys).size, `duplicate term in ${r.sourceType}`).toBe(keys.length);
    }
  });
});
