// ─────────────────────────────────────────────────────────────────────────────
// H2 · THE EXTERNAL-CLAIM HONESTY GUARD — no screen claims an act that did not
// happen OUTSIDE it.
//
// ⚠️ **THIS IS NOT A SECOND COPY OF `toastHonesty.guard.test.tsx`. IT ASKS A
// DIFFERENT QUESTION, AND THE DIFFERENCE IS WHY EIGHT LIVE CLAIMS SURVIVED THE
// OLDER GUARD.** That guard asks *"did this branch do ANYTHING?"* — and answers
// yes for a bare `setState`, deliberately, because for a UI affordance a state
// write usually IS the act (expanding a dock panel, loading parsed rows into a
// grid). This one asks a narrower question that a state write can never answer
// yes to:
//
//   **IF a toast's copy claims an EXTERNAL effect — a file produced, a party
//   notified, a record submitted or stored — then a NON-SETTER act must
//   co-execute with it, or the copy must ADMIT the effect did not happen.**
//
// A `setState` cannot produce a PDF, cannot notify a carrier, and cannot store
// anything past a reload. That is the whole of the narrowing, and it is a
// property rather than a judgement.
//
// ── WHY THE OLDER GUARD MISSED THE CLASS — MEASURED, NOT ARGUED ─────────────
//
// Three independent holes, each derived against the tree on the day of this
// batch (`_derive_gap`, reproduced in the PR body):
//
//   **1 · ATTRIBUTION — AND THIS ONE ALONE ACCOUNTS FOR ALL EIGHT.** The older
//   guard's `AFFORDANCE` matcher recognises exactly two handler shapes: an
//   `on<Something>` prop, and `const handle<Something> = (…) =>`. Every one of
//   the eight sites this batch fixed is a handler named after its VERB —
//   `exportReport`, `sendRemittance`, `downloadPdf`, `sendToWarRoom`,
//   `submitNewMaterial`, `removeCatalogItem`, `submitChangeRequest`, `goToASN`.
//   Measured: **attributed = false for all eight**, with the bilateral control
//   (`BuyerShipments.handleExport`, a `handle*` name) attributed = true in the
//   same run. Those toasts landed in that guard's `UNATTRIBUTED` set, which it
//   materialises and asserts the EXISTENCE of but passes no verdict on.
//
//   ⚠️ **AND IT SAID SO ITSELF.** Its header names the shape — *"a helper whose
//   name is not `handle*`"* — and calls the silence "a reach limit rather than a
//   verdict". That was an honest thing to write and it was never closed, so the
//   class lived for eight sites inside the documented blind spot. **A recorded
//   reach limit is a finding, not a gate**, and this file is what turns the one
//   into the other. The unit here is therefore the INNERMOST ENCLOSING
//   FUNCTION, whatever it is called — there is no naming convention to satisfy
//   and so nothing to forget.
//
//   **2 · `set[A-Z]\w*` IS A REAL ACT THERE.** Measured on the pre-fix bodies:
//   `BuyerRisk.sendToWarRoom` (`setWarRoomSent(true)`) and
//   `SupplierMyStorefront.submitNewMaterial` (`setCatalog(…)`) both return
//   `PERFORMS_REAL_ACT = true`. So for two of the eight, fixing attribution
//   alone would NOT have caught them — a second, independent escape.
//
//   **3 · SCOPE.** `PAGES_DIR = __dirname`, so `src/components/**` is not
//   scanned at all. This guard reads both trees.
//
// ⚠️ **THE OLDER GUARD IS NOT WEAKENED OR REPLACED.** Its setter acquittal is
// correct for the question it asks, and narrowing it there would convict
// `BulkStockEntryGrid.handleImport` — *"Batches imported · {{count}} rows added
// — review and Declare when ready"* — which is TRUE: `setRows(imported)` puts
// those rows on the screen the sentence is about. Two questions, two gates.
//
// ── THE CLAIM VOCABULARY IS CLOSED, AND THE CONTROLS ARE WHAT JUSTIFY IT ────
//   A vocabulary is a word list, and a word list is the thing this repository
//   distrusts. It is defensible here only because it is pinned from BOTH sides
//   in the same run: the copies this tree REALLY SHIPPED must be convicted, and
//   their replacements — plus a genuinely backed success toast — must be
//   acquitted. `PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01`: the probe input is the
//   defect the tree actually carried, captured on the day it was removed, not a
//   synthetic string invented to match the matcher.
//
// ── PIN REACH ──────────────────────────────────────────────────────────────
// **GUARDED:** the population is non-empty; the claim matcher matches something
// live (an inert rule reads green); no live site claims an external effect
// without a non-setter act or an admission; the retired copies are convicted;
// the replacements and a backed success toast are acquitted.
// **NOT GUARDED:** copy assembled at runtime from a template key
// (`t(\`sdc.${prefix}.failed.title\`)` cannot be resolved statically — it is
// recorded in `DYNAMIC_KEYS` rather than silently skipped); a claim rendered
// outside a `toast(` call; and whether an admission is TRUE, which no gate can
// know.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { resources } from '../lib/i18n';
import { stripSourceComments } from '../lib/sourceScan/stripComments';

const ROOTS = [join(__dirname), join(__dirname, '..', 'components')];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.tsx') && !p.includes('.test.')) out.push(p);
  }
  return out;
}

/**
 * A NON-SETTER act: something that leaves the component. This is
 * `toastHonesty`'s `NON_SETTER_ACT`, reused verbatim and for the same reason —
 * a URL write or a dispatch is an external effect; a visibility flag is not.
 */
const NON_SETTER_ACT =
  /\b(?:\w*[Mm]utation\.mutate|\w*[Mm]utateAsync|dispatch|navigate|window\.open|createObjectURL|setSearchParams|location\.assign|fetch|refetch|invalidateQueries)\s*\(/;

/**
 * Claims that an EXTERNAL effect occurred. EN and ID, closed, and pinned by the
 * bilateral controls below rather than by anybody's judgement of completeness.
 */
const EXTERNAL_CLAIM: readonly RegExp[] = [
  // an artefact was produced or is being delivered
  /\bdownloading\b/i,
  /\bdownload (?:starting|started)\b/i,
  /\bmengunduh\b/i,
  // ⚠️ **ADDED AT H3, AND FORCED BY A KNOWN-TRUE MEMBER FAILING RATHER THAN
  //    CHOSEN** — which is the bar this register's header sets for touching it.
  //    `mengunduh` is the VERB ("downloading"); the copy that shipped used the
  //    NOUN — `'Unduhan format EDI 846 dimulai.'` — so the Indonesian half of a
  //    real, shipped contradiction was UNCONVICTABLE while its English half was
  //    caught by `download (?:starting|started)` one line above. The EN rule
  //    existed and its ID mirror did not, and the asymmetry was invisible because
  //    no probe had ever fired at an ID-only claim. Every control below was re-run
  //    after this line, per the widening note further down.
  /\bunduhan\b[^.]{0,30}\bdimulai\b/i,
  /\b(?:advice|report|file|pdf|snapshot|document)\b[^.]{0,30}\bgenerated\b/i,
  /\b(?:bukti|laporan|berkas|dokumen)\b[^.]{0,30}\bdibuat\b/i,
  // a party was notified
  /\bforwarded to\b/i,
  /\bdispatched to\b/i,
  /\b(?:sent|queued) (?:to|for)\b/i,
  /\bwill notify you\b/i,
  /\bwill receive notification\b/i,
  /\bditeruskan ke\b/i,
  /\bdikirim ke\b/i,
  /\bdiantrikan untuk\b/i,
  /\bakan memberi tahu\b/i,
  /\bmenerima notifikasi\b/i,
  // a record was submitted elsewhere, or a party undertook to act on it
  // ⚠️ `submitted` is bare ON PURPOSE. The narrower `submitted for review`
  // MISSED the retired `submitChangeRequest` copy — "Change request for PO-2201
  // submitted · Paragon team will review." — which is one of the defects this
  // file was commissioned over. Widening was forced by a known-true member
  // failing, not chosen; every control below was re-run after it, because
  // widening manufactures false accusations as readily as narrowing hides
  // findings. The admission register runs AFTER this, so "not submitted" and
  // "tidak ada yang dikirim" still acquit.
  /\bsubmitted\b/i,
  /\bdikirim\b/i,
  /\bwill review\b/i,
  /\bakan meninjau\b/i,
  /\bremoved from catalog\b/i,
  /\bdihapus dari katalog\b/i,
];

/**
 * Phrases that ADMIT the effect did not happen. Superset of `toastHonesty`'s
 * register, because this batch added the storefront's "not saved" shape.
 * ADMISSION WINS: it is checked after the claim, so "nothing was sent to X"
 * acquits even though it contains "sent to".
 */
const ADMISSIONS: readonly RegExp[] = [
  /not available yet/i,
  /future release/i,
  /coming in (?:Phase|a )/i,
  /\(mock\)/i,
  /\(tiruan\)/i,
  /simulated/i,
  /simulasi/i,
  /nothing was/i,
  /nothing changed/i,
  /not wired/i,
  /not saved/i,
  /not submitted/i,
  /not created/i,
  /not removed/i,
  /this view only/i,
  /was not /i,
  /is a preview/i,
  /pending live/i,
  /will send once/i,
  /will open/i,
  /\bno (?:file|pdf|snapshot|advice|escalation ticket|payment|notification)\b[^.]{0,40}\bwas\b/i,
  /nobody was/i,
  /belum tersedia/i,
  /rilis mendatang/i,
  /akan hadir|hadir pada/i,
  /tidak ada/i,
  /tidak disimpan/i,
  /belum tersambung/i,
  /menunggu kanal/i,
  /akan dikirim setelah/i,
  /adalah pratinjau/i,
  /tampilan ini saja/i,
];

const claims = (s: string) => EXTERNAL_CLAIM.some((r) => r.test(s));
const admits = (s: string) => ADMISSIONS.some((r) => r.test(s));

/**
 * ⚠️ **A NEGATED CLAIM IS NOT A CLAIM, AND THIS EXISTS BECAUSE THE PER-STRING
 * RULE BELOW MADE FIVE FALSE ACCUSATIONS ON ITS FIRST RUN — H3 addendum.**
 *
 * `claims()` is a phrase matcher, so `"Message not sent for {{rfq}}"` matches
 * `sent for` and `"Material baru tidak dikirim"` matches `dikirim`. Under the
 * JOINED rule that never surfaced: the sibling description carried an explicit
 * `nothing was sent` / `tidak ada yang dikirim`, so the pair was acquitted.
 * Judged alone, five ALREADY-HONEST titles were convicted — titles whose whole
 * honesty is the word `not` or `tidak` in front of the verb:
 *
 *   BuyerScorecard.tsx:521        Improvement plan **not** sent to {{name}}
 *   BuyerScorecard.tsx:521        Rencana perbaikan **tidak** dikirim ke {{name}}
 *   SupplierMyStorefront.tsx:232  Material baru **tidak** dikirim
 *   SupplierOrders.tsx:335        Permintaan perubahan untuk {{poNumber}} **tidak** dikirim
 *   SupplierRFQs.tsx:844          Message **not** sent for {{rfq}}
 *
 * **Derivation rule 2, on the instrument this batch was tightening**: widening
 * the unit from a pair to a single string manufactured accusations against
 * working copy exactly as readily as the loose rule hid a real defect.
 *
 * ⚠️ **THE REMEDY IS GRAMMAR, NOT A PHRASE LIST, AND THAT DISTINCTION IS THE
 * WHOLE REASON THIS IS DEFENSIBLE.** Adding `not sent` / `tidak dikirim` to
 * `ADMISSIONS` would have fixed these five and nothing else — the next negated
 * verb would fail again, and the register would grow one phrase per incident
 * until it was a word list, which is what `ENF-SEED-LIST-IS-NOT-THE-VOCABULARY-01`
 * is about. Instead: a claim whose match is immediately preceded by a NEGATOR is
 * not a claim. The negator set is eight tokens of EN/ID grammar and closed for
 * the same reason a pronoun list would be — it is a property of the languages,
 * not of this product's copy.
 *
 * ⚠️ **AND IT IS DELIBERATELY EXISTENTIAL, NOT UNIVERSAL: a string still claims
 * if ANY of its matches is un-negated.** `"Nothing was saved, and the supplier
 * was notified"` must stay convicted. Negating one clause does not buy the other.
 *
 * REACH LIMIT, stated: the window is the 16 characters before the match, so a
 * negation separated from its verb by a longer phrase is outside it. That errs
 * toward CONVICTION, which is the safe direction here — a false accusation gets
 * read and argued with, a false acquittal gets filed as green.
 */
const NEGATOR = /\b(?:not|no|never|without|tidak|belum|bukan|tanpa)\b[^.]{0,4}$/i;

const claimsUnnegated = (s: string): boolean =>
  EXTERNAL_CLAIM.some((r) => {
    const re = new RegExp(r.source, r.flags.includes('g') ? r.flags : `${r.flags}g`);
    for (const m of s.matchAll(re)) {
      const before = s.slice(Math.max(0, (m.index ?? 0) - 16), m.index ?? 0);
      if (!NEGATOR.test(before)) return true;
    }
    return false;
  });

const EN = (resources as unknown as Record<string, { translation: Record<string, unknown> }>).en
  .translation;
const ID = (resources as unknown as Record<string, { translation: Record<string, unknown> }>).id
  .translation;

/** The bundle is FLAT-KEYED; a nested-only walk returns nothing for every key. */
const look = (bundle: Record<string, unknown>, key: string): string | undefined => {
  const flat = bundle[key];
  return typeof flat === 'string' ? flat : undefined;
};

function balancedEnd(src: string, from: number): number {
  let depth = 0;
  let seen = false;
  for (let i = from; i < Math.min(src.length, from + 8000); i++) {
    const c = src[i];
    if (c === '(' || c === '{' || c === '[') {
      depth++;
      seen = true;
    } else if (c === ')' || c === '}' || c === ']') {
      depth--;
      if (seen && depth === 0) return i + 1;
    }
  }
  return Math.min(src.length, from + 8000);
}

interface Site {
  readonly at: string;
  readonly fn: string;
  readonly keys: readonly string[];
  readonly en: readonly string[];
  readonly id: readonly string[];
  readonly backed: boolean;
}

/** Toast copy assembled from a template key — recorded, never silently skipped. */
const DYNAMIC_KEYS: string[] = [];

function derive(): Site[] {
  const out: Site[] = [];
  for (const root of ROOTS) {
    for (const file of walk(root)) {
      const raw = readFileSync(file, 'utf8');
      const src = stripSourceComments(raw, 'blank');
      const sf = ts.createSourceFile(file, raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      for (const m of src.matchAll(/\btoast\s*\(/g)) {
        const idx = m.index ?? 0;
        const call = src.slice(idx, balancedEnd(src, idx + m[0].length - 1));
        const line = src.slice(0, idx).split('\n').length;

        let innermost: ts.Node | undefined;
        const find = (n: ts.Node) => {
          if (n.getStart() <= idx && idx < n.getEnd()) {
            innermost = n;
            n.forEachChild(find);
          }
        };
        sf.forEachChild(find);

        // THE UNIT: the innermost enclosing function, whatever it is named.
        let cur: ts.Node | undefined = innermost;
        let fnNode: ts.Node | undefined;
        let fnName = '<anonymous>';
        while (cur) {
          if (
            ts.isArrowFunction(cur) ||
            ts.isFunctionDeclaration(cur) ||
            ts.isFunctionExpression(cur)
          ) {
            fnNode = cur;
            let p: ts.Node | undefined = cur.parent;
            if (p && ts.isJsxExpression(p)) p = p.parent;
            if (p && ts.isVariableDeclaration(p)) fnName = p.name.getText();
            else if (p && ts.isPropertyAssignment(p)) fnName = 'prop:' + p.name.getText();
            else if (p && ts.isJsxAttribute(p)) fnName = 'jsx:' + p.name.getText();
            else if (ts.isFunctionDeclaration(cur) && cur.name) fnName = cur.name.getText();
            break;
          }
          cur = cur.parent;
        }

        // A react-query lifecycle callback is INVOKED BY a dispatch, so its copy
        // is backed by construction. Attributing it to its own body produces a
        // false accusation against the supplier's two primary write paths.
        const lifecycle = /^prop:(?:onSuccess|onError|onSettled|onMutate)$/.test(fnName);
        const body = fnNode ? src.slice(fnNode.getStart(), fnNode.getEnd()) : '';

        if (/t\(\s*`/.test(call)) DYNAMIC_KEYS.push(`${file}:${line}`);
        const keys = [...call.matchAll(/t\(\s*'([^']+)'/g)].map((x) => x[1]);
        out.push({
          at: `${file.slice(file.lastIndexOf('src'))}:${line}`,
          fn: fnName,
          keys,
          en: keys.map((k) => look(EN, k)).filter((s): s is string => typeof s === 'string'),
          id: keys.map((k) => look(ID, k)).filter((s): s is string => typeof s === 'string'),
          backed: lifecycle || NON_SETTER_ACT.test(body),
        });
      }
    }
  }
  return out;
}

const SITES = derive();

/**
 * ⚠️ THE KNOWN-TRUE MEMBERS: the copy this tree REALLY SHIPPED, retired by this
 * batch. The three the review ranked most misleading are named first, as
 * commissioned; the other five were derived, not given.
 */
const RETIRED: readonly { readonly what: string; readonly en: string; readonly id: string }[] = [
  {
    what: 'SupplierPerformance.exportReport — a download that no primitive in src/ can perform',
    en: 'Performance report queued Downloading performance report PDF...',
    id: 'Laporan kinerja dalam antrean Mengunduh PDF laporan kinerja...',
  },
  {
    what: 'BuyerInvoices.sendRemittance — an artefact generated and made available to a supplier',
    en: 'Remittance advice generated Available to the supplier via BankTransfer.',
    id: 'Bukti pembayaran dibuat Tersedia bagi pemasok melalui BankTransfer.',
  },
  {
    what: 'BuyerRisk.sendToWarRoom — a scenario forwarded to procurement leadership',
    en: 'Scenario forwarded to War Room Port congestion dispatched to procurement leadership.',
    id: 'Skenario diteruskan ke War Room Port congestion dikirim ke pimpinan pengadaan.',
  },
  {
    what: 'BuyerInvoices.downloadPdf — a download in progress',
    en: 'Downloading remittance PDF File will be available in a moment.',
    id: 'Mengunduh PDF bukti pembayaran File akan tersedia sebentar lagi.',
  },
  {
    what: 'SupplierMyStorefront.submitNewMaterial — a submission and a 3-day notification promise',
    en: 'New material submitted for review Paragon procurement will notify you within 3 business days.',
    id: 'Material baru dikirim untuk ditinjau Pengadaan Paragon akan memberi tahu Anda dalam 3 hari kerja.',
  },
  {
    what: 'SupplierMyStorefront.removeCatalogItem — a catalog removal that vanishes on reload',
    en: 'Material removed from catalog',
    id: 'Material dihapus dari katalog',
  },
  {
    what: 'SupplierOrders.submitChangeRequest — a change request submitted and reviewed',
    en: 'Change request for PO-2201 submitted Paragon team will review.',
    id: 'Permintaan perubahan untuk PO-2201 dikirim Tim Paragon akan meninjau.',
  },
];

/**
 * ⚠️ **NOT A KNOWN-TRUE MEMBER, AND SAYING SO IS THE POINT.**
 * `BuyerCompliance`'s reminder read *"Reminder queued for {{supplier}} ·
 * Simulated — delivery pending live channel."* Its TITLE asserted a queued
 * notification, but its DESCRIPTION admitted — so this rule ACQUITS it, and
 * this gate would never have fired on it. It was rewritten in the same batch
 * for CONSISTENCY with its identical twin on `BuyerShipments` (same act,
 * already honest), not because it broke the rule.
 *
 * It was listed as a known-true member in the first draft and the probe went
 * RED on it (`admits = true`). Keeping it would have meant loosening the
 * admission register until the measurement agreed with the claim — which is
 * the one move `REIMPLEMENTATION-CONTRADICTS-THE-INSTRUMENT-01` exists to
 * refuse. The instrument was right; the list was wrong.
 */
const ADMITTED_BUT_CHANGED_FOR_CONSISTENCY = {
  en: 'Reminder queued for Sample Aroma Simulated — delivery pending live channel.',
} as const;

/** The replacements, which must be ACQUITTED by the same rule in the same run. */
const REPLACEMENTS: readonly { readonly what: string; readonly en: string; readonly id: string }[] =
  [
    {
      what: 'SupplierPerformance.exportReport',
      en: 'Performance report not available yet No file was generated — performance report export is not wired to a real system.',
      id: 'Laporan kinerja belum tersedia Tidak ada berkas yang dibuat — ekspor laporan kinerja belum tersambung ke sistem nyata.',
    },
    {
      what: 'BuyerInvoices.sendRemittance',
      en: 'Remittance advice not available yet Nothing was generated and nothing was sent to the supplier via BankTransfer.',
      id: 'Bukti pembayaran belum tersedia Tidak ada yang dibuat dan tidak ada yang dikirim ke pemasok melalui BankTransfer.',
    },
    {
      what: 'BuyerRisk.sendToWarRoom',
      en: 'War Room escalation not available yet Nothing was forwarded — Port congestion was not sent to procurement leadership.',
      id: 'Eskalasi War Room belum tersedia Tidak ada yang diteruskan — Port congestion tidak dikirim ke pimpinan pengadaan.',
    },
    {
      what: 'SupplierMyStorefront.removeCatalogItem',
      en: 'Material removed from this view only — not saved, storefront editing is not wired to a real store.',
      id: 'Material dihapus dari tampilan ini saja — tidak disimpan, penyuntingan etalase belum tersambung ke penyimpanan nyata.',
    },
  ];

/**
 * ⚠️ THE KNOWN-FALSE CONTROL THAT MATTERS MOST: a success toast that really IS
 * backed. It claims a notified party in plain words and must NOT be convicted,
 * because a real dispatch produced it. A rule that reddens this one would push
 * the supplier's primary write paths into apologising for work they did.
 */
const BACKED_SUCCESS = {
  what: "SupplierOrders acknowledge — fired from a mutation's onSuccess",
  en: 'Purchase order acknowledged PO-2201 was sent to Paragon.',
};

describe('external-claim honesty guard (H2)', () => {
  it('the derivation examined something — a non-empty population', () => {
    expect(SITES.length).toBeGreaterThan(100);
    // and it reached BOTH trees, which is hole 3
    expect(SITES.some((s) => s.at.includes('components'))).toBe(true);
    expect(SITES.some((s) => s.at.includes('pages-v2'))).toBe(true);
  });

  it('the claim matcher matches something LIVE — an inert rule reads green', () => {
    const matched = SITES.filter((s) => [...s.en, ...s.id].some(claims));
    expect(matched.length).toBeGreaterThan(0);
  });

  it('the admission register acquits something LIVE — likewise', () => {
    const matched = SITES.filter((s) => [...s.en, ...s.id].some(admits));
    expect(matched.length).toBeGreaterThan(0);
  });

  it('no live toast claims an external effect without a non-setter act or an admission', () => {
    // ⚠️ **EACH LOCALE IS JUDGED ALONE, AND THE FIRST DRAFT DID NOT.** It joined
    // EN and ID into one string, so ONE LOCALE'S ADMISSION ACQUITTED THE OTHER
    // LOCALE'S CLAIM — #352's "a sibling branch's honesty acquits this one",
    // transplanted from branches onto locales. Measured: the mutation probe
    // restored the false EN copy and this suite stayed GREEN, because the ID
    // copy still said "belum tersedia". A reader sees one locale at a time.
    const offenders = SITES.filter((s) => {
      if (s.backed) return false;
      return (['en', 'id'] as const).some((loc) => {
        const copy = s[loc];
        if (copy.length === 0) return false;
        const whole = copy.join(' ');
        return claims(whole) && !admits(whole);
      });
    });
    expect(
      offenders.map((o) => `${o.at} (${o.fn}) :: ${o.en.join(' / ')}`),
      'A toast claims a file, a notification or a stored record that no non-setter act produced, and its copy does not admit it.',
    ).toEqual([]);
  });

  /**
   * ⚠️ **THE HOLE ABOVE, AND IT IS THE SAME DEFECT ONE LEVEL DOWN — H3 addendum.**
   *
   * The assertion above judges each LOCALE alone, and its own comment explains
   * why: joining EN and ID let one locale's admission acquit the other's claim.
   * **It then joins TITLE and DESCRIPTION**, so an admission in the TITLE acquits
   * a claim in the BODY — the identical mechanism, one nesting level in, written
   * by the batch that had just named it.
   *
   * **MEASURED, NOT HYPOTHESISED — the tree shipped one.**
   * `supplierInventory.toast.exportPreparing` read, in EN:
   *
   *   title: 'EDI export not available yet — no file was generated.'
   *   desc:  'EDI 846 format download starting.'
   *
   * and in ID the same shape (`belum tersedia` over `Unduhan format EDI 846
   * dimulai.`). The title admits; the body says a download is starting. A reader
   * gets both at once in one toast, and the sentence that is WRONG is the
   * specific one — "download starting" is what a person acts on, and the honest
   * headline above it reads as a label rather than a correction.
   *
   * ⚠️ **AND THIS IS THE DANGEROUS DIRECTION, WHICH IS WHY IT IS A SEPARATE
   * ASSERTION RATHER THAN A TIGHTENING OF THE ONE ABOVE.** The joined rule errs
   * toward ACQUITTAL, and an acquittal terminates the investigation
   * (`SILENT-PESSIMISM-TERMINATES-THE-INVESTIGATION-01` — the axis is whichever
   * direction stops you looking). A site that has been through this guard and
   * come out green is a site nobody reads again.
   *
   * ⚠️ **THE COUNTER-RISK IS REAL AND IS WHY THE RULE IS EXACTLY THIS AND NOT
   * "EVERY STRING MUST ADMIT".** A title is often a bare noun phrase that claims
   * nothing at all and needs no admission; requiring one everywhere would redden
   * dozens of honest sites and teach the next batch to paste `not available yet`
   * into headings. So the unit is: **a string that CLAIMS must ITSELF admit.** A
   * string that claims nothing is judged by nothing, exactly as before.
   */
  it('⚠️ no SINGLE string claims an external effect while only its SIBLING admits', () => {
    const offenders: string[] = [];
    for (const s of SITES) {
      if (s.backed) continue;
      for (const loc of ['en', 'id'] as const) {
        for (const one of s[loc]) {
          if (claimsUnnegated(one) && !admits(one))
            offenders.push(`${s.at} (${s.fn}) [${loc}] :: ${one}`);
        }
      }
    }
    expect(
      offenders,
      'This string claims a file, a notification or a stored record on its own. A sibling string in ' +
        'the same toast admitting it is not enough: the reader is handed both, and this is the one ' +
        'they act on.',
    ).toEqual([]);
  });

  /**
   * ⚠️ `PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01` for the assertion above, and it must
   * be its own probe because `RETIRED`'s members are stored PRE-JOINED (title and
   * body in one string), which is precisely the shape the per-string rule cannot
   * be tested by. This is the EDI copy as `main` carried it at `81c9840`, kept as
   * two strings because two strings is the whole point.
   *
   * The bilateral half runs in the same test: the SAME title with a body that
   * admits — which is what shipped after H3 — must be acquitted, so a green
   * reading proves the rule discriminates rather than that it is inert.
   */
  it('KNOWN-TRUE — the EDI 846 title/body contradiction shipped at 81c9840 is convicted', () => {
    const title = 'EDI export not available yet — no file was generated.';
    const bodyThen = 'EDI 846 format download starting.';
    const bodyNow = 'No EDI 846 file was produced — the EDI export seam is not wired to a real system.';
    const idTitle = 'Ekspor EDI belum tersedia — tidak ada berkas yang dibuat.';
    const idBodyThen = 'Unduhan format EDI 846 dimulai.';
    const idBodyNow =
      'Tidak ada berkas EDI 846 yang dibuat — sambungan ekspor EDI belum tersambung ke sistem nyata.';

    // the title admitted all along, in both locales
    expect(admits(title)).toBe(true);
    expect(admits(idTitle)).toBe(true);

    // ⚠️ THE OLD RULE ACQUITTED THE PAIR — stated as a measurement, because a
    //    gap nobody demonstrates is a gap nobody believes.
    expect(claims([title, bodyThen].join(' ')) && !admits([title, bodyThen].join(' '))).toBe(false);

    // the NEW rule convicts the body on its own …
    expect(claimsUnnegated(bodyThen) && !admits(bodyThen), 'EN body must be convicted alone').toBe(
      true,
    );
    expect(
      claimsUnnegated(idBodyThen) && !admits(idBodyThen),
      'ID body must be convicted alone',
    ).toBe(true);

    // … and ACQUITS the copy that replaced it, which is the half that shows the
    // rule discriminates instead of simply demanding an admission everywhere.
    expect(
      claimsUnnegated(bodyNow) && !admits(bodyNow),
      'the shipped EN replacement must be acquitted',
    ).toBe(false);
    expect(
      claimsUnnegated(idBodyNow) && !admits(idBodyNow),
      'the shipped ID replacement must be acquitted',
    ).toBe(false);
  });

  it.each(RETIRED.map((r) => [r.what, r] as const))(
    'KNOWN-TRUE — the retired copy is convicted: %s',
    (_what, r) => {
      expect(claims(r.en), `EN claimed nothing: ${r.en}`).toBe(true);
      expect(admits(r.en), `EN already admitted: ${r.en}`).toBe(false);
      expect(claims(r.id), `ID claimed nothing: ${r.id}`).toBe(true);
      expect(admits(r.id), `ID already admitted: ${r.id}`).toBe(false);
    },
  );

  it.each(REPLACEMENTS.map((r) => [r.what, r] as const))(
    'KNOWN-FALSE — the replacement is acquitted: %s',
    (_what, r) => {
      expect(admits(r.en), `EN does not admit: ${r.en}`).toBe(true);
      expect(admits(r.id), `ID does not admit: ${r.id}`).toBe(true);
    },
  );

  it('KNOWN-FALSE — a genuinely backed success toast is never convicted', () => {
    // it DOES claim, in plain words…
    expect(claims(BACKED_SUCCESS.en)).toBe(true);
    // …and the rule still acquits it, because a real dispatch co-executes.
    const backedSite: Site = {
      at: 'synthetic',
      fn: 'prop:onSuccess',
      keys: [],
      en: [BACKED_SUCCESS.en],
      id: [],
      backed: true,
    };
    const convicted =
      !backedSite.backed && claims(backedSite.en.join(' ')) && !admits(backedSite.en.join(' '));
    expect(convicted).toBe(false);
  });

  it('the compliance reminder is acquitted — it admitted before this batch touched it', () => {
    // Pinned so the demotion above is a measurement rather than a paragraph.
    expect(claims(ADMITTED_BUT_CHANGED_FOR_CONSISTENCY.en)).toBe(true);
    expect(admits(ADMITTED_BUT_CHANGED_FOR_CONSISTENCY.en)).toBe(true);
  });

  it('copy built from a template key is RECORDED, not silently skipped', () => {
    // The reach limit is honest; silence about the FACT of it is not.
    expect(Array.isArray(DYNAMIC_KEYS)).toBe(true);
    for (const at of DYNAMIC_KEYS) expect(at).toMatch(/\.tsx:\d+$/);
  });
});
