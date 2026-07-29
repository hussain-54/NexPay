/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#6366F1",
        primaryHover: "#4F46E5",
        accent: "#10B981",
        danger: "#EF4444",
        warning: "#F59E0B",
        bgDark: "#05050A",
        bgLight: "#0E0E16",
        card: "#13131A",
        borderDark: "#2A2A35",
        textPrimary: "#F9FAFB",
        textMuted: "#9CA3AF",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'glow': '0 8px 32px rgba(99, 102, 241, 0.25)',
        'card': '0 8px 32px rgba(0, 0, 0, 0.35)',
        'nav': '0 -10px 40px rgba(0, 0, 0, 0.5)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
        scaleIn: 'scaleIn 0.35s ease-out forwards',
        slideUp: 'slideUp 0.4s ease-out forwards',
      },
    },
  },
  plugins: [],
}
