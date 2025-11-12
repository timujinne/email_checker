/**
 * Tailwind CSS Configuration Template
 *
 * This template provides a starter configuration for Tailwind CSS 3+
 * with custom theme, daisyUI plugin support, and common patterns.
 *
 * Documentation: https://tailwindcss.com/docs/configuration
 */

/** @type {import('tailwindcss').Config} */
export default {
  // Content paths: List all files containing Tailwind classes
  // Critical for JIT mode and PurgeCSS to work correctly
  content: [
    "./src/**/*.{html,js}",
    "./public/**/*.html",
    "./dist/**/*.html",
    // Include component library if using daisyUI or similar
    "./node_modules/daisyui/dist/**/*.js"
  ],

  // Theme configuration
  theme: {
    // Extend default theme (recommended)
    extend: {
      // Custom colors
      colors: {
        // Brand colors
        'brand-blue': '#1e3a8a',
        'brand-red': '#991b1b',

        // Custom color palette
        'custom-gray': {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827'
        }
      },

      // Custom fonts
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Fira Code', 'monospace']
      },

      // Custom spacing
      spacing: {
        '72': '18rem',
        '84': '21rem',
        '96': '24rem'
      },

      // Custom border radius
      borderRadius: {
        '4xl': '2rem'
      },

      // Custom box shadows
      boxShadow: {
        'custom': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      },

      // Custom animations
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out'
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      }
    },

    // Override default theme (use sparingly)
    // screens: {
    //   'sm': '640px',
    //   'md': '768px',
    //   'lg': '1024px',
    //   'xl': '1280px'
    // }
  },

  // Plugins
  plugins: [
    // daisyUI component library (optional)
    require('daisyui'),

    // Tailwind Forms plugin (optional)
    // require('@tailwindcss/forms'),

    // Tailwind Typography plugin (optional)
    // require('@tailwindcss/typography')
  ],

  // daisyUI configuration (if using)
  daisyUI: {
    themes: [
      "light",
      "dark",
      {
        // Custom theme
        custom: {
          "primary": "#1e3a8a",
          "secondary": "#991b1b",
          "accent": "#37cdbe",
          "neutral": "#3d4451",
          "base-100": "#ffffff",
          "info": "#3abff8",
          "success": "#36d399",
          "warning": "#fbbd23",
          "error": "#f87272"
        }
      }
    ],
    // Dark theme by default
    darkTheme: "dark",
    // Disable base utility classes (if you want only components)
    base: true,
    // Style components with or without modifier classes
    styled: true,
    // Style utility classes
    utils: true,
    // Add responsive and modifier utilities
    rtl: false,
    // Prefix for daisyUI classes (default: "")
    prefix: "",
    // Include logs in console
    logs: true
  },

  // Safelist: Prevent purging of dynamically generated classes
  safelist: [
    // Example: safelist color variants used dynamically
    // 'bg-red-500',
    // 'bg-green-500',
    // 'bg-blue-500',
    // {
    //   pattern: /bg-(red|green|blue)-(100|500|900)/,
    //   variants: ['hover', 'focus']
    // }
  ],

  // Blocklist: Classes to never generate
  blocklist: [
    // 'container'
  ],

  // Important: Add !important to all utilities (use sparingly)
  // important: true,
  // Or scope to a selector:
  // important: '#app',

  // Prefix: Add prefix to all Tailwind classes
  // prefix: 'tw-',

  // Separator: Change the separator between prefix and utility
  // separator: '_',

  // Core plugins: Disable unused core plugins to reduce file size
  corePlugins: {
    // Disable preflight (normalize CSS) if needed
    // preflight: false,
  }
};

/*
 * Installation Instructions:
 *
 * npm install -D tailwindcss postcss autoprefixer
 * npm install -D daisyui  # Optional, for component library
 *
 * Create input CSS file (src/styles.css):
 *
 * @tailwind base;
 * @tailwind components;
 * @tailwind utilities;
 *
 * Build Commands:
 * - Development: tailwindcss -i ./src/styles.css -o ./dist/styles.css --watch
 * - Production: tailwindcss -i ./src/styles.css -o ./dist/styles.css --minify
 *
 * Custom Utilities (in src/styles.css):
 *
 * @layer components {
 *   .btn-primary {
 *     @apply bg-brand-blue hover:bg-blue-700 text-white font-bold py-2 px-4 rounded;
 *   }
 * }
 *
 * @layer utilities {
 *   .content-auto {
 *     content-visibility: auto;
 *   }
 * }
 */
