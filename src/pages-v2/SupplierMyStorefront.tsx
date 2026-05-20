import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useToast } from '../hooks/useToast';
import { mockSuppliers } from '../data/mockSuppliers';
import { useAdaptive } from '../context/AdaptiveContext';
import { CHANNEL_CONFIG } from '../data/communicationProfiles';

const SUPPLIER_ID = 'sup-007';
const supp = mockSuppliers.find((s) => s.id === SUPPLIER_ID)!;

interface CatalogItem {
  id: string;
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
  visible: boolean;
}

interface ProfileCert {
  name: string;
  visible: boolean;
  status: 'valid' | 'expiring' | 'missing';
  expiry: string | null;
}

interface CompletenessItem {
  label: string;
  done: boolean;
}

const INITIAL_CATALOG: CatalogItem[] = [
  { id: 'c1', material: 'PET Bottle 100ml Airless Pump', sapCode: 'MAT-10045', category: 'Packaging Primary', moq: '10,000', uom: 'PCS', leadTime: '14', unitPrice: '3,700', currency: 'IDR', certs: ['Halal BPJPH', 'ISO 9001'], capacity: '200,000', visible: true },
  { id: 'c2', material: 'PET Bottle 200ml Standard Pump', sapCode: 'MAT-10046', category: 'Packaging Primary', moq: '10,000', uom: 'PCS', leadTime: '14', unitPrice: '4,200', currency: 'IDR', certs: ['Halal BPJPH', 'ISO 9001'], capacity: '150,000', visible: true },
  { id: 'c3', material: 'Airless Pump 15ml Travel Size', sapCode: 'MAT-10089', category: 'Packaging Secondary', moq: '5,000', uom: 'PCS', leadTime: '21', unitPrice: '2,800', currency: 'IDR', certs: ['ISO 9001'], capacity: '100,000', visible: true },
];

const INITIAL_CERTS: ProfileCert[] = [
  { name: 'BPOM Registration', visible: true, status: 'valid', expiry: '2026-12-31' },
  { name: 'ISO 9001:2015', visible: true, status: 'valid', expiry: '2026-08-14' },
  { name: 'BPJPH Halal Cert', visible: false, status: 'missing', expiry: null },
  { name: 'SNI Compliance', visible: true, status: 'expiring', expiry: '2026-05-01' },
];

const COMPLETENESS_ITEMS: CompletenessItem[] = [
  { label: 'Company description', done: true },
  { label: 'Materials catalog (3 items)', done: true },
  { label: 'BPOM Registration', done: true },
  { label: 'ISO 9001 Certificate', done: true },
  { label: 'BPJPH Halal Certificate', done: false },
  { label: 'Annual manufacturing capacity', done: false },
  { label: 'Key clients / references', done: false },
  { label: 'Profile photo / facility image', done: false },
];

const CERT_VARIANT: Record<ProfileCert['status'], 'success' | 'warning' | 'danger'> = {
  valid: 'success',
  expiring: 'warning',
  missing: 'danger',
};

const CERT_LABEL: Record<ProfileCert['status'], string> = {
  valid: 'Valid',
  expiring: 'Expiring',
  missing: 'Missing',
};

const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-teal placeholder:text-text-tertiary';
const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

const Toggle: React.FC<{ on: boolean; onChange: () => void; ariaLabel: string }> = ({
  on,
  onChange,
  ariaLabel,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={ariaLabel}
    onClick={onChange}
    className={`relative w-10 h-5 rounded-full transition-colors ${
      on ? 'bg-teal' : 'bg-bg-hover border border-border-input'
    }`}
  >
    <span
      className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all"
      style={{ left: on ? '22px' : '2px' }}
    />
  </button>
);

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
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-teal-soft border border-teal/30 rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-teal"
      >
        <span>How to improve your ranking</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-teal/20 text-sm text-text-secondary leading-relaxed">
          <div className="mt-3 mb-1 font-semibold text-text-primary">
            Complete your profile ({completeness}% → 100%):
          </div>
          <ul className="list-disc list-inside flex flex-col gap-1 mt-2">
            <li>Upload BPJPH Halal Certificate (+12 points)</li>
            <li>Add annual manufacturing capacity data (+8 points)</li>
            <li>Upload facility/product images (+5 points)</li>
            <li>Add 2 more materials to catalog (+5 points)</li>
            <li>Add key client references (+5 points)</li>
          </ul>
        </div>
      )}
    </div>
  );
};

const SupplierMyStorefront: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getSupplierProfile, isBusinessHours, getLocalTime } = useAdaptive();

  const cp = getSupplierProfile(supp.country);
  const bizHours = isBusinessHours(supp.country);
  const localTime = getLocalTime(supp.country);

  const [catalog, setCatalog] = useState<CatalogItem[]>(INITIAL_CATALOG);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const [description, setDescription] = useState(
    "Leading manufacturer of PET packaging and airless pump systems for beauty and personal care. BPOM registered. ISO 9001:2015 certified. Serving Indonesia's top beauty brands since 2005.",
  );
  const [bizHoursStart, setBizHoursStart] = useState('08:00');
  const [bizHoursEnd, setBizHoursEnd] = useState('17:00');
  const [certs, setCerts] = useState<ProfileCert[]>(INITIAL_CERTS);
  const [newMaterial, setNewMaterial] = useState<NewMaterial>(emptyMaterial);

  const completeness = useMemo(() => {
    const done = COMPLETENESS_ITEMS.filter((i) => i.done).length;
    return Math.round((done / COMPLETENESS_ITEMS.length) * 100);
  }, []);

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
    toast({ title: 'Material removed from catalog' });
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
      toast({ variant: 'error', title: 'Material name is required' });
      return;
    }
    setCatalog((prev) => [
      ...prev,
      { id: `c${Date.now()}`, ...newMaterial, visible: true },
    ]);
    setNewMaterial(emptyMaterial);
    setShowAddForm(false);
    toast({
      variant: 'success',
      title: 'New material submitted for review',
      description:
        'Paragon procurement will notify you within 3 business days.',
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
        breadcrumb={['ACQUIRE', 'MY STOREFRONT']}
        title="My Catalog"
        subtitle={`Your public profile in the Paragon Supplier Marketplace — ${supp.name}.`}
        actions={
          <Button
            variant="primary"
            icon={ExternalLink}
            onClick={() => navigate('/marketplace/supplier/sup-007')}
          >
            Preview public profile
          </Button>
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {catalog.length} materials · {certs.filter((c) => c.visible).length}{' '}
        certifications shown · profile {completeness}% complete
      </PageMetaLine>

      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5 mb-6">
        <div className="flex items-center gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-text-primary">
                Profile completeness
              </span>
              <span
                className={`text-sm font-bold ${
                  completenessVariant === 'success'
                    ? 'text-success'
                    : 'text-warning'
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
                  key={item.label}
                  className={`text-xs ${
                    item.done ? 'text-success' : 'text-danger'
                  }`}
                >
                  {item.done ? '✓' : '✗'} {item.label}
                </span>
              ))}
            </div>
          </div>
          <div className="text-center shrink-0">
            <div
              className={`text-3xl font-extrabold ${
                completenessVariant === 'success'
                  ? 'text-success'
                  : 'text-warning'
              }`}
            >
              {completeness}%
            </div>
            <div className="text-xs text-text-tertiary mt-1">Complete</div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-5">
        <FormSection
          eyebrow="Step 1"
          title="Company profile"
          description="Public-facing information shown to buyers in the marketplace."
        >
          <div className="flex justify-end mb-3">
            <Button
              variant="secondary"
              icon={Edit3}
              onClick={() => setEditProfile(!editProfile)}
            >
              {editProfile ? 'Cancel' : 'Edit'}
            </Button>
          </div>
          {editProfile ? (
            <div>
              <div className="mb-3">
                <label className={labelClass}>Company description</label>
                <textarea
                  className={`${inputClass} min-h-[96px] resize-y`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    setEditProfile(false);
                    toast({
                      variant: 'success',
                      title: 'Company profile updated',
                    });
                  }}
                >
                  Save
                </Button>
                <Button variant="secondary" onClick={() => setEditProfile(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { label: 'Legal name', value: supp.legalName ?? supp.name },
                { label: 'Country', value: `${cp.flag} ${cp.name}` },
                { label: 'Category', value: supp.category },
                {
                  label: 'Established',
                  value: supp.founded ? `${supp.founded}` : '—',
                },
                { label: 'Employees', value: supp.employees ?? '—' },
                { label: 'Revenue', value: supp.annualRevenue ?? '—' },
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
                  Description
                </div>
                <div className="text-sm text-text-secondary leading-relaxed">
                  {description}
                </div>
              </div>
            </div>
          )}
        </FormSection>

        <FormSection
          eyebrow="Step 2"
          title="Materials I supply"
          description="Materials you can quote on. Toggle visibility per item to control marketplace listings."
        >
          <div className="flex justify-end mb-3">
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => setShowAddForm(!showAddForm)}
            >
              Add material
            </Button>
          </div>
          <div className="bg-bg-surface border border-border-subtle rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableHeaderCell>Material</TableHeaderCell>
                <TableHeaderCell>Category</TableHeaderCell>
                <TableHeaderCell>MOQ</TableHeaderCell>
                <TableHeaderCell>Lead time</TableHeaderCell>
                <TableHeaderCell>Unit price</TableHeaderCell>
                <TableHeaderCell>Capacity/mo</TableHeaderCell>
                <TableHeaderCell>Certs</TableHeaderCell>
                <TableHeaderCell>Visible</TableHeaderCell>
                <TableHeaderCell className="text-right">Remove</TableHeaderCell>
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
                      {item.category}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {item.moq} {item.uom}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {item.leadTime} days
                    </TableCell>
                    <TableCell className="font-semibold text-teal">
                      {item.currency} {item.unitPrice}/{item.uom}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {item.capacity}/mo
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
                      <Toggle
                        on={item.visible}
                        onChange={() => toggleCatalogVisibility(item.id)}
                        ariaLabel={`Toggle visibility for ${item.material}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        onClick={() => removeCatalogItem(item.id)}
                        className="text-text-tertiary hover:text-danger"
                        aria-label={`Remove ${item.material}`}
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
                Add new material
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={labelClass}>Material name *</label>
                  <input
                    className={inputClass}
                    placeholder="e.g. PET Bottle 250ml"
                    value={newMaterial.material}
                    onChange={(e) =>
                      setNewMaterial({ ...newMaterial, material: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>SAP code (optional)</label>
                  <input
                    className={inputClass}
                    placeholder="e.g. MAT-10099"
                    value={newMaterial.sapCode}
                    onChange={(e) =>
                      setNewMaterial({ ...newMaterial, sapCode: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Category</label>
                  <select
                    className={inputClass}
                    value={newMaterial.category}
                    onChange={(e) =>
                      setNewMaterial({ ...newMaterial, category: e.target.value })
                    }
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-[1fr_80px] gap-2">
                  <div>
                    <label className={labelClass}>MOQ *</label>
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
                    <label className={labelClass}>UoM</label>
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
                  <label className={labelClass}>Lead time (days)</label>
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
                    <label className={labelClass}>Unit price</label>
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
                    <label className={labelClass}>CCY</label>
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
                  <label className={labelClass}>Capacity/month</label>
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
                <label className={labelClass}>Certifications</label>
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
                <Button variant="primary" onClick={submitNewMaterial}>
                  Submit for review
                </Button>
                <Button variant="secondary" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </FormSection>

        <FormSection
          eyebrow="Step 3"
          title="Certifications on display"
          description="Toggle which certifications appear on your public storefront."
        >
          <div className="flex justify-end mb-3">
            <Button
              variant="secondary"
              icon={Upload}
              onClick={() => toast({ title: 'File browser opened (mock)' })}
            >
              Upload new
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
                        Exp: {cert.expiry}
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
                    {cert.visible ? 'Shown' : 'Hidden'}
                  </span>
                  <Toggle
                    on={cert.visible}
                    onChange={() => toggleCertVisibility(i)}
                    ariaLabel={`Toggle visibility for ${cert.name}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </FormSection>

        <FormSection
          eyebrow="Step 4"
          title="Preferred communication channels"
          description="Primary channel is used for time-sensitive notifications; fallback only when primary fails."
        >
          <div className="flex justify-end mb-3">
            <Button
              variant="primary"
              onClick={() =>
                toast({
                  variant: 'success',
                  title: 'Channel preferences updated',
                })
              }
            >
              Save
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { cfg: primaryCfg, label: 'PRIMARY', variant: 'info' as const, accent: true },
              { cfg: fallbackCfg, label: 'FALLBACK', variant: 'neutral' as const, accent: false },
            ].map(({ cfg, label, variant, accent }, i) =>
              cfg ? (
                <div
                  key={label}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md border ${
                    accent
                      ? 'bg-teal-soft border-teal/30'
                      : 'bg-bg-hover border-border-subtle'
                  }`}
                >
                  <span className="text-2xl shrink-0">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-text-primary">
                      {cfg.label}
                    </div>
                    <div className="text-xs text-text-tertiary">
                      {cfg.description}
                    </div>
                  </div>
                  <StatusPill variant={variant}>{label}</StatusPill>
                </div>
              ) : (
                <div key={i} />
              ),
            )}
          </div>
        </FormSection>

        <FormSection
          eyebrow="Step 5"
          title="Business hours & timezone"
          description="When you're available to respond. Drives bot escalation timing."
        >
          <div className="flex justify-end mb-3">
            <Button
              variant="primary"
              onClick={() =>
                toast({
                  variant: 'success',
                  title: 'Business hours updated',
                })
              }
            >
              Save
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-5">
            <div>
              <label className={labelClass}>Business hours</label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  className={inputClass}
                  style={{ width: 120 }}
                  value={bizHoursStart}
                  onChange={(e) => setBizHoursStart(e.target.value)}
                />
                <span className="text-text-tertiary">to</span>
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
              <label className={labelClass}>Timezone</label>
              <div className="px-3 py-2 bg-bg-hover border border-border-subtle rounded-md text-sm text-text-primary">
                {cp.timezone}
              </div>
            </div>
            <div>
              <div className={labelClass}>Current status</div>
              <StatusPill variant={bizHours ? 'success' : 'neutral'}>
                {bizHours
                  ? `Open — ${localTime}`
                  : `Closed — ${localTime}`}
              </StatusPill>
            </div>
          </div>
        </FormSection>

        <FormSection
          eyebrow="Step 6"
          title="Marketplace statistics"
          description="How buyers are finding and engaging with your storefront."
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Profile views (month)', value: '24', tone: 'text-teal' },
              { label: 'RFQ invitations', value: '3', tone: 'text-info' },
              { label: 'Win rate', value: '67%', tone: 'text-success' },
              { label: 'Category rank', value: '#3 / 31', tone: 'text-warning' },
            ].map((s) => (
              <div
                key={s.label}
                className="px-4 py-3 bg-bg-hover border border-border-subtle rounded-md text-center"
              >
                <div className={`text-xl font-extrabold ${s.tone}`}>
                  {s.value}
                </div>
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

export default SupplierMyStorefront;
