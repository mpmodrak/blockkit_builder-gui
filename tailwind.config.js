const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Source Sans 3"', ...defaultTheme.fontFamily.sans],
        serif: ['Fraunces', ...defaultTheme.fontFamily.serif],
        slack: ['Lato', '"Source Sans 3"', ...defaultTheme.fontFamily.sans],
        mono: ['"IBM Plex Mono"', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        ink: '#211c16',
        muted: '#6f675c',
        desk: '#efe6d8',
        panel: '#fbf7f1',
        line: '#e4d8c6',
        aubergine: '#4A154B',
      },
    },
  },
  plugins: [],
};
