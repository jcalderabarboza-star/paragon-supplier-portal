# G1.3.1 — 2,500-row spike: findings (empirical)

**Status:** DONE · measured, not assumed · **verdict: virtualization holds → GO for G1.3.2**
**Date:** 2026-07-15 · **Batch:** G1.3.1 (empirical spike gating G1.3.2)
**Provenance:** throwaway branch `spike/g1-3-1-2500-row-throwaway` (NOT merged; only this
note lands on main — no fixture, no wiring). Reproduce by regenerating the throwaway
generator; the branch is disposable.

## Why this spike

G1.3's adjudication assumed the read-only DSGs scale (virtualized) and that the plain-DOM
`IntakePushPanel` is the scale bottleneck. Before committing the edit-surface rework
(G1.3.2: working-set override drawer + shared full-screen wrapper), prove the assumption
in the browser at 2,500 rows rather than reasoning about it.

## Setup

- **Production preview build** (`npm run build && vite preview`) — real bundle, not dev.
- Throwaway toggle `#/buyer/plan-grid?rows=2500` swapped the 4-row samples for **2,500
  generated intake rows** (intake DSG at a viewport-tall 600px) and **2,500 generated
  award rows** (award DSG, to time the O(n) what-if recompute at scale). Nothing else
  changed; the governed push panel stayed on its real 4-row sample.
- Chromium via Playwright, viewport 1440×900. Measured via `performance.*` + DOM counts.

## Measurements

| Metric | Result | Read |
|---|---|---|
| Intake DSG mounted rows, at rest | **20 of 2,500** | virtualized |
| Award DSG mounted rows, at rest | **10 of 2,500** | virtualized |
| Mounted rows after scroll to bottom (scrollTop 99,441 / 100,040) | **21**; true last row `Corrugated Shipper #2499` rendered | window follows scroll, correct data |
| Max mounted during 25-step full-range scroll sweep | **21** (bounded) | never unrolls the list |
| Scroll re-virtualization cost | **~0.02 ms/step** (0.5 ms for 25 sync jumps) | free |
| Virtual scroll height | **100,040 px** (2,500 × ~40 px) | full model present; only the window mounts |
| Whole-page DOM nodes (5,000 logical rows across 2 grids) | **~1,270** | flat vs row count |
| What-if recompute — `buildWhatIfOverlay` over 2,500 award rows | **5.6 ms** | O(n) memoized, trivial |
| First paint / FCP / DCL | **168 / 468 / 386 ms** | fast first paint |
| Console (errors, warnings) | **0, 0** | clean |

## Contrast — why the working-set drawer (not full-panel-virtualize)

The plain-DOM `IntakePushPanel` renders a real `<table>` with **~23 DOM nodes per row**,
un-virtualized. At 2,500 rows that extrapolates to **~57,500 nodes** — roughly **45× the
entire virtualized page** as measured above. This is the bottleneck the adjudication named,
now quantified: the fix is to **never mount 2,500 editable rows**. The working-set override
drawer edits only the selected requirement (a handful of nodes), keeping the reason-gate
plain-DOM and headless-provable while browse scales via the DSG.

## Verdict

- **DSG virtualization genuinely holds at 2,500 rows**, measured: only the visible window
  (~20 rows) mounts at any scroll position, scroll re-virtualization is effectively free,
  and the full 2,500-row model is present (scroll height correct, last row renders).
- **The pure-TS what-if recompute is trivial at n=2,500** (5.6 ms); the memo keeps it off
  the render path except on a weights edit, and a weights-edit recompute is the same O(n)
  function at the same cost.
- **GO for G1.3.2 as adjudicated**: working-set override drawer (option 2b) + shared
  `<FullScreenSection>` wrapper reusing the height-pin. Do **not** full-panel-virtualize
  the edit surface, and do **not** re-bury the reason-gate in the virtualized body.

## Caveats (honest bounds)

- Desktop Chromium, one machine, production preview build. Uniform ~40 px row height.
- A full-screen section is taller than the 600 px measured here, so it mounts proportionally
  more rows — but still bounded to *visible + overscan* (e.g. a ~1080 px section ≈ ~30 rows),
  not the full list. The scaling shape is unchanged; only the constant differs.
- The what-if figure is the first-compute time; a re-compute on a weights edit runs the same
  `buildWhatIfOverlay(rows, weights)` over the same n, so the cost is representative.
