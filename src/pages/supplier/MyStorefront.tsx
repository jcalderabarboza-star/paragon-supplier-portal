import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockSuppliers } from '../../data/mockSuppliers';
import { useAdaptive } from '../../context/AdaptiveContext';
import { CHANNEL_CONFIG } from '../../data/communicationProfiles';

const TEAL  = '#0097A7';
const NAVY  = '#0D1B2A';
const GREEN = '#16A34A';
const AMBER = '#D97706';
const RED   = '#DC2626';
const BLUE  = '#2563EB';
const BORDER = '#E2E8F0';
const MUTED  = '#64748B';
const BG     = '#F0F4F8';

// ─── Data ─────────────────────────────────────────────────────────────────────
const SUPPLIER_ID = 'sup-007';
const supp = mockSuppliers.find(s => s.id === SUPPLIER_ID)!;

const INITIAL_CATALOG = [
  { id: 'c1', material: 'PET Bottle 100ml Airless Pump', sapCode: 'MAT-10045', category: 'Packaging Primary', moq: '10,000', uom: 'PCS', leadTime: '14', unitPrice: '3,700', currency: 'IDR', certs: ['Halal BPJPH', 'ISO 9001'], capacity: '200,000', visible: true },
  { id: 'c2', material: 'PET Bottle 200ml Standard Pump', sapCode: 'MAT-10046', category: 'Packaging Primary', moq: '10,000', uom: 'PCS', leadTime: '14', unitPrice: '4,200', currency: 'IDR', certs: ['Halal BPJPH', 'ISO 9001'], capacity: '150,000', visible: true },
  { id: 'c3', material: 'Airless Pump 15ml Travel Size', sapCode: 'MAT-10089', category: 'Packaging Secondary', moq: '5,000', uom: 'PCS', leadTime: '21', unitPrice: '2,800', currency: 'IDR', certs: ['ISO 9001'], capacity: '100,000', visible: true },
];

const PROFILE_CERTS = [
  { name: 'BPOM Registration',     visible: true,  status: 'valid',    expiry: '2026-12-31' },
  { name: 'ISO 9001:2015',         visible: true,  status: 'valid',    expiry: '2026-08-14' },
  { name: 'BPJPH Halal Cert',      visible: false, status: 'missing',  expiry: null },
  { name: 'SNI Compliance',        visible: true,  status: 'expiring', expiry: '2026-05-01' },
];

const COMPLETENESS_ITEMS = [
  { label: 'Company description', done: true },
  { label: 'Materials catalog (3 items)', done: true },
  { label: 'BPOM Registration', done: true },
  { label: 'ISO 9001 Certificate', done: true },
  { label: 'BPJPH Halal Certificate', done: false },
  { label: 'Annual manufacturing capacity', done: false },
  { label: 'Key clients / references', done: false },
  { label: 'Profile photo / facility image', done: false },
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

const SCard: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, action, children }) => (
  <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16, overflow: 'hidden' }}>
    <div style={{ padding: '12px 18px', borderBottom: `1px solid ${BORDER}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>{title}</span>
      {action}
    </div>
    <div style={{ padding: '16px 18px' }}>{children}</div>
  </div>
);

const EditBtn: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button onClick={onClick} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6,
    padding: '4px 12px', fontSize: 11, cursor: 'pointer', color: MUTED }}>✏️ Edit</button>
);


// ─── Add Material Form ────────────────────────────────────────────────────────
const AddMaterialForm: React.FC<{
  onSubmit: (mat: typeof INITIAL_CATALOG[0]) => void;
  onCancel: () => void;
  showToast: (m: string) => void;
}> = ({ onSubmit, onCancel, showToast }) => {
  const [form, setForm] = useState({
    material: '', sapCode: '', category: 'Packaging Primary', moq: '', uom: 'PCS',
    leadTime: '', unitPrice: '', currency: 'IDR',
    certs: [] as string[], capacity: '',
  });
  const certOptions = ['Halal BPJPH', 'ISO 9001', 'BPOM', 'SNI', 'RSPO'];

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const toggleCert = (c: string) =>
    setForm(p => ({ ...p, certs: p.certs.includes(c) ? p.certs.filter(x => x !== c) : [...p.certs, c] }));

  const handleSubmit = () => {
    if (!form.material) { showToast('Material name is required'); return; }
    onSubmit({ id: 'c' + Date.now(), ...form, visible: true });
    showToast('New material submitted for Paragon procurement review. You will be notified within 3 business days.');
  };

  const fld = (label: string, key: string, type = 'text', placeholder = '') => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
        {label}
      </label>
      <input type={type} value={(form as any)[key]} onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '8px 10px', border: `1px solid ${BORDER}`, borderRadius: 6,
          fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
    </div>
  );

  return (
    <div style={{ background: '#F8FAFC', border: `1px solid ${TEAL}33`, borderRadius: 8, padding: '16px 18px', marginTop: 12 }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: NAVY, marginBottom: 14 }}>Add New Material</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {fld('Material Name *', 'material', 'text', 'e.g. PET Bottle 250ml')}
        {fld('SAP Code (optional)', 'sapCode', 'text', 'e.g. MAT-10099')}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Category</label>
          <select value={form.category} onChange={e => set('category', e.target.value)}
            style={{ width: '100%', padding: '8px 10px', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, background: 'white' }}>
            {['Packaging Primary', 'Packaging Secondary', 'Labels & Print', 'Sustainable Packaging'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>{fld('MOQ *', 'moq', 'number')}</div>
          <div style={{ width: 80, marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>UoM</label>
            <select value={form.uom} onChange={e => set('uom', e.target.value)}
              style={{ width: '100%', padding: '8px 6px', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, background: 'white' }}>
              {['PCS', 'KG', 'L', 'MT'].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
        {fld('Lead Time (days)', 'leadTime', 'number')}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>{fld('Unit Price', 'unitPrice', 'number')}</div>
          <div style={{ width: 80, marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>CCY</label>
            <select value={form.currency} onChange={e => set('currency', e.target.value)}
              style={{ width: '100%', padding: '8px 6px', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, background: 'white' }}>
              {['IDR', 'USD', 'EUR'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        {fld('Capacity/Month (PCS)', 'capacity', 'number')}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Certifications</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {certOptions.map(c => (
              <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}>
                <input type="checkbox" checked={form.certs.includes(c)} onChange={() => toggleCert(c)} style={{ accentColor: TEAL }} />
                {c}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button onClick={handleSubmit}
          style={{ background: TEAL, color: 'white', border: 'none', borderRadius: 6,
            padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Submit for Review
        </button>
        <button onClick={onCancel}
          style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 6,
            padding: '9px 16px', fontSize: 13, cursor: 'pointer', color: MUTED }}>
          Cancel
        </button>
      </div>
    </div>
  );
};


// ─── Main Page ────────────────────────────────────────────────────────────────
const MyStorefront: React.FC = () => {
  const navigate = useNavigate();
  const { toast, show: showToast } = useToast();
  const { getSupplierProfile, isBusinessHours, getLocalTime } = useAdaptive();

  const cp = getSupplierProfile(supp.country);
  const bizHours = isBusinessHours(supp.country);
  const localTime = getLocalTime(supp.country);

  // State
  const [catalog, setCatalog] = useState(INITIAL_CATALOG);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const [description, setDescription] = useState(
    'Leading manufacturer of PET packaging and airless pump systems for beauty and personal care. BPOM registered. ISO 9001:2015 certified. Serving Indonesia\'s top beauty brands since 2005.'
  );
  const [bizHoursStart, setBizHoursStart] = useState('08:00');
  const [bizHoursEnd, setBizHoursEnd] = useState('17:00');
  const [certs, setCerts] = useState(PROFILE_CERTS);
  const [statsExpanded, setStatsExpanded] = useState(false);

  const completeness = useMemo(() => {
    const done = COMPLETENESS_ITEMS.filter(i => i.done).length;
    return Math.round((done / COMPLETENESS_ITEMS.length) * 100);
  }, []);

  const toggleCertVisibility = (idx: number) => {
    setCerts(prev => prev.map((c, i) => i === idx ? { ...c, visible: !c.visible } : c));
  };

  const certStatusColor = (s: string) => s === 'valid' ? GREEN : s === 'expiring' ? AMBER : RED;
  const certStatusBg    = (s: string) => s === 'valid' ? '#F0FDF4' : s === 'expiring' ? '#FFFBEB' : '#FEF2F2';

  return (
    <div style={{ padding: '24px 28px', background: BG, minHeight: '100%' }}>
      {toast && <Toast msg={toast} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: NAVY }}>My Supplier Storefront</h1>
          <div style={{ fontSize: 13, color: MUTED }}>
            Your public profile in the Paragon Supplier Marketplace — {supp.name}
          </div>
        </div>
        <button onClick={() => navigate('/marketplace/supplier/sup-007')}
          style={{ background: TEAL, color: 'white', border: 'none', borderRadius: 6,
            padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Preview Public Profile →
        </button>
      </div>

      {/* Profile Completeness */}
      <div style={{ background: 'white', borderRadius: 8, padding: '16px 20px', marginBottom: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: NAVY }}>Profile Completeness</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: completeness >= 80 ? GREEN : AMBER }}>
                {completeness}%
              </span>
            </div>
            <div style={{ height: 10, background: '#F1F5F9', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ width: `${completeness}%`, height: '100%',
                background: completeness >= 80 ? GREEN : AMBER,
                borderRadius: 5, transition: 'width 0.5s' }} />
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
              {COMPLETENESS_ITEMS.map(item => (
                <span key={item.label} style={{ fontSize: 11, color: item.done ? GREEN : RED }}>
                  {item.done ? '✅' : '❌'} {item.label}
                </span>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: completeness >= 80 ? GREEN : AMBER }}>
              {completeness}%
            </div>
            <div style={{ fontSize: 10, color: MUTED }}>Complete</div>
          </div>
        </div>
      </div>

      {/* 1 — Company Profile */}
      <SCard title="1️⃣  Company Profile" action={<EditBtn onClick={() => setEditProfile(!editProfile)} />}>
        {editProfile ? (
          <div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                Company Description
              </label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
                style={{ width: '100%', padding: '9px 10px', border: `1px solid ${BORDER}`, borderRadius: 6,
                  fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setEditProfile(false); showToast('Company profile updated'); }}
                style={{ background: TEAL, color: 'white', border: 'none', borderRadius: 6,
                  padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save</button>
              <button onClick={() => setEditProfile(false)}
                style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 6,
                  padding: '8px 14px', fontSize: 13, cursor: 'pointer', color: MUTED }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Legal Name',   value: supp.legalName ?? supp.name },
              { label: 'Country',      value: `${cp.flag} ${cp.name}` },
              { label: 'Category',     value: supp.category },
              { label: 'Established',  value: supp.founded ? `${supp.founded}` : '—' },
              { label: 'Employees',    value: supp.employees ?? '—' },
              { label: 'Revenue',      value: supp.annualRevenue ?? '—' },
            ].map(r => (
              <div key={r.label} style={{ padding: '8px 12px', background: '#F8FAFC', borderRadius: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: 2 }}>{r.label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: NAVY }}>{r.value}</div>
              </div>
            ))}
            <div style={{ gridColumn: '1/-1', padding: '8px 12px', background: '#F8FAFC', borderRadius: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: 2 }}>Description</div>
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{description}</div>
            </div>
          </div>
        )}
      </SCard>

      {/* 2 — Materials Catalog */}
      <SCard title="2️⃣  Materials I Supply" action={
        <button onClick={() => setShowAddForm(!showAddForm)}
          style={{ background: TEAL, color: 'white', border: 'none', borderRadius: 6,
            padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          + Add Material
        </button>
      }>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
              {['Material', 'Category', 'MOQ', 'Lead Time', 'Unit Price', 'Capacity/Mo', 'Certs', 'Visible', 'Remove'].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: MUTED, fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {catalog.map((item, i) => (
              <tr key={item.id} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? 'white' : '#F8FAFC' }}>
                <td style={{ padding: '9px 10px', fontWeight: 600, color: NAVY }}>{item.material}</td>
                <td style={{ padding: '9px 10px', color: MUTED, fontSize: 11 }}>{item.category}</td>
                <td style={{ padding: '9px 10px' }}>{item.moq} {item.uom}</td>
                <td style={{ padding: '9px 10px' }}>{item.leadTime} days</td>
                <td style={{ padding: '9px 10px', fontWeight: 600, color: TEAL }}>
                  {item.currency} {item.unitPrice}/{item.uom}
                </td>
                <td style={{ padding: '9px 10px' }}>{item.capacity}/mo</td>
                <td style={{ padding: '9px 10px' }}>
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    {item.certs.map(c => (
                      <span key={c} style={{ background: `${GREEN}15`, color: GREEN, borderRadius: 3,
                        padding: '1px 5px', fontSize: 9, fontWeight: 600 }}>{c}</span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                  <div onClick={() => setCatalog(prev => prev.map(x => x.id === item.id ? { ...x, visible: !x.visible } : x))}
                    style={{ width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
                      background: item.visible ? TEAL : '#CBD5E1', position: 'relative', display: 'inline-block' }}>
                    <div style={{ position: 'absolute', top: 2, left: item.visible ? 18 : 2, width: 16, height: 16,
                      borderRadius: '50%', background: 'white', transition: 'left 0.2s',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                  </div>
                </td>
                <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                  <button onClick={() => setCatalog(prev => prev.filter(x => x.id !== item.id))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: RED, fontSize: 14 }}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {showAddForm && (
          <AddMaterialForm
            onSubmit={mat => { setCatalog(prev => [...prev, mat]); setShowAddForm(false); }}
            onCancel={() => setShowAddForm(false)}
            showToast={showToast}
          />
        )}
      </SCard>

      {/* 3 — Certifications */}
      <SCard title="3️⃣  Certifications on Display" action={
        <button onClick={() => showToast('File browser opened (mock)')}
          style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6,
            padding: '4px 12px', fontSize: 11, cursor: 'pointer', color: MUTED }}>+ Upload New</button>
      }>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {certs.map((cert, i) => (
            <div key={cert.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
              background: '#F8FAFC', borderRadius: 8, border: `1px solid ${BORDER}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: NAVY }}>{cert.name}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                  <span style={{ background: certStatusBg(cert.status), color: certStatusColor(cert.status),
                    borderRadius: 9999, padding: '1px 8px', fontSize: 10, fontWeight: 600 }}>
                    {cert.status === 'valid' ? '✅ Valid' : cert.status === 'expiring' ? '⚠️ Expiring' : '❌ Missing'}
                  </span>
                  {cert.expiry && <span style={{ fontSize: 10, color: MUTED }}>Exp: {cert.expiry}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: cert.visible ? TEAL : MUTED, fontWeight: 600 }}>
                  {cert.visible ? '👁️ Shown' : '🚫 Hidden'}
                </span>
                <div onClick={() => toggleCertVisibility(i)}
                  style={{ width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
                    background: cert.visible ? TEAL : '#CBD5E1', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 2, left: cert.visible ? 18 : 2, width: 16, height: 16,
                    borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SCard>

      {/* 4 — Channel Preferences */}
      <SCard title="4️⃣  Preferred Communication Channels" action={
        <button onClick={() => showToast('Channel preferences updated')}
          style={{ background: TEAL, color: 'white', border: 'none', borderRadius: 6,
            padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Save</button>
      }>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {([cp.primaryChannel, cp.fallbackChannel] as const).map((key, i) => {
            const cfg = CHANNEL_CONFIG[key as keyof typeof CHANNEL_CONFIG];
            if (!cfg) return null;
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                background: i === 0 ? `${TEAL}08` : '#F8FAFC', borderRadius: 8,
                border: `1px solid ${i === 0 ? `${TEAL}33` : BORDER}` }}>
                <span style={{ fontSize: 20 }}>{cfg.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: NAVY }}>{cfg.label}</div>
                  <div style={{ fontSize: 10, color: MUTED }}>{cfg.description}</div>
                </div>
                <span style={{ fontSize: 10, background: i === 0 ? TEAL : '#E2E8F0',
                  color: i === 0 ? 'white' : MUTED, borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>
                  {i === 0 ? 'PRIMARY' : 'FALLBACK'}
                </span>
              </div>
            );
          })}
        </div>
      </SCard>

      {/* 5 — Business Hours */}
      <SCard title="5️⃣  Business Hours & Timezone" action={
        <button onClick={() => showToast('Business hours updated')}
          style={{ background: TEAL, color: 'white', border: 'none', borderRadius: 6,
            padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Save</button>
      }>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
              Business Hours
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="time" value={bizHoursStart} onChange={e => setBizHoursStart(e.target.value)}
                style={{ padding: '7px 10px', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13 }} />
              <span style={{ color: MUTED }}>to</span>
              <input type="time" value={bizHoursEnd} onChange={e => setBizHoursEnd(e.target.value)}
                style={{ padding: '7px 10px', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13 }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Timezone</label>
            <div style={{ padding: '8px 12px', background: '#F8FAFC', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, color: NAVY }}>
              {cp.timezone}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: 4 }}>Current Status</div>
            <div style={{ padding: '7px 12px', background: bizHours ? '#F0FDF4' : '#FEF2F2',
              color: bizHours ? GREEN : RED, borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
              {bizHours ? `✅ Open — ${localTime}` : `🔴 Closed — ${localTime}`}
            </div>
          </div>
        </div>
      </SCard>

      {/* 6 — Marketplace Statistics */}
      <SCard title="6️⃣  Marketplace Statistics">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
          {[
            { label: 'Profile Views (Month)', value: '24', color: TEAL },
            { label: 'RFQ Invitations',       value: '3',  color: BLUE },
            { label: 'Win Rate',               value: '67%', color: GREEN },
            { label: 'Category Rank',          value: '#3 / 31', color: AMBER },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: '12px 8px',
              background: '#F8FAFC', borderRadius: 8, borderLeft: `3px solid ${s.color}` }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
        {/* How to improve ranking — expandable */}
        <div style={{ background: `${TEAL}10`, border: `1px solid ${TEAL}33`, borderRadius: 8, overflow: 'hidden' }}>
          <div onClick={() => setStatsExpanded(!statsExpanded)}
            style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: TEAL }}>💡 How to improve your ranking</span>
            <span style={{ color: TEAL, fontSize: 12 }}>{statsExpanded ? '▲' : '▼'}</span>
          </div>
          {statsExpanded && (
            <div style={{ padding: '0 14px 14px', fontSize: 12, color: '#374151', lineHeight: 1.7,
              borderTop: `1px solid ${TEAL}22` }}>
              <div style={{ marginTop: 10 }}>
                Complete your profile ({completeness}% → 100%):
                <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                  <li>Upload BPJPH Halal Certificate (+12 points)</li>
                  <li>Add annual manufacturing capacity data (+8 points)</li>
                  <li>Upload facility/product images (+5 points)</li>
                  <li>Add 2 more materials to catalog (+5 points)</li>
                  <li>Add key client references (+5 points)</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </SCard>
    </div>
  );
};

export default MyStorefront;
