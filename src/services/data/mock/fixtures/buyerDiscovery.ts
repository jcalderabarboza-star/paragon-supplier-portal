// ────────────────────────────────────────────────────────────────────────────
// Buyer discovery / marketplace fixtures.
//
// Relocated from src/pages-v2/BuyerDiscovery.tsx in Phase 1B Batch 2.
// External marketplace entities (global suppliers, recommendations,
// qualification pipeline, market intel, single-source gaps) — not scoped
// to a single supplier; the IDs are marketplace IDs, not internal sup-* IDs.
//
// ── ⚠️ `validatedBy` IS DELETED — `DISCOVERY-ENDORSEMENT-01` ────────────────
//   Eight rows each carried a list of named corporations asserted to have vetted
//   the supplier. Deleted outright, not renamed to invented brands: a fabricated
//   endorsement stays fabricated when the endorser is made up, and the same page
//   already deleted (rather than relabelled) its invented market-intel source
//   attributions.
//
// ── ⚠️ `GLOBAL_SUPPLIERS` IS DELETED — `DISCOVERY-REAL-SUBJECTS-01`, batch C ─
//   Eight rows named eight REAL trading corporations and hung on each a
//   `matchScore`, an employee count, a founding year, a certifications list and
//   a superlative description. **NOBODY COMPUTED 96.** There is no matching
//   engine, no weights and no inputs behind any of those scores — so the row was
//   not a useful claim that happened to be unverified, it was a CONVINCING one.
//
//   Deleted rather than substituted (operator ruling, Option 4). Substituting
//   spends a batch making a fabrication SAFE; deleting the read and gating the
//   surface on a real feed makes it UNREACHABLE. Real candidate names can now
//   only ever arrive FROM A SOURCE — the same discipline as `UNDETERMINED` and
//   `FX_UNPINNED`, where the honest state is the default and the real value
//   requires a real feed. `supplierDiscovery` is registered in `HARVEST_GATED`
//   (LIVENESS-DATASOURCE-01), so the search tab renders an honest empty state
//   naming WHY it is empty until a discovery feed lands.
//
//   The rows below survive because they are about PARAGON'S OWN sourcing —
//   its single-source concentration, its qualification pipeline, its category
//   market view — and they take batch A's treatment: fictional subjects,
//   assessments intact.
// ────────────────────────────────────────────────────────────────────────────

import type {
  RecommendedSupplier,
  QualificationItem,
  MarketIntelCard,
  SingleSourceItem,
} from '../../types';

// ── THE GAP CONSOLE — the reason the page survives the deletion ──────────────
//   This table is about PARAGON'S OWN sourcing concentration, not about anyone
//   else's company: which of its materials have exactly one qualified source,
//   and what it would take to dual-source them. That is genuinely useful AND
//   genuinely honest, which is why it now leads the page.
//
//   `material` names were the last real-party residue on this page: a real
//   fragrance house's name inside a material identity, held out as batch B's
//   relocation case. B TOOK THEM, and took them FIRST — by then the trademark was
//   the single most conspicuous string on the page, sitting in this table
//   surrounded by `Sample …`. The deletion made it visible, which is the argument
//   for doing the conspicuous half early rather than last.
//
//   `risk: 'High — quality issues + single source'` on the Panthenol row is gone
//   with the real subject it described. It never rendered (only `riskLevel` does),
//   and it was the worst sentence in the file.
export const SINGLE_SOURCE: SingleSourceItem[] = [
  { material: 'Sample Floral Accord FG-2847', category: 'Fragrance',
    currentSupplier: 'Sample Fragrance House DE', riskLevel: 'Critical',
    risk: 'Critical — Suez disruption',
    suggestedAlternatives: ['PT Sample Aroma ID', 'PT Sample Essential Oils ID'] },
  { material: 'Hyaluronic Acid HA-100', category: 'Active Ingredient',
    currentSupplier: 'Sample Specialty FR', riskLevel: 'High',
    risk: 'High — single EU source',
    suggestedAlternatives: ['Sample Vitamins CN', 'Sample Biotechnology CN'] },
  { material: 'Panthenol B5 USP', category: 'Active Ingredient',
    currentSupplier: 'Sample Personal Care DE', riskLevel: 'High',
    risk: 'High — single source',
    suggestedAlternatives: ['Sample Nutritional SG', 'Sample Distribution MY'] },
  { material: 'Centella Asiatica Extract 10:1', category: 'Natural Botanical',
    currentSupplier: 'PT Sample Oleochemicals ID', riskLevel: 'Medium',
    risk: 'Medium — single local source',
    suggestedAlternatives: ['PT Sample Aroma ID', 'Sample Botanical Extracts CN'] },
  { material: 'Salicylic Acid USP', category: 'Active Ingredient',
    currentSupplier: 'Not yet sourced', riskLevel: 'Critical',
    risk: 'Critical — no qualified supplier',
    suggestedAlternatives: ['Sample Salicylics CN', 'Sample Fine Chemicals FR'] },
];

// ── ⚠️ ONE B-FENCE CALL TAKEN HERE, AND IT IS REPORTED ──────────────────────
//   `mkt-003`'s `whyRecommended` named FOUR real speciality-chemical companies
//   as lines it distributes — not re-listed here, for the reason PF-2a's header
//   describes its deleted endorsers instead of repeating them. It is one of batch
//   B's three RELOCATION cases, because those four sit in the OBJECT position.
//
//   Renaming only the SUBJECT and leaving that clause would have manufactured
//   `A`'s fourth relocation case a second time, knowingly: a FICTIONAL
//   distributor asserted to carry four REAL companies' products — a claim of a
//   kind that did not exist before the fix (§13b). The operator accelerated B's
//   material trademarks for exactly that reason; the same reason applies to the
//   same shape here, so the clause is generalised rather than left to
//   manufacture the defect for however long B takes. Flagged for overturn.
export const RECOMMENDED: RecommendedSupplier[] = [
  { id: 'mkt-001', name: 'PT Sample Aroma', country: 'Indonesia', flag: '🇮🇩',
    matchScore: 94,
    whyRecommended: 'Indonesian fragrance specialist. BPJPH halal certified. Supplies major local FMCG brands. Would reduce Suez Canal exposure for fragrance compounds. Lead time 7 days vs. 35 days from European suppliers.',
    covers: 'Sample Floral Accord gap + Centella gap',
    storefrontPath: '/marketplace/supplier/mkt-001' },
  { id: 'mkt-003', name: 'Sample Distribution Malaysia', country: 'Malaysia', flag: '🇲🇾',
    matchScore: 88,
    whyRecommended: 'Global ingredient distributor with Malaysia hub. Carries multiple European speciality-chemical lines across SEA. JAKIM halal certified. Would provide single-point access to multiple European ingredient brands without Suez Canal risk.',
    covers: 'Hyaluronic Acid gap + Panthenol B5 gap',
    storefrontPath: '/marketplace/supplier/mkt-003' },
  { id: 'mkt-004', name: 'Sample Salicylics China', country: 'China', flag: '🇨🇳',
    matchScore: 79,
    whyRecommended: 'Specialist BHA/salicylic acid manufacturer. GMP certified. Supplies Korean and Japanese beauty brands. Halal certification pending — recommend requesting BPJPH application as qualification condition.',
    covers: 'Salicylic Acid — no current supplier',
    riskNote: 'Halal certification not yet obtained. Add as qualification requirement.',
    storefrontPath: '/marketplace/supplier/mkt-004' },
];

export const QUALIFICATIONS: QualificationItem[] = [
  { supplier: 'PT Sample Aroma', flag: '🇮🇩', stage: 2, stageName: 'Document Review',
    stageTotal: 5, startDate: '2026-03-15', owner: 'Procurement Team',
    nextAction: 'Upload BPJPH certificate', dueDate: '2026-04-15', status: 'On Track' },
  { supplier: 'Sample Distribution MY', flag: '🇲🇾', stage: 1, stageName: 'Initial Contact',
    stageTotal: 5, startDate: '2026-04-01', owner: 'Procurement Team',
    nextAction: 'Schedule capability call', dueDate: '2026-04-12', status: 'On Track' },
  { supplier: 'Sample Salicylics CN', flag: '🇨🇳', stage: 1, stageName: 'Initial Contact',
    stageTotal: 5, startDate: '2026-04-03', owner: 'Procurement Team',
    nextAction: 'Request halal cert application confirmation', dueDate: '2026-04-17', status: 'At Risk' },
  { supplier: 'Sample Biotechnology CN', flag: '🇨🇳', stage: 3, stageName: 'Technical Evaluation',
    stageTotal: 5, startDate: '2026-02-20', owner: 'Quality Team',
    nextAction: 'Receive sample batch results', dueDate: '2026-04-10', status: 'On Track' },
];

export const MARKET_INTEL: MarketIntelCard[] = [
  { category: 'Fragrance Compounds', marketStatus: 'Tight supply — high demand from Asian markets',
    suppliersGlobal: 12, suppliersParagon: 3, priceDir: 'up',
    priceTrend: '+2.1% this month',
    recommendation: 'Expand Indonesian supplier base to reduce European dependency.' },
  { category: 'Active Ingredients (Vitamins)', marketStatus: 'Oversupply from China — favorable pricing',
    suppliersGlobal: 45, suppliersParagon: 2, priceDir: 'down',
    priceTrend: '-3.2%',
    recommendation: 'Good time to negotiate long-term contracts with Chinese suppliers.' },
  { category: 'Packaging (PET)', marketStatus: 'Stable — moderate demand',
    suppliersGlobal: 89, suppliersParagon: 3, priceDir: 'flat',
    priceTrend: '+1.2%',
    recommendation: 'Evaluate sustainable/recycled PET alternatives for Paragon ESG goals.' },
  { category: 'Halal Emulsifiers', marketStatus: 'Growing supply — Indonesian producers expanding',
    suppliersGlobal: 28, suppliersParagon: 4, priceDir: 'down',
    priceTrend: '-1.5%',
    recommendation: 'Strong Indonesian supplier base — consider expanding VMI arrangements.' },
];
