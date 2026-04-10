import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const NAVY  = '#0D1B2A';
const TEAL  = '#0097A7';
const MID   = '#354A5F';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const SUCCESS = '#107E3E';
const WARNING = '#E9730C';
const ERROR   = '#BB0000';
const INFO    = '#0A6ED1';

// ─── Types ────────────────────────────────────────────────────────────────────
interface GlobalSupplier {
  id: string; name: string; country: string; flag: string; region: string;
  categories: string[]; certifications: string[];
  validatedBy: string[]; matchScore: number;
  description: string; employees: string; founded: string;
  halalCertified: boolean; alreadyInNetwork: boolean;
}

interface SingleSourceItem {
  material: string; category: string; currentSupplier: string;
  risk: string; riskLevel: 'Critical' | 'High' | 'Medium';
  suggestedAlternatives: string[];
}

interface RecommendedSupplier {
  id: string; name: string; country: string; flag: string;
  matchScore: number; whyRecommended: string; covers: string;
  riskNote?: string; storefrontPath: string;
}

interface QualificationItem {
  supplier: string; flag: string; stage: number; stageName: string;
  stageTotal: number; startDate: string; owner: string;
  nextAction: string; dueDate: string; status: 'On Track' | 'At Risk' | 'Blocked';
}

interface MarketIntelCard {
  category: string; icon: string; marketStatus: string;
  suppliersGlobal: number; suppliersParagon: number;
  priceTrend: string; priceDir: '↑' | '↓' | '→'; priceColor: string;
  recommendation: string;
}

// ─── Global Supplier Mock Data ─────────────────────────────────────────────────
const GLOBAL_SUPPLIERS: GlobalSupplier[] = [
  {
    id: 'gs-001', name: 'Givaudan SA', country: 'Switzerland', flag: '🇨🇭', region: 'Europe',
    categories: ['Fragrance', 'Flavor', 'Active Ingredient'],
    certifications: ['ISO 9001', 'ISO 14001', 'Halal MUI', 'COSMOS', 'RSPO'],
    validatedBy: ["L'Oréal", 'Unilever', 'P&G', 'Shiseido', 'LVMH'],
    matchScore: 96, employees: '16,000+', founded: '1895',
    description: 'World\'s largest fragrance and flavor company. Supplies to all major global beauty brands. Strong halal portfolio with dedicated Islamic certification team.',
    halalCertified: true, alreadyInNetwork: true,
  },
  {
    id: 'gs-002', name: 'DSM-Firmenich', country: 'Netherlands', flag: '🇳🇱', region: 'Europe',
    categories: ['Active Ingredient', 'Fragrance', 'Vitamin'],
    certifications: ['ISO 9001', 'GMP', 'Halal JAKIM', 'COSMOS Organic'],
    validatedBy: ["L'Oréal", 'Estée Lauder', 'Beiersdorf', 'Henkel'],
    matchScore: 91, employees: '28,000+', founded: '2023',
    description: 'Global leader in vitamins, active ingredients, and fragrances. JAKIM halal certified for SEA markets. Strong sustainability credentials aligned with Paragon ESG goals.',
    halalCertified: true, alreadyInNetwork: false,
  },
  {
    id: 'gs-003', name: 'Ashland Global Holdings', country: 'United States', flag: '🇺🇸', region: 'Americas',
    categories: ['Active Ingredient', 'Raw Material', 'Specialty Chemical'],
    certifications: ['ISO 9001', 'GMP', 'RSPO', 'Halal IFANCA'],
    validatedBy: ['P&G', 'Unilever', 'Colgate-Palmolive', 'Johnson & Johnson'],
    matchScore: 87, employees: '4,300+', founded: '1924',
    description: 'Specialty chemical company supplying personal care actives globally. IFANCA halal certified portfolio covering emollients, thickeners, and conditioning agents.',
    halalCertified: true, alreadyInNetwork: false,
  },
  {
    id: 'gs-004', name: 'Croda International', country: 'United Kingdom', flag: '🇬🇧', region: 'Europe',
    categories: ['Active Ingredient', 'Raw Material', 'Emollient'],
    certifications: ['ISO 9001', 'ISO 14001', 'Halal MUI', 'COSMOS', 'NATRUE'],
    validatedBy: ["L'Oréal", 'Shiseido', 'Amorepacific', 'Beiersdorf', 'LVMH'],
    matchScore: 89, employees: '6,000+', founded: '1925',
    description: 'Premium specialty chemical supplier with strong halal and natural credentials. MUI certified. Key supplier to Asian beauty brands. Extensive portfolio for skin care actives.',
    halalCertified: true, alreadyInNetwork: false,
  },
  {
    id: 'gs-005', name: 'PT Indesso Aroma', country: 'Indonesia', flag: '🇮🇩', region: 'Asia Pacific',
    categories: ['Fragrance', 'Natural Extract', 'Essential Oil'],
    certifications: ['BPJPH Halal', 'ISO 9001', 'RSPO', 'COSMOS Natural'],
    validatedBy: ['Unilever Indonesia', 'Wings Group', 'Indofood'],
    matchScore: 93, employees: '500+', founded: '1968',
    description: 'Indonesia\'s leading fragrance house. BPJPH halal certified. Deep knowledge of Indonesian consumer preferences. 7-day lead time vs 35 days from Europe. Reduces Suez Canal exposure.',
    halalCertified: true, alreadyInNetwork: false,
  },
  {
    id: 'gs-006', name: 'Zhejiang NHU Co. Ltd.', country: 'China', flag: '🇨🇳', region: 'Asia Pacific',
    categories: ['Vitamin', 'Active Ingredient', 'Specialty Chemical'],
    certifications: ['ISO 9001', 'GMP', 'Halal BPJPH', 'USP Grade'],
    validatedBy: ['DSM', 'BASF', 'Korean Beauty Brands', 'Japanese OEM'],
    matchScore: 82, employees: '12,000+', founded: '2000',
    description: 'World\'s largest Vitamin E and Niacinamide producer. Competitive pricing 20-30% below European alternatives. BPJPH halal certified. Key supplier to Korean and Japanese beauty industry.',
    halalCertified: true, alreadyInNetwork: true,
  },
  {
    id: 'gs-007', name: 'Evonik Industries AG', country: 'Germany', flag: '🇩🇪', region: 'Europe',
    categories: ['Active Ingredient', 'Specialty Chemical', 'Silicone'],
    certifications: ['ISO 9001', 'ISO 14001', 'GMP', 'Halal IFANCA'],
    validatedBy: ["L'Oréal", 'Henkel', 'Beiersdorf', 'P&G', 'Unilever'],
    matchScore: 84, employees: '34,000+', founded: '2007',
    description: 'Specialty chemicals leader with strong personal care portfolio. IFANCA halal certified silicones and actives. Established relationship with Paragon for active ingredients.',
    halalCertified: true, alreadyInNetwork: true,
  },
  {
    id: 'gs-008', name: 'Univar Solutions', country: 'Malaysia', flag: '🇲🇾', region: 'Asia Pacific',
    categories: ['Raw Material', 'Active Ingredient', 'Distribution'],
    certifications: ['ISO 9001', 'Halal JAKIM', 'GDP Certified'],
    validatedBy: ['BASF', 'Evonik', 'DSM', 'Croda', 'Ashland'],
    matchScore: 85, employees: '9,800+', founded: '1966',
    description: 'Global chemical distributor with Malaysia hub covering SEA. JAKIM halal certified. Single-point access to 100+ global chemical suppliers without direct import complexity.',
    halalCertified: true, alreadyInNetwork: false,
  },
];
