import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockSuppliers } from '../../data/mockSuppliers';
import { ScorecardGrade } from '../../types/supplier.types';

const TEAL  = '#0097A7';
const NAVY  = '#0D1B2A';
const GREEN = '#16A34A';
const AMBER = '#D97706';
const RED   = '#DC2626';
const BLUE  = '#2563EB';
const BORDER = '#E2E8F0';
const MUTED  = '#64748B';
const BG     = '#F0F4F8';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MktSupplier {
  id: string;
  name: string;
  country: string;
  flag: string;
  category: string;
  grade: string | null;
  otif: number | null;
  halalCert: boolean;
  iso9001: boolean;
  bpom: boolean;
  reach: boolean;
  tier: number;
  channel: string;
  establishedYear: number;
  employees: string;
  annualRevenue: string;
  description: string;
  materials: string[];
  status: 'Approved Supplier' | 'Not Yet Qualified';
  responseSpeed: string;
  existingSupplierId?: string; // links to /buyer/suppliers/:id
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MARKETPLACE_SUPPLIERS: MktSupplier[] = [
  {
    id: 'sup-001', name: 'PT Ecogreen Oleochemicals', country: 'ID', flag: '🇮🇩',
    category: 'Halal Emulsifiers', grade: ScorecardGrade.A, otif: 95,
    halalCert: true, iso9001: true, bpom: true, reach: false, tier: 3, channel: 'api',
    establishedYear: 1995, employees: '1,000–2,500', annualRevenue: 'Rp 800+ Miliar',
    description: 'Indonesia\'s leading oleochemical producer. Supplies palm-derived fatty acids, glycerine, and emulsifiers to FMCG companies. BPJPH certified.',
    materials: ['Fatty Acids', 'Glycerine USP', 'Sorbitol Solution'],
    status: 'Approved Supplier', responseSpeed: '<12h', existingSupplierId: 'sup-001',
  },
  {
    id: 'sup-002', name: 'PT Musim Mas Specialty Fats', country: 'ID', flag: '🇮🇩',
    category: 'Halal Emulsifiers', grade: ScorecardGrade.A, otif: 91,
    halalCert: true, iso9001: true, bpom: true, reach: false, tier: 2, channel: 'web',
    establishedYear: 1972, employees: '5,000–10,000', annualRevenue: 'USD 2B+',
    description: 'World-class palm oil processor and specialty fats manufacturer. Certified RSPO, BPJPH. Supplies emollients and emulsifiers to personal care globally.',
    materials: ['Palm Kernel Oil', 'Specialty Emulsifiers', 'Stearic Acid'],
    status: 'Approved Supplier', responseSpeed: '<24h', existingSupplierId: 'sup-002',
  },
  {
    id: 'sup-009', name: 'Zhejiang NHU Vitamins Co.', country: 'CN', flag: '🇨🇳',
    category: 'Active Ingredients', grade: ScorecardGrade.B, otif: 85,
    halalCert: false, iso9001: true, bpom: true, reach: true, tier: 2, channel: 'web',
    establishedYear: 1999, employees: '5,000+', annualRevenue: 'CNY 8B+',
    description: 'China\'s largest vitamin manufacturer. Produces Vitamin E, Vitamin A, and Carotenoids for cosmetic and nutraceutical markets worldwide. GMP certified.',
    materials: ['Vitamin E (dl-alpha)', 'Retinol Acetate', 'Beta-Carotene'],
    status: 'Approved Supplier', responseSpeed: '<24h', existingSupplierId: 'sup-009',
  },
  {
    id: 'sup-006', name: 'Evonik Specialty Chemicals', country: 'FR', flag: '🇫🇷',
    category: 'Active Ingredients', grade: ScorecardGrade.B, otif: 87,
    halalCert: false, iso9001: true, bpom: true, reach: true, tier: 2, channel: 'email',
    establishedYear: 1920, employees: '33,000+', annualRevenue: 'EUR 15B+',
    description: 'Global specialty chemicals leader. Personal care division supplies amino acid-based ingredients, silicones, and UV filters. REACH compliant.',
    materials: ['Amino Acid Surfactants', 'Silicone Fluids', 'UV Absorbers'],
    status: 'Approved Supplier', responseSpeed: '<48h', existingSupplierId: 'sup-006',
  },
  {
    id: 'mkt-001', name: 'PT Indesso Aroma Indonesia', country: 'ID', flag: '🇮🇩',
    category: 'Fragrance & Aroma', grade: null, otif: null,
    halalCert: true, iso9001: true, bpom: true, reach: false, tier: 2, channel: 'web',
    establishedYear: 1968, employees: '500–1,000', annualRevenue: 'USD 50–100M',
    description: 'Indonesia\'s leading fragrance manufacturer. Supplies to major Indonesian FMCG companies. BPJPH certified. Specializes in floral, oriental, and fresh accords for personal care.',
    materials: ['Floral Fragrance Accords', 'Essential Oils', 'Aroma Chemicals'],
    status: 'Not Yet Qualified', responseSpeed: '<24h',
  },
  {
    id: 'mkt-002', name: 'Givaudan Fragrance Singapore', country: 'SG', flag: '🇸🇬',
    category: 'Fragrance & Aroma', grade: ScorecardGrade.A, otif: 96,
    halalCert: true, iso9001: true, bpom: false, reach: true, tier: 3, channel: 'api',
    establishedYear: 1895, employees: '10,000+', annualRevenue: 'CHF 7B+',
    description: 'World\'s largest fragrance and flavour company. Singapore hub serves SEA markets. API-connected. Full halal certification across fragrance portfolio.',
    materials: ['Fine Fragrance Compounds', 'Functional Fragrance', 'Naturals & Captives'],
    status: 'Approved Supplier', responseSpeed: '<12h',
  },
  {
    id: 'mkt-003', name: 'Univar Solutions Malaysia', country: 'MY', flag: '🇲🇾',
    category: 'Active Ingredients', grade: null, otif: null,
    halalCert: true, iso9001: true, bpom: false, reach: true, tier: 2, channel: 'web',
    establishedYear: 1924, employees: '10,000+', annualRevenue: 'USD 10B+',
    description: 'Global chemical and ingredient distributor with Malaysia hub. Distributes BASF, Evonik, Croda, DSM ingredients across SEA. JAKIM halal certified.',
    materials: ['Hyaluronic Acid', 'Vitamin C Derivatives', 'Niacinamide', 'Peptides'],
    status: 'Not Yet Qualified', responseSpeed: '<24h',
  },
  {
    id: 'mkt-004', name: 'Anhui Salicylics CN', country: 'CN', flag: '🇨🇳',
    category: 'Active Ingredients', grade: null, otif: null,
    halalCert: false, iso9001: true, bpom: false, reach: false, tier: 3, channel: 'edi',
    establishedYear: 2003, employees: '200–500', annualRevenue: 'USD 20–50M',
    description: 'Specialist manufacturer of salicylic acid and BHA derivatives for cosmetics. GMP certified. Primary supplier to Korean and Japanese beauty brands.',
    materials: ['Salicylic Acid USP', 'BHA Complex', 'Mandelic Acid'],
    status: 'Not Yet Qualified', responseSpeed: '<48h',
  },
];

const CATEGORIES = [
  { icon:'🧪', category:'Active Ingredients',        count:34, color:'#0097A7' },
  { icon:'✦', category:'Natural & Botanical',       count:28, color:'#107E3E' },
  { icon:'💧', category:'Surfactants & Emulsifiers', count:22, color:'#0097A7' },
  { icon:'✦', category:'Fragrance & Aroma',         count:18, color:'#0D1B2A' },
  { icon:'✓', category:'Halal Emulsifiers',         count:15, color:'#E9730C' },
  { icon:'🧴', category:'Preservatives',             count:12, color:'#354A5F' },
  { icon:'↓', category:'Primary Packaging',         count:31, color:'#0097A7' },
  { icon:'📫', category:'Secondary Packaging',       count:24, color:'#107E3E' },
  { icon:'🏷️', category:'Labels & Print',            count:19, color:'#0097A7' },
  { icon:'♻️', category:'Sustainable Packaging',     count:11, color:'#0D1B2A' },
  { icon:'🔬', category:'Testing & Certification',   count: 8, color:'#E9730C' },
  { icon:'i', category:'Contract Manufacturing',    count: 6, color:'#354A5F' },
];

const OPEN_RFQS = [
  { num: 'RFQ-2026-002', material: 'PET Bottle 100ml Airless Pump',    qty: '50,000 PCS', deadline: 'Apr 15' },
  { num: 'RFQ-2026-004', material: 'Givaudan Floral Accord Wardah',    qty: '100 KG',     deadline: 'Apr 18' },
  { num: 'RFQ-2026-008', material: 'Folding Carton 180gsm Emina',      qty: '150,000 PCS', deadline: 'Apr 20' },
];

const COUNTRIES = [
  { code:'ID', name:'Indonesia', count:89, flag:'🇮🇩' },
  { code:'CN', name:'China',     count:42, flag:'🇨🇳' },
  { code:'DE', name:'Germany',   count:31, flag:'🇩🇪' },
  { code:'FR', name:'France',    count:24, flag:'🇫🇷' },
  { code:'SG', name:'Singapore', count:18, flag:'🇸🇬' },
  { code:'IN', name:'India',     count:15, flag:'🇮🇳' },
  { code:'MY', name:'Malaysia',  count:12, flag:'🇲🇾' },
  { code:'--', name:'Other',     count:16, flag:'🌍' },
];


// ─── Toast ────────────────────────────────────────────────────────────────────
let _tt: ReturnType<typeof setTimeout> | null = null;
const useToast = () => {
  const [toast, setToast] = useState<string | null>(null);
  const show = (msg: string) => {
    setToast(msg);
    if (_tt) clearTimeout(_tt);
    _tt = setTimeout(() => setToast(null), 4000);
  };
  return { toast, show };
};
const Toast: React.FC<{ msg: string }> = ({ msg }) => (
  <div style={{ position: 'fixed', bottom: 24, right: 24, background: NAVY, color: 'white',
    borderRadius: 8, padding: '12px 18px', fontSize: 13, maxWidth: 420, lineHeight: 1.5,
    boxShadow: '0 4px 16px rgba(0,0,0,0.25)', zIndex: 9999, borderLeft: `4px solid ${TEAL}` }}>{msg}</div>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const gradeColor = (g: string | null) =>
  g === 'A' ? GREEN : g === 'B' ? BLUE : g === 'C' ? AMBER : MUTED;
const gradeBg = (g: string | null) =>
  g === 'A' ? '#F0FDF4' : g === 'B' ? '#EFF6FF' : g === 'C' ? '#FFFBEB' : '#F8FAFC';

const channelIcon: Record<string, string> = {
  whatsapp: 'WA', wechat: 'Chat', email: 'Email', api: 'API', edi: 'Link', web: 'Web',
};
const channelLabel: Record<string, string> = {
  whatsapp: 'WhatsApp', wechat: 'WeChat', email: 'Email', api: 'REST API', edi: 'EDI', web: 'Web Portal',
};

// ─── Supplier Marketplace Card ────────────────────────────────────────────────
const SupplierMktCard: React.FC<{
  s: MktSupplier;
  onToast: (msg: string) => void;
}> = ({ s, onToast }) => {
  const navigate = useNavigate();
  const catColor = CATEGORIES.find(c => c.category === s.category)?.color ?? TEAL;

  return (
    <div style={{ background: 'white', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      border: `1px solid ${BORDER}`, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      transition: 'box-shadow 0.15s' }}>
      {/* Top row */}
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22 }}>{s.flag}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: NAVY, lineHeight: 1.2 }}>{s.name}</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{s.country} · Est. {s.establishedYear}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          {s.grade ? (
            <span style={{ background: gradeBg(s.grade), color: gradeColor(s.grade), fontWeight: 800,
              fontSize: 14, borderRadius: 6, padding: '2px 8px', border: `1px solid ${gradeColor(s.grade)}44` }}>
              Grade {s.grade}
            </span>
          ) : (
            <span style={{ background: '#FEF9C3', color: '#E9730C', borderRadius: 9999,
              padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>NEW</span>
          )}
          <span style={{
            background: s.status === 'Approved Supplier' ? '#F0FDF4' : '#FEF9C3',
            color: s.status === 'Approved Supplier' ? GREEN : '#E9730C',
            borderRadius: 9999, padding: '1px 7px', fontSize: 10, fontWeight: 600,
          }}>{s.status}</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px', flex: 1 }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ background: catColor + '18', color: catColor,
            borderRadius: 9999, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
            {s.category}
          </span>
        </div>
        <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.6, margin: '0 0 10px',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {s.description}
        </p>
        {/* Materials */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
          {s.materials.slice(0, 3).map(m => (
            <span key={m} style={{ background: '#F1F5F9', color: NAVY, borderRadius: 4,
              padding: '2px 6px', fontSize: 10 }}>{m}</span>
          ))}
          {s.materials.length > 3 && (
            <span style={{ background: '#F1F5F9', color: MUTED, borderRadius: 4,
              padding: '2px 6px', fontSize: 10 }}>+{s.materials.length - 3} more</span>
          )}
        </div>
        {/* Metrics */}
        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: MUTED, marginBottom: 8 }}>
          <span>{s.otif != null ? `OTIF ${s.otif}%` : '— Not yet rated'}</span>
          <span> {s.responseSpeed}</span>
          <span style={{ marginLeft: 'auto', background: '#F1F5F9', borderRadius: 4, padding: '1px 6px' }}>
            {channelIcon[s.channel]} {channelLabel[s.channel]}
          </span>
        </div>
        {/* Certifications */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {s.halalCert && <span style={{ fontSize: 10, color: GREEN }}>✓ Halal</span>}
          {s.iso9001  && <span style={{ fontSize: 10, color: BLUE }}>✓ ISO 9001</span>}
          {s.bpom     && <span style={{ fontSize: 10, color: TEAL }}>✓ BPOM</span>}
          {s.reach    && <span style={{ fontSize: 10, color: '#0D1B2A' }}>✓ REACH</span>}
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '10px 14px', borderTop: `1px solid ${BORDER}`,
        display: 'flex', gap: 8, background: '#FAFAFA' }}>
        {s.status === 'Approved Supplier' ? (
          <>
            <button onClick={() => navigate(s.existingSupplierId
              ? `/buyer/suppliers/${s.existingSupplierId}`
              : `/marketplace/supplier/${s.id}`)}
              style={{ flex: 1, padding: '7px 0', background: TEAL, color: 'white',
                border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              View Profile →
            </button>
            <button onClick={() => navigate('/buyer/sourcing')}
              style={{ flex: 1, padding: '7px 0', background: 'white', color: NAVY,
                border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
              Create RFQ
            </button>
          </>
        ) : (
          <>
            <button onClick={() => onToast(`Qualification process initiated for ${s.name}. Compliance team notified.`)}
              style={{ flex: 1, padding: '7px 0', background: AMBER, color: 'white',
                border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Start Qualification →
            </button>
            <button onClick={() => navigate(`/marketplace/supplier/${s.id}`)}
              style={{ flex: 1, padding: '7px 0', background: 'white', color: NAVY,
                border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
              View Storefront
            </button>
          </>
        )}
      </div>
    </div>
  );
};


// ─── Filter Sidebar ───────────────────────────────────────────────────────────
const FilterSidebar: React.FC<{
  selectedCountries: string[];
  toggleCountry: (c: string) => void;
  selectedCerts: string[];
  toggleCert: (c: string) => void;
  selectedGrades: string[];
  toggleGrade: (g: string) => void;
  onClear: () => void;
}> = ({ selectedCountries, toggleCountry, selectedCerts, toggleCert, selectedGrades, toggleGrade, onClear }) => {
  const CERTS = ['Halal Certified', 'BPOM Registered', 'ISO 9001:2015', 'REACH Compliant', 'FDA Registered', 'RSPO Certified', 'GMP/CPKB'];
  const sectionTitle = (t: string) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase',
      letterSpacing: '1.5px', marginBottom: 8, marginTop: 14 }}>{t}</div>
  );
  const cbRow = (label: string, checked: boolean, onChange: () => void, sub?: string) => (
    <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
      marginBottom: 6, fontSize: 12 }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ accentColor: TEAL, width: 13, height: 13 }} />
      <span style={{ color: NAVY, flex: 1 }}>{label}</span>
      {sub && <span style={{ fontSize: 10, color: MUTED }}>{sub}</span>}
    </label>
  );
  return (
    <div style={{ background: 'white', borderRadius: 8, padding: '14px 16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)', position: 'sticky', top: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>Filters</span>
        <button onClick={onClear} style={{ background: 'none', border: 'none', cursor: 'pointer',
          color: TEAL, fontSize: 11, fontWeight: 600 }}>Clear all</button>
      </div>
      {sectionTitle('Country')}
      {COUNTRIES.map(c => cbRow(`${c.flag} ${c.name}`, selectedCountries.includes(c.code), () => toggleCountry(c.code), `(${c.count})`))}
      {sectionTitle('Certifications')}
      {CERTS.map(c => cbRow(c, selectedCerts.includes(c), () => toggleCert(c)))}
      {sectionTitle('Supplier Grade')}
      {['A', 'B', 'C'].map(g => cbRow(`Grade ${g}`, selectedGrades.includes(g), () => toggleGrade(g)))}
    </div>
  );
};

// ─── Main Discovery Page ──────────────────────────────────────────────────────
const MarketplaceDiscovery: React.FC = () => {
  const navigate = useNavigate();
  const { toast, show: showToast } = useToast();
  const [search, setSearch]                   = useState('');
  const [activeCat, setActiveCat]             = useState<string | null>(null);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedCerts, setSelectedCerts]     = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades]   = useState<string[]>([]);
  const [sortBy, setSortBy]                   = useState<'relevance' | 'grade' | 'otif' | 'speed'>('relevance');
  const [showAllCats, setShowAllCats]         = useState(false);

  const toggleCountry = (c: string) => setSelectedCountries(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);
  const toggleCert    = (c: string) => setSelectedCerts(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);
  const toggleGrade   = (g: string) => setSelectedGrades(p => p.includes(g) ? p.filter(x => x !== g) : [...p, g]);
  const clearAll      = () => { setSelectedCountries([]); setSelectedCerts([]); setSelectedGrades([]); setActiveCat(null); setSearch(''); };

  const filtered = useMemo(() => {
    let list = [...MARKETPLACE_SUPPLIERS];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.country.toLowerCase().includes(q) ||
        s.materials.some(m => m.toLowerCase().includes(q))
      );
    }
    if (activeCat) list = list.filter(s => s.category === activeCat);
    if (selectedCountries.length > 0) list = list.filter(s => selectedCountries.includes(s.country));
    if (selectedGrades.length > 0) list = list.filter(s => s.grade && selectedGrades.includes(s.grade));
    if (selectedCerts.includes('Halal Certified'))   list = list.filter(s => s.halalCert);
    if (selectedCerts.includes('ISO 9001:2015'))     list = list.filter(s => s.iso9001);
    if (selectedCerts.includes('BPOM Registered'))   list = list.filter(s => s.bpom);
    if (selectedCerts.includes('REACH Compliant'))   list = list.filter(s => s.reach);
    if (sortBy === 'grade') list.sort((a, b) => (a.grade ?? 'Z').localeCompare(b.grade ?? 'Z'));
    if (sortBy === 'otif')  list.sort((a, b) => (b.otif ?? 0) - (a.otif ?? 0));
    return list;
  }, [search, activeCat, selectedCountries, selectedGrades, selectedCerts, sortBy]);

  const displayedCats = showAllCats ? CATEGORIES : CATEGORIES.slice(0, 8);

  return (
    <div style={{ background: BG, minHeight: '100%' }}>
      {toast && <Toast msg={toast} />}

      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1A3254 100%)`, padding: '40px 28px 32px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 34, fontWeight: 800, color: 'white', lineHeight: 1.1 }}>
            Paragon Supplier Marketplace
          </h1>
          <p style={{ margin: '0 0 24px', fontSize: 15, color: TEAL, fontWeight: 500 }}>
            Discover qualified suppliers for beauty & personal care — globally
          </p>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
              fontSize: 18, color: MUTED }}></span>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by material, category, country, or certification..."
              style={{ width: '100%', padding: '14px 14px 14px 46px', borderRadius: 10, border: 'none',
                fontSize: 14, outline: 'none', boxSizing: 'border-box',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }} />
          </div>
          {/* Quick filters */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
            {[
              { label: '✦ Halal Certified', cert: 'Halal Certified' },
              { label: '🇮🇩 Indonesian Suppliers', country: 'ID' },
              { label: 'Grade A Suppliers', grade: 'A' },
            ].map(qf => (
              <button key={qf.label}
                onClick={() => {
                  if (qf.cert) toggleCert(qf.cert);
                  if (qf.country) toggleCountry(qf.country);
                  if (qf.grade) toggleGrade(qf.grade);
                }}
                style={{ padding: '7px 16px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.25)',
                  background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: 12,
                  cursor: 'pointer', fontWeight: 500 }}>
                {qf.label}
              </button>
            ))}
          </div>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['247 Qualified Suppliers', '48 Countries', '12 Material Categories', '89% Halal Coverage'].map(s => (
              <span key={s} style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>{s}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Category Grid */}
      <div style={{ padding: '24px 28px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: NAVY }}>Browse by Category</span>
          {activeCat && (
            <button onClick={() => setActiveCat(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEAL, fontSize: 12, fontWeight: 600 }}>
              Clear ×
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 8 }}>
          {displayedCats.map(c => (
            <div key={c.category} onClick={() => setActiveCat(activeCat === c.category ? null : c.category)}
              style={{ background: activeCat === c.category ? c.color : 'white', borderRadius: 8, padding: '12px 14px',
                cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                border: `1px solid ${activeCat === c.category ? c.color : BORDER}`,
                transition: 'all 0.15s' }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{c.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: activeCat === c.category ? 'white' : NAVY,
                lineHeight: 1.3 }}>{c.category}</div>
              <div style={{ fontSize: 10, color: activeCat === c.category ? 'rgba(255,255,255,0.7)' : MUTED,
                marginTop: 2 }}>{c.count} suppliers</div>
            </div>
          ))}
        </div>
        {CATEGORIES.length > 8 && (
          <button onClick={() => setShowAllCats(!showAllCats)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEAL, fontSize: 12, fontWeight: 600 }}>
            {showAllCats ? '▲ Show less' : `▼ Show ${CATEGORIES.length - 8} more categories`}
          </button>
        )}
      </div>

      {/* Main content: filter sidebar + results */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16, padding: '20px 28px' }}>
        {/* Filter sidebar */}
        <FilterSidebar
          selectedCountries={selectedCountries} toggleCountry={toggleCountry}
          selectedCerts={selectedCerts}         toggleCert={toggleCert}
          selectedGrades={selectedGrades}       toggleGrade={toggleGrade}
          onClear={clearAll}
        />

        {/* Results */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>
              {filtered.length} supplier{filtered.length !== 1 ? 's' : ''} found
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: MUTED }}>
              <span>Sort by:</span>
              {(['relevance', 'grade', 'otif', 'speed'] as const).map(s => (
                <button key={s} onClick={() => setSortBy(s)}
                  style={{ padding: '4px 10px', borderRadius: 4, border: `1px solid ${sortBy === s ? TEAL : BORDER}`,
                    background: sortBy === s ? `${TEAL}15` : 'white', color: sortBy === s ? TEAL : MUTED,
                    fontSize: 11, cursor: 'pointer', fontWeight: sortBy === s ? 700 : 400,
                    textTransform: 'capitalize' }}>
                  {s === 'otif' ? 'OTIF' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {filtered.map(s => <SupplierMktCard key={s.id} s={s} onToast={showToast} />)}
            {filtered.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: MUTED }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}></div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>No suppliers match your filters</div>
                <button onClick={clearAll} style={{ marginTop: 12, background: TEAL, color: 'white',
                  border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 12, cursor: 'pointer' }}>
                  Clear all filters
                </button>
              </div>
            )}
          </div>

          {/* Open RFQ Opportunities */}
          <div style={{ marginTop: 32, background: `linear-gradient(135deg, ${NAVY} 0%, #1A3254 100%)`,
            borderRadius: 10, padding: '20px 24px' }}>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
               Open RFQ Opportunities — Paragon is actively sourcing
            </div>
            <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 16 }}>
              Qualified suppliers can submit quotations for these active requirements
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {OPEN_RFQS.map(rfq => (
                <div key={rfq.num} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8,
                  padding: '14px 16px', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div style={{ fontSize: 11, color: TEAL, fontWeight: 600, marginBottom: 4 }}>{rfq.num}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 8, lineHeight: 1.3 }}>
                    {rfq.material}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94A3B8', marginBottom: 10 }}>
                    <span>↓ {rfq.qty}</span>
                    <span>⏰ {rfq.deadline}</span>
                  </div>
                  <button onClick={() => showToast('Expression of interest submitted. Paragon procurement team will contact you within 2 business days.')}
                    style={{ width: '100%', padding: '8px 0', background: TEAL, color: 'white',
                      border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    I Can Supply This →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceDiscovery;
