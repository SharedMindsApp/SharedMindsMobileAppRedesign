/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      /* ── Typography ─────────────────────────────────── */
      fontFamily: {
        headline: ['Manrope', 'system-ui', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },

      /* ── Stitch Surface & Color Tokens ──────────────── */
      colors: {
        surface: {
          DEFAULT: '#f9f9fb',
          dim: '#d7dadf',
          bright: '#f9f9fb',
          container: {
            DEFAULT: '#eceef1',
            low: '#f2f4f6',
            high: '#e6e8ec',
            highest: '#dfe3e7',
            lowest: '#ffffff',
          },
        },
        'on-surface': {
          DEFAULT: '#2e3336',
          variant: '#5b6063',
        },
        primary: {
          DEFAULT: '#005bc4',
          dim: '#004fad',
          container: '#4388fd',
          fixed: '#4388fd',
          'fixed-dim': '#317bef',
        },
        'on-primary': {
          DEFAULT: '#f9f8ff',
          container: '#000311',
        },
        secondary: {
          DEFAULT: '#506076',
          dim: '#44546a',
          container: '#d3e4fe',
          fixed: '#d3e4fe',
        },
        tertiary: {
          DEFAULT: '#006d4a',
          dim: '#005f40',
          container: '#69f6b8',
          fixed: '#69f6b8',
        },
        error: {
          DEFAULT: '#a83836',
          dim: '#67040d',
          container: '#fa746f',
        },
        outline: {
          DEFAULT: '#777b7f',
          variant: '#aeb2b6',
        },
        'inverse-surface': '#0c0e10',
        'inverse-primary': '#4d8eff',
      },

      /* ── Border Radii (Cognitive Sanctuary scale) ──── */
      borderRadius: {
        sanctuary: '1.75rem',
        'sanctuary-lg': '2rem',
        'sanctuary-xl': '3rem',
      },

      /* ── Ambient Shadows ────────────────────────────── */
      boxShadow: {
        'sanctuary': '0 20px 55px rgba(15,23,42,0.06)',
        'sanctuary-sm': '0 10px 24px rgba(15,23,42,0.04)',
        'sanctuary-float': '0 24px 48px rgba(0,91,196,0.04)',
        'sanctuary-up': '0 -12px 35px rgba(15,23,42,0.06)',
      },

      screens: {
        '3xl': '1920px',
        '4xl': '2560px',
        '5xl': '3200px',
      },
      gridTemplateColumns: {
        '16': 'repeat(16, minmax(0, 1fr))',
        '20': 'repeat(20, minmax(0, 1fr))',
      },
      typography: {
        fluid: {
          fontSize: 'clamp(1rem, 2vw, 1.5rem)',
        },
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        'fade-in': 'fadeIn 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 250ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
