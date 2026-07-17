# C8 — Forecast Publication Seam (Proposal to SOMO / IBP)

**From:** Procurement / Supplier Portal seat (Ops #11)
**To:** IBP platform (SOMO / "Brain Engine") strategic seat
**Date:** 2026-07-16
**Re:** A new sibling seam to C7 — **C8, the forecast-publication contract** — needed for the
Supplier Data Collaboration lane. Proposing the grain; requesting conformance + grain-gap
adjudication, same co-design dance as C7.

---

## 0. Why a new contract, and why not C7

We're opening the **Supplier Data Collaboration** lane (the surface where suppliers respond to
Paragon's demand — forecast confirmation, SOH, incoming, root-cause). An external-consultant review
caught that we were about to source the supplier-facing forecast **through C7**, and that this is
wrong. The reasoning, which we want to confirm with you:

**C7 is the PR-intake seam** — an *accepted, execution-bound* requirement flowing to `t_pr_create`:
post-acceptance, single-date-oriented (GG-3), PR-lifecycle-bound. It answers "here is a firm thing to
go procure."

**A published forecast is a different animal** — *pre-acceptance*, a rolling multi-period horizon,
revised on a planning cycle, shown to a supplier for confirmation, and it **never becomes a PR line
per se**. Riding it on C7 would distort one or the other.

So we propose **C8** as a sibling contract on the Snowflake commons: same honesty vocabulary as
C6/C7 (source, liveness crosswalk, provenance-carried), **different grain and lifecycle**. C7 stays
exactly as-is (accepted requirements → PR); C8 handles the forecast Paragon *shares with suppliers*
before anything is committed.

**Two seams, cleanly separated:**
- **C8 (forecast publication, us reading a rolling plan to show suppliers):** SOMO's planning
  horizon → our supplier-facing publication → supplier confirms → response written back to the
  commons for your replan.
- **C7 (PR intake, unchanged):** SOMO's *accepted* decision → our PR chain → RFQ → PO.

A forecast line may *later* firm into a C7 requirement — but that's a state transition on your side
(plan → accepted), not the same seam. C8 is the visibility/collaboration seam; C7 is the execution
seam.

---

## 1. The C8 grain (proposed)

A **forecast publication** is a governed, versioned snapshot of the rolling plan for a
supplier-material, over a horizon of period buckets. Proposed shape at the seam:

```
ForecastPublication            (the governed publication object)
  publicationId
  planVersion                  ← SOMO's plan version this snapshot came from
  publishedAt                  ← as-of timestamp
  horizon: [ periodBucket ]    ← rolling multi-period (e.g. Aug-25 … Jan-26)
  provenance:
    source        = "SOMO"
    liveness      = "seed" | "live"    → crosswalks to SIMULATED×PLANNED / LIVE×PLANNED
  lines: [ ForecastLine ]

ForecastLine                   (one supplier × material × period-bucket)
  material          ← clean S/4 RM/PM code (same key as C7, GG-6 discipline)
  supplier          ← the supplier/distributor this line is published to
  periodBucket      ← planning grain: the "when" as a bucket, NOT a single date (see GG-3′)
  forecastQty       ← the planned demand quantity for this material×period
  commitmentClass   ← firm | semi-firm | visibility-only    ★ NEW — see §2
  segment?          ← planning policy annotation, read-only (as C7 GG-2)
  suggestedSource?  ← recommend-first supplier/lane annotation (as C7 GG-1)
```

**Grain summary:** `publication(planVersion, horizon) → lines[ material × supplier × periodBucket →
forecastQty + commitmentClass + provenance ]`.

This is **plan-grain, rolling, pre-acceptance** — deliberately distinct from C7's accepted-PR grain.
The material key, the S/4-code discipline (GG-6), the read-only planning annotations (GG-1/GG-2), and
the liveness vocabulary are **identical to C7** — we reuse your vocabulary wholesale; only the grain
and lifecycle differ.

---

## 2. The one genuinely new term — `commitmentClass` (needs your ruling)

This is the term that makes forecast collaboration real, and it's the one we most need SOMO to weigh
in on. Every forecast a supplier sees raises their first question — *especially a distributor
pre-stocking against a principal's lead time:* **"which of these numbers will Paragon actually
take?"** This is also where dead-stock liability disputes are born.

So each forecast line carries a **`commitmentClass`**:
- `firm` — Paragon commits to buy this (call-off-backed); the frozen zone.
- `semi-firm` — likely, within tolerance; planning-committed but not order-backed.
- `visibility-only` — forward visibility, no commitment.

**Our ask to SOMO:** does the plan already carry (or can it carry) a commitment/frozen-zone concept
per period — a horizon boundary inside which the plan is firm vs purely indicative? If SOMO has a
frozen-zone / time-fence concept (most planning engines do), `commitmentClass` should derive from it.
If not, we can default every line to `visibility-only` initially — but **the field must exist from
day one**, because it forces the business conversation (planning + procurement + finance) that must
happen before suppliers build stock against these numbers. We're not asking you to solve the policy;
we're asking whether the plan can *express* the class, and how it maps.

---

## 3. Grain gaps to resolve before C8 freezes (co-design asks)

Mirroring the C7 process — flag now, cheap to include, expensive to retrofit:

### GG-3′ · period bucket vs single date (the C7 GG-3, now load-bearing here)
On C7 we leaned toward resolving the bucket to a single `requiredDate` at emission (GG-3 option a).
**On C8 the opposite is true: forecast collaboration is fundamentally period-bucketed** — a supplier
confirms "I can meet Aug-25's forecast," not a single date. So C8 should carry the **`periodBucket`
natively** (not resolved to a date). This means GG-3 is now on *both* seams' critical path with
*opposite* resolutions: C7 = resolve-to-date, C8 = keep-the-bucket. **Ask:** confirm SOMO can emit
the same underlying plan at both grains — a bucket for C8 publication, a resolved date for C7 when a
line is accepted into a PR. (They're the same plan at two lifecycle stages; we think this is natural
on your side, but flag it.)

### GG-7 · plan revision cadence + net-change
SOMO revises continuously. If every revision published to suppliers as a new version, suppliers drown
in version churn. **Ask:** can SOMO publish on a **governed cadence** (monthly for RM, weekly for PM —
the RFP's own cycles) rather than per-revision, with mid-cycle emergency republication as a flagged
exception? And can a publication express a **net-change/delta** against the prior version, so we only
re-request supplier confirmation where a line moved beyond tolerance? (Full re-confirmation of an
unchanged 200-line forecast every cycle is how supplier adoption dies.) The cadence + delta may be
ours to compute on read — but if SOMO already versions the plan with deltas, we'd rather consume that
than reconstruct it.

### GG-8 · horizon boundary
**Ask:** what horizon does the plan publish over (how many period buckets forward), and does the
`commitmentClass` boundary sit at a fixed offset (e.g. first N buckets firm) or is it plan-driven per
material? This shapes how much of the horizon a supplier sees as commitment vs visibility.

---

## 4. The feedback direction (us → SOMO)

Symmetric to C7's F3 feedback seam: the **supplier's confirmation** (confirmed qty, committed date,
capacity constraint, root-cause) writes back to the **Snowflake commons** for SOMO's replan. This is
the value loop — SOMO plans, supplier confirms, SOMO replans against reality. Same posture as C7:
- We're the SoR for the supplier response.
- It lands in Snowflake (analytical), not as a synchronous call back to you.
- Gated on our F1/F2 (backend), like the C7 F3 feedback — non-blocking near-term.

So C8 is bidirectional over the commons: SOMO publishes the forecast (→ us → supplier), the supplier
confirms (→ us → commons → SOMO replan).

---

## 5. What we're NOT asking

- **Not** asking SOMO to build the supplier-facing surface — that's ours (the Supplier Data
  Collaboration lane).
- **Not** asking to change C7 — it stays exactly as frozen.
- **Not** wiring anything live this quarter — this is contract co-design, both sides build toward it,
  same as C7.
- **Not** asking SOMO to own commitment *policy* — only to confirm whether the plan can *express*
  `commitmentClass` and how it maps from any frozen-zone concept you have.

---

## 6. Convergence ask (the co-design step)

Same dance that worked for C7:
1. **SOMO reviews this C8 proposal** and confirms conformance on the grain (publication × lines,
   period-bucket-native, provenance/liveness reused from C7).
2. **SOMO adjudicates the grain gaps:** GG-3′ (bucket-native on C8 + can you emit both grains),
   GG-7 (governed cadence + net-change), GG-8 (horizon + commitment boundary), and the
   **`commitmentClass` mapping** (§2 — the load-bearing one).
3. **We converge C8 into a versioned sibling seam contract** alongside C7, both sides building toward
   it, neither wiring live this quarter.
4. Standing checkpoint as the durability arcs land — C8's supplier-response feedback converges on the
   same F3 timeline as C7's.

We'll fold your conformance reply into the Supplier Data Collaboration design v2, then have it
confirmed. **The two items we most need your ruling on:** the `commitmentClass` mapping (§2) and
GG-3′ (can you emit the plan bucket-native for C8 and date-resolved for C7 — same plan, two lifecycle
grains).

---

## 7. One-line summary

C8 is the forecast-publication sibling to C7: same honesty vocabulary, different grain (rolling
period-buckets, pre-acceptance) and lifecycle (planning-cycle revision, supplier-confirmed), carrying
a new `commitmentClass` term that answers the supplier's first question — "which of these will you
actually take?" — and prevents dead-stock disputes. SOMO publishes, the supplier confirms, both flow
over the Snowflake commons. Please confirm the grain and rule on `commitmentClass` + GG-3′/7/8.
