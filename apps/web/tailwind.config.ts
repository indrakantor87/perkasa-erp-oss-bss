import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: 'var(--color-surface)',
        panel: 'var(--color-panel)',
        line: 'var(--color-line)',
        ink: 'var(--color-ink)',
        mute: 'var(--color-mute)',
        accent: 'var(--color-accent)',
        accentSoft: 'var(--color-accent-soft)',
      },
      boxShadow: {
        panel: 'var(--shadow-panel)',
      },
      borderRadius: {
        xl2: '1rem',
      },
    },
  },
  plugins: [],
}

export default config
