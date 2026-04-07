// Fiori theme configuration for Paragon Supplier Portal
// Uses SAP Horizon theme (default in @ui5/webcomponents-react v2)

export const FIORI_THEME = {
  name: 'sap_horizon',
  darkVariant: 'sap_horizon_dark',
} as const;

// ─── Paragon brand colours ────────────────────────────────────────────────────

export const PRIMARY = '#354A5F';
export const ACCENT = '#0A6ED1';
export const SUCCESS = '#107E3E';
export const WARNING = '#E9730C';
export const ERROR = '#BB0000';
export const BACKGROUND = '#F0F4F8';
export const PARAGON_TEAL = '#0097A7';
export const PARAGON_NAVY = '#0D1B2A';

// ─── Dark shell colours (sidebar / topbar) ────────────────────────────────────

export const SHELL_BG = '#0D1B2A';
export const SHELL_BORDER = '#1E3A5F';
export const SHELL_TEXT = '#CBD5E1';
export const SHELL_TEXT_MUTED = '#64748B';
export const SHELL_ACTIVE_BG = '#0097A7';
export const SHELL_HOVER_BG = 'rgba(255, 255, 255, 0.08)';

/** Legacy object kept for backward-compat with any existing consumers. */
export const PORTAL_COLORS = {
  primary: PRIMARY,
  secondary: '#6c757d',
  success: SUCCESS,
  warning: WARNING,
  error: ERROR,
  info: ACCENT,
} as const;
