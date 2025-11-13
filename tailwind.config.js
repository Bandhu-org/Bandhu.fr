/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bandhu: {
          primary: '#60a5fa',    // Bleu Bandhu
          secondary: '#a855f7',  // Violet Bandhu
          dark: '#0f172a',       // Fond sombre
          card: 'rgba(96,165,250,0.1)',
          cardBorder: 'rgba(96,165,250,0.3)',
        }
      },
    },
  },
  plugins: [],
}