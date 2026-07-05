/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        'bg-page': '#FAFBFC',
        'bg-sidebar': '#FFFFFF',
        'bg-surface': '#FFFFFF',
        'bg-hover': '#F4F6F8',
        'bg-active-soft': '#E6F4F7',
        // Text
        'text-primary': '#0D1B2A',
        'text-secondary': '#354A5F',
        'text-tertiary': '#6B7785',
        // Brand
        // Blue action/identity system (DP-3 follow-up). Fiori "Morning Horizon".
        //  DEFAULT #0070F2 — primary buttons (white text 4.57:1 AA).
        //  hover   #0064D9 — button hover; also selected-state TEXT on soft (4.76:1 AA).
        //  soft    #E6F0FB — selected-state / in-flight backgrounds.
        //  muted   #2A6FBF — identity marks/avatars, solid + white text (5.09:1 AA);
        //                    a calmer, non-clickable blue (operator's #4A90D9 fails AA at 3.34:1).
        // Teal is now DECORATIVE-only (charts, score dials, low-emphasis links).
        'action': {
          DEFAULT: '#0070F2',
          hover: '#0064D9',
          soft: '#E6F0FB',
          muted: '#2A6FBF',
        },
        'teal': {
          DEFAULT: '#0097A7',
          hover: '#007A8A',
          soft: '#E6F4F7',
        },
        'navy': '#0D1B2A',
        'mid': '#354A5F',
        // Status
        'success': { DEFAULT: '#107E3E', soft: '#E8F5EC' },
        'warning': { DEFAULT: '#B45309', soft: '#FEF3D6' },
        'danger': { DEFAULT: '#BB0000', soft: '#FCE4E4' },
        'info': { DEFAULT: '#1E5BAE', soft: '#E5F0FF' },
        // Borders
        'border-subtle': '#E5E9EE',
        'border-input': '#D1D8E0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // DP3-FONT-01 canonical type scale. Roles below are the ONLY sanctioned
        // sizes for their role — no ad-hoc text-2xl/3xl/4xl on titles/KPIs/sections.
        //  title   — page h1 (via <PageHeader>). Was text-3xl font-semibold.
        //  section — every card/section header. Replaces 8 ad-hoc variants
        //            (text-sm..text-2xl, semibold vs bold).
        //  kpi     — every headline/KPI number. Rendered mono (font-mono
        //            tabular-nums, semibold) per DP-3 data grammar; kills
        //            font-extrabold and the text-3xl/2xl hand-rolled tiles.
        'title': ['30px', { lineHeight: '1.2', fontWeight: '600' }],
        'section': ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        'kpi': ['36px', { lineHeight: '1.1', fontWeight: '600' }],
        'eyebrow': ['12px', { lineHeight: '1.4', letterSpacing: '0.08em', fontWeight: '600' }],
        'label': ['11px', { lineHeight: '1.3', letterSpacing: '0.06em', fontWeight: '600' }],
        'meta': ['13px', { lineHeight: '1.4', fontWeight: '400' }],
      },
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '12px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(13, 27, 42, 0.04)',
        'md': '0 4px 12px rgba(13, 27, 42, 0.08)',
      },
    },
  },
  plugins: [],
}
