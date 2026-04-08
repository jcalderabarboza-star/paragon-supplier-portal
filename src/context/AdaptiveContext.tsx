import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { COUNTRY_PROFILES, CHANNEL_CONFIG, MESSAGE_TEMPLATES, CountryCode } from '../data/communicationProfiles';

type CountryProfile = typeof COUNTRY_PROFILES[CountryCode];
type ChannelConfig  = typeof CHANNEL_CONFIG[keyof typeof CHANNEL_CONFIG];

interface AdaptiveContextType {
  getSupplierProfile: (country: string) => CountryProfile;
  getChannelConfig:   (channel: string) => ChannelConfig;
  getMessageTemplate: (type: keyof typeof MESSAGE_TEMPLATES, language: string, ...args: string[]) => string;
  formatCurrency:     (amount: number, currency: string) => string;
  formatDate:         (date: string, country: string) => string;
  isBusinessHours:    (country: string) => boolean;
  getLocalTime:       (country: string) => string;
  getComplianceRequirements: (country: string, category: string) => string[];
}

const AdaptiveContext = createContext<AdaptiveContextType | undefined>(undefined);

const FALLBACK_PROFILE = COUNTRY_PROFILES['SG'];

// ─── Helper: get UTC offset in minutes from IANA zone ─────────────────────────
// Uses Intl.DateTimeFormat — works in all modern browsers without a timezone lib
function getLocalTimeStr(timezone: string): string {
  try {
    return new Date().toLocaleTimeString('en-US', {
      timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false,
    });
  } catch {
    return '--:--';
  }
}

function getLocalDateObj(timezone: string): { h: number; m: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone, hour: 'numeric', minute: 'numeric', hour12: false,
    }).formatToParts(new Date());
    const h = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
    const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10);
    return { h, m };
  } catch {
    return { h: 0, m: 0 };
  }
}

function timeToMins(t: string): number {
  const [hh, mm] = t.split(':').map(Number);
  return hh * 60 + mm;
}

// ─── Currency Formatter ───────────────────────────────────────────────────────
function formatCurrency(amount: number, currency: string): string {
  switch (currency) {
    case 'IDR': return 'Rp ' + amount.toLocaleString('id-ID');
    case 'EUR': return '€'  + amount.toLocaleString('de-DE', { minimumFractionDigits: 2 });
    case 'USD': return '$'  + amount.toLocaleString('en-US', { minimumFractionDigits: 2 });
    case 'CNY': return '¥'  + amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 });
    case 'MYR': return 'RM ' + amount.toLocaleString('en-MY', { minimumFractionDigits: 2 });
    case 'SGD': return 'S$' + amount.toLocaleString('en-SG', { minimumFractionDigits: 2 });
    case 'SAR': return '﷼ ' + amount.toLocaleString('ar-SA', { minimumFractionDigits: 2 });
    case 'JPY': return '¥'  + amount.toLocaleString('ja-JP');
    case 'BRL': return 'R$ '+ amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    case 'INR': return '₹'  + amount.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    default:    return currency + ' ' + amount.toLocaleString('en-US', { minimumFractionDigits: 2 });
  }
}

// ─── Date Formatter ───────────────────────────────────────────────────────────
function formatDate(date: string, country: string): string {
  const profile = COUNTRY_PROFILES[country as CountryCode] ?? FALLBACK_PROFILE;
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  const dd   = String(d.getDate()).padStart(2, '0');
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  switch (profile.dateFormat) {
    case 'MM/DD/YYYY': return `${mm}/${dd}/${yyyy}`;
    case 'YYYY/MM/DD': return `${yyyy}/${mm}/${dd}`;
    case 'DD.MM.YYYY': return `${dd}.${mm}.${yyyy}`;
    default:           return `${dd}/${mm}/${yyyy}`;
  }
}

// ─── Compliance Requirements ──────────────────────────────────────────────────
function getComplianceRequirements(country: string, category: string): string[] {
  const reqs: string[] = [];
  const cat = category.toLowerCase();
  const isHalal = cat.includes('halal') || cat.includes('food') || cat.includes('raw') || cat.includes('packaging');

  if (country === 'ID') {
    reqs.push('BPOM Registration');
    if (isHalal) reqs.push('BPJPH Halal Certificate (MUI)');
    reqs.push('NPWP (Tax ID)', 'SNI Compliance');
  }
  if (country === 'MY') {
    reqs.push('SST Registration');
    if (isHalal) reqs.push('JAKIM Halal Certificate');
    reqs.push('MeSTI Certification');
  }
  if (country === 'DE' || country === 'FR') {
    reqs.push('EU Cosmetics Regulation (EC 1223/2009)');
    reqs.push('REACH Compliance (SDS required)');
    if (cat.includes('fragrance')) reqs.push('IFRA Standards Certificate');
    reqs.push('ISO 9001');
  }
  if (country === 'US') {
    reqs.push('FDA Registration', 'cGMP Certificate', 'Certificate of Analysis (CoA)');
    if (cat.includes('raw') || cat.includes('active')) reqs.push('Safety Data Sheet (SDS)');
  }
  if (country === 'CN') {
    reqs.push('CIQ Certificate', 'Unified Social Credit Code');
    if (cat.includes('active') || cat.includes('cosmetic')) reqs.push('NMPA Approval');
    reqs.push('GB Standards Compliance');
  }
  if (country === 'SA') {
    reqs.push('SFDA Registration', 'SASO Certificate');
    reqs.push('GCC Halal Certificate (mandatory)');
  }
  if (country === 'JP') {
    reqs.push('PMDA Registration', 'JIS Standards', 'Qualified Invoice Number (T-number)');
  }
  if (country === 'IN') {
    reqs.push('CDSCO License', 'GSTIN', 'BIS Certificate');
  }
  if (reqs.length === 0) {
    reqs.push('ISO 9001', 'Country-specific import documentation');
  }
  return reqs;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AdaptiveProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const value: AdaptiveContextType = {
    getSupplierProfile: (country: string) =>
      (COUNTRY_PROFILES[country as CountryCode] ?? FALLBACK_PROFILE) as CountryProfile,

    getChannelConfig: (channel: string) =>
      (CHANNEL_CONFIG[channel as keyof typeof CHANNEL_CONFIG] ?? CHANNEL_CONFIG.email) as ChannelConfig,

    getMessageTemplate: (type, language, ...args) => {
      const templates = MESSAGE_TEMPLATES[type] as Record<string, (...a: string[]) => string>;
      const fn = templates[language] ?? templates['en'];
      return fn ? fn(...args) : '';
    },

    formatCurrency,
    formatDate,

    isBusinessHours: (country: string) => {
      const profile = COUNTRY_PROFILES[country as CountryCode] ?? FALLBACK_PROFILE;
      const { h, m } = getLocalDateObj(profile.timezone);
      const current = h * 60 + m;
      return current >= timeToMins(profile.businessHours.start) &&
             current <  timeToMins(profile.businessHours.end);
    },

    getLocalTime: (country: string) => {
      const profile = COUNTRY_PROFILES[country as CountryCode] ?? FALLBACK_PROFILE;
      return getLocalTimeStr(profile.timezone);
    },

    getComplianceRequirements,
  };

  return <AdaptiveContext.Provider value={value}>{children}</AdaptiveContext.Provider>;
};

export const useAdaptive = (): AdaptiveContextType => {
  const ctx = useContext(AdaptiveContext);
  if (!ctx) throw new Error('useAdaptive must be used inside AdaptiveProvider');
  return ctx;
};
