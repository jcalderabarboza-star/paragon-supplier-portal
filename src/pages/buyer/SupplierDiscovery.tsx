import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Mock data ────────────────────────────────────────────────────────────────
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
    suppliersGlobal: 12, suppliersParagon: 3, priceDir: '↑', priceColor: '#BB0000',
    priceTrend: '+2.1% this month (IFRA index)',
    recommendation: 'Expand Indonesian supplier base to reduce European dependency' },
  { category: 'Active Ingredients (Vitamins)', icon: '💊', marketStatus: 'Oversupply from China — favorable pricing',
    suppliersGlobal: 45, suppliersParagon: 2, priceDir: '↓', priceColor: '#107E3E',
    priceTrend: '-3.2% (Niacinamide spot)',
    recommendation: 'Good time to negotiate long-term contracts with Chinese suppliers' },
  { category: 'Packaging (PET)', icon: '📦', marketStatus: 'Stable — moderate demand',
    suppliersGlobal: 89, suppliersParagon: 3, priceDir: '→', priceColor: '#E9730C',
    priceTrend: '+1.2% (ICIS PET index)',
    recommendation: 'Evaluate sustainable/recycled PET alternatives for Paragon ESG goals' },
  { category: 'Halal Emulsifiers', icon: '🌿', marketStatus: 'Growing supply — Indonesian producers expanding',
    suppliersGlobal: 28, suppliersParagon: 4, priceDir: '↓', priceColor: '#107E3E',
    priceTrend: '-1.5%',
    recommendation: 'Strong Indonesian supplier base — consider expanding VMI arrangements' },
];

const RISK_COLOR: Record<string, string> = { Critical: '#BB0000', High: '#E9730C', Medium: '#F59E0B' };
const RISK_BG: Record<string, string> = { Critical: '#FEE2E2', High: '#FEF3C7', Medium: '#FEF9C3' };
const STATUS_COLOR: Record<string, string> = { 'On Track': '#107E3E', 'At Risk': '#E9730C', 'Blocked': '#BB0000' };
const STATUS_BG: Record<string, string> = { 'On Track': '#DCFCE7', 'At Risk': '#FEF3C7', 'Blocked': '#FEE2E2' };

// ─── Qualification Progress Bar ───────────────────────────────────────────────
const QualificationCard: React.FC<{ q: QualificationItem }> = ({ q }) => {
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 80, right: 24, background: '#0D1B2A', color: '#fff', borderRadius: 8, padding: '10px 16px', fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', zIndex: 9999, borderLeft: '3px solid #0097A7' }}>{toast}</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0D1B2A' }}>{q.flag} {q.supplier}</div>
        <span style={{ background: STATUS_BG[q.status], color: STATUS_COLOR[q.status], borderRadius: 9999, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{q.status}</span>
      </div>

      {/* Progress steps */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, alignItems: 'center' }}>
        {STAGE_LABELS.map((label, i) => {
          const stepNum = i + 1;
          const isDone = stepNum < q.stage;
          const isActive = stepNum === q.stage;
          return (
            <React.Fragment key={label}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isDone ? '#107E3E' : isActive ? '#0097A7' : '#E2E8F0',
                  color: isDone || isActive ? '#fff' : '#94A3B8', fontSize: 11, fontWeight: 700, marginBottom: 4,
                }}>
                  {isDone ? '✓' : stepNum}
                </div>
                <div style={{ fontSize: 9, color: isActive ? '#0097A7' : '#94A3B8', textAlign: 'center', fontWeight: isActive ? 700 : 400, lineHeight: 1.2 }}>
                  {label}
                </div>
              </div>
              {i < STAGE_LABELS.length - 1 && (
                <div style={{ height: 2, flex: 0.3, background: isDone ? '#107E3E' : '#E2E8F0', marginBottom: 18 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>
        <span style={{ fontWeight: 600, color: '#0D1B2A' }}>Next: </span>{q.nextAction}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#94A3B8' }}>Due: {q.dueDate} · {q.owner}</span>
        <button onClick={() => showToast('Status updated')}
          style={{ padding: '5px 12px', borderRadius: 6, background: '#F0F4F8', border: '1px solid #E2E8F0', fontSize: 12, cursor: 'pointer', color: '#0D1B2A', fontWeight: 500 }}>
          Update Status →
        </button>
      </div>
    </div>
  );
};

// ─── Recommendation Card ──────────────────────────────────────────────────────
const RecommendationCard: React.FC<{ sup: RecommendedSupplier }> = ({ sup }) => {
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const scoreColor = sup.matchScore >= 90 ? '#107E3E' : sup.matchScore >= 80 ? '#0097A7' : '#E9730C';

  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', marginBottom: 14 }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 80, right: 24, background: '#0D1B2A', color: '#fff', borderRadius: 8, padding: '10px 16px', fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', zIndex: 9999, borderLeft: '3px solid #0097A7' }}>{toast}</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0D1B2A' }}>{sup.flag} {sup.name}</div>
          <div style={{ fontSize: 12, color: '#64748B' }}>{sup.country}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor }}>{sup.matchScore}<span style={{ fontSize: 13, fontWeight: 500 }}>/100</span></div>
          <div style={{ fontSize: 11, color: scoreColor, fontWeight: 600 }}>AI Match Score</div>
        </div>
      </div>

      <div style={{ fontSize: 13, color: '#0D1B2A', lineHeight: 1.6, marginBottom: 10 }}>{sup.whyRecommended}</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Covers:</span>
        <span style={{ background: 'rgba(0,151,167,0.1)', color: '#0097A7', borderRadius: 9999, padding: '2px 10px', fontSize: 12, fontWeight: 500 }}>{sup.covers}</span>
      </div>

      {sup.riskNote && (
        <div style={{ background: '#FEF3C7', borderLeft: '3px solid #F59E0B', borderRadius: 4, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#92400E' }}>
          {sup.riskNote}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => navigate(sup.storefrontPath)}
          style={{ padding: '7px 14px', borderRadius: 6, background: '#0097A7', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          View Storefront →
        </button>
        <button onClick={() => showToast(`Qualification initiated for ${sup.name}. Discovery team notified.`)}
          style={{ padding: '7px 14px', borderRadius: 6, background: '#F0F4F8', border: '1px solid #E2E8F0', fontSize: 13, cursor: 'pointer', color: '#0D1B2A', fontWeight: 500 }}>
          Start Qualification →
        </button>
        <button onClick={() => showToast(`${sup.name} invited to RFQ. Invitation sent via email.`)}
          style={{ padding: '7px 14px', borderRadius: 6, background: '#F0F4F8', border: '1px solid #E2E8F0', fontSize: 13, cursor: 'pointer', color: '#0D1B2A', fontWeight: 500 }}>
          Invite to RFQ →
        </button>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const SupplierDiscovery: React.FC = () => {
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const kpis = [
    { label: 'Candidates Identified', value: '18', color: '#0A6ED1' },
    { label: 'In Qualification',      value: '4',  color: '#E9730C' },
    { label: 'Approved This Month',   value: '2',  color: '#107E3E' },
    { label: 'Dual Source Gaps',      value: '5',  color: '#BB0000' },
  ];

  return (
    <div style={{ padding: '24px 28px', background: '#F0F4F8', minHeight: '100vh' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 80, right: 24, background: '#0D1B2A', color: '#fff', borderRadius: 8, padding: '10px 16px', fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', zIndex: 9999, borderLeft: '3px solid #0097A7' }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0D1B2A' }}>Supplier Discovery</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>Find and qualify new suppliers globally — powered by market intelligence</p>
        </div>
        <button onClick={() => navigate('/marketplace')}
          style={{ padding: '8px 16px', borderRadius: 8, background: '#0097A7', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          🌐 Open Marketplace →
        </button>
      </div>

      {/* KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', borderLeft: `4px solid ${k.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Section 1 — Single Source Risk */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0D1B2A', marginBottom: 10 }}>⚠️ Materials Requiring Second Source</div>
        <div style={{ background: '#FEE2E2', borderLeft: '4px solid #BB0000', borderRadius: 6, padding: '10px 16px', marginBottom: 14, fontSize: 13, color: '#BB0000', fontWeight: 500 }}>
          5 critical materials have only one qualified supplier — dual sourcing strongly recommended
        </div>
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F0F4F8', borderBottom: '2px solid #E2E8F0' }}>
                {['Material','Category','Current Supplier','Risk Level','Suggested Alternatives','Action'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748B' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SINGLE_SOURCE.map(row => (
                <tr key={row.material} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#0D1B2A' }}>{row.material}</td>
                  <td style={{ padding: '12px', color: '#64748B' }}>{row.category}</td>
                  <td style={{ padding: '12px', color: row.currentSupplier === 'Not yet sourced' ? '#BB0000' : '#0D1B2A' }}>{row.currentSupplier}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ background: RISK_BG[row.riskLevel], color: RISK_COLOR[row.riskLevel], borderRadius: 9999, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{row.riskLevel}</span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {row.suggestedAlternatives.map(alt => (
                        <span key={alt} style={{ background: 'rgba(0,151,167,0.1)', color: '#0097A7', borderRadius: 9999, padding: '2px 8px', fontSize: 11, fontWeight: 500 }}>{alt}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button onClick={() => showToast(`Qualification initiated for ${row.suggestedAlternatives[0]}. Discovery team notified.`)}
                      style={{ padding: '5px 12px', borderRadius: 6, background: '#0097A7', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      Start Qualification →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2 — AI Recommendations */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0D1B2A', marginBottom: 4 }}>🤖 AI Supplier Matches — Recommended for Paragon</div>
        <div style={{ fontSize: 13, color: '#64748B', marginBottom: 14 }}>Based on your category requirements, compliance standards, and halal certification needs</div>
        {RECOMMENDED.map(sup => <RecommendationCard key={sup.id} sup={sup} />)}
      </div>

      {/* Section 3 — Qualification Pipeline */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0D1B2A', marginBottom: 14 }}>Active Qualification Processes</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {QUALIFICATIONS.map(q => <QualificationCard key={q.supplier} q={q} />)}
        </div>
      </div>

      {/* Section 4 — Market Intelligence */}
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0D1B2A', marginBottom: 4 }}>📊 Category Market Intelligence</div>
        <div style={{ fontSize: 13, color: '#64748B', marginBottom: 14 }}>Current market conditions for Paragon's key procurement categories</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {MARKET_INTEL.map(card => (
            <div key={card.category} style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0D1B2A' }}>{card.icon} {card.category}</div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{card.marketStatus}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: card.priceColor }}>{card.priceDir}</div>
                  <div style={{ fontSize: 11, color: card.priceColor, fontWeight: 600 }}>{card.priceTrend}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#0D1B2A' }}>{card.suppliersGlobal}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>Global</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#0097A7' }}>{card.suppliersParagon}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>In Network</div>
                </div>
              </div>
              <div style={{ background: 'rgba(0,151,167,0.08)', borderLeft: '3px solid #0097A7', borderRadius: 4, padding: '8px 12px', fontSize: 12, color: '#0D1B2A' }}>
                💡 {card.recommendation}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SupplierDiscovery;
