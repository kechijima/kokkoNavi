import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        peach: {
          50: '#FFF8F5',
          100: '#FFF3EE',
          200: '#FFE4D6',
          300: '#FFCBB3',
          400: '#FFA880',
          500: '#FF8C61',
          600: '#F06A35',
          700: '#D4521E',
          800: '#A83E14',
          900: '#7A2C0C',
        },
        warm: {
          50: '#FDFAF7',
          100: '#FAF5EF',
          200: '#F3E8D8',
          300: '#E8D0B5',
          400: '#D4AE84',
          500: '#BF8E58',
          600: '#9E7040',
          700: '#7A5530',
          800: '#5A3D22',
          900: '#3C2815',
        },
      },
      fontFamily: {
        sans: ['Noto Sans JP', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        soft: '0 2px 15px rgba(0,0,0,0.06)',
        card: '0 4px 24px rgba(0,0,0,0.08)',
        peach: '0 4px 20px rgba(255,140,97,0.25)',
      },
    },
  },
  plugins: [],
} satisfies Config
