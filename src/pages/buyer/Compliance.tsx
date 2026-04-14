import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, FileText, RefreshCw, Download, Shield } from 'lucide-react';

const NAVY   = '#0D1B2A';
const TEAL   = '#0097A7';
const MID    = '#354A5F';
const MUTED  = '#64748B';
const BORDER = '#E2E8F0';
const SUCCESS = '#107E3E';
const WARNING = '#E9730C';
const ERROR   = '#BB0000';

interface ComplianceItem {
  id: string;
  supplier: string;
  country: string;
  type: string;
  category: string;
  status: 'Valid' | 'Expiring' | 'Expired' | 'Missing' | 'Under Review';
  issuedBy: string;
  expiryDate: string | null;
  daysRemaining: number | null;
  action: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
}

const COMPLIANCE_ITEMS: ComplianceItem[] = [
  { id: 'c-001', supplier: 'Caelo PET Bottle Manufacturer GmbH', country: 'DE', type: 'Halal Certificate', category: 'Halal', status: 'Expired', issuedBy: 'MUI', expiryDate: '2025-04-30', daysRemaining: -346, action: 'Request renewal immediately — blocks new POs', priority: 'Critical' },
  { id: 'c-002', supplier: 'Firmenich Malaysia Sdn. Bhd.', country: 'MY', type: 'ISO 9001:2015', category: 'Quality', status: 'Expiring', issuedBy: 'TÜV Rheinland', expiryDate: '2026-06-19', daysRemaining: 70, action: 'Request updated certificate before expiry', priority: 'High' },
  { id: 'c-003', supplier: 'Evonik Specialty Chemicals France', country: 'FR', type: 'REACH Compliance', category: 'Regulatory', status: 'Expiring', issuedBy: 'ECHA', expiryDate: '2026-07-04', daysRemaining: 85, action: 'Confirm REACH registration renewal status', priority: 'High' },
  { id: 'c-004', supplier: 'PT Ecogreen Oleochemicals', country: 'ID', type: 'BPJPH Halal Certificate', category: 'Halal', status: 'Valid', issuedBy: 'BPJPH', expiryDate: '2027-03-09', daysRemaining: 697, action: 'No action required', priority: 'Low' },
  { id: 'c-005', supplier: 'PT Musim Mas Specialty Fats', country: 'ID', type: 'BPJPH Halal Certificate', category: 'Halal', status: 'Valid', issuedBy: 'BPJPH', expiryDate: '2026-09-10', daysRemaining: 153, action: 'No action required', priority: 'Low' },
  { id: 'c-006', supplier: 'Givaudan Indonesia Fragrances', country: 'ID', type: 'BPJPH Halal Certificate', category: 'Halal', status: 'Valid', issuedBy: 'BPJPH', expiryDate: '2027-09-01', daysRemaining: 873, action: 'No action required', priority: 'Low' },
  { id: 'c-007', supplier: 'BASF Personal Care Emulsifiers GmbH', country: 'DE', type: 'ISO 14001:2015', category: 'Environmental', status: 'Valid', issuedBy: 'TÜV SÜD', expiryDate: '2027-02-13', daysRemaining: 671, action: 'No action required', priority: 'Low' },
  { id: 'c-008', supplier: 'PT Berlina Packaging Indonesia', country: 'ID', type: 'BPJPH Halal Certificate', category: 'Halal', status: 'Valid', issuedBy: 'BPJPH', expiryDate: '2027-09-01', daysRemaining: 873, action: 'No action required', priority: 'Low' },
  { id: 'c-009', supplier: 'Zhejiang NHU Vitamins Co.', country: 'CN', type: 'GMP Certificate', category: 'Quality', status: 'Valid', issuedBy: 'NMPA', expiryDate: '2027-01-09', daysRemaining: 636, action: 'No action required', priority: 'Low' },
  { id: 'c-010', supplier: 'PT Halal Emulsifier Nusantara', country: 'ID', type: 'BPJPH Halal Certificate', category: 'Halal', status: 'Valid', issuedBy: 'BPJPH', expiryDate: '2026-08-31', daysRemaining: 143, action: 'No action required', priority: 'Low' },
  { id: 'c-011', supplier: 'Anhui Salicylics & Niacinamide Ltd.', country: 'CN', type: 'BPJPH Halal Certificate', category: 'Halal', status: 'Missing', issuedBy: '—', expiryDate: null, daysRemaining: null, action: 'Halal certification required before October 2026 — initiate application', priority: 'High' },
  { id: 'c-012', supplier: 'Caelo PET Bottle Manufacturer GmbH', country: 'DE', type: 'BPOM Notification', category: 'Regulatory', status: 'Under Review', issuedBy: 'BPOM', expiryDate: null, daysRemaining: null, action: 'Pending BPOM review — follow up with regulatory team', priority: 'Medium' },
];

const STATUS_CFG: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  'Valid':        { bg: '#DCFCE7', color: SUCCESS, icon: <CheckCircle size={12} /> },
  'Expiring':     { bg: '#FEF3C7', color: WARNING, icon: <Clock size={12} /> },
  'Expired':      { bg: '#FEE2E2', color: ERROR,   icon: <AlertTriangle size={12} /> },
  'Missing':      { bg: '#FEE2E2', color: ERROR,   icon: <AlertTriangle size={12} /> },
  'Under Review': { bg: '#EFF6FF', color: '#0097A7', icon: <RefreshCw size={12} /> },
};

const PRIORITY_CFG: Record<string, { bg: string; color: string }> = {
  'Critical': { bg: '#FEE2E2', color: ERROR },
  'High':     { bg: '#FEF3C7', color: WARNING },
  'Medium':   { bg: '#EFF6FF', color: TEAL },
  'Low':      { bg: '#F1F5F9', color: MUTED },
};

function fmtDate(s: string | null): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Pill({ label, bg, color, icon }: { label: string; bg: string; color: string; icon?: React.ReactNode }) {
  return (
    <span style={{ background: bg, color, borderRadius: 9999, padding: '2px 8px', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      {icon}{label}
    </span>
  );
}

const Compliance: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const filtered = COMPLIANCE_ITEMS.filter(item => {
    if (filterStatus !== 'All' && item.status !== filterStatus) return false;
    if (filterCategory !== 'All' && item.category !== filterCategory) return false;
    return true;
  });

  const expired  = COMPLIANCE_ITEMS.filter(i => i.status === 'Expired').length;
  const expiring = COMPLIANCE_ITEMS.filter(i => i.status === 'Expiring').length;
  const missing  = COMPLIANCE_ITEMS.filter(i => i.status === 'Missing').length;
  const valid    = COMPLIANCE_ITEMS.filter(i => i.status === 'Valid').length;

  const STATUSES   = ['All', 'Expired', 'Expiring', 'Missing', 'Under Review', 'Valid'];
  const CATEGORIES = ['All', 'Halal', 'Quality', 'Regulatory', 'Environmental'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {toast && <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: NAVY, color: 'white', padding: '12px 20px', borderRadius: 8, zIndex: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', fontSize: 13, borderLeft: `3px solid ${TEAL}`, maxWidth: 360 }}>{toast}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 4 }}>Compliance Tracker</div>
          <div style={{ fontSize: 13, color: MUTED }}>Halal · BPOM · ISO · REACH · GMP · October 2026 BPJPH mandatory transition</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => showToast('Generating compliance report PDF...')} style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: MID, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={13} /> Export Report
          </button>
        </div>
      </div>

      <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#92400E' }}>
        <Shield size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <div><strong>BPJPH Mandatory Transition — October 2026:</strong> All cosmetics and personal care products distributed in Indonesia must carry BPJPH-issued halal certification. Suppliers with MUI-only certificates must initiate BPJPH applications now. <strong>{COMPLIANCE_ITEMS.filter(i => i.category === 'Halal' && i.status !== 'Expired').length} of {COMPLIANCE_ITEMS.filter(i => i.category === 'Halal').length} halal certs</strong> are BPJPH-compliant.</div>
      </div>

      {(() => {
        const deadline = new Date('2026-10-01');
        const today = new Date();
        const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
        const pct = Math.max(0, Math.min(100, (daysLeft / 365) * 100));
        return (
          <div style={{ background: 'white', border: '1px solid #F59E0B', borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0D1B2A' }}>BPJPH Mandatory Deadline</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>All Indonesian cosmetics must carry BPJPH halal cert by 01 Oct 2026</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: daysLeft <= 90 ? '#BB0000' : '#E9730C', lineHeight: 1 }}>{daysLeft}</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>days remaining</div>
              </div>
            </div>
            <div style={{ background: '#F1F5F9', borderRadius: 9999, height: 6, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, background: daysLeft <= 90 ? '#BB0000' : '#E9730C', height: 6, borderRadius: 9999, transition: 'width 0.3s' }} />
            </div>
          </div>
        );
      })()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Expired', value: expired,  color: ERROR,   bg: '#FEE2E2', icon: <AlertTriangle size={14} /> },
          { label: 'Expiring ≤90d', value: expiring, color: WARNING, bg: '#FEF3C7', icon: <Clock size={14} /> },
          { label: 'Missing', value: missing,  color: ERROR,   bg: '#FEE2E2', icon: <FileText size={14} /> },
          { label: 'Valid', value: valid,    color: SUCCESS, bg: '#DCFCE7', icon: <CheckCircle size={14} /> },
        ].map(({ label, value, color, bg, icon }) => (
          <div key={label} style={{ background: 'white', border: `1px solid ${BORDER}`, borderLeft: `4px solid ${color}`, borderRadius: 8, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>{icon}{label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 6, padding: 3, gap: 2, flexWrap: 'wrap' }}>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: '5px 12px', border: 'none', borderRadius: 4, background: filterStatus === s ? 'white' : 'transparent', color: filterStatus === s ? NAVY : MUTED, fontWeight: filterStatus === s ? 700 : 500, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', boxShadow: filterStatus === s ? '0 1px 3px rgba(0,0,0,0.1)' : undefined, whiteSpace: 'nowrap' }}>{s}</button>
          ))}
        </div>
        <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 6, padding: 3, gap: 2 }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setFilterCategory(c)} style={{ padding: '5px 12px', border: 'none', borderRadius: 4, background: filterCategory === c ? 'white' : 'transparent', color: filterCategory === c ? NAVY : MUTED, fontWeight: filterCategory === c ? 700 : 500, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', boxShadow: filterCategory === c ? '0 1px 3px rgba(0,0,0,0.1)' : undefined }}>{c}</button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: MUTED }}>{filtered.length} of {COMPLIANCE_ITEMS.length} items</span>
      </div>

      <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: NAVY, color: 'white' }}>
              {['Supplier', 'Certificate Type', 'Category', 'Issued By', 'Expiry', 'Status', 'Priority', 'Action Required', 'Remind'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, idx) => {
              const sCfg = STATUS_CFG[item.status];
              const pCfg = PRIORITY_CFG[item.priority];
              return (
                <tr key={item.id} style={{ background: idx % 2 === 0 ? 'white' : '#F8FAFC', borderTop: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '11px 12px', fontWeight: 600, color: NAVY, fontSize: 12 }}>
                    {item.supplier.split(' ').slice(0, 3).join(' ')}
                    <div style={{ fontSize: 11, color: MUTED, fontWeight: 400 }}>{item.country}</div>
                  </td>
                  <td style={{ padding: '11px 12px', color: MID, fontSize: 12 }}>{item.type}</td>
                  <td style={{ padding: '11px 12px' }}><Pill label={item.category} bg="#F1F5F9" color={MID} /></td>
                  <td style={{ padding: '11px 12px', color: MUTED, fontSize: 11 }}>{item.issuedBy}</td>
                  <td style={{ padding: '11px 12px', fontSize: 11, whiteSpace: 'nowrap' }}>
                    {fmtDate(item.expiryDate)}
                    {item.daysRemaining !== null && (
                      <div style={{ fontSize: 10, color: item.daysRemaining <= 0 ? ERROR : item.daysRemaining <= 90 ? WARNING : MUTED, marginTop: 2 }}>
                        {item.daysRemaining <= 0 ? `Expired ${Math.abs(item.daysRemaining)}d ago` : `${item.daysRemaining}d remaining`}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '11px 12px' }}><Pill label={item.status} bg={sCfg.bg} color={sCfg.color} icon={sCfg.icon} /></td>
                  <td style={{ padding: '11px 12px' }}><Pill label={item.priority} bg={pCfg.bg} color={pCfg.color} /></td>
                  <td style={{ padding: '11px 12px', fontSize: 11, color: item.priority === 'Critical' ? ERROR : item.priority === 'High' ? WARNING : MUTED, maxWidth: 200 }}>{item.action}</td>
                  <td style={{ padding: '11px 12px' }}>
                    {(item.priority === 'Critical' || item.priority === 'High' || item.priority === 'Medium') && (
                      <button
                        onClick={() => showToast(`Renewal reminder sent to ${item.supplier.split(' ').slice(0,2).join(' ')} via WhatsApp`)}
                        style={{ background: item.priority === 'Critical' ? '#BB0000' : '#E9730C', color: 'white', border: 'none', borderRadius: 5, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                      >
                        Send Reminder
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ background: '#E0F7FA', border: '1px solid #0097A744', borderRadius: 8, padding: '12px 16px', fontSize: 12, color: '#006064', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <Shield size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <span><strong>Phase 2 — Live Integration:</strong> Compliance tracking will connect to SAP S/4HANA vendor master, BPJPH API, and supplier document vault. Automated renewal reminders via WhatsApp 90 days before expiry.</span>
      </div>

    </div>
  );
};

export default Compliance;
