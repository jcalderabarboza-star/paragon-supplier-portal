# CP-0 · 2e-c — multi-currency bid comparison · operator smoke

**Who this is for:** the operator, by hand, on the built bundle. No dev tools
required beyond the browser console tab.
**How long:** under five minutes for both language passes.
**What it proves:** that a comparison the portal cannot make honestly *says so,
by name*, and that a comparison it can make is derived from a rate someone
recorded — with that rate, its vintage and its source visible on screen.

> **Why a script exists at all.** Every honesty claim the 2e-c arc makes was, until
> now, witnessable only through an accidental fixture pairing. QA-PERSONA-01 is
> exactly this finding: reachability is a property of the fixture set, not a
> guarantee. A refusal nobody can reach is not a delivered refusal.

---

## Before you start

| | |
|---|---|
| **Build** | `npm run build` then `npx vite preview --port 4213` |
| **URL** | `http://localhost:4213/#/buyer/sourcing` (or the deployed URL + `#/buyer/sourcing`) |
| **Persona** | **Buyer** — use the shell's Buyer/Supplier toggle. Every step below is buyer-side; you never switch. |
| **App language** | Set with the **EN / ID** control in the top bar. Pass A is EN, Pass B is ID. |
| **Browser locale** | **Anything.** Leave your OS/browser locale alone. Every formatter in this app names its own locale explicitly (`format.ts`) — nothing reads the browser's. If a number or date below changes when your browser locale changes, that is a defect: report it. |
| **Console** | Open the browser console before step 1 and leave it open. The expected count at every checkpoint is **zero errors and zero warnings**. |

**The fixtures this script uses** — all seeded, all present on a cold load:

| id | number | what it is |
|---|---|---|
| `rfq-012` | **RFQ-2026-012** · *Propylene Glycol USP — dual-currency bid comparison* | Open. Two bids, **no rate recorded**. |
| `qt-012a` | bid from `sup-002` · **PT Musim Mas Specialty Fats** | **Rp 27.500/KG** |
| `qt-012b` | bid from `sup-006` · **Evonik Specialty Chemicals France** | **$1.65/KG** |
| `rfq-013` | **RFQ-2026-013** · *Propylene Glycol USP — dual-currency, rate on record* | Open. The same two bids, **with a rate ledger already on file**. |

`rfq-012` and `rfq-013` are **rows 10 and 11** of the default **All** tab, directly
above the two Awarded RFQs at the bottom of the list. They are identical in every
respect except the recorded rate, so anything that differs between them on screen
is caused by the rate and by nothing else.

**Do not reload between steps** unless a step says to. The data lives in memory, so
a reload discards any rate you record and puts you back at step 2.

---

## Pass A — English

### 1. Go to the sourcing workspace.
Route `#/buyer/sourcing`, persona **Buyer**, language **EN**.
**Expect:** the RFQ board, tab **All** selected, carrying a **13** count badge
beside the label (they are two elements, not the single string "All (13)").
**Console:** clean.

### 2. Click the row **RFQ-2026-012** (row 10).
**Expect:** the side panel opens, titled
*RFQ RFQ-2026-012 — Propylene Glycol USP — dual-currency bid comparison*.

### 3. Read the banner directly under **Quote comparison (2 quotes)**.
**Expect, word for word:**

> Not ranked — quotes are priced in **USD** and no exchange rate has been recorded
> for this RFQ. Record a rate to compare them; the bids below are shown as quoted.

This is the first of the two outcomes. Note it names **USD** — the currency that
actually needs a rate — rather than saying something went wrong.

### 4. Read the **Exchange rate basis** strip below the banner.
**Expect:** `1 USD` · **No rate recorded** · a **Record USD rate** button ·
a **Sample** liveness pill on the strip's heading.

### 5. Read the four score rows in the table: **Price Score, Lead Time Score, Compliance, Reliability**, and **Composite**.
**Expect:** every cell is an em dash **—**, in both columns.
**Expect:** **no** *Top-ranked* chip on either supplier's column header.
An absent score is not a score of zero; the portal withheld the ranking rather
than publishing one it could not justify.

### 6. Read the **Unit Price** and **vs Should-Cost** rows.
**Expect:**

| | PT Musim Mas | Evonik |
|---|---|---|
| Unit Price | `Rp 27.500/KG` | `$1.65/KG` |
| vs Should-Cost | `+19% to +37%` · `vs modeled ~Rp 21.572/kg` · Sample · Model · **FX-converted** | `+16% to +34%` · `vs modeled ~$1.33/kg` · Sample · Model |

The bids are still shown — they are facts the suppliers stated. What was withheld
is the *ranking*. The **FX-converted** marker appears on the rupiah row only: the
should-cost engine is USD-native, so the rupiah reference is pushed through spot
FX and the dollar reference is not.

### 7. Click **Record USD rate**.
**Expect:** a dialog titled *Record the USD exchange rate*, with **Record rate**
**disabled**. Nothing has been written yet — opening the dialog commits nothing.

### 8. In **Rate — IDR per 1 USD**, type exactly: `17.250`
**Expect** a refusal under the field, word for word:

> This can be read two ways — "17.250" means seventeen thousand two hundred fifty
> in Indonesian and seventeen-point-two-five in English. Type it without
> separators: 17250.

**Expect: Record rate stays disabled.** This is the point of the whole gate. A rate
misread by 1000× would re-denominate every foreign bid on the RFQ and produce a
ranking that looks entirely plausible, so a token that is legal under both reading
conventions is refused rather than guessed at.

### 9. Clear the field and type exactly: `17250`
**Expect:** the refusal disappears.

### 10. In **Rate date**, enter **today's date**.
**Expect:** no refusal. **Record rate** becomes **enabled**.
*(Try a future date first if you like — it is refused with "A rate cannot be true
in the future. Enter the date it applied." A future-dated rate would never age
past the 7-day staleness limit, so it would rank forever without ever asking to
be replaced.)*

### 11. Click **Record rate**.
**Expect:** the dialog closes and a toast reads **USD rate recorded** — *The
comparison now ranks against it.*

### 12. Without closing or reopening the panel, read the banner area again.
**Expect:** the *Not ranked* banner is **gone**, and the basis strip now reads:

> `1 USD` = **`Rp 17.250`** · **as of** *(today's date, e.g.* `31 Jul 2026`*)* ·
> **Entered manually** · **Supersede USD rate**

The panel must update in place. If you have to close and reopen it to see the
rate, that is the 2e-c-4-FIND-01 stale-snapshot defect returning — report it.

### 13. Read the table one more time — this is the second outcome.
**Expect exactly:**

| row | PT Musim Mas | Evonik |
|---|---|---|
| Price Score | **100** | **97** |
| Lead Time Score | 58 | 58 |
| Compliance | 50 | 50 |
| Reliability | 50 | 50 |
| Composite | **67** | **66** |

**Expect:** a **Top-ranked** chip on the **PT Musim Mas Specialty Fats** column.

**What you are looking at.** The two bids are identical on lead time, compliance,
reliability, payment terms and validity — currency is the only variable. At
17,250 the dollar bid is 28,462.50 rupiah against 27,500: about 3.5% apart, and
the domestic supplier wins by a little. **Compare bare numerals instead — 27,500
against 1.65 — and the rupiah bid scores 0 on price and the recommendation flips
to Evonik.** That is the defect the refusal in step 3 exists to prevent, and the
whole distance between those two tables is the recorded rate.

### 13b. *(optional, +20 seconds — the freeze as a live behaviour)*
Click **Supersede USD rate**, enter `17400` and today's date, confirm.
**Expect** the toast **New USD rate recorded** — *The previous rate is kept on the
RFQ; comparisons now use the new one.* — and the basis strip to become:

> `1 USD` = `Rp 17.400` · as of *(today)* · Entered manually · **1 earlier rate
> kept** · Supersede USD rate

The 17,250 you recorded in step 11 was not overwritten. There is no edit path in
this dialog at all — superseding is the only way a rate moves, which is what makes
"the prior basis is preserved" a property rather than a promise.

### 14. Click **Close panel**, then click the row **RFQ-2026-013** (row 11).
**Expect** the banner, word for word:

> Not ranked — the recorded exchange rate for **USD** (as of **16 May 2026**) is
> older than this comparison allows. Record a current rate; the previous one is
> kept on the RFQ.

The third outcome. A rate that exists is not the same as a rate you may rank on,
and the refusal names the vintage it is judging — "too old" without saying how old
leaves you unable to tell this morning's rate from January's.

### 15. Read the **Exchange rate basis** strip on RFQ-2026-013.
**Expect:**

> `1 USD` = **`Rp 17.310`** · **as of 16 May 2026** · **Entered manually** ·
> **1 earlier rate kept** · **Supersede USD rate**

**"1 earlier rate kept" is the D-1 freeze, visible.** This RFQ carries two recorded
rates. The older one (17,180, as of 9 May) was not edited or replaced — it is
still on the RFQ, so the basis every earlier comparison used is still on the
record. That is also why the button says *Supersede* and never *Edit*: recording a
new rate is a new act, not a correction of an old one.

### 16. Check the console.
**Expect:** zero errors, zero warnings, across all fifteen steps.

---

## Pass B — Bahasa Indonesia

**Reload the page first** (this clears the rate you recorded in step 11), then
switch the top-bar language control to **ID**. Repeat steps 2 – 15. Everything
below is what must change; anything not listed must be identical to Pass A,
including every figure.

### B1. RFQ-2026-012 — the unpinned refusal (step 3)

> Tidak diperingkat — penawaran dihargai dalam **USD** dan belum ada kurs yang
> dicatat untuk RFQ ini. Catat kurs untuk membandingkannya; penawaran di bawah
> ditampilkan sesuai yang diajukan.

**The currency must appear.** An Indonesian refusal that does not name **USD** is
not a milder refusal — it is a refusal that does not say what is wrong, which is
the entire claim, lost for half the userbase.

### B2. The basis strip (steps 4 and 12)
Unpinned: **Dasar kurs** · `1 USD` · **Belum ada kurs tercatat** · **Catat kurs USD**
Recorded: `1 USD` = `Rp 17.250` · **per 31 Jul 2026** · **Dimasukkan manual** ·
**Ganti kurs USD**

The button reads **Ganti** ("replace with a new one"), never *Ubah* ("edit").

### B3. The ambiguous rate (step 8)

> Ini bisa dibaca dua cara — "17.250" berarti tujuh belas ribu dua ratus lima
> puluh dalam bahasa Indonesia dan tujuh belas koma dua lima dalam bahasa
> Inggris. Ketik tanpa pemisah: 17250.

### B4. The ranked table (step 13)
Identical figures — **100 / 97**, **67 / 66** — with **Peringkat teratas** on
PT Musim Mas Specialty Fats.

### B5. RFQ-2026-013 — the stale refusal (steps 14 – 15)

> Tidak diperingkat — kurs tercatat untuk **USD** (per **16 Mei 2026**) lebih lama
> daripada yang diizinkan perbandingan ini. Catat kurs terkini; kurs sebelumnya
> tetap tersimpan pada RFQ.

Basis strip: `1 USD` = `Rp 17.310` · **per 16 Mei 2026** · **Dimasukkan manual** ·
**1 kurs sebelumnya disimpan** · **Ganti kurs USD**

The supersede toast (step 13b) reads **Kurs USD baru tercatat** — *Kurs sebelumnya
tetap tersimpan pada RFQ; perbandingan kini memakai kurs baru.*

Note the date localises — **16 Mei 2026**, not *16 May 2026* — while the rupiah
figure `Rp 17.310` is identical in both languages, because rupiah has one correct
rendering regardless of who is reading it.

### B6. Console.
**Expect:** zero errors, zero warnings.

---

## What this script deliberately does NOT cover

Stated so their absence is not read as an oversight:

- **The supplier-side currency refusal** (*"EUR is not a currency Paragon accepts
  for bids"*, 2e-c-2). It is **not reachable by hand**, on purpose: the supplier's
  bid-currency field is a dropdown generated from the permitted list and guarded
  on change, so there is no way to type an off-list token into it. The policy hook
  is defence-in-depth against a future non-form caller, and it is proven in
  `quotationSubmitModel.test.ts` rather than here.
- **A EUR bid.** No seeded supplier quotes in euro. A EUR bid renders honest
  silence on the should-cost row — *"No should-cost reference — quoted in a
  currency the model does not price"* — which is operator ruling **D-4**, recorded
  in `docs/findings.md` as **D-4-EUR-SPREAD-GAP**. Proven in
  `shouldCostSpread.test.ts` and `BuyerSourcing.test.tsx`.
- **Awarding either RFQ.** Both are left Open so the script can be re-run from a
  reload forever. Awarding rfq-012 would consume the fixture.

## If a step fails

Report the step number, the language, and what the screen said instead. Every
expected string above is pinned by a spec, so a mismatch is either a real
regression or a fixture that drifted — both worth knowing:

- fixture properties → `src/data/fxReachability.test.ts`
- surface behaviour → `src/pages-v2/BuyerSourcing.test.tsx`
- EN/ID coverage → `src/lib/i18n/fxCurrencyArc.test.ts`, `src/lib/i18n/fragments.test.ts`
