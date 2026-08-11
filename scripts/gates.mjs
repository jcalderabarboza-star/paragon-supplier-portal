// ────────────────────────────────────────────────────────────────────────────
// THE THREE GATES, RUN AND ASSERTED — CP-3a.
//
// This is not a fourth gate. It runs EXACTLY the three gates CLAUDE.md names
// (`npm run build`, `npx vitest run`, `npm run test:gate`), in that order, and
// then asserts that each one actually DID something. CI runs this file and so
// can the operator: `npm run gates`. There is deliberately no command that CI
// can run and the operator cannot — CI is not a second source of truth about
// what "green" means.
//
// WHY THE ASSERTIONS EXIST. A gate that passes because it found nothing to do
// is the failure this batch exists to prevent, and it has three faces here:
//   · a suite that collects fewer tests than yesterday and still exits 0;
//   · a build that exits 0 having emitted no bundle;
//   · a test-file glob that stops matching and reports zero tests, cleanly.
// Each is checked below against `scripts/floor.json`, which is a FLOOR and not
// an equality (operator ruling, CP-3a): below it fails, above it passes and
// says so. See `assertCount` for the ruling's reasoning and the trade it makes.
//
// EXIT DISCIPLINE. The script fails by default. Every gate appends to
// `failures`; the process exits 0 only at the very end, only if that list is
// empty. A spawn that cannot start, or a child killed by a signal, counts as a
// failure and is never mistaken for a pass.
// ────────────────────────────────────────────────────────────────────────────

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_REL = 'node_modules/.cache/gates';
const OUT = join(ROOT, OUT_REL);
const FLOOR = JSON.parse(readFileSync(join(ROOT, 'scripts', 'floor.json'), 'utf8'));
const PKG = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

const CI = Boolean(process.env.GITHUB_ACTIONS);
const failures = [];
// What was actually observed, so the closing line reports the run and not the
// floor. A summary that prints the recorded number back at you is a summary
// that would read identically if nothing had run.
const observed = { tests: null, files: null, gate: null };

const group = (title) => console.log(CI ? `::group::${title}` : `\n──────── ${title} ────────`);
const endGroup = () => console.log(CI ? '::endgroup::' : '');
const ok = (msg) => console.log(`  ok   ${msg}`);
const note = (msg) => console.log(CI ? `::notice::${msg}` : `  note ${msg}`);

function fail(gate, msg) {
  failures.push(`${gate} — ${msg}`);
  // A GitHub error annotation surfaces on the run summary and in the PR diff,
  // not only in the collapsed log.
  console.log(CI ? `::error title=${gate}::${msg}` : `  FAIL ${gate} — ${msg}`);
}

/** Run a child process, streaming its output. Returns an exit code; never throws. */
function run(gate, cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', ...opts });
  if (r.error) {
    fail(gate, `could not start (${r.error.message})`);
    return 1;
  }
  if (r.signal) {
    fail(gate, `killed by signal ${r.signal} — treated as a failure, not a pass`);
    return 1;
  }
  return r.status ?? 1;
}

/**
 * Assert an observed count against the recorded FLOOR.
 *
 * A floor, not an equality (operator ruling, CP-3a). Exact matching would make
 * every legitimate test-adding PR red until somebody edited a number, which
 * trains people to edit the number — and a floor that gets edited routinely is
 * not a floor. Below it fails; above it passes and says so, loudly enough that
 * the recorded figure does not quietly go stale.
 *
 * THE TRADE, RECORDED: a suite that shrinks but still exceeds the recorded
 * floor is INVISIBLE to this check. The skipped/todo refusal below covers the
 * common shape of that (a spec disabled rather than deleted); a spec file
 * genuinely deleted while others grow past it does not.
 */
function assertCount(gate, label, actual, expected, floorPath) {
  if (actual < expected) {
    fail(gate, `${label} — REGRESSION: ${actual} < ${expected}. Something stopped being collected.`);
    return;
  }
  if (actual > expected) {
    note(
      `${label} = ${actual}, above the recorded floor of ${expected}. Bump \`${floorPath}\` ` +
        `so the floor keeps defending the current suite and not an older, smaller one.`,
    );
    return;
  }
  ok(`${label} = ${actual}`);
}

mkdirSync(OUT, { recursive: true });

// ── Gate 1/4 · npm run build (tsc && vite build) ────────────────────────────
group('gate 1/4 · npm run build  (tsc && vite build)');
{
  const dist = join(ROOT, 'dist');
  // Removed first so the artifact assertions below cannot be satisfied by a
  // stale bundle from a previous run.
  rmSync(dist, { recursive: true, force: true });

  const status = run('build', 'npm', ['run', 'build'], { shell: true });
  if (status !== 0) fail('build', `\`npm run build\` exited ${status}`);

  if (!existsSync(join(dist, 'index.html'))) {
    fail('build', 'dist/index.html was not emitted — the build produced no app shell');
  } else {
    ok('dist/index.html emitted');
  }
  const assetsDir = join(dist, 'assets');
  const chunks = existsSync(assetsDir) ? readdirSync(assetsDir).filter((f) => f.endsWith('.js')) : [];
  if (chunks.length === 0) {
    fail('build', 'dist/assets holds no JS chunk — a zero-output build is not a green build');
  } else {
    ok(`dist/assets holds ${chunks.length} JS chunk(s)`);
  }
}
endGroup();

// ── Gate 2/4 · tsc -p tsconfig.vitest.json (the SPEC surface) ───────────────
// `TSC-SKIPS-TESTS-01`. Gate 1 runs `tsc` against `tsconfig.json`, which
// EXCLUDES `src/**/*.test.ts(x)` — so for the life of the suite no gate ever
// typechecked a spec, and vitest transpiles without checking. A spec could carry
// a type error indefinitely with all three gates green.
//
// ⚠️ THE BOOKED REMEDY WAS `tsc -p tsconfig.vitest.json --noEmit` AND IT DID
//   NOTHING: the child config `include`s the specs and then INHERITS the base
//   `exclude`, which wins. Measured, not reasoned — an injected type error left
//   both configs exit-0. The override (`"exclude": []`) is what closes it.
//
// AND THE CONFIG IS RUN HERE, NOT MERELY PRESENT. Adding the override without
// adding this gate would repeat the same failure one layer up: presence mistaken
// for enforcement is exactly why the booked remedy was theatre.
group('gate 2/4 · tsc -p tsconfig.vitest.json  (typecheck the specs)');
{
  const cfg = join(ROOT, 'tsconfig.vitest.json');
  if (!existsSync(cfg)) {
    fail('tsc-specs', 'tsconfig.vitest.json is missing — the spec surface has no typecheck');
  }
  // The override is asserted, not assumed: without it this gate passes while
  // checking nothing, which is the failure it exists to prevent.
  const parsed = JSON.parse(readFileSync(cfg, 'utf8'));
  if (!Array.isArray(parsed.exclude) || parsed.exclude.length !== 0) {
    fail(
      'tsc-specs',
      'tsconfig.vitest.json must set `"exclude": []` — it EXTENDS a config that excludes '
        + 'every spec, and `include` does not override an inherited `exclude`. Without the '
        + 'override this gate typechecks nothing and reports green.',
    );
  }
  ok('tsconfig.vitest.json overrides the inherited exclude');

  const status = run('tsc-specs', 'npx', ['tsc', '-p', 'tsconfig.vitest.json', '--noEmit'], {
    shell: true,
  });
  if (status !== 0) fail('tsc-specs', `\`tsc -p tsconfig.vitest.json\` exited ${status}`);
  ok('specs typecheck clean');
}
endGroup();

// ── Gate 3/4 · npx vitest run ───────────────────────────────────────────────
// Identical execution to the documented gate; two reporters are added so the
// run leaves a machine-readable record to assert against. Invoked through the
// installed bin rather than `npx` so no network or shell resolution is involved.
group('gate 3/4 · npx vitest run  (the floor)');
{
  const reportRel = `${OUT_REL}/vitest.json`;
  const report = join(ROOT, reportRel);
  rmSync(report, { force: true });

  const status = run('vitest', process.execPath, [
    'node_modules/vitest/vitest.mjs',
    'run',
    '--reporter=default',
    '--reporter=json',
    `--outputFile.json=${reportRel}`,
  ]);
  if (status !== 0) fail('vitest', `the suite exited ${status}`);

  if (!existsSync(report)) {
    fail('vitest', 'no JSON report was written — there is no evidence the suite ran at all');
  } else {
    const r = JSON.parse(readFileSync(report, 'utf8'));
    const files = Array.isArray(r.testResults) ? r.testResults.length : 0;
    observed.tests = r.numTotalTests ?? 0;
    observed.files = files;

    assertCount('vitest', 'tests collected', r.numTotalTests ?? 0, FLOOR.vitest.tests, 'scripts/floor.json');
    assertCount('vitest', 'test files collected', files, FLOOR.vitest.files, 'scripts/floor.json');

    if (r.numFailedTests > 0) fail('vitest', `${r.numFailedTests} test(s) failed`);
    // Skipped and todo tests are collected but never run. They inflate the
    // count while proving nothing, so the floor refuses to contain any.
    if (r.numPendingTests > 0) fail('vitest', `${r.numPendingTests} test(s) skipped — a skipped test is not a passing test`);
    if (r.numTodoTests > 0) fail('vitest', `${r.numTodoTests} test(s) marked todo`);
    if (r.success !== true) fail('vitest', 'the reporter did not record the run as successful');
    if (failures.length === 0) ok(`${r.numPassedTests} passed, 0 failed, 0 skipped`);
  }
}
endGroup();

// ── Gate 4/4 · npm run test:gate (SEC-GATE-01) ──────────────────────────────
// The command is DERIVED from package.json rather than restated here: a second
// copy of the invocation is a second thing that can drift (CENSUS-MUST-DERIVE-01).
group('gate 4/4 · npm run test:gate  (SEC-GATE-01 session/HMAC)');
{
  const script = String(PKG.scripts?.['test:gate'] ?? '');
  const argv = script.split(/\s+/).filter(Boolean);
  const tapRel = `${OUT_REL}/gate.tap`;
  const tap = join(ROOT, tapRel);
  rmSync(tap, { force: true });

  const args = argv.slice(1);
  const testFlag = args.indexOf('--test');
  if (argv[0] !== 'node' || testFlag === -1) {
    fail('test:gate', `cannot derive the invocation from package.json ("${script}") — refusing to guess it`);
  } else {
    args.splice(testFlag, 1, '--test', '--test-reporter=spec', '--test-reporter-destination=stdout',
      '--test-reporter=tap', `--test-reporter-destination=${tapRel}`);

    const status = run('test:gate', process.execPath, args);
    if (status !== 0) fail('test:gate', `the gate suite exited ${status}`);

    if (!existsSync(tap)) {
      fail('test:gate', 'no TAP report was written — there is no evidence the gate suite ran');
    } else {
      const out = readFileSync(tap, 'utf8');
      const count = (key) => {
        const m = out.match(new RegExp(`^# ${key} (\\d+)$`, 'm'));
        return m ? Number(m[1]) : null;
      };
      const pass = count('pass');
      const failed = count('fail');
      const skipped = count('skipped');
      if (pass === null || failed === null) {
        fail('test:gate', 'the TAP summary could not be parsed — the count is unverified');
      } else {
        observed.gate = pass;
        assertCount('test:gate', 'gate tests passing', pass, FLOOR.gate.tests, 'scripts/floor.json');
        if (failed > 0) fail('test:gate', `${failed} gate test(s) failed`);
        if (skipped) fail('test:gate', `${skipped} gate test(s) skipped`);
      }
    }
  }
}
endGroup();

// ── The floor is named in ONE place, and CLAUDE.md must keep pointing at it ──
// FLOOR-IN-PROSE-01: `CLAUDE.md` carried a floor of 662 against an actual 2070.
// The fix was not to correct the figure but to REMOVE it — there is now no live
// number in prose to drift, only a pointer. This asserts the pointer survives,
// because deleting it is how the number comes back. Deliberately NOT a regex
// hunting for stray digits in an English document: that would fire on the very
// sentence recording this finding, and a gate that cries wolf over its own
// prose is worse than no gate.
group('floor provenance · CLAUDE.md points at the file, not at a number');
{
  const claude = join(ROOT, 'CLAUDE.md');
  if (!existsSync(claude)) {
    fail('floor provenance', 'CLAUDE.md is missing');
  } else if (!readFileSync(claude, 'utf8').includes('scripts/floor.json')) {
    fail(
      'floor provenance',
      'CLAUDE.md no longer points at `scripts/floor.json` — restore the pointer rather ' +
        'than restating the number, which is FLOOR-IN-PROSE-01 all over again',
    );
  } else {
    ok('CLAUDE.md points at scripts/floor.json');
  }
}
endGroup();

// ── Verdict ─────────────────────────────────────────────────────────────────
console.log('');
if (failures.length > 0) {
  console.log(`GATES FAILED (${failures.length}):`);
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
console.log(
  `GATES GREEN — build emitted a bundle · ${observed.tests} tests across ` +
    `${observed.files} files · ${observed.gate} gate tests. Observed, and at or above ` +
    `the recorded floor (${FLOOR.vitest.tests}/${FLOOR.vitest.files}/${FLOOR.gate.tests}).`,
);
process.exit(0);
