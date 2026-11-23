/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: 'var(--bg-primary)',
        card: 'var(--bg-card)',
        subtle: 'var(--bg-subtle)',
        ink: 'var(--text-primary)',
        muted: 'var(--text-secondary)',
        accent: 'var(--accent)',
        'accent-contrast': 'var(--accent-contrast)',
      },
      borderColor: {
        theme: 'var(--border-color)',
      }
    },
  },
  plugins: [],
};
