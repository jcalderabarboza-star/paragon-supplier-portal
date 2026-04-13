import React, { useState, useMemo } from 'react';

const TEAL = '#0097A7';
const NAVY = '#0D1B2A';
const RED = '#DC2626';
const AMBER = '#D97706';
const GREEN = '#16A34A';
const BLUE = '#2563EB';
const PURPLE = '#7C3AED';
const BORDER = '#E2E8F0';
const MUTED = '#64748B';
const BG = '#F0F4F8';

// ─── Types ────────────────────────────────────────────────────────────────────
interface OpenRFQ {
  id: string;
  rfqNumber: string;
  material: string;
  category: string;
  qty: string;
  deliveryLocation: string;
  requestedDelivery: string;
  deadline: string;
  daysRemaining: number;
  specialRequirements: string;
  evaluationCriteria: { price: number; quality: number; leadTime: number; sustainability: number; risk: number };
  status: string;
  receivedVia: string;
  receivedDate: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const OPEN_RFQS_INITIAL: OpenRFQ[] = [
  {
    id: 'rfq-002',
    rfqNumber: 'RFQ-2026-002',
    material: 'PET Bottle 100ml Airless Pump',
    category: 'Packaging Primary',
    qty: '50,000 PCS',
    deliveryLocation: 'NDC Jatake 6',
    requestedDelivery: '2026-05-15',
    deadline: '2026-04-15',
    daysRemaining: 7,
    specialRequirements: 'Food-grade PET, BPA-free. BPOM registered. Matching color: Wardah White. Provide sample batch with quotation.',
    evaluationCriteria: { price: 40, quality: 25, leadTime: 15, sustainability: 10, risk: 10 },
    status: 'Open — Awaiting Your Quote',
    receivedVia: 'Web Portal',
    receivedDate: '2026-04-01',
  },
  {
    id: 'rfq-new',
    rfqNumber: 'RFQ-2026-008',
    material: 'Folding Carton 180gsm Emina',
    category: 'Packaging Secondary',
    qty: '150,000 PCS',
    deliveryLocation: 'Plant Semarang',
    requestedDelivery: '2026-05-30',
    deadline: '2026-04-20',
    daysRemaining: 12,
    specialRequirements: 'FSC certified paper. Pantone color matching required. Include printing plate cost separately.',
    evaluationCriteria: { price: 40, quality: 25, leadTime: 15, sustainability: 10, risk: 10 },
    status: 'Open — Awaiting Your Quote',
    receivedVia: 'Email',
    receivedDate: '2026-04-05',
  },
];

const SUBMITTED_QUOTE = {
  rfqNumber: 'RFQ-2026-005',
  material: 'Folding Carton 150gsm Wardah',
  submittedDate: '2026-03-27',
  unitPrice: 'Rp 420/PCS',
  totalPrice: 'Rp 84jT',
  leadTime: '10 days',
  validUntil: '2026-04-27',
  status: 'Under Review',
  score: 92,
  rankPosition: '1 of 4 quotes',
};

const AWARD_HISTORY = [
  {
    rfqNumber: 'RFQ-2025-089',
    material: 'PET Bottle 200ml Pump Emina',
    result: 'Awarded',
    awardDate: '2025-11-15',
    contractValue: 'Rp 245jT',
    poIssued: 'PO-2025-00098',
    notes: 'Awarded — lowest price + halal compliant',
  },
  {
    rfqNumber: 'RFQ-2025-071',
    material: 'Folding Carton Wardah Hijab Series',
    result: 'Not Awarded',
    awardDate: '2025-09-20',
    contractValue: '—',
    poIssued: '—',
    notes: 'Not awarded — competitor offered 8% lower unit price',
  },
  {
    rfqNumber: 'RFQ-2025-055',
    material: 'Shrink Sleeve Label Emina',
    result: 'Awarded',
    awardDate: '2025-07-10',
    contractValue: 'Rp 67jT',
    poIssued: 'PO-2025-00071',
    notes: 'Awarded — best sustainability score + fastest lead time',
  },
];


// ─── Helpers ──────────────────────────────────────────────────────────────────
const EVAL_SEGMENTS = [
  { key: 'price',        label: 'Price',        color: BLUE   },
  { key: 'quality',      label: 'Quality',      color: GREEN  },
  { key: 'leadTime',     label: 'Lead Time',    color: TEAL   },
  { key: 'sustainability', label: 'Sustainability', color: PURPLE },
  { key: 'risk',         label: 'Risk',         color: '#6B7280' },
];

const resultColor = (r: string) => r === 'Awarded' ? GREEN : r === 'Not Awarded' ? MUTED : RED;
const resultBg    = (r: string) => r === 'Awarded' ? '#F0FDF4' : r === 'Not Awarded' ? '#F8FAFC' : '#FEF2F2';
const resultIcon  = (r: string) => r === 'Awarded' ? '✓' : r === 'Not Awarded' ? '✗' : '—';

// ─── Toast ────────────────────────────────────────────────────────────────────
let _toastTimer: ReturnType<typeof setTimeout> | null = null;
const useToast = () => {
  const [toast, setToast] = React.useState<string | null>(null);
  const show = (msg: string) => {
    setToast(msg);
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => setToast(null), 4000);
  };
  return { toast, show };
};

const Toast: React.FC<{ msg: string }> = ({ msg }) => (
  <div style={{
    position: 'fixed', bottom: 24, right: 24,
    background: NAVY, color: 'white', borderRadius: 8,
    padding: '12px 18px', fontSize: 13, fontWeight: 500,
    boxShadow: '0 4px 16px rgba(0,0,0,0.25)', zIndex: 9999,
    maxWidth: 400, lineHeight: 1.5,
    borderLeft: `4px solid ${TEAL}`,
  }}>
    {msg}
  </div>
);

// ─── Eval Criteria Bar ────────────────────────────────────────────────────────
const EvalBar: React.FC<{ criteria: OpenRFQ['evaluationCriteria'] }> = ({ criteria }) => (
  <div>
    <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
      {EVAL_SEGMENTS.map(seg => (
        <div key={seg.key} style={{
          width: `${criteria[seg.key as keyof typeof criteria]}%`,
          background: seg.color,
        }} title={`${seg.label}: ${criteria[seg.key as keyof typeof criteria]}%`} />
      ))}
    </div>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {EVAL_SEGMENTS.map(seg => (
        <span key={seg.key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: seg.color, display: 'inline-block' }} />
          <span style={{ color: MUTED }}>{seg.label} {criteria[seg.key as keyof typeof criteria]}%</span>
        </span>
      ))}
    </div>
  </div>
);


// ─── Submit Quote Panel ───────────────────────────────────────────────────────
interface QuotePanelProps {
  rfq: OpenRFQ;
  onClose: () => void;
  onSubmit: (rfqId: string) => void;
  showToast: (msg: string) => void;
}

const QuotePanel: React.FC<QuotePanelProps> = ({ rfq, onClose, onSubmit, showToast }) => {
  const [unitPrice, setUnitPrice]       = useState('');
  const [currency, setCurrency]         = useState('IDR');
  const [qty] = useState(rfq.qty.replace(/[^0-9]/g, ''));
  const [leadTimeNum, setLeadTimeNum]   = useState('');
  const [leadTimeUnit, setLeadTimeUnit] = useState('days');
  const [validUntil, setValidUntil]     = useState('');
  const [moq, setMoq]                   = useState('');
  const [notes, setNotes]               = useState('');
  const [canSample, setCanSample]       = useState<'yes' | 'no'>('yes');
  const [sampleLT, setSampleLT]         = useState('');
  const [submitted, setSubmitted]       = useState(false);

  const totalPrice = useMemo(() => {
    const up = parseFloat(unitPrice.replace(/,/g, ''));
    const q  = parseFloat(qty.replace(/,/g, ''));
    if (!isNaN(up) && !isNaN(q)) return (up * q).toLocaleString();
    return '—';
  }, [unitPrice, qty]);

  const handleSubmit = () => {
    setSubmitted(true);
    showToast(
      `Quotation submitted for ${rfq.rfqNumber}. Paragon procurement team will review by ${rfq.deadline}. You will be notified of the award decision via Web Portal and Email.`
    );
    setTimeout(() => { onSubmit(rfq.id); onClose(); }, 600);
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
      }} />
      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 500,
        background: 'white', zIndex: 1001, display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: NAVY }}>Submit Quotation</div>
            <div style={{ fontSize: 12, color: TEAL, fontWeight: 600 }}>{rfq.rfqNumber}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 20, color: MUTED, lineHeight: 1 }}>✕</button>
        </div>

        {/* RFQ Summary */}
        <div style={{ padding: '12px 20px', background: '#F8FAFC', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{rfq.material}</div>
          <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 12, color: MUTED }}>
            <span>Qty: <strong style={{ color: NAVY }}>{rfq.qty}</strong></span>
            <span>Deadline: <strong style={{ color: rfq.daysRemaining <= 7 ? RED : NAVY }}>{rfq.deadline}</strong></span>
          </div>
        </div>

        {/* Scrollable form body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* Price */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Unit Price *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)}
                placeholder="0.00"
                style={{ flex: 1, padding: '8px 10px', border: `1px solid ${BORDER}`, borderRadius: 6,
                  fontSize: 13, outline: 'none' }} />
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                style={{ padding: '8px 10px', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, background: 'white' }}>
                <option>IDR</option>
                <option>USD</option>
                <option>EUR</option>
              </select>
            </div>
          </div>

          {/* Total Price (read-only) */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Total Price (auto-calculated)</label>
            <div style={{ padding: '8px 10px', background: '#F8FAFC', border: `1px solid ${BORDER}`,
              borderRadius: 6, fontSize: 13, color: totalPrice === '—' ? MUTED : NAVY, fontWeight: 600 }}>
              {totalPrice === '—' ? '—' : `${currency} ${totalPrice}`}
            </div>
          </div>

          {/* Lead Time */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Lead Time *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" value={leadTimeNum} onChange={e => setLeadTimeNum(e.target.value)}
                placeholder="0"
                style={{ flex: 1, padding: '8px 10px', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, outline: 'none' }} />
              <select value={leadTimeUnit} onChange={e => setLeadTimeUnit(e.target.value)}
                style={{ padding: '8px 10px', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, background: 'white' }}>
                <option>days</option>
                <option>weeks</option>
              </select>
            </div>
          </div>

          {/* Valid Until */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Quote Valid Until *</label>
            <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* MOQ */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Minimum Order Qty (optional)</label>
            <input type="number" value={moq} onChange={e => setMoq(e.target.value)}
              placeholder="Leave blank if same as RFQ qty"
              style={{ width: '100%', padding: '8px 10px', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Compliance */}
          <div style={{ marginBottom: 14, background: '#F0FDF4', border: `1px solid #BBF7D0`,
            borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', marginBottom: 8 }}>Compliance Documents</div>
            {[
              { label: 'Halal Certificate', status: 'On file' },
              { label: 'ISO 9001',          status: 'On file' },
              { label: 'BPOM Registration', status: 'On file' },
            ].map(d => (
              <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 12 }}>
                <span style={{ color: GREEN }}>✓</span>
                <span style={{ color: NAVY, fontWeight: 500 }}>{d.label}</span>
                <span style={{ color: MUTED }}>— {d.status}</span>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Comments / Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any notes, conditions, or alternative options for Paragon procurement team..."
              style={{ width: '100%', padding: '8px 10px', border: `1px solid ${BORDER}`, borderRadius: 6,
                fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>

          {/* Sample toggle */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Can provide sample batch?</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['yes', 'no'] as const).map(v => (
                <button key={v} onClick={() => setCanSample(v)}
                  style={{ padding: '6px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                    border: `1px solid ${canSample === v ? TEAL : BORDER}`,
                    background: canSample === v ? `${TEAL}15` : 'white',
                    color: canSample === v ? TEAL : MUTED, fontWeight: canSample === v ? 700 : 400 }}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            {canSample === 'yes' && (
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: 11, color: MUTED, display: 'block', marginBottom: 4 }}>Sample lead time</label>
                <input type="text" placeholder="e.g. 5 days"
                  style={{ padding: '7px 10px', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, outline: 'none', width: '160px' }} />
              </div>
            )}
          </div>

          {/* Attachment */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Quotation PDF (optional)</label>
            <div style={{ border: `2px dashed ${BORDER}`, borderRadius: 8, padding: '16px',
              textAlign: 'center', cursor: 'pointer', fontSize: 12, color: MUTED }}>
              📎 Click to attach quotation PDF or drag & drop
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${BORDER}`, display: 'flex', gap: 10 }}>
          <button
            onClick={handleSubmit}
            disabled={submitted}
            style={{ flex: 1, padding: '10px', background: submitted ? MUTED : TEAL,
              color: 'white', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {submitted ? 'Submitting...' : 'Submit Quotation →'}
          </button>
          <button onClick={onClose}
            style={{ padding: '10px 16px', background: 'white', border: `1px solid ${BORDER}`,
              borderRadius: 6, fontSize: 13, cursor: 'pointer', color: NAVY }}>
            Cancel
          </button>
        </div>
      </div>
    </>
  );
};


// ─── RFQ Card ─────────────────────────────────────────────────────────────────
const RFQCard: React.FC<{
  rfq: OpenRFQ;
  onSubmitQuote: (rfq: OpenRFQ) => void;
  onDecline: (rfqNumber: string) => void;
  showToast: (msg: string) => void;
}> = ({ rfq, onSubmitQuote, onDecline, showToast }) => {
  const [expanded, setExpanded] = useState(false);
  const urgent = rfq.daysRemaining <= 7;

  return (
    <div style={{ background: 'white', borderRadius: 8, marginBottom: 14,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      border: `1px solid ${urgent ? `${AMBER}66` : BORDER}`,
      borderLeft: `4px solid ${urgent ? AMBER : TEAL}` }}>
      {/* Top row */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: TEAL }}>{rfq.rfqNumber}</span>
        {urgent && (
          <span style={{ background: '#FFFBEB', color: AMBER, border: `1px solid ${AMBER}44`,
            borderRadius: 9999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
            ! {rfq.daysRemaining} days remaining
          </span>
        )}
        {!urgent && (
          <span style={{ background: '#EFF6FF', color: BLUE, borderRadius: 9999,
            padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
            {rfq.daysRemaining} days to deadline
          </span>
        )}
        <span style={{ marginLeft: 'auto', background: '#F1F5F9', color: MUTED,
          borderRadius: 9999, padding: '2px 8px', fontSize: 11 }}>
          via {rfq.receivedVia}
        </span>
        <span style={{ fontSize: 11, color: MUTED }}>Received {rfq.receivedDate}</span>
      </div>

      {/* Material + category */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>{rfq.material}</span>
          <span style={{ background: `${TEAL}15`, color: TEAL, borderRadius: 9999,
            padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
            {rfq.category}
          </span>
        </div>

        {/* Details row */}
        <div style={{ display: 'flex', gap: 20, fontSize: 12, color: MUTED, marginBottom: 12, flexWrap: 'wrap' }}>
          <span> Qty: <strong style={{ color: NAVY }}>{rfq.qty}</strong></span>
          <span> {rfq.deliveryLocation}</span>
          <span>🗓️ Req. Delivery: <strong style={{ color: NAVY }}>{rfq.requestedDelivery}</strong></span>
          <span>⏰ Deadline: <strong style={{ color: urgent ? RED : NAVY }}>{rfq.deadline}</strong></span>
        </div>

        {/* Special Requirements */}
        <div style={{ background: '#F8FAFC', borderRadius: 6, padding: '10px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: 4 }}>
            Special Requirements
          </div>
          <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
            {expanded ? rfq.specialRequirements : rfq.specialRequirements.slice(0, 80) + (rfq.specialRequirements.length > 80 ? '...' : '')}
          </div>
          {rfq.specialRequirements.length > 80 && (
            <button onClick={() => setExpanded(!expanded)}
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                color: TEAL, fontSize: 11, fontWeight: 600, padding: '4px 0 0', marginTop: 2 }}>
              {expanded ? 'Show less ▲' : 'Show more ▼'}
            </button>
          )}
        </div>

        {/* Evaluation criteria bar */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: 6 }}>
            Evaluation Criteria
          </div>
          <EvalBar criteria={rfq.evaluationCriteria} />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => onSubmitQuote(rfq)}
            style={{ padding: '9px 20px', background: TEAL, color: 'white', border: 'none',
              borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Submit Quote →
          </button>
          <button onClick={() => showToast('Message sent to Paragon procurement team via Web Portal')}
            style={{ padding: '9px 16px', background: 'white', color: NAVY,
              border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
            Ask Question
          </button>
          <button onClick={() => onDecline(rfq.rfqNumber)}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: RED, fontSize: 12, textDecoration: 'underline', marginLeft: 'auto' }}>
            Decline RFQ
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Tab 1: Open RFQs ─────────────────────────────────────────────────────────
const OpenRFQsTab: React.FC<{
  rfqs: OpenRFQ[];
  onSubmitQuote: (rfq: OpenRFQ) => void;
  onDecline: (rfqNumber: string) => void;
  showToast: (msg: string) => void;
}> = ({ rfqs, onSubmitQuote, onDecline, showToast }) => {
  if (rfqs.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: MUTED }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>No open RFQs at this time</div>
        <div style={{ fontSize: 13, marginTop: 4 }}>New RFQs from Paragon will appear here</div>
      </div>
    );
  }
  return (
    <div>
      {rfqs.map(rfq => (
        <RFQCard key={rfq.id} rfq={rfq} onSubmitQuote={onSubmitQuote} onDecline={onDecline} showToast={showToast} />
      ))}
    </div>
  );
};


// ─── Tab 2: My Quotes ─────────────────────────────────────────────────────────
const MyQuotesTab: React.FC<{
  extra: string[];
  showToast: (msg: string) => void;
}> = ({ extra, showToast }) => {
  // extra holds rfqNumbers for newly submitted quotes in this session
  const allQuotes = [SUBMITTED_QUOTE, ...extra.map(num => ({
    rfqNumber: num,
    material: 'Recently submitted quote',
    submittedDate: new Date().toISOString().slice(0, 10),
    unitPrice: '—',
    totalPrice: '—',
    leadTime: '—',
    validUntil: '—',
    status: 'Under Review',
    score: null as number | null,
    rankPosition: null as string | null,
  }))];

  return (
    <div>
      {allQuotes.map((q, i) => (
        <div key={i} style={{ background: 'white', borderRadius: 8, marginBottom: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '16px 20px',
          border: `1px solid ${BORDER}`, borderLeft: `4px solid ${TEAL}` }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: TEAL }}>{q.rfqNumber}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: NAVY, marginTop: 2 }}>{q.material}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ background: '#EFF6FF', color: BLUE, borderRadius: 9999,
                padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                {q.status}
              </span>
              {q.score && (
                <span style={{ background: '#F0FDF4', color: GREEN, borderRadius: 9999,
                  padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                  {q.score}/100
                </span>
              )}
            </div>
          </div>

          {/* Details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
            {[
              { label: 'Submitted', value: q.submittedDate },
              { label: 'Unit Price', value: q.unitPrice },
              { label: 'Total Price', value: q.totalPrice },
              { label: 'Lead Time', value: q.leadTime },
              { label: 'Valid Until', value: q.validUntil },
            ].map(d => (
              <div key={d.label}>
                <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: 2 }}>{d.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{d.value}</div>
              </div>
            ))}
          </div>

          {/* Rank */}
          {q.rankPosition && (
            <div style={{ background: '#F0FDF4', borderRadius: 6, padding: '8px 12px',
              fontSize: 13, color: GREEN, fontWeight: 600, marginBottom: 12 }}>
              🥇 Ranked {q.rankPosition} received
            </div>
          )}

          {/* Compliance */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: 6 }}>
              Compliance documents submitted with this quote
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {['Halal Certificate', 'BPOM Registration', 'ISO 9001'].map(d => (
                <span key={d} style={{ fontSize: 12, color: GREEN }}>✓ {d}</span>
              ))}
            </div>
          </div>

          {/* Withdraw */}
          <button onClick={() => showToast('Quote withdrawal request sent to Paragon team')}
            style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 6,
              padding: '7px 14px', fontSize: 12, cursor: 'pointer', color: MUTED }}>
            Withdraw Quote
          </button>
        </div>
      ))}
    </div>
  );
};

// ─── Tab 3: Awards & History ──────────────────────────────────────────────────
const AwardsTab: React.FC = () => {
  const awarded = AWARD_HISTORY.filter(r => r.result === 'Awarded').length;
  const total   = AWARD_HISTORY.length;
  const pct     = Math.round((awarded / total) * 100);

  return (
    <div>
      <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        overflow: 'hidden', marginBottom: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: `2px solid ${BORDER}` }}>
              {['RFQ Number', 'Material', 'Result', 'Award Date', 'Contract Value', 'PO Issued', 'Notes'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: MUTED, fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AWARD_HISTORY.map((row, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? 'white' : '#F8FAFC' }}>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: TEAL }}>{row.rfqNumber}</td>
                <td style={{ padding: '10px 14px', color: NAVY }}>{row.material}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ background: resultBg(row.result), color: resultColor(row.result),
                    borderRadius: 9999, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                    {resultIcon(row.result)} {row.result}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', color: MUTED }}>{row.awardDate}</td>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: row.contractValue !== '—' ? GREEN : MUTED }}>
                  {row.contractValue}
                </td>
                <td style={{ padding: '10px 14px', color: row.poIssued !== '—' ? BLUE : MUTED }}>{row.poIssued}</td>
                <td style={{ padding: '10px 14px', color: '#374151', fontSize: 11 }}>{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Win rate bar */}
      <div style={{ background: 'white', borderRadius: 8, padding: '14px 18px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: NAVY, marginBottom: 6 }}>
            Your win rate: <strong>{awarded} of {total} RFQs awarded ({pct}%)</strong> — above average for Packaging Primary category
          </div>
          <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: GREEN, borderRadius: 4 }} />
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: GREEN }}>{pct}%</div>
          <div style={{ fontSize: 10, color: MUTED }}>Win Rate</div>
        </div>
      </div>
    </div>
  );
};


// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'open',    label: 'Open RFQs' },
  { id: 'quotes',  label: 'My Quotes' },
  { id: 'history', label: 'Awards & History' },
];

const SupplierRFQs: React.FC = () => {
  const [activeTab, setActiveTab]     = useState('open');
  const [openRFQs, setOpenRFQs]       = useState<OpenRFQ[]>(OPEN_RFQS_INITIAL);
  const [quotePanel, setQuotePanel]   = useState<OpenRFQ | null>(null);
  // rfqNumbers submitted this session (to add to My Quotes tab)
  const [submittedNums, setSubmittedNums] = useState<string[]>([]);
  const { toast, show: showToast } = useToast();

  const handleSubmitQuote = (rfq: OpenRFQ) => setQuotePanel(rfq);

  const handleDecline = (rfqNumber: string) => {
    showToast(`RFQ ${rfqNumber} declined. Paragon team has been notified.`);
  };

  const handleQuoteSubmitted = (rfqId: string) => {
    const rfq = openRFQs.find(r => r.id === rfqId);
    if (rfq) setSubmittedNums(prev => [...prev, rfq.rfqNumber]);
    setOpenRFQs(prev => prev.filter(r => r.id !== rfqId));
    setActiveTab('quotes');
  };

  // Summary counts
  const openCount      = openRFQs.length;
  const submittedCount = 1 + submittedNums.length;
  const awaitingCount  = 1;

  return (
    <div style={{ padding: '24px 28px', background: BG, minHeight: '100%' }}>
      {toast && <Toast msg={toast} />}
      {quotePanel && (
        <QuotePanel
          rfq={quotePanel}
          onClose={() => setQuotePanel(null)}
          onSubmit={handleQuoteSubmitted}
          showToast={showToast}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: NAVY }}>My RFQs & Quotes</h1>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
          RFQs received from Paragon Corp procurement team — PT Berlina Packaging Indonesia
        </div>
      </div>

      {/* Summary Tiles */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Open RFQs',        value: openCount,      sub: 'Awaiting your quotation', color: BLUE  },
          { label: 'Quotes Submitted',  value: submittedCount, sub: 'Pending evaluation',      color: TEAL  },
          { label: 'Awaiting Award',    value: awaitingCount,  sub: 'Decision pending',         color: AMBER },
        ].map(t => (
          <div key={t.label} style={{ background: 'white', borderRadius: 8, padding: '14px 20px',
            flex: 1, minWidth: 160, boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            borderLeft: `4px solid ${t.color}` }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase',
              letterSpacing: '1px', marginBottom: 4 }}>{t.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: t.color, lineHeight: 1 }}>{t.value}</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{t.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${BORDER}`, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: '10px 18px', border: 'none', cursor: 'pointer', background: 'transparent',
              borderBottom: activeTab === t.id ? `3px solid ${TEAL}` : '3px solid transparent',
              marginBottom: -2, fontSize: 13,
              fontWeight: activeTab === t.id ? 700 : 400,
              color: activeTab === t.id ? TEAL : MUTED,
              transition: 'color 0.15s' }}>
            {t.label}
            {t.id === 'open' && openCount > 0 && (
              <span style={{ marginLeft: 6, background: BLUE, color: 'white',
                borderRadius: 9999, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>
                {openCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'open'    && (
        <OpenRFQsTab rfqs={openRFQs} onSubmitQuote={handleSubmitQuote}
          onDecline={handleDecline} showToast={showToast} />
      )}
      {activeTab === 'quotes'  && <MyQuotesTab extra={submittedNums} showToast={showToast} />}
      {activeTab === 'history' && <AwardsTab />}
    </div>
  );
};

export default SupplierRFQs;
