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
//   attributions. See the note on `GlobalSupplier` in `services/data/types.ts`.
//
// ── ⚠️ THE COMPANIES NAMED HERE ARE REAL, AND THAT IS FILED, NOT FIXED ──────
//   `DISCOVERY-REAL-SUBJECTS-01` (OPEN). Every `name` below is a real, trading
//   corporation, and each carries fabricated attributes — `matchScore`,
//   `description` superlatives, qualification and risk rows. The endorsement
//   ruling was written as *real brands vetting fictional suppliers*; the fixture
//   says otherwise, so the objects are real too. Widening the remedy to the
//   supplier identities is an operator ruling and is NOT taken here.
// ────────────────────────────────────────────────────────────────────────────

import type {
  GlobalSupplier,
  RecommendedSupplier,
  QualificationItem,
  MarketIntelCard,
  SingleSourceItem,
} from '../../types';

export const GLOBAL_SUPPLIERS: GlobalSupplier[] = [
  {
    id: 'gs-001', name: 'Givaudan SA', country: 'Switzerland', flag: '🇨🇭', region: 'Europe',
    categories: ['Fragrance', 'Flavor', 'Active Ingredient'],
    certifications: ['ISO 9001', 'ISO 14001', 'Halal MUI', 'COSMOS', 'RSPO'],
    matchScore: 96, employees: '16,000+', founded: '1895',
    description: "World's largest fragrance and flavor company. Supplies to all major global beauty brands. Strong halal portfolio with dedicated Islamic certification team.",
    halalCertified: true, alreadyInNetwork: true,
  },
  {
    id: 'gs-002', name: 'DSM-Firmenich', country: 'Netherlands', flag: '🇳🇱', region: 'Europe',
    categories: ['Active Ingredient', 'Fragrance', 'Vitamin'],
    certifications: ['ISO 9001', 'GMP', 'Halal JAKIM', 'COSMOS Organic'],
    matchScore: 91, employees: '28,000+', founded: '2023',
    description: 'Global leader in vitamins, active ingredients, and fragrances. JAKIM halal certified for SEA markets. Strong sustainability credentials aligned with Paragon ESG goals.',
    halalCertified: true, alreadyInNetwork: false,
  },
  {
    id: 'gs-003', name: 'Ashland Global Holdings', country: 'United States', flag: '🇺🇸', region: 'Americas',
    categories: ['Active Ingredient', 'Raw Material', 'Specialty Chemical'],
    certifications: ['ISO 9001', 'GMP', 'RSPO', 'Halal IFANCA'],
    matchScore: 87, employees: '4,300+', founded: '1924',
    description: 'Specialty chemical company supplying personal care actives globally. IFANCA halal certified portfolio covering emollients, thickeners, and conditioning agents.',
    halalCertified: true, alreadyInNetwork: false,
  },
  {
    id: 'gs-004', name: 'Croda International', country: 'United Kingdom', flag: '🇬🇧', region: 'Europe',
    categories: ['Active Ingredient', 'Raw Material', 'Emollient'],
    certifications: ['ISO 9001', 'ISO 14001', 'Halal MUI', 'COSMOS', 'NATRUE'],
    matchScore: 89, employees: '6,000+', founded: '1925',
    description: 'Premium specialty chemical supplier with strong halal and natural credentials. MUI certified. Key supplier to Asian beauty brands. Extensive portfolio for skin care actives.',
    halalCertified: true, alreadyInNetwork: false,
  },
  {
    id: 'gs-005', name: 'PT Indesso Aroma', country: 'Indonesia', flag: '🇮🇩', region: 'Asia Pacific',
    categories: ['Fragrance', 'Natural Extract', 'Essential Oil'],
    certifications: ['BPJPH Halal', 'ISO 9001', 'RSPO', 'COSMOS Natural'],
    matchScore: 93, employees: '500+', founded: '1968',
    description: "Indonesia's leading fragrance house. BPJPH halal certified. Deep knowledge of Indonesian consumer preferences. 7-day lead time vs 35 days from Europe. Reduces Suez Canal exposure.",
    halalCertified: true, alreadyInNetwork: false,
  },
  {
    id: 'gs-006', name: 'Zhejiang NHU Co. Ltd.', country: 'China', flag: '🇨🇳', region: 'Asia Pacific',
    categories: ['Vitamin', 'Active Ingredient', 'Specialty Chemical'],
    certifications: ['ISO 9001', 'GMP', 'Halal BPJPH', 'USP Grade'],
    matchScore: 82, employees: '12,000+', founded: '2000',
    description: "World's largest Vitamin E and Niacinamide producer. Competitive pricing 20-30% below European alternatives. BPJPH halal certified. Key supplier to Korean and Japanese beauty industry.",
    halalCertified: true, alreadyInNetwork: true,
  },
  {
    id: 'gs-007', name: 'Evonik Industries AG', country: 'Germany', flag: '🇩🇪', region: 'Europe',
    categories: ['Active Ingredient', 'Specialty Chemical', 'Silicone'],
    certifications: ['ISO 9001', 'ISO 14001', 'GMP', 'Halal IFANCA'],
    matchScore: 84, employees: '34,000+', founded: '2007',
    description: 'Specialty chemicals leader with strong personal care portfolio. IFANCA halal certified silicones and actives. Established relationship with Paragon for active ingredients.',
    halalCertified: true, alreadyInNetwork: true,
  },
  {
    id: 'gs-008', name: 'Univar Solutions', country: 'Malaysia', flag: '🇲🇾', region: 'Asia Pacific',
    categories: ['Raw Material', 'Active Ingredient', 'Distribution'],
    certifications: ['ISO 9001', 'Halal JAKIM', 'GDP Certified'],
    matchScore: 85, employees: '9,800+', founded: '1966',
    description: 'Global chemical distributor with Malaysia hub covering SEA. JAKIM halal certified. Single-point access to 100+ global chemical suppliers without direct import complexity.',
    halalCertified: true, alreadyInNetwork: false,
  },
];

export const SINGLE_SOURCE: SingleSourceItem[] = [
  { material: 'Givaudan Floral Accord FG-2847', category: 'Fragrance',
    currentSupplier: 'Givaudan DE', riskLevel: 'Critical',
    risk: 'Critical — Suez disruption',
    suggestedAlternatives: ['PT Indesso Aroma ID', 'PT Mane Indonesia ID'] },
  { material: 'Hyaluronic Acid HA-100', category: 'Active Ingredient',
    currentSupplier: 'Evonik Specialty FR', riskLevel: 'High',
    risk: 'High — single EU source',
    suggestedAlternatives: ['Zhejiang NHU CN', 'Bloomage Biotechnology CN'] },
  { material: 'Panthenol B5 USP', category: 'Active Ingredient',
    currentSupplier: 'BASF Personal Care DE', riskLevel: 'High',
    risk: 'High — quality issues + single source',
    suggestedAlternatives: ['DSM Nutritional SG', 'Univar Solutions MY'] },
  { material: 'Centella Asiatica Extract 10:1', category: 'Natural Botanical',
    currentSupplier: 'PT Ecogreen ID', riskLevel: 'Medium',
    risk: 'Medium — single local source',
    suggestedAlternatives: ['PT Indesso Aroma ID', 'Shaanxi Sciphar CN'] },
  { material: 'Salicylic Acid USP', category: 'Active Ingredient',
    currentSupplier: 'Not yet sourced', riskLevel: 'Critical',
    risk: 'Critical — no qualified supplier',
    suggestedAlternatives: ['Anhui Salicylics CN', 'Seqens FR'] },
];

export const RECOMMENDED: RecommendedSupplier[] = [
  { id: 'mkt-001', name: 'PT Indesso Aroma', country: 'Indonesia', flag: '🇮🇩',
    matchScore: 94,
    whyRecommended: 'Indonesian fragrance specialist. BPJPH halal certified. Supplies major local FMCG brands. Would reduce Suez Canal exposure for fragrance compounds. Lead time 7 days vs. 35 days from European suppliers.',
    covers: 'Givaudan Floral Accord gap + Centella gap',
    storefrontPath: '/marketplace/supplier/mkt-001' },
  { id: 'mkt-003', name: 'Univar Solutions Malaysia', country: 'Malaysia', flag: '🇲🇾',
    matchScore: 88,
    whyRecommended: 'Global ingredient distributor with Malaysia hub. Distributes BASF, Evonik, Croda, DSM products across SEA. JAKIM halal certified. Would provide single-point access to multiple European ingredient brands without Suez Canal risk.',
    covers: 'Hyaluronic Acid gap + Panthenol B5 gap',
    storefrontPath: '/marketplace/supplier/mkt-003' },
  { id: 'mkt-004', name: 'Anhui Salicylics China', country: 'China', flag: '🇨🇳',
    matchScore: 79,
    whyRecommended: 'Specialist BHA/salicylic acid manufacturer. GMP certified. Supplies Korean and Japanese beauty brands. Halal certification pending — recommend requesting BPJPH application as qualification condition.',
    covers: 'Salicylic Acid — no current supplier',
    riskNote: 'Halal certification not yet obtained. Add as qualification requirement.',
    storefrontPath: '/marketplace/supplier/mkt-004' },
];

export const QUALIFICATIONS: QualificationItem[] = [
  { supplier: 'PT Indesso Aroma', flag: '🇮🇩', stage: 2, stageName: 'Document Review',
    stageTotal: 5, startDate: '2026-03-15', owner: 'Procurement Team',
    nextAction: 'Upload BPJPH certificate', dueDate: '2026-04-15', status: 'On Track' },
  { supplier: 'Univar Solutions MY', flag: '🇲🇾', stage: 1, stageName: 'Initial Contact',
    stageTotal: 5, startDate: '2026-04-01', owner: 'Procurement Team',
    nextAction: 'Schedule capability call', dueDate: '2026-04-12', status: 'On Track' },
  { supplier: 'Anhui Salicylics CN', flag: '🇨🇳', stage: 1, stageName: 'Initial Contact',
    stageTotal: 5, startDate: '2026-04-03', owner: 'Procurement Team',
    nextAction: 'Request halal cert application confirmation', dueDate: '2026-04-17', status: 'At Risk' },
  { supplier: 'Bloomage Biotechnology CN', flag: '🇨🇳', stage: 3, stageName: 'Technical Evaluation',
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
