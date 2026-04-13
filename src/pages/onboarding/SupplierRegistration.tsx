import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_LABELS = ['Company Info', 'Contacts', 'Categories', 'Documents', 'Review'];

const SUPPLY_CATEGORIES = [
  'Raw Materials', 'Electronics', 'Mechanical Components', 'Packaging',
  'Chemicals', 'Logistics & Transport', 'IT Services', 'MRO Supplies',
  'Food & Beverage', 'Textiles',
];

const CONTACT_ROLES = ['Primary Contact', 'Finance', 'Operations', 'Legal', 'Technical'];

const CHANNELS = [
  { value: 'WhatsApp', icon: '', label: 'WhatsApp', desc: 'Tier 1 — best for SMEs' },
  { value: 'Web Portal', icon: '', label: 'Web Portal', desc: 'Tier 2 — self-service' },
  { value: 'API', icon: '⚙️', label: 'API Integration', desc: 'Tier 3 — automated' },
  { value: 'EDI', icon: '📡', label: 'EDI 846', desc: 'Enterprise data exchange' },
];

const DOCUMENTS = [
  { key: 'npwp', label: 'NPWP Certificate', hasExpiry: false },
  { key: 'nib', label: 'NIB Business License', hasExpiry: true },
  { key: 'halal', label: 'Halal Certificate (if applicable)', hasExpiry: true },
  { key: 'iso', label: 'ISO 9001 Certificate (if applicable)', hasExpiry: true },
];

const BANKS = ['BCA', 'Mandiri', 'BNI', 'BRI', 'CIMB Niaga', 'Other'];

const INDONESIAN_PROVINCES = [
  'Aceh', 'Bali', 'Banten', 'Bengkulu', 'DI Yogyakarta', 'DKI Jakarta',
  'Gorontalo', 'Jambi', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur',
  'Kalimantan Barat', 'Kalimantan Selatan', 'Kalimantan Tengah', 'Kalimantan Timur',
  'Kalimantan Utara', 'Kepulauan Bangka Belitung', 'Kepulauan Riau', 'Lampung',
  'Maluku', 'Maluku Utara', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur',
  'Papua', 'Papua Barat', 'Riau', 'Sulawesi Barat', 'Sulawesi Selatan',
  'Sulawesi Tengah', 'Sulawesi Tenggara', 'Sulawesi Utara', 'Sumatera Barat',
  'Sumatera Selatan', 'Sumatera Utara',
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Contact {
  name: string;
  role: string;
  email: string;
  whatsapp: string;
  phone: string;
}

interface DocState {
  uploaded: boolean;
  fileName: string;
  expiry: string;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const TEAL = '#0097A7';
const NAVY = '#354A5F';
const INPUT_STYLE: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.625rem', border: '1px solid #ccc',
  borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box',
  fontFamily: 'inherit', background: 'white', color: '#1d2d3e',
};
const ERROR_STYLE: React.CSSProperties = { color: '#BB0000', fontSize: '12px', marginTop: '0.2rem' };
const LABEL_STYLE: React.CSSProperties = { fontSize: '13px', color: NAVY, fontWeight: 600, marginBottom: '0.25rem', display: 'block' };
const SECTION_TITLE: React.CSSProperties = { fontSize: '14px', fontWeight: 700, color: NAVY, borderBottom: `2px solid ${TEAL}`, paddingBottom: '0.375rem', marginBottom: '1rem' };

// ─── Sub-components ───────────────────────────────────────────────────────────

const StepBar: React.FC<{ step: number }> = ({ step }) => (
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
    {STEP_LABELS.map((label, i) => {
      const num = i + 1;
      const done = step > num;
      const active = step === num;
      return (
        <React.Fragment key={label}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '64px' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: done ? NAVY : active ? TEAL : 'white',
              border: `2px solid ${done ? NAVY : active ? TEAL : '#ccc'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700,
              color: done || active ? 'white' : '#aaa',
              flexShrink: 0,
            }}>
              {done ? '✓' : num}
            </div>
            <span style={{ fontSize: '11px', color: active ? TEAL : done ? NAVY : '#aaa', fontWeight: active ? 700 : 500, marginTop: '0.3rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
              {label}
            </span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div style={{ flex: 1, height: '2px', background: step > num ? NAVY : '#e0e0e0', margin: '0 0.25rem', marginBottom: '1.2rem' }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

const FF: React.FC<{ label: string; required?: boolean; error?: string; children: React.ReactNode }> = ({ label, required, error, children }) => (
  <div style={{ marginBottom: '0.875rem' }}>
    <label style={LABEL_STYLE}>{label}{required && <span style={{ color: '#BB0000' }}> *</span>}</label>
    {children}
    {error && <div style={ERROR_STYLE}>{error}</div>}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const SupplierRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [appNumber] = useState(() => String(10000 + Math.floor(Math.random() * 90000)));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [catError, setCatError] = useState('');

  // Step 1 — Company Info
  const [legalName, setLegalName] = useState('');
  const [npwp, setNpwp] = useState('');
  const [nib, setNib] = useState('');
  const [country, setCountry] = useState('Indonesia');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');

  // Step 2 — Contacts
  const [contacts, setContacts] = useState<Contact[]>([
    { name: '', role: 'Primary Contact', email: '', whatsapp: '', phone: '' },
  ]);

  // Step 3 — Categories & Channel
  const [selCats, setSelCats] = useState<string[]>([]);
  const [channel, setChannel] = useState('WhatsApp');

  // Step 4 — Documents & Bank
  const emptyDoc = (): DocState => ({ uploaded: false, fileName: '', expiry: '' });
  const [docs, setDocs] = useState<Record<string, DocState>>({
    npwp: emptyDoc(), nib: emptyDoc(), halal: emptyDoc(), iso: emptyDoc(),
  });
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  // Step 5 — Agreements
  const [agreed1, setAgreed1] = useState(false);
  const [agreed2, setAgreed2] = useState(false);

  // ─── Validation ──────────────────────────────────────────────────────────────

  const validateStep1 = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!legalName.trim()) e.legalName = 'Legal company name is required';
    if (!npwp.trim()) e.npwp = 'NPWP is required';
    if (!city.trim()) e.city = 'City is required';
    if (!address.trim()) e.address = 'Address is required';
    if (country === 'Indonesia' && !province) e.province = 'Province is required for Indonesia';
    return e;
  };

  const validateStep2 = (): Record<string, string> => {
    const e: Record<string, string> = {};
    contacts.forEach((c, i) => {
      if (!c.name.trim()) e[`c${i}name`] = 'Name is required';
      if (!c.email.trim()) e[`c${i}email`] = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) e[`c${i}email`] = 'Invalid email format';
      if (!c.whatsapp.trim()) e[`c${i}whatsapp`] = 'WhatsApp number is required';
    });
    return e;
  };

  const validateStep4 = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!bankName) e.bankName = 'Bank name is required';
    if (!accountNumber.trim()) e.accountNumber = 'Account number is required';
    if (!accountHolder.trim()) e.accountHolder = 'Account holder name is required';
    return e;
  };

  const validateStep5 = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!agreed1) e.agreed1 = 'You must accept the Terms & Conditions';
    if (!agreed2) e.agreed2 = 'You must confirm the accuracy of the information';
    return e;
  };

  // ─── Navigation ──────────────────────────────────────────────────────────────

  const handleNext = () => {
    let e: Record<string, string> = {};
    let ce = '';

    if (step === 1) e = validateStep1();
    if (step === 2) e = validateStep2();
    if (step === 3) { if (selCats.length === 0) ce = 'Select at least one supply category'; }
    if (step === 4) e = validateStep4();

    setErrors(e);
    setCatError(ce);
    if (Object.keys(e).length === 0 && !ce) setStep(s => s + 1);
  };

  const handleBack = () => {
    setErrors({});
    setCatError('');
    setStep(s => s - 1);
  };

  const handleSubmit = () => {
    const e = validateStep5();
    setErrors(e);
    if (Object.keys(e).length === 0) setSubmitted(true);
  };

  // ─── Contact helpers ─────────────────────────────────────────────────────────

  const updateContact = (i: number, field: keyof Contact, val: string) => {
    setContacts(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: val } : c));
  };

  const addContact = () => {
    if (contacts.length < 3) setContacts(prev => [...prev, { name: '', role: 'Primary Contact', email: '', whatsapp: '', phone: '' }]);
  };

  const removeContact = (i: number) => {
    if (contacts.length > 1) setContacts(prev => prev.filter((_, idx) => idx !== i));
  };

  // ─── Category helper ─────────────────────────────────────────────────────────

  const toggleCat = (cat: string) => {
    setSelCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
    setCatError('');
  };

  // ─── Doc helper ──────────────────────────────────────────────────────────────

  const handleFileChange = (key: string, file: File | null) => {
    setDocs(prev => ({
      ...prev,
      [key]: { ...prev[key], uploaded: !!file, fileName: file ? file.name : '' },
    }));
  };

  // ─── Steps ───────────────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <div>
      <div style={SECTION_TITLE}>Company Information</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <FF label="Legal Company Name" required error={errors.legalName}>
            <input style={INPUT_STYLE} value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="PT Maju Bersama Tbk." />
          </FF>
        </div>
        <FF label="NPWP Number" required error={errors.npwp}>
          <input style={INPUT_STYLE} value={npwp} onChange={e => setNpwp(e.target.value)} placeholder="00.000.000.0-000.000" />
        </FF>
        <FF label="NIB (Business Registration Number)" error={errors.nib}>
          <input style={INPUT_STYLE} value={nib} onChange={e => setNib(e.target.value)} placeholder="1234567890123" />
        </FF>
        <FF label="Country" required>
          <select style={INPUT_STYLE} value={country} onChange={e => setCountry(e.target.value)}>
            <option>Indonesia</option>
            <option>Malaysia</option>
            <option>Singapore</option>
            <option>Thailand</option>
            <option>Vietnam</option>
            <option>Philippines</option>
            <option>Other</option>
          </select>
        </FF>
        {country === 'Indonesia' && (
          <FF label="Province" required error={errors.province}>
            <select style={INPUT_STYLE} value={province} onChange={e => setProvince(e.target.value)}>
              <option value="">— Select province —</option>
              {INDONESIAN_PROVINCES.map(p => <option key={p}>{p}</option>)}
            </select>
          </FF>
        )}
        <FF label="City" required error={errors.city}>
          <input style={INPUT_STYLE} value={city} onChange={e => setCity(e.target.value)} placeholder="Jakarta" />
        </FF>
        <div style={{ gridColumn: '1 / -1' }}>
          <FF label="Business Address" required error={errors.address}>
            <textarea style={{ ...INPUT_STYLE, height: '72px', resize: 'vertical' }} value={address} onChange={e => setAddress(e.target.value)} placeholder="Jl. Sudirman No. 123, Gedung A Lt. 5" />
          </FF>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <FF label="Website">
            <input style={INPUT_STYLE} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://www.example.com" />
          </FF>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <div style={SECTION_TITLE}>Contact Persons (up to 3)</div>
      {contacts.map((c, i) => (
        <div key={i} style={{ background: '#f9f9f9', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: 700, fontSize: '13px', color: NAVY }}>Contact {i + 1}</span>
            {contacts.length > 1 && (
              <button onClick={() => removeContact(i)} style={{ border: 'none', background: 'none', color: '#BB0000', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                Remove
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
            <FF label="Full Name" required error={errors[`c${i}name`]}>
              <input style={INPUT_STYLE} value={c.name} onChange={e => updateContact(i, 'name', e.target.value)} placeholder="Jane Smith" />
            </FF>
            <FF label="Role">
              <select style={INPUT_STYLE} value={c.role} onChange={e => updateContact(i, 'role', e.target.value)}>
                {CONTACT_ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </FF>
            <FF label="Business Email" required error={errors[`c${i}email`]}>
              <input style={INPUT_STYLE} value={c.email} onChange={e => updateContact(i, 'email', e.target.value)} placeholder="jane@company.com" />
            </FF>
            <FF label="WhatsApp Number" required error={errors[`c${i}whatsapp`]}>
              <input style={INPUT_STYLE} value={c.whatsapp} onChange={e => updateContact(i, 'whatsapp', e.target.value)} placeholder="+62 812 3456 7890" />
            </FF>
            <div style={{ gridColumn: '1 / -1' }}>
              <FF label="Phone (Optional)">
                <input style={INPUT_STYLE} value={c.phone} onChange={e => updateContact(i, 'phone', e.target.value)} placeholder="+62 21 1234 5678" />
              </FF>
            </div>
          </div>
        </div>
      ))}
      {contacts.length < 3 && (
        <button onClick={addContact} style={{
          border: `1.5px dashed ${TEAL}`, background: 'transparent', color: TEAL,
          borderRadius: '6px', padding: '0.5rem 1.25rem', cursor: 'pointer',
          fontSize: '13px', fontWeight: 600, width: '100%',
        }}>
          + Add Another Contact
        </button>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div>
      <div style={SECTION_TITLE}>Supply Categories</div>
      <div style={{ marginBottom: '0.5rem', fontSize: '13px', color: '#6c757d' }}>Select all categories that apply to your business (at least 1 required)</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
        {SUPPLY_CATEGORIES.map(cat => {
          const checked = selCats.includes(cat);
          return (
            <label key={cat} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '8px 12px', borderRadius: '6px', cursor: 'pointer',
              background: checked ? '#E0F7FA' : '#f9f9f9',
              border: `1.5px solid ${checked ? TEAL : '#e0e0e0'}`,
              fontSize: '13px', color: checked ? '#006064' : '#354A5F', fontWeight: checked ? 600 : 400,
            }}>
              <input type="checkbox" checked={checked} onChange={() => toggleCat(cat)} style={{ accentColor: TEAL }} />
              {cat}
            </label>
          );
        })}
      </div>
      {catError && <div style={ERROR_STYLE}>{catError}</div>}

      <div style={{ ...SECTION_TITLE, marginTop: '1.5rem' }}>Preferred Communication Channel</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {CHANNELS.map(ch => {
          const active = channel === ch.value;
          return (
            <label key={ch.value} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '12px 16px', borderRadius: '8px', cursor: 'pointer',
              background: active ? '#E0F7FA' : '#f9f9f9',
              border: `2px solid ${active ? TEAL : '#e0e0e0'}`,
            }}>
              <input type="radio" name="channel" value={ch.value} checked={active} onChange={() => setChannel(ch.value)} style={{ accentColor: TEAL }} />
              <span style={{ fontSize: '1.4rem' }}>{ch.icon}</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: active ? '#006064' : NAVY }}>{ch.label}</div>
                <div style={{ fontSize: '11px', color: '#6c757d' }}>{ch.desc}</div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div>
      <div style={SECTION_TITLE}>Compliance Documents</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {DOCUMENTS.map(doc => {
          const d = docs[doc.key];
          return (
            <div key={doc.key} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: NAVY }}>{doc.label}</div>
                {d.uploaded && <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '0.15rem' }}>↑ {d.fileName}</div>}
              </div>
              {doc.hasExpiry && d.uploaded && (
                <div>
                  <label style={{ fontSize: '11px', color: '#6c757d', display: 'block', marginBottom: '0.15rem' }}>Expiry date</label>
                  <input type="date" style={{ ...INPUT_STYLE, width: '140px', padding: '0.3rem 0.5rem' }}
                    value={d.expiry}
                    onChange={e => setDocs(prev => ({ ...prev, [doc.key]: { ...prev[doc.key], expiry: e.target.value } }))} />
                </div>
              )}
              <label style={{
                background: d.uploaded ? '#E8F5E9' : TEAL, color: d.uploaded ? '#107E3E' : 'white',
                border: 'none', borderRadius: '6px', padding: '0.4rem 0.875rem',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                {d.uploaded ? '✓ Uploaded' : 'Upload'}
                <input type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => handleFileChange(doc.key, e.target.files?.[0] ?? null)} />
              </label>
            </div>
          );
        })}
      </div>

      <div style={SECTION_TITLE}>Bank Account Details</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
        <FF label="Bank Name" required error={errors.bankName}>
          <select style={INPUT_STYLE} value={bankName} onChange={e => setBankName(e.target.value)}>
            <option value="">— Select bank —</option>
            {BANKS.map(b => <option key={b}>{b}</option>)}
          </select>
        </FF>
        <FF label="Account Number" required error={errors.accountNumber}>
          <input style={INPUT_STYLE} value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="1234567890" />
        </FF>
        <div style={{ gridColumn: '1 / -1' }}>
          <FF label="Account Holder Name" required error={errors.accountHolder}>
            <input style={INPUT_STYLE} value={accountHolder} onChange={e => setAccountHolder(e.target.value)} placeholder="PT Maju Bersama" />
          </FF>
        </div>
      </div>
    </div>
  );

  const ReviewRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div style={{ display: 'flex', padding: '0.45rem 0', borderBottom: '1px solid #f0f0f0' }}>
      <span style={{ width: '180px', flexShrink: 0, fontSize: '13px', color: '#6c757d', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: '13px', color: NAVY, fontWeight: 500 }}>{value || '—'}</span>
    </div>
  );

  const renderStep5 = () => (
    <div>
      <div style={{ background: '#FFF8E1', border: '1px solid #FFD54F', borderRadius: '8px', padding: '12px 16px', marginBottom: '1.5rem', fontSize: '13px', color: '#7B4F00' }}>
        Please review all information below before submitting. Go back to make any changes.
      </div>

      <div style={SECTION_TITLE}>Company Information</div>
      <ReviewRow label="Legal Name" value={legalName} />
      <ReviewRow label="NPWP" value={npwp} />
      <ReviewRow label="NIB" value={nib} />
      <ReviewRow label="Country" value={country} />
      {country === 'Indonesia' && <ReviewRow label="Province" value={province} />}
      <ReviewRow label="City" value={city} />
      <ReviewRow label="Address" value={address} />
      <ReviewRow label="Website" value={website} />

      <div style={{ ...SECTION_TITLE, marginTop: '1.25rem' }}>Contact Persons</div>
      {contacts.map((c, i) => (
        <div key={i} style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: TEAL, marginBottom: '0.25rem' }}>Contact {i + 1}</div>
          <ReviewRow label="Name" value={c.name} />
          <ReviewRow label="Role" value={c.role} />
          <ReviewRow label="Email" value={c.email} />
          <ReviewRow label="WhatsApp" value={c.whatsapp} />
          {c.phone && <ReviewRow label="Phone" value={c.phone} />}
        </div>
      ))}

      <div style={{ ...SECTION_TITLE, marginTop: '1.25rem' }}>Categories & Channel</div>
      <ReviewRow label="Supply Categories" value={selCats.join(', ') || '—'} />
      <ReviewRow label="Preferred Channel" value={channel} />

      <div style={{ ...SECTION_TITLE, marginTop: '1.25rem' }}>Documents & Bank</div>
      {DOCUMENTS.map(doc => {
        const d = docs[doc.key];
        return <ReviewRow key={doc.key} label={doc.label} value={d.uploaded ? `${d.fileName}${d.expiry ? ` (expires ${d.expiry})` : ''}` : 'Not uploaded'} />;
      })}
      <ReviewRow label="Bank" value={bankName} />
      <ReviewRow label="Account Number" value={accountNumber} />
      <ReviewRow label="Account Holder" value={accountHolder} />

      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={agreed1} onChange={e => setAgreed1(e.target.checked)} style={{ accentColor: TEAL, marginTop: '2px', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: NAVY }}>
            I agree to Paragon's <span style={{ color: TEAL, textDecoration: 'underline', cursor: 'pointer' }}>Supplier Code of Conduct</span> and <span style={{ color: TEAL, textDecoration: 'underline', cursor: 'pointer' }}>Terms & Conditions</span>.
          </span>
        </label>
        {errors.agreed1 && <div style={{ ...ERROR_STYLE, marginTop: '-0.5rem' }}>{errors.agreed1}</div>}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={agreed2} onChange={e => setAgreed2(e.target.checked)} style={{ accentColor: TEAL, marginTop: '2px', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: NAVY }}>
            I confirm that all information provided is accurate and complete. I understand that providing false information may result in rejection.
          </span>
        </label>
        {errors.agreed2 && <div style={{ ...ERROR_STYLE, marginTop: '-0.5rem' }}>{errors.agreed2}</div>}
      </div>

      <button
        onClick={handleSubmit}
        style={{
          width: '100%', marginTop: '1.5rem', padding: '14px',
          background: NAVY, color: 'white', border: 'none', borderRadius: '6px',
          fontSize: '14px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em',
        }}
      >
        Submit Registration
      </button>
    </div>
  );

  const renderSuccess = () => (
    <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
      <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>✓</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: NAVY, marginBottom: '0.5rem' }}>Registration Submitted!</div>
      <div style={{ fontSize: '13px', color: '#6c757d', marginBottom: '1.5rem' }}>Your application has been received and is under review.</div>
      <div style={{ background: '#E0F7FA', border: `1.5px solid ${TEAL}`, borderRadius: '8px', padding: '1rem 1.5rem', display: 'inline-block', marginBottom: '2rem' }}>
        <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: 500 }}>Application Number</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: TEAL, letterSpacing: '0.05em' }}>APP-2026-{appNumber}</div>
      </div>
      <div style={{ background: '#f9f9f9', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px', textAlign: 'left', marginBottom: '2rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: NAVY, marginBottom: '0.75rem' }}>What happens next?</div>
        {[
          'Our procurement team will review your application within 3–5 business days.',
          'You will receive an email at your registered address with the outcome.',
          'If approved, you will receive onboarding instructions and portal access credentials.',
          'For urgent queries, contact supplier-support@paragon.id quoting your application number.',
        ].map((txt, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.625rem', marginBottom: '0.5rem', fontSize: '13px', color: '#354A5F' }}>
            <span style={{ color: TEAL, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
            <span>{txt}</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => navigate('/buyer/dashboard')}
        style={{ background: TEAL, color: 'white', border: 'none', borderRadius: '6px', padding: '0.75rem 2rem', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
      >
        Return to Home
      </button>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
      minHeight: '100vh', background: '#f5f6f7', padding: '2rem 1rem',
    }}>
      <div style={{ width: '100%', maxWidth: '680px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: NAVY }}>Supplier Registration</div>
          <div style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '0.25rem' }}>Join the Paragon Procurement Network</div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          {submitted ? renderSuccess() : (
            <>
              <StepBar step={step} />

              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
              {step === 4 && renderStep4()}
              {step === 5 && renderStep5()}

              {/* Navigation — hidden on step 5 (submit is inside renderStep5) */}
              {step < 5 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f0f0f0' }}>
                  <button
                    onClick={handleBack}
                    disabled={step === 1}
                    style={{
                      border: `1.5px solid ${step === 1 ? '#e0e0e0' : NAVY}`, background: 'white',
                      color: step === 1 ? '#ccc' : NAVY, borderRadius: '6px', padding: '0.5rem 1.5rem',
                      fontSize: '13px', fontWeight: 600, cursor: step === 1 ? 'default' : 'pointer',
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleNext}
                    style={{
                      background: TEAL, color: 'white', border: 'none', borderRadius: '6px',
                      padding: '0.5rem 1.75rem', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}
              {step === 5 && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f0f0f0' }}>
                  <button
                    onClick={handleBack}
                    style={{
                      border: `1.5px solid ${NAVY}`, background: 'white', color: NAVY,
                      borderRadius: '6px', padding: '0.5rem 1.5rem',
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    ← Back
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierRegistration;
