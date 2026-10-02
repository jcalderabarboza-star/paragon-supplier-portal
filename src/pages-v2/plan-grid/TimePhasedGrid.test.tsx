// ────────────────────────────────────────────────────────────────────────────
// B2 · the time-phased grid on the page — the tab set, the cell rules, the
// honesty banner. The virtualised body lays out no rows under jsdom, so the
// CELL is tested directly (it is the component every bucket renders through),
// and the rows themselves are proven in `timePhasedModel.test.ts` and in the
// browser.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, afterEach } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';

import { renderWithProviders } from '../../test/test-utils';
import PlanGrid from '../PlanGrid';
import { PlanBucketCell } from './TimePhasedGrid';
import i18n from '../../lib/i18n';

afterEach(async () => {
  await i18n.changeLanguage('en');
});

const tabs = () => screen.getAllByRole('tab').map((t) => t.textContent);

describe('B2 · the tab set', () => {
  it('EN — the three planning views lead, the two existing sections keep their own tabs', () => {
    renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid' });
    // PLN-3 · the Intake tab IS the retired Intake Review page now, and says so.
    expect(tabs()).toEqual(['Raw materials', 'Packaging', 'Exceptions', 'Award what-if', 'Intake review']);
  });

  it('ID — every tab label is Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid' });
    expect(tabs()).toEqual(['Bahan baku', 'Kemasan', 'Pengecualian', 'Simulasi penghargaan', 'Tinjauan asupan']);
  });

  it('Raw materials is the landing view, behind the SIMULATED banner', async () => {
    renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid' });
    const view = await screen.findByTestId('tp-view-rm-plan');
    expect(within(view).getByText(/Sample SOMO plan — simulated/)).toBeInTheDocument();
    expect(within(view).getByText(/never a zero/)).toBeInTheDocument();
  });

  it('Packaging opens the weekly view; Exceptions opens with the toggle locked ON', () => {
    renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid' });
    fireEvent.click(screen.getByRole('tab', { name: 'Packaging' }));
    expect(screen.getByTestId('tp-view-pm-plan')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Exceptions' }));
    const toggle = within(screen.getByTestId('tp-view-exceptions')).getByTestId('tp-exceptions') as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    expect(toggle.disabled).toBe(true);
  });

  it('the existing sections still render under their tabs', () => {
    renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid' });
    fireEvent.click(screen.getByRole('tab', { name: 'Award what-if' }));
    expect(screen.getByRole('heading', { name: /Award scenario/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Intake review' }));
    expect(screen.getByRole('heading', { name: /Requisition intake/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /adjust & push — selected line/i })).toBeInTheDocument();
  });
});

describe('B2 · the bucket cell — the null rule and the marker rule', () => {
  it('null renders "—" and never "0"', () => {
    renderWithProviders(<PlanBucketCell value={null} derived={false} />);
    const cell = screen.getByTestId('tp-cell');
    expect(cell.textContent).toBe('—');
    expect(cell.textContent).not.toContain('0');
  });

  it('KNOWN-GOOD: a real zero renders 0', () => {
    renderWithProviders(<PlanBucketCell value={0} derived={false} />);
    expect(screen.getByTestId('tp-cell').textContent).toBe('0');
  });

  it('a DERIVED cell always carries its Σ marker — even when it has no figure', () => {
    renderWithProviders(<PlanBucketCell value={500} derived />);
    expect(within(screen.getByTestId('tp-cell')).getByText('Modeled')).toBeInTheDocument();
    renderWithProviders(<PlanBucketCell value={null} derived />);
    expect(screen.getAllByText('Modeled')).toHaveLength(2);
  });

  it('an AUTHORED cell carries no Σ marker', () => {
    renderWithProviders(<PlanBucketCell value={500} derived={false} />);
    expect(within(screen.getByTestId('tp-cell')).queryByText('Modeled')).toBeNull();
  });

  it('ID — the marker is Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<PlanBucketCell value={1} derived />);
    expect(screen.getByText('Dimodelkan')).toBeInTheDocument();
  });
});
