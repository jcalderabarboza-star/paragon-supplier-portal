import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ExternalLink,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Upload,
  Edit3,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import FormSection from '../components/ui-v2/FormSection';
import StatusPill from '../components/ui-v2/StatusPill';
import Button from '../components/ui-v2/Button';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Switch from '../components/ui-v2/Switch';
import { useToast } from '../hooks/useToast';
import { useCategoryLabel } from '../hooks/useCategoryLabel';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { useAdaptive } from '../context/AdaptiveContext';
import { CHANNEL_CONFIG } from '../data/communicationProfiles';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import Data from '../components/ui-v2/Data';
import {
  useCurrentSupplier,
  useStorefrontCatalog,
  useStorefrontCerts,
} from '../services/query/hooks';
import type {
  CatalogItem,
  ProfileCert,
  ProfileCertStatus,
  Supplier,
} from '../services/data/types';

interface CompletenessItem {
  // `labelKey` is an i18n key (namespace supplierMyStorefront.completeness.*),
  // resolved to a localized label at render; `done` is the demo completeness flag.
  labelKey: string;
  done: boolean;
}

const COMPLETENESS_ITEMS: CompletenessItem[] = [
  { labelKey: 'supplierMyStorefront.completeness.companyDescription', done: true },
  { labelKey: 'supplierMyStorefront.completeness.materialsCatalog', done: true },
  { labelKey: 'supplierMyStorefront.completeness.bpomRegistration', done: true },
  { labelKey: 'supplierMyStorefront.completeness.iso9001', done: true },
  { labelKey: 'supplierMyStorefront.completeness.bpjphHalal', done: false },
  { labelKey: 'supplierMyStorefront.completeness.capacity', done: false },
  { labelKey: 'supplierMyStorefront.completeness.references', done: false },
  { labelKey: 'supplierMyStorefront.completeness.profilePhoto', done: false },
];

const CERT_VARIANT: Record<ProfileCertStatus, 'success' | 'warning' | 'danger'> = {
  valid: 'success',
  expiring: 'warning',
  expired: 'danger',
  missing: 'danger',
  pending: 'warning',
};

const CERT_LABEL: Record<ProfileCertStatus, string> = {
  valid: 'Valid',
  expiring: 'Expiring',
  expired: 'Expired',
  missing: 'Missing',
  pending: 'Pending',
};

const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

interface NewMaterial {
  material: string;
  sapCode: string;
  category: string;
  moq: string;
  uom: string;
  leadTime: string;
  unitPrice: string;
  currency: string;
  certs: string[];
  capacity: string;
}

const emptyMaterial: NewMaterial = {
  material: '',
  sapCode: '',
  category: 'Packaging Primary',
  moq: '',
  uom: 'PCS',
  leadTime: '',
  unitPrice: '',
  currency: 'IDR',
  certs: [],
  capacity: '',
};

const CATEGORY_OPTIONS = [
  'Packaging Primary',
  'Packaging Secondary',
  'Labels & Print',
  'Sustainable Packaging',
];
const UOM_OPTIONS = ['PCS', 'KG', 'L', 'MT'];
const CURRENCY_OPTIONS = ['IDR', 'USD', 'EUR'];
const CERT_OPTIONS = ['Halal BPJPH', 'ISO 9001', 'BPOM', 'SNI', 'RSPO'];

const AdvisorPanel: React.FC<{ completeness: number }> = ({ completeness }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-teal-soft border border-teal/30 rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-teal"
      >
        <span>{t('supplierMyStorefront.advisor.title')}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-teal/20 text-sm text-text-secondary leading-relaxed">
          <div className="mt-3 mb-1 font-semibold text-text-primary">
            {t('supplierMyStorefront.advisor.heading', { pct: completeness })}
          </div>
          <ul className="list-disc list-inside flex flex-col gap-1 mt-2">
            <li>{t('supplierMyStorefront.advisor.item.halal')}</li>
            <li>{t('supplierMyStorefront.advisor.item.capacity')}</li>
            <li>{t('supplierMyStorefront.advisor.item.images')}</li>
            <li>{t('supplierMyStorefront.advisor.item.materials')}</li>
            <li>{t('supplierMyStorefront.advisor.item.references')}</li>
          </ul>
        </div>
      )}
    </div>
  );
};

interface StorefrontEditorProps {
  supp: Supplier;
  supplierId: string;
  initialCatalog: CatalogItem[];
  initialCerts: ProfileCert[];
}

const StorefrontEditor: React.FC<StorefrontEditorProps> = ({
  supp,
  supplierId,
  initialCatalog,
  initialCerts,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const cl = useCategoryLabel();
  const { toast } = useToast();
  const { getSupplierProfile, isBusinessHours, getLocalTime } = useAdaptive();

  const [catalog, setCatalog] = useState<CatalogItem[]>(initialCatalog);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const [description, setDescription] = useState(
    "Leading manufacturer of PET packaging and airless pump systems for beauty and personal care. BPOM registered. ISO 9001:2015 certified. Serving Indonesia's top beauty brands since 2005.",
  );
  const [bizHoursStart, setBizHoursStart] = useState('08:00');
  const [bizHoursEnd, setBizHoursEnd] = useState('17:00');
  const [certs, setCerts] = useState<ProfileCert[]>(initialCerts);
  const [newMaterial, setNewMaterial] = useState<NewMaterial>(emptyMaterial);

  const completeness = useMemo(() => {
    const done = COMPLETENESS_ITEMS.filter((i) => i.done).length;
    return Math.round((done / COMPLETENESS_ITEMS.length) * 100);
  }, []);

  const cp = getSupplierProfile(supp.country);
  const bizHours = isBusinessHours(supp.country);
  const localTime = getLocalTime(supp.country);

  const toggleCertVisibility = (idx: number) => {
    setCerts((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, visible: !c.visible } : c)),
    );
  };

  const toggleCatalogVisibility = (id: string) => {
    setCatalog((prev) =>
      prev.map((x) => (x.id === id ? { ...x, visible: !x.visible } : x)),
    );
  };

  const removeCatalogItem = (id: string) => {
    setCatalog((prev) => prev.filter((x) => x.id !== id));
    toast({ title: t('supplierMyStorefront.toast.materialRemoved') });
  };

  const toggleNewCert = (c: string) => {
    setNewMaterial((p) => ({
      ...p,
      certs: p.certs.includes(c)
        ? p.certs.filter((x) => x !== c)
        : [...p.certs, c],
    }));
  };

  const submitNewMaterial = () => {
    if (!newMaterial.material) {
      toast({
        variant: 'error',
        title: t('supplierMyStorefront.toast.materialNameRequired'),
      });
      return;
    }
    setCatalog((prev) => [
      ...prev,
      { id: `c${Date.now()}`, supplierId, ...newMaterial, visible: true },
    ]);
    setNewMaterial(emptyMaterial);
    setShowAddForm(false);
    toast({
      variant: 'success',
      title: t('supplierMyStorefront.toast.materialSubmitted.title'),
      description: t('supplierMyStorefront.toast.materialSubmitted.desc'),
    });
  };

  const completenessVariant: 'success' | 'warning' =
    completeness >= 80 ? 'success' : 'warning';

  const primaryCfg =
    CHANNEL_CONFIG[cp.primaryChannel as keyof typeof CHANNEL_CONFIG];
  const fallbackCfg =
    CHANNEL_CONFIG[cp.fallbackChannel as keyof typeof CHANNEL_CONFIG];

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={[
          t('supplierMyStorefront.crumb.acquire'),
          t('supplierMyStorefront.crumb.myStorefront'),
        ]}
        title={t('supplierMyStorefront.header.title')}
        subtitle={t('supplierMyStorefront.header.subtitle', { supplier: supp.name })}
        actions={
          <Button
            variant="outline"
            icon={ExternalLink}
            onClick={() => navigate(`/marketplace/supplier/${supplierId}`)}
          >
            {t('supplierMyStorefront.header.preview')}
          </Button>
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t('supplierMyStorefront.meta.summary', {
          materials: catalog.length,
          certs: certs.filter((c) => c.visible).length,
          pct: completeness,
        })}
      </PageMetaLine>

      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5 mb-6">
        <div className="flex items-center gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-text-primary">
                {t('supplierMyStorefront.completeness.title')}
              </span>
              <span
                className={`text-sm font-bold ${
                  completenessVariant === 'success'
                    ? 'text-success'
                    : 'text-warning-hover'
                }`}
              >
                {completeness}%
              </span>
            </div>
            <div className="h-2.5 bg-bg-hover rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  completenessVariant === 'success' ? 'bg-success' : 'bg-warning'
                }`}
                style={{ width: `${completeness}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
              {COMPLETENESS_ITEMS.map((item) => (
                <span
                  key={item.labelKey}
                  className={`text-xs ${
                    item.done ? 'text-success' : 'text-danger'
                  }`}
                >
                  {item.done ? '✓' : '✗'} {t(item.labelKey)}
                </span>
              ))}
            </div>
          </div>
          <div className="text-center shrink-0">
            <div
              className={`text-kpi font-mono tabular-nums ${
                completenessVariant === 'success'
                  ? 'text-success'
                  : 'text-warning-hover'
              }`}
            >
              {completeness}%
            </div>
            <div className="text-xs text-text-tertiary mt-1">
              {t('supplierMyStorefront.completeness.complete')}
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-5">
        <FormSection
          eyebrow={t('supplierMyStorefront.step', { n: 1 })}
          title={t('supplierMyStorefront.step1.title')}
          description={t('supplierMyStorefront.step1.description')}
        >
          <div className="flex justify-end mb-3">
            <Button
              variant="secondary"
              icon={Edit3}
              onClick={() => setEditProfile(!editProfile)}
            >
              {editProfile
                ? t('supplierMyStorefront.action.cancel')
                : t('supplierMyStorefront.action.edit')}
            </Button>
          </div>
          {editProfile ? (
            <div>
              <div className="mb-3">
                <label className={labelClass}>
                  {t('supplierMyStorefront.field.companyDescription')}
                </label>
                <textarea
                  className={`${inputClass} min-h-[96px] resize-y`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditProfile(false);
                    toast({
                      variant: 'success',
                      title: t('supplierMyStorefront.toast.profileUpdated'),
                    });
                  }}
                >
                  {t('supplierMyStorefront.action.save')}
                </Button>
                <Button variant="secondary" onClick={() => setEditProfile(false)}>
                  {t('supplierMyStorefront.action.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  label: t('supplierMyStorefront.field.legalName'),
                  value: supp.legalName ?? supp.name,
                },
                { label: t('supplierMyStorefront.field.country'), value: `${cp.flag} ${cp.name}` },
                // Category token → localized display via cl(); stored value stays canonical EN.
                { label: t('supplierMyStorefront.field.category'), value: cl(supp.category) },
                {
                  label: t('supplierMyStorefront.field.established'),
                  value: supp.founded ? `${supp.founded}` : '—',
                },
                { label: t('supplierMyStorefront.field.employees'), value: supp.employees ?? '—' },
                { label: t('supplierMyStorefront.field.revenue'), value: supp.annualRevenue ?? '—' },
              ].map((r) => (
                <div
                  key={r.label}
                  className="px-3 py-2 bg-bg-hover rounded-md"
                >
                  <div className="text-label text-text-tertiary uppercase mb-0.5">
                    {r.label}
                  </div>
                  <div className="text-sm font-medium text-text-primary">
                    {r.value}
                  </div>
                </div>
              ))}
              <div className="md:col-span-2 px-3 py-2 bg-bg-hover rounded-md">
                <div className="text-label text-text-tertiary uppercase mb-0.5">
                  {t('supplierMyStorefront.field.description')}
                </div>
                <div className="text-sm text-text-secondary leading-relaxed">
                  {description}
                </div>
              </div>
            </div>
          )}
        </FormSection>

        <FormSection
          eyebrow={t('supplierMyStorefront.step', { n: 2 })}
          title={t('supplierMyStorefront.step2.title')}
          description={t('supplierMyStorefront.step2.description')}
        >
          <div className="flex justify-end mb-3">
            <Button
              variant="outline"
              icon={Plus}
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {t('supplierMyStorefront.action.addMaterial')}
            </Button>
          </div>
          <div className="bg-bg-surface border border-border-subtle rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('supplierMyStorefront.col.material')}</TableHeaderCell>
                <TableHeaderCell>{t('supplierMyStorefront.col.category')}</TableHeaderCell>
                <TableHeaderCell>{t('supplierMyStorefront.col.moq')}</TableHeaderCell>
                <TableHeaderCell>{t('supplierMyStorefront.col.leadTime')}</TableHeaderCell>
                <TableHeaderCell>{t('supplierMyStorefront.col.unitPrice')}</TableHeaderCell>
                <TableHeaderCell>{t('supplierMyStorefront.col.capacity')}</TableHeaderCell>
                <TableHeaderCell>{t('supplierMyStorefront.col.certs')}</TableHeaderCell>
                <TableHeaderCell>{t('supplierMyStorefront.col.visible')}</TableHeaderCell>
                <TableHeaderCell className="text-right">
                  {t('supplierMyStorefront.col.remove')}
                </TableHeaderCell>
              </TableHeader>
              <tbody>
                {catalog.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <span className="font-semibold text-text-primary">
                        {item.material}
                      </span>
                    </TableCell>
                    <TableCell className="text-text-tertiary text-xs">
                      {cl(item.category)}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      <Data>{item.moq} {item.uom}</Data>
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      <Data>{item.leadTime} days</Data>
                    </TableCell>
                    <TableCell className="font-semibold text-teal">
                      <Data>{item.currency} {item.unitPrice}/{item.uom}</Data>
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      <Data>{item.capacity}/mo</Data>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.certs.map((c) => (
                          <StatusPill key={c} variant="success">
                            {c}
                          </StatusPill>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={item.visible}
                        onChange={() => toggleCatalogVisibility(item.id)}
                        ariaLabel={t('supplierMyStorefront.aria.toggleVisibility', {
                          name: item.material,
                        })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        onClick={() => removeCatalogItem(item.id)}
                        className="text-text-tertiary hover:text-danger"
                        aria-label={t('supplierMyStorefront.aria.removeMaterial', {
                          name: item.material,
                        })}
                      >
                        <Trash2 size={14} />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </div>
          {showAddForm && (
            <div className="mt-4 bg-bg-hover border border-teal/30 rounded-md p-4">
              <div className="text-sm font-semibold text-text-primary mb-3">
                {t('supplierMyStorefront.addForm.title')}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={labelClass}>
                    {t('supplierMyStorefront.addForm.materialName')}
                  </label>
                  <input
                    className={inputClass}
                    placeholder={t('supplierMyStorefront.addForm.materialNamePlaceholder')}
                    value={newMaterial.material}
                    onChange={(e) =>
                      setNewMaterial({ ...newMaterial, material: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    {t('supplierMyStorefront.addForm.sapCode')}
                  </label>
                  <input
                    className={inputClass}
                    placeholder={t('supplierMyStorefront.addForm.sapCodePlaceholder')}
                    value={newMaterial.sapCode}
                    onChange={(e) =>
                      setNewMaterial({ ...newMaterial, sapCode: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    {t('supplierMyStorefront.addForm.category')}
                  </label>
                  <select
                    className={inputClass}
                    value={newMaterial.category}
                    onChange={(e) =>
                      setNewMaterial({ ...newMaterial, category: e.target.value })
                    }
                  >
                    {/* value stays canonical EN (stored form data); label localizes via cl() */}
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {cl(c)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-[1fr_80px] gap-2">
                  <div>
                    <label className={labelClass}>
                      {t('supplierMyStorefront.addForm.moq')}
                    </label>
                    <input
                      type="number"
                      className={inputClass}
                      value={newMaterial.moq}
                      onChange={(e) =>
                        setNewMaterial({ ...newMaterial, moq: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      {t('supplierMyStorefront.addForm.uom')}
                    </label>
                    <select
                      className={inputClass}
                      value={newMaterial.uom}
                      onChange={(e) =>
                        setNewMaterial({ ...newMaterial, uom: e.target.value })
                      }
                    >
                      {UOM_OPTIONS.map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>
                    {t('supplierMyStorefront.addForm.leadTime')}
                  </label>
                  <input
                    type="number"
                    className={inputClass}
                    value={newMaterial.leadTime}
                    onChange={(e) =>
                      setNewMaterial({ ...newMaterial, leadTime: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-[1fr_80px] gap-2">
                  <div>
                    <label className={labelClass}>
                      {t('supplierMyStorefront.addForm.unitPrice')}
                    </label>
                    <input
                      type="number"
                      className={inputClass}
                      value={newMaterial.unitPrice}
                      onChange={(e) =>
                        setNewMaterial({
                          ...newMaterial,
                          unitPrice: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      {t('supplierMyStorefront.addForm.ccy')}
                    </label>
                    <select
                      className={inputClass}
                      value={newMaterial.currency}
                      onChange={(e) =>
                        setNewMaterial({
                          ...newMaterial,
                          currency: e.target.value,
                        })
                      }
                    >
                      {CURRENCY_OPTIONS.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>
                    {t('supplierMyStorefront.addForm.capacity')}
                  </label>
                  <input
                    type="number"
                    className={inputClass}
                    value={newMaterial.capacity}
                    onChange={(e) =>
                      setNewMaterial({
                        ...newMaterial,
                        capacity: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className={labelClass}>
                  {t('supplierMyStorefront.addForm.certifications')}
                </label>
                <div className="flex flex-wrap gap-3">
                  {CERT_OPTIONS.map((c) => (
                    <label
                      key={c}
                      className="flex items-center gap-1.5 text-sm text-text-secondary cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={newMaterial.certs.includes(c)}
                        onChange={() => toggleNewCert(c)}
                        className="accent-teal"
                      />
                      {c}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={submitNewMaterial}>
                  {t('supplierMyStorefront.action.submitReview')}
                </Button>
                <Button variant="secondary" onClick={() => setShowAddForm(false)}>
                  {t('supplierMyStorefront.action.cancel')}
                </Button>
              </div>
            </div>
          )}
        </FormSection>

        <FormSection
          eyebrow={t('supplierMyStorefront.step', { n: 3 })}
          title={t('supplierMyStorefront.step3.title')}
          description={t('supplierMyStorefront.step3.description')}
        >
          <div className="flex justify-end mb-3">
            <Button
              variant="outline"
              icon={Upload}
              onClick={() => toast({ title: t('supplierMyStorefront.toast.fileBrowser') })}
            >
              {t('supplierMyStorefront.action.uploadNew')}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {certs.map((cert, i) => (
              <div
                key={cert.name}
                className="flex items-center gap-3 px-4 py-3 bg-bg-hover border border-border-subtle rounded-md"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text-primary mb-1">
                    {cert.name}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusPill variant={CERT_VARIANT[cert.status]}>
                      {CERT_LABEL[cert.status]}
                    </StatusPill>
                    {cert.expiry && (
                      <span className="text-xs text-text-tertiary">
                        {t('supplierMyStorefront.cert.expPrefix')}{' '}
                        <Data>{cert.expiry}</Data>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold ${
                      cert.visible ? 'text-teal' : 'text-text-tertiary'
                    }`}
                  >
                    {cert.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                    {cert.visible
                      ? t('supplierMyStorefront.cert.shown')
                      : t('supplierMyStorefront.cert.hidden')}
                  </span>
                  <Switch
                    checked={cert.visible}
                    onChange={() => toggleCertVisibility(i)}
                    ariaLabel={t('supplierMyStorefront.aria.toggleVisibility', {
                      name: cert.name,
                    })}
                  />
                </div>
              </div>
            ))}
          </div>
        </FormSection>

        <FormSection
          eyebrow={t('supplierMyStorefront.step', { n: 4 })}
          title={t('supplierMyStorefront.step4.title')}
          description={t('supplierMyStorefront.step4.description')}
        >
          <div className="flex justify-end mb-3">
            <Button
              variant="outline"
              onClick={() =>
                toast({
                  variant: 'success',
                  title: t('supplierMyStorefront.toast.channelUpdated'),
                })
              }
            >
              {t('supplierMyStorefront.action.save')}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                cfg: primaryCfg,
                labelKey: 'supplierMyStorefront.channel.primary',
                variant: 'info' as const,
                accent: true,
              },
              {
                cfg: fallbackCfg,
                labelKey: 'supplierMyStorefront.channel.fallback',
                variant: 'neutral' as const,
                accent: false,
              },
            ].map(({ cfg, labelKey, variant, accent }, i) =>
              cfg ? (
                <div
                  key={labelKey}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md border ${
                    accent
                      ? 'bg-teal-soft border-teal/30'
                      : 'bg-bg-hover border-border-subtle'
                  }`}
                >
                  <span className="text-2xl shrink-0">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    {/* cfg.label / cfg.description are shared CHANNEL_CONFIG data
                        (proper-noun channel names + technical protocol copy) — i18n-defer */}
                    <div className="text-sm font-semibold text-text-primary">
                      {cfg.label}
                    </div>
                    <div className="text-xs text-text-tertiary">
                      {cfg.description}
                    </div>
                  </div>
                  <StatusPill variant={variant}>{t(labelKey)}</StatusPill>
                </div>
              ) : (
                <div key={i} />
              ),
            )}
          </div>
        </FormSection>

        <FormSection
          eyebrow={t('supplierMyStorefront.step', { n: 5 })}
          title={t('supplierMyStorefront.step5.title')}
          description={t('supplierMyStorefront.step5.description')}
        >
          <div className="flex justify-end mb-3">
            <Button
              variant="outline"
              onClick={() =>
                toast({
                  variant: 'success',
                  title: t('supplierMyStorefront.toast.hoursUpdated'),
                })
              }
            >
              {t('supplierMyStorefront.action.save')}
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-5">
            <div>
              <label className={labelClass}>
                {t('supplierMyStorefront.field.businessHours')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  className={inputClass}
                  style={{ width: 120 }}
                  value={bizHoursStart}
                  onChange={(e) => setBizHoursStart(e.target.value)}
                />
                <span className="text-text-tertiary">
                  {t('supplierMyStorefront.field.to')}
                </span>
                <input
                  type="time"
                  className={inputClass}
                  style={{ width: 120 }}
                  value={bizHoursEnd}
                  onChange={(e) => setBizHoursEnd(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>
                {t('supplierMyStorefront.field.timezone')}
              </label>
              <div className="px-3 py-2 bg-bg-hover border border-border-subtle rounded-md text-sm text-text-primary">
                {cp.timezone}
              </div>
            </div>
            <div>
              <div className={labelClass}>
                {t('supplierMyStorefront.field.currentStatus')}
              </div>
              <StatusPill variant={bizHours ? 'success' : 'neutral'}>
                {bizHours
                  ? t('supplierMyStorefront.status.open', { time: localTime })
                  : t('supplierMyStorefront.status.closed', { time: localTime })}
              </StatusPill>
            </div>
          </div>
        </FormSection>

        <FormSection
          eyebrow={t('supplierMyStorefront.step', { n: 6 })}
          title={t('supplierMyStorefront.step6.title')}
          description={t('supplierMyStorefront.step6.description')}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {/* value figures are demo marketplace stats (mono DATA) — kept EN */}
            {[
              { label: t('supplierMyStorefront.stat.profileViews'), value: '24', tone: 'text-teal' },
              { label: t('supplierMyStorefront.stat.rfqInvitations'), value: '3', tone: 'text-info' },
              { label: t('supplierMyStorefront.stat.winRate'), value: '67%', tone: 'text-success' },
              { label: t('supplierMyStorefront.stat.categoryRank'), value: '#3 / 31', tone: 'text-warning-hover' },
            ].map((s) => (
              <div
                key={s.label}
                className="px-4 py-3 bg-bg-hover border border-border-subtle rounded-md text-center"
              >
                <Data as="div" className={`text-xl font-semibold ${s.tone}`}>
                  {s.value}
                </Data>
                <div className="text-xs text-text-tertiary mt-1">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          <AdvisorPanel completeness={completeness} />
        </FormSection>
      </div>
    </AppShellV2>
  );
};

// Wrapper: reads the current supplier + storefront catalog/certs through the
// scoped hooks and renders the four honest states; the editor inner holds the
// local (Phase-2′, non-persisting) catalog/cert/profile edit state seeded from
// the resolved reads.
const SupplierMyStorefront: React.FC = () => {
  const { t } = useTranslation();
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;
  const supplierQuery = useCurrentSupplier();
  const catalogQuery = useStorefrontCatalog();
  const certsQuery = useStorefrontCerts();
  const crumb = [
    t('supplierMyStorefront.crumb.acquire'),
    t('supplierMyStorefront.crumb.myStorefront'),
  ];

  if (!supplierId) return <NoSupplierIdentity />;
  if (supplierQuery.isPending || catalogQuery.isPending || certsQuery.isPending)
    return <LoadingState breadcrumb={crumb} />;
  if (supplierQuery.isError || catalogQuery.isError || certsQuery.isError)
    return (
      <ErrorState
        breadcrumb={crumb}
        error={supplierQuery.error ?? catalogQuery.error ?? certsQuery.error}
        onRetry={() => {
          supplierQuery.refetch();
          catalogQuery.refetch();
          certsQuery.refetch();
        }}
      />
    );

  const supp = supplierQuery.data ?? null;
  if (!supp) return <NoSupplierIdentity />;

  return (
    <StorefrontEditor
      supp={supp}
      supplierId={supplierId}
      initialCatalog={catalogQuery.data?.items ?? []}
      initialCerts={certsQuery.data?.items ?? []}
    />
  );
};

export default SupplierMyStorefront;
