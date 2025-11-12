# Webpack 5 Configuration Patterns for Vanilla JavaScript

Complete webpack configuration guidance for vanilla JavaScript projects without frameworks.

## Basic Configuration Structure

### Development Mode

```javascript
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',

  entry: {
    main: './src/index.js'
  },

  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },

  devtool: 'eval-source-map',

  devServer: {
    port: 8080,
    hot: true,
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource'
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource'
      }
    ]
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html'
    })
  ]
};
```

### Production Mode

```javascript
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = {
  mode: 'production',

  entry: {
    main: './src/index.js'
  },

  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
    publicPath: '/'
  },

  devtool: 'source-map',

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader'
        ]
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name].[hash][ext]'
        }
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[hash][ext]'
        }
      }
    ]
  },

  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true
          }
        }
      }),
      new CssMinimizerPlugin()
    ],
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
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      minify: {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true
      }
    }),
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css'
    })
  ],

  performance: {
    maxAssetSize: 512000,
    maxEntrypointSize: 512000,
    hints: 'warning'
  }
};
```

## Common Loaders Explained

### Babel Loader
Transpiles modern JavaScript to browser-compatible syntax.

```javascript
{
  test: /\.js$/,
  exclude: /node_modules/,
  use: {
    loader: 'babel-loader',
    options: {
      presets: [
        ['@babel/preset-env', {
          targets: '> 0.25%, not dead',
          useBuiltIns: 'usage',
          corejs: 3
        }]
      ]
    }
  }
}
```

### CSS Loaders
- **style-loader** (dev): Injects CSS into DOM via <style> tags, enables HMR
- **MiniCssExtractPlugin.loader** (prod): Extracts CSS to separate files
- **css-loader**: Resolves @import and url() like import/require()
- **postcss-loader**: Applies PostCSS transformations (autoprefixer, etc.)

### Asset Modules
Webpack 5 built-in asset handling (replaces file-loader/url-loader):

```javascript
{
  test: /\.(png|svg|jpg)$/,
  type: 'asset/resource',  // Separate file
  // OR
  type: 'asset/inline',    // Base64 inline
  // OR
  type: 'asset',           // Auto-choose based on size
  parser: {
    dataUrlCondition: {
      maxSize: 8 * 1024    // 8KB threshold
    }
  }
}
```

## Common Plugins

### HtmlWebpackPlugin
Generates HTML with automatic script/link injection.

```javascript
new HtmlWebpackPlugin({
  template: './src/index.html',
  filename: 'index.html',
  inject: 'body',
  scriptLoading: 'defer',
  minify: false  // Enable in production
})
```

Multiple pages:
```javascript
new HtmlWebpackPlugin({
  template: './src/pages/index.html',
  filename: 'index.html',
  chunks: ['main']
}),
new HtmlWebpackPlugin({
  template: './src/pages/admin.html',
  filename: 'admin.html',
  chunks: ['admin']
})
```

### MiniCssExtractPlugin
Extracts CSS into separate files (production only).

```javascript
new MiniCssExtractPlugin({
  filename: '[name].[contenthash].css',
  chunkFilename: '[id].[contenthash].css'
})
```

### DefinePlugin
Inject environment variables at build time.

```javascript
const webpack = require('webpack');

new webpack.DefinePlugin({
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  'API_URL': JSON.stringify('https://api.example.com')
})
```

## Optimization Strategies

### Code Splitting

**By Route** (dynamic imports):
```javascript
// In your JavaScript
document.getElementById('adminBtn').addEventListener('click', () => {
  import('./admin.js').then(module => {
    module.initAdmin();
  });
});
```

**By Vendor**:
```javascript
optimization: {
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

### Tree-Shaking

Ensure package.json declares side effects:
```json
{
  "sideEffects": false
}
```

Or list files with side effects:
```json
{
  "sideEffects": [
    "*.css",
    "src/polyfills.js"
  ]
}
```

Use ES modules (not CommonJS):
```javascript
// Good
import { debounce } from 'lodash-es';

// Bad - imports entire lodash
import _ from 'lodash';
```

### Caching

Enable filesystem cache for faster rebuilds:
```javascript
cache: {
  type: 'filesystem',
  buildDependencies: {
    config: [__filename]
  }
}
```

## Multi-Environment Configuration

Use a factory function to share config:

```javascript
// webpack.config.js
const { merge } = require('webpack-merge');
const commonConfig = require('./webpack.common.js');
const devConfig = require('./webpack.dev.js');
const prodConfig = require('./webpack.prod.js');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';

  if (isDevelopment) {
    return merge(commonConfig, devConfig);
  }

  return merge(commonConfig, prodConfig);
};
```

## Performance Tips

1. **Exclude node_modules from loaders**:
   ```javascript
   exclude: /node_modules/
   ```

2. **Use cache**:
   ```javascript
   cache: { type: 'filesystem' }
   ```

3. **Parallelize builds**:
   ```javascript
   // Install: npm i -D thread-loader
   use: ['thread-loader', 'babel-loader']
   ```

4. **Minimize loader application**:
   ```javascript
   include: path.resolve(__dirname, 'src')
   ```

5. **Analyze bundle size**:
   ```bash
   npm i -D webpack-bundle-analyzer
   ```
   ```javascript
   const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

   plugins: [
     new BundleAnalyzerPlugin()
   ]
   ```
