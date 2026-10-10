import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrentIdentity } from '../../context/CurrentIdentityContext';
import { mockSuppliers } from '../../data/mockSuppliers';
import { SEEDED_SEAT_ROLES } from '../../services/transitions/businessRoles';
import { NO_PERSON } from '../../context/noPerson';
import Button from '../../components/ui-v2/Button';
import { LinkButton, ToggleChip } from '../../components/ui-v2/Actions';

const SEED_SUPPLIER_ID = 'sup-007';
const SEED_SUPPLIER_NAME =
  mockSuppliers.find((s) => s.id === SEED_SUPPLIER_ID)?.name ?? null;

// ⚠️ `INPUT_STYLE` IS GONE WITH THE LAST INPUT. It styled the password box, then
// the email box, and a shared style const outliving both of its consumers is how
// a page keeps the shape of a form it no longer has.

const Login: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setIdentity } = useCurrentIdentity();
  const [activeTab, setActiveTab] = useState<'buyer' | 'supplier'>('buyer');
  // ⚠️ **THE EMAIL FIELD IS GONE, AND THIS IS A REVERSAL RATHER THAN AN EDIT.**
  // H3 kept it and said so on the page, on this reasoning, quoted rather than
  // paraphrased: *"the field stays because a sign-in surface that asks for nothing
  // is a stranger thing than one that says what it does with what you type."*
  // H3's own PR header then flagged it for the operator, because the ruling it was
  // executing had named the password. **The operator has now ruled (2026-09-28):
  // remove it — the same defect as the password, one field over.**
  //
  // ⚠️ **AND THE ARGUMENT FOR KEEPING IT DID NOT SURVIVE BEING WRITTEN DOWN.** It
  // traded a real defect (a field that captures a reader's address and hands it to
  // nothing) for a FAMILIARITY one — the page looks like a login. A disclosure
  // under the button makes the collection honest; it does not make it purposeful.
  // Nothing in this portal has ever read an email: `handleSignIn` sets a persona
  // and navigates, and the real access gate is an HMAC-signed cookie at the edge
  // (SEC-GATE-01) that runs before this bundle is served at all. A box that looks
  // like a credential prompt, is not one, and asks a reader to type their own
  // address into it is worse than a page that admits what it is.
  //
  // ⚠️ **THE PASSWORD FIELD WENT AT H3 FOR THE SAME REASON** — a `type="password"`
  // input bound to `useState`, so the page CAPTURED a secret and then ignored it.
  // The two were graded differently then ("an ignored email is a dead field; an
  // ignored password is a credential prompt that authenticates nobody") and the
  // grading was right about the severity and wrong about the disposal.
  //
  // What remains is a persona chooser that says it is one. There is no form state
  // left on this page, and no `onKeyDown` handler either: the sign-in control is a
  // `<button>`, which Enter and Space already activate.

  const signInAsBuyer = () => {
    setIdentity({
      personaType: 'buyer',
      supplierId: null,
      supplierName: null,
      businessRoles: SEEDED_SEAT_ROLES.buyer,
      actor: NO_PERSON,
    });
    navigate('/buyer/dashboard');
  };

  const signInAsSupplier = () => {
    setIdentity({
      personaType: 'supplier',
      supplierId: SEED_SUPPLIER_ID,
      supplierName: SEED_SUPPLIER_NAME,
      businessRoles: SEEDED_SEAT_ROLES.supplier,
      actor: NO_PERSON,
    });
    navigate('/supplier/dashboard');
  };

  const handleSignIn = () => {
    if (activeTab === 'buyer') signInAsBuyer();
    else signInAsSupplier();
  };

  const handleViewAsBuyer = signInAsBuyer;
  const handleViewAsSupplier = signInAsSupplier;

  // UI-1a · THIS PAGE IS ON THE TOKENS (operator ruling). It carried fourteen
  // hex literals in inline styles, two of them unreadable (2.30:1 and 2.56:1).
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy px-4 py-8">
      {/* Card */}
      <div className="w-full max-w-[400px] rounded-lg bg-bg-surface p-10 shadow-md">
        {/* Logo + brand */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-hover">
            <span className="text-section text-white">P</span>
          </div>
          <div className="text-section tracking-wide text-text-primary">PARAGON CORP</div>
          <div className="mt-0.5 text-xs font-semibold text-teal-text">{t('login.brand.portal')}</div>
          <div className="mt-1.5 text-xs italic text-text-tertiary">Portal Kolaborasi Pemasok</div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          {([['buyer', 'login.tab.buyer'], ['supplier', 'login.tab.supplier']] as const).map(([tab, labelKey]) => {
            const active = activeTab === tab;
            return (
              <ToggleChip
                key={tab}
                onClick={() => setActiveTab(tab)}
                selected={active}
                className="flex-1 justify-center"
              >
                {t(labelKey)}
              </ToggleChip>
            );
          })}
        </div>

        {/* Sign-in */}
        <div className="mb-5 flex flex-col gap-3.5">
          <Button
            variant="outline"
            onClick={handleSignIn}
            className="mt-0.5 w-full"
          >
            {t('login.demo.signIn')}
          </Button>

          {/* ⚠️ THE DISCLOSURE SITS UNDER THE CONTROL IT IS ABOUT — H3. This is the
              one string on the page that has to be here: the button above does not
              authenticate anybody, and a reader cannot tell that from the button. */}
          <div className="text-xs leading-relaxed text-text-secondary">{t('login.demo.note')}</div>

          {/* ⚠️ `Forgot password?` IS GONE — H3. It carried `onClick={() => {}}`:
              the only control in the whole tree that was dead by an EXPLICIT empty
              handler rather than by a missing one, which is why it read as wired to
              every reader and to every matcher that looks for a handler's presence.
              There is no password to forget — the field above it is gone for the
              same reason — so there was nothing to send anyone to. */}
          {activeTab === 'supplier' && (
            <div className="flex items-center justify-start">
              <LinkButton
                onClick={() => navigate('/register')}
              >
                {t('login.register')}
              </LinkButton>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border-subtle" />
          <span className="whitespace-nowrap text-xs font-medium text-text-tertiary">{t('login.divider')}</span>
          <div className="h-px flex-1 bg-border-subtle" />
        </div>

        {/* Demo buttons */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={handleViewAsBuyer}
            className="flex-1"
          >
            {t('login.viewAsBuyer')}
          </Button>
          <Button
            variant="secondary"
            onClick={handleViewAsSupplier}
            className="flex-1"
          >
            {t('login.viewAsSupplier')}
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-xs text-white">{t('login.footer')}</div>
    </div>
  );
};

export default Login;
