/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './master.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Satoshi', 'system-ui', 'sans-serif']
      },
      colors: {
        brand: {
          primary: '#0ea5e9',
          accent: '#22c55e'
        }
      }
    }
  },
  plugins: []
}
