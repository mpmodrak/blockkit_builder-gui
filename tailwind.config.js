const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Bricolage Grotesque"', ...defaultTheme.fontFamily.sans],
        mono: ['"Space Mono"', ...defaultTheme.fontFamily.mono],
        slack: ['Lato', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        desk: 'var(--desk)',
        panel: 'var(--panel)',
        panel2: 'var(--panel-2)',
        field: 'var(--field)',
        line: 'var(--line)',
        accent: 'var(--accent)',
        accentink: 'var(--accent-ink)',
        danger: 'var(--danger)',
        note: 'var(--note)',
        noteink: 'var(--note-ink)',
      },
    },
  },
  plugins: [],
};
