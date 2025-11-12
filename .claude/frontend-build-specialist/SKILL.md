---
name: frontend-build-specialist
description: Expert in modern frontend build toolchains including Webpack 5, npm scripts, Tailwind CSS CLI, PostCSS pipelines, and asset optimization. Specializes in setting up efficient development and production build workflows for vanilla JavaScript projects without frameworks. Invoke when configuring build systems, migrating from CDN to compiled assets, optimizing bundle sizes, or debugging build performance issues.
---

# Frontend Build Specialist

## Overview

This skill provides comprehensive expertise in modern frontend build tooling for vanilla JavaScript projects. It covers the complete lifecycle from development setup to production optimization, with deep knowledge of Webpack 5, Tailwind CSS CLI, PostCSS, and npm workflow orchestration.

## Core Competencies

**Build Pipeline Architecture**
- Development workflows with hot module replacement and source maps
- Production optimization strategies including minification, tree-shaking, and code splitting
- Multi-stage build pipelines for CSS and JavaScript assets
- Environment-specific configurations for local/staging/production

**Webpack 5 Mastery**
- Entry point configuration for single-page and multi-page applications
- Loader chains for CSS, fonts, images, and modern JavaScript
- Plugin ecosystem: HtmlWebpackPlugin, MiniCssExtractPlugin, TerserPlugin
- Performance optimization: lazy loading, dynamic imports, chunking strategies
- Development server configuration with proxy and hot reload

**Tailwind CSS Integration**
- CLI-based compilation separate from JavaScript bundling
- JIT (Just-In-Time) mode configuration for rapid development
- Production optimization with PurgeCSS integration
- Custom theme configuration and design token systems
- Plugin integration (daisyUI, forms, typography)

**PostCSS Pipeline**
- Plugin chain configuration (Tailwind, autoprefixer, cssnano)
- CSS preprocessing strategies
- Browser compatibility targeting
- Source map generation for debugging

**npm Scripts Orchestration**
- Parallel and sequential execution patterns
- Cross-platform compatibility (Windows/Mac/Linux)
- Pre and post hooks for automation
- Environment variable management
- Watch mode implementation

**Asset Optimization**
- Bundle size analysis and reduction techniques
- Image optimization and lazy loading
- Font subsetting and optimization
- Cache busting with content hashes
- Compression strategies (gzip, brotli)

## When to Invoke This Skill

Invoke this skill when you encounter any of these scenarios:

**New Project Setup**
- Setting up a frontend build system from scratch
- Migrating from CDN-based Tailwind to compiled CSS
- Establishing development and production workflows
- Creating npm scripts for team consistency

**Migration Projects**
- Converting legacy HTML/CSS/JS to modern build pipeline
- Removing framework dependencies while maintaining build quality
- Transitioning from other bundlers (Parcel, Rollup, etc.) to Webpack

**Optimization Needs**
- Reducing bundle sizes that exceed performance budgets
- Implementing code splitting for large applications
- Debugging slow build times
- Optimizing CSS output size (especially Tailwind)

**Build System Issues**
- Webpack configuration errors or performance problems
- CSS not loading or compiling incorrectly
- Source maps not working in production
- Development hot reload failures
- Cross-platform build inconsistencies

**Team Workflows**
- Standardizing build processes across team members
- Setting up CI/CD integration
- Creating reproducible builds
- Documenting build system for onboarding

## Build Pipeline Architecture

A modern frontend build system for vanilla JavaScript projects typically follows a dual-track architecture: **JavaScript bundling** (Webpack) and **CSS compilation** (Tailwind CLI) running in parallel or sequentially.

### Development Workflow

In development mode, the focus is on fast feedback loops and developer experience:

**Watch Mode**: File watchers detect changes and trigger incremental recompilation. Webpack dev server provides hot module replacement (HMR) for instant updates without full page reloads. Tailwind CLI watches for template changes and recompiles CSS using JIT mode for sub-second builds.

**Source Maps**: Detailed source maps (eval-source-map or source-map) enable debugging of transpiled/bundled code in browser DevTools. CSS source maps link compiled output back to source files.

**Development Server**: Webpack dev server serves assets from memory with configurable proxy rules for backend API integration. Supports HTTPS for testing service workers and secure contexts.

**Performance**: Development builds prioritize speed over size. No minification, aggressive caching, and parallel processing reduce wait times.

### Production Workflow

Production builds optimize for end-user performance:

**Minification**: JavaScript minified with Terser (variable renaming, dead code elimination, compression). CSS minified with cssnano (whitespace removal, property merging, selector optimization).

**Tree-Shaking**: Webpack analyzes ES module imports to eliminate unused code. Properly configured side effects in package.json ensure safe removal.

**Code Splitting**: Split code into chunks by route, vendor dependencies, or dynamic imports. Enables parallel downloads and better caching strategies.

**Asset Optimization**: Images compressed, fonts subsetted, SVGs minified. Content hashing in filenames enables long-term caching.

**PurgeCSS Integration**: Tailwind CSS scanned against HTML/JS templates to remove unused utility classes. Can reduce CSS from 3MB to <10KB.

### Directory Structure

Typical project structure separates source from build output:

```
project/
├── src/                    # Source files
│   ├── index.js           # JavaScript entry point
│   ├── styles.css         # CSS entry point
│   └── components/        # Modular code
├── dist/                   # Build output (gitignored)
│   ├── index.html
│   ├── bundle.[hash].js
│   └── styles.[hash].css
├── webpack.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

## Webpack 5 Best Practices

### Entry and Output Configuration

**Single-Page Applications**: Define one entry point that imports all dependencies. Output generates bundled JavaScript with content hash for cache busting.

```javascript
entry: './src/index.js',
output: {
  filename: '[name].[contenthash].js',
  path: path.resolve(__dirname, 'dist'),
  clean: true  // Clean dist/ before each build
}
```

**Multi-Page Applications**: Multiple entry points map to separate output files. Use HtmlWebpackPlugin instances for each HTML page.

### Loader Configuration

**JavaScript/TypeScript**: Babel loader transpiles modern syntax for browser compatibility. Configure targets in browserslist.

**CSS**: Style-loader (dev) injects CSS into DOM via <style> tags. MiniCssExtractPlugin (prod) extracts CSS to separate files for parallel loading.

**Assets**: Asset modules (type: 'asset/resource') handle images, fonts, and other files. Inline small assets as data URLs with size threshold.

### Plugin Ecosystem

**HtmlWebpackPlugin**: Generates HTML with automatic script/link tag injection. Supports templating for dynamic configuration.

**MiniCssExtractPlugin**: Extracts CSS into separate files for production. Enables CSS caching independent of JavaScript changes.

**TerserWebpackPlugin**: Minifies JavaScript with parallel processing. Configure to preserve legal comments and optimize for size.

**DefinePlugin**: Injects environment variables (NODE_ENV, API_URLS) into code at build time. Enables dead code elimination of development-only blocks.

### Optimization Strategies

**Chunking**: Use splitChunks to separate vendor code, shared modules, and runtime. Improves caching and parallel downloads.

```javascript
optimization: {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        priority: 10
      }
    }
  },
  runtimeChunk: 'single'
}
```

**Dynamic Imports**: Lazy load routes or heavy modules using import() syntax. Webpack automatically code-splits at these boundaries.

**Tree-Shaking**: Ensure package.json includes `"sideEffects": false` or lists files with side effects. Use ES modules (import/export) not CommonJS (require/module.exports).

### Development Server

**Configuration**: Webpack dev server provides fast development iteration with hot reloading, API proxying, and HTTPS support.

```javascript
devServer: {
  port: 8080,
  hot: true,
  historyApiFallback: true,  // SPA routing
  proxy: {
    '/api': 'http://localhost:3000'  // Backend proxy
  }
}
```

## Tailwind CSS Integration

### CLI vs PostCSS Plugin

**Tailwind CLI** (recommended for simplicity): Standalone binary compiles CSS without needing PostCSS configuration in Webpack. Faster for CSS-only projects.

**PostCSS Plugin** (better for complex pipelines): Integrates Tailwind into Webpack's CSS processing. Enables sharing PostCSS configuration between tools.

For vanilla JavaScript projects, **Tailwind CLI is preferred** for its simplicity and performance.

### Configuration File Structure

**tailwind.config.js** defines content paths, theme customization, and plugins:

```javascript
export default {
  content: [
    './src/**/*.{html,js}',
    './dist/**/*.html'
  ],
  theme: {
    extend: {
      colors: {
        'brand-blue': '#1e3a8a',
        'brand-red': '#991b1b'
      }
    }
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['light', 'dark']
  }
}
```

**Content Paths**: Critical for JIT and PurgeCSS. List all files containing Tailwind classes. Glob patterns supported.

**Theme Extension**: Extend default theme without overriding. Add custom colors, spacing, fonts while retaining Tailwind defaults.

**Plugins**: daisyUI adds component classes, forms plugin styles inputs, typography plugin styles prose content.

### JIT Mode

Just-In-Time mode (default in Tailwind 3+) generates utility classes on-demand as you use them. Benefits:

- **Fast builds**: Only generates classes actually used in templates
- **Smaller dev builds**: No 3MB+ CSS file in development
- **Arbitrary values**: Use `w-[137px]` or `text-[#1da1f2]` for one-off values
- **Variant stacking**: Combine unlimited variants like `dark:hover:focus:bg-blue-500`

### Production Optimization

**PurgeCSS Integration**: Automatically removes unused classes in production. Safelist patterns if dynamic class generation occurs:

```javascript
safelist: [
  'bg-red-500',
  'bg-green-500',
  {
    pattern: /bg-(red|green|blue)-(100|500|900)/
  }
]
```

**Minification**: cssnano in PostCSS pipeline minifies output. Can reduce CSS to <10KB for typical projects.

### npm Scripts for Tailwind

Separate scripts for development (watch) and production (build):

```json
"scripts": {
  "css:dev": "tailwindcss -i ./src/styles.css -o ./dist/styles.css --watch",
  "css:build": "tailwindcss -i ./src/styles.css -o ./dist/styles.css --minify",
  "dev": "npm-run-all --parallel css:dev webpack:dev",
  "build": "npm-run-all css:build webpack:build"
}
```

## npm Scripts Patterns

### Script Composition

**Sequential Execution**: Run scripts in order using `&&`:
```json
"build": "npm run clean && npm run css:build && npm run webpack:build"
```

**Parallel Execution**: Run scripts simultaneously using `&` (Unix) or `npm-run-all`:
```json
"dev": "npm-run-all --parallel css:watch webpack:watch server"
```

**Pre/Post Hooks**: Automatically run scripts before/after main script:
```json
"prebuild": "npm run clean",
"build": "webpack --mode production",
"postbuild": "npm run size-report"
```

### Cross-Platform Compatibility

**Environment Variables**: Use `cross-env` for setting NODE_ENV across platforms:
```json
"build:prod": "cross-env NODE_ENV=production webpack"
```

**File Operations**: Use cross-platform tools instead of shell commands:
- `rimraf` instead of `rm -rf`
- `mkdirp` instead of `mkdir -p`
- `copyfiles` instead of `cp`

**Path Handling**: Use path.resolve() in Node scripts, not string concatenation.

### Common Script Patterns

**Development**:
```json
"dev": "npm-run-all --parallel css:watch webpack:serve",
"css:watch": "tailwindcss -i src/styles.css -o dist/styles.css --watch",
"webpack:serve": "webpack serve --mode development"
```

**Production**:
```json
"build": "npm-run-all clean build:css build:js",
"clean": "rimraf dist",
"build:css": "tailwindcss -i src/styles.css -o dist/styles.css --minify",
"build:js": "webpack --mode production"
```

**Analysis**:
```json
"analyze": "webpack-bundle-analyzer dist/stats.json",
"size": "size-limit"
```

### Script Organization

Group related scripts with prefixes:
- `dev:*` - Development mode variants
- `build:*` - Build steps
- `test:*` - Testing commands
- `deploy:*` - Deployment tasks

## Common Issues and Solutions

### CSS Not Loading

**Symptom**: Styles not applied, blank page, or missing Tailwind classes.

**Causes and Solutions**:
1. **Content paths incorrect**: Verify tailwind.config.js content glob matches your HTML/JS files
2. **CSS not imported**: Ensure entry CSS file imports Tailwind directives (`@tailwind base/components/utilities`)
3. **Build order wrong**: CSS must build before HTML references it
4. **Caching issues**: Hard refresh (Ctrl+Shift+R) or clear dist/ and rebuild

### Webpack Build Failures

**Symptom**: `Module not found` or `Can't resolve` errors.

**Causes and Solutions**:
1. **Missing dependencies**: Run `npm install` for package.json dependencies
2. **Wrong import paths**: Use relative paths (`./`) or configure resolve.alias
3. **Loader missing**: Install and configure loaders for file types (css-loader, style-loader)
4. **Version conflicts**: Check for peer dependency warnings, update packages

### Slow Build Performance

**Symptom**: Webpack builds take >30 seconds, development lag.

**Optimizations**:
1. **Enable caching**: Set `cache: { type: 'filesystem' }` in webpack config
2. **Reduce loader scope**: Exclude node_modules from babel-loader with `exclude: /node_modules/`
3. **Parallel processing**: Use `thread-loader` for expensive loaders
4. **Tailwind JIT**: Ensure JIT mode enabled (default Tailwind 3+)
5. **Incremental builds**: Use watch mode instead of repeated full builds

### Source Maps Issues

**Symptom**: Debugger shows webpack:// instead of source files, breakpoints don't work.

**Solutions**:
1. **Development**: Use `devtool: 'eval-source-map'` for full source debugging
2. **Production**: Use `devtool: 'source-map'` for external maps (gitignored)
3. **Hidden maps**: Use `hidden-source-map` to generate maps without references in code
4. **Loader maps**: Ensure loaders generate source maps (sourceMap: true option)

### HMR Not Working

**Symptom**: Hot module replacement fails, full page reload required for changes.

**Solutions**:
1. **Enable HMR**: Set `devServer.hot: true` in webpack config
2. **Module acceptance**: Add `if (module.hot) module.hot.accept()` to entry point
3. **CSS HMR**: Use style-loader in development (MiniCssExtractPlugin disables HMR)
4. **Proxy issues**: Check devServer proxy configuration doesn't block WebSocket connections

### PurgeCSS Removing Used Classes

**Symptom**: Production build missing styles that work in development.

**Causes and Solutions**:
1. **Dynamic classes**: Avoid string concatenation like `${'bg-' + color}`
2. **Safelist patterns**: Add patterns to safelist in tailwind.config.js
3. **Content paths**: Ensure all template files included in content array
4. **External libraries**: Safelist classes from third-party components

### Bundle Size Too Large

**Symptom**: JavaScript bundle >500KB, slow page loads.

**Optimizations**:
1. **Analyze bundle**: Run webpack-bundle-analyzer to identify large dependencies
2. **Code splitting**: Implement dynamic imports for routes/features
3. **Tree-shaking**: Verify package.json sideEffects configuration
4. **Remove unused code**: Audit dependencies, remove or replace heavy libraries
5. **Compression**: Enable terser-webpack-plugin minification in production

## Resources

This skill includes several types of resources to support comprehensive build system implementation:

### references/

Reference documentation loaded into context when detailed information is needed:

- **`webpack-vanilla-config.md`**: Complete Webpack 5 configuration patterns for vanilla JavaScript projects (development/production modes, loaders, plugins, optimization)

- **`tailwind-setup-guide.md`**: Tailwind CSS CLI installation, configuration, JIT mode, theme customization, and PostCSS integration

- **`npm-scripts-patterns.md`**: npm script organization, parallel/sequential execution, cross-platform compatibility, and environment variables

- **`build-optimization-checklist.md`**: Production optimization steps, bundle analysis, code splitting strategies, and compression methods

- **`troubleshooting-builds.md`**: Common build errors with solutions, performance profiling, webpack debugging, and CSS compilation issues

### assets/

Template files ready to be adapted and used as starting points:

- **`webpack.config.template.js`**: Annotated webpack configuration with development and production modes, common loaders, and plugins

- **`tailwind.config.template.js`**: Tailwind configuration with custom theme, content paths, and daisyUI plugin example

- **`package.json.template`**: npm scripts structure for development/production workflows with proper organization

- **`postcss.config.template.js`**: PostCSS pipeline configuration with Tailwind, autoprefixer, and cssnano plugins

- **`.gitignore.template`**: Build artifacts and dependencies exclusion patterns for version control

### scripts/

Executable utilities (if needed for automation - this skill primarily provides configuration knowledge rather than executable scripts)

---

## Integration Notes

When this skill is loaded into a Task Agent, it provides comprehensive build system expertise without requiring the orchestrator to understand low-level configuration details. The agent can:

- Generate complete webpack and Tailwind configurations
- Debug build issues using troubleshooting references
- Optimize production builds using best practices
- Adapt templates to project-specific requirements

This enables the orchestrator to delegate entire build setup tasks with confidence that modern best practices will be followed.
