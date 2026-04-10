import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { mockSuppliers, SupplierExtended } from '../../data/mockSuppliers';
import { COUNTRY_PROFILES, CHANNEL_CONFIG, MESSAGE_TEMPLATES } from '../../data/communicationProfiles';
import { useAdaptive } from '../../context/AdaptiveContext';
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
    borderRadius: 8, padding: '12px 18px', fontSize: 13, fontWeight: 500,
    boxShadow: '0 4px 16px rgba(0,0,0,0.25)', zIndex: 9999, maxWidth: 420, lineHeight: 1.5,
    borderLeft: `4px solid ${TEAL}` }}>{msg}</div>
);

// ─── Static mock data for sup-007 ─────────────────────────────────────────────
const CATALOG_ITEMS = [
  { material: 'PET Bottle 100ml Airless Pump', sapCode: 'MAT-10045', moq: '10,000 PCS', leadTime: '14 days', unitPrice: 'Rp 3,700', currency: 'IDR', halalMaterial: true, capacity: '200,000 PCS/mo', lastUpdated: '2026-03-15' },
  { material: 'PET Bottle 200ml Standard Pump', sapCode: 'MAT-10046', moq: '10,000 PCS', leadTime: '14 days', unitPrice: 'Rp 4,200', currency: 'IDR', halalMaterial: true, capacity: '150,000 PCS/mo', lastUpdated: '2026-03-15' },
  { material: 'Airless Pump 15ml Travel Size', sapCode: 'MAT-10089', moq: '5,000 PCS', leadTime: '21 days', unitPrice: 'Rp 2,800', currency: 'IDR', halalMaterial: true, capacity: '100,000 PCS/mo', lastUpdated: '2026-02-20' },
];

const COMPLIANCE_DOCS = [
  { name: 'BPOM Registration', reason: 'Required for all cosmetic packaging in Indonesia', status: 'valid',    expiry: '2026-12-31', uploaded: '2024-01-10', required: 'Required before first PO' },
  { name: 'ISO 9001:2015',     reason: 'Quality management system standard',               status: 'valid',    expiry: '2026-08-14', uploaded: '2023-08-15', required: 'Required before first PO' },
  { name: 'BPJPH Halal Cert',  reason: 'Mandatory for materials in halal product lines',   status: 'missing',  expiry: null,          uploaded: null,           required: 'Required before first PO' },
  { name: 'SNI Compliance',    reason: 'Indonesian National Standard for packaging',        status: 'expiring', expiry: '2026-05-01', uploaded: '2024-05-01', required: 'Required annually' },
  { name: 'NPWP Tax ID',       reason: 'Indonesian taxpayer ID — mandatory for invoicing',  status: 'valid',    expiry: null,          uploaded: '2022-09-01', required: 'Permanent' },
];

const PERF_HISTORY = Array.from({ length: 13 }, (_, i) => ({
  month: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'][i],
  otif: [78, 80, 82, 83, 79, 85, 84, 82, 81, 80, 83, 82, 82][i],
  target: 90,
}));

const RECENT_POS = [
  { poNum: 'PO-2026-00421', material: 'PET Bottle 100ml', qty: '50,000 PCS', value: 'Rp 185jT', ordered: '2026-03-10', delivery: '2026-03-24', otif: '✅ On Time', status: 'Delivered' },
  { poNum: 'PO-2026-00389', material: 'PET Bottle 200ml', qty: '30,000 PCS', value: 'Rp 126jT', ordered: '2026-02-18', delivery: '2026-03-05', otif: '✅ On Time', status: 'Delivered' },
  { poNum: 'PO-2026-00351', material: 'Airless Pump 15ml', qty: '20,000 PCS', value: 'Rp 56jT', ordered: '2026-01-25', delivery: '2026-02-18', otif: '⚠️ +3 days', status: 'Delivered' },
  { poNum: 'PO-2025-00298', material: 'PET Bottle 100ml', qty: '40,000 PCS', value: 'Rp 148jT', ordered: '2025-12-10', delivery: '2025-12-24', otif: '✅ On Time', status: 'Delivered' },
];

const MSG_LOG = [
  { ts: '2026-04-07 10:24 WIB', direction: 'out', channel: 'whatsapp', docType: 'RFQ', preview: 'RFQ-2026-002 sent: PET Bottle 100ml Airless Pump, 50,000 PCS. Deadline 2026-04-15.', status: 'read' },
  { ts: '2026-04-07 10:26 WIB', direction: 'in',  channel: 'whatsapp', docType: 'Reply', preview: 'Halo! Siap, kami akan submit quotation sebelum deadline. Terima kasih! 🙏', status: 'read' },
  { ts: '2026-04-03 09:05 WIB', direction: 'out', channel: 'whatsapp', docType: 'PO', preview: 'PO-2026-00421 issued: PET Bottle 100ml, 50,000 PCS, Rp 185jT. Confirm receipt in 24h.', status: 'delivered' },
  { ts: '2026-04-03 09:18 WIB', direction: 'in',  channel: 'whatsapp', docType: 'Confirm', preview: 'Dikonfirmasi terima kasih. PO sudah diterima dan akan diproses.', status: 'read' },
  { ts: '2026-03-22 14:00 WIB', direction: 'out', channel: 'email',    docType: 'ASN Request', preview: 'Delivery for PO-2026-00389 due 2026-03-25. Please submit ASN before dispatch.', status: 'delivered' },
  { ts: '2026-03-23 08:45 WIB', direction: 'in',  channel: 'email',    docType: 'ASN', preview: 'ASN submitted for PO-2026-00389. Shipment tracking: TKI-221349. ETA 2026-03-25.', status: 'read' },
  { ts: '2026-03-10 11:30 WIB', direction: 'out', channel: 'whatsapp', docType: 'PO', preview: 'PO-2026-00389 issued: PET Bottle 200ml, 30,000 PCS, Rp 126jT. Deadline 2026-03-24.', status: 'delivered' },
  { ts: '2026-02-28 09:00 WIB', direction: 'out', channel: 'email',    docType: 'Compliance', preview: 'Reminder: BPJPH Halal Certificate is missing from your compliance profile. Please upload.', status: 'delivered' },
];


// ─── Helpers ──────────────────────────────────────────────────────────────────
const gradeColor = (g: ScorecardGrade) =>
  g === ScorecardGrade.A ? GREEN : g === ScorecardGrade.B ? BLUE : g === ScorecardGrade.C ? AMBER : RED;

const docStatusColor = (s: string) =>
  s === 'valid' ? GREEN : s === 'expiring' ? AMBER : s === 'missing' ? RED : MUTED;
const docStatusBg    = (s: string) =>
  s === 'valid' ? '#F0FDF4' : s === 'expiring' ? '#FFFBEB' : s === 'missing' ? '#FEF2F2' : '#F8FAFC';
const docStatusLabel = (s: string) =>
  s === 'valid' ? '✅ Valid' : s === 'expiring' ? '⚠️ Expiring' : s === 'missing' ? '❌ Missing' : 'N/A';

const msgDirIcon = (dir: string) => dir === 'out' ? '→' : '←';
const msgDirColor = (dir: string) => dir === 'out' ? TEAL : NAVY;

const statusIcon = (s: string) => s === 'read' ? '👁️' : s === 'delivered' ? '✅✅' : s === 'sent' ? '✅' : '❌';

const channelCfg = (ch: string) => CHANNEL_CONFIG[ch as keyof typeof CHANNEL_CONFIG] ?? CHANNEL_CONFIG.email;

// ─── Section Card ─────────────────────────────────────────────────────────────
const SCard: React.FC<{ title: string; children: React.ReactNode; mb?: number }> = ({ title, children, mb = 16 }) => (
  <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    marginBottom: mb, overflow: 'hidden' }}>
    <div style={{ padding: '12px 18px', borderBottom: `1px solid ${BORDER}`,
      fontWeight: 700, fontSize: 13, color: NAVY }}>{title}</div>
    <div style={{ padding: '14px 18px' }}>{children}</div>
  </div>
);

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 13 }}>
    <span style={{ width: 160, flexShrink: 0, color: MUTED, fontWeight: 500 }}>{label}</span>
    <span style={{ color: NAVY, flex: 1 }}>{value}</span>
  </div>
);

// ─── Tab 1: Overview ──────────────────────────────────────────────────────────
const OverviewTab: React.FC<{ supp: SupplierExtended }> = ({ supp }) => {
  const { getSupplierProfile, getChannelConfig, getComplianceRequirements } = useAdaptive();
  const cp = getSupplierProfile(supp.country);

  const complianceDocs = getComplianceRequirements(supp.country, supp.category);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* Left — Company Info */}
      <div>
        <SCard title="📋 Company Information">
          <Row label="Legal Name"    value={supp.legalName ?? supp.name} />
          <Row label="SAP BP Number" value={supp.sapBpNumber} />
          <Row label="Tax ID"        value={supp.taxId ?? '—'} />
          <Row label="Business Reg." value={supp.businessRegNo ?? '—'} />
          <Row label="Website"       value={supp.website ? <a href={`https://${supp.website}`} target="_blank" rel="noreferrer" style={{ color: TEAL }}>{supp.website}</a> : '—'} />
          <Row label="Founded"       value={supp.founded ? `${supp.founded}` : '—'} />
          <Row label="Employees"     value={supp.employees ?? '—'} />
          <Row label="Revenue"       value={supp.annualRevenue ?? '—'} />
          <Row label="Ship From"     value={supp.shipFromLocations?.join(' · ') ?? supp.city} />
          <Row label="Payment Terms" value={supp.paymentTerms ?? 'Net 30'} />
          <Row label="Incoterms"     value={supp.incoterms ?? 'FCA'} />
          <Row label="Contact"       value={`${supp.contactName} — ${supp.contactPhone}`} />
          <Row label="Email"         value={supp.contactEmail} />
        </SCard>
        {supp.intelligenceNote && (
          <div style={{ background: `${TEAL}10`, border: `1px solid ${TEAL}33`, borderRadius: 8,
            padding: '10px 14px', fontSize: 12, color: NAVY, lineHeight: 1.6 }}>
            💡 {supp.intelligenceNote}
          </div>
        )}
      </div>

      {/* Right — Adaptive Profile */}
      <div>
        <SCard title="🧠 Adaptive Profile — Auto-configured">
          {[
            { icon: '🌐', label: 'Language',        value: `${cp.flag} ${cp.languageLabel}` },
            { icon: '📱', label: 'Primary Channel',  value: `${getChannelConfig(cp.primaryChannel).icon} ${getChannelConfig(cp.primaryChannel).label}` },
            { icon: '🔄', label: 'Fallback Channel', value: `${getChannelConfig(cp.fallbackChannel).icon} ${getChannelConfig(cp.fallbackChannel).label}` },
            { icon: '🕐', label: 'Timezone',         value: cp.timezone },
            { icon: '💰', label: 'Currency',         value: `${cp.currency}` },
            { icon: '🎭', label: 'Comm. Tone',       value: cp.tone === 'conversational' ? '🤝 Conversational' : '💼 Formal' },
            { icon: '📅', label: 'Date Format',      value: cp.dateFormat },
            { icon: '⏰', label: 'Business Hours',   value: `${cp.businessHours.start} – ${cp.businessHours.end}` },
            { icon: '💳', label: cp.taxLabel,        value: `${cp.taxRate}%` },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 14, width: 20, flexShrink: 0 }}>{r.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: MUTED, width: 130, flexShrink: 0 }}>{r.label}</span>
              <span style={{ fontSize: 12, color: NAVY }}>{r.value}</span>
            </div>
          ))}

          {/* Compliance frameworks */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 14, width: 20, flexShrink: 0 }}>🏛️</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: MUTED, width: 130, flexShrink: 0 }}>Compliance</span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
              {cp.complianceFrameworks.map(f => (
                <span key={f} style={{ background: '#F1F5F9', color: NAVY, borderRadius: 4,
                  padding: '1px 6px', fontSize: 10, fontWeight: 600 }}>{f}</span>
              ))}
            </div>
          </div>

          {/* Invoice fields */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 14, width: 20, flexShrink: 0 }}>📋</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: MUTED, width: 130, flexShrink: 0 }}>Invoice Fields</span>
            <span style={{ fontSize: 11, color: '#374151', flex: 1 }}>{cp.invoiceFields.join(', ')}</span>
          </div>

          {/* Cultural notes */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ fontSize: 14, width: 20, flexShrink: 0 }}>🚫</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: MUTED, width: 130, flexShrink: 0 }}>Cultural Notes</span>
            <span style={{ fontSize: 11, color: MUTED, flex: 1, lineHeight: 1.5 }}>
              {cp.culturalNotes.slice(0, 120)}...
            </span>
          </div>
        </SCard>

        {/* Auto-required compliance */}
        <SCard title="🛡️ Auto-required Compliance Documents">
          {complianceDocs.map(d => (
            <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12 }}>
              <span style={{ color: TEAL }}>✓</span>
              <span style={{ color: '#374151' }}>{d}</span>
            </div>
          ))}
        </SCard>

        <div style={{ background: '#EFF6FF', border: `1px solid #BFDBFE`, borderRadius: 8,
          padding: '10px 14px', fontSize: 12, color: '#0D1B2A', lineHeight: 1.6 }}>
          ℹ️ This profile was automatically configured based on <strong>{cp.name}</strong> business standards. Customize any setting in the Communication Setup tab.
        </div>
      </div>
    </div>
  );
};


// ─── Tab 2: Communication Setup ───────────────────────────────────────────────
const CommTab: React.FC<{ supp: SupplierExtended; showToast: (m: string) => void }> = ({ supp, showToast }) => {
  const { getSupplierProfile } = useAdaptive();
  const cp = getSupplierProfile(supp.country);

  const [channels, setChannels] = useState([
    { key: cp.primaryChannel,  purpose: 'POs, ASN requests, payment notifications' },
    { key: cp.fallbackChannel, purpose: 'RFQs, formal documents, invoices' },
    { key: 'portal',           purpose: 'If above channels fail' },
  ]);
  const [displayLang, setDisplayLang] = useState<string>(cp.language);
  const [docLang, setDocLang]         = useState<string>(cp.language);
  const [bizHoursOnly, setBizHoursOnly] = useState(true);
  const [previewChannel, setPreviewChannel] = useState<'whatsapp' | 'email' | 'edi'>('whatsapp');

  const moveChannel = (idx: number, dir: -1 | 1) => {
    const next = [...channels];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setChannels(next);
  };

  const langOptions = [
    { code: 'id', label: '🇮🇩 Bahasa Indonesia' }, { code: 'en', label: '🇬🇧 English' },
    { code: 'zh', label: '🇨🇳 Mandarin' },          { code: 'de', label: '🇩🇪 German' },
    { code: 'fr', label: '🇫🇷 French' },             { code: 'ar', label: '🇸🇦 Arabic' },
    { code: 'pt', label: '🇧🇷 Portuguese' },         { code: 'ja', label: '🇯🇵 Japanese' },
    { code: 'ms', label: '🇲🇾 Malay' },             { code: 'ko', label: '🇰🇷 Korean' },
    { code: 'th', label: '🇹🇭 Thai' },              { code: 'hi', label: '🇮🇳 Hindi' },
  ];

  const templates = MESSAGE_TEMPLATES.po_notification as Record<string, (...a: string[]) => string>;
  const previewMsg = (() => {
    const fn = templates[docLang] ?? templates['en'];
    return fn(supp.name, 'PO-2026-00499', 'Rp 185.000.000');
  })();

  return (
    <div>
      <div style={{ fontSize: 14, color: MUTED, marginBottom: 20 }}>
        Control exactly how this supplier receives every document and message.
      </div>

      {/* Section A — Channel Priority */}
      <SCard title="A — Channel Priority">
        {channels.map((ch, i) => {
          const cfg = channelCfg(ch.key);
          return (
            <div key={ch.key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8,
              background: i === 0 ? `${TEAL}08` : '#F8FAFC', borderRadius: 8, padding: '10px 14px',
              border: `1px solid ${i === 0 ? `${TEAL}33` : BORDER}` }}>
              <span style={{ fontSize: 18 }}>{cfg.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: NAVY }}>{cfg.label}</div>
                <div style={{ fontSize: 11, color: MUTED }}>{ch.purpose}</div>
              </div>
              <span style={{ fontSize: 10, background: i === 0 ? TEAL : '#E2E8F0',
                color: i === 0 ? 'white' : MUTED, borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>
                {i === 0 ? 'PRIMARY' : i === 1 ? 'SECONDARY' : 'FALLBACK'}
              </span>
              <button onClick={() => showToast(`Test message sent via ${cfg.label} to ${supp.contactName}...`)}
                style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 6,
                  padding: '4px 10px', fontSize: 11, cursor: 'pointer', color: MUTED }}>Test</button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button onClick={() => moveChannel(i, -1)} disabled={i === 0}
                  style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer',
                    color: i === 0 ? '#CBD5E1' : MUTED, fontSize: 12, padding: '1px 4px' }}>▲</button>
                <button onClick={() => moveChannel(i, 1)} disabled={i === channels.length - 1}
                  style={{ background: 'none', border: 'none', cursor: i === channels.length - 1 ? 'default' : 'pointer',
                    color: i === channels.length - 1 ? '#CBD5E1' : MUTED, fontSize: 12, padding: '1px 4px' }}>▼</button>
              </div>
            </div>
          );
        })}
      </SCard>

      {/* Section B — Language */}
      <SCard title="B — Language & Localisation">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
              Display Language
            </label>
            <select value={displayLang} onChange={e => setDisplayLang(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, background: 'white' }}>
              {langOptions.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
              Document Language
            </label>
            <select value={docLang} onChange={e => setDocLang(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, background: 'white' }}>
              {langOptions.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Date Format</label>
            <div style={{ padding: '8px 10px', background: '#F8FAFC', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, color: NAVY }}>
              {cp.dateFormat} (auto from {cp.name})
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Currency</label>
            <div style={{ padding: '8px 10px', background: '#F8FAFC', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, color: NAVY }}>
              {cp.currency} (auto from {cp.name})
            </div>
          </div>
        </div>
      </SCard>

      {/* Section C — Timing */}
      <SCard title="C — Timing Rules">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ fontSize: 13, color: NAVY, fontWeight: 500 }}>Send messages during business hours only</span>
          <div onClick={() => setBizHoursOnly(!bizHoursOnly)}
            style={{ width: 44, height: 24, borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s',
              background: bizHoursOnly ? TEAL : '#CBD5E1', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 3, left: bizHoursOnly ? 23 : 3, width: 18, height: 18,
              borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </div>
          <span style={{ fontSize: 12, color: MUTED }}>
            {cp.businessHours.start} – {cp.businessHours.end} {cp.timezone}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Chinese New Year', date: 'Jan 29 – Feb 12' },
            { label: 'Ramadan period',   date: 'Mar 1 – Mar 30' },
            { label: 'Golden Week (JP)', date: 'Apr 29 – May 5' },
            { label: 'Local public holidays', date: 'Auto-calendar' },
          ].map(item => (
            <label key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
              <input type="checkbox" style={{ width: 14, height: 14, accentColor: TEAL }} />
              <span style={{ color: NAVY, fontWeight: 500 }}>{item.label}</span>
              <span style={{ color: MUTED, marginLeft: 'auto' }}>{item.date}</span>
            </label>
          ))}
        </div>
      </SCard>

      {/* Section D — PO Preview */}
      <SCard title="D — Document Adaptation Preview">
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 12 }}>
          PO Notification Preview — as this supplier will receive it
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {(['whatsapp', 'email', 'edi'] as const).map(ch => (
            <button key={ch} onClick={() => setPreviewChannel(ch)}
              style={{ padding: '5px 14px', borderRadius: 9999, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${previewChannel === ch ? TEAL : BORDER}`,
                background: previewChannel === ch ? `${TEAL}15` : 'white',
                color: previewChannel === ch ? TEAL : MUTED, fontWeight: previewChannel === ch ? 700 : 400 }}>
              {channelCfg(ch).icon} {channelCfg(ch).label}
            </button>
          ))}
        </div>
        <div style={{ background: previewChannel === 'whatsapp' ? '#E7FBF0' : previewChannel === 'email' ? '#F8FAFC' : '#F3F0FF',
          border: `1px solid ${BORDER}`, borderRadius: 8, padding: '14px 16px' }}>
          {previewChannel === 'whatsapp' && (
            <div style={{ maxWidth: 340 }}>
              <div style={{ fontSize: 10, color: MUTED, marginBottom: 6 }}>WhatsApp Business Message · {supp.contactName}</div>
              <div style={{ background: 'white', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#111',
                lineHeight: 1.7, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>{previewMsg}</div>
            </div>
          )}
          {previewChannel === 'email' && (
            <div style={{ fontSize: 12, color: NAVY }}>
              <div style={{ marginBottom: 4 }}><strong>To:</strong> {supp.contactEmail}</div>
              <div style={{ marginBottom: 4 }}><strong>Subject:</strong> Purchase Order PO-2026-00499 — Paragon Corp</div>
              <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 8, paddingTop: 8, lineHeight: 1.7 }}>{previewMsg}</div>
              <div style={{ marginTop: 10, fontSize: 11, color: MUTED }}>Paragon Corp Procurement · procurement@paragon.co.id</div>
            </div>
          )}
          {previewChannel === 'edi' && (
            <pre style={{ fontSize: 11, color: '#374151', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
{`ISA*00*          *00*          *ZZ*PARAGON        *ZZ*BERLINA        *260407*1024*^*00501*000000001*0*P*>
GS*PO*PARAGONID*BERLINAID*20260407*1024*1*X*005010
ST*850*0001
BEG*00*NE*PO-2026-00499**20260407
REF*DP*NDC-Jatake-6
N1*BY*Paragon Corp
N1*SE*PT Berlina Packaging Indonesia
PO1*1*50000*PC*3700**PI*MAT-10045*VP*PET-100ML-AIRLESS
CTT*1
SE*10*0001
GE*1*1
IEA*1*000000001`}
            </pre>
          )}
        </div>
      </SCard>

      {/* Section E — Compliance rules */}
      <SCard title="E — Auto-applied Compliance Requirements">
        {COMPLIANCE_DOCS.map(d => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
            padding: '8px 12px', background: '#F8FAFC', borderRadius: 6, border: `1px solid ${BORDER}` }}>
            <span style={{ fontSize: 13, color: docStatusColor(d.status) }}>
              {d.status === 'valid' ? '✅' : d.status === 'expiring' ? '⚠️' : '❌'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>{d.name}</div>
              <div style={{ fontSize: 11, color: MUTED }}>{d.reason}</div>
            </div>
            <span style={{ fontSize: 10, color: MUTED }}>{d.required}</span>
          </div>
        ))}
        <button onClick={() => showToast('Compliance rules updated from country profile')}
          style={{ marginTop: 8, background: 'white', border: `1px solid ${BORDER}`, borderRadius: 6,
            padding: '7px 14px', fontSize: 12, cursor: 'pointer', color: MUTED }}>
          🔄 Refresh Rules
        </button>
      </SCard>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => showToast(`Profile saved. All future communications to ${supp.name} will use these settings.`)}
          style={{ background: TEAL, color: 'white', border: 'none', borderRadius: 6,
            padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Save Communication Profile
        </button>
      </div>
    </div>
  );
};


// ─── Tab 3: Compliance Documents ──────────────────────────────────────────────
const ComplianceTab: React.FC<{ supp: SupplierExtended; showToast: (m: string) => void }> = ({ supp, showToast }) => {
  const valid    = COMPLIANCE_DOCS.filter(d => d.status === 'valid').length;
  const total    = COMPLIANCE_DOCS.length;
  const score    = Math.round((valid / total) * 100);
  const missing  = COMPLIANCE_DOCS.filter(d => d.status === 'missing').length;
  const expiring = COMPLIANCE_DOCS.filter(d => d.status === 'expiring').length;
  const { getSupplierProfile } = useAdaptive();
  const ch = getSupplierProfile(supp.country).primaryChannel;

  return (
    <div>
      {/* Score bar */}
      <div style={{ background: 'white', borderRadius: 8, padding: '14px 18px', marginBottom: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>Compliance Score</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: score >= 80 ? GREEN : score >= 60 ? AMBER : RED }}>{score}%</span>
          </div>
          <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${score}%`, height: '100%',
              background: score >= 80 ? GREEN : score >= 60 ? AMBER : RED, borderRadius: 4 }} />
          </div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>
            {missing} document{missing !== 1 ? 's' : ''} missing · {expiring} expiring soon
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: score >= 80 ? GREEN : AMBER }}>{score}%</div>
          <div style={{ fontSize: 10, color: MUTED }}>Compliance</div>
        </div>
      </div>

      {/* Document cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {COMPLIANCE_DOCS.map(d => (
          <div key={d.name} style={{ background: 'white', borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            border: `1px solid ${docStatusColor(d.status)}33`,
            borderLeft: `4px solid ${docStatusColor(d.status)}`,
            overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>{d.name}</span>
                <span style={{ background: docStatusBg(d.status), color: docStatusColor(d.status),
                  borderRadius: 9999, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>
                  {docStatusLabel(d.status)}
                </span>
              </div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 8, lineHeight: 1.5 }}>{d.reason}</div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: MUTED }}>
                <span>Expiry: <strong style={{ color: NAVY }}>{d.expiry ?? 'N/A'}</strong></span>
                <span>Uploaded: <strong style={{ color: NAVY }}>{d.uploaded ?? '—'}</strong></span>
              </div>
              <div style={{ fontSize: 10, color: TEAL, marginTop: 4, fontWeight: 600 }}>{d.required}</div>
            </div>
            <div style={{ padding: '8px 14px', background: '#F8FAFC', borderTop: `1px solid ${BORDER}`,
              display: 'flex', gap: 8 }}>
              <button onClick={() => showToast(`Document update requested from ${supp.name} via ${ch}`)}
                style={{ flex: 1, padding: '5px 0', background: d.status === 'missing' ? RED : AMBER, color: 'white',
                  border: 'none', borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                {d.status === 'missing' ? 'Request Upload' : 'Request Update'}
              </button>
              <button onClick={() => showToast('File browser opened (mock)')}
                style={{ flex: 1, padding: '5px 0', background: 'white', color: NAVY,
                  border: `1px solid ${BORDER}`, borderRadius: 5, fontSize: 11, cursor: 'pointer' }}>
                Upload on Behalf
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Tab 4: Catalog & Capacity ────────────────────────────────────────────────
const CatalogTab: React.FC<{ supp: SupplierExtended; showToast: (m: string) => void }> = ({ supp, showToast }) => {
  const navigate = useNavigate();
  const totalCap = '450,000 PCS/mo';
  return (
    <div>
      <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        overflow: 'hidden', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: `2px solid ${BORDER}` }}>
              {['Material', 'SAP Code', 'MOQ', 'Lead Time', 'Unit Price', 'Capacity/Month', 'Halal', 'Last Updated', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: MUTED, fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATALOG_ITEMS.map((item, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? 'white' : '#F8FAFC' }}>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: NAVY }}>{item.material}</td>
                <td style={{ padding: '10px 14px', color: MUTED, fontFamily: 'monospace', fontSize: 11 }}>{item.sapCode}</td>
                <td style={{ padding: '10px 14px' }}>{item.moq}</td>
                <td style={{ padding: '10px 14px' }}>{item.leadTime}</td>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: TEAL }}>{item.unitPrice}</td>
                <td style={{ padding: '10px 14px' }}>{item.capacity}</td>
                <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 14 }}>{item.halalMaterial ? '✅' : '—'}</td>
                <td style={{ padding: '10px 14px', color: MUTED, fontSize: 11 }}>{item.lastUpdated}</td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => navigate('/buyer/sourcing')}
                      style={{ background: TEAL, color: 'white', border: 'none', borderRadius: 5,
                        padding: '4px 8px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                      RFQ →
                    </button>
                    <button onClick={() => showToast(`PO history for ${item.sapCode} — 12 orders in last 24 months`)}
                      style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 5,
                        padding: '4px 8px', fontSize: 10, cursor: 'pointer', color: MUTED }}>
                      PO Hist.
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Capacity Summary */}
      <div style={{ background: 'white', borderRadius: 8, padding: '16px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 24 }}>
        {[
          { label: 'Total Monthly Capacity', value: totalCap, color: TEAL },
          { label: 'Current Utilization', value: '68%', color: GREEN },
          { label: 'Peak Season Capacity', value: '+30% (Oct–Dec)', color: AMBER },
          { label: 'Available Capacity', value: '~144,000 PCS/mo', color: BLUE },
        ].map(t => (
          <div key={t.label} style={{ flex: 1, textAlign: 'center', borderRight: `1px solid ${BORDER}`, paddingRight: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: t.color }}>{t.value}</div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{t.label}</div>
          </div>
        ))}
        <button onClick={() => showToast(`Capacity update request sent to ${supp.name} via WhatsApp`)}
          style={{ background: 'white', border: `1px solid ${TEAL}`, color: TEAL, borderRadius: 6,
            padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          Request Update
        </button>
      </div>
    </div>
  );
};


// ─── Tab 5: Performance History ───────────────────────────────────────────────
const PerfTab: React.FC<{ supp: SupplierExtended }> = ({ supp }) => (
  <div>
    {/* OTIF Chart */}
    <div style={{ background: 'white', borderRadius: 8, padding: '16px 18px', marginBottom: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: NAVY, marginBottom: 12 }}>
        12-Month OTIF Trend — {supp.name}
      </div>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={PERF_HISTORY} margin={{ top: 4, right: 16, bottom: 4, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: MUTED }} />
            <YAxis domain={[60, 100]} tick={{ fontSize: 11, fill: MUTED }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <ReferenceLine y={90} stroke={RED} strokeDasharray="4 2" label={{ value: 'Target 90%', fill: RED, fontSize: 10 }} />
            <Line type="monotone" dataKey="otif" stroke={TEAL} strokeWidth={2.5} dot={{ r: 4, fill: TEAL }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>

    {/* Grade Evolution + KPIs */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
      <div style={{ background: 'white', borderRadius: 8, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: NAVY, marginBottom: 12 }}>Scorecard Grade</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: gradeColor(ScorecardGrade.B),
              background: '#EFF6FF', borderRadius: 8, width: 60, height: 60, display: 'flex',
              alignItems: 'center', justifyContent: 'center' }}>B</div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>6 months ago</div>
          </div>
          <div style={{ fontSize: 24, color: MUTED }}>→</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: gradeColor(supp.scorecardGrade),
              background: supp.scorecardGrade === ScorecardGrade.A ? '#F0FDF4' : '#FFFBEB',
              borderRadius: 8, width: 60, height: 60, display: 'flex',
              alignItems: 'center', justifyContent: 'center' }}>{supp.scorecardGrade}</div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>Current</div>
          </div>
          <div style={{ flex: 1, fontSize: 12, color: AMBER }}>
            ▼ Downgrade trend — OTIF improvement plan active
          </div>
        </div>
      </div>
      <div style={{ background: 'white', borderRadius: 8, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: NAVY, marginBottom: 12 }}>Key Performance Indicators</div>
        {[
          { label: 'OTIF',                value: supp.otif,                   target: 90 },
          { label: 'Lead Time Adherence', value: supp.leadTimeAdherence ?? 80, target: 90 },
          { label: 'Invoice Accuracy',    value: supp.invoiceAccuracy ?? 91,   target: 95 },
        ].map(kpi => (
          <div key={kpi.label} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
              <span style={{ color: MUTED }}>{kpi.label}</span>
              <span style={{ fontWeight: 700, color: kpi.value >= kpi.target ? GREEN : AMBER }}>{kpi.value}%</span>
            </div>
            <div style={{ height: 6, background: '#F1F5F9', borderRadius: 3 }}>
              <div style={{ width: `${kpi.value}%`, height: '100%', background: kpi.value >= kpi.target ? GREEN : AMBER, borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Strengths & Improvements */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
      <div style={{ background: '#F0FDF4', border: `1px solid #BBF7D0`, borderRadius: 8, padding: '14px 16px' }}>
        <div style={{ fontWeight: 600, fontSize: 12, color: GREEN, marginBottom: 10 }}>✅ Top 3 Strengths</div>
        {['Invoice accuracy (91%) — above category average', 'Responsive communication (WhatsApp ≤2h reply)', 'Consistent sample quality and colour matching'].map(s => (
          <div key={s} style={{ fontSize: 12, color: '#374151', marginBottom: 6 }}>• {s}</div>
        ))}
      </div>
      <div style={{ background: '#FFFBEB', border: `1px solid #FDE68A`, borderRadius: 8, padding: '14px 16px' }}>
        <div style={{ fontWeight: 600, fontSize: 12, color: AMBER, marginBottom: 10 }}>⚠️ Top 2 Improvement Areas</div>
        {['OTIF (82%) — below 90% target 9 of 12 months', 'Missing BPJPH Halal Certificate — blocking halal line orders'].map(s => (
          <div key={s} style={{ fontSize: 12, color: '#374151', marginBottom: 6 }}>• {s}</div>
        ))}
      </div>
    </div>

    {/* Recent POs */}
    <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 18px', borderBottom: `1px solid ${BORDER}`, fontWeight: 600, fontSize: 13, color: NAVY }}>
        Recent PO Transactions
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#F8FAFC', borderBottom: `1px solid ${BORDER}` }}>
            {['PO Number', 'Material', 'Qty', 'Value', 'Ordered', 'Delivered', 'OTIF Result', 'Status'].map(h => (
              <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: MUTED, fontSize: 11 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {RECENT_POS.map((po, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? 'white' : '#F8FAFC' }}>
              <td style={{ padding: '9px 14px', fontWeight: 600, color: TEAL }}>{po.poNum}</td>
              <td style={{ padding: '9px 14px', color: NAVY }}>{po.material}</td>
              <td style={{ padding: '9px 14px', color: MUTED }}>{po.qty}</td>
              <td style={{ padding: '9px 14px', fontWeight: 600 }}>{po.value}</td>
              <td style={{ padding: '9px 14px', color: MUTED }}>{po.ordered}</td>
              <td style={{ padding: '9px 14px', color: MUTED }}>{po.delivery}</td>
              <td style={{ padding: '9px 14px' }}>{po.otif}</td>
              <td style={{ padding: '9px 14px' }}>
                <span style={{ background: '#F0FDF4', color: GREEN, borderRadius: 9999,
                  padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>{po.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ─── Tab 6: Message Log ───────────────────────────────────────────────────────
const MsgLogTab: React.FC = () => (
  <div>
    <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
      {MSG_LOG.map((msg, i) => {
        const cfg = channelCfg(msg.channel);
        const dir = msg.direction;
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 18px',
            borderBottom: i < MSG_LOG.length - 1 ? `1px solid ${BORDER}` : 'none',
            background: dir === 'in' ? '#F8FAFC' : 'white',
          }}>
            <div style={{ width: 30, textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: msgDirColor(dir) }}>{msgDirIcon(dir)}</div>
              <div style={{ fontSize: 10, color: MUTED }}>{dir === 'out' ? 'OUT' : 'IN'}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: MUTED }}>{msg.ts}</span>
                <span style={{ background: cfg.color + '20', color: cfg.color,
                  borderRadius: 9999, padding: '1px 8px', fontSize: 10, fontWeight: 600 }}>
                  {cfg.icon} {cfg.label}
                </span>
                <span style={{ background: '#F1F5F9', color: MUTED, borderRadius: 9999,
                  padding: '1px 8px', fontSize: 10 }}>{msg.docType}</span>
                <span style={{ marginLeft: 'auto', fontSize: 12 }}>{statusIcon(msg.status)}</span>
              </div>
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{msg.preview}</div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);


// ─── Header Card ──────────────────────────────────────────────────────────────
const ProfileHeader: React.FC<{
  supp: SupplierExtended;
  showToast: (m: string) => void;
}> = ({ supp, showToast }) => {
  const { getSupplierProfile, isBusinessHours, getLocalTime } = useAdaptive();
  const cp = getSupplierProfile(supp.country);
  const [localTime, setLocalTime] = useState(getLocalTime(supp.country));
  const [bizHours, setBizHours]   = useState(isBusinessHours(supp.country));

  useEffect(() => {
    const id = setInterval(() => {
      setLocalTime(getLocalTime(supp.country));
      setBizHours(isBusinessHours(supp.country));
    }, 60_000);
    return () => clearInterval(id);
  }, [supp.country]);

  const ch = CHANNEL_CONFIG[cp.primaryChannel as keyof typeof CHANNEL_CONFIG];
  const gc = gradeColor(supp.scorecardGrade);

  return (
    <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1E3A5F 100%)`,
      borderRadius: 10, padding: '20px 24px', marginBottom: 20, color: 'white',
      display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr', gap: 20 }}>
      {/* Left */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <span style={{ fontSize: 40 }}>{cp.flag}</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'white', lineHeight: 1.1 }}>{supp.name}</div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{supp.sapBpNumber}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ background: TEAL, borderRadius: 9999, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
            {supp.category}
          </span>
          <span style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 9999, padding: '2px 10px', fontSize: 11 }}>
            Tier {supp.tier}
          </span>
          <span style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 9999, padding: '2px 10px', fontSize: 11 }}>
            {supp.city}, {cp.name}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#CBD5E1', flexWrap: 'wrap' }}>
          <span>🌍 {cp.name}</span>
          <span>🕐 {localTime} local</span>
          <span style={{ background: ch.color + '33', color: 'white', borderRadius: 9999,
            padding: '1px 8px', fontSize: 11 }}>
            {ch.icon} {ch.label}
          </span>
        </div>
      </div>

      {/* Center */}
      <div style={{ borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: 20 }}>
        <div style={{ marginBottom: 12 }}>
          {bizHours ? (
            <div style={{ background: '#16A34A22', border: '1px solid #16A34A66', borderRadius: 6,
              padding: '6px 12px', fontSize: 12, color: '#4ADE80', fontWeight: 600 }}>
              ✅ Business Hours Now
            </div>
          ) : (
            <div style={{ background: '#DC262622', border: '1px solid #DC262666', borderRadius: 6,
              padding: '6px 12px', fontSize: 12, color: '#F87171', fontWeight: 600 }}>
              🔴 Outside Business Hours
            </div>
          )}
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>
            Hours: {cp.businessHours.start} – {cp.businessHours.end} · {cp.timezone}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 9999,
            padding: '3px 10px', fontSize: 11, color: '#CBD5E1' }}>
            {cp.flag} {cp.languageLabel}
          </span>
          <span style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 9999,
            padding: '3px 10px', fontSize: 11, color: '#CBD5E1' }}>
            {cp.tone === 'conversational' ? '🤝 Conversational' : '💼 Formal'}
          </span>
        </div>
      </div>

      {/* Right */}
      <div style={{ borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: 20,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <div style={{ width: 64, height: 64, borderRadius: 12, background: gc,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, fontWeight: 900, color: 'white', boxShadow: `0 0 0 4px ${gc}44` }}>
          {supp.scorecardGrade}
        </div>
        <div style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>
          OTIF: <strong style={{ color: 'white' }}>{supp.otif}%</strong>
        </div>
        <button onClick={() => showToast(`Opening message composer for ${supp.name} via ${ch.label}...`)}
          style={{ background: TEAL, color: 'white', border: 'none', borderRadius: 6,
            padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
          💬 Send Message
        </button>
        <button onClick={() => showToast('Edit mode — coming soon')}
          style={{ background: 'transparent', color: '#CBD5E1', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 6, padding: '7px 16px', fontSize: 12, cursor: 'pointer', width: '100%' }}>
          ✏️ Edit Profile
        </button>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',    label: '📋 Overview' },
  { id: 'comm',        label: '💬 Communication Setup' },
  { id: 'compliance',  label: '📄 Compliance Documents' },
  { id: 'catalog',     label: '📦 Catalog & Capacity' },
  { id: 'performance', label: '📊 Performance History' },
  { id: 'msglog',      label: '💬 Message Log' },
];

const SupplierProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const { toast, show: showToast } = useToast();

  const supp = useMemo(() => mockSuppliers.find(s => s.id === id), [id]);

  if (!supp) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: MUTED }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Supplier not found</div>
        <button onClick={() => navigate('/buyer/suppliers')}
          style={{ marginTop: 16, background: TEAL, color: 'white', border: 'none', borderRadius: 6,
            padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}>
          ← Back to Directory
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px', background: BG, minHeight: '100%' }}>
      {toast && <Toast msg={toast} />}

      {/* Back breadcrumb */}
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => navigate('/buyer/suppliers')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEAL,
            fontSize: 12, fontWeight: 600, padding: 0 }}>
          ← Supplier Directory
        </button>
        <span style={{ color: MUTED, fontSize: 12 }}> / {supp.name}</span>
      </div>

      <ProfileHeader supp={supp} showToast={showToast} />

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${BORDER}`, marginBottom: 20, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: '10px 16px', border: 'none', cursor: 'pointer', background: 'transparent',
              borderBottom: activeTab === t.id ? `3px solid ${TEAL}` : '3px solid transparent',
              marginBottom: -2, fontSize: 13, whiteSpace: 'nowrap',
              fontWeight: activeTab === t.id ? 700 : 400,
              color: activeTab === t.id ? TEAL : MUTED }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview'    && <OverviewTab    supp={supp} />}
      {activeTab === 'comm'        && <CommTab        supp={supp} showToast={showToast} />}
      {activeTab === 'compliance'  && <ComplianceTab  supp={supp} showToast={showToast} />}
      {activeTab === 'catalog'     && <CatalogTab     supp={supp} showToast={showToast} />}
      {activeTab === 'performance' && <PerfTab        supp={supp} />}
      {activeTab === 'msglog'      && <MsgLogTab />}
    </div>
  );
};

export default SupplierProfile;
