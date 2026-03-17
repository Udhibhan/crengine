/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        void: '#000000',
        abyss: '#050508',
        deep: '#0a0a12',
        surface: '#0f0f1a',
        panel: '#13131f',
        border: '#1e1e30',
        muted: '#2a2a40',
        ghost: '#3d3d5c',
        dim: '#6b6b8a',
        pale: '#9898b8',
        soft: '#c4c4d8',
        bright: '#e8e8f0',
        white: '#ffffff',
        // Blues
        'electric': '#4fc3f7',
        'electric-dim': '#0288d1',
        'electric-glow': '#29b6f6',
        'ice': '#b3e5fc',
        'arctic': '#e1f5fe',
        // Purples
        'violet': '#9c27b0',
        'violet-bright': '#ce93d8',
        'violet-glow': '#ab47bc',
        'indigo': '#3f51b5',
        'indigo-bright': '#7986cb',
        // Accents
        'contradiction': '#ff4757',
        'contradiction-dim': '#c0392b',
        'support': '#2ecc71',
        'evolve': '#f39c12',
        'insight-blue': '#3498db',
        'insight-purple': '#9b59b6',
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      backgroundImage: {
        'void-gradient': 'radial-gradient(ellipse at top, #0d0d1a 0%, #000000 70%)',
        'panel-gradient': 'linear-gradient(135deg, rgba(15,15,26,0.9) 0%, rgba(10,10,18,0.95) 100%)',
        'glow-blue': 'radial-gradient(ellipse, rgba(41,182,246,0.15) 0%, transparent 70%)',
        'glow-violet': 'radial-gradient(ellipse, rgba(171,71,188,0.15) 0%, transparent 70%)',
        'border-glow': 'linear-gradient(135deg, rgba(79,195,247,0.3), rgba(156,39,176,0.3))',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'scan': 'scan 3s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(79,195,247,0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(79,195,247,0.5), 0 0 80px rgba(156,39,176,0.2)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(79,195,247,0.3)',
        'glow-md': '0 0 20px rgba(79,195,247,0.4), 0 0 40px rgba(79,195,247,0.1)',
        'glow-lg': '0 0 40px rgba(79,195,247,0.5), 0 0 80px rgba(79,195,247,0.2)',
        'glow-violet': '0 0 20px rgba(156,39,176,0.4), 0 0 40px rgba(156,39,176,0.1)',
        'inner-glow': 'inset 0 0 30px rgba(79,195,247,0.05)',
        'panel': '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(79,195,247,0.08)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
