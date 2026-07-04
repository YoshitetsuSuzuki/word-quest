/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ゲームらしいネオン系パレット
        night: '#0e1020',
        panel: '#191c31',
        panel2: '#22263f',
        accent: '#7c5cff',
        accent2: '#00e0c6',
        gold: '#ffcc4d',
        danger: '#ff5470',
        success: '#3ddc97',
      },
      keyframes: {
        pop: {
          '0%': { transform: 'scale(0.7)', opacity: '0' },
          '60%': { transform: 'scale(1.15)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        floatUp: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-60px)', opacity: '0' },
        },
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%,60%': { transform: 'translateX(-8px)' },
          '40%,80%': { transform: 'translateX(8px)' },
        },
        glow: {
          '0%,100%': { boxShadow: '0 0 0px rgba(124,92,255,0.0)' },
          '50%': { boxShadow: '0 0 24px rgba(124,92,255,0.8)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        barFill: {
          '0%': { transform: 'scaleX(var(--from,0))' },
          '100%': { transform: 'scaleX(var(--to,1))' },
        },
      },
      animation: {
        pop: 'pop 0.35s ease-out',
        floatUp: 'floatUp 0.9s ease-out forwards',
        shake: 'shake 0.4s ease-in-out',
        glow: 'glow 1.2s ease-in-out infinite',
        slideUp: 'slideUp 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
