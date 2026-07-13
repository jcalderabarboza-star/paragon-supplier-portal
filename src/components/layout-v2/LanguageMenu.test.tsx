import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../lib/i18n';
import { LANG_STORAGE_KEY } from '../../lib/i18n';
import LanguageMenu from './LanguageMenu';

// The TopBar language control (SEAT2-LANG-DROPDOWN-01). The load-bearing
// guarantees: it is a real menu-button (not a blind flip), it lists both
// languages as autonyms with the active one marked, selecting persists to the
// SAME localStorage key the app boots from, and it closes on select / Esc /
// outside-click. i18n is reset to EN around each test so assertions are stable.
const renderMenu = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <LanguageMenu />
    </I18nextProvider>,
  );

beforeEach(async () => {
  await i18n.changeLanguage('en');
  localStorage.clear();
});

afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('LanguageMenu — menu-button semantics', () => {
  it('collapsed button shows the current language code and is a closed menu-button', () => {
    renderMenu();
    const btn = screen.getByRole('button', { name: 'Language' });
    expect(btn).toHaveAttribute('aria-haspopup', 'menu');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    expect(within(btn).getByText('EN')).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens on click and lists both languages as autonyms', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Language' }));
    expect(screen.getByRole('button', { name: 'Language' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    const menu = screen.getByRole('menu');
    expect(within(menu).getByText('English')).toBeInTheDocument();
    expect(within(menu).getByText('Bahasa Indonesia')).toBeInTheDocument();
  });

  it('marks the active language with aria-checked (English while EN)', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Language' }));
    const items = screen.getAllByRole('menuitemradio');
    const english = items.find((i) => i.textContent?.includes('English'))!;
    const indo = items.find((i) => i.textContent?.includes('Bahasa Indonesia'))!;
    expect(english).toHaveAttribute('aria-checked', 'true');
    expect(indo).toHaveAttribute('aria-checked', 'false');
  });
});

describe('LanguageMenu — selection', () => {
  it('selecting Bahasa Indonesia switches i18n, persists to localStorage, and closes', async () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Language' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Bahasa Indonesia/ }));
    await waitFor(() => {
      expect(i18n.language).toBe('id');
    });
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('id');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    // collapsed label now reflects the new language (the button's aria-label
    // itself localizes, so match the sole remaining button by its role, not by
    // the English name).
    expect(within(screen.getByRole('button')).getByText('ID')).toBeInTheDocument();
  });
});

describe('LanguageMenu — dismissal', () => {
  it('Escape closes the menu', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Language' }));
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('an outside pointer-down closes the menu', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Language' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('ArrowDown on the closed button opens the menu (keyboard entry)', () => {
    renderMenu();
    const btn = screen.getByRole('button', { name: 'Language' });
    fireEvent.keyDown(btn, { key: 'ArrowDown' });
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
});
