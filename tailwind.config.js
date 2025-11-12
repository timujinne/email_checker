/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./web/**/*.html",
    "./web/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        // Custom color palette - Dark Blue + Dark Red
        primary: {
          DEFAULT: '#1e40af',  // Blue-900
          dark: '#1e3a8a',     // Blue-800
          light: '#3b82f6',    // Blue-500
        },
        secondary: {
          DEFAULT: '#991b1b',  // Red-900
          dark: '#7f1d1d',     // Red-800
          light: '#f87171',    // Red-400
        },
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        light: {
          "primary": "#1e40af",        // Dark Blue
          "secondary": "#991b1b",      // Dark Red
          "accent": "#10b981",         // Emerald-500
          "neutral": "#334155",        // Slate-700
          "base-100": "#ffffff",       // White
          "base-200": "#f8fafc",       // Slate-50
          "base-300": "#f1f5f9",       // Slate-100
          "info": "#3b82f6",           // Blue-500
          "success": "#065f46",        // Emerald-900
          "warning": "#92400e",        // Amber-900
          "error": "#991b1b",          // Red-900
        },
        dark: {
          "primary": "#3b82f6",        // Blue-500 (brighter for dark mode)
          "secondary": "#f87171",      // Red-400 (brighter for dark mode)
          "accent": "#10b981",         // Emerald-500
          "neutral": "#1e293b",        // Slate-900
          "base-100": "#0f172a",       // Slate-950
          "base-200": "#1e293b",       // Slate-900
          "base-300": "#334155",       // Slate-700
          "info": "#60a5fa",           // Blue-400
          "success": "#10b981",        // Emerald-500
          "warning": "#f59e0b",        // Amber-400
          "error": "#f87171",          // Red-400
        },
      },
    ],
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
    prefix: "",
    logs: true,
    themeRoot: ":root",
  },
}
