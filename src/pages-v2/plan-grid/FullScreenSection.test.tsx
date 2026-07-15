import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import FullScreenSection from './FullScreenSection';

// ────────────────────────────────────────────────────────────────────────────
// FullScreenSection (Stage G · G1.3.2) — the shared per-section full-screen
// wrapper. Each plan-grid section (award / intake / drawer) expands to an
// inset-0 overlay and hands its child a viewport-tall height that reuses the
// same DSG height-pin (`--plan-dsg-h`). Collapsed by default; a toggle button +
// Esc drive it. This tests the expand/collapse contract headlessly.
// ────────────────────────────────────────────────────────────────────────────

const renderSection = () =>
  renderWithProviders(
    <FullScreenSection title="Award scenario" normalHeight={176}>
      {({ expanded, dsgHeight }) => (
        <div data-testid="child">
          expanded:{String(expanded)} height:{dsgHeight}
        </div>
      )}
    </FullScreenSection>,
  );

describe('FullScreenSection — collapsed by default', () => {
  it('renders the child inline at the normal height, with an expand control and no overlay', () => {
    renderSection();
    expect(screen.getByTestId('child')).toHaveTextContent('expanded:false');
    expect(screen.getByTestId('child')).toHaveTextContent('height:176');
    expect(screen.getByRole('button', { name: /full screen/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('FullScreenSection — expand / collapse', () => {
  it('expanding shows the overlay dialog and grows the child beyond the normal height', () => {
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: /full screen/i }));

    const dialog = screen.getByRole('dialog', { name: /award scenario/i });
    expect(dialog).toBeInTheDocument();
    const child = screen.getByTestId('child');
    expect(child).toHaveTextContent('expanded:true');
    // the expanded height is viewport-derived and larger than the normal 176px
    const m = child.textContent!.match(/height:(\d+)/);
    expect(Number(m![1])).toBeGreaterThan(176);
  });

  it('the collapse control returns to the inline, normal-height render', () => {
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: /full screen/i }));
    fireEvent.click(screen.getByRole('button', { name: /exit full screen/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('child')).toHaveTextContent('height:176');
  });

  it('Escape collapses an expanded section', () => {
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: /full screen/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
