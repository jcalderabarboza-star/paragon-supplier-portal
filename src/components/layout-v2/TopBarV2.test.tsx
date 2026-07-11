import { describe, it, expect, afterEach } from 'vitest';
import { screen, fireEvent, act, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import i18n, { LANG_STORAGE_KEY } from '../../lib/i18n';
import TopBarV2 from './TopBarV2';

afterEach(async () => {
  await act(async () => {
    await i18n.changeLanguage('en');
  });
  localStorage.removeItem(LANG_STORAGE_KEY);
});

// The TopBar language control is now a menu-button dropdown (SEAT2-LANG-DROPDOWN-01)
// — behaviour lives in LanguageMenu (see LanguageMenu.test.tsx). These cases lock
// the TopBar integration: the control is embedded, opens a menu, and selecting a
// language flips the keyed app title + persists.
describe('TopBarV2 — language menu integration (SEAT2-LANG-DROPDOWN-01)', () => {
  it('shows the current language and opens a menu (does not blind-flip on click)', () => {
    renderWithProviders(<TopBarV2 />);
    const control = screen.getByRole('button', { name: 'Language' });
    expect(control).toHaveTextContent('EN');
    expect(screen.getByText('Paragon Supplier Portal')).toBeInTheDocument();

    // A single click opens the menu — it must NOT switch the language by itself.
    fireEvent.click(control);
    expect(control).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(control).toHaveTextContent('EN');
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBeNull();
  });

  it('selecting Bahasa Indonesia flips the keyed app title and persists', async () => {
    renderWithProviders(<TopBarV2 />);
    fireEvent.click(screen.getByRole('button', { name: 'Language' }));
    fireEvent.click(
      screen.getByRole('menuitemradio', { name: /Bahasa Indonesia/ }),
    );
    await waitFor(() => {
      // app.title is keyed → flips with the selection
      expect(screen.getByText('Portal Pemasok Paragon')).toBeInTheDocument();
    });
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('id');
  });
});
