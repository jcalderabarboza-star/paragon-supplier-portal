// ─────────────────────────────────────────────────────────────────────────────
// MD-1 · THE REPLICA STORES HAVE ONE WRITER — derived from source, every run.
//
// SAP owns master data, so nothing in the portal may write a replicated field.
// That is a claim about every file in `src/`, including ones written after this
// spec, so it is held by reading the source: the files that name the store's
// write door, and the files that call the applier.
//
// The derivation is a function of a file map, so the spec can hand it a tree
// with a second writer in it and see that writer NAMED — a scan that has only
// ever run on a clean tree has never been shown to fire.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { stripSourceComments } from '../../lib/sourceScan/stripComments';

const SRC = join(process.cwd(), 'src');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
const rel = (file: string): string => file.slice(SRC.length + 1).replace(/\\/g, '/');

/** Every product source file (no spec), comments removed, by its path under `src/`. */
const PRODUCT: Readonly<Record<string, string>> = Object.fromEntries(
  walk(SRC)
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
    .map((f) => [rel(f), stripSourceComments(readFileSync(f, 'utf8'), 'delete', f)]),
);

/** The files that name the store's write door. */
const namesWriteDoor = (files: Readonly<Record<string, string>>): string[] =>
  Object.keys(files).filter((f) => /\breplicaWrite\b/.test(files[f])).sort();

/** The files that call the applier. */
const callsApplier = (files: Readonly<Record<string, string>>): string[] =>
  Object.keys(files).filter((f) => /\bapplySyncRun\s*\(/.test(files[f])).sort();

const STORE = 'services/masterData/replicaStore.ts';
const APPLIER = 'services/masterData/syncApplier.ts';

describe('MD-1 · the replica stores have one writer', () => {
  it('⚠ CONTROL — the scan read real source: the store, the applier and an unrelated page are in it', () => {
    expect(Object.keys(PRODUCT)).toContain(STORE);
    expect(Object.keys(PRODUCT)).toContain(APPLIER);
    expect(Object.keys(PRODUCT)).toContain('pages-v2/BuyerMasterData.tsx');
    expect(PRODUCT[STORE]).toMatch(/export const replicaWrite\b/);
    // Comments are gone, so a file that only TALKS about the door is not counted.
    expect(PRODUCT[STORE]).not.toMatch(/ONE caller/);
  });

  it('only the store that declares the write door and the sync applier name it', () => {
    expect(namesWriteDoor(PRODUCT)).toEqual([STORE, APPLIER]);
  });

  it('only the applier’s own module calls the applier: the seed is its one entrance today', () => {
    expect(callsApplier(PRODUCT)).toEqual([APPLIER]);
  });

  it('⚠ PROBE — a second writer added to the tree is named by the same derivation', () => {
    const withIntruder = {
      ...PRODUCT,
      'pages-v2/Intruder.tsx': "import { replicaWrite } from '../services/masterData/replicaStore';\nreplicaWrite.put(record);",
    };
    expect(namesWriteDoor(withIntruder)).toEqual(['pages-v2/Intruder.tsx', STORE, APPLIER]);
    const withCaller = { ...PRODUCT, 'services/data/mock/Feed.ts': 'applySyncRun (run);' };
    expect(callsApplier(withCaller)).toEqual(['services/data/mock/Feed.ts', APPLIER]);
  });

  it('the store exports nothing else that writes: its only other export is the read door', () => {
    const exported = [...PRODUCT[STORE].matchAll(/export const (\w+)/g)].map((m) => m[1]).sort();
    expect(exported).toEqual(['replicaRead', 'replicaWrite']);
    const readDoor = PRODUCT[STORE].slice(PRODUCT[STORE].indexOf('export const replicaRead'), PRODUCT[STORE].indexOf('export const replicaWrite'));
    expect(readDoor).not.toMatch(/\.(set|delete|clear|push)\(/);
  });
});
