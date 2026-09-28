import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrentIdentity } from '../../context/CurrentIdentityContext';
import { mockSuppliers } from '../../data/mockSuppliers';
import { SEEDED_SEAT_ROLES } from '../../services/transitions/businessRoles';
import { NO_PERSON } from '../../context/noPerson';

const NAVY = '#0D1B2A';
const TEAL = '#0097A7';

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

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: NAVY,
      padding: '2rem 1rem',
    }}>
      {/* Card */}
      <div style={{
        background: 'white',
        width: '100%',
        maxWidth: '400px',
        borderRadius: '12px',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        {/* Logo + brand */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: TEAL, display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 12px',
          }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: '22px' }}>P</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: '16px', color: NAVY, letterSpacing: '0.05em' }}>
            PARAGON CORP
          </div>
          <div style={{ color: TEAL, fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
            {t('login.brand.portal')}
          </div>
          <div style={{ color: '#94A3B8', fontSize: '12px', fontStyle: 'italic', marginTop: '6px' }}>
            Portal Kolaborasi Pemasok
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', marginBottom: '24px' }}>
          {([['buyer', 'login.tab.buyer'], ['supplier', 'login.tab.supplier']] as const).map(([tab, labelKey]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '10px 0',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activeTab === tab ? 700 : 500,
                color: activeTab === tab ? (tab === 'buyer' ? NAVY : TEAL) : '#94A3B8',
                borderBottom: activeTab === tab
                  ? `2px solid ${tab === 'buyer' ? NAVY : TEAL}`
                  : '2px solid transparent',
                marginBottom: '-1px',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        {/* Sign-in */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
          <button
            onClick={handleSignIn}
            style={{
              width: '100%',
              padding: '11px',
              border: 'none',
              borderRadius: '6px',
              background: activeTab === 'buyer' ? NAVY : TEAL,
              color: 'white',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              marginTop: '2px',
              letterSpacing: '0.02em',
            }}
          >
            {t('login.demo.signIn')}
          </button>

          {/* ⚠️ THE DISCLOSURE SITS UNDER THE CONTROL IT IS ABOUT — H3. This is the
              one string on the page that has to be here: the button above does not
              authenticate anybody, and a reader cannot tell that from the button. */}
          <div style={{ fontSize: '11px', lineHeight: 1.5, color: '#475569' }}>
            {t('login.demo.note')}
          </div>

          {/* ⚠️ `Forgot password?` IS GONE — H3. It carried `onClick={() => {}}`:
              the only control in the whole tree that was dead by an EXPLICIT empty
              handler rather than by a missing one, which is why it read as wired to
              every reader and to every matcher that looks for a handler's presence.
              There is no password to forget — the field above it is gone for the
              same reason — so there was nothing to send anyone to. */}
          {activeTab === 'supplier' && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
              <button
                onClick={() => navigate('/register')}
                style={{
                  border: 'none', background: 'none', cursor: 'pointer',
                  color: TEAL, fontSize: '12px', fontWeight: 500, fontFamily: 'inherit', padding: 0,
                }}
              >
                {t('login.register')}
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
          <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
          <span style={{ fontSize: '11px', color: '#94A3B8', whiteSpace: 'nowrap', fontWeight: 500 }}>
            {t('login.divider')}
          </span>
          <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
        </div>

        {/* Demo buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleViewAsBuyer}
            style={{
              flex: 1, padding: '9px', border: `1.5px solid #CBD5E1`,
              borderRadius: '6px', background: 'white', cursor: 'pointer',
              fontSize: '12px', fontWeight: 600, color: NAVY,
              fontFamily: 'inherit', transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = NAVY)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#CBD5E1')}
          >
            {t('login.viewAsBuyer')}
          </button>
          <button
            onClick={handleViewAsSupplier}
            style={{
              flex: 1, padding: '9px', border: `1.5px solid #CBD5E1`,
              borderRadius: '6px', background: 'white', cursor: 'pointer',
              fontSize: '12px', fontWeight: 600, color: NAVY,
              fontFamily: 'inherit', transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = TEAL)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#CBD5E1')}
          >
            {t('login.viewAsSupplier')}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '24px', fontSize: '11px', color: '#475569', textAlign: 'center' }}>
        {t('login.footer')}
      </div>
    </div>
  );
};

export default Login;
