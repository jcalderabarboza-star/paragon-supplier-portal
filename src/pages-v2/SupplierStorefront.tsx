import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  MessageCircle,
  Mail,
  Globe,
  Phone,
  MapPin,
  Award,
  Activity,
  Package,
  ShieldCheck,
  History,
  Send,
  CheckCircle2,
  AlertTriangle,
  LucideIcon,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import KpiCard from '../components/ui-v2/KpiCard';
import StatusPill from '../components/ui-v2/StatusPill';
import Tabs from '../components/ui-v2/Tabs';
import Button from '../components/ui-v2/Button';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import Data from '../components/ui-v2/Data';
import { PreferredChannel } from '../types/supplier.types';
import { useSupplier, useStorefrontProducts } from '../services/query/hooks';
import { useCategoryLabel } from '../hooks/useCategoryLabel';
import { useChannelLabel } from '../hooks/useChannelLabel';

type CertStatus = 'valid' | 'expiring' | 'expired';

interface Certification {
  name: string;
  issuer: string;
  expiry: string;
  status: CertStatus;
}

const CERT_VARIANT: Record<CertStatus, 'success' | 'warning' | 'danger'> = {
  valid: 'success',
  expiring: 'warning',
  expired: 'danger',
};

const CERT_LABEL: Record<CertStatus, string> = {
  valid: 'Valid',
  expiring: 'Expiring',
  expired: 'Expired',
};

// TRACK_RECORD is fixture/sample-data (labelled "Sample data" in the UI) — the
// delivery-history labels/details are demo content and stay EN (i18n-defer).
const TRACK_RECORD = [
  { ts: '2026-03-24', label: 'Delivered PO-2026-00421', detail: '50,000 PCS · OTIF on time', icon: CheckCircle2, tone: 'success' as const },
  { ts: '2026-03-05', label: 'Delivered PO-2026-00389', detail: '30,000 PCS · OTIF on time', icon: CheckCircle2, tone: 'success' as const },
  { ts: '2026-02-18', label: 'Closed PO-2026-00351', detail: '20,000 PCS · 3 days late', icon: AlertTriangle, tone: 'warning' as const },
  { ts: '2025-12-12', label: 'Awarded annual contract', detail: 'Renewal for 2026 calendar year', icon: Award, tone: 'info' as const },
  { ts: '2025-11-04', label: 'BPOM audit passed', detail: 'No major findings', icon: ShieldCheck, tone: 'success' as const },
];

const TONE_CLASS: Record<'success' | 'warning' | 'info', string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning-hover',
  info: 'bg-info-soft text-info',
};

type TabId = 'catalog' | 'certs' | 'track' | 'contact';

// Tab labels resolve at render via t() on these keys (namespace supplierStorefront.tab.*).
const TABS: { id: TabId; labelKey: string; icon: LucideIcon }[] = [
  { id: 'catalog', labelKey: 'supplierStorefront.tab.catalog', icon: Package },
  { id: 'certs', labelKey: 'supplierStorefront.tab.certifications', icon: ShieldCheck },
  { id: 'track', labelKey: 'supplierStorefront.tab.trackRecord', icon: History },
  { id: 'contact', labelKey: 'supplierStorefront.tab.contact', icon: MessageCircle },
];

const CHANNEL_ICON: Record<PreferredChannel, LucideIcon> = {
  [PreferredChannel.WHATSAPP]: MessageCircle,
  [PreferredChannel.EMAIL]: Mail,
  [PreferredChannel.WEB]: Globe,
  [PreferredChannel.API]: Send,
};

const SupplierStorefront: React.FC = () => {
  const { t } = useTranslation();
  const cl = useCategoryLabel();
  const chl = useChannelLabel();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('catalog');
  const [message, setMessage] = useState('');

  const supplierQuery = useSupplier(id ?? '');
  const productsQuery = useStorefrontProducts(id);
  const supp = supplierQuery.data ?? null;
  const products = productsQuery.data?.items ?? [];
  const crumb = [
    t('supplierStorefront.crumb.acquire'),
    t('supplierStorefront.crumb.marketplace'),
  ];

  if (supplierQuery.isPending || productsQuery.isPending)
    return <LoadingState breadcrumb={crumb} />;
  if (supplierQuery.isError || productsQuery.isError)
    return (
      <ErrorState
        breadcrumb={crumb}
        error={supplierQuery.error ?? productsQuery.error}
        onRetry={() => {
          supplierQuery.refetch();
          productsQuery.refetch();
        }}
      />
    );

  if (!supp) {
    return (
      <AppShellV2>
        <div className="py-20 text-center">
          <div className="text-lg font-semibold text-text-primary mb-2">
            {t('supplierStorefront.notFound.title')}
          </div>
          <Button
            variant="secondary"
            icon={ArrowLeft}
            onClick={() => navigate('/marketplace')}
          >
            {t('supplierStorefront.notFound.back')}
          </Button>
        </div>
      </AppShellV2>
    );
  }

  const yearsInBusiness = supp.founded
    ? new Date().getFullYear() - supp.founded
    : null;

  const certifications: Certification[] = [
    ...(supp.halalCertified
      ? [
          {
            name: 'BPJPH Halal Certification',
            issuer: 'Badan Penyelenggara Jaminan Produk Halal',
            expiry: supp.certExpiryDate,
            status: 'valid' as CertStatus,
          },
        ]
      : []),
    ...(supp.bpomRegistered
      ? [
          {
            name: 'BPOM Registration',
            issuer: 'Badan Pengawas Obat dan Makanan',
            expiry: supp.certExpiryDate,
            status: 'valid' as CertStatus,
          },
        ]
      : []),
    {
      name: 'ISO 9001:2015 Quality Management',
      issuer: 'International Organization for Standardization',
      expiry: '2026-08-14',
      status: 'valid',
    },
    {
      name: 'SNI Compliance',
      issuer: 'Standar Nasional Indonesia',
      expiry: '2026-05-01',
      status: 'expiring',
    },
  ];

  const ChannelIcon = CHANNEL_ICON[supp.preferredChannel];

  return (
    <AppShellV2>
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate('/marketplace')}
          className="inline-flex items-center gap-1 text-sm text-teal hover:text-teal-hover font-medium"
        >
          <ArrowLeft size={14} />
          {t('supplierStorefront.nav.marketplace')}
        </button>
      </div>

      <PageHeader
        breadcrumb={[
          t('supplierStorefront.crumb.acquire'),
          t('supplierStorefront.crumb.marketplace'),
          supp.name.toUpperCase(),
        ]}
        title={supp.name}
        subtitle={`${cl(supp.category)} · ${supp.city}, ${supp.country}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={MessageCircle}>
              {t('supplierStorefront.header.connect')}
            </Button>
            <Button variant="outline" icon={Send}>
              {t('supplierStorefront.header.requestRfq')}
            </Button>
          </div>
        }
      />

      {/* Hero banner */}
      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="p-8 flex items-center gap-6">
          <div className="w-20 h-20 shrink-0 rounded-lg bg-teal-soft text-teal flex items-center justify-center text-title">
            {supp.name
              .split(/\s+/)
              .map((w) => w[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-text-tertiary font-semibold">
              <MapPin size={12} />
              <span>
                {supp.city}, {supp.country}
              </span>
              {supp.founded && (
                <>
                  <span>·</span>
                  <span>{t('supplierStorefront.hero.est', { year: supp.founded })}</span>
                </>
              )}
            </div>
            <h2 className="text-section text-text-primary mt-1">
              {supp.name}
            </h2>
            <p className="text-sm text-text-secondary mt-1.5 max-w-2xl">
              {/* intelligenceNote is fixture data (i18n-defer); the fallback sentence
                  is composed via interpolation — category via cl(), channel via chl() */}
              {supp.intelligenceNote ??
                t('supplierStorefront.hero.fallbackNote', {
                  category: cl(supp.category),
                  country: supp.country,
                  channel: chl(supp.preferredChannel),
                })}
            </p>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <KpiCard
          eyebrow={t('supplierStorefront.kpi.years.eyebrow')}
          value={yearsInBusiness ? `${yearsInBusiness}` : '—'}
          subtitle={
            supp.founded
              ? t('supplierStorefront.kpi.years.since', { year: supp.founded })
              : t('supplierStorefront.kpi.years.na')
          }
          icon={Award}
        />
        <KpiCard
          eyebrow={t('supplierStorefront.kpi.otif.eyebrow')}
          value={`${supp.otif}%`}
          subtitle={t('supplierStorefront.kpi.otif.subtitle')}
          icon={Activity}
        />
        <KpiCard
          eyebrow={t('supplierStorefront.kpi.categories.eyebrow')}
          value="1"
          subtitle={cl(supp.category)}
          icon={Package}
        />
        <KpiCard
          eyebrow={t('supplierStorefront.kpi.certs.eyebrow')}
          value={certifications.length.toString()}
          subtitle={t('supplierStorefront.kpi.certs.subtitle', {
            count: certifications.filter((c) => c.status === 'valid').length,
          })}
          icon={ShieldCheck}
        />
      </div>

      <Tabs
        tabs={TABS.map((tab) => ({ id: tab.id, icon: tab.icon, label: t(tab.labelKey) }))}
        active={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
        className="mb-6"
      />

      {activeTab === 'catalog' && products.length === 0 && (
        <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-8 text-center text-sm text-text-tertiary">
          {t('supplierStorefront.catalog.empty')}
        </div>
      )}

      {activeTab === 'catalog' && products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {products.map((p) => (
            <div
              key={p.code}
              className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5"
            >
              <Data as="div" className="text-xs text-text-tertiary">
                {p.code}
              </Data>
              <h3 className="text-section text-text-primary mt-1">
                {p.name}
              </h3>
              <div className="grid grid-cols-2 gap-3 mt-4 text-meta">
                <div>
                  <div className="text-label text-text-tertiary uppercase">
                    {t('supplierStorefront.catalog.moq')}
                  </div>
                  <div className="text-text-primary font-medium">
                    <Data>{p.moq}</Data>
                  </div>
                </div>
                <div>
                  <div className="text-label text-text-tertiary uppercase">
                    {t('supplierStorefront.catalog.leadTime')}
                  </div>
                  <div className="text-text-primary font-medium">
                    <Data>{p.leadTime}</Data>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <Button variant="secondary" className="w-full">
                  {t('supplierStorefront.catalog.requestQuote')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'certs' && (
        <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm divide-y divide-border-subtle">
          {certifications.map((c) => (
            <div
              key={c.name}
              className="flex items-start justify-between gap-4 p-5"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-text-primary">
                  {c.name}
                </div>
                <div className="text-meta text-text-tertiary mt-0.5">
                  {c.issuer}
                </div>
                <div className="text-meta text-text-secondary mt-1">
                  {t('supplierStorefront.certs.expires')} <Data>{c.expiry}</Data>
                </div>
              </div>
              <StatusPill variant={CERT_VARIANT[c.status]}>
                {CERT_LABEL[c.status]}
              </StatusPill>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'track' && (
        <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <h2 className="text-section text-text-primary">
              {t('supplierStorefront.track.title')}
            </h2>
            <StatusPill variant="neutral">{t('supplierStorefront.sampleData')}</StatusPill>
          </div>
          <ol className="relative space-y-5">
            {TRACK_RECORD.map((e, i) => {
              const Icon = e.icon;
              return (
                <li key={i} className="flex items-start gap-4">
                  <div
                    className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${TONE_CLASS[e.tone]}`}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-semibold text-text-primary">
                        {e.label}
                      </span>
                      <span className="text-meta text-text-tertiary">
                        <Data>{e.ts}</Data>
                      </span>
                    </div>
                    <p className="text-meta text-text-secondary mt-0.5">
                      {e.detail}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {activeTab === 'contact' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <ChannelIcon size={18} className="text-teal" />
              <h2 className="text-section text-text-primary">
                {t('supplierStorefront.contact.sendVia', {
                  channel: chl(supp.preferredChannel),
                })}
              </h2>
            </div>
            <p className="text-meta text-text-tertiary mb-4">
              {t(`supplierStorefront.channelHint.${supp.preferredChannel}`)}
            </p>
            <label
              htmlFor="storefront-message"
              className="text-label text-text-tertiary uppercase block mb-1.5"
            >
              {t('supplierStorefront.contact.message')}
            </label>
            <textarea
              id="storefront-message"
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('supplierStorefront.contact.messagePlaceholder', {
                name: supp.contactName.split(' ')[0],
              })}
              className="w-full bg-white border border-border-input rounded-md p-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-action transition-colors"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary">
                {t('supplierStorefront.contact.saveDraft')}
              </Button>
              <Button variant="outline" icon={Send}>
                {t('supplierStorefront.contact.send')}
              </Button>
            </div>
          </div>

          <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6 space-y-4">
            <h3 className="text-section text-text-primary">
              {t('supplierStorefront.contact.primaryContact')}
            </h3>
            <div className="text-sm">
              <div className="text-text-primary font-medium">
                {supp.contactName}
              </div>
              <div className="text-text-tertiary text-meta">
                {t('supplierStorefront.contact.preferred', {
                  channel: chl(supp.preferredChannel),
                })}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-text-secondary">
                <Mail size={14} className="text-text-tertiary" />
                <span className="truncate">{supp.email}</span>
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <Phone size={14} className="text-text-tertiary" />
                <span>{supp.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <MapPin size={14} className="text-text-tertiary" />
                <span>
                  {supp.city}, {supp.country}
                </span>
              </div>
              {supp.website && (
                <div className="flex items-center gap-2 text-text-secondary">
                  <Globe size={14} className="text-text-tertiary" />
                  <span className="truncate">{supp.website}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShellV2>
  );
};

export default SupplierStorefront;
