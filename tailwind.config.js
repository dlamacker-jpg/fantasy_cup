/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'mk-gold': '#FFD700',
        'mk-silver': '#C0C0C0',
        'mk-bronze': '#CD7F32',
        'mk-red': '#E52521',
        'mk-blue': '#049CD8',
        'mk-green': '#43B047',
        'mk-yellow': '#FBBE00',
        'mk-purple': '#7B2D8E',
        'mk-dark': '#1a1a2e',
        'mk-darker': '#0f0f1e',
        'mk-panel': '#16213e',
        'mk-accent': '#0f3460',
      },
      fontFamily: {
        'display': ['"Press Start 2P"', 'monospace'],
        'body': ['Montserrat', 'sans-serif'],
      },
      animation: {
        'rainbow': 'rainbow 3s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'slide-in': 'slideIn 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.25s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        rainbow: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 5px #FFD700' },
          '50%': { boxShadow: '0 0 25px #FFD700, 0 0 50px #FFD70055' },
        },
      },
    },
  },
  plugins: [],
}
