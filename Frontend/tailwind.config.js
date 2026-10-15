/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#0b0d0c',
          900: '#101211',
          850: '#141615',
          800: '#181a19',
          750: '#1f2220',
          700: '#282b29',
        },
        sage: {
          300: '#bef264',
          400: '#a3e635',
          500: '#84cc16',
          600: '#65a30d',
          700: '#4d7c0f',
          800: '#3f6212',
          900: '#365314',
        },
        olive: {
          500: '#65a30d',
          600: '#4d7c0f',
          700: '#3f6212',
          800: '#2e480e',
          900: '#1f310a',
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Plus Jakarta Sans"', '"Inter"', 'sans-serif'],
      },
      boxShadow: {
        'card-elevated': '0 4px 20px -2px rgba(0, 0, 0, 0.6)',
      },
      backgroundImage: {
        'olive-gradient': 'linear-gradient(135deg, #84cc16 0%, #65a30d 50%, #3f6212 100%)',
        'glass-panel': 'linear-gradient(180deg, rgba(20, 22, 20, 0.8) 0%, rgba(14, 16, 14, 0.95) 100%)',
      },
    },
  },
  plugins: [],
}
