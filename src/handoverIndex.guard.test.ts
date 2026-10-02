// ────────────────────────────────────────────────────────────────────────────
// H1 · THE HANDOVER PACKAGE IS WHAT ITS INDEX SAYS IT IS.
//
// `docs/handover/HANDOVER_INDEX.md` lists every file of the package, where it
// lives, and — for the designs and reviews — the git blob id of the committed
// bytes. A team that has never seen this repository will trust that index, so
// it is held to the tree:
//
//   · every target path the index lists exists;
//   · every blob id it records equals `git hash-object` of the committed file
//     (normalised by git, so it reads the same on any platform);
//   · the rows marked as edited are exactly the files that carry the neutral
//     path placeholder — derived both ways, never listed here;
//   · the total the index states equals the rows it holds;
//   · the RFP is not committed (the index says it is deliberately left out).
// ────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const INDEX = join(ROOT, 'docs', 'handover', 'HANDOVER_INDEX.md');
const text = readFileSync(INDEX, 'utf8').replace(/\r\n/g, '\n');

/** One table row naming a target under `docs/handover|designs|reviews/`. */
interface Row {
  readonly target: string;
  readonly source: string;
  readonly blob: string | null;
}

/** The table rows of §1–§3: first cell a backticked target path. */
export function indexRows(md: string): Row[] {
  const rows: Row[] = [];
  for (const line of md.split('\n')) {
    const m = /^\| `(docs\/(?:handover|designs|reviews)\/[^`]+)` \| (.+?) \|/.exec(line);
    if (!m) continue;
    const blob = /`([0-9a-f]{40})` \|\s*$/.exec(line)?.[1] ?? null;
    rows.push({ target: m[1], source: m[2], blob });
  }
  return rows;
}

const ROWS = indexRows(text);
const hashObject = (rel: string): string =>
  execFileSync('git', ['hash-object', rel], { cwd: ROOT, encoding: 'utf8' }).trim();

/** The neutral placeholder written where a personal user folder stood (§5.1). */
const PLACEHOLDER = 'C:\\Users\\<operator>\\';
const EDITED_MARK = '(path line neutralised';

describe('H1 · the handover index — the population first', () => {
  it('the rows parse, and hold known members from each of the three directories', () => {
    const targets = ROWS.map((r) => r.target);
    expect(targets).toContain('docs/handover/D1_SE_HANDOVER.md');
    expect(targets).toContain('docs/designs/DESIGN_1_PLANNING_GRID.md');
    expect(targets).toContain('docs/reviews/R3_STATE_MACHINE.md');
    expect(targets).not.toContain('docs/handover/RFP__Supplier_Collaboration_Hub.pdf');
    expect(new Set(targets).size).toBe(targets.length);
  });

  it('the total the index states is the number of rows it holds', () => {
    const stated = /\*\*Files to commit: (\d+)\*\*/.exec(text);
    expect(stated, 'the index no longer states its total in the form this guard reads').not.toBeNull();
    expect(ROWS.length).toBe(Number(stated![1]));
  });

  it('every design and review row records a blob id; no handover row does', () => {
    expect(ROWS.filter((r) => !r.target.startsWith('docs/handover/') && !r.blob).map((r) => r.target)).toEqual([]);
    expect(ROWS.filter((r) => r.target.startsWith('docs/handover/') && r.blob).map((r) => r.target)).toEqual([]);
  });
});

describe('H1 · the handover index — the claims', () => {
  it('every file the index lists exists at its path', () => {
    expect(ROWS.filter((r) => !existsSync(join(ROOT, r.target))).map((r) => r.target)).toEqual([]);
  });

  it('every recorded blob id equals git hash-object of the committed file', () => {
    const wrong = ROWS.filter((r) => r.blob && hashObject(r.target) !== r.blob).map(
      (r) => `${r.target}: index ${r.blob}, file ${hashObject(r.target)}`,
    );
    expect(wrong).toEqual([]);
  });

  it('the rows marked edited are exactly the files carrying the neutral path placeholder', () => {
    const marked = ROWS.filter((r) => r.source.includes(EDITED_MARK)).map((r) => r.target).sort();
    const carrying = ROWS.filter(
      (r) => !r.target.startsWith('docs/handover/') && readFileSync(join(ROOT, r.target), 'utf8').includes(PLACEHOLDER),
    )
      .map((r) => r.target)
      .sort();
    expect(marked.length).toBeGreaterThan(0);
    expect(marked).toEqual(carrying);
  });

  it('no file in the three package directories is missing from the index', () => {
    const onDisk = ['handover', 'designs', 'reviews'].flatMap((d) =>
      readdirSync(join(ROOT, 'docs', d)).map((f) => `docs/${d}/${f}`),
    );
    const listed = new Set(ROWS.map((r) => r.target));
    expect(onDisk.filter((p) => !listed.has(p))).toEqual([]);
  });

  it('the RFP is not committed anywhere under docs/', () => {
    const pdfs: string[] = [];
    const walk = (dir: string): void => {
      for (const e of readdirSync(dir)) {
        const p = join(dir, e);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.pdf$/i.test(e)) pdfs.push(p);
      }
    };
    walk(join(ROOT, 'docs'));
    expect(pdfs.filter((p) => /rfp/i.test(p))).toEqual([]);
  });
});
