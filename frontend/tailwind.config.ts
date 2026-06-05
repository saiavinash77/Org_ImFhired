import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary Orange-Red Palette
        primary: {
          50: '#FFF3F2',
          100: '#FFE4E0',
          200: '#FFC2BA',
          300: '#FF968A',
          400: '#FF6654',
          500: '#FF3B22',
          600: '#E82811',
          700: '#B81D08',
          800: '#941706',
          900: '#751405',
        },
        // Warm Accent Colors
        accent: {
          coral: '#FF6B6B',
          gold: '#FFB84D',
          orange: '#FF8C42',
          rose: '#FF6B9D',
        },
        // Legacy brand colors (kept for compatibility)
        brand: {
          50: '#FFF3F2',
          100: '#FFE4E0',
          200: '#FFC2BA',
          300: '#FF968A',
          400: '#FF6654',
          500: '#FF3B22',
          600: '#E82811',
          700: '#B81D08',
          800: '#941706',
          900: '#751405',
          950: '#4A0C00',
        },
        // Surface/Neutral Palette
        surface: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          950: '#030712',
        },
        // Semantic Colors
        success: {
          50: '#F0FDF4',
          500: '#10B981',
          600: '#059669',
        },
        warning: {
          50: '#FFFBEB',
          500: '#F59E0B',
          600: '#D97706',
        },
        error: {
          50: '#FEF2F2',
          500: '#EF4444',
          600: '#DC2626',
        },
        info: {
          50: '#EFF6FF',
          500: '#3B82F6',
          600: '#2563EB',
        }
      },
      fontFamily: {
        sans: ['Inter', 'var(--font-satoshi)', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'var(--font-cabinet)', 'system-ui', 'sans-serif'],
        secondary: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'var(--font-jetbrains)', 'monospace'],
      },
      fontSize: {
        // Display sizes
        'display-xl': ['5.5rem', { lineHeight: '0.9', letterSpacing: '-0.04em', fontWeight: '900' }],
        'display-lg': ['3.5rem', { lineHeight: '0.9', letterSpacing: '-0.04em', fontWeight: '900' }],
        'display-md': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '800' }],
        'display-sm': ['2rem', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '800' }],
        // Heading sizes
        'h1': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '900' }],
        'h2': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '800' }],
        'h3': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '700' }],
        'h4': ['1.25rem', { lineHeight: '1.4', letterSpacing: '0em', fontWeight: '700' }],
        // Body sizes
        'body-lg': ['1.125rem', { lineHeight: '1.6', letterSpacing: '0em', fontWeight: '500' }],
        'body-base': ['1rem', { lineHeight: '1.6', letterSpacing: '0em', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0em', fontWeight: '400' }],
        // Caption and label sizes
        'caption': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.05em', fontWeight: '600' }],
        'overline': ['0.625rem', { lineHeight: '1.4', letterSpacing: '0.1em', fontWeight: '700' }],
      },
      borderRadius: {
        'xs': '0.5rem',
        'sm': '0.75rem',
        'md': '1rem',
        'lg': '1.5rem',
        'xl': '2rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        // Subtle shadows
        'subtle': '0 1px 2px rgba(0,0,0,0.05)',
        'sm': '0 1px 3px rgba(37,99,235,0.1), 0 1px 2px rgba(0,0,0,0.06)',
        'md': '0 4px 6px rgba(37,99,235,0.1), 0 2px 4px rgba(0,0,0,0.06)',
        'lg': '0 10px 15px rgba(37,99,235,0.15), 0 4px 6px rgba(0,0,0,0.05)',
        // Glow effects
        'glow': '0 0 20px rgba(37,99,235,0.3)',
        'glow-lg': '0 0 40px rgba(37,99,235,0.4)',
        'glow-coral': '0 0 20px rgba(255,107,107,0.3)',
        'glow-gold': '0 0 20px rgba(255,184,77,0.3)',
        // Glass effect
        'glass': '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255,255,255,0.1)',
        'glass-hover': '0 12px 40px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255,255,255,0.15)',
        // Card shadows
        'card': '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
        'card-hover': '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
        'marquee': 'marquee 40s linear infinite',
        'marquee2': 'marquee2 40s linear infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        float: { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-10px)' } },
        shimmer: { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        marquee2: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0%)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        // Sky blue gradients
        'gradient-sky-hero': 'linear-gradient(135deg, #F0F7FF 0%, #E0EFFF 50%, #BAD9FF 100%)',
        'gradient-sky-accent': 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
        'gradient-warm': 'linear-gradient(135deg, #FF6B6B 0%, #FFB84D 100%)',
        'gradient-mesh': 'radial-gradient(at 40% 20%, #7EBFFF 0px, transparent 50%), radial-gradient(at 80% 0%, #FF6B9D 0px, transparent 50%), radial-gradient(at 0% 50%, #2563EB 0px, transparent 50%)',
        'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

export default config
