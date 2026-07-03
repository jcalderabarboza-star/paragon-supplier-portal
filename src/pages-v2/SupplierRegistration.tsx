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
  MessageCircle,
  Globe,
  Send,
  Radio,
  LucideIcon,
} from 'lucide-react';
import Wizard, { WizardStep } from '../components/ui-v2/Wizard';
import FormSection from '../components/ui-v2/FormSection';
import StatusPill from '../components/ui-v2/StatusPill';
import Button from '../components/ui-v2/Button';

type RequestType = 'External SR' | 'Internal SR' | 'KOL';

interface RequestTypeMeta {
  id: RequestType;
  label: string;
  sub: string;
  detail: string;
  Icon: LucideIcon;
  steps: number;
  badge: string;
}

const REQUEST_TYPES: RequestTypeMeta[] = [
  {
    id: 'External SR',
    label: 'External Supplier Request',
    sub: 'New vendor — never worked with Paragon',
    detail:
      'Full 5-step registration: Company Info, Contacts, Categories, Documents, Review. Requires NPWP, NIB, and full qualification. Will be synced to S/4HANA as vendor account group Z002.',
    Icon: Building2,
    steps: 5,
    badge: 'Full process',
  },
  {
    id: 'Internal SR',
    label: 'Internal Supplier Request',
    sub: 'Existing vendor — adding new category or commodity',
    detail:
      'Short 3-step update: Category expansion, additional contacts, supplementary documents. Existing S/4HANA vendor record is updated — no new master data creation.',
    Icon: ClipboardCheck,
    steps: 3,
    badge: 'Short form',
  },
  {
    id: 'KOL',
    label: 'KOL — Key Opinion Leader',
    sub: 'Below Rp 7jT — generic vendor at DC level',
    detail:
      'Minimal 2-step form: basic company info and bank details only. No Ariba registration required. Created directly in S/4HANA as a generic DC-level vendor. Invoice processed via Web Tukar Faktur.',
    Icon: UserPlus,
    steps: 2,
    badge: 'Minimal form',
  },
];

const SUPPLY_CATEGORIES = [
  'Raw Materials',
  'Electronics',
  'Mechanical Components',
  'Packaging',
  'Chemicals',
  'Logistics & Transport',
  'IT Services',
  'MRO Supplies',
  'Food & Beverage',
  'Textiles',
];

const CONTACT_ROLES = [
  'Primary Contact',
  'Finance',
  'Operations',
  'Legal',
  'Technical',
];

interface ChannelOption {
  value: string;
  Icon: LucideIcon;
  label: string;
  desc: string;
}

const CHANNELS: ChannelOption[] = [
  { value: 'WhatsApp', Icon: MessageCircle, label: 'WhatsApp', desc: 'Tier 1 — best for SMEs' },
  { value: 'Web Portal', Icon: Globe, label: 'Web Portal', desc: 'Tier 2 — self-service' },
  { value: 'API', Icon: Send, label: 'API Integration', desc: 'Tier 3 — automated' },
  { value: 'EDI', Icon: Radio, label: 'EDI 846', desc: 'Enterprise data exchange' },
];

const DOCUMENTS = [
  { key: 'npwp', label: 'NPWP Certificate', hasExpiry: false },
  { key: 'nib', label: 'NIB Business License', hasExpiry: true },
  { key: 'halal', label: 'Halal Certificate (if applicable)', hasExpiry: true },
  { key: 'iso', label: 'ISO 9001 Certificate (if applicable)', hasExpiry: true },
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
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-teal placeholder:text-text-tertiary';
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

const PageHeader: React.FC = () => (
  <header className="bg-bg-surface border-b border-border-subtle px-4 sm:px-8 py-4">
    <div className="max-w-3xl mx-auto flex items-center justify-between">
      <div>
        <div className="text-base sm:text-lg font-bold text-navy tracking-widest">
          PARAGONCORP
        </div>
        <div className="text-xs text-text-tertiary mt-0.5">
          Supplier Onboarding
        </div>
      </div>
      <div className="text-right hidden sm:block">
        <div className="text-xs text-text-tertiary">Need help?</div>
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
}> = ({ value, onChange, onContinue }) => (
  <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-md p-6 sm:p-8">
    <h1 className="text-lg sm:text-xl font-bold text-text-primary mb-1">
      Select registration type
    </h1>
    <p className="text-sm text-text-tertiary mb-6">
      Choose the type that matches your supplier situation. This determines
      the form length and S/4HANA integration path.
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
                ? 'border-teal bg-teal-soft'
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
                  {rt.label}
                </span>
                <StatusPill variant="info">{rt.badge}</StatusPill>
                <span className="text-xs text-text-tertiary ml-auto whitespace-nowrap">
                  {rt.steps} steps
                </span>
              </div>
              <div className="text-xs text-text-tertiary mb-2">{rt.sub}</div>
              <div className="text-xs text-text-secondary leading-relaxed">
                {rt.detail}
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
    {value && (
      <div className="bg-info-soft border-l-2 border-info rounded px-3 py-2 mb-6 text-xs text-text-secondary">
        <strong className="text-info">{value}</strong>{' '}
        — {REQUEST_TYPES.find((r) => r.id === value)?.detail}
      </div>
    )}
    <div className="flex justify-end">
      <Button
        variant="primary"
        disabled={value === null}
        onClick={onContinue}
      >
        Continue
      </Button>
    </div>
  </div>
);

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
  s4Vendor: string;
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
  s4Vendor: '',
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

const CompanyInfoStep: React.FC<StepProps> = ({ form, setForm, errors }) => (
  <FormSection
    eyebrow="Company"
    title="Company information"
    description="Legal entity name and registration details."
  >
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <Field label="Legal company name" required error={errors.legalName}>
          <input
            className={inputClass}
            value={form.legalName}
            onChange={(e) =>
              setForm((f) => ({ ...f, legalName: e.target.value }))
            }
            placeholder="PT Maju Bersama Tbk."
          />
        </Field>
      </div>
      <Field label="NPWP number" required error={errors.npwp}>
        <input
          className={inputClass}
          value={form.npwp}
          onChange={(e) => setForm((f) => ({ ...f, npwp: e.target.value }))}
          placeholder="00.000.000.0-000.000"
        />
      </Field>
      <Field label="NIB (Business registration)">
        <input
          className={inputClass}
          value={form.nib}
          onChange={(e) => setForm((f) => ({ ...f, nib: e.target.value }))}
          placeholder="1234567890123"
        />
      </Field>
      <Field label="Country" required>
        <select
          className={inputClass}
          value={form.country}
          onChange={(e) =>
            setForm((f) => ({ ...f, country: e.target.value, province: '' }))
          }
        >
          {COUNTRIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      {form.country === 'Indonesia' && (
        <Field label="Province" required error={errors.province}>
          <select
            className={inputClass}
            value={form.province}
            onChange={(e) =>
              setForm((f) => ({ ...f, province: e.target.value }))
            }
          >
            <option value="">— Select province —</option>
            {INDONESIAN_PROVINCES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
      )}
      <Field label="City" required error={errors.city}>
        <input
          className={inputClass}
          value={form.city}
          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          placeholder="Jakarta"
        />
      </Field>
      <div className="md:col-span-2">
        <Field label="Business address" required error={errors.address}>
          <textarea
            className={`${inputClass} min-h-[80px] resize-y`}
            value={form.address}
            onChange={(e) =>
              setForm((f) => ({ ...f, address: e.target.value }))
            }
            placeholder="Jl. Sudirman No. 123, Gedung A Lt. 5"
          />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Website (optional)">
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

const ContactsStep: React.FC<StepProps> = ({ form, setForm, errors }) => {
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
      eyebrow="Contacts"
      title="Contact persons"
      description="Up to 3 contacts. The primary contact receives all critical notifications."
    >
      <div className="flex flex-col gap-4">
        {form.contacts.map((c, i) => (
          <div
            key={i}
            className="bg-bg-hover border border-border-subtle rounded-md p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-text-primary">
                Contact {i + 1}
              </span>
              {form.contacts.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeContact(i)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-danger hover:underline"
                >
                  <X size={12} />
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Full name"
                required
                error={errors[`c${i}name`]}
              >
                <input
                  className={inputClass}
                  value={c.name}
                  onChange={(e) => updateContact(i, 'name', e.target.value)}
                  placeholder="Jane Smith"
                />
              </Field>
              <Field label="Role">
                <select
                  className={inputClass}
                  value={c.role}
                  onChange={(e) => updateContact(i, 'role', e.target.value)}
                >
                  {CONTACT_ROLES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </Field>
              <Field
                label="Business email"
                required
                error={errors[`c${i}email`]}
              >
                <input
                  className={inputClass}
                  value={c.email}
                  onChange={(e) => updateContact(i, 'email', e.target.value)}
                  placeholder="jane@company.com"
                />
              </Field>
              <Field
                label="WhatsApp number"
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
                <Field label="Phone (optional)">
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
          Add another contact
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
        eyebrow="What you supply"
        title="Supply categories"
        description="Select all categories that apply (at least 1 required)."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {SUPPLY_CATEGORIES.map((cat) => {
            const checked = form.selCats.includes(cat);
            return (
              <label
                key={cat}
                className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer border-2 text-sm transition-colors ${
                  checked
                    ? 'border-teal bg-teal-soft text-text-primary font-semibold'
                    : 'border-border-subtle bg-bg-surface text-text-secondary hover:bg-bg-hover'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCat(cat)}
                  className="accent-teal"
                />
                {cat}
              </label>
            );
          })}
        </div>
        {catError && <div className={`${errorClass} mt-2`}>{catError}</div>}
      </FormSection>

      <FormSection
        eyebrow="How we communicate"
        title="Preferred communication channel"
        description="Paragon will send POs, ASN requests, and other procurement messages via this channel."
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
                    ? 'border-teal bg-teal-soft'
                    : 'border-border-subtle bg-bg-surface hover:bg-bg-hover'
                }`}
              >
                <input
                  type="radio"
                  name="channel"
                  checked={active}
                  onChange={() => setForm((f) => ({ ...f, channel: ch.value }))}
                  className="accent-teal"
                />
                <Icon
                  size={18}
                  className={active ? 'text-teal' : 'text-text-tertiary'}
                />
                <div className="min-w-0">
                  <div
                    className={`text-sm font-bold ${active ? 'text-teal' : 'text-text-primary'}`}
                  >
                    {ch.label}
                  </div>
                  <div className="text-xs text-text-tertiary">{ch.desc}</div>
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
  const setDoc = (key: string, patch: Partial<DocState>) =>
    setForm((f) => ({
      ...f,
      docs: { ...f.docs, [key]: { ...f.docs[key], ...patch } },
    }));

  return (
    <div className="flex flex-col gap-5">
      <FormSection
        eyebrow="Compliance"
        title="Compliance documents"
        description="Upload required certifications. PDF, JPG, PNG accepted."
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
                    {doc.label}
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
                      Expiry
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
                      Uploaded
                    </>
                  ) : (
                    <>
                      <Upload size={12} />
                      Upload
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
        eyebrow="Payment"
        title="Bank account details"
        description="Used by Paragon Finance to settle invoices."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Bank name" required error={errors.bankName}>
            <select
              className={inputClass}
              value={form.bankName}
              onChange={(e) =>
                setForm((f) => ({ ...f, bankName: e.target.value }))
              }
            >
              <option value="">— Select bank —</option>
              {BANKS.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </Field>
          <Field
            label="Account number"
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
              label="Account holder name"
              required
              error={errors.accountHolder}
            >
              <input
                className={inputClass}
                value={form.accountHolder}
                onChange={(e) =>
                  setForm((f) => ({ ...f, accountHolder: e.target.value }))
                }
                placeholder="PT Maju Bersama"
              />
            </Field>
          </div>
        </div>
      </FormSection>
    </div>
  );
};

const KOLBankStep: React.FC<StepProps> = ({ form, setForm, errors }) => (
  <FormSection
    eyebrow="Payment"
    title="Bank details"
    description="KOL invoices are processed via Web Tukar Faktur. No Ariba registration required."
  >
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Bank name" required error={errors.bankName}>
        <select
          className={inputClass}
          value={form.bankName}
          onChange={(e) =>
            setForm((f) => ({ ...f, bankName: e.target.value }))
          }
        >
          <option value="">— Select bank —</option>
          {BANKS.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </Field>
      <Field label="Account number" required error={errors.accountNumber}>
        <input
          className={inputClass}
          value={form.accountNumber}
          onChange={(e) =>
            setForm((f) => ({ ...f, accountNumber: e.target.value }))
          }
          placeholder="e.g. 1234567890"
        />
      </Field>
      <div className="md:col-span-2">
        <Field
          label="Account holder name"
          required
          error={errors.accountHolder}
        >
          <input
            className={inputClass}
            value={form.accountHolder}
            onChange={(e) =>
              setForm((f) => ({ ...f, accountHolder: e.target.value }))
            }
            placeholder="As per bank records"
          />
        </Field>
      </div>
    </div>
    <div className="bg-warning-soft border-l-2 border-warning rounded px-3 py-2 mt-3 text-xs text-warning">
      <strong>KOL vendor:</strong> Created directly in S/4HANA at DC level. No
      Ariba qualification required.
    </div>
  </FormSection>
);

const InternalSRCategoryStep: React.FC<StepProps & { catError: string }> = ({
  form,
  setForm,
  catError,
}) => (
  <FormSection
    eyebrow="Expansion"
    title="Category expansion"
    description="Select the new categories or commodities for this existing vendor."
  >
    <div className="mb-4">
      <label className={labelClass}>
        Additional supply categories<span className="text-danger ml-0.5">*</span>
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {SUPPLY_CATEGORIES.map((cat) => (
          <label
            key={cat}
            className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer border-2 text-sm transition-colors ${
              form.selCats.includes(cat)
                ? 'border-teal bg-teal-soft text-text-primary font-semibold'
                : 'border-border-subtle bg-bg-surface text-text-secondary hover:bg-bg-hover'
            }`}
          >
            <input
              type="checkbox"
              checked={form.selCats.includes(cat)}
              onChange={() =>
                setForm((f) => ({
                  ...f,
                  selCats: f.selCats.includes(cat)
                    ? f.selCats.filter((c) => c !== cat)
                    : [...f.selCats, cat],
                }))
              }
              className="accent-teal"
            />
            {cat}
          </label>
        ))}
      </div>
      {catError && <div className={`${errorClass} mt-2`}>{catError}</div>}
    </div>
    <Field label="Existing S/4HANA vendor number" required>
      <input
        className={inputClass}
        value={form.s4Vendor}
        onChange={(e) => setForm((f) => ({ ...f, s4Vendor: e.target.value }))}
        placeholder="e.g. 1000456"
      />
    </Field>
    <Field label="Reason for category expansion">
      <textarea
        className={`${inputClass} min-h-[80px] resize-y`}
        value={form.expansionReason}
        onChange={(e) =>
          setForm((f) => ({ ...f, expansionReason: e.target.value }))
        }
        placeholder="Explain why this vendor is being expanded to new categories…"
      />
    </Field>
  </FormSection>
);

interface ReviewStepProps extends StepProps {
  requestType: RequestType;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ form, setForm, errors, requestType }) => {
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

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 text-sm text-warning">
        Please review all information below before submitting. Go back to make
        any changes.
      </div>

      {isExternal && (
        <>
          <FormSection eyebrow="Step 1" title="Company information">
            <Row label="Legal name" value={form.legalName} />
            <Row label="NPWP" value={form.npwp} />
            <Row label="NIB" value={form.nib} />
            <Row label="Country" value={form.country} />
            {form.country === 'Indonesia' && (
              <Row label="Province" value={form.province} />
            )}
            <Row label="City" value={form.city} />
            <Row label="Address" value={form.address} />
            <Row label="Website" value={form.website} />
          </FormSection>

          <FormSection eyebrow="Step 2" title="Contact persons">
            {form.contacts.map((c, i) => (
              <div key={i} className="mb-3 last:mb-0">
                <div className="text-xs font-bold text-teal mb-1">
                  Contact {i + 1}
                </div>
                <Row label="Name" value={c.name} />
                <Row label="Role" value={c.role} />
                <Row label="Email" value={c.email} />
                <Row label="WhatsApp" value={c.whatsapp} />
                {c.phone && <Row label="Phone" value={c.phone} />}
              </div>
            ))}
          </FormSection>

          <FormSection eyebrow="Step 3" title="Categories & channel">
            <Row
              label="Supply categories"
              value={form.selCats.join(', ') || '—'}
            />
            <Row label="Preferred channel" value={form.channel} />
          </FormSection>

          <FormSection eyebrow="Step 4" title="Documents & bank">
            {DOCUMENTS.map((doc) => {
              const d = form.docs[doc.key];
              return (
                <Row
                  key={doc.key}
                  label={doc.label}
                  value={
                    d.uploaded
                      ? `${d.fileName}${d.expiry ? ` (expires ${d.expiry})` : ''}`
                      : 'Not uploaded'
                  }
                />
              );
            })}
            <Row label="Bank" value={form.bankName} />
            <Row label="Account number" value={form.accountNumber} />
            <Row label="Account holder" value={form.accountHolder} />
          </FormSection>
        </>
      )}

      {isInternal && (
        <>
          <FormSection eyebrow="Step 1" title="Category expansion">
            <Row label="S/4HANA vendor" value={form.s4Vendor} />
            <Row
              label="Additional categories"
              value={form.selCats.join(', ') || '—'}
            />
            <Row label="Reason" value={form.expansionReason} />
          </FormSection>
          <FormSection eyebrow="Step 2" title="Additional contacts">
            {form.contacts.map((c, i) => (
              <div key={i} className="mb-3 last:mb-0">
                <div className="text-xs font-bold text-teal mb-1">
                  Contact {i + 1}
                </div>
                <Row label="Name" value={c.name} />
                <Row label="Role" value={c.role} />
                <Row label="Email" value={c.email} />
                <Row label="WhatsApp" value={c.whatsapp} />
              </div>
            ))}
          </FormSection>
        </>
      )}

      <FormSection eyebrow="Agreements" title="Terms & confirmation">
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
            I agree to Paragon's{' '}
            <span className="text-teal underline cursor-pointer">
              Supplier Code of Conduct
            </span>{' '}
            and{' '}
            <span className="text-teal underline cursor-pointer">
              Terms &amp; Conditions
            </span>
            .
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
            I confirm that all information provided is accurate and complete. I
            understand that providing false information may result in rejection.
          </span>
        </label>
        {errors.agreed2 && <div className={errorClass}>{errors.agreed2}</div>}
      </FormSection>
    </div>
  );
};

interface SuccessScreenProps {
  appNumber: string;
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({ appNumber }) => (
  <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-md p-6 sm:p-10 text-center">
    <div className="inline-flex w-14 h-14 rounded-full bg-success-soft items-center justify-center mb-4">
      <CheckCircle2 size={32} className="text-success" />
    </div>
    <h1 className="text-xl font-bold text-text-primary mb-1">
      Registration submitted
    </h1>
    <p className="text-sm text-text-tertiary mb-6">
      Your application has been received and is under review.
    </p>
    <div className="inline-block bg-teal-soft border border-teal/40 rounded-md px-6 py-3 mb-8">
      <div className="text-xs text-text-tertiary font-medium">
        Application number
      </div>
      <div className="text-2xl font-bold text-teal tracking-wider mt-1">
        APP-2026-{appNumber}
      </div>
    </div>
    <div className="bg-bg-hover border border-border-subtle rounded-md p-5 text-left mb-6 max-w-xl mx-auto">
      <div className="text-sm font-bold text-text-primary mb-3">
        What happens next?
      </div>
      {[
        'Our procurement team will review your application within 3–5 business days.',
        'You will receive an email at your registered address with the outcome.',
        'If approved, you will receive onboarding instructions and portal access credentials.',
        'For urgent queries, contact supplier-support@paragon.id quoting your application number.',
      ].map((txt, i) => (
        <div
          key={i}
          className="flex gap-3 mb-2 last:mb-0 text-sm text-text-secondary"
        >
          <span className="text-teal font-bold shrink-0">{i + 1}.</span>
          <span>{txt}</span>
        </div>
      ))}
    </div>
    <div className="text-xs text-text-tertiary">
      Questions? Email{' '}
      <a
        href="mailto:supplier-support@paragon.id"
        className="text-teal font-semibold hover:text-teal-hover"
      >
        supplier-support@paragon.id
      </a>{' '}
      with your application number.
    </div>
  </div>
);

const validateStep1 = (form: FormState): Record<string, string> => {
  const e: Record<string, string> = {};
  if (!form.legalName.trim()) e.legalName = 'Legal company name is required';
  if (!form.npwp.trim()) e.npwp = 'NPWP is required';
  if (!form.city.trim()) e.city = 'City is required';
  if (!form.address.trim()) e.address = 'Address is required';
  if (form.country === 'Indonesia' && !form.province)
    e.province = 'Province is required for Indonesia';
  return e;
};

const validateStep2 = (form: FormState): Record<string, string> => {
  const e: Record<string, string> = {};
  form.contacts.forEach((c, i) => {
    if (!c.name.trim()) e[`c${i}name`] = 'Name is required';
    if (!c.email.trim()) e[`c${i}email`] = 'Email is required';
    else if (!isEmail(c.email)) e[`c${i}email`] = 'Invalid email format';
    if (!c.whatsapp.trim()) e[`c${i}whatsapp`] = 'WhatsApp number is required';
  });
  return e;
};

const validateBankStep = (form: FormState): Record<string, string> => {
  const e: Record<string, string> = {};
  if (!form.bankName) e.bankName = 'Bank name is required';
  if (!form.accountNumber.trim()) e.accountNumber = 'Account number is required';
  if (!form.accountHolder.trim())
    e.accountHolder = 'Account holder name is required';
  return e;
};

const validateAgreements = (form: FormState): Record<string, string> => {
  const e: Record<string, string> = {};
  if (!form.agreed1) e.agreed1 = 'You must accept the Terms & Conditions';
  if (!form.agreed2)
    e.agreed2 = 'You must confirm the accuracy of the information';
  return e;
};

const SupplierRegistrationV2: React.FC = () => {
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
  const [appNumber] = useState(
    () => String(10000 + Math.floor(Math.random() * 90000)),
  );

  const resetWizardState = () => {
    setCurrentStep(0);
    setForm(emptyForm());
    setErrors({});
    setCatError('');
  };

  const handleSelectRequestType = (t: RequestType) => {
    setPendingRequestType(t);
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
      if (step === 0) return Object.keys(validateStep1(form)).length === 0;
      if (step === 1) return Object.keys(validateStep2(form)).length === 0;
      if (step === 2) return form.selCats.length > 0;
      if (step === 3) return Object.keys(validateBankStep(form)).length === 0;
      if (step === 4) return Object.keys(validateAgreements(form)).length === 0;
    }
    if (requestType === 'Internal SR') {
      if (step === 0) return form.s4Vendor.trim() !== '' && form.selCats.length > 0;
      if (step === 1) return Object.keys(validateStep2(form)).length === 0;
      if (step === 2) return Object.keys(validateAgreements(form)).length === 0;
    }
    if (requestType === 'KOL') {
      if (step === 0) return Object.keys(validateStep1(form)).length === 0;
      if (step === 1) return Object.keys(validateBankStep(form)).length === 0;
    }
    return true;
  };

  const handleStepChange = (next: number) => {
    // Compute errors when moving forward
    if (next > currentStep && requestType) {
      let stepErrors: Record<string, string> = {};
      let ce = '';
      if (requestType === 'External SR') {
        if (currentStep === 0) stepErrors = validateStep1(form);
        else if (currentStep === 1) stepErrors = validateStep2(form);
        else if (currentStep === 2 && form.selCats.length === 0)
          ce = 'Select at least one supply category';
        else if (currentStep === 3) stepErrors = validateBankStep(form);
      } else if (requestType === 'Internal SR') {
        if (currentStep === 0) {
          if (form.selCats.length === 0)
            ce = 'Select at least one supply category';
          if (!form.s4Vendor.trim())
            stepErrors.s4Vendor = 'S/4HANA vendor number is required';
        } else if (currentStep === 1) stepErrors = validateStep2(form);
      } else if (requestType === 'KOL') {
        if (currentStep === 0) stepErrors = validateStep1(form);
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
    const finalErrors = validateAgreements(form);
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
          title: 'Company information',
          shortTitle: 'Company',
          content: (
            <CompanyInfoStep form={form} setForm={setForm} errors={errors} />
          ),
        },
        {
          id: 'contacts',
          title: 'Contact persons',
          shortTitle: 'Contacts',
          content: (
            <ContactsStep form={form} setForm={setForm} errors={errors} />
          ),
        },
        {
          id: 'categories',
          title: 'Categories & channel',
          shortTitle: 'Categories',
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
          title: 'Documents & bank',
          shortTitle: 'Documents',
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
          title: 'Review & submit',
          shortTitle: 'Review',
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
          title: 'Category expansion',
          shortTitle: 'Expansion',
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
          title: 'Additional contacts',
          shortTitle: 'Contacts',
          content: (
            <ContactsStep form={form} setForm={setForm} errors={errors} />
          ),
        },
        {
          id: 'review',
          title: 'Review & submit',
          shortTitle: 'Review',
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
        title: 'Company information',
        shortTitle: 'Company',
        content: (
          <CompanyInfoStep form={form} setForm={setForm} errors={errors} />
        ),
      },
      {
        id: 'bank',
        title: 'Bank details',
        shortTitle: 'Bank',
        content: <KOLBankStep form={form} setForm={setForm} errors={errors} />,
      },
    ];
  }, [requestType, form, errors, catError]);

  return (
    <div className="min-h-screen flex flex-col bg-bg-page">
      <PageHeader />
      <main className="flex-1 px-4 py-6 sm:py-10">
        <div className="max-w-3xl mx-auto">
          {submitted ? (
            <SuccessScreen appNumber={appNumber} />
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
                  Change registration type
                </button>
                <div className="bg-info-soft border-l-2 border-info rounded px-3 py-1.5 text-xs text-info">
                  <strong>{requestType}</strong> ·{' '}
                  {REQUEST_TYPES.find((r) => r.id === requestType)?.sub}
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
                completeLabel="Submit registration"
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
