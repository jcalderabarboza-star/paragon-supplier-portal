import { describe, it, expect, afterEach } from 'vitest';
import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import i18n, { LANG_STORAGE_KEY } from '../../lib/i18n';
import TopBarV2 from './TopBarV2';

afterEach(async () => {
  await act(async () => {
    await i18n.changeLanguage('en');
  });
  localStorage.removeItem(LANG_STORAGE_KEY);
});

describe('TopBarV2 — language toggle (SEAT2-I18N-TOGGLE-01)', () => {
  it('shows the current language and flips EN↔ID on click', () => {
    renderWithProviders(<TopBarV2 />);
    const toggle = screen.getByRole('button', { name: 'Language' });
    expect(toggle).toHaveTextContent('EN');
    expect(screen.getByText('Paragon Supplier Portal')).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveTextContent('ID');
    // app.title is keyed → flips with the toggle
    expect(screen.getByText('Portal Pemasok Paragon')).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveTextContent('EN');
  });

  it('persists the chosen language to localStorage', () => {
    renderWithProviders(<TopBarV2 />);
    fireEvent.click(screen.getByRole('button', { name: 'Language' }));
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('id');
  });
});
