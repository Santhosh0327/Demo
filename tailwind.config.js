/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bgMain: '#080B12',
        sidebarBg: '#10151F',
        cardBg: '#161D29',
        cardBorder: '#232D3F',
        gold: {
          DEFAULT: '#D4AF37',
          hover: '#F3C649',
          muted: 'rgba(212, 175, 55, 0.15)',
        },
        roulette: {
          red: '#DC2626',
          green: '#15803D',
          black: '#1E293B',
          blackText: '#94A3B8',
        },
        textMain: '#F8FAFC',
        textMuted: '#94A3B8',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Fira Code', 'Courier New', 'monospace'],
      }
    },
  },
  plugins: [],
}
