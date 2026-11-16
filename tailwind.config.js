// tailwind.config.js — Modern Emerald & Slate Fintech Theme Configuration
/** @type {import('tailwindcss').Config} */

function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgb(var(${variableName}) / ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
}

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      // ─── Modern Emerald & Slate Dynamic Color Tokens ─────────────────────
      colors: {
        // Brand Semantic
        'primary':                   withOpacity('--color-primary'),
        'primary-container':         withOpacity('--color-primary-container'),
        'on-primary':                withOpacity('--color-on-primary'),
        'on-primary-container':      withOpacity('--color-on-primary-container'),
        
        // Positive / Income (Emerald 500)
        'secondary':                 withOpacity('--color-secondary'),
        'secondary-container':       withOpacity('--color-secondary-container'),
        'on-secondary':              withOpacity('--color-on-secondary'),
        'on-secondary-container':    withOpacity('--color-on-secondary-container'),
        
        // Secondary / Interactive (Sky 500)
        'tertiary':                  withOpacity('--color-tertiary'),
        'tertiary-fixed':            withOpacity('--color-tertiary-fixed'),
        'tertiary-fixed-dim':        withOpacity('--color-tertiary-fixed-dim'),
        
        // Warning / Expense (Rose 500)
        'error':                     withOpacity('--color-error'),
        'error-container':           withOpacity('--color-error-container'),
        'on-error':                  withOpacity('--color-on-error'),
        'on-error-container':        withOpacity('--color-on-error-container'),
        
        // Surface & Canvas Hierarchy
        'background':                withOpacity('--color-background'),
        'surface':                   withOpacity('--color-surface'),
        'surface-container-lowest':  withOpacity('--color-surface-container-lowest'),
        'surface-container-low':     withOpacity('--color-surface-container-low'),
        'surface-container':         withOpacity('--color-surface-container'),
        'surface-container-high':    withOpacity('--color-surface-container-high'),
        'surface-container-highest': withOpacity('--color-surface-container-highest'),
        'surface-dim':               withOpacity('--color-surface-dim'),
        
        // Typography & Outlines
        'on-surface':                withOpacity('--color-on-surface'),
        'on-surface-variant':        withOpacity('--color-on-surface-variant'),
        'outline':                   withOpacity('--color-outline'),
        'outline-variant':           withOpacity('--color-outline-variant'),
        'inverse-surface':           withOpacity('--color-inverse-surface'),
        'inverse-on-surface':        withOpacity('--color-inverse-on-surface'),
      },

      // ─── Spacing tokens ──────────────────────────────────────────────────
      spacing: {
        'space-xs':  '0.25rem',  // 4px
        'space-sm':  '0.5rem',   // 8px
        'space-md':  '1rem',     // 16px
        'space-lg':  '1.5rem',   // 24px
        'space-xl':  '2rem',     // 32px
        'gutter':    '1rem',     // 16px horizontal page margin
      },

      // ─── Font size tokens ────────────────────────────────────────────────
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

      // ─── Border radius tokens ────────────────────────────────────────────
      borderRadius: {
        DEFAULT:  '1rem',    // 16px — card containers
        'sm':     '0.5rem',  // 8px
        'md':     '1rem',    // 16px
        'lg':     '2rem',    // 32px — main stat cards, metric panels
        'xl':     '3rem',    // 48px — reserved
        '2xl':    '1.5rem',  // 24px — category tiles, stat grid cards
        'full':   '9999px',  // Pills, FABs, avatars
        'inner':  '0.75rem', // 12px — input fields, inner nested rows
      },

      // ─── Font family ─────────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },

      // ─── Box shadows ─────────────────────────────────────────────────────
      boxShadow: {
        'appbar': '0 1px 8px rgba(15,23,42,0.04)',
        'bottomnav': '0 -4px 16px rgba(15,23,42,0.06)',
        'hero': '0 8px 24px -4px rgba(15,23,42,0.30)',
        'fab': '0 6px 16px -2px rgba(16,185,129,0.35)',
      },
    },
  },
  plugins: [],
};
