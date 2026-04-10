import React, { useState } from 'react';
import {
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────
interface InspectionItem {
  id: string; grNumber: string; asnNumber: string; poNumber: string;
  supplier: string; country: string; material: string; materialCode: string;
  batchNumber: string; qtyReceived: string; qtyOrdered: string; variance: string;
  receivedDate: string; dockLocation: string; inspectionType: string;
  priority: 'High' | 'Medium' | 'Low'; halalRequired: boolean;
  coaReceived: boolean; sdsReceived: boolean; channel: string;
}

interface InspectionResult {
  grNumber: string; material: string; supplier: string; batch: string;
  result: 'PASSED' | 'PARTIAL' | 'HOLD' | 'REJECTED';
  disposition: string; qty: string; inspector: string; date: string;
  sapDoc: string; qcRef: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const PENDING_ITEMS: InspectionItem[] = [
  {
    id: 'insp-001', grNumber: 'GR-2026-PENDING-001', asnNumber: 'ASN-2026-002',
    poNumber: 'PO-2025-00108', supplier: 'Zhejiang NHU Vitamins Co.', country: '🇨🇳',
    material: 'Niacinamide B3 USP Grade', materialCode: 'MAT-10234',
    batchNumber: 'ZNH-2026-B047', qtyReceived: '480 KG', qtyOrdered: '500 KG',
    variance: '-4%', receivedDate: '2026-04-07', dockLocation: 'Dock 3 — NDC Jatake 6',
    inspectionType: 'Full Inspection', priority: 'High', halalRequired: true,
    coaReceived: true, sdsReceived: true, channel: 'API',
  },
  {
    id: 'insp-002', grNumber: 'GR-2026-PENDING-002', asnNumber: 'ASN-2026-001',
    poNumber: 'PO-2025-00107', supplier: 'PT Berlina Packaging Indonesia', country: '🇮🇩',
    material: 'PET Bottle 100ml Airless Pump', materialCode: 'MAT-10045',
    batchNumber: 'BRL-2026-0234', qtyReceived: '50,000 PCS', qtyOrdered: '50,000 PCS',
    variance: '0%', receivedDate: '2026-04-08', dockLocation: 'Dock 1 — NDC Jatake 6',
    inspectionType: 'Sampling (AQL 2.5)', priority: 'Medium', halalRequired: false,
    coaReceived: true, sdsReceived: false, channel: 'Web',
  },
  {
    id: 'insp-003', grNumber: 'GR-2026-PENDING-003', asnNumber: 'ASN-2026-006',
    poNumber: 'PO-2025-00115', supplier: 'PT Musim Mas Specialty Fats', country: '🇮🇩',
    material: 'Palm Kernel Oil RBD', materialCode: 'MAT-10089',
    batchNumber: 'MMS-2026-PKO-019', qtyReceived: '5,000 KG', qtyOrdered: '5,000 KG',
    variance: '0%', receivedDate: '2026-04-08', dockLocation: 'Dock 2 — RM/PM Warehouse',
    inspectionType: 'Full Inspection', priority: 'High', halalRequired: true,
    coaReceived: true, sdsReceived: true, channel: 'WhatsApp',
  },
];

const RESULTS: InspectionResult[] = [
  { grNumber: 'GR-2026-0234', material: 'PET Bottle 100ml', supplier: 'PT Berlina',
    batch: 'BRL-2026-0198', result: 'PASSED', disposition: 'Full Accept',
    qty: '30,000 PCS', inspector: 'Ariva P.', date: '2026-04-02',
    sapDoc: '4900023456', qcRef: 'QC-2026-0891' },
  { grNumber: 'GR-2026-0231', material: 'Niacinamide B3', supplier: 'Zhejiang NHU',
    batch: 'ZNH-2026-B041', result: 'PARTIAL', disposition: 'Accept 480/500 KG (-4%)',
    qty: '480 KG', inspector: 'Ika A.', date: '2026-04-01',
    sapDoc: '4900023412', qcRef: 'QC-2026-0887' },
  { grNumber: 'GR-2026-0228', material: 'Halal Glycerin', supplier: 'PT Halal Emulsifier',
    batch: 'HEN-2026-082', result: 'HOLD', disposition: 'Pending lab — ETA Apr 10',
    qty: '2,000 KG', inspector: 'Sarah K.', date: '2026-03-30',
    sapDoc: '—', qcRef: 'QC-2026-0882' },
  { grNumber: 'GR-2026-0225', material: 'Panthenol B5', supplier: 'BASF Personal Care DE',
    batch: 'BASF-2026-P0234', result: 'REJECTED',
    disposition: 'Return to supplier — purity 97.2% (spec ≥99%)',
    qty: '100 KG', inspector: 'Wachid A.', date: '2026-03-28',
    sapDoc: '4900023344', qcRef: 'QC-2026-0878' },
];

const HISTORY_DATA = [
  ...RESULTS,
  { grNumber: 'GR-2026-0222', material: 'Shea Butter Grade A', supplier: 'PT Mewah',
    batch: 'MW-2026-041', result: 'PASSED' as const, disposition: 'Full Accept',
    qty: '500 KG', inspector: 'Ariva P.', date: '2026-03-25',
    sapDoc: '4900023299', qcRef: 'QC-2026-0871' },
  { grNumber: 'GR-2026-0219', material: 'Fragrance FG-2847', supplier: 'Givaudan DE',
    batch: 'GIV-2026-3847', result: 'PASSED' as const, disposition: 'Full Accept',
    qty: '25 KG', inspector: 'Ika A.', date: '2026-03-22',
    sapDoc: '4900023271', qcRef: 'QC-2026-0865' },
];

const LAB_TESTS: Record<string, { test: string; spec: string; unit: string }[]> = {
  'insp-001': [
    { test: 'Purity (HPLC)', spec: '≥99.0%', unit: '%' },
    { test: 'Moisture Content', spec: '≤0.5%', unit: '%' },
    { test: 'Heavy Metals', spec: '≤10 ppm', unit: 'ppm' },
    { test: 'Microbial Count', spec: '≤100 CFU/g', unit: 'CFU/g' },
  ],
  'insp-003': [
    { test: 'Free Fatty Acid', spec: '≤0.1%', unit: '%' },
    { test: 'Peroxide Value', spec: '≤2 meq/kg', unit: 'meq/kg' },
    { test: 'Iodine Value', spec: '14-22 g I2/100g', unit: 'g I2/100g' },
    { test: 'Moisture', spec: '≤0.1%', unit: '%' },
  ],
};

const MONTHS = ['May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr'];
const PASS_TREND = [88,85,90,87,83,89,91,88,86,90,88,83].map((v,i) => ({ month: MONTHS[i], rate: v }));
const PIE_RESULT = [
  { name: 'Passed', value: 14, color: '#107E3E' },
  { name: 'Partial', value: 2, color: '#0A6ED1' },
  { name: 'Hold', value: 1, color: '#E9730C' },
  { name: 'Rejected', value: 1, color: '#BB0000' },
];
const REJECTION_SUPPLIER = [
  { supplier: 'BASF Personal Care DE', rejections: 2 },
  { supplier: 'Evonik Specialty FR', rejections: 1 },
  { supplier: 'Zhejiang NHU', rejections: 1 },
];
const REJECTION_REASON = [
  { name: 'Purity Failure', value: 2, color: '#BB0000' },
  { name: 'Qty Short', value: 1, color: '#E9730C' },
  { name: 'Pkg Damaged', value: 1, color: '#F59E0B' },
];

const PRIORITY_COLOR: Record<string, string> = {
  High: '#BB0000', Medium: '#E9730C', Low: '#94A3B8',
};
const RESULT_COLOR: Record<string, string> = {
  PASSED: '#107E3E', PARTIAL: '#0A6ED1', HOLD: '#E9730C', REJECTED: '#BB0000',
};
const RESULT_BG: Record<string, string> = {
  PASSED: '#DCFCE7', PARTIAL: '#EFF6FF', HOLD: '#FEF3C7', REJECTED: '#FEE2E2',
};
const REJECT_REASONS = [
  'Purity Failure','Quantity Short >5%','Packaging Damaged',
  'Halal Non-Compliance','Wrong Material','Contamination','Expired','Other',
];

// ─── Inspection Form Component ────────────────────────────────────────────────
interface InspectionFormProps { item: InspectionItem; onClose: () => void; }

const InspectionForm: React.FC<InspectionFormProps> = ({ item, onClose }) => {
  const [packaging, setPackaging] = useState('intact');
  const [label, setLabel] = useState('correct');
  const [labResults, setLabResults] = useState<Record<string, string>>({});
  const [halalCertNo, setHalalCertNo] = useState('');
  const [halalBody, setHalalBody] = useState('BPJPH');
  const [halalExpiry, setHalalExpiry] = useState('');
  const [halalNonHalal, setHalalNonHalal] = useState('no');
  const [disposition, setDisposition] = useState('');
  const [qtyAccepted, setQtyAccepted] = useState(item.qtyReceived);
  const [deviationReason, setDeviationReason] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [holdDate, setHoldDate] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [inspector, setInspector] = useState('');
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const qcRef = `QC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const tests = LAB_TESTS[item.id];

  const s: Record<string, React.CSSProperties> = {
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 13, fontWeight: 700, color: '#0D1B2A', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #E2E8F0' },
    radioRow: { display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 8 },
    label: { fontSize: 12, fontWeight: 600, color: '#0D1B2A', display: 'block', marginBottom: 4 },
    input: { width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: 13, color: '#0D1B2A', boxSizing: 'border-box' as const },
  };
  const radioBtn = (active: boolean, color = '#0097A7'): React.CSSProperties => ({
    padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 500, cursor: 'pointer',
    background: active ? color : '#F0F4F8', color: active ? '#fff' : '#64748B',
    border: `1px solid ${active ? color : '#E2E8F0'}`, transition: 'all 0.15s',
  });
  const dispoBtn = (active: boolean, color: string): React.CSSProperties => ({
    flex: 1, minWidth: 160, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'center' as const,
    fontWeight: 600, fontSize: 13, border: `2px solid ${active ? color : '#E2E8F0'}`,
    background: active ? color + '15' : '#FAFAFA', color: active ? color : '#94A3B8',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ background: '#F8FAFC', borderLeft: '4px solid #0097A7', borderRadius: '0 8px 8px 0', padding: 20, marginTop: 12 }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 80, right: 24, background: '#0D1B2A', color: '#fff', borderRadius: 8, padding: '10px 16px', fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', zIndex: 9999, borderLeft: '3px solid #0097A7', maxWidth: 400 }}>{toast}</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0D1B2A' }}>Quality Inspection — {item.material}</div>
          <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>Batch {item.batchNumber}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94A3B8' }}>✕</button>
      </div>

      {/* Section A */}
      <div style={s.section}>
        <div style={s.sectionTitle}>A — Physical Check</div>
        <div style={{ marginBottom: 12 }}>
          <span style={s.label}>Packaging Condition</span>
          <div style={s.radioRow}>
            {[['intact','Intact ✅','#107E3E'],['damaged','Damaged ⚠️','#E9730C'],['severe','Severely Damaged ❌','#BB0000']].map(([v,l,c]) => (
              <div key={v} onClick={() => setPackaging(v)} style={radioBtn(packaging === v, c)}>{l}</div>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <span style={s.label}>Label Compliance</span>
          <div style={s.radioRow}>
            {[['correct','Correct ✅','#107E3E'],['minor','Minor Issues ⚠️','#E9730C'],['noncomp','Non-compliant ❌','#BB0000']].map(([v,l,c]) => (
              <div key={v} onClick={() => setLabel(v)} style={radioBtn(label === v, c)}>{l}</div>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <span style={s.label}>Quantity Count Verification</span>
            <input style={s.input} defaultValue={item.qtyReceived} />
          </div>
          <div>
            <span style={s.label}>Physical Appearance Notes</span>
            <input style={s.input} placeholder="Visual observations..." />
          </div>
        </div>
      </div>

      {/* Section B — Lab */}
      {tests ? (
        <div style={s.section}>
          <div style={s.sectionTitle}>B — Laboratory Test Results</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F0F4F8' }}>
                {['Test Parameter','Specification','Result','Unit'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748B' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tests.map(t => (
                <tr key={t.test} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 500 }}>{t.test}</td>
                  <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 12, color: '#64748B' }}>{t.spec}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <input value={labResults[t.test] || ''} onChange={e => setLabResults(prev => ({ ...prev, [t.test]: e.target.value }))}
                      style={{ width: 80, padding: '4px 8px', borderRadius: 4, border: '1px solid #E2E8F0', fontSize: 13 }} placeholder="—" />
                  </td>
                  <td style={{ padding: '8px 10px', color: '#64748B', fontSize: 12 }}>{t.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ ...s.section, background: '#F0F4F8', borderRadius: 6, padding: 12, fontSize: 13, color: '#64748B' }}>
          B — Visual/dimensional inspection only (no lab analysis required for this material type)
        </div>
      )}

      {/* Section C — Halal */}
      {item.halalRequired && (
        <div style={s.section}>
          <div style={s.sectionTitle}>C — Halal Verification</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <span style={s.label}>Halal Certificate Number</span>
              <input style={s.input} value={halalCertNo} onChange={e => setHalalCertNo(e.target.value)} placeholder="e.g. MUI-2026-00xxx" />
            </div>
            <div>
              <span style={s.label}>Issuing Body</span>
              <input style={s.input} value={halalBody} onChange={e => setHalalBody(e.target.value)} />
            </div>
            <div>
              <span style={s.label}>Certificate Expiry</span>
              <input type="date" style={s.input} value={halalExpiry} onChange={e => setHalalExpiry(e.target.value)} />
            </div>
          </div>
          <div>
            <span style={s.label}>Non-halal ingredients detected?</span>
            <div style={s.radioRow}>
              {[['no','No — Halal Compliant ✅','#107E3E'],['yes','Yes — REJECT REQUIRED ❌','#BB0000']].map(([v,l,c]) => (
                <div key={v} onClick={() => { setHalalNonHalal(v); if (v === 'yes') setDisposition('reject'); }}
                  style={radioBtn(halalNonHalal === v, c)}>{l}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Section D — Disposition */}
      <div style={s.section}>
        <div style={s.sectionTitle}>D — Disposition Decision</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 14 }}>
          {[
            ['pass','🟢 PASS — Accept Full Quantity','#107E3E'],
            ['partial','🟡 PARTIAL — Accept with Deviation','#E9730C'],
            ['hold','🟠 HOLD — Pending Further Testing','#F59E0B'],
            ['reject','🔴 REJECT — Return to Supplier','#BB0000'],
          ].map(([v,l,c]) => (
            <div key={v} onClick={() => setDisposition(v)} style={dispoBtn(disposition === v, c)}>{l}</div>
          ))}
        </div>
        {disposition === 'partial' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><span style={s.label}>Quantity Accepted</span><input style={s.input} value={qtyAccepted} onChange={e => setQtyAccepted(e.target.value)} /></div>
            <div><span style={s.label}>Deviation Reason</span><input style={s.input} value={deviationReason} onChange={e => setDeviationReason(e.target.value)} placeholder="e.g. Slight shortage within tolerance" /></div>
          </div>
        )}
        {disposition === 'hold' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><span style={s.label}>Hold Reason</span><input style={s.input} value={holdReason} onChange={e => setHoldReason(e.target.value)} placeholder="e.g. Awaiting external lab results" /></div>
            <div><span style={s.label}>Expected Resolution Date</span><input type="date" style={s.input} value={holdDate} onChange={e => setHoldDate(e.target.value)} /></div>
          </div>
        )}
        {disposition === 'reject' && (
          <div>
            <span style={s.label}>Rejection Reason</span>
            <select style={{ ...s.input, marginBottom: 8 }} value={rejectReason} onChange={e => setRejectReason(e.target.value)}>
              <option value="">Select reason...</option>
              {REJECT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Section E — Sign-off */}
      <div style={s.section}>
        <div style={s.sectionTitle}>E — Inspector Sign-off</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
          <div><span style={s.label}>Inspector Name</span><input style={s.input} value={inspector} onChange={e => setInspector(e.target.value)} placeholder="Full name" /></div>
          <div><span style={s.label}>Inspection Date</span><input type="date" style={s.input} defaultValue="2026-04-08" /></div>
          <div><span style={s.label}>QC Reference</span><input style={{ ...s.input, fontFamily: 'monospace', background: '#F0F4F8' }} value={qcRef} readOnly /></div>
          <div><span style={s.label}>Notes</span><input style={s.input} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." /></div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => {
          const poNum = item.poNumber;
          const posted = JSON.parse(localStorage.getItem('paragon_gr_posted') || '[]');
          if (!posted.includes(poNum)) {
            localStorage.setItem('paragon_gr_posted', JSON.stringify([...posted, poNum]));
          }
          showToast(`GR posted to SAP S/4HANA (movement type 101). Material document MAT-490003${Math.floor(10 + Math.random() * 90)} created. Invoice for ${poNum} automatically unblocked — status updated to Approved.`);
        }}
          style={{ padding: '9px 18px', borderRadius: 6, background: '#107E3E', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          ✅ Post GR & Record Result
        </button>
        <button onClick={() => showToast('Inspection draft saved')}
          style={{ padding: '9px 18px', borderRadius: 6, background: '#F0F4F8', color: '#0D1B2A', border: '1px solid #E2E8F0', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          💾 Save Draft
        </button>
        <button onClick={onClose}
          style={{ padding: '9px 18px', borderRadius: 6, background: 'none', color: '#94A3B8', border: '1px solid #E2E8F0', fontSize: 13, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  );
};

// ─── Inspection Card Component ────────────────────────────────────────────────
const InspectionCard: React.FC<{ item: InspectionItem }> = ({ item }) => {
  const [expanded, setExpanded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 20, marginBottom: 14 }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 80, right: 24, background: '#0D1B2A', color: '#fff', borderRadius: 8, padding: '10px 16px', fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', zIndex: 9999, borderLeft: '3px solid #0097A7' }}>{toast}</div>
      )}
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ background: PRIORITY_COLOR[item.priority] + '18', color: PRIORITY_COLOR[item.priority], borderRadius: 9999, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{item.priority}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#0D1B2A' }}>{item.country} {item.supplier}</span>
        <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>{item.asnNumber}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748B' }}>Received: {item.receivedDate}</span>
      </div>

      {/* Material */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0D1B2A' }}>{item.material}</div>
        <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#64748B' }}>{item.materialCode} · Batch {item.batchNumber}</div>
      </div>

      {/* Detail row */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 10, fontSize: 13 }}>
        <span><span style={{ color: '#94A3B8' }}>Qty Rcvd:</span> <strong>{item.qtyReceived}</strong></span>
        <span><span style={{ color: '#94A3B8' }}>Ordered:</span> {item.qtyOrdered}</span>
        <span><span style={{ color: '#94A3B8' }}>Variance:</span> <strong style={{ color: item.variance === '0%' ? '#107E3E' : '#BB0000' }}>{item.variance}</strong></span>
        <span><span style={{ color: '#94A3B8' }}>Dock:</span> {item.dockLocation}</span>
        <span><span style={{ color: '#94A3B8' }}>Type:</span> {item.inspectionType}</span>
        <span style={{ background: '#E0F2F1', color: '#0097A7', borderRadius: 9999, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{item.channel}</span>
      </div>

      {/* Documents row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14, fontSize: 12 }}>
        <span>CoA: {item.coaReceived ? '✅ Received' : '❌ Missing'}</span>
        <span>SDS: {item.sdsReceived ? '✅ Received' : '❌ Missing'}</span>
        {item.halalRequired
          ? <span>Halal Cert: {item.coaReceived ? '✅ Required + Received' : '⚠️ Required + Missing'}</span>
          : <span style={{ color: '#94A3B8' }}>Halal: N/A</span>}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setExpanded(e => !e)}
          style={{ padding: '8px 16px', borderRadius: 6, background: expanded ? '#0097A7' : '#0D1B2A', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {expanded ? '▼ Close Inspection' : '▶ Start Inspection'}
        </button>
        <button onClick={() => showToast(`Opening ${item.asnNumber}...`)}
          style={{ padding: '8px 14px', borderRadius: 6, background: '#F0F4F8', color: '#0D1B2A', border: '1px solid #E2E8F0', fontSize: 13, cursor: 'pointer' }}>
          📋 View ASN
        </button>
        <button onClick={() => showToast(`Contacting ${item.supplier} via ${item.channel}...`)}
          style={{ padding: '8px 14px', borderRadius: 6, background: '#F0F4F8', color: '#0D1B2A', border: '1px solid #E2E8F0', fontSize: 13, cursor: 'pointer' }}>
          📞 Contact Supplier
        </button>
      </div>

      {expanded && <InspectionForm item={item} onClose={() => setExpanded(false)} />}
    </div>
  );
};

// ─── Results Table ────────────────────────────────────────────────────────────
const ResultsTable: React.FC<{ rows: InspectionResult[]; showValue?: boolean }> = ({ rows, showValue }) => {
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  return (
    <>
      {toast && (
        <div style={{ position: 'fixed', bottom: 80, right: 24, background: '#0D1B2A', color: '#fff', borderRadius: 8, padding: '10px 16px', fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', zIndex: 9999, borderLeft: '3px solid #0097A7' }}>{toast}</div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F0F4F8', borderBottom: '2px solid #E2E8F0' }}>
              {['GR Number','Material','Supplier','Batch','Result','Disposition','Qty','Inspector','Date','SAP Doc','QC Ref', ...(showValue ? ['Value (IDR)'] : []),'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.grNumber} style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#0097A7' }}>{r.grNumber}</td>
                <td style={{ padding: '10px 12px' }}>{r.material}</td>
                <td style={{ padding: '10px 12px', color: '#64748B' }}>{r.supplier}</td>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12 }}>{r.batch}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ background: RESULT_BG[r.result], color: RESULT_COLOR[r.result], borderRadius: 9999, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{r.result}</span>
                </td>
                <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748B', maxWidth: 200 }}>{r.disposition}</td>
                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{r.qty}</td>
                <td style={{ padding: '10px 12px', color: '#64748B' }}>{r.inspector}</td>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12 }}>{r.date}</td>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12, color: r.sapDoc === '—' ? '#94A3B8' : '#0D1B2A' }}>{r.sapDoc}</td>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12 }}>{r.qcRef}</td>
                {showValue && <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12 }}>IDR {(Math.floor(Math.random() * 90 + 10) * 1000000).toLocaleString()}</td>}
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => showToast(`Opening inspection report ${r.qcRef}...`)} style={{ padding: '4px 10px', borderRadius: 4, background: '#F0F4F8', border: '1px solid #E2E8F0', fontSize: 12, cursor: 'pointer', color: '#0D1B2A' }}>View</button>
                    <button onClick={() => showToast(`Downloading CoA for ${r.batch}...`)} style={{ padding: '4px 10px', borderRadius: 4, background: '#F0F4F8', border: '1px solid #E2E8F0', fontSize: 12, cursor: 'pointer', color: '#0D1B2A' }}>CoA</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const GoodsReceipt: React.FC = () => {
  const [tab, setTab] = useState(0);
  const tabs = ['Pending Inspection', 'Inspection Results', 'GR History', 'Quality Analytics'];
  const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const kpis = [
    { label: 'Pending Inspection', value: '3', color: '#E9730C' },
    { label: 'Passed Today',       value: '2', color: '#107E3E' },
    { label: 'On Hold',            value: '1', color: '#F59E0B' },
    { label: 'Rejected',           value: '1', color: '#BB0000' },
  ];

  return (
    <div style={{ padding: '24px 28px', background: '#F0F4F8', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0D1B2A' }}>Goods Receipt & Quality Control</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>Inbound inspection, GR posting, and quality disposition</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#64748B' }}>
          <span>Last updated: {now}</span>
          <button style={{ padding: '6px 12px', borderRadius: 6, background: '#fff', border: '1px solid #E2E8F0', cursor: 'pointer', fontSize: 12 }}>↻ Refresh</button>
        </div>
      </div>

      {/* KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', borderLeft: `4px solid ${k.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Alert bar */}
      <div style={{ background: '#FEE2E2', borderLeft: '4px solid #BB0000', borderRadius: 6, padding: '10px 16px', marginBottom: 10, fontSize: 13, color: '#BB0000', fontWeight: 500 }}>
        ⛔ 1 batch rejected — BASF Panthenol B5 purity failure. Return process initiated.
      </div>
      <div style={{ background: '#FEF3C7', borderLeft: '4px solid #F59E0B', borderRadius: 6, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#92400E', fontWeight: 500 }}>
        ⚠️ 1 batch on hold — PT Halal Emulsifier Glycerin pending lab results (ETA 2 days)
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #E2E8F0', marginBottom: 20 }}>
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            padding: '9px 18px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === i ? 600 : 400,
            color: tab === i ? '#0097A7' : '#64748B', background: 'none',
            borderBottom: `2px solid ${tab === i ? '#0097A7' : 'transparent'}`, marginBottom: -2,
          }}>{t}</button>
        ))}
      </div>

      {/* Tab 1 */}
      {tab === 0 && (
        <div>
          {PENDING_ITEMS.map(item => <InspectionCard key={item.id} item={item} />)}
        </div>
      )}

      {/* Tab 2 */}
      {tab === 1 && (
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0D1B2A', marginBottom: 14 }}>Recent Inspection Results</div>
          <ResultsTable rows={RESULTS} />
        </div>
      )}

      {/* Tab 3 */}
      {tab === 2 && (
        <div>
          {/* Filter bar */}
          <div style={{ background: '#fff', borderRadius: 10, padding: 16, marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {['Date Range','Supplier','Material','Result','Inspector'].map(f => (
              <select key={f} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: 12, color: '#64748B' }}>
                <option>{f}: All</option>
              </select>
            ))}
            <button style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 6, background: '#0097A7', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
              📥 Export GR Report
            </button>
          </div>
          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
            {[['Total GRs (Month)','18','#0097A7'],['Pass Rate','83%','#107E3E'],['Rejection Rate','6%','#BB0000'],['Hold Rate','11%','#F59E0B']].map(([l,v,c]) => (
              <div key={l} style={{ background: '#fff', borderRadius: 8, padding: '12px 16px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: c as string }}>{v}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <ResultsTable rows={HISTORY_DATA} showValue />
          </div>
        </div>
      )}

      {/* Tab 4 */}
      {tab === 3 && (
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0D1B2A', marginBottom: 16 }}>Quality Performance Analytics</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Chart 1 — Pie */}
            <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Inspection Result Distribution</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={PIE_RESULT} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {PIE_RESULT.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number, n: string) => [`${v} lots`, n]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Chart 2 — Line */}
            <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Monthly Pass Rate Trend</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={PASS_TREND}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis domain={[75, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip formatter={(v: number) => [`${v}%`, 'Pass Rate']} />
                  <ReferenceLine y={90} stroke="#BB0000" strokeDasharray="5 5" label={{ value: '90% Target', position: 'insideTopRight', fontSize: 11, fill: '#BB0000' }} />
                  <Line type="monotone" dataKey="rate" stroke="#0097A7" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Chart 3 — Bar */}
            <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Rejections by Supplier (YTD)</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={REJECTION_SUPPLIER} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="supplier" width={150} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="rejections" fill="#BB0000" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Chart 4 — Pie */}
            <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Rejection Reasons</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={REJECTION_REASON} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name }) => name} labelLine={false}>
                    {REJECTION_REASON.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ background: 'rgba(0,151,167,0.08)', borderLeft: '4px solid #0097A7', borderRadius: 6, padding: 16 }}>
            <div style={{ fontSize: 13, color: '#0D1B2A', fontWeight: 500, lineHeight: 1.6 }}>
              💡 <strong>Quality Insight:</strong> BASF Personal Care DE accounts for 50% of rejections YTD. Recommend supplier quality audit and updated CoA requirements. Consider activating Evonik Specialty as primary source for Panthenol B5.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoodsReceipt;
