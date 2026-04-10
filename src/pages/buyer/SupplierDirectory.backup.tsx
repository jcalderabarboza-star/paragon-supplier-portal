import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Title, Text, Button } from '@ui5/webcomponents-react';
import { mockSuppliers } from '../../data/mockSuppliers';
import { Supplier, SupplierStatus, SupplierTier, ScorecardGrade } from '../../types/supplier.types';

// ─── Constants ────────────────────────────────────────────────────────────────

const MOCK_TODAY = new Date('2025-04-07');

const COUNTRY_FLAG: Record<string, string> = {
  ID: '🇮🇩', MY: '🇲🇾', DE: '🇩🇪', FR: '🇫🇷', CN: '🇨🇳',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Raw Material': '#0097A7',
  'Packaging': '#354A5F',
  'Fragrance': '#64748B',
  'Active Ingredient': '#E9730C',
};

const TIER_LABELS: Record<number, string> = {
  [SupplierTier.WHATSAPP]: '📱 WhatsApp',
  [SupplierTier.WEB]: '🌐 Web Portal',
  [SupplierTier.API]: '⚙️ API/EDI',
};

const GRADE_COLORS: Record<string, string> = {
  [ScorecardGrade.A]: '#107E3E',
  [ScorecardGrade.B]: '#0097A7',
  [ScorecardGrade.C]: '#E9730C',
  [ScorecardGrade.D]: '#BB0000',
  [ScorecardGrade.F]: '#BB0000',
};

const STATUS_COLORS: Record<string, string> = {
  [SupplierStatus.ACTIVE]: '#107E3E',
  [SupplierStatus.ONBOARDING]: '#E9730C',
  [SupplierStatus.SUSPENDED]: '#BB0000',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isExpiringSoon(certDate: string): boolean {
  const expiry = new Date(certDate);
  const limit = new Date(MOCK_TODAY);
  limit.setDate(limit.getDate() + 90);
  return expiry > MOCK_TODAY && expiry <= limit;
}

function isCertCritical(certDate: string): boolean {
  const expiry = new Date(certDate);
  const limit = new Date(MOCK_TODAY);
  limit.setDate(limit.getDate() + 90);
  return expiry <= limit;
}

function otifColor(otif: number): string {
  if (otif >= 90) return '#107E3E';
  if (otif >= 80) return '#E9730C';
  return '#BB0000';
}

function fmtDate(s: string): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const baseInput: React.CSSProperties = {
  height: '34px', border: '1px solid #c9c9c9', borderRadius: '4px',
  padding: '0 0.5rem', fontSize: '0.8rem', background: 'white', color: '#354A5F',
};

// ─── Invite Modal ─────────────────────────────────────────────────────────────

interface InviteForm { companyName: string; email: string; category: string; channel: string; message: string; }

const InviteModal: React.FC<{ onClose: () => void; onToast: (m: string) => void }> = ({ onClose, onToast }) => {
  const [form, setForm] = useState<InviteForm>({
    companyName: '', email: '', category: 'Raw Material', channel: 'WhatsApp', message: '',
  });
  const set = (k: keyof InviteForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const fieldStyle: React.CSSProperties = { ...baseInput, height: '36px', width: '100%', boxSizing: 'border-box' };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400 }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: 'white', borderRadius: '8px', width: '460px', maxWidth: '90vw',
        zIndex: 401, boxShadow: '0 8px 40px rgba(0,0,0,0.22)', overflow: 'hidden',
      }}>
        <div style={{ background: '#354A5F', color: 'white', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700 }}>Invite Supplier</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.25rem', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <label>
            <div style={{ fontSize: '0.72rem', color: '#6c757d', marginBottom: '0.2rem', fontWeight: 600 }}>Company Name *</div>
            <input value={form.companyName} onChange={set('companyName')} placeholder="e.g. PT Supplier Baru" style={fieldStyle} />
          </label>
          <label>
            <div style={{ fontSize: '0.72rem', color: '#6c757d', marginBottom: '0.2rem', fontWeight: 600 }}>Contact Email *</div>
            <input type="email" value={form.email} onChange={set('email')} placeholder="contact@supplier.com" style={fieldStyle} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label>
              <div style={{ fontSize: '0.72rem', color: '#6c757d', marginBottom: '0.2rem', fontWeight: 600 }}>Category</div>
              <select value={form.category} onChange={set('category')} style={fieldStyle}>
                {['Raw Material', 'Packaging', 'Fragrance', 'Active Ingredient'].map(c => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label>
              <div style={{ fontSize: '0.72rem', color: '#6c757d', marginBottom: '0.2rem', fontWeight: 600 }}>Preferred Channel</div>
              <select value={form.channel} onChange={set('channel')} style={fieldStyle}>
                {['WhatsApp', 'Email', 'Web', 'API'].map(c => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>
          <label>
            <div style={{ fontSize: '0.72rem', color: '#6c757d', marginBottom: '0.2rem', fontWeight: 600 }}>Personal Message (optional)</div>
            <textarea
              value={form.message} onChange={set('message')}
              placeholder="Add a personal message to the invitation..."
              rows={3}
              style={{ ...fieldStyle, height: 'auto', resize: 'vertical', padding: '0.5rem' }}
            />
          </label>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button design="Default" onClick={onClose}>Cancel</Button>
            <Button design="Emphasized" onClick={() => {
              if (!form.companyName || !form.email) { onToast('Company Name and Email are required'); return; }
              onToast(`Invitation sent to ${form.email} via email`);
              onClose();
            }}>Send Invitation</Button>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Supplier Card ────────────────────────────────────────────────────────────

const SupplierCard: React.FC<{ s: Supplier; onToast: (m: string) => void }> = ({ s, onToast }) => {
  const navigate = useNavigate();
  const catColor = CATEGORY_COLORS[s.category] ?? '#6c757d';
  const gradeColor = GRADE_COLORS[s.scorecardGrade] ?? '#6c757d';
  const statusColor = STATUS_COLORS[s.status] ?? '#6c757d';
  const certBad = isCertCritical(s.certExpiryDate);
  const oColor = otifColor(s.otif);

  return (
    <div style={{
      background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div style={{ height: '4px', background: catColor }} />

      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
        {/* Name + flag */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1A2B3C', lineHeight: 1.3 }}>{s.name}</div>
          <span style={{ fontSize: '1.2rem', flexShrink: 0 }} title={`${s.city}, ${s.country}`}>{COUNTRY_FLAG[s.country] ?? s.country}</span>
        </div>
        <div style={{ fontSize: '0.73rem', color: '#6c757d', marginTop: '-0.3rem' }}>{s.city}, {s.country} · {s.sapBpNumber}</div>

        {/* Category + Tier */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ background: catColor, color: 'white', fontSize: '0.68rem', fontWeight: 600, padding: '0.18rem 0.55rem', borderRadius: '12px' }}>
            {s.category}
          </span>
          <span style={{ background: '#f0f4f8', color: '#354A5F', fontSize: '0.68rem', fontWeight: 600, padding: '0.18rem 0.55rem', borderRadius: '12px', border: '1px solid #dce3ea' }}>
            {TIER_LABELS[s.tier]}
          </span>
        </div>

        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor, flexShrink: 0, display: 'inline-block' }} />
          <span style={{ fontSize: '0.8rem', color: statusColor, fontWeight: 600 }}>{s.status}</span>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', margin: '0.1rem 0' }} />

        {/* Compliance */}
        <div>
          <div style={{ fontSize: '0.67rem', color: '#999', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.3rem' }}>Compliance</div>
          <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
            <span style={{ fontSize: '0.78rem', color: s.halalCertified ? '#107E3E' : '#BB0000' }}>
              {s.halalCertified ? '✅' : '❌'} Halal
            </span>
            <span style={{ fontSize: '0.78rem', color: s.bpomRegistered ? '#107E3E' : '#BB0000' }}>
              {s.bpomRegistered ? '✅' : '❌'} BPOM
            </span>
          </div>
          <span style={{ fontSize: '0.78rem', color: certBad ? '#BB0000' : '#107E3E', fontWeight: certBad ? 600 : 400 }}>
            {certBad ? '⚠️' : '✅'} Cert expires {fmtDate(s.certExpiryDate)}
          </span>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', margin: '0.1rem 0' }} />

        {/* Performance */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.68rem', color: '#999', fontWeight: 600, marginBottom: '0.3rem' }}>OTIF</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ flex: 1, height: '6px', background: '#e9ecef', borderRadius: '3px' }}>
                <div style={{ height: '100%', width: `${s.otif}%`, background: oColor, borderRadius: '3px' }} />
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: oColor, minWidth: '34px' }}>{s.otif}%</span>
            </div>
          </div>
          <div style={{
            width: '38px', height: '38px', borderRadius: '8px', background: gradeColor, color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem', fontWeight: 800, flexShrink: 0,
          }}>{s.scorecardGrade}</div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '0.625rem 1rem', borderTop: '1px solid #f0f0f0', display: 'flex', gap: '0.5rem', background: '#fafafa' }}>
        <Button design="Transparent" style={{ flex: 1, fontSize: '0.78rem' }}
          onClick={() => navigate(`/buyer/suppliers/${s.id}`)}>
          View Details
        </Button>
        <Button design="Default" style={{ flex: 1, fontSize: '0.78rem' }}
          onClick={() => onToast(`Message sent via ${s.preferredChannel}`)}>
          Send Message
        </Button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const SupplierDirectory: React.FC = () => {
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [tierFilter, setTierFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockSuppliers.filter(s => {
      if (categoryFilter !== 'All' && s.category !== categoryFilter) return false;
      if (tierFilter !== 'All' && String(s.tier) !== tierFilter) return false;
      if (statusFilter !== 'All' && s.status !== statusFilter) return false;
      if (countryFilter !== 'All' && s.country !== countryFilter) return false;
      if (gradeFilter !== 'All' && s.scorecardGrade !== gradeFilter) return false;
      if (q && !s.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [categoryFilter, tierFilter, statusFilter, countryFilter, gradeFilter, search]);

  const activeCount = useMemo(() => filtered.filter(s => s.status === SupplierStatus.ACTIVE).length, [filtered]);
  const onboardingCount = useMemo(() => filtered.filter(s => s.status === SupplierStatus.ONBOARDING).length, [filtered]);
  const expiringCount = useMemo(() => filtered.filter(s => isExpiringSoon(s.certExpiryDate)).length, [filtered]);
  const hasFilters = categoryFilter !== 'All' || tierFilter !== 'All' || statusFilter !== 'All' || countryFilter !== 'All' || gradeFilter !== 'All' || search !== '';

  const selStyle: React.CSSProperties = { ...baseInput, cursor: 'pointer' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', background: '#354A5F', color: 'white',
          padding: '0.75rem 1.25rem', borderRadius: '6px', zIndex: 500,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)', fontSize: '0.875rem', maxWidth: '320px',
        }}>{toastMsg}</div>
      )}

      {showModal && <InviteModal onClose={() => setShowModal(false)} onToast={showToast} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <Title level="H2">Supplier Directory</Title>
          <Text style={{ color: '#6c757d', fontSize: '0.875rem' }}>
            {filtered.length} supplier{filtered.length !== 1 ? 's' : ''}
            {filtered.length < mockSuppliers.length && ` (filtered from ${mockSuppliers.length})`}
          </Text>
        </div>
        <Button design="Emphasized" icon="add" onClick={() => setShowModal(true)}>Invite Supplier</Button>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'flex-end',
        background: 'white', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '0.75rem 1rem',
      }}>
        {([
          { label: 'CATEGORY', val: categoryFilter, set: setCategoryFilter, opts: [['All', 'All Categories'], ['Raw Material', 'Raw Material'], ['Packaging', 'Packaging'], ['Fragrance', 'Fragrance'], ['Active Ingredient', 'Active Ingredient']] },
          { label: 'TIER', val: tierFilter, set: setTierFilter, opts: [['All', 'All Tiers'], ['1', 'Tier 1 (WhatsApp)'], ['2', 'Tier 2 (Web)'], ['3', 'Tier 3 (API)']] },
          { label: 'STATUS', val: statusFilter, set: setStatusFilter, opts: [['All', 'All'], [SupplierStatus.ACTIVE, 'Active'], [SupplierStatus.ONBOARDING, 'Onboarding'], [SupplierStatus.SUSPENDED, 'Suspended']] },
          { label: 'COUNTRY', val: countryFilter, set: setCountryFilter, opts: [['All', 'All'], ['ID', '🇮🇩 ID'], ['MY', '🇲🇾 MY'], ['DE', '🇩🇪 DE'], ['FR', '🇫🇷 FR'], ['CN', '🇨🇳 CN']] },
          { label: 'GRADE', val: gradeFilter, set: setGradeFilter, opts: [['All', 'All'], ['A', 'Grade A'], ['B', 'Grade B'], ['C', 'Grade C'], ['D', 'Grade D']] },
        ] as const).map(({ label, val, set, opts }) => (
          <label key={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span style={{ fontSize: '0.67rem', color: '#6c757d', fontWeight: 700 }}>{label}</span>
            <select value={val} onChange={e => set(e.target.value)} style={selStyle}>
              {(opts as readonly (readonly [string, string])[]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        ))}

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: '1 1 160px' }}>
          <span style={{ fontSize: '0.67rem', color: '#6c757d', fontWeight: 700 }}>SEARCH</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search supplier name..."
            style={{ ...baseInput, width: '100%', boxSizing: 'border-box' }} />
        </label>

        {hasFilters && (
          <button onClick={() => { setCategoryFilter('All'); setTierFilter('All'); setStatusFilter('All'); setCountryFilter('All'); setGradeFilter('All'); setSearch(''); }}
            style={{ background: 'transparent', border: 'none', color: '#0097A7', cursor: 'pointer', fontSize: '0.8rem', paddingBottom: '4px' }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Summary tiles */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Suppliers', value: filtered.length, color: '#354A5F', sub: 'in directory' },
          { label: 'Active', value: activeCount, color: '#107E3E', sub: 'fully onboarded' },
          { label: 'Onboarding', value: onboardingCount, color: '#E9730C', sub: 'in progress' },
          { label: 'Expiring Documents', value: expiringCount, color: expiringCount > 0 ? '#BB0000' : '#107E3E', sub: 'within 90 days' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} style={{ flex: '1 1 140px', background: 'white', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '0.875rem 1.125rem' }}>
            <div style={{ fontSize: '0.68rem', color: '#6c757d', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color, margin: '0.2rem 0' }}>{value}</div>
            <div style={{ fontSize: '0.73rem', color: '#6c757d' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6c757d', background: 'white', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          No suppliers match the current filters.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {filtered.map(s => <SupplierCard key={s.id} s={s} onToast={showToast} />)}
        </div>
      )}
    </div>
  );
};

export default SupplierDirectory;
