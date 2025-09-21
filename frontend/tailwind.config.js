/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", 
    "./public/index.html" 
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors or safety-themed palette
        'raksha-pink': '#F43F5E',
        'raksha-purple': '#7C3AED',
        'raksha-green': '#22C55E',
        'raksha-yellow': '#EAB308',
      },
      animation: {
        fadeInUp: 'fadeInUp 0.6s ease forwards',
        pulseSlow: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
