# Troubleshooting Build Issues

Common build problems and their solutions for Webpack 5 and Tailwind CSS projects.

## Webpack Errors

### Module Not Found

**Error**:
```
Module not found: Error: Can't resolve './components/Header'
```

**Causes**:
1. Incorrect file path
2. Missing file extension in import
3. File doesn't exist
4. Case sensitivity mismatch

**Solutions**:
```javascript
// Check file path
import Header from './components/Header';  // Correct
import Header from './Components/Header';  // Wrong case on Linux/Mac

// Add file extension if needed
import Header from './components/Header.js';

// Verify file exists
// - Check actual filename in file system
// - Ensure file is not gitignored
```

**Configure resolve extensions**:
```javascript
// webpack.config.js
resolve: {
  extensions: ['.js', '.jsx', '.json']
}
```

### Dependency Missing

**Error**:
```
Module not found: Error: Can't resolve 'webpack-dev-server'
```

**Solution**:
```bash
npm install
# or if package not in package.json:
npm install -D webpack-dev-server
```

**Check peer dependencies**:
```bash
npm ls webpack
# Look for UNMET PEER DEPENDENCY warnings
```

### Loader Not Found

**Error**:
```
Module parse failed: Unexpected token
You may need an appropriate loader to handle this file type
```

**Solution**:
```bash
# Install missing loader
npm install -D css-loader style-loader

# Add to webpack config
module: {
  rules: [
    {
      test: /\.css$/,
      use: ['style-loader', 'css-loader']
    }
  ]
}
```

### Invalid Configuration

**Error**:
```
Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
```

**Solution**:
1. **Validate syntax**:
   ```bash
   npx webpack --validate
   ```

2. **Check webpack version compatibility**:
   ```bash
   npm ls webpack webpack-cli
   ```

3. **Common mistakes**:
   ```javascript
   // BAD: Missing 'type'
   module.exports = {
     entry: './src/index.js',
     output: './dist/bundle.js'  // Wrong
   };

   // GOOD
   module.exports = {
     entry: './src/index.js',
     output: {
       filename: 'bundle.js',
       path: path.resolve(__dirname, 'dist')
     }
   };
   ```

## CSS / Tailwind Issues

### Styles Not Applied

**Symptom**: HTML loads but no styles visible.

**Debug Steps**:

1. **Check CSS is built**:
   ```bash
   ls -la dist/styles.css
   ```

2. **Check HTML references CSS**:
   ```html
   <link rel="stylesheet" href="/styles.css">
   ```

3. **Check browser DevTools**:
   - Network tab: CSS file loaded? (200 status)
   - Elements tab: Styles applied?
   - Console: Any errors?

4. **Verify Tailwind directives**:
   ```css
   /* src/styles.css */
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

5. **Check content paths**:
   ```javascript
   // tailwind.config.js
   content: [
     "./src/**/*.{html,js}",  // Match your file structure
     "./public/**/*.html"
   ]
   ```

### Tailwind Classes Not Generated

**Symptom**: Some utility classes don't work (e.g., `bg-blue-500` works, `bg-blue-550` doesn't).

**Causes**:
1. **Invalid class name**: Tailwind only generates predefined utilities
2. **Content path mismatch**: File not scanned
3. **Dynamic class generation**: Purged in production

**Solutions**:

**Use arbitrary values** (Tailwind 3+):
```html
<div class="bg-[#3b82f6]">Custom color</div>
<div class="w-[137px]">Custom width</div>
```

**Safelist dynamic classes**:
```javascript
// tailwind.config.js
module.exports = {
  safelist: [
    'bg-red-500',
    'bg-green-500',
    {
      pattern: /bg-(red|green|blue)-(100|500|900)/
    }
  ]
}
```

**Verify content paths**:
```javascript
content: [
  "./src/**/*.{html,js}",
  "./dist/**/*.html",  // If you generate HTML at build time
]
```

### CSS File Too Large

**Symptom**: `styles.css` is 3MB+ even in production.

**Causes**:
1. PurgeCSS not running
2. JIT mode disabled (Tailwind 2)
3. Content paths include too many files

**Solutions**:

**Enable minify flag**:
```bash
tailwindcss -i src/styles.css -o dist/styles.css --minify
```

**Check Tailwind version**:
```bash
npm ls tailwindcss
# Should be 3.x for automatic JIT
```

**Verify content configuration**:
```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{html,js}",  // Only scan source files
    "!./src/excluded/**"     // Exclude unnecessary paths
  ]
}
```

## Build Performance Issues

### Slow Initial Build

**Symptom**: `webpack` takes >60 seconds on first build.

**Solutions**:

1. **Enable filesystem cache**:
   ```javascript
   cache: {
     type: 'filesystem',
     buildDependencies: {
       config: [__filename]
     }
   }
   ```

2. **Exclude node_modules from loaders**:
   ```javascript
   {
     test: /\.js$/,
     exclude: /node_modules/,
     use: 'babel-loader'
   }
   ```

3. **Use thread-loader for expensive operations**:
   ```bash
   npm install -D thread-loader
   ```
   ```javascript
   {
     test: /\.js$/,
     use: ['thread-loader', 'babel-loader']
   }
   ```

4. **Reduce loader scope**:
   ```javascript
   {
     test: /\.js$/,
     include: path.resolve(__dirname, 'src'),
     use: 'babel-loader'
   }
   ```

### Slow Rebuilds (Watch Mode)

**Symptom**: Changes take >10 seconds to rebuild.

**Solutions**:

1. **Use eval-source-map in development**:
   ```javascript
   devtool: 'eval-source-map'  // Fast rebuilds
   ```

2. **Enable HMR**:
   ```javascript
   devServer: {
     hot: true
   }
   ```

3. **Reduce watched files**:
   ```javascript
   watchOptions: {
     ignored: /node_modules/,
     aggregateTimeout: 300
   }
   ```

### Out of Memory

**Error**:
```
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
```

**Solutions**:

1. **Increase Node.js memory**:
   ```json
   {
     "scripts": {
       "build": "node --max-old-space-size=4096 node_modules/webpack/bin/webpack.js"
     }
   }
   ```

2. **Enable parallel processing**:
   ```javascript
   optimization: {
     minimize: true,
     minimizer: [
       new TerserPlugin({
         parallel: true
       })
     ]
   }
   ```

3. **Reduce bundle size**: Check for circular dependencies, large assets

## Source Map Issues

### Debugger Shows webpack://

**Symptom**: Breakpoints don't work, source files show `webpack://` URLs.

**Causes**:
1. Wrong source map type
2. Source maps not generated
3. Browser cache

**Solutions**:

**Development**:
```javascript
devtool: 'eval-source-map'  // Full source debugging
```

**Production**:
```javascript
devtool: 'source-map'  // External map files
```

**Verify map files generated**:
```bash
ls -la dist/*.map
```

**Clear browser cache**:
- Hard refresh (Ctrl+Shift+R)
- Disable cache in DevTools Network tab

### Source Maps Expose Code

**Symptom**: Don't want source maps in production for security.

**Solutions**:

**Hidden source maps**:
```javascript
devtool: 'hidden-source-map'
// Generates maps but doesn't reference them in code
```

**Upload maps to error tracking** (Sentry, Rollbar):
```bash
# Generate maps
npm run build

# Upload to Sentry
sentry-cli releases files VERSION upload-sourcemaps ./dist --url-prefix '~/static/js'

# Remove maps from production
rm dist/*.map
```

**Disable completely**:
```javascript
devtool: false
```

## HMR (Hot Module Replacement) Issues

### Full Page Reload on Changes

**Symptom**: HMR not working, page reloads completely.

**Solutions**:

1. **Enable HMR in webpack.config.js**:
   ```javascript
   devServer: {
     hot: true
   }
   ```

2. **Accept HMR in entry point**:
   ```javascript
   // src/index.js
   if (module.hot) {
     module.hot.accept();
   }
   ```

3. **Use style-loader (not MiniCssExtractPlugin) in dev**:
   ```javascript
   const isDevelopment = process.env.NODE_ENV !== 'production';

   module: {
     rules: [
       {
         test: /\.css$/,
         use: [
           isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
           'css-loader'
         ]
       }
     ]
   }
   ```

### HMR Breaks After Error

**Symptom**: HMR stops working after syntax error.

**Solution**: Restart dev server after fixing errors.

## Production Build Issues

### Minification Breaks Code

**Symptom**: App works in development, breaks in production.

**Causes**:
1. Variable mangling conflicts
2. Unsafe transformations
3. Missing source maps for debugging

**Solutions**:

**Disable console.log removal**:
```javascript
new TerserPlugin({
  terserOptions: {
    compress: {
      drop_console: false
    }
  }
})
```

**Exclude files from minification**:
```javascript
optimization: {
  minimize: true,
  minimizer: [
    new TerserPlugin({
      exclude: /\/vendor\//
    })
  ]
}
```

**Test production build locally**:
```bash
npm run build
npx serve dist
```

### Assets Not Loading

**Symptom**: 404 errors for CSS/JS/images in production.

**Causes**:
1. Incorrect `publicPath`
2. Server configuration
3. Base href mismatch

**Solutions**:

**Set publicPath**:
```javascript
output: {
  publicPath: '/'  // Root-relative paths
  // or
  publicPath: '/my-app/'  // Subdirectory
}
```

**Check HTML references**:
```html
<link rel="stylesheet" href="/styles.css">
<!-- Not: -->
<link rel="stylesheet" href="styles.css">
```

**Server configuration** (Express):
```javascript
app.use(express.static('dist'));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
```

## Environment-Specific Issues

### Windows Path Issues

**Symptom**: Build works on Mac/Linux, fails on Windows.

**Solutions**:

**Use path.resolve()**:
```javascript
const path = require('path');

output: {
  path: path.resolve(__dirname, 'dist')  // Not: './dist'
}
```

**Cross-platform scripts**:
```json
{
  "scripts": {
    "clean": "rimraf dist",  // Not: "rm -rf dist"
    "build": "cross-env NODE_ENV=production webpack"
  }
}
```

### Node Version Mismatch

**Error**:
```
Error: The engine "node" is incompatible with this module
```

**Solutions**:

**Check required version**:
```json
{
  "engines": {
    "node": ">=14.0.0"
  }
}
```

**Use nvm**:
```bash
nvm install 14
nvm use 14
```

**Or volta**:
```bash
volta install node@14
```

## Debugging Strategies

### Verbose Output

```bash
npx webpack --mode production --progress --profile --verbose
```

### Webpack Stats

```bash
npx webpack --mode production --json > stats.json
npx webpack-bundle-analyzer stats.json
```

### Check Node/npm Versions

```bash
node --version
npm --version
npx webpack --version
```

### Clear Caches

```bash
# npm cache
npm cache clean --force

# Webpack cache
rm -rf node_modules/.cache

# Full rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Minimal Reproduction

Create minimal config to isolate issue:

```javascript
// webpack.minimal.js
module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: 'bundle.js'
  }
};
```

```bash
npx webpack --config webpack.minimal.js
```

Add configuration incrementally until issue reproduces.
