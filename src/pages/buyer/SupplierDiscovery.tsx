import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const NAVY  = '#0D1B2A';
const TEAL  = '#0097A7';
const MID   = '#354A5F';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const SUCCESS = '#107E3E';
const WARNING = '#E9730C';
const ERROR   = '#BB0000';
const INFO    = '#0097A7';

// ─── Types ────────────────────────────────────────────────────────────────────
interface GlobalSupplier {
  id: string; name: string; country: string; flag: string; region: string;
  categories: string[]; certifications: string[];
  validatedBy: string[]; matchScore: number;
  description: string; employees: string; founded: string;
  halalCertified: boolean; alreadyInNetwork: boolean;
}

interface SingleSourceItem {
  material: string; category: string; currentSupplier: string;
  risk: string; riskLevel: 'Critical' | 'High' | 'Medium';
  suggestedAlternatives: string[];
}

interface RecommendedSupplier {
  id: string; name: string; country: string; flag: string;
  matchScore: number; whyRecommended: string; covers: string;
  riskNote?: string; storefrontPath: string;
}

interface QualificationItem {
  supplier: string; flag: string; stage: number; stageName: string;
  stageTotal: number; startDate: string; owner: string;
  nextAction: string; dueDate: string; status: 'On Track' | 'At Risk' | 'Blocked';
}

interface MarketIntelCard {
  category: string; icon: string; marketStatus: string;
  suppliersGlobal: number; suppliersParagon: number;
  priceTrend: string; priceDir: '↑' | '↓' | '→'; priceColor: string;
  recommendation: string;
}

// ─── Global Supplier Mock Data ─────────────────────────────────────────────────
const GLOBAL_SUPPLIERS: GlobalSupplier[] = [
  {
    id: 'gs-001', name: 'Givaudan SA', country: 'Switzerland', flag: '🇨🇭', region: 'Europe',
    categories: ['Fragrance', 'Flavor', 'Active Ingredient'],
    certifications: ['ISO 9001', 'ISO 14001', 'Halal MUI', 'COSMOS', 'RSPO'],
    validatedBy: ["L'Oréal", 'Unilever', 'P&G', 'Shiseido', 'LVMH'],
    matchScore: 96, employees: '16,000+', founded: '1895',
    description: 'World\'s largest fragrance and flavor company. Supplies to all major global beauty brands. Strong halal portfolio with dedicated Islamic certification team.',
    halalCertified: true, alreadyInNetwork: true,
  },
  {
    id: 'gs-002', name: 'DSM-Firmenich', country: 'Netherlands', flag: '🇳🇱', region: 'Europe',
    categories: ['Active Ingredient', 'Fragrance', 'Vitamin'],
    certifications: ['ISO 9001', 'GMP', 'Halal JAKIM', 'COSMOS Organic'],
    validatedBy: ["L'Oréal", 'Estée Lauder', 'Beiersdorf', 'Henkel'],
    matchScore: 91, employees: '28,000+', founded: '2023',
    description: 'Global leader in vitamins, active ingredients, and fragrances. JAKIM halal certified for SEA markets. Strong sustainability credentials aligned with Paragon ESG goals.',
    halalCertified: true, alreadyInNetwork: false,
  },
  {
    id: 'gs-003', name: 'Ashland Global Holdings', country: 'United States', flag: '🇺🇸', region: 'Americas',
    categories: ['Active Ingredient', 'Raw Material', 'Specialty Chemical'],
    certifications: ['ISO 9001', 'GMP', 'RSPO', 'Halal IFANCA'],
    validatedBy: ['P&G', 'Unilever', 'Colgate-Palmolive', 'Johnson & Johnson'],
    matchScore: 87, employees: '4,300+', founded: '1924',
    description: 'Specialty chemical company supplying personal care actives globally. IFANCA halal certified portfolio covering emollients, thickeners, and conditioning agents.',
    halalCertified: true, alreadyInNetwork: false,
  },
  {
    id: 'gs-004', name: 'Croda International', country: 'United Kingdom', flag: '🇬🇧', region: 'Europe',
    categories: ['Active Ingredient', 'Raw Material', 'Emollient'],
    certifications: ['ISO 9001', 'ISO 14001', 'Halal MUI', 'COSMOS', 'NATRUE'],
    validatedBy: ["L'Oréal", 'Shiseido', 'Amorepacific', 'Beiersdorf', 'LVMH'],
    matchScore: 89, employees: '6,000+', founded: '1925',
    description: 'Premium specialty chemical supplier with strong halal and natural credentials. MUI certified. Key supplier to Asian beauty brands. Extensive portfolio for skin care actives.',
    halalCertified: true, alreadyInNetwork: false,
  },
  {
    id: 'gs-005', name: 'PT Indesso Aroma', country: 'Indonesia', flag: '🇮🇩', region: 'Asia Pacific',
    categories: ['Fragrance', 'Natural Extract', 'Essential Oil'],
    certifications: ['BPJPH Halal', 'ISO 9001', 'RSPO', 'COSMOS Natural'],
    validatedBy: ['Unilever Indonesia', 'Wings Group', 'Indofood'],
    matchScore: 93, employees: '500+', founded: '1968',
    description: 'Indonesia\'s leading fragrance house. BPJPH halal certified. Deep knowledge of Indonesian consumer preferences. 7-day lead time vs 35 days from Europe. Reduces Suez Canal exposure.',
    halalCertified: true, alreadyInNetwork: false,
  },
  {
    id: 'gs-006', name: 'Zhejiang NHU Co. Ltd.', country: 'China', flag: '🇨🇳', region: 'Asia Pacific',
    categories: ['Vitamin', 'Active Ingredient', 'Specialty Chemical'],
    certifications: ['ISO 9001', 'GMP', 'Halal BPJPH', 'USP Grade'],
    validatedBy: ['DSM', 'BASF', 'Korean Beauty Brands', 'Japanese OEM'],
    matchScore: 82, employees: '12,000+', founded: '2000',
    description: 'World\'s largest Vitamin E and Niacinamide producer. Competitive pricing 20-30% below European alternatives. BPJPH halal certified. Key supplier to Korean and Japanese beauty industry.',
    halalCertified: true, alreadyInNetwork: true,
  },
  {
    id: 'gs-007', name: 'Evonik Industries AG', country: 'Germany', flag: '🇩🇪', region: 'Europe',
    categories: ['Active Ingredient', 'Specialty Chemical', 'Silicone'],
    certifications: ['ISO 9001', 'ISO 14001', 'GMP', 'Halal IFANCA'],
    validatedBy: ["L'Oréal", 'Henkel', 'Beiersdorf', 'P&G', 'Unilever'],
    matchScore: 84, employees: '34,000+', founded: '2007',
    description: 'Specialty chemicals leader with strong personal care portfolio. IFANCA halal certified silicones and actives. Established relationship with Paragon for active ingredients.',
    halalCertified: true, alreadyInNetwork: true,
  },
  {
    id: 'gs-008', name: 'Univar Solutions', country: 'Malaysia', flag: '🇲🇾', region: 'Asia Pacific',
    categories: ['Raw Material', 'Active Ingredient', 'Distribution'],
    certifications: ['ISO 9001', 'Halal JAKIM', 'GDP Certified'],
    validatedBy: ['BASF', 'Evonik', 'DSM', 'Croda', 'Ashland'],
    matchScore: 85, employees: '9,800+', founded: '1966',
    description: 'Global chemical distributor with Malaysia hub covering SEA. JAKIM halal certified. Single-point access to 100+ global chemical suppliers without direct import complexity.',
    halalCertified: true, alreadyInNetwork: false,
  },
];

// ─── Existing Mock Data ───────────────────────────────────────────────────────
const SINGLE_SOURCE: SingleSourceItem[] = [
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

const RECOMMENDED: RecommendedSupplier[] = [
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
    riskNote: '⚠️ Halal certification not yet obtained. Add as qualification requirement.',
    storefrontPath: '/marketplace/supplier/mkt-004' },
];

const QUALIFICATIONS: QualificationItem[] = [
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

const STAGE_LABELS = ['Initial Contact', 'Document Review', 'Technical Eval', 'Commercial', 'Approved'];

const MARKET_INTEL: MarketIntelCard[] = [
  { category: 'Fragrance Compounds', icon: '🌸', marketStatus: 'Tight supply — High demand from Asian markets',
    suppliersGlobal: 12, suppliersParagon: 3, priceDir: '↑', priceColor: ERROR,
    priceTrend: '+2.1% this month (IFRA index)',
    recommendation: 'Expand Indonesian supplier base to reduce European dependency' },
  { category: 'Active Ingredients (Vitamins)', icon: '💊', marketStatus: 'Oversupply from China — favorable pricing',
    suppliersGlobal: 45, suppliersParagon: 2, priceDir: '↓', priceColor: SUCCESS,
    priceTrend: '-3.2% (Niacinamide spot)',
    recommendation: 'Good time to negotiate long-term contracts with Chinese suppliers' },
  { category: 'Packaging (PET)', icon: '📦', marketStatus: 'Stable — moderate demand',
    suppliersGlobal: 89, suppliersParagon: 3, priceDir: '→', priceColor: WARNING,
    priceTrend: '+1.2% (ICIS PET index)',
    recommendation: 'Evaluate sustainable/recycled PET alternatives for Paragon ESG goals' },
  { category: 'Halal Emulsifiers', icon: '🌿', marketStatus: 'Growing supply — Indonesian producers expanding',
    suppliersGlobal: 28, suppliersParagon: 4, priceDir: '↓', priceColor: SUCCESS,
    priceTrend: '-1.5%',
    recommendation: 'Strong Indonesian supplier base — consider expanding VMI arrangements' },
];

const RISK_COLOR: Record<string, string> = { Critical: ERROR, High: WARNING, Medium: '#F59E0B' };
const RISK_BG: Record<string, string> = { Critical: '#FEE2E2', High: '#FEF3C7', Medium: '#FEF9C3' };
const STATUS_COLOR: Record<string, string> = { 'On Track': SUCCESS, 'At Risk': WARNING, 'Blocked': ERROR };
const STATUS_BG: Record<string, string> = { 'On Track': '#DCFCE7', 'At Risk': '#FEF3C7', 'Blocked': '#FEE2E2' };

function Pill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return <span style={{ background: bg, color, borderRadius: 9999, padding: '2px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>;
}

// ─── Global Search Result Card ────────────────────────────────────────────────
const GlobalSupplierCard: React.FC<{ s: GlobalSupplier; onToast: (m: string) => void }> = ({ s, onToast }) => {
  const scoreColor = s.matchScore >= 90 ? SUCCESS : s.matchScore >= 80 ? TEAL : WARNING;
  return (
    <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>{s.flag}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>{s.name}</span>
            {s.alreadyInNetwork && <Pill label="In Network" bg="#DCFCE7" color={SUCCESS} />}
          </div>
          <div style={{ fontSize: 12, color: MUTED }}>{s.country} · {s.region} · Est. {s.founded} · {s.employees} employees</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: scoreColor }}>{s.matchScore}<span style={{ fontSize: 12, fontWeight: 500 }}>/100</span></div>
          <div style={{ fontSize: 10, color: scoreColor, fontWeight: 600 }}>AI Match Score</div>
        </div>
      </div>

      <div style={{ fontSize: 13, color: MID, lineHeight: 1.6 }}>{s.description}</div>

      {/* Validated by */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Market Validated By</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {s.validatedBy.map(brand => (
            <span key={brand} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#354A5F', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>
              ✓ {brand}
            </span>
          ))}
        </div>
      </div>

      {/* Categories + Certs */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Categories</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {s.categories.map(c => <Pill key={c} label={c} bg="#F1F5F9" color={MID} />)}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Certifications</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {s.halalCertified && <Pill label="✓ Halal" bg="#DCFCE7" color={SUCCESS} />}
            {s.certifications.filter(c => !c.toLowerCase().includes('halal')).slice(0, 3).map(c => <Pill key={c} label={c} bg="#F1F5F9" color={MID} />)}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, paddingTop: 8, borderTop: `1px solid ${BORDER}`, flexWrap: 'wrap' }}>
        {!s.alreadyInNetwork ? (
          <button onClick={() => onToast(`Invitation sent to ${s.name} via email — ARIA will follow up via WhatsApp within 24 hours`)}
            style={{ padding: '7px 14px', borderRadius: 6, background: TEAL, color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            📨 Invite to Marketplace
          </button>
        ) : (
          <button onClick={() => onToast(`${s.name} is already in your supplier network`)}
            style={{ padding: '7px 14px', borderRadius: 6, background: '#F1F5F9', color: MID, border: `1px solid ${BORDER}`, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            ✓ Already in Network
          </button>
        )}
        <button onClick={() => onToast(`ARIA is drafting a personalized outreach message to ${s.name}...`)}
          style={{ padding: '7px 14px', borderRadius: 6, background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          🤖 Contact via ARIA
        </button>
        <button onClick={() => onToast(`Starting qualification process for ${s.name}`)}
          style={{ padding: '7px 14px', borderRadius: 6, background: 'white', color: MID, border: `1px solid ${BORDER}`, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Start Qualification →
        </button>
      </div>
    </div>
  );
};

// ─── Qualification Card ───────────────────────────────────────────────────────
const QualificationCard: React.FC<{ q: QualificationItem }> = ({ q }) => {
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  return (
    <div style={{ background: 'white', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
      {toast && <div style={{ position: 'fixed', bottom: 80, right: 24, background: NAVY, color: 'white', borderRadius: 8, padding: '10px 16px', fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', zIndex: 9999, borderLeft: `3px solid ${TEAL}` }}>{toast}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{q.flag} {q.supplier}</div>
        <span style={{ background: STATUS_BG[q.status], color: STATUS_COLOR[q.status], borderRadius: 9999, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{q.status}</span>
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, alignItems: 'center' }}>
        {STAGE_LABELS.map((label, i) => {
          const stepNum = i + 1; const isDone = stepNum < q.stage; const isActive = stepNum === q.stage;
          return (
            <React.Fragment key={label}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDone ? SUCCESS : isActive ? TEAL : '#E2E8F0', color: isDone || isActive ? 'white' : '#94A3B8', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                  {isDone ? '✓' : stepNum}
                </div>
                <div style={{ fontSize: 9, color: isActive ? TEAL : '#94A3B8', textAlign: 'center', fontWeight: isActive ? 700 : 400, lineHeight: 1.2 }}>{label}</div>
              </div>
              {i < STAGE_LABELS.length - 1 && <div style={{ height: 2, flex: 0.3, background: isDone ? SUCCESS : '#E2E8F0', marginBottom: 18 }} />}
            </React.Fragment>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}><span style={{ fontWeight: 600, color: NAVY }}>Next: </span>{q.nextAction}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#94A3B8' }}>Due: {q.dueDate} · {q.owner}</span>
        <button onClick={() => showToast('Status updated')} style={{ padding: '5px 12px', borderRadius: 6, background: '#F0F4F8', border: `1px solid ${BORDER}`, fontSize: 12, cursor: 'pointer', color: NAVY, fontWeight: 500, fontFamily: 'inherit' }}>Update Status →</button>
      </div>
    </div>
  );
};

// ─── Recommendation Card ──────────────────────────────────────────────────────
const RecommendationCard: React.FC<{ sup: RecommendedSupplier }> = ({ sup }) => {
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const scoreColor = sup.matchScore >= 90 ? SUCCESS : sup.matchScore >= 80 ? TEAL : WARNING;
  return (
    <div style={{ background: 'white', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', marginBottom: 14 }}>
      {toast && <div style={{ position: 'fixed', bottom: 80, right: 24, background: NAVY, color: 'white', borderRadius: 8, padding: '10px 16px', fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', zIndex: 9999, borderLeft: `3px solid ${TEAL}` }}>{toast}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>{sup.flag} {sup.name}</div>
          <div style={{ fontSize: 12, color: MUTED }}>{sup.country}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor }}>{sup.matchScore}<span style={{ fontSize: 13, fontWeight: 500 }}>/100</span></div>
          <div style={{ fontSize: 11, color: scoreColor, fontWeight: 600 }}>AI Match Score</div>
        </div>
      </div>
      <div style={{ fontSize: 13, color: NAVY, lineHeight: 1.6, marginBottom: 10 }}>{sup.whyRecommended}</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>Covers:</span>
        <span style={{ background: 'rgba(0,151,167,0.1)', color: TEAL, borderRadius: 9999, padding: '2px 10px', fontSize: 12, fontWeight: 500 }}>{sup.covers}</span>
      </div>
      {sup.riskNote && (
        <div style={{ background: '#FEF3C7', borderLeft: '3px solid #F59E0B', borderRadius: 4, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#E9730C' }}>{sup.riskNote}</div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => navigate(sup.storefrontPath)} style={{ padding: '7px 14px', borderRadius: 6, background: TEAL, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>View Storefront →</button>
        <button onClick={() => showToast(`Qualification initiated for ${sup.name}. Discovery team notified.`)} style={{ padding: '7px 14px', borderRadius: 6, background: '#F0F4F8', border: `1px solid ${BORDER}`, fontSize: 13, cursor: 'pointer', color: NAVY, fontWeight: 500, fontFamily: 'inherit' }}>Start Qualification →</button>
        <button onClick={() => showToast(`${sup.name} invited to RFQ. Invitation sent via email.`)} style={{ padding: '7px 14px', borderRadius: 6, background: '#F0F4F8', border: `1px solid ${BORDER}`, fontSize: 13, cursor: 'pointer', color: NAVY, fontWeight: 500, fontFamily: 'inherit' }}>Invite to RFQ →</button>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const SupplierDiscovery: React.FC = () => {
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('All');
  const [searchRegion, setSearchRegion] = useState('All');
  const [halalOnly, setHalalOnly] = useState(false);
  const [majorBrandsOnly, setMajorBrandsOnly] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'recommendations' | 'qualification' | 'intelligence'>('search');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  const MAJOR_BRANDS = ["L'Oréal", 'Unilever', 'P&G', 'Shiseido', 'LVMH', 'Estée Lauder', 'Beiersdorf'];

  const filteredSuppliers = GLOBAL_SUPPLIERS.filter(s => {
    if (halalOnly && !s.halalCertified) return false;
    if (searchRegion !== 'All' && s.region !== searchRegion) return false;
    if (searchCategory !== 'All' && !s.categories.includes(searchCategory)) return false;
    if (majorBrandsOnly && !s.validatedBy.some(b => MAJOR_BRANDS.includes(b))) return false;
    if (searchQuery) {
      const words = searchQuery.toLowerCase().split(' ').filter(w => w.length > 1);
      return words.some(w =>
        s.name.toLowerCase().includes(w) ||
        s.categories.some(c => c.toLowerCase().includes(w)) ||
        s.description.toLowerCase().includes(w) ||
        s.country.toLowerCase().includes(w) ||
        s.region.toLowerCase().includes(w)
      );
    }
    return true;
  });

  const kpis = [
    { label: 'Candidates Identified', value: '18', color: INFO },
    { label: 'In Qualification',      value: '4',  color: WARNING },
    { label: 'Approved This Month',   value: '2',  color: SUCCESS },
    { label: 'Dual Source Gaps',      value: '5',  color: ERROR },
  ];

  const TABS = [
    { key: 'search',         label: 'Global Search' },
    { key: 'recommendations',label: 'AI Recommendations' },
    { key: 'qualification',  label: 'Qualification Pipeline' },
    { key: 'intelligence',   label: 'Market Intelligence' },
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {toast && <div style={{ position: 'fixed', bottom: 80, right: 24, background: NAVY, color: 'white', borderRadius: 8, padding: '10px 16px', fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', zIndex: 9999, borderLeft: `3px solid ${TEAL}`, maxWidth: 400 }}>{toast}</div>}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 4 }}>Supplier Discovery</div>
          <div style={{ fontSize: 13, color: MUTED }}>Find and qualify new suppliers globally — market-validated by L'Oréal, Unilever, P&G, Shiseido and more</div>
        </div>
        <button onClick={() => navigate('/buyer/marketplace')} style={{ padding: '8px 16px', borderRadius: 8, background: TEAL, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          🌐 Open Marketplace →
        </button>
      </div>

      {/* KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: 'white', borderRadius: 10, padding: '16px 20px', borderLeft: `4px solid ${k.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${BORDER}`, gap: 4 }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: '10px 20px', border: 'none', borderBottom: activeTab === tab.key ? `2px solid ${TEAL}` : '2px solid transparent', background: 'transparent', color: activeTab === tab.key ? TEAL : MUTED, fontWeight: activeTab === tab.key ? 700 : 500, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: -2, whiteSpace: 'nowrap' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Global Search */}
      {activeTab === 'search' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 4 }}>Global Supplier Search</div>
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>Search across market-validated suppliers from global beauty brands — Givaudan, DSM-Firmenich, Croda, Ashland and more</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') setSearched(true); }}
                placeholder="Search by material, category, country or capability..."
                style={{ flex: 1, minWidth: 280, padding: '10px 14px', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: NAVY, fontFamily: 'inherit', outline: 'none' }} />
              <button onClick={() => setSearched(true)} style={{ padding: '10px 20px', background: TEAL, color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Search</button>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={searchCategory} onChange={e => setSearchCategory(e.target.value)} style={{ padding: '7px 12px', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12, color: NAVY, fontFamily: 'inherit', background: 'white' }}>
                {['All', 'Fragrance', 'Active Ingredient', 'Raw Material', 'Packaging', 'Vitamin', 'Emollient'].map(c => <option key={c}>{c === 'All' ? 'All Categories' : c}</option>)}
              </select>
              <select value={searchRegion} onChange={e => setSearchRegion(e.target.value)} style={{ padding: '7px 12px', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12, color: NAVY, fontFamily: 'inherit', background: 'white' }}>
                {['All', 'Asia Pacific', 'Europe', 'Americas', 'Middle East'].map(r => <option key={r}>{r === 'All' ? 'All Regions' : r}</option>)}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: NAVY, cursor: 'pointer' }}>
                <input type="checkbox" checked={halalOnly} onChange={e => setHalalOnly(e.target.checked)} />
                Halal Certified Only
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: NAVY, cursor: 'pointer' }}>
                <input type="checkbox" checked={majorBrandsOnly} onChange={e => setMajorBrandsOnly(e.target.checked)} />
                Major Brand Validated Only
              </label>
              {(searchQuery || searchCategory !== 'All' || searchRegion !== 'All' || halalOnly || majorBrandsOnly) && (
                <button onClick={() => { setSearchQuery(''); setSearchCategory('All'); setSearchRegion('All'); setHalalOnly(false); setMajorBrandsOnly(false); setSearched(false); }} style={{ background: 'transparent', border: 'none', color: INFO, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Clear Filters</button>
              )}
            </div>
          </div>

          {(searched || searchQuery || searchCategory !== 'All' || searchRegion !== 'All' || halalOnly || majorBrandsOnly) ? (
            <>
              <div style={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>{filteredSuppliers.length} supplier{filteredSuppliers.length !== 1 ? 's' : ''} found — sorted by AI match score</div>
              {filteredSuppliers.length === 0 ? (
                <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '3rem', textAlign: 'center', color: MUTED }}>No suppliers match your search criteria. Try broadening your filters.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: 16 }}>
                  {filteredSuppliers.sort((a, b) => b.matchScore - a.matchScore).map(s => <GlobalSupplierCard key={s.id} s={s} onToast={showToast} />)}
                </div>
              )}
            </>
          ) : (
            <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🌐</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Search the Global Supplier Market</div>
              <div style={{ fontSize: 13, color: MUTED, maxWidth: 480, margin: '0 auto', lineHeight: 1.6, marginBottom: 16 }}>
                Find suppliers already validated by L'Oréal, Unilever, P&G, Shiseido, and LVMH. Filter by halal certification, region, and category. Invite directly to Paragon Marketplace or contact via ARIA AI agent.
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {['Fragrance Indonesia', 'Niacinamide China', 'Halal emulsifier', 'Packaging SEA', 'Active ingredient Europe'].map(suggestion => (
                  <button key={suggestion} onClick={() => { setSearchQuery(suggestion); setSearched(true); }} style={{ background: '#F1F5F9', border: `1px solid ${BORDER}`, borderRadius: 20, padding: '6px 14px', fontSize: 12, color: MID, cursor: 'pointer', fontFamily: 'inherit' }}>{suggestion}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: AI Recommendations */}
      {activeTab === 'recommendations' && (
        <div>
          <div style={{ background: '#FEE2E2', borderLeft: `4px solid ${ERROR}`, borderRadius: 6, padding: '10px 16px', marginBottom: 14, fontSize: 13, color: ERROR, fontWeight: 500 }}>
            5 critical materials have only one qualified supplier — dual sourcing strongly recommended
          </div>
          <div style={{ background: 'white', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflowX: 'auto', marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 14 }}>Materials Requiring Second Source</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F0F4F8', borderBottom: `2px solid ${BORDER}` }}>
                  {['Material', 'Category', 'Current Supplier', 'Risk Level', 'Suggested Alternatives', 'Action'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SINGLE_SOURCE.map(row => (
                  <tr key={row.material} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '12px', fontWeight: 600, color: NAVY }}>{row.material}</td>
                    <td style={{ padding: '12px', color: MUTED }}>{row.category}</td>
                    <td style={{ padding: '12px', color: row.currentSupplier === 'Not yet sourced' ? ERROR : NAVY }}>{row.currentSupplier}</td>
                    <td style={{ padding: '12px' }}><span style={{ background: RISK_BG[row.riskLevel], color: RISK_COLOR[row.riskLevel], borderRadius: 9999, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{row.riskLevel}</span></td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {row.suggestedAlternatives.map(alt => <span key={alt} style={{ background: 'rgba(0,151,167,0.1)', color: TEAL, borderRadius: 9999, padding: '2px 8px', fontSize: 11, fontWeight: 500 }}>{alt}</span>)}
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button onClick={() => showToast(`Qualification initiated for ${row.suggestedAlternatives[0]}`)} style={{ padding: '5px 12px', borderRadius: 6, background: TEAL, color: 'white', border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', fontFamily: 'inherit' }}>Start Qualification →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 4 }}>AI Supplier Matches — Recommended for Paragon</div>
          <div style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>Based on your category requirements, compliance standards, and halal certification needs</div>
          {RECOMMENDED.map(sup => <RecommendationCard key={sup.id} sup={sup} />)}
        </div>
      )}

      {/* Tab: Qualification Pipeline */}
      {activeTab === 'qualification' && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 14 }}>Active Qualification Processes</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {QUALIFICATIONS.map(q => <QualificationCard key={q.supplier} q={q} />)}
          </div>
        </div>
      )}

      {/* Tab: Market Intelligence */}
      {activeTab === 'intelligence' && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 4 }}>📊 Category Market Intelligence</div>
          <div style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>Current market conditions for Paragon's key procurement categories</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {MARKET_INTEL.map(card => (
              <div key={card.category} style={{ background: 'white', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{card.icon} {card.category}</div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{card.marketStatus}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: card.priceColor }}>{card.priceDir}</div>
                    <div style={{ fontSize: 11, color: card.priceColor, fontWeight: 600 }}>{card.priceTrend}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: NAVY }}>{card.suppliersGlobal}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>Global</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: TEAL }}>{card.suppliersParagon}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>In Network</div>
                  </div>
                </div>
                <div style={{ background: 'rgba(0,151,167,0.08)', borderLeft: `3px solid ${TEAL}`, borderRadius: 4, padding: '8px 12px', fontSize: 12, color: NAVY }}>
                  💡 {card.recommendation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default SupplierDiscovery;
