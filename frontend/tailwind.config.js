/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    fontFamily: {
      default: ['Roboto', 'sans-serif'],
      impact: ['Outfit', 'sans-serif'],
    },
    extend: {
      colors: {
        'chat-default': 'var(--default-white)',
        'chat-dark': 'var(--default-dark)',
        'chat-dark-inverse': 'var(--default-dark-inverse)',
        'default-bg-secondary': 'var(--default-bg-secondary)',

        'default-txt': 'var(--default-dark)',
        'default-txt-dark': 'var(--default-white)',
        'secondary-txt': 'var(--text-secondary)',
        'secondary-inverse-txt': 'var(--text-secondary-inverse)',

        'interactive-primary': 'var(--interactive-primary)',
        'interactive-primary-hover': 'var(--interactive-primary-hover)',
        'interactive-primary-dark': 'var(--interactive-primary-dark)',
        'interactive-secondary': 'var(--interactive-secondary)',
        'interactive-tertiary': 'var(--interactive-tertiary)',
        'interactive-tertiary-dark': 'var(--interactive-tertiary-dark)',
        'interactive-enabled': 'var(--interactive-enabled)',
        'interactive-disabled': 'var(--interactive-disabled)',
        'interactive-disabled-low': 'var(--interactive-disabled-low)',
      },
    },
  },
  plugins: [],
  variants: {
    extend: {
      display: ['group-hover'],
    },
  },
};
