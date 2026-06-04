/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // DBL Group blue (primary)
        brand: {
          50: '#f0f7fc',
          100: '#dcecf8',
          200: '#bcdcf1',
          300: '#8ec4e7',
          400: '#59a4d8',
          500: '#3487c6',
          600: '#1877c0',
          700: '#155f9c',
          800: '#164f7f',
          900: '#174368',
          950: '#0f2a45',
        },
        // DBL Group green (accent)
        accent: {
          50: '#f4fae9',
          100: '#e7f4cf',
          200: '#d0e9a4',
          300: '#b3da6f',
          400: '#98ca47',
          500: '#8cc63f',
          600: '#6ea22d',
          700: '#547d25',
          800: '#446323',
          900: '#3a5421',
          950: '#1d2e0d',
        },
        // DBL Group navy (wordmark / headings)
        ink: {
          DEFAULT: '#2a3b4d',
          light: '#3c5266',
          dark: '#1f2d3a',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f6f8fa',
          subtle: '#eef2f6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.08)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
