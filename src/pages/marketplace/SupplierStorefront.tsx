import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockSuppliers } from '../../data/mockSuppliers';
import { COUNTRY_PROFILES, CHANNEL_CONFIG } from '../../data/communicationProfiles';
import { useAdaptive } from '../../context/AdaptiveContext';

const TEAL  = '#0097A7';
const NAVY  = '#0D1B2A';
const GREEN = '#16A34A';
const AMBER = '#D97706';
const RED   = '#DC2626';
const BLUE  = '#2563EB';
const BORDER = '#E2E8F0';
const MUTED  = '#64748B';
const BG     = '#F0F4F8';

// Combined storefront data — existing + marketplace-only suppliers
const STOREFRONT_DATA: Record<string, {
  id: string; name: string; country: string; flag: string; category: string;
  grade: string | null; otif: number | null; tier: number; channel: string;
  established: number; employees: string; revenue: string;
  description: string; longDescription: string;
  materials: { name: string; moq: string; leadTime: string; price: string; certifications: string[] }[];
  certifications: { name: string; issuer: string; expiry: string | null; status: 'valid' | 'expiring' | 'missing' }[];
  halalCert: boolean; iso9001: boolean; bpom: boolean; reach: boolean;
  keyClients: string[]; status: 'Approved Supplier' | 'Not Yet Qualified';
  poCount?: number; avgLeadTime?: string;
}> = {
  'sup-001': {
    id: 'sup-001', name: 'PT Ecogreen Oleochemicals', country: 'ID', flag: '🇮🇩',
    category: 'Halal Emulsifiers', grade: 'A', otif: 95, tier: 3, channel: 'api',
    established: 1995, employees: '1,000–2,500', revenue: 'Rp 800+ Miliar',
    description: "Indonesia's leading oleochemical producer. Supplies palm-derived fatty acids, glycerine, and emulsifiers.",
    longDescription: "PT Ecogreen Oleochemicals is one of Southeast Asia's largest producers of oleochemicals derived from sustainable palm oil. Our products are used in personal care, home care, and food applications worldwide. We hold BPJPH halal certification and RSPO membership, ensuring our palm supply chain meets the highest sustainability standards. Our Batam facility operates to ISO 9001 and GMP standards, with capacity for 400,000 MT/year.",
    materials: [
      { name: 'Fatty Acids C12-C18', moq: '1,000 KG', leadTime: '7 days', price: 'USD 1.20–1.80/KG', certifications: ['Halal BPJPH', 'RSPO', 'KOSHER'] },
      { name: 'Glycerine USP 99.7%', moq: '500 KG', leadTime: '7 days', price: 'USD 0.80–1.10/KG', certifications: ['Halal BPJPH', 'USP Grade', 'Food Grade'] },
      { name: 'Sorbitol Solution 70%', moq: '1,000 KG', leadTime: '10 days', price: 'USD 0.60–0.80/KG', certifications: ['Halal BPJPH', 'Food Grade'] },
    ],
    certifications: [
      { name: 'BPJPH Halal Certificate', issuer: 'Badan Penyelenggara Jaminan Produk Halal', expiry: '2026-12-31', status: 'valid' },
      { name: 'ISO 9001:2015', issuer: 'Bureau Veritas', expiry: '2026-08-01', status: 'valid' },
      { name: 'BPOM Registration', issuer: 'Badan Pengawas Obat dan Makanan', expiry: '2027-03-10', status: 'valid' },
      { name: 'RSPO Certification', issuer: 'Roundtable on Sustainable Palm Oil', expiry: '2026-11-15', status: 'valid' },
    ],
    halalCert: true, iso9001: true, bpom: true, reach: false,
    keyClients: ['Unilever Indonesia', 'PT Sayap Mas Utama', 'P&G Indonesia'],
    status: 'Approved Supplier', poCount: 48, avgLeadTime: '9 days',
  },
  'mkt-001': {
    id: 'mkt-001', name: 'PT Indesso Aroma Indonesia', country: 'ID', flag: '🇮🇩',
    category: 'Fragrance & Aroma', grade: null, otif: null, tier: 2, channel: 'web',
    established: 1968, employees: '500–1,000', revenue: 'USD 50–100M',
    description: "Indonesia's leading fragrance manufacturer. BPJPH certified. Specializes in floral, oriental, and fresh accords.",
    longDescription: "PT Indesso Aroma was established in 1968 and is one of Indonesia's premier fragrance and aroma chemical companies. We produce over 500 fragrance formulations tailored to the Indonesian and Southeast Asian market. All our fragrances are BPJPH halal certified, making us a natural partner for halal personal care brands. Our R&D team has developed exclusive accord libraries that resonate with local consumers across Indonesia, Malaysia, and the GCC markets.",
    materials: [
      { name: 'Floral Accord (Jasmine-Rose)', moq: '5 KG', leadTime: '14 days', price: 'Request Quote', certifications: ['Halal BPJPH', 'IFRA Compliant'] },
      { name: 'Fresh Marine Accord', moq: '5 KG', leadTime: '14 days', price: 'Request Quote', certifications: ['Halal BPJPH', 'IFRA Compliant'] },
      { name: 'Oud Oriental Complex', moq: '2 KG', leadTime: '21 days', price: 'Request Quote', certifications: ['Halal BPJPH', 'IFRA Compliant'] },
    ],
    certifications: [
      { name: 'BPJPH Halal Certificate', issuer: 'Badan Penyelenggara Jaminan Produk Halal', expiry: '2026-09-30', status: 'valid' },
      { name: 'ISO 9001:2015', issuer: 'SGS Indonesia', expiry: '2026-06-20', status: 'valid' },
      { name: 'BPOM Registration', issuer: 'Badan Pengawas Obat dan Makanan', expiry: '2026-11-01', status: 'valid' },
      { name: 'IFRA Compliance Statement', issuer: 'IFRA Self-Certification', expiry: null, status: 'valid' },
    ],
    halalCert: true, iso9001: true, bpom: true, reach: false,
    keyClients: ['Wings Group', 'Softex Indonesia', 'Mandom Indonesia'],
    status: 'Not Yet Qualified',
  },
  'mkt-002': {
    id: 'mkt-002', name: 'Givaudan Fragrance Singapore', country: 'SG', flag: '🇸🇬',
    category: 'Fragrance & Aroma', grade: 'A', otif: 96, tier: 3, channel: 'api',
    established: 1895, employees: '10,000+', revenue: 'CHF 7B+',
    description: "World's largest fragrance company. Singapore hub serves SEA. Full halal certification across portfolio.",
    longDescription: "Givaudan is the world's largest flavour and fragrance company, with a history dating back to 1895. Our Singapore Innovation Centre is one of our flagship facilities in Asia, housing over 200 perfumers and application specialists. We are the fragrance partner to the world's leading beauty brands. Our halal-certified portfolio covers fine fragrance, personal wash, and functional fragrance categories, all compliant with IFRA guidelines and BPJPH halal standards.",
    materials: [
      { name: 'Fine Fragrance — Floral Bouquet', moq: '1 KG', leadTime: '7 days', price: 'Request Quote', certifications: ['Halal BPJPH', 'IFRA', 'REACH'] },
      { name: 'Functional Fragrance — Shower Gel', moq: '10 KG', leadTime: '5 days', price: 'Request Quote', certifications: ['Halal BPJPH', 'IFRA', 'REACH'] },
      { name: 'Captive Naturals — Oud Collection', moq: '0.5 KG', leadTime: '14 days', price: 'Request Quote', certifications: ['Halal BPJPH', 'IFRA', 'REACH', 'Cosmos Natural'] },
    ],
    certifications: [
      { name: 'BPJPH Halal Certificate', issuer: 'Badan Penyelenggara Jaminan Produk Halal', expiry: '2027-01-31', status: 'valid' },
      { name: 'ISO 9001:2015', issuer: 'SGS Singapore', expiry: '2026-10-15', status: 'valid' },
      { name: 'REACH Compliance', issuer: 'ECHA EU Registry', expiry: null, status: 'valid' },
      { name: 'IFRA Certificate', issuer: 'IFRA International', expiry: '2026-12-31', status: 'valid' },
    ],
    halalCert: true, iso9001: true, bpom: false, reach: true,
    keyClients: ['L\'Oréal', 'Unilever', 'Procter & Gamble', 'Kao Corporation'],
    status: 'Approved Supplier', poCount: 12, avgLeadTime: '6 days',
  },
  'mkt-003': {
    id: 'mkt-003', name: 'Univar Solutions Malaysia', country: 'MY', flag: '🇲🇾',
    category: 'Active Ingredients', grade: null, otif: null, tier: 2, channel: 'web',
    established: 1924, employees: '10,000+', revenue: 'USD 10B+',
    description: "Global chemical distributor with Malaysia hub. Distributes BASF, Evonik, Croda ingredients. JAKIM halal certified.",
    longDescription: "Univar Solutions is one of the world's largest chemical and ingredient distributors, connecting leading manufacturers with customers across 100+ countries. Our Malaysia hub serves the ASEAN personal care market, with warehousing in Kuala Lumpur and Penang. We distribute ingredients from BASF, Evonik, Croda, DSM, and Lonza with full documentation and halal compliance support. Our team of personal care specialists can assist with formulation support and regulatory compliance.",
    materials: [
      { name: 'Hyaluronic Acid (BASF)', moq: '100 G', leadTime: '5 days', price: 'Request Quote', certifications: ['Halal JAKIM', 'REACH', 'ISO Grade'] },
      { name: 'Niacinamide 99.5% (Lonza)', moq: '500 G', leadTime: '3 days', price: 'Request Quote', certifications: ['Halal JAKIM', 'USP Grade', 'REACH'] },
      { name: 'Vitamin C (Asc. Glucoside, DSM)', moq: '200 G', leadTime: '7 days', price: 'Request Quote', certifications: ['Halal JAKIM', 'Cosmos', 'REACH'] },
      { name: 'Peptide Complex (Evonik)', moq: '50 G', leadTime: '14 days', price: 'Request Quote', certifications: ['REACH', 'EU Compliant'] },
    ],
    certifications: [
      { name: 'JAKIM Halal Certificate', issuer: 'Jabatan Kemajuan Islam Malaysia', expiry: '2026-08-31', status: 'valid' },
      { name: 'ISO 9001:2015', issuer: 'Bureau Veritas', expiry: '2026-05-10', status: 'expiring' },
      { name: 'REACH Compliance', issuer: 'Self-assessment + ECHA', expiry: null, status: 'valid' },
    ],
    halalCert: true, iso9001: true, bpom: false, reach: true,
    keyClients: ['Luxasia Group', 'Brand\'s Suntory', 'Malaysian cosmetics brands'],
    status: 'Not Yet Qualified',
  },
  'mkt-004': {
    id: 'mkt-004', name: 'Anhui Salicylics CN', country: 'CN', flag: '🇨🇳',
    category: 'Active Ingredients', grade: null, otif: null, tier: 3, channel: 'edi',
    established: 2003, employees: '200–500', revenue: 'USD 20–50M',
    description: 'Specialist BHA manufacturer. GMP certified. Primary supplier to Korean and Japanese beauty brands.',
    longDescription: "Anhui Salicylics Co., Ltd. is a specialist manufacturer of salicylic acid and beta-hydroxy acid (BHA) derivatives for the global cosmetics and pharmaceutical industries. Founded in 2003 in Hefei, Anhui Province, we have grown to become a key supplier to leading Korean, Japanese, and European cosmetic brands. Our products are manufactured under cGMP conditions to USP/EP pharmacopoeia standards. We hold CIQ certification for export and operate a dedicated quality control laboratory with over 30 analytical instruments.",
    materials: [
      { name: 'Salicylic Acid USP 99.5%', moq: '25 KG', leadTime: '14 days', price: 'Request Quote', certifications: ['USP Grade', 'GMP', 'CIQ Cert'] },
      { name: 'BHA Complex 2%', moq: '10 KG', leadTime: '14 days', price: 'Request Quote', certifications: ['GMP', 'CIQ Cert'] },
      { name: 'Mandelic Acid 98%', moq: '5 KG', leadTime: '21 days', price: 'Request Quote', certifications: ['GMP'] },
    ],
    certifications: [
      { name: 'ISO 9001:2015', issuer: 'Intertek China', expiry: '2026-07-20', status: 'valid' },
      { name: 'GMP/CPKB Certification', issuer: 'NMPA China', expiry: '2027-01-10', status: 'valid' },
      { name: 'CIQ Export Certificate', issuer: 'China Customs / GACC', expiry: null, status: 'valid' },
    ],
    halalCert: false, iso9001: true, bpom: false, reach: false,
    keyClients: ['Cosrx (Korea)', 'Dr.Ci:Labo (Japan)', 'INCI Beauty (EU)'],
    status: 'Not Yet Qualified',
  },
};


// ─── Toast ────────────────────────────────────────────────────────────────────
let _tt2: ReturnType<typeof setTimeout> | null = null;
const useToast = () => {
  const [toast, setToast] = useState<string | null>(null);
  const show = (msg: string) => {
    setToast(msg);
    if (_tt2) clearTimeout(_tt2);
    _tt2 = setTimeout(() => setToast(null), 4000);
  };
  return { toast, show };
};
const Toast: React.FC<{ msg: string }> = ({ msg }) => (
  <div style={{ position: 'fixed', bottom: 24, right: 24, background: NAVY, color: 'white',
    borderRadius: 8, padding: '12px 18px', fontSize: 13, maxWidth: 420, lineHeight: 1.5,
    boxShadow: '0 4px 16px rgba(0,0,0,0.25)', zIndex: 9999, borderLeft: `4px solid ${TEAL}` }}>{msg}</div>
);

const gradeColor = (g: string | null) =>
  g === 'A' ? GREEN : g === 'B' ? BLUE : g === 'C' ? AMBER : MUTED;
const certStatusColor = (s: string) =>
  s === 'valid' ? GREEN : s === 'expiring' ? AMBER : RED;
const certStatusLabel = (s: string) =>
  s === 'valid' ? '✅ Valid' : s === 'expiring' ? '⚠️ Expiring' : '❌ Missing';

// Simple SVG country location map
const CountryDot: React.FC<{ country: string; flag: string }> = ({ country, flag }) => {
  const positions: Record<string, { cx: number; cy: number }> = {
    ID:{cx:745,cy:240}, MY:{cx:720,cy:230}, SG:{cx:730,cy:238},
    CN:{cx:730,cy:185}, DE:{cx:510,cy:145}, FR:{cx:498,cy:152},
    SA:{cx:600,cy:225}, IN:{cx:670,cy:220}, US:{cx:200,cy:215},
    JP:{cx:770,cy:190}, BR:{cx:230,cy:310}, AU:{cx:750,cy:340},
  };
  const pos = positions[country] ?? { cx: 450, cy: 220 };
  return (
    <svg viewBox="0 0 900 440" style={{ width: '100%', height: 200 }}>
      <rect width="900" height="440" fill="#EFF6FF" rx="8" />
      <path d="M80 80 L280 80 L310 140 L290 200 L260 240 L200 260 L160 250 L120 230 L80 200 L60 160 Z"
        fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1" />
      <path d="M170 270 L240 270 L250 290 L240 360 L200 400 L170 390 L155 350 L150 310 Z"
        fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1" />
      <path d="M460 80 L580 80 L585 120 L570 160 L540 165 L490 160 L460 140 Z"
        fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1" />
      <path d="M490 180 L580 180 L595 230 L580 340 L540 380 L500 370 L475 320 L470 250 Z"
        fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1" />
      <path d="M575 185 L640 185 L645 230 L610 245 L575 240 Z" fill="#FDE68A" stroke="#F59E0B" strokeWidth="1" />
      <path d="M640 80 L810 80 L820 160 L800 200 L760 210 L700 200 L655 170 L645 130 Z"
        fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1" />
      <path d="M700 210 L770 210 L775 250 L740 270 L700 255 Z" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1" />
      <path d="M720 300 L820 300 L830 380 L770 400 L720 380 Z" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1" />
      {/* Pulse ring */}
      <circle cx={pos.cx} cy={pos.cy} r={18} fill={TEAL} opacity={0.15} />
      <circle cx={pos.cx} cy={pos.cy} r={10} fill={TEAL} />
      <text x={pos.cx} y={pos.cy + 4} textAnchor="middle" fontSize={12}>{flag}</text>
    </svg>
  );
};

const SupplierStorefront: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast, show: showToast } = useToast();
  const { getSupplierProfile, getChannelConfig, isBusinessHours, getLocalTime } = useAdaptive();
  const [activeTab, setActiveTab] = useState<'about' | 'catalog' | 'certs' | 'perf' | 'contact'>('about');

  const data = id ? STOREFRONT_DATA[id] : null;

  if (!data) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: MUTED }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Supplier not found in marketplace</div>
        <button onClick={() => navigate('/marketplace')}
          style={{ marginTop: 16, background: TEAL, color: 'white', border: 'none', borderRadius: 6,
            padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}>
          ← Back to Marketplace
        </button>
      </div>
    );
  }

  const cp = getSupplierProfile(data.country);
  const ch = getChannelConfig(cp.primaryChannel);
  const gc = gradeColor(data.grade);
  const bizHours = isBusinessHours(data.country);
  const localTime = getLocalTime(data.country);

  const TABS = [
    { id: 'about',   label: '📋 About' },
    { id: 'catalog', label: '📦 Materials' },
    { id: 'certs',   label: '🛡️ Certifications' },
    { id: 'perf',    label: '📊 Track Record' },
    { id: 'contact', label: '💬 Contact' },
  ] as const;

  return (
    <div style={{ background: BG, minHeight: '100%' }}>
      {toast && <Toast msg={toast} />}

      {/* Back breadcrumb */}
      <div style={{ padding: '16px 28px 0', background: BG }}>
        <button onClick={() => navigate('/marketplace')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEAL, fontSize: 12, fontWeight: 600, padding: 0 }}>
          ← Marketplace
        </button>
        <span style={{ color: MUTED, fontSize: 12 }}> / {data.name}</span>
      </div>

      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #0F2942 60%, ${TEAL}40 100%)`,
        padding: '28px 28px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 18 }}>
          <span style={{ fontSize: 52 }}>{data.flag}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'white', lineHeight: 1.1, marginBottom: 8 }}>
              {data.name}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <span style={{ background: TEAL, color: 'white', borderRadius: 9999, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>
                {data.category}
              </span>
              <span style={{ background: 'rgba(255,255,255,0.12)', color: '#CBD5E1', borderRadius: 9999, padding: '3px 10px', fontSize: 12 }}>
                Tier {data.tier}
              </span>
              <span style={{ background: 'rgba(255,255,255,0.12)', color: '#CBD5E1', borderRadius: 9999, padding: '3px 10px', fontSize: 12 }}>
                {cp.name} · Est. {data.established}
              </span>
            </div>
            <p style={{ color: '#94A3B8', fontSize: 13, margin: 0, lineHeight: 1.6, maxWidth: 600 }}>
              {data.description}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {data.grade ? (
              <div style={{ width: 72, height: 72, borderRadius: 14, background: gc,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 42, fontWeight: 900, color: 'white', boxShadow: `0 0 0 4px ${gc}44` }}>
                {data.grade}
              </div>
            ) : (
              <div style={{ background: '#FFFBEB', borderRadius: 10, padding: '8px 14px',
                fontSize: 11, fontWeight: 700, color: '#E9730C', textAlign: 'center' }}>
                ⏳ Qualification<br />Pending
              </div>
            )}
          </div>
        </div>
        {/* Trust badges */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          {data.halalCert && <span style={{ background: '#16A34A22', color: '#4ADE80', border: '1px solid #16A34A44', borderRadius: 9999, padding: '4px 12px', fontSize: 11, fontWeight: 600 }}>✅ Halal Certified</span>}
          {data.iso9001   && <span style={{ background: '#2563EB22', color: '#93C5FD', border: '1px solid #2563EB44', borderRadius: 9999, padding: '4px 12px', fontSize: 11, fontWeight: 600 }}>✅ ISO 9001</span>}
          {data.bpom      && <span style={{ background: `${TEAL}22`, color: '#67E8F9', border: `1px solid ${TEAL}44`, borderRadius: 9999, padding: '4px 12px', fontSize: 11, fontWeight: 600 }}>✅ BPOM</span>}
          {data.reach     && <span style={{ background: '#7C3AED22', color: '#C4B5FD', border: '1px solid #7C3AED44', borderRadius: 9999, padding: '4px 12px', fontSize: 11, fontWeight: 600 }}>✅ REACH</span>}
        </div>
        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => showToast(`Opening ${ch.label} channel to contact ${data.name}...`)}
            style={{ background: TEAL, color: 'white', border: 'none', borderRadius: 8,
              padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {ch.icon} Contact via {ch.label}
          </button>
          {data.status === 'Not Yet Qualified' ? (
            <button onClick={() => showToast(`Qualification process initiated for ${data.name}. Compliance team notified.`)}
              style={{ background: AMBER, color: 'white', border: 'none', borderRadius: 8,
                padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Start Qualification →
            </button>
          ) : (
            <button onClick={() => navigate('/buyer/sourcing')}
              style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 8, padding: '10px 22px', fontSize: 13, cursor: 'pointer' }}>
              Create RFQ →
            </button>
          )}
        </div>
      </div>


      {/* Tabs */}
      <div style={{ padding: '0 28px', background: 'white', borderBottom: `2px solid ${BORDER}` }}>
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as typeof activeTab)}
              style={{ padding: '12px 18px', border: 'none', cursor: 'pointer', background: 'transparent',
                borderBottom: activeTab === t.id ? `3px solid ${TEAL}` : '3px solid transparent',
                marginBottom: -2, fontSize: 13, whiteSpace: 'nowrap',
                fontWeight: activeTab === t.id ? 700 : 400,
                color: activeTab === t.id ? TEAL : MUTED }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ padding: '24px 28px' }}>
        {/* About */}
        {activeTab === 'about' && (
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>
            <div>
              <div style={{ background: 'white', borderRadius: 8, padding: '18px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: NAVY, marginBottom: 12 }}>About {data.name}</div>
                <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.8, margin: '0 0 16px' }}>
                  {data.longDescription}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Established', value: `${data.established}` },
                    { label: 'Employees', value: data.employees },
                    { label: 'Annual Revenue', value: data.revenue },
                    { label: 'Country', value: `${data.flag} ${cp.name}` },
                  ].map(r => (
                    <div key={r.label} style={{ background: '#F8FAFC', borderRadius: 6, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: 3 }}>{r.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{r.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: 'white', borderRadius: 8, padding: '16px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: NAVY, marginBottom: 10 }}>Key Clients (Reference)</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {data.keyClients.map(c => (
                    <span key={c} style={{ background: '#F1F5F9', borderRadius: 6, padding: '5px 10px', fontSize: 12, color: NAVY }}>{c}</span>
                  ))}
                </div>
              </div>
            </div>
            <div>
              {/* Country Map */}
              <div style={{ background: 'white', borderRadius: 8, padding: '14px 16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: NAVY, marginBottom: 8 }}>Location</div>
                <CountryDot country={data.country} flag={data.flag} />
                <div style={{ textAlign: 'center', fontSize: 12, color: MUTED, marginTop: 6 }}>{cp.name}</div>
              </div>
              {/* Adaptive Profile */}
              <div style={{ background: 'white', borderRadius: 8, padding: '14px 16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: NAVY, marginBottom: 10 }}>🧠 Adaptive Profile</div>
                {[
                  { label: 'Channel',   value: `${ch.icon} ${ch.label}` },
                  { label: 'Language',  value: `${data.flag} ${cp.languageLabel}` },
                  { label: 'Hours',     value: `${cp.businessHours.start}–${cp.businessHours.end}` },
                  { label: 'Local Time', value: localTime },
                  { label: 'Status',    value: bizHours ? '✅ Open Now' : '🔴 Closed' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', gap: 10, marginBottom: 6, fontSize: 12 }}>
                    <span style={{ width: 80, color: MUTED, flexShrink: 0 }}>{r.label}</span>
                    <span style={{ color: NAVY, fontWeight: 500 }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Materials Catalog */}
        {activeTab === 'catalog' && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: NAVY, marginBottom: 4 }}>Materials We Supply</div>
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>
              Contact us for detailed pricing. All materials available with full documentation.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              {data.materials.map((mat, i) => (
                <div key={i} style={{ background: 'white', borderRadius: 8, padding: '16px 18px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${BORDER}` }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: NAVY, marginBottom: 8 }}>{mat.name}</div>
                  <div style={{ display: 'flex', gap: 14, marginBottom: 10, fontSize: 12 }}>
                    <span style={{ color: MUTED }}>MOQ: <strong style={{ color: NAVY }}>{mat.moq}</strong></span>
                    <span style={{ color: MUTED }}>Lead: <strong style={{ color: NAVY }}>{mat.leadTime}</strong></span>
                    <span style={{ color: TEAL, fontWeight: 600 }}>{mat.price}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
                    {mat.certifications.map(c => (
                      <span key={c} style={{ background: `${GREEN}15`, color: GREEN, borderRadius: 4,
                        padding: '1px 6px', fontSize: 10, fontWeight: 600 }}>{c}</span>
                    ))}
                  </div>
                  <button onClick={() => navigate('/buyer/sourcing')}
                    style={{ width: '100%', padding: '8px 0', background: TEAL, color: 'white',
                      border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Request Quotation →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {activeTab === 'certs' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {data.certifications.map((cert, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 8, padding: '16px 18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                borderLeft: `4px solid ${certStatusColor(cert.status)}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>{cert.name}</span>
                  <span style={{ background: cert.status === 'valid' ? '#F0FDF4' : '#FFFBEB',
                    color: certStatusColor(cert.status), borderRadius: 9999, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>
                    {certStatusLabel(cert.status)}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>Issuer: {cert.issuer}</div>
                {cert.expiry && <div style={{ fontSize: 12, color: MUTED }}>Expires: {cert.expiry}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Track Record */}
        {activeTab === 'perf' && (
          data.status === 'Approved Supplier' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              {[
                { label: 'Grade', value: data.grade ?? '—', color: gradeColor(data.grade) },
                { label: 'OTIF', value: `${data.otif}%`, color: data.otif && data.otif >= 90 ? GREEN : AMBER },
                { label: 'PO Transactions', value: `${data.poCount ?? 0}+`, color: TEAL },
                { label: 'Avg Lead Time', value: data.avgLeadTime ?? '—', color: BLUE },
              ].map(k => (
                <div key={k.label} style={{ background: 'white', borderRadius: 8, padding: '16px 18px', textAlign: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: `4px solid ${k.color}` }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.value}</div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{k.label}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: '#FFFBEB', border: `1px solid ${AMBER}44`, borderRadius: 8,
              padding: '24px', textAlign: 'center', color: '#E9730C' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Qualification Pending</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                This supplier has not yet completed Paragon's qualification process.<br />
                Documents are under review by the compliance team.
              </div>
            </div>
          )
        )}

        {/* Contact */}
        {activeTab === 'contact' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: 'white', borderRadius: 8, padding: '18px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: NAVY, marginBottom: 12 }}>Preferred Communication Channels</div>
              {[
                { key: cp.primaryChannel, label: 'Primary' },
                { key: cp.fallbackChannel, label: 'Fallback' },
              ].map(({ key, label }) => {
                const cfg = CHANNEL_CONFIG[key as keyof typeof CHANNEL_CONFIG];
                return cfg ? (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10,
                    padding: '10px 12px', background: '#F8FAFC', borderRadius: 8,
                    border: label === 'Primary' ? `1px solid ${TEAL}44` : `1px solid ${BORDER}` }}>
                    <span style={{ fontSize: 20 }}>{cfg.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: NAVY }}>{cfg.label}</div>
                      <div style={{ fontSize: 11, color: MUTED }}>{cfg.description}</div>
                    </div>
                    <span style={{ fontSize: 10, background: label === 'Primary' ? TEAL : '#E2E8F0',
                      color: label === 'Primary' ? 'white' : MUTED, borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>
                      {label}
                    </span>
                  </div>
                ) : null;
              })}
              <button onClick={() => showToast(`Message sent to ${data.name} via ${ch.label}.`)}
                style={{ width: '100%', marginTop: 12, padding: '10px', background: TEAL,
                  color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {ch.icon} Send Message via {ch.label}
              </button>
            </div>
            <div style={{ background: 'white', borderRadius: 8, padding: '18px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: NAVY, marginBottom: 12 }}>Business Hours</div>
              <div style={{ fontSize: 13, color: NAVY, marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>{cp.businessHours.start} – {cp.businessHours.end}</span>
                <span style={{ color: MUTED }}> ({cp.timezone})</span>
              </div>
              <div style={{ marginBottom: 12 }}>
                {bizHours ? (
                  <span style={{ background: '#F0FDF4', color: GREEN, borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600 }}>
                    ✅ Open Now — {localTime} local
                  </span>
                ) : (
                  <span style={{ background: '#FEF2F2', color: RED, borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600 }}>
                    🔴 Closed — {localTime} local
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
                <strong style={{ color: NAVY }}>Language:</strong> {cp.languageLabel}<br />
                <strong style={{ color: NAVY }}>Tone:</strong> {cp.tone === 'conversational' ? '🤝 Conversational' : '💼 Formal'}<br />
                <strong style={{ color: NAVY }}>Cultural Notes:</strong> {cp.culturalNotes.slice(0, 120)}...
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierStorefront;
