import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// DP2-PALETTE-01 guard (Ops #11 SEAT 2, Commit 1): chart colour must come from
// the centralized palette (src/lib/chartPalette.ts), never a raw hex literal in
// a Recharts fill/stroke prop. This locks the de-rainbow + de-stray-hex fix so
// ad-hoc chart colour can't re-enter these files. Matches both JSX props
// (fill="#.." / stroke={'#..'}) and style-object keys (fill: '#..').
const here = dirname(fileURLToPath(import.meta.url));

// Files whose charts were migrated onto chartPalette in Commit 1.
const GUARDED = ['BuyerDashboard.tsx', 'BuyerInventory.tsx', 'BuyerAnalytics.tsx'];

// A raw 3/6-digit hex assigned to a fill/stroke prop or style key.
const RAW_HEX_IN_PAINT = /\b(fill|stroke)\s*[=:]\s*['"{`]*\s*#[0-9A-Fa-f]{3,6}\b/g;

describe('DP2-PALETTE-01 — no raw hex in chart paint props', () => {
  for (const file of GUARDED) {
    it(`${file} sources chart fill/stroke from tokens, not raw hex`, () => {
      const src = readFileSync(join(here, file), 'utf8');
      const hits = src.match(RAW_HEX_IN_PAINT) ?? [];
      expect(hits).toEqual([]);
    });
  }
});
