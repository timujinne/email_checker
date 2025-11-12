# Build Optimization Checklist

Comprehensive checklist for optimizing production builds in frontend projects.

## Bundle Size Optimization

### 1. Analyze Bundle

**Install Analyzer**:
```bash
npm install -D webpack-bundle-analyzer
```

**Configure**:
```javascript
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'bundle-report.html',
      openAnalyzer: false
    })
  ]
};
```

**Generate Report**:
```bash
npm run build
# Open dist/bundle-report.html
```

**Look for**:
- Large dependencies (>100KB)
- Duplicate modules
- Unused code
- Moment.js locales (huge!)

### 2. Tree-Shaking

**package.json**:
```json
{
  "sideEffects": false
}
```

Or specify files with side effects:
```json
{
  "sideEffects": [
    "*.css",
    "src/polyfills.js"
  ]
}
```

**Use ES Modules**:
```javascript
// GOOD
import { debounce } from 'lodash-es';

// BAD
const _ = require('lodash');
```

### 3. Code Splitting

**Dynamic Imports**:
```javascript
// Route-based splitting
document.getElementById('adminBtn').addEventListener('click', async () => {
  const { initAdmin } = await import('./admin.js');
  initAdmin();
});
```

**Webpack Configuration**:
```javascript
optimization: {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        priority: 10
      },
      common: {
        minChunks: 2,
        priority: 5,
        reuseExistingChunk: true
      }
    }
  },
  runtimeChunk: 'single'
}
```

### 4. Replace Heavy Dependencies

**Replace moment.js** (289KB → 7KB):
```bash
npm uninstall moment
npm install date-fns
```

```javascript
// Before (moment)
import moment from 'moment';
moment().format('YYYY-MM-DD');

// After (date-fns)
import { format } from 'date-fns';
format(new Date(), 'yyyy-MM-dd');
```

**Replace lodash** with native or lodash-es:
```javascript
// Before
import _ from 'lodash';  // 70KB+

// After
import debounce from 'lodash-es/debounce';  // 2KB

// Or native
const unique = [...new Set(array)];
```

### 5. Remove Unused Dependencies

**Audit**:
```bash
npm install -D depcheck
npx depcheck
```

**Remove**:
```bash
npm uninstall unused-package
```

## CSS Optimization

### 1. Tailwind CSS

**Enable PurgeCSS** (built-in Tailwind 3+):
```javascript
// tailwind.config.js
export default {
  content: [
    "./src/**/*.{html,js}",
    "./public/**/*.html"
  ]
}
```

**Minify CSS**:
```bash
tailwindcss -i src/styles.css -o dist/styles.css --minify
```

### 2. cssnano (PostCSS)

```bash
npm install -D cssnano
```

```javascript
// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production' && {
      cssnano: {
        preset: ['default', {
          discardComments: { removeAll: true },
          normalizeWhitespace: true
        }]
      }
    })
  }
}
```

### 3. Critical CSS

Inline critical CSS for above-the-fold content:

```bash
npm install -D critical
```

```javascript
const critical = require('critical');

critical.generate({
  inline: true,
  base: 'dist/',
  src: 'index.html',
  target: 'index.html',
  width: 1300,
  height: 900
});
```

## Asset Optimization

### 1. Images

**Webpack Image Optimization**:
```bash
npm install -D image-webpack-loader
```

```javascript
{
  test: /\.(png|jpe?g|gif)$/i,
  use: [
    {
      loader: 'file-loader',
      options: { name: '[name].[hash].[ext]' }
    },
    {
      loader: 'image-webpack-loader',
      options: {
        mozjpeg: { progressive: true, quality: 75 },
        optipng: { enabled: false },
        pngquant: { quality: [0.65, 0.90], speed: 4 },
        gifsicle: { interlaced: false }
      }
    }
  ]
}
```

**WebP Format**:
```javascript
{
  test: /\.(png|jpe?g)$/i,
  use: [
    {
      loader: 'responsive-loader',
      options: {
        adapter: require('responsive-loader/sharp'),
        format: 'webp',
        quality: 80
      }
    }
  ]
}
```

### 2. Fonts

**Subset Fonts**:
```bash
npm install -D glyphhanger
npx glyphhanger --subset=fonts/font.ttf --formats=woff2,woff
```

**Preload Fonts**:
```html
<link rel="preload" href="/fonts/font.woff2" as="font" type="font/woff2" crossorigin>
```

### 3. SVG

**SVGO**:
```bash
npm install -D svgo
```

```javascript
{
  test: /\.svg$/,
  use: [
    {
      loader: 'file-loader'
    },
    {
      loader: 'svgo-loader',
      options: {
        plugins: [
          { removeViewBox: false },
          { removeDimensions: true }
        ]
      }
    }
  ]
}
```

## Minification

### JavaScript (Terser)

```javascript
const TerserPlugin = require('terser-webpack-plugin');

optimization: {
  minimize: true,
  minimizer: [
    new TerserPlugin({
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info']
        },
        output: {
          comments: false
        }
      },
      extractComments: false
    })
  ]
}
```

### HTML

```javascript
const HtmlWebpackPlugin = require('html-webpack-plugin');

new HtmlWebpackPlugin({
  minify: {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    useShortDoctype: true,
    minifyCSS: true,
    minifyJS: true
  }
})
```

## Compression

### gzip

**Via Webpack**:
```bash
npm install -D compression-webpack-plugin
```

```javascript
const CompressionPlugin = require('compression-webpack-plugin');

plugins: [
  new CompressionPlugin({
    filename: '[path][base].gz',
    algorithm: 'gzip',
    test: /\.(js|css|html|svg)$/,
    threshold: 8192,
    minRatio: 0.8
  })
]
```

### Brotli

```bash
npm install -D compression-webpack-plugin
```

```javascript
new CompressionPlugin({
  filename: '[path][base].br',
  algorithm: 'brotliCompress',
  test: /\.(js|css|html|svg)$/,
  compressionOptions: { level: 11 },
  threshold: 8192,
  minRatio: 0.8
})
```

## Caching Strategy

### Content Hashing

```javascript
output: {
  filename: '[name].[contenthash].js',
  chunkFilename: '[name].[contenthash].chunk.js',
  assetModuleFilename: 'assets/[name].[hash][ext]'
}

plugins: [
  new MiniCssExtractPlugin({
    filename: '[name].[contenthash].css'
  })
]
```

### Runtime Chunk

```javascript
optimization: {
  runtimeChunk: 'single',
  splitChunks: {
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all'
      }
    }
  }
}
```

### Long-Term Caching Headers

```javascript
// Server configuration (Express)
app.use(express.static('dist', {
  maxAge: '1y',
  etag: false
}));

app.use('/index.html', (req, res) => {
  res.sendFile('dist/index.html', {
    maxAge: 0,
    etag: true
  });
});
```

## Performance Budget

### size-limit

```bash
npm install -D @size-limit/preset-app
```

**package.json**:
```json
{
  "size-limit": [
    {
      "path": "dist/bundle.js",
      "limit": "200 KB"
    },
    {
      "path": "dist/styles.css",
      "limit": "50 KB"
    }
  ]
}
```

**CI Integration**:
```bash
npm run size-limit
```

### Webpack Performance Hints

```javascript
performance: {
  maxAssetSize: 512000,
  maxEntrypointSize: 512000,
  hints: 'error'
}
```

## Source Maps

### Production Source Maps

**External maps** (uploaded to error tracking):
```javascript
devtool: 'source-map'
```

**Hidden maps** (not referenced in code):
```javascript
devtool: 'hidden-source-map'
```

**No maps** (smallest bundle):
```javascript
devtool: false
```

## Monitoring

### Bundle Size Tracking

**CI Integration**:
```json
{
  "scripts": {
    "size": "size-limit",
    "size:why": "size-limit --why"
  }
}
```

### Lighthouse CI

```bash
npm install -D @lhci/cli
```

**.lighthouserc.json**:
```json
{
  "ci": {
    "collect": {
      "staticDistDir": "./dist",
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "first-contentful-paint": ["error", {"maxNumericValue": 2000}],
        "interactive": ["error", {"maxNumericValue": 5000}],
        "total-byte-weight": ["error", {"maxNumericValue": 512000}]
      }
    }
  }
}
```

## Checklist Summary

- [ ] Analyze bundle with webpack-bundle-analyzer
- [ ] Enable tree-shaking (sideEffects: false)
- [ ] Implement code splitting (routes, vendors)
- [ ] Replace heavy dependencies (moment → date-fns)
- [ ] Remove unused npm packages
- [ ] Minify CSS with Tailwind --minify
- [ ] Optimize images (compression, WebP)
- [ ] Subset and preload fonts
- [ ] Minify JavaScript with Terser
- [ ] Minify HTML
- [ ] Enable gzip/Brotli compression
- [ ] Use content hashing for cache busting
- [ ] Set performance budgets
- [ ] Configure source maps for production
- [ ] Monitor bundle size in CI

**Target Metrics**:
- Bundle size: <200KB (gzipped)
- CSS size: <50KB (gzipped)
- First Contentful Paint: <2s
- Time to Interactive: <5s
