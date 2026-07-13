import { describe, it, expect } from 'vitest';
import { certCategory, certTypeLabelKey, actionLabelKey } from './complianceView';
import { complianceEn, complianceId } from './i18n/compliance';
import type { CertType, ComplianceDisplayStatus } from '../services/data/types';

const ALL_CERT_TYPES: CertType[] = [
  'HALAL_BPJPH',
  'HALAL_MUI_LEGACY',
  'HALAL_FOREIGN',
  'BPOM',
  'ISO',
  'OTHER',
];
const ALL_STATUSES: ComplianceDisplayStatus[] = [
  'Missing',
  'Under Review',
  'Valid',
  'Expiring',
  'Expired',
];

describe('complianceView — certCategory (derived from the certificate scheme)', () => {
  it('collapses the halal schemes to Halal', () => {
    expect(certCategory('HALAL_BPJPH')).toBe('Halal');
    expect(certCategory('HALAL_MUI_LEGACY')).toBe('Halal');
    expect(certCategory('HALAL_FOREIGN')).toBe('Halal');
  });

  it('maps BPOM → Regulatory, ISO → Quality, OTHER → Other', () => {
    expect(certCategory('BPOM')).toBe('Regulatory');
    expect(certCategory('ISO')).toBe('Quality');
    expect(certCategory('OTHER')).toBe('Other');
  });

  it('never fabricates Environmental (no DTO source to distinguish ISO 14001)', () => {
    for (const ct of ALL_CERT_TYPES) {
      expect(certCategory(ct)).not.toBe('Environmental');
    }
  });

  it('is total — every CertType yields a category', () => {
    for (const ct of ALL_CERT_TYPES) {
      expect(['Halal', 'Quality', 'Regulatory', 'Other']).toContain(certCategory(ct));
    }
  });
});

describe('complianceView — certTypeLabelKey resolves in both locales', () => {
  it('every CertType has an EN + ID label', () => {
    for (const ct of ALL_CERT_TYPES) {
      const key = certTypeLabelKey(ct);
      expect(complianceEn[key]).toBeTruthy();
      expect(complianceId[key]).toBeTruthy();
    }
  });
});

describe('complianceView — actionLabelKey is descriptive, not imperative', () => {
  it('every display status has an EN + ID label', () => {
    for (const s of ALL_STATUSES) {
      const key = actionLabelKey(s);
      expect(complianceEn[key]).toBeTruthy();
      expect(complianceId[key]).toBeTruthy();
    }
  });

  it('EN labels name the state — no imperative call-to-action verbs (D4/F0.2)', () => {
    // The SIMULATED cert cannot back a real workflow, so labels must describe the
    // state, never command an action ("Renew now", "Upload", "Submit", "Apply").
    const imperatives = /\b(renew now|upload|submit|apply|start|initiate|fix|contact)\b/i;
    for (const s of ALL_STATUSES) {
      expect(complianceEn[actionLabelKey(s)]).not.toMatch(imperatives);
    }
  });
});
