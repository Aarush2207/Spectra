/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        spectra: {
          white: '#ffffff',
          paper: '#f2f2f1',
          ink: '#1d1d1d',
          secondary: '#555555',
          hairline: '#a9a9a6',
          violet: '#8055e8',
          'violet-dark': '#5633b7',
          'violet-subtle': '#f4effe',
          lavender: '#e8def8',
          alert: '#d92d20',
          'alert-bg': '#fef3f2',
          warning: '#f79009',
          'warning-bg': '#fffaeb',
          safe: '#12b76a',
          'safe-bg': '#ecfdf3',
          border: '#e4e4e2',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.02em',
        editorial: '-0.03em',
      },
      boxShadow: {
        'spectra-card': '0 4px 20px -2px rgba(29, 29, 29, 0.05), 0 2px 6px -1px rgba(29, 29, 29, 0.03)',
        'spectra-hover': '0 12px 32px -4px rgba(29, 29, 29, 0.08), 0 4px 12px -2px rgba(29, 29, 29, 0.04)',
        'spectra-violet': '0 10px 25px -5px rgba(128, 85, 232, 0.35)',
        'spectra-subtle': '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
      }
    },
  },
  plugins: [],
}
