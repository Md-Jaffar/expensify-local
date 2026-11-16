// tailwind.config.js — Full design token configuration from DESIGN.md
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      // ─── Color tokens from DESIGN.md Section 2 ───────────────────────────
      colors: {
        // Brand Semantic
        'primary':                   '#005c55',
        'primary-container':         '#0f766e',
        'on-primary':                '#ffffff',
        'on-primary-container':      '#a3faef',
        'secondary':                 '#006c49',
        'secondary-container':       '#6cf8bb',
        'on-secondary-container':    '#00714d',
        'tertiary':                  '#734700',
        'tertiary-fixed':            '#ffddb8',
        'tertiary-fixed-dim':        '#ffb95f',
        'error':                     '#ba1a1a',
        'error-container':           '#ffdad6',
        'on-error-container':        '#93000a',
        // Surface Hierarchy
        'background':                '#faf8ff',
        'surface':                   '#faf8ff',
        'surface-container-lowest':  '#ffffff',
        'surface-container-low':     '#f2f3ff',
        'surface-container':         '#eaedff',
        'surface-container-high':    '#e2e7ff',
        'surface-container-highest': '#dae2fd',
        'surface-dim':               '#d2d9f4',
        // Text / Outline
        'on-surface':                '#131b2e',
        'on-surface-variant':        '#3e4947',
        'outline':                   '#6e7977',
        'outline-variant':           '#bdc9c6',
        'inverse-surface':           '#283044',
        'inverse-on-surface':        '#eef0ff',
      },

      // ─── Spacing tokens from DESIGN.md Section 4 ─────────────────────────
      spacing: {
        'space-xs':  '0.25rem',  // 4px
        'space-sm':  '0.5rem',   // 8px
        'space-md':  '1rem',     // 16px
        'space-lg':  '1.5rem',   // 24px
        'space-xl':  '2rem',     // 32px
        'gutter':    '1rem',     // 16px horizontal page margin
      },

      // ─── Font size tokens from DESIGN.md Section 3 ───────────────────────
      fontSize: {
        'display-currency':        ['38px', { lineHeight: '44px', letterSpacing: '-0.03em', fontWeight: '700' }],
        'display-currency-mobile': ['32px', { lineHeight: '38px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg':             ['26px', { lineHeight: '32px', letterSpacing: '-0.015em', fontWeight: '600' }],
        'headline-md':             ['20px', { lineHeight: '26px', letterSpacing: '-0.01em',  fontWeight: '600' }],
        'headline-sm':             ['18px', { lineHeight: '24px', letterSpacing: '0',         fontWeight: '600' }],
        'body-lg':                 ['16px', { lineHeight: '24px', letterSpacing: '0',         fontWeight: '400' }],
        'body-md':                 ['14px', { lineHeight: '20px', letterSpacing: '0',         fontWeight: '400' }],
        'body-sm':                 ['12px', { lineHeight: '16px', letterSpacing: '0',         fontWeight: '400' }],
        'label-lg':                ['14px', { lineHeight: '20px', letterSpacing: '+0.01em',  fontWeight: '600' }],
        'label-md':                ['12px', { lineHeight: '16px', letterSpacing: '+0.02em',  fontWeight: '600' }],
        'label-sm':                ['11px', { lineHeight: '14px', letterSpacing: '+0.04em',  fontWeight: '600' }],
        'numeral-dense':           ['15px', { lineHeight: '20px', letterSpacing: '-0.01em',  fontWeight: '600' }],
      },

      // ─── Border radius tokens from DESIGN.md Section 5 ───────────────────
      // Note: Tailwind's defaults are overridden here to match DESIGN.md
      borderRadius: {
        DEFAULT:  '1rem',    // 16px — card containers
        'sm':     '0.5rem',  // 8px
        'md':     '1rem',    // 16px
        'lg':     '2rem',    // 32px — main stat cards, metric panels
        'xl':     '3rem',    // 48px — reserved
        '2xl':    '1.5rem',  // 24px — category tiles, stat grid cards (matches Tailwind 2xl=24px)
        'full':   '9999px',  // Pills, FABs, avatars
        // Keep standard ones accessible
        'inner':  '0.75rem', // 12px — input fields, inner nested rows
      },

      // ─── Font family ──────────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },

      // ─── Box shadows from DESIGN.md Section 6 ────────────────────────────
      boxShadow: {
        'appbar': '0 1px 8px rgba(0,0,0,0.03)',
        'bottomnav': '0 -4px 16px rgba(19,27,46,0.06)',
        'hero': '0 8px 24px -4px rgba(15,118,110,0.35)',
        'fab': '0 6px 16px -2px rgba(15,118,110,0.35)',
      },
    },
  },
  plugins: [],
};
