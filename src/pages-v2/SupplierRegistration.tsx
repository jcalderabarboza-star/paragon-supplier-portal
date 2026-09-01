import React, { useMemo, useState } from 'react';
import {
  Building2,
  ClipboardCheck,
  UserPlus,
  Plus,
  X,
  Upload,
  CheckCircle2,
  ChevronLeft,
  Info,
  MessageCircle,
  Globe,
  Send,
  Radio,
  LucideIcon,
} from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import type { TFunction } from 'i18next';
import Wizard, { WizardStep } from '../components/ui-v2/Wizard';
import FormSection from '../components/ui-v2/FormSection';
import StatusPill from '../components/ui-v2/StatusPill';
import Button from '../components/ui-v2/Button';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';

type RequestType = 'External SR' | 'Internal SR' | 'KOL';

interface RequestTypeMeta {
  id: RequestType;
  labelKey: string;
  subKey: string;
  detailKey: string;
  Icon: LucideIcon;
  steps: number;
  badgeKey: string;
  shortKey: string;
}

const REQUEST_TYPES: RequestTypeMeta[] = [
  {
    id: 'External SR',
    labelKey: 'registration.type.external.label',
    subKey: 'registration.type.external.sub',
    detailKey: 'registration.type.external.detail',
    Icon: Building2,
    steps: 5,
    badgeKey: 'registration.type.external.badge',
    shortKey: 'registration.type.external.short',
  },
  {
    id: 'Internal SR',
    labelKey: 'registration.type.internal.label',
    subKey: 'registration.type.internal.sub',
    detailKey: 'registration.type.internal.detail',
    Icon: ClipboardCheck,
    steps: 3,
    badgeKey: 'registration.type.internal.badge',
    shortKey: 'registration.type.internal.short',
  },
  {
    id: 'KOL',
    labelKey: 'registration.type.kol.label',
    subKey: 'registration.type.kol.sub',
    detailKey: 'registration.type.kol.detail',
    Icon: UserPlus,
    steps: 2,
    badgeKey: 'registration.type.kol.badge',
    shortKey: 'registration.type.kol.short',
  },
];

interface CategoryOption {
  value: string;
  key: string;
}

const SUPPLY_CATEGORIES: CategoryOption[] = [
  { value: 'Raw Materials', key: 'registration.category.rawMaterials' },
  { value: 'Electronics', key: 'registration.category.electronics' },
  { value: 'Mechanical Components', key: 'registration.category.mechanicalComponents' },
  { value: 'Packaging', key: 'registration.category.packaging' },
  { value: 'Chemicals', key: 'registration.category.chemicals' },
  { value: 'Logistics & Transport', key: 'registration.category.logistics' },
  { value: 'IT Services', key: 'registration.category.itServices' },
  { value: 'MRO Supplies', key: 'registration.category.mroSupplies' },
  { value: 'Food & Beverage', key: 'registration.category.foodBeverage' },
  { value: 'Textiles', key: 'registration.category.textiles' },
];

interface RoleOption {
  value: string;
  key: string;
}

const CONTACT_ROLES: RoleOption[] = [
  { value: 'Primary Contact', key: 'registration.role.primary' },
  { value: 'Finance', key: 'registration.role.finance' },
  { value: 'Operations', key: 'registration.role.operations' },
  { value: 'Legal', key: 'registration.role.legal' },
  { value: 'Technical', key: 'registration.role.technical' },
];

interface ChannelOption {
  value: string;
  Icon: LucideIcon;
  labelKey: string;
  descKey: string;
}

const CHANNELS: ChannelOption[] = [
  { value: 'WhatsApp', Icon: MessageCircle, labelKey: 'registration.channel.whatsapp.label', descKey: 'registration.channel.whatsapp.desc' },
  { value: 'Web Portal', Icon: Globe, labelKey: 'registration.channel.web.label', descKey: 'registration.channel.web.desc' },
  { value: 'API', Icon: Send, labelKey: 'registration.channel.api.label', descKey: 'registration.channel.api.desc' },
  { value: 'EDI', Icon: Radio, labelKey: 'registration.channel.edi.label', descKey: 'registration.channel.edi.desc' },
];

interface DocumentMeta {
  key: string;
  labelKey: string;
  hasExpiry: boolean;
}

const DOCUMENTS: DocumentMeta[] = [
  { key: 'npwp', labelKey: 'registration.document.npwp', hasExpiry: false },
  { key: 'nib', labelKey: 'registration.document.nib', hasExpiry: true },
  { key: 'halal', labelKey: 'registration.document.halal', hasExpiry: true },
  { key: 'iso', labelKey: 'registration.document.iso', hasExpiry: true },
];

const BANKS = ['BCA', 'Mandiri', 'BNI', 'BRI', 'CIMB Niaga', 'Other'];

const INDONESIAN_PROVINCES = [
  'Aceh', 'Bali', 'Banten', 'Bengkulu', 'DI Yogyakarta', 'DKI Jakarta',
  'Gorontalo', 'Jambi', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur',
  'Kalimantan Barat', 'Kalimantan Selatan', 'Kalimantan Tengah', 'Kalimantan Timur',
  'Kalimantan Utara', 'Kepulauan Bangka Belitung', 'Kepulauan Riau', 'Lampung',
  'Maluku', 'Maluku Utara', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur',
  'Papua', 'Papua Barat', 'Riau', 'Sulawesi Barat', 'Sulawesi Selatan',
  'Sulawesi Tengah', 'Sulawesi Tenggara', 'Sulawesi Utara', 'Sumatera Barat',
  'Sumatera Selatan', 'Sumatera Utara',
];

const COUNTRIES = [
  'Indonesia', 'Malaysia', 'Singapore', 'Thailand', 'Vietnam', 'Philippines', 'Other',
];

// Value → i18n-key lookups for the multi-select fields, so the stored form
// value stays the canonical English literal (logic) while display localizes.
const catKey = (value: string): string =>
  SUPPLY_CATEGORIES.find((c) => c.value === value)?.key ?? '';
const roleKey = (value: string): string =>
  CONTACT_ROLES.find((r) => r.value === value)?.key ?? '';
const channelLabelKey = (value: string): string =>
  CHANNELS.find((c) => c.value === value)?.labelKey ?? '';

interface Contact {
  name: string;
  role: string;
  email: string;
  whatsapp: string;
  phone: string;
}

interface DocState {
  uploaded: boolean;
  fileName: string;
  expiry: string;
}

const emptyContact = (): Contact => ({
  name: '',
  role: 'Primary Contact',
  email: '',
  whatsapp: '',
  phone: '',
});

const emptyDoc = (): DocState => ({
  uploaded: false,
  fileName: '',
  expiry: '',
});

const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
const labelClass = 'block text-label text-text-tertiary uppercase mb-1';
const errorClass = 'text-danger text-xs mt-1';

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, required, error, children }) => (
  <div>
    <label className={labelClass}>
      {label}
      {required && <span className="text-danger ml-0.5">*</span>}
    </label>
    {children}
    {error && <div className={errorClass}>{error}</div>}
  </div>
);

const PageHeader: React.FC = () => {
  const { t } = useTranslation();
  return (
    <header className="bg-bg-surface border-b border-border-subtle px-4 sm:px-8 py-4">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div>
          <div className="text-base sm:text-lg font-bold text-navy tracking-widest">
            PARAGONCORP
          </div>
          <div className="text-xs text-text-tertiary mt-0.5">
            {t('registration.header.subtitle')}
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <div className="text-xs text-text-tertiary">
            {t('registration.header.needHelp')}
          </div>
          <a
            href="mailto:supplier-support@paragon.id"
            className="text-xs font-semibold text-teal hover:text-teal-hover"
          >
            supplier-support@paragon.id
          </a>
        </div>
      </div>
    </header>
  );
};

const PageFooter: React.FC = () => (
  <footer className="px-4 py-4 text-center text-xs text-text-tertiary border-t border-border-subtle bg-bg-surface mt-auto">
    © Paragon Corp ·{' '}
    <a
      href="mailto:supplier-support@paragon.id"
      className="text-teal hover:text-teal-hover"
    >
      supplier-support@paragon.id
    </a>
  </footer>
);

const RequestTypeSelector: React.FC<{
  value: RequestType | null;
  onChange: (t: RequestType) => void;
  onContinue: () => void;
}> = ({ value, onChange, onContinue }) => {
  const { t } = useTranslation();
  const selectedMeta = REQUEST_TYPES.find((r) => r.id === value);
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-md p-6 sm:p-8">
      <h1 className="text-title text-text-primary mb-1">
        {t('registration.selector.title')}
      </h1>
      <p className="text-sm text-text-tertiary mb-6">
        {t('registration.selector.subtitle')}
      </p>
      <div className="flex flex-col gap-3 mb-6">
        {REQUEST_TYPES.map((rt) => {
          const Icon = rt.Icon;
          const selected = value === rt.id;
          return (
            <button
              key={rt.id}
              type="button"
              onClick={() => onChange(rt.id)}
              aria-pressed={selected}
              className={`text-left rounded-lg p-4 sm:p-5 border-2 transition-colors flex items-start gap-4 ${
                selected
                  ? 'border-action bg-action-soft'
                  : 'border-border-subtle bg-bg-surface hover:bg-bg-hover'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 ${
                  selected ? 'bg-action text-white' : 'bg-bg-hover text-text-tertiary'
                }`}
              >
                <Icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-text-primary">
                    {t(rt.labelKey)}
                  </span>
                  <StatusPill variant="info">{t(rt.badgeKey)}</StatusPill>
                  <span className="text-xs text-text-tertiary ml-auto whitespace-nowrap">
                    {t('registration.selector.steps', { count: rt.steps })}
                  </span>
                </div>
                <div className="text-xs text-text-tertiary mb-2">{t(rt.subKey)}</div>
                <div className="text-xs text-text-secondary leading-relaxed">
                  {t(rt.detailKey)}
                </div>
              </div>
              {selected && (
                <CheckCircle2
                  size={20}
                  className="text-teal shrink-0"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
      {selectedMeta && (
        <div className="bg-info-soft border-l-2 border-info rounded px-3 py-2 mb-6 text-xs text-text-secondary">
          <strong className="text-info">{t(selectedMeta.shortKey)}</strong>{' '}
          — {t(selectedMeta.detailKey)}
        </div>
      )}
      <div className="flex justify-end">
        <Button
          variant="outline"
          disabled={value === null}
          onClick={onContinue}
        >
          {t('registration.selector.continue')}
        </Button>
      </div>
    </div>
  );
};

interface FormState {
  // Step 1 Company Info
  legalName: string;
  npwp: string;
  nib: string;
  country: string;
  province: string;
  city: string;
  address: string;
  website: string;

  // Step 2 Contacts
  contacts: Contact[];

  // Step 3 Categories & Channel
  selCats: string[];
  channel: string;

  // Step 4 Docs & Bank
  docs: Record<string, DocState>;
  bankName: string;
  accountNumber: string;
  accountHolder: string;

  // Internal SR
  //
  // ⚠️ **`s4Vendor` IS GONE, AND IT IS THE ONE FIELD OPTION C DELETES RATHER
  // THAN KEEPS.** The wizard keeps collecting everything else, because
  // collecting is what a walkthrough of the applicant experience is FOR. This
  // field was different in kind: its label and placeholder taught a format
  // (`e.g. 1000456`) for an identifier space that holds ZERO rows anywhere in
  // this tree — so it was not showing what registration asks for, it was
  // asserting the existence of a register. The vendor is now RESOLVED against
  // the roster on the buyer door (`BuyerSupplierApplications`), where a real
  // roster exists to resolve against.
  expansionReason: string;

  // Step 5 Agreements
  agreed1: boolean;
  agreed2: boolean;
}

const emptyForm = (): FormState => ({
  legalName: '',
  npwp: '',
  nib: '',
  country: 'Indonesia',
  province: '',
  city: '',
  address: '',
  website: '',
  contacts: [emptyContact()],
  selCats: [],
  channel: 'WhatsApp',
  docs: {
    npwp: emptyDoc(),
    nib: emptyDoc(),
    halal: emptyDoc(),
    iso: emptyDoc(),
  },
  bankName: '',
  accountNumber: '',
  accountHolder: '',
  expansionReason: '',
  agreed1: false,
  agreed2: false,
});

const isEmail = (s: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

interface StepProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Record<string, string>;
}

const CompanyInfoStep: React.FC<StepProps> = ({ form, setForm, errors }) => {
  const { t } = useTranslation();
  return (
    <FormSection
      eyebrow={t('registration.step.company.eyebrow')}
      title={t('registration.step.company.title')}
      description={t('registration.step.company.description')}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Field label={t('registration.step.company.field.legalName.label')} required error={errors.legalName}>
            <input
              className={inputClass}
              value={form.legalName}
              onChange={(e) =>
                setForm((f) => ({ ...f, legalName: e.target.value }))
              }
              placeholder={t('registration.step.company.field.legalName.placeholder')}
            />
          </Field>
        </div>
        <Field label={t('registration.step.company.field.npwp.label')} required error={errors.npwp}>
          <input
            className={inputClass}
            value={form.npwp}
            onChange={(e) => setForm((f) => ({ ...f, npwp: e.target.value }))}
            placeholder="00.000.000.0-000.000"
          />
        </Field>
        <Field label={t('registration.step.company.field.nib.label')}>
          <input
            className={inputClass}
            value={form.nib}
            onChange={(e) => setForm((f) => ({ ...f, nib: e.target.value }))}
            placeholder="1234567890123"
          />
        </Field>
        <Field label={t('registration.step.company.field.country.label')} required>
          <select
            className={inputClass}
            value={form.country}
            onChange={(e) =>
              setForm((f) => ({ ...f, country: e.target.value, province: '' }))
            }
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c === 'Other' ? t('registration.option.other') : c}
              </option>
            ))}
          </select>
        </Field>
        {form.country === 'Indonesia' && (
          <Field label={t('registration.step.company.field.province.label')} required error={errors.province}>
            <select
              className={inputClass}
              value={form.province}
              onChange={(e) =>
                setForm((f) => ({ ...f, province: e.target.value }))
              }
            >
              <option value="">{t('registration.step.company.field.province.placeholder')}</option>
              {INDONESIAN_PROVINCES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label={t('registration.step.company.field.city.label')} required error={errors.city}>
          <input
            className={inputClass}
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            placeholder={t('registration.step.company.field.city.placeholder')}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label={t('registration.step.company.field.address.label')} required error={errors.address}>
            <textarea
              className={`${inputClass} min-h-[80px] resize-y`}
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
              placeholder={t('registration.step.company.field.address.placeholder')}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label={t('registration.step.company.field.website.label')}>
            <input
              className={inputClass}
              value={form.website}
              onChange={(e) =>
                setForm((f) => ({ ...f, website: e.target.value }))
              }
              placeholder="https://www.example.com"
            />
          </Field>
        </div>
      </div>
    </FormSection>
  );
};

const ContactsStep: React.FC<StepProps> = ({ form, setForm, errors }) => {
  const { t } = useTranslation();
  const updateContact = (i: number, field: keyof Contact, val: string) =>
    setForm((f) => ({
      ...f,
      contacts: f.contacts.map((c, idx) =>
        idx === i ? { ...c, [field]: val } : c,
      ),
    }));
  const addContact = () =>
    setForm((f) =>
      f.contacts.length < 3
        ? { ...f, contacts: [...f.contacts, emptyContact()] }
        : f,
    );
  const removeContact = (i: number) =>
    setForm((f) =>
      f.contacts.length > 1
        ? { ...f, contacts: f.contacts.filter((_, idx) => idx !== i) }
        : f,
    );

  return (
    <FormSection
      eyebrow={t('registration.step.contacts.eyebrow')}
      title={t('registration.step.contacts.title')}
      description={t('registration.step.contacts.description')}
    >
      <div className="flex flex-col gap-4">
        {form.contacts.map((c, i) => (
          <div
            key={i}
            className="bg-bg-hover border border-border-subtle rounded-md p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-text-primary">
                {t('registration.contacts.label', { index: i + 1 })}
              </span>
              {form.contacts.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeContact(i)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-danger hover:underline"
                >
                  <X size={12} />
                  {t('registration.contacts.remove')}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label={t('registration.step.contacts.field.name.label')}
                required
                error={errors[`c${i}name`]}
              >
                <input
                  className={inputClass}
                  value={c.name}
                  onChange={(e) => updateContact(i, 'name', e.target.value)}
                  placeholder={t('registration.step.contacts.field.name.placeholder')}
                />
              </Field>
              <Field label={t('registration.step.contacts.field.role.label')}>
                <select
                  className={inputClass}
                  value={c.role}
                  onChange={(e) => updateContact(i, 'role', e.target.value)}
                >
                  {CONTACT_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {t(r.key)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label={t('registration.step.contacts.field.email.label')}
                required
                error={errors[`c${i}email`]}
              >
                <input
                  className={inputClass}
                  value={c.email}
                  onChange={(e) => updateContact(i, 'email', e.target.value)}
                  placeholder="jane@example.com"
                />
              </Field>
              <Field
                label={t('registration.step.contacts.field.whatsapp.label')}
                required
                error={errors[`c${i}whatsapp`]}
              >
                <input
                  className={inputClass}
                  value={c.whatsapp}
                  onChange={(e) =>
                    updateContact(i, 'whatsapp', e.target.value)
                  }
                  placeholder="+62 812 3456 7890"
                />
              </Field>
              <div className="md:col-span-2">
                <Field label={t('registration.step.contacts.field.phone.label')}>
                  <input
                    className={inputClass}
                    value={c.phone}
                    onChange={(e) =>
                      updateContact(i, 'phone', e.target.value)
                    }
                    placeholder="+62 21 1234 5678"
                  />
                </Field>
              </div>
            </div>
          </div>
        ))}
      </div>
      {form.contacts.length < 3 && (
        <button
          type="button"
          onClick={addContact}
          className="mt-3 w-full border-2 border-dashed border-teal/40 text-teal font-semibold py-2 rounded-md hover:bg-teal-soft text-sm inline-flex items-center justify-center gap-2"
        >
          <Plus size={14} />
          {t('registration.contacts.add')}
        </button>
      )}
    </FormSection>
  );
};

const CategoriesStep: React.FC<StepProps & { catError: string }> = ({
  form,
  setForm,
  catError,
}) => {
  const { t } = useTranslation();
  const toggleCat = (cat: string) =>
    setForm((f) => ({
      ...f,
      selCats: f.selCats.includes(cat)
        ? f.selCats.filter((c) => c !== cat)
        : [...f.selCats, cat],
    }));

  return (
    <div className="flex flex-col gap-5">
      <FormSection
        eyebrow={t('registration.step.categories.eyebrow')}
        title={t('registration.step.categories.title')}
        description={t('registration.step.categories.description')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {SUPPLY_CATEGORIES.map((cat) => {
            const checked = form.selCats.includes(cat.value);
            return (
              <label
                key={cat.value}
                className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer border-2 text-sm transition-colors ${
                  checked
                    ? 'border-action bg-action-soft text-text-primary font-semibold'
                    : 'border-border-subtle bg-bg-surface text-text-secondary hover:bg-bg-hover'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCat(cat.value)}
                  className="accent-action"
                />
                {t(cat.key)}
              </label>
            );
          })}
        </div>
        {catError && <div className={`${errorClass} mt-2`}>{catError}</div>}
      </FormSection>

      <FormSection
        eyebrow={t('registration.step.channel.eyebrow')}
        title={t('registration.step.channel.title')}
        description={t('registration.step.channel.description')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CHANNELS.map((ch) => {
            const active = form.channel === ch.value;
            const Icon = ch.Icon;
            return (
              <label
                key={ch.value}
                className={`flex items-center gap-3 px-4 py-3 rounded-md cursor-pointer border-2 transition-colors ${
                  active
                    ? 'border-action bg-action-soft'
                    : 'border-border-subtle bg-bg-surface hover:bg-bg-hover'
                }`}
              >
                <input
                  type="radio"
                  name="channel"
                  checked={active}
                  onChange={() => setForm((f) => ({ ...f, channel: ch.value }))}
                  className="accent-action"
                />
                <Icon
                  size={18}
                  className={active ? 'text-action' : 'text-text-tertiary'}
                />
                <div className="min-w-0">
                  <div
                    className={`text-sm font-bold ${active ? 'text-action' : 'text-text-primary'}`}
                  >
                    {t(ch.labelKey)}
                  </div>
                  <div className="text-xs text-text-tertiary">{t(ch.descKey)}</div>
                </div>
              </label>
            );
          })}
        </div>
      </FormSection>
    </div>
  );
};

const DocumentsAndBankStep: React.FC<StepProps> = ({ form, setForm, errors }) => {
  const { t } = useTranslation();
  const setDoc = (key: string, patch: Partial<DocState>) =>
    setForm((f) => ({
      ...f,
      docs: { ...f.docs, [key]: { ...f.docs[key], ...patch } },
    }));

  return (
    <div className="flex flex-col gap-5">
      <FormSection
        eyebrow={t('registration.step.documents.eyebrow')}
        title={t('registration.step.documents.title')}
        description={t('registration.step.documents.description')}
      >
        <div className="flex flex-col gap-3">
          {DOCUMENTS.map((doc) => {
            const d = form.docs[doc.key];
            return (
              <div
                key={doc.key}
                className="flex flex-col md:flex-row md:items-center gap-3 px-4 py-3 bg-bg-hover border border-border-subtle rounded-md"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text-primary">
                    {t(doc.labelKey)}
                  </div>
                  {d.uploaded && (
                    <div className="text-xs text-text-tertiary mt-0.5 truncate">
                      ↑ {d.fileName}
                    </div>
                  )}
                </div>
                {doc.hasExpiry && d.uploaded && (
                  <div>
                    <label className="block text-[10px] text-text-tertiary uppercase mb-0.5">
                      {t('registration.documents.expiry')}
                    </label>
                    <input
                      type="date"
                      className={`${inputClass} text-xs`}
                      style={{ width: 140 }}
                      value={d.expiry}
                      onChange={(e) =>
                        setDoc(doc.key, { expiry: e.target.value })
                      }
                    />
                  </div>
                )}
                <label
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md font-semibold text-xs cursor-pointer whitespace-nowrap ${
                    d.uploaded
                      ? 'bg-success-soft text-success'
                      : 'bg-action text-white hover:bg-action-hover'
                  }`}
                >
                  {d.uploaded ? (
                    <>
                      <CheckCircle2 size={12} />
                      {t('registration.documents.uploaded')}
                    </>
                  ) : (
                    <>
                      <Upload size={12} />
                      {t('registration.documents.upload')}
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) =>
                      setDoc(doc.key, {
                        uploaded: !!e.target.files?.[0],
                        fileName: e.target.files?.[0]?.name ?? '',
                      })
                    }
                  />
                </label>
              </div>
            );
          })}
        </div>
      </FormSection>

      <FormSection
        eyebrow={t('registration.step.bank.eyebrow')}
        title={t('registration.step.bank.title')}
        description={t('registration.step.bank.description')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={t('registration.step.bank.field.bankName.label')} required error={errors.bankName}>
            <select
              className={inputClass}
              value={form.bankName}
              onChange={(e) =>
                setForm((f) => ({ ...f, bankName: e.target.value }))
              }
            >
              <option value="">{t('registration.step.bank.field.bankName.placeholder')}</option>
              {BANKS.map((b) => (
                <option key={b} value={b}>
                  {b === 'Other' ? t('registration.option.other') : b}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={t('registration.step.bank.field.accountNumber.label')}
            required
            error={errors.accountNumber}
          >
            <input
              className={inputClass}
              value={form.accountNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, accountNumber: e.target.value }))
              }
              placeholder="1234567890"
            />
          </Field>
          <div className="md:col-span-2">
            <Field
              label={t('registration.step.bank.field.accountHolder.label')}
              required
              error={errors.accountHolder}
            >
              <input
                className={inputClass}
                value={form.accountHolder}
                onChange={(e) =>
                  setForm((f) => ({ ...f, accountHolder: e.target.value }))
                }
                placeholder={t('registration.step.bank.field.accountHolder.placeholder')}
              />
            </Field>
          </div>
        </div>
      </FormSection>
    </div>
  );
};

const KOLBankStep: React.FC<StepProps> = ({ form, setForm, errors }) => {
  const { t } = useTranslation();
  return (
    <FormSection
      eyebrow={t('registration.step.bank.eyebrow')}
      title={t('registration.step.kolBank.title')}
      description={t('registration.step.kolBank.description')}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label={t('registration.step.bank.field.bankName.label')} required error={errors.bankName}>
          <select
            className={inputClass}
            value={form.bankName}
            onChange={(e) =>
              setForm((f) => ({ ...f, bankName: e.target.value }))
            }
          >
            <option value="">{t('registration.step.bank.field.bankName.placeholder')}</option>
            {BANKS.map((b) => (
              <option key={b} value={b}>
                {b === 'Other' ? t('registration.option.other') : b}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('registration.step.bank.field.accountNumber.label')} required error={errors.accountNumber}>
          <input
            className={inputClass}
            value={form.accountNumber}
            onChange={(e) =>
              setForm((f) => ({ ...f, accountNumber: e.target.value }))
            }
            placeholder={t('registration.step.kolBank.field.accountNumber.placeholder')}
          />
        </Field>
        <div className="md:col-span-2">
          <Field
            label={t('registration.step.bank.field.accountHolder.label')}
            required
            error={errors.accountHolder}
          >
            <input
              className={inputClass}
              value={form.accountHolder}
              onChange={(e) =>
                setForm((f) => ({ ...f, accountHolder: e.target.value }))
              }
              placeholder={t('registration.step.kolBank.field.accountHolder.placeholder')}
            />
          </Field>
        </div>
      </div>
      <div className="bg-warning-soft border-l-2 border-warning rounded px-3 py-2 mt-3 text-xs text-warning-hover">
        <strong>{t('registration.kolBank.noticeLabel')}</strong>{' '}
        {t('registration.kolBank.noticeText')}
      </div>
    </FormSection>
  );
};

const InternalSRCategoryStep: React.FC<StepProps & { catError: string }> = ({
  form,
  setForm,
  catError,
}) => {
  const { t } = useTranslation();
  return (
    <FormSection
      eyebrow={t('registration.step.expansion.eyebrow')}
      title={t('registration.step.expansion.title')}
      description={t('registration.step.expansion.description')}
    >
      <div className="mb-4">
        <label className={labelClass}>
          {t('registration.step.expansion.field.categories.label')}
          <span className="text-danger ml-0.5">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {SUPPLY_CATEGORIES.map((cat) => (
            <label
              key={cat.value}
              className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer border-2 text-sm transition-colors ${
                form.selCats.includes(cat.value)
                  ? 'border-action bg-action-soft text-text-primary font-semibold'
                  : 'border-border-subtle bg-bg-surface text-text-secondary hover:bg-bg-hover'
              }`}
            >
              <input
                type="checkbox"
                checked={form.selCats.includes(cat.value)}
                onChange={() =>
                  setForm((f) => ({
                    ...f,
                    selCats: f.selCats.includes(cat.value)
                      ? f.selCats.filter((c) => c !== cat.value)
                      : [...f.selCats, cat.value],
                  }))
                }
                className="accent-teal"
              />
              {t(cat.key)}
            </label>
          ))}
        </div>
        {catError && <div className={`${errorClass} mt-2`}>{catError}</div>}
      </div>
      <Field label={t('registration.step.expansion.field.reason.label')}>
        <textarea
          className={`${inputClass} min-h-[80px] resize-y`}
          value={form.expansionReason}
          onChange={(e) =>
            setForm((f) => ({ ...f, expansionReason: e.target.value }))
          }
          placeholder={t('registration.step.expansion.field.reason.placeholder')}
        />
      </Field>
    </FormSection>
  );
};

interface ReviewStepProps extends StepProps {
  requestType: RequestType;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ form, setForm, errors, requestType }) => {
  const { t } = useTranslation();
  const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex flex-col sm:flex-row gap-1 sm:gap-3 py-1.5 border-b border-border-subtle last:border-b-0">
      <span className="sm:w-44 shrink-0 text-xs text-text-tertiary font-medium">
        {label}
      </span>
      <span className="text-sm text-text-primary font-medium break-words">
        {value || '—'}
      </span>
    </div>
  );
  const isExternal = requestType === 'External SR';
  const isInternal = requestType === 'Internal SR';
  const categoriesValue = form.selCats.map((v) => t(catKey(v))).join(', ') || '—';

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 text-sm text-warning-hover">
        {t('registration.review.notice')}
      </div>

      {isExternal && (
        <>
          <FormSection
            eyebrow={t('registration.review.stepEyebrow', { number: 1 })}
            title={t('registration.step.company.title')}
          >
            <Row label={t('registration.review.field.legalName')} value={form.legalName} />
            <Row label={t('registration.review.field.npwp')} value={form.npwp} />
            <Row label={t('registration.review.field.nib')} value={form.nib} />
            <Row label={t('registration.review.field.country')} value={form.country} />
            {form.country === 'Indonesia' && (
              <Row label={t('registration.review.field.province')} value={form.province} />
            )}
            <Row label={t('registration.review.field.city')} value={form.city} />
            <Row label={t('registration.review.field.address')} value={form.address} />
            <Row label={t('registration.review.field.website')} value={form.website} />
          </FormSection>

          <FormSection
            eyebrow={t('registration.review.stepEyebrow', { number: 2 })}
            title={t('registration.step.contacts.title')}
          >
            {form.contacts.map((c, i) => (
              <div key={i} className="mb-3 last:mb-0">
                <div className="text-xs font-bold text-teal mb-1">
                  {t('registration.contacts.label', { index: i + 1 })}
                </div>
                <Row label={t('registration.review.field.name')} value={c.name} />
                <Row label={t('registration.review.field.role')} value={t(roleKey(c.role))} />
                <Row label={t('registration.review.field.email')} value={c.email} />
                <Row label={t('registration.review.field.whatsapp')} value={c.whatsapp} />
                {c.phone && <Row label={t('registration.review.field.phone')} value={c.phone} />}
              </div>
            ))}
          </FormSection>

          <FormSection
            eyebrow={t('registration.review.stepEyebrow', { number: 3 })}
            title={t('registration.title.categoriesChannel')}
          >
            <Row
              label={t('registration.review.field.supplyCategories')}
              value={categoriesValue}
            />
            <Row
              label={t('registration.review.field.channel')}
              value={t(channelLabelKey(form.channel))}
            />
          </FormSection>

          <FormSection
            eyebrow={t('registration.review.stepEyebrow', { number: 4 })}
            title={t('registration.title.documentsBank')}
          >
            {DOCUMENTS.map((doc) => {
              const d = form.docs[doc.key];
              return (
                <Row
                  key={doc.key}
                  label={t(doc.labelKey)}
                  value={
                    d.uploaded
                      ? `${d.fileName}${d.expiry ? ` (${t('registration.review.expires', { date: d.expiry })})` : ''}`
                      : t('registration.review.notUploaded')
                  }
                />
              );
            })}
            <Row label={t('registration.review.field.bank')} value={form.bankName} />
            <Row label={t('registration.review.field.accountNumber')} value={form.accountNumber} />
            <Row label={t('registration.review.field.accountHolder')} value={form.accountHolder} />
          </FormSection>
        </>
      )}

      {isInternal && (
        <>
          <FormSection
            eyebrow={t('registration.review.stepEyebrow', { number: 1 })}
            title={t('registration.step.expansion.title')}
          >
            <Row
              label={t('registration.review.field.additionalCategories')}
              value={categoriesValue}
            />
            <Row label={t('registration.review.field.reason')} value={form.expansionReason} />
          </FormSection>
          <FormSection
            eyebrow={t('registration.review.stepEyebrow', { number: 2 })}
            title={t('registration.title.additionalContacts')}
          >
            {form.contacts.map((c, i) => (
              <div key={i} className="mb-3 last:mb-0">
                <div className="text-xs font-bold text-teal mb-1">
                  {t('registration.contacts.label', { index: i + 1 })}
                </div>
                <Row label={t('registration.review.field.name')} value={c.name} />
                <Row label={t('registration.review.field.role')} value={t(roleKey(c.role))} />
                <Row label={t('registration.review.field.email')} value={c.email} />
                <Row label={t('registration.review.field.whatsapp')} value={c.whatsapp} />
              </div>
            ))}
          </FormSection>
        </>
      )}

      <FormSection
        eyebrow={t('registration.review.agreements.eyebrow')}
        title={t('registration.review.agreements.title')}
      >
        <label className="flex items-start gap-3 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={form.agreed1}
            onChange={(e) =>
              setForm((f) => ({ ...f, agreed1: e.target.checked }))
            }
            className="mt-1 accent-teal"
          />
          <span className="text-sm text-text-secondary">
            <Trans
              i18nKey="registration.review.agreement1.text"
              components={{
                coc: <span className="text-teal underline cursor-pointer" />,
                terms: <span className="text-teal underline cursor-pointer" />,
              }}
            />
          </span>
        </label>
        {errors.agreed1 && <div className={errorClass}>{errors.agreed1}</div>}
        <label className="flex items-start gap-3 cursor-pointer mt-2">
          <input
            type="checkbox"
            checked={form.agreed2}
            onChange={(e) =>
              setForm((f) => ({ ...f, agreed2: e.target.checked }))
            }
            className="mt-1 accent-teal"
          />
          <span className="text-sm text-text-secondary">
            {t('registration.review.agreement2')}
          </span>
        </label>
        {errors.agreed2 && <div className={errorClass}>{errors.agreed2}</div>}
      </FormSection>
    </div>
  );
};

/**
 * ⚠️ **THE END OF THE WALKTHROUGH. ONE TRUE SENTENCE, WHERE THERE WERE SEVEN
 * CLAIMS AND ONE OF THEM WAS TRUE.**
 *
 * What stood here, measured: a green success tick; the heading *Registration
 * submitted*; the subtitle *received and is under review*; a fabricated
 * `APP-2026-{random}` under the label "Application number"; then a numbered
 * list whose FIRST item said *"your application has not been submitted to
 * anyone, and no review will take place"* — and whose items 2, 3 and 4
 * promised an email with the outcome, onboarding credentials on approval, and
 * a support address to contact *quoting your application number*.
 *
 * The one honest line was buried at position 1 of a list, under a green tick,
 * beside a document number that named nothing. Everything except that line is
 * deleted; that line is now the heading, reworded to say what the page IS
 * rather than what it did not do.
 *
 * ⚠️ **AND THERE IS NO PERSONA GUARD, DELIBERATELY.** `NoSupplierIdentity` is
 * this tree's refusal precedent and its principle transfers — refuse in full,
 * name the arm, never suggest an act that changes nothing. Its SHAPE does not:
 * a refusal must name the party it refuses, and there is no applicant here to
 * name. `middleware.js` matches `'/(.*)'`, so every visitor to `/register`
 * already holds Paragon's shared credential; the page has always been a
 * walkthrough shown to credentialed visitors. It now says so instead of
 * refusing somebody who does not exist.
 *
 * ⚠️ **THE RESTART IS NOT DECORATION.** Deleting the copy left the last step of
 * a five-step wizard with nothing after it — a dead end, which is the shape
 * this batch exists to remove, not to relocate. `Start again` is the only act
 * this page can honestly perform, and it performs it: it resets the wizard.
 */
interface SuccessScreenProps {
  onRestart: () => void;
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({ onRestart }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-md p-6 sm:p-10 text-center">
      {/* Neutral, not a success tick. A green check IS a claim — it says the
          thing you did worked — and nothing here was submitted. */}
      <div className="inline-flex w-14 h-14 rounded-full bg-bg-hover border border-border-subtle items-center justify-center mb-4">
        <Info size={32} className="text-text-tertiary" />
      </div>
      <h1 className="text-title text-text-primary mb-3 max-w-xl mx-auto">
        {t('registration.success.headline')}
      </h1>
      <p className="text-sm text-text-secondary mb-8 max-w-xl mx-auto">
        {t('registration.success.body')}
      </p>
      <Button variant="secondary" onClick={onRestart}>
        {t('registration.success.restart')}
      </Button>
    </div>
  );
};

const validateStep1 = (form: FormState, t: TFunction): Record<string, string> => {
  const e: Record<string, string> = {};
  if (!form.legalName.trim()) e.legalName = t('registration.validation.legalName.required');
  if (!form.npwp.trim()) e.npwp = t('registration.validation.npwp.required');
  if (!form.city.trim()) e.city = t('registration.validation.city.required');
  if (!form.address.trim()) e.address = t('registration.validation.address.required');
  if (form.country === 'Indonesia' && !form.province)
    e.province = t('registration.validation.province.required');
  return e;
};

const validateStep2 = (form: FormState, t: TFunction): Record<string, string> => {
  const e: Record<string, string> = {};
  form.contacts.forEach((c, i) => {
    if (!c.name.trim()) e[`c${i}name`] = t('registration.validation.name.required');
    if (!c.email.trim()) e[`c${i}email`] = t('registration.validation.email.required');
    else if (!isEmail(c.email)) e[`c${i}email`] = t('registration.validation.email.invalid');
    if (!c.whatsapp.trim()) e[`c${i}whatsapp`] = t('registration.validation.whatsapp.required');
  });
  return e;
};

const validateBankStep = (form: FormState, t: TFunction): Record<string, string> => {
  const e: Record<string, string> = {};
  if (!form.bankName) e.bankName = t('registration.validation.bankName.required');
  if (!form.accountNumber.trim()) e.accountNumber = t('registration.validation.accountNumber.required');
  if (!form.accountHolder.trim())
    e.accountHolder = t('registration.validation.accountHolder.required');
  return e;
};

const validateAgreements = (form: FormState, t: TFunction): Record<string, string> => {
  const e: Record<string, string> = {};
  if (!form.agreed1) e.agreed1 = t('registration.validation.agreed1.required');
  if (!form.agreed2)
    e.agreed2 = t('registration.validation.agreed2.required');
  return e;
};

const SupplierRegistrationV2: React.FC = () => {
  const { t } = useTranslation();
  // Two-stage selection: pendingRequestType is what the card click sets (drives info banner);
  // confirmedRequestType is what Continue commits (drives wizard mount).
  const [pendingRequestType, setPendingRequestType] =
    useState<RequestType | null>(null);
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [catError, setCatError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  // ⚠️ **THE MINT IS DELETED.** It read
  // `String(10000 + Math.floor(Math.random() * 90000))` and was rendered as
  // `APP-2026-{n}` to an external party, beside four next-steps promising an
  // email and onboarding credentials. Nothing anywhere held that number. A
  // `ProvenanceMarker` cannot un-tell a forged document number, and this one
  // faced OUTWARD. Real application numbers are minted by
  // `supplierApplicationStore` and named on the row they belong to.

  const resetWizardState = () => {
    setCurrentStep(0);
    setForm(emptyForm());
    setErrors({});
    setCatError('');
  };

  const handleSelectRequestType = (type: RequestType) => {
    setPendingRequestType(type);
  };

  const handleContinueFromTypeSelector = () => {
    if (!pendingRequestType) return;
    resetWizardState();
    setRequestType(pendingRequestType);
  };

  const changeRequestType = () => {
    setRequestType(null);
    setPendingRequestType(null);
    resetWizardState();
  };

  // Per-step validity gate for Wizard
  const isStepValid = (step: number): boolean => {
    if (!requestType) return false;
    if (requestType === 'External SR') {
      if (step === 0) return Object.keys(validateStep1(form, t)).length === 0;
      if (step === 1) return Object.keys(validateStep2(form, t)).length === 0;
      if (step === 2) return form.selCats.length > 0;
      if (step === 3) return Object.keys(validateBankStep(form, t)).length === 0;
      if (step === 4) return Object.keys(validateAgreements(form, t)).length === 0;
    }
    if (requestType === 'Internal SR') {
      if (step === 0) return form.selCats.length > 0;
      if (step === 1) return Object.keys(validateStep2(form, t)).length === 0;
      if (step === 2) return Object.keys(validateAgreements(form, t)).length === 0;
    }
    if (requestType === 'KOL') {
      if (step === 0) return Object.keys(validateStep1(form, t)).length === 0;
      if (step === 1) return Object.keys(validateBankStep(form, t)).length === 0;
    }
    return true;
  };

  const handleStepChange = (next: number) => {
    // Compute errors when moving forward
    if (next > currentStep && requestType) {
      let stepErrors: Record<string, string> = {};
      let ce = '';
      if (requestType === 'External SR') {
        if (currentStep === 0) stepErrors = validateStep1(form, t);
        else if (currentStep === 1) stepErrors = validateStep2(form, t);
        else if (currentStep === 2 && form.selCats.length === 0)
          ce = t('registration.validation.category.required');
        else if (currentStep === 3) stepErrors = validateBankStep(form, t);
      } else if (requestType === 'Internal SR') {
        if (currentStep === 0) {
          if (form.selCats.length === 0)
            ce = t('registration.validation.category.required');
        } else if (currentStep === 1) stepErrors = validateStep2(form, t);
      } else if (requestType === 'KOL') {
        if (currentStep === 0) stepErrors = validateStep1(form, t);
      }
      setErrors(stepErrors);
      setCatError(ce);
      if (Object.keys(stepErrors).length > 0 || ce) return;
    } else {
      setErrors({});
      setCatError('');
    }
    setCurrentStep(next);
  };

  const handleComplete = () => {
    if (!requestType) return;
    const finalErrors = validateAgreements(form, t);
    setErrors(finalErrors);
    if (Object.keys(finalErrors).length > 0) return;
    setSubmitted(true);
  };

  const wizardSteps: WizardStep[] = useMemo(() => {
    if (!requestType) return [];
    if (requestType === 'External SR') {
      return [
        {
          id: 'company',
          title: t('registration.step.company.title'),
          shortTitle: t('registration.step.company.short'),
          content: (
            <CompanyInfoStep form={form} setForm={setForm} errors={errors} />
          ),
        },
        {
          id: 'contacts',
          title: t('registration.step.contacts.title'),
          shortTitle: t('registration.step.contacts.short'),
          content: (
            <ContactsStep form={form} setForm={setForm} errors={errors} />
          ),
        },
        {
          id: 'categories',
          title: t('registration.title.categoriesChannel'),
          shortTitle: t('registration.step.categories.short'),
          content: (
            <CategoriesStep
              form={form}
              setForm={setForm}
              errors={errors}
              catError={catError}
            />
          ),
        },
        {
          id: 'docs',
          title: t('registration.title.documentsBank'),
          shortTitle: t('registration.step.documents.short'),
          content: (
            <DocumentsAndBankStep
              form={form}
              setForm={setForm}
              errors={errors}
            />
          ),
        },
        {
          id: 'review',
          title: t('registration.step.review.title'),
          shortTitle: t('registration.step.review.short'),
          content: (
            <ReviewStep
              form={form}
              setForm={setForm}
              errors={errors}
              requestType={requestType}
            />
          ),
        },
      ];
    }
    if (requestType === 'Internal SR') {
      return [
        {
          id: 'expansion',
          title: t('registration.step.expansion.title'),
          shortTitle: t('registration.step.expansion.short'),
          content: (
            <InternalSRCategoryStep
              form={form}
              setForm={setForm}
              errors={errors}
              catError={catError}
            />
          ),
        },
        {
          id: 'contacts',
          title: t('registration.title.additionalContacts'),
          shortTitle: t('registration.step.contacts.short'),
          content: (
            <ContactsStep form={form} setForm={setForm} errors={errors} />
          ),
        },
        {
          id: 'review',
          title: t('registration.step.review.title'),
          shortTitle: t('registration.step.review.short'),
          content: (
            <ReviewStep
              form={form}
              setForm={setForm}
              errors={errors}
              requestType={requestType}
            />
          ),
        },
      ];
    }
    // KOL
    return [
      {
        id: 'company',
        title: t('registration.step.company.title'),
        shortTitle: t('registration.step.company.short'),
        content: (
          <CompanyInfoStep form={form} setForm={setForm} errors={errors} />
        ),
      },
      {
        id: 'bank',
        title: t('registration.step.kolBank.title'),
        shortTitle: t('registration.step.kolBank.short'),
        content: <KOLBankStep form={form} setForm={setForm} errors={errors} />,
      },
    ];
  }, [requestType, form, errors, catError, t]);

  const activeMeta = REQUEST_TYPES.find((r) => r.id === requestType);

  return (
    <div className="min-h-screen flex flex-col bg-bg-page">
      <PageHeader />
      <main className="flex-1 px-4 py-6 sm:py-10">
        <div className="max-w-3xl mx-auto">
          {/* D-CENSUS-8 — /register carried no marker at all while promising a review
              nothing performs. `supplierRegistration` is null-backed: the wizard
              validates and formats a submission, then discards it — no application is
              persisted, routed, or queued for anyone. The 3–5 business-day review
              promise is retracted in this batch; this marks the surface itself. */}
          <div className="mb-4">
            <ProvenanceMarker capability="supplierRegistration" />
          </div>
          {submitted ? (
            <SuccessScreen
              onRestart={() => {
                setSubmitted(false);
                setRequestType(null);
                setPendingRequestType(null);
                resetWizardState();
              }}
            />
          ) : requestType === null ? (
            <RequestTypeSelector
              value={pendingRequestType}
              onChange={handleSelectRequestType}
              onContinue={handleContinueFromTypeSelector}
            />
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={changeRequestType}
                  className="inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary"
                >
                  <ChevronLeft size={14} />
                  {t('registration.changeType')}
                </button>
                <div className="bg-info-soft border-l-2 border-info rounded px-3 py-1.5 text-xs text-info">
                  <strong>{activeMeta ? t(activeMeta.shortKey) : ''}</strong> ·{' '}
                  {activeMeta ? t(activeMeta.subKey) : ''}
                </div>
              </div>
              <Wizard
                key={requestType}
                steps={wizardSteps}
                currentStep={currentStep}
                onStepChange={handleStepChange}
                onCancel={changeRequestType}
                onComplete={handleComplete}
                isStepValid={isStepValid}
                completeLabel={t('registration.submit')}
              />
            </div>
          )}
        </div>
      </main>
      <PageFooter />
    </div>
  );
};

export default SupplierRegistrationV2;
