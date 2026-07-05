# Halal Compliance Enforcement — Control Design (CMVE)

**Document type:** Control design specification — the process the software automates
**Project:** Ops Project #11 — Global Supplier Portal Platform (Paragon Odyssey) · Track R (CMVE)
**Audience:** R&D (cert owner), Procurement (enforcement), Compliance/Regulatory (evidence owner), Steering Committee
**Date:** 2026-07-03
**Status:** v1 — DRAFT for alignment. Designed from regulatory best practice, not from an existing process. Establishes the control R&D + Procurement + Compliance execute; the CMVE software later automates it. Roles not names throughout.

> **Why this document exists.** There is no confirmed systematic halal-expiry escalation process running today: R&D owns certificate compliance for product development, and the wider organization contributes, but no verified 180/90/60/30/7-day ladder or enforced procurement block exists. Track R therefore does not digitize an existing process — it **builds the control from scratch, correctly.** This document defines that control in plain process terms first, so the three functions align on *what* they execute before any software automates it. The deadline is real: **17 October 2026** (GR 42/2024, BPJPH; sanctions escalate to product recall) — *date to be confirmed against the regulation text, 17 vs 18 Oct.*

---

## 1. The control in one sentence

**Paragon does not procure non-halal-certified critical materials for mandatory-halal brands, and can prove — with an auditable evidence trail — that this control operated continuously.**

Everything below serves that sentence. A regulator does not reward good intentions; it rewards a *demonstrable control*: a real registry of what is certified, a real process that acts before certificates lapse, a real block at the point of purchase, and a real record that all of it happened.

---

## 2. What the regulation actually requires of Paragon

- **Scope:** cosmetics for mandatory-halal brands must use halal-certified/halal-assured materials. Paragon operates a Halal Assurance System (SJPH) as the umbrella obligation.
- **The exposure runs through the supply chain:** the risk is procuring a critical material whose halal certificate is expired, missing, or invalid, and using it in a mandatory-halal product.
- **The sanction regime escalates:** written warning → administrative fine → product withdrawal/recall. The cost of a single recall or a blocked production run dwarfs the entire cost of building this control.
- **The defensible position** is not "we intended to comply" but "here is the registry, here is the escalation record, here is the block that fired, here is the audit trail." **Evidence is the deliverable.**

---

## 3. The three-role operating model (who does what)

The control only works if ownership is unambiguous. Three roles, one shared registry.

| Role | Owns | In the control |
|---|---|---|
| **R&D (Certificate Owner)** | Which materials are halal-critical, for which brands, and what certifies them | Defines the critical-material list; validates that a certificate genuinely covers the material and scope; is the authority on "is this material compliant." The registry's *content authority*. |
| **Procurement (Enforcement Owner)** | Purchase orders and supplier relationships | Acts on the daily blocklist: does not raise/approve POs for blocklisted supplier-material pairs; chases suppliers on renewals; the *enforcement authority* at the point of purchase. |
| **Compliance / Regulatory (Evidence Owner)** | The regulatory relationship and the audit posture | Owns the evidence pack, the SOP sign-off, the escalation-policy definition, and the steering-committee reporting. The *audit authority*. |

**The shared artifact all three read:** the **certificate registry** — one authoritative source of supplier × material × certificate × expiry × status. Today it does not exist as a system; it is built in the harvest (Section 6).

---

## 4. The escalation ladder (the process the scheduler automates)

A time-based ladder that acts *before* a certificate lapses, because supplier renewal is slow — halal recertification via an LPH audit runs **months, not weeks**, so a warning at expiry is already too late.

| Tier | Trigger (days to expiry) | Action | Owner |
|---|---|---|---|
| **T-180** | 180 days | Notify supplier + R&D: renewal must begin now (LPH audit lead time). Log. | Procurement notifies; R&D aware |
| **T-90** | 90 days | Escalate: formal renewal request to supplier; flag in procurement review. Log. | Procurement |
| **T-60** | 60 days | Warning: supplier renewal status must be confirmed; if no credible renewal in progress, pre-position alternative sourcing. Log. | Procurement + R&D |
| **T-30** | 30 days | Critical: supplier-material pair enters *pre-block watch*; procurement leadership notified. Log. | Procurement leadership |
| **T-7** | 7 days | Final: pair will be blocklisted at expiry unless a valid renewed certificate is registered. Log. | Procurement leadership + Compliance |
| **BLOCKED** | expired / missing | Pair on the authoritative daily blocklist. No PO may be raised/approved. Log. | Enforcement (Section 5) |

**Design rules:**
- **Edge-triggered, once per tier per certificate** — a certificate entered late fires only its *current* tier once, never the whole missed history.
- **The ladder is data, not code** — the tier definitions are a declarative table, so they can be adjusted (and, later, authored in the Flow Builder) without a rebuild.
- **All timing in Asia/Jakarta**, evaluated daily.
- **Channels:** WhatsApp (supplier's real channel, Bahasa) + email fallback. Every send recorded — *delivered*, not just *sent* — because the evidence pack needs proof of delivery.

---

## 5. The enforcement joint (the block that makes it real)

The ladder warns; the **block** enforces. The block must land at the **real point of purchase — SAP S/4HANA PO creation**, not in a prototype. Three honest options, in order of strength:

- **Target — SAP-side technical block.** A check at PO creation (BAdI / user-exit / release-strategy) against the authoritative daily blocklist. A blocklisted supplier-material pair either **fails at creation** (hard stop) or **creates-and-holds** (soft stop, preserves supply continuity). *Hold-vs-fail is a Procurement leadership business decision*, not a technical one — the trade-off is control strictness vs. supply continuity.
- **Guaranteed floor — procedural enforcement.** A **signed SOP** forbidding PO creation for blocklisted pairs + **daily blocklist distribution** to procurement + **weekly compliance report** from the audit trail. A registry + enforced SOP + evidence *is* a real, defensible control — it is what carries the deadline if the SAP-side block is not ready.
- **Rejected — portal-side block.** POs are not created in the portal, so a portal block enforces nothing real by October.

**Decision posture:** procedural floor is the **guaranteed** deadline answer; SAP-side technical block is the **target in flight**. The deadline never hangs on the SAP team's change calendar alone.

**Open dependency (surface now):** the SAP-side block requires the SAP/BASIS team — an actor outside the build team, with its own change calendar. The first question to them is not "build a block" but **"can an MM PO-create change land before the deadline at all?"** — because the answer decides whether the procedural floor is fallback or primary.

---

## 6. The registry harvest (the long pole — starts now)

The control is only as real as its data. The registry content — **which suppliers, which materials, which certificates, which expiry dates** — is a weeks-long business effort with supplier back-and-forth. **No software unblocks it; only starting it does.** Every week it slips, the block window inherits suppliers who can no longer renew in time.

- **Content authority:** R&D defines the halal-critical materials and validates certificate scope. Procurement supplies supplier + PO context. Compliance owns the evidence standard.
- **Seed from SAP where possible:** supplier master (business partner) and material master already exist in S/4HANA — extract them so the harvest starts from real data, not a blank sheet. (Certificate + expiry data is the net-new part suppliers must provide.)
- **Verification is manual:** the national halal system (SIHALAL) has **no public verification API** — confirming a certificate is a manual portal lookup. So `verificationStatus` is a human-attested field with an evidence link; budget the procurement/R&D hours for it. Any automation is a later bonus, never a dependency.
- **The harvest schema** (one row per supplier × material × certificate) is the ready-to-fill instrument — see the companion harvest pack.

---

## 7. The evidence trail (the deliverable to the regulator)

Every action in the control is logged to an **append-only, tamper-evident audit trail** (7-year retention, WORM). This trail *is* the steering-committee compliance report and the auditor's evidence pack: registry coverage, escalations sent (and delivered), exceptions, blocklist state over time, and each block that fired. **Validate with Compliance/Legal early what evidence the steering committee and any auditor will actually accept** — "defensible control" is judged by them, not by the build team.

---

## 8. The human process behind the automation (do not skip)

Software sends the reminders and produces the blocklist. **Humans act on the exceptions**, and that workflow must exist explicitly:
- **Who reads the blocklist daily** (named Procurement owner).
- **What happens** when a supplier is unresponsive, a document is rejected, or an expiry falls inside the block window (escalation path to Procurement leadership + Compliance).
- **Who signs off** the weekly evidence report (Compliance).

The blocklist is only a control if a named human enforces it every day. This process is designed now, not discovered in October.

---

## 9. Why this is a platform capability, not a spreadsheet

A spreadsheet can hold the registry v0 (and should, this week). But the *control* — daily evaluation, multi-channel escalation with delivery proof, an authoritative blocklist feeding SAP, and a tamper-evident audit trail — is what makes it defensible and durable. Built on Paragon's own platform (Jakarta-resident, UU PDP-clean, SAP-integrated), it is a capability no source-to-pay vendor offers: **halal-native compliance enforcement.** It is the single clearest proof of the build-over-buy thesis — *systems bend to Paragon, not the other way around* — and Paragon will have it live before the deadline.

---

## 10. Open decisions & risks (surface, don't bury)

| # | Item | Owner | Note |
|---|---|---|---|
| 1 | **Deadline date 17 vs 18 Oct** | Compliance | Confirm against regulation text before any supplier-facing artifact cites it |
| 2 | **Hold-vs-fail at SAP PO create** | Procurement leadership | Control strictness vs. supply continuity — a business decision |
| 3 | **Can an SAP MM block land before the deadline?** | VP → SAP/BASIS | Decides procedural-floor-as-fallback vs. as-primary |
| 4 | **Evidence-pack acceptability** | Compliance/Legal | Confirm what the steering committee/auditor will accept |
| 5 | **Harvest staffing** | R&D + Procurement | Manual SIHALAL verification = real people-hours; confirm capacity |
| 6 | **Critical-material list scope** | R&D | Which materials/brands are in scope defines the whole registry denominator |
| 7 | **DPO appointment + supplier consent** | Legal/Compliance | Required before real supplier data; ~10-week clock (UU PDP) |

---

*End of Control Design v1. This is the process; the CMVE software automates it. Align R&D + Procurement + Compliance on this control, open the harvest, and confirm the seven decisions. Roles not names; the evidence trail is the deliverable; the deadline is real.*
