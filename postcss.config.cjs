/** @type {import('postcss-load-config').Config} */
module.exports = {
  plugins: {
    // Tailwind CSS is now processed via CLI (@tailwindcss/cli)
    // This file is kept for compatibility with other tools that may need PostCSS
    autoprefixer: {},
  },
}
