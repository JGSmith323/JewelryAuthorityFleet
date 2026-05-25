/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy:   { 900: '#0F172A', 800: '#1E293B', 700: '#334155' },
        gold:   { 500: '#D97706', 600: '#B45309', 400: '#F59E0B' },
        emerald:{ accent: '#10B981' },
        platform: {
          ebay: '#0064D2',
          shopify: '#7AB55C',
          website: '#7C3AED',
          salesforce: '#00A1E0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.06)',
      },
    },
  },
  plugins: [],
};
