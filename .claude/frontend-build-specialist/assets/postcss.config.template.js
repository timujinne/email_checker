/**
 * PostCSS Configuration Template
 *
 * PostCSS processes CSS with JavaScript plugins.
 * This configuration integrates Tailwind CSS with autoprefixer and cssnano.
 *
 * Documentation: https://postcss.org/
 */

export default {
  plugins: {
    // Tailwind CSS plugin
    // Transforms @tailwind directives into actual CSS
    tailwindcss: {},

    // Autoprefixer plugin
    // Automatically adds vendor prefixes based on browserslist
    autoprefixer: {},

    // cssnano plugin (production only)
    // Minifies CSS by removing whitespace, merging rules, etc.
    ...(process.env.NODE_ENV === 'production' && {
      cssnano: {
        preset: ['default', {
          // Preserve all comments (remove this to strip comments)
          discardComments: {
            removeAll: true
          },
          // Normalize whitespace
          normalizeWhitespace: true,
          // Merge adjacent rules
          mergeRules: true,
          // Minify selectors
          minifySelectors: true,
          // Optimize font weight values
          minifyFontValues: true
        }]
      }
    })
  }
};

/*
 * Alternative Configuration (CommonJS syntax):
 *
 * module.exports = {
 *   plugins: {
 *     tailwindcss: {},
 *     autoprefixer: {},
 *     ...(process.env.NODE_ENV === 'production' && { cssnano: {} })
 *   }
 * };
 *
 *
 * Installation Instructions:
 *
 * npm install -D postcss postcss-cli
 * npm install -D tailwindcss
 * npm install -D autoprefixer
 * npm install -D cssnano  # Optional, for minification
 *
 *
 * Browser Targets:
 *
 * Configure target browsers in package.json:
 *
 * {
 *   "browserslist": [
 *     "> 0.5%",
 *     "last 2 versions",
 *     "not dead"
 *   ]
 * }
 *
 * Or create .browserslistrc file:
 *
 * > 0.5%
 * last 2 versions
 * not dead
 *
 *
 * Additional Plugins (optional):
 *
 * // postcss-preset-env: Use future CSS features today
 * npm install -D postcss-preset-env
 *
 * {
 *   plugins: {
 *     'postcss-preset-env': {
 *       stage: 3,
 *       features: {
 *         'nesting-rules': true
 *       }
 *     }
 *   }
 * }
 *
 * // postcss-import: Inline @import rules
 * npm install -D postcss-import
 *
 * {
 *   plugins: {
 *     'postcss-import': {},
 *     tailwindcss: {},
 *     autoprefixer: {}
 *   }
 * }
 *
 *
 * Usage:
 *
 * This file is automatically used by:
 * - Tailwind CLI (if using postcss-loader)
 * - Webpack (if using postcss-loader)
 * - Vite (built-in PostCSS support)
 * - Any tool that supports PostCSS
 *
 * Manual processing:
 * npx postcss src/styles.css -o dist/styles.css
 */
