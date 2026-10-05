/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        // Verde da marca (catálogo alimentar); ajustar depois de definida a identidade visual.
        brand: {
          50: '#f0f9f1',
          100: '#dcf0de',
          200: '#bbe1c0',
          300: '#8fcb98',
          400: '#5cae6a',
          500: '#3a914b',
          600: '#2c7a3c',
          700: '#246132',
          800: '#1f4e2a',
          900: '#1a4024',
        },
      },
    },
  },
  plugins: [],
};
