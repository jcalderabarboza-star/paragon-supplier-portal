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
