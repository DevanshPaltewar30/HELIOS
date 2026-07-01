/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        space: {
          bg:       'rgb(var(--color-bg) / <alpha-value>)',
          surface:  'rgb(var(--color-surface) / 0.75)',
          panel:    'rgb(var(--color-panel) / 0.6)',
          border:   'rgb(var(--color-border) / 0.15)',
          muted:    'rgb(var(--color-muted) / <alpha-value>)',
          text:     'rgb(var(--color-text) / <alpha-value>)',
          cyan:     'rgb(var(--color-cyan) / <alpha-value>)',
          green:    'rgb(var(--color-green) / <alpha-value>)',
          yellow:   'rgb(var(--color-yellow) / <alpha-value>)',
          red:      'rgb(var(--color-red) / <alpha-value>)',
          orange:   'rgb(var(--color-orange) / <alpha-value>)',
          purple:   'rgb(var(--color-purple) / <alpha-value>)',
          blue:     'rgb(var(--color-blue) / <alpha-value>)',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(88,200,227,0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(88,200,227,0.8)' },
        }
      }
    },
  },
  plugins: [],
};
