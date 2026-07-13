import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Languages, ChevronDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LANG_STORAGE_KEY, type AppLang } from '../../lib/i18n';

// Language options as AUTONYMS — each language named IN ITS OWN language, never
// translated by the active locale (an autonym is identity data, not UI copy).
// `short` is the collapsed-button label (the language code); `autonym` is the
// full name shown in the open menu.
const LANGUAGES: { code: AppLang; autonym: string; short: string }[] = [
  { code: 'en', autonym: 'English', short: 'EN' },
  { code: 'id', autonym: 'Bahasa Indonesia', short: 'ID' },
];

// TopBar language control (SEAT2-LANG-DROPDOWN-01) — a WAI-ARIA menu-button that
// replaces the old blind EN↔ID flip. Opens a quiet DP-register menu listing both
// languages as autonyms with the active one marked (action-blue check = the DP-2
// selected affordance). Selecting calls i18n.changeLanguage + persists to the
// SAME localStorage key the app boots from (LANG_STORAGE_KEY) — no new
// persistence path. Closes on select / outside-click / Esc; fully keyboard-driven.
const LanguageMenu: React.FC = () => {
  const { t, i18n } = useTranslation();
  const current: AppLang = i18n.language?.toLowerCase().startsWith('id')
    ? 'id'
    : 'en';
  const currentIndex = Math.max(
    0,
    LANGUAGES.findIndex((l) => l.code === current),
  );

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(currentIndex);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const openMenu = (index: number) => {
    setActiveIndex(index);
    setOpen(true);
  };

  const closeMenu = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  const select = useCallback(
    (code: AppLang) => {
      i18n.changeLanguage(code);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LANG_STORAGE_KEY, code);
      }
      setOpen(false);
      buttonRef.current?.focus();
    },
    [i18n],
  );

  // Close on outside click (pointerdown so it beats the button's own onClick).
  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocPointer);
    return () => document.removeEventListener('mousedown', onDocPointer);
  }, [open]);

  // Move DOM focus onto the highlighted item whenever the menu opens or the
  // keyboard highlight moves (roving tabindex).
  useEffect(() => {
    if (open) itemRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  const onButtonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openMenu(currentIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      openMenu(LANGUAGES.length - 1);
    }
  };

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % LANGUAGES.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + LANGUAGES.length) % LANGUAGES.length);
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(LANGUAGES.length - 1);
        break;
      case 'Escape':
        e.preventDefault();
        closeMenu();
        break;
      case 'Tab':
        // Let focus leave naturally, but collapse the menu.
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? closeMenu(false) : openMenu(currentIndex))}
        onKeyDown={onButtonKeyDown}
        aria-label={t('topbar.language')}
        title={t('topbar.language')}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary px-2 py-1.5 rounded-md hover:bg-bg-hover"
      >
        <Languages size={16} className="text-text-tertiary" />
        <span className="font-medium">{LANGUAGES[currentIndex].short}</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t('topbar.language')}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 mt-1 min-w-[184px] z-50 rounded-md border border-border-subtle bg-bg-surface shadow-lg py-1"
        >
          {LANGUAGES.map((lang, i) => {
            const isCurrent = lang.code === current;
            return (
              <button
                key={lang.code}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={isCurrent}
                tabIndex={i === activeIndex ? 0 : -1}
                onClick={() => select(lang.code)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-bg-hover focus:bg-bg-hover focus:outline-none ${
                  isCurrent ? 'text-action font-medium' : 'text-text-secondary'
                }`}
              >
                <span className="w-4 flex-shrink-0" aria-hidden="true">
                  {isCurrent && <Check size={14} className="text-action" />}
                </span>
                <span className="flex-1">{lang.autonym}</span>
                <span className="text-text-tertiary text-xs font-medium">
                  {lang.short}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageMenu;
