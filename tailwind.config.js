/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        neon: {
          cyan: '#22d3ee',
          pink: '#ec4899',
          violet: '#8b5cf6'
        }
      },
      boxShadow: {
        glass: '0 20px 30px rgba(15, 23, 42, 0.4)'
      }
    }
  },
  plugins: []
};
