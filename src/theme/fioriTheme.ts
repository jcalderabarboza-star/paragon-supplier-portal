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
export const BACKGROUND = '#F7F7F7';
export const PARAGON_TEAL = '#0097A7';
export const PARAGON_NAVY = '#1A2B3C';

/** Legacy object kept for backward-compat with any existing consumers. */
export const PORTAL_COLORS = {
  primary: PRIMARY,
  secondary: '#6c757d',
  success: SUCCESS,
  warning: WARNING,
  error: ERROR,
  info: ACCENT,
} as const;
