# Track R — Status Register (Halal Compliance — a normal, de-pressurized capability)

**Purpose:** dated, verifiable log of Track R mobilization (R0) and execution (R1–R3). Addresses Review v2 BLOCKER F2-17: canon must distinguish "proceeding" from "not started." The operator updates entries with dates; stale entries signal operational pace.

**Framing (realigned 2026-07-15):** Track R is a **NORMAL capability — de-pressurized, on equal footing with every other lane**. **No external deadline gates the platform build.** The platform's job is to MODEL the full compliance flow well, switchable on whenever (this year or next); certification is handled manually by the compliance team, and switch-on timing is operational, not a build gate. The register below tracks operator-side mobilization state — stale entries signal operational pace, not a missed deadline. The compliance DESIGN (I3 machine, honest SIMULATED surface, two-gate flip harness) STANDS in full.

**Last update:** 2026-07-06 (register); framing de-pressurized 2026-07-15.

---

## R0 — Mobilization items (business lane, operator-owned)

| ID | Item | Status | Last update | Notes |
|----|------|--------|-------------|-------|
| R0.1 | Certificate harvest — registry v0 populated (schema: Plan v2.1 Part H) | NOT STARTED | 2026-07-06 | THE long pole. No technical mitigation. Blocks R1.1/R1.2/R1.3/R2 coverage gate. |
| R0.2 | 90-day renewal wave sent to expiring/missing suppliers | NOT STARTED | 2026-07-06 | Depends on R0.1 content. |
| R0.3 | WABA templates submitted (360dialog / Meta verification) | NOT STARTED | 2026-07-06 | Templates link to static how-to-renew content (v2.2 Step 5.7). Fallback: AWS SES Jakarta (API only). |
| R0.4 | X-1 AWS ap-southeast-3 account/escalation filed | NOT STARTED | 2026-07-06 | File NOW per v2.2 Step 5.3. Local-first (docker-compose) insulates build; delay costs deploy time only. |
| R0.5 | CMVE repo bootstrapped (local-first scaffold) | NOT STARTED | 2026-07-06 | Track-S zero-week pre-declared for scaffold week (v2.2 Step 5.4). |

## D — Decisions / answers needed (operator conversations)

| ID | Question | Status | Last update | Answer / owner role |
|----|----------|--------|-------------|---------------------|
| D-CAL | Does a 180/90 renewal ladder run today? Who owns it? Who operates the portal's Remind loop + escalation chain? | OPEN — operator input (non-blocking) | 2026-07-06 | — |
| D-STAFF | Who staffs the harvest + manual SIHALAL verification (no public API)? | OPEN — operator input (non-blocking) | 2026-07-06 | — |
| D-SAP | BASIS session booked: "can an MM PO-create change land before the deadline at all?" | OPEN | 2026-07-06 | — |
| D-DPO | DPO process clock (~10 weeks) opened? | OPEN | 2026-07-06 | — |
| D-SSO / D-SEC | IT security thread — SSO + security questions carried in operator reply | OPEN | 2026-07-06 | — |
| DR-11 | Magic-link elevation into R1.4 core (chat recommends: elevate) | OPEN — rule at R1 kickoff | 2026-07-06 | Operator ruling |

## R1 — Thin real slice (CMVE, Jakarta-resident; ~mid-Jul → ~mid-Aug)

| ID | Item | Status | Last update |
|----|------|--------|-------------|
| R1.pre | ComplianceRegistryEntry DTO v2 designed (supersedes ComplianceRow — deprecated-at-birth; restores v1.1 reconciliation instruction) | NOT STARTED | 2026-07-06 |
| R1.0 | Infra: local-first docker-compose, CI contract lane | NOT STARTED | 2026-07-06 |
| R1.1 | Registry service + store (imports harvest) | NOT STARTED | 2026-07-06 |
| R1.2 | 180/90 ladder engine (computes from expiry dates daily — clock-states never stored) | NOT STARTED | 2026-07-06 |
| R1.3 | Blocklist (expired/missing required certs) | NOT STARTED | 2026-07-06 |
| R1.4 | Intake (procurement-mediated floor; magic-link per DR-11) | NOT STARTED | 2026-07-06 |
| R1.5 | Contract tests on the portal seam (DTO v2 projection) | NOT STARTED | 2026-07-06 |

## Log (append-only, newest first)

- **2026-07-15** — **Strategic realignment: Track R de-pressurized to a NORMAL capability.** No external deadline gates the platform build; certification is handled manually by the compliance team; the platform's job is to model the full compliance flow, switch-on timing operational. Deadline/urgency/tripwire framing retired from the standing canon (this register + CLAUDE.md + World-Class Build Plan §7). The compliance DESIGN is untouched and STANDS. The register remains a useful operator-side mobilization log.
- **2026-07-06** — Register created per Build Plan v2.2 Step 5.1. All items initialized. D-CAL + D-STAFF flagged as that week's priority. (Historical entry — see the 2026-07-15 de-pressurization above.)
