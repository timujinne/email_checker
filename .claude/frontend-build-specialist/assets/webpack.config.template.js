/**
 * Webpack 5 Configuration Template for Vanilla JavaScript
 *
 * This template provides a production-ready webpack configuration
 * for vanilla JavaScript projects without frameworks.
 *
 * Features:
 * - Development and production modes
 * - Babel transpilation for browser compatibility
 * - CSS handling (style-loader for dev, extracted CSS for prod)
 * - Asset management (images, fonts)
 * - Code splitting and optimization
 * - Source maps
 * - Development server with HMR
 */

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  // Mode: development or production
  mode: isDevelopment ? 'development' : 'production',

  // Entry point(s) for your application
  entry: {
    main: './src/index.js'
    // Add more entry points for multi-page applications:
    // admin: './src/admin.js'
  },

  // Output configuration
  output: {
    // Use content hash in production for cache busting
    filename: isDevelopment ? '[name].js' : '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    // Clean output directory before each build
    clean: true,
    // Public path for assets (adjust for subdirectory deployments)
    publicPath: '/'
  },

  // Source maps configuration
  // - eval-source-map: Fast rebuilds, full source debugging (dev)
  // - source-map: Separate map files, slower but accurate (prod)
  devtool: isDevelopment ? 'eval-source-map' : 'source-map',

  // Development server configuration
  devServer: {
    port: 8080,
    hot: true,  // Enable Hot Module Replacement
    historyApiFallback: true,  // Support SPA routing
    // Proxy API requests to backend
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },

  // Module resolution
  resolve: {
    extensions: ['.js', '.json'],
    // Create aliases for cleaner imports
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@utils': path.resolve(__dirname, 'src/utils')
    }
  },

  // Loaders configuration
  module: {
    rules: [
      // JavaScript/ES6+ with Babel
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: '> 0.25%, not dead',  // Browser targets
                useBuiltIns: 'usage',
                corejs: 3
              }]
            ]
          }
        }
      },

      // CSS handling
      {
        test: /\.css$/,
        use: [
          // Development: inject CSS via <style> tags for HMR
          // Production: extract to separate file
          isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader'
        ]
      },

      // Images
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name].[hash][ext]'
        }
      },

      // Fonts
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[hash][ext]'
        }
      }
    ]
  },

  // Optimization configuration
  optimization: {
    // Enable minimization in production
    minimize: !isDevelopment,

    // Minimizers
    minimizer: [
      // JavaScript minification
      new TerserPlugin({
        terserOptions: {
          compress: {
            // Remove console.log in production
            drop_console: !isDevelopment
          }
        }
      }),
      // CSS minification
      new CssMinimizerPlugin()
    ],

    // Code splitting configuration
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor code (node_modules)
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10
        },
        // Common code shared between chunks
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true
        }
      }
    },

    // Extract webpack runtime into separate chunk
    runtimeChunk: 'single'
  },

  // Plugins
  plugins: [
    // Generate HTML file with injected assets
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      // Minify HTML in production
      minify: !isDevelopment && {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true
      }
    }),

    // Extract CSS to separate file in production
    ...(!isDevelopment ? [
      new MiniCssExtractPlugin({
        filename: '[name].[contenthash].css'
      })
    ] : [])
  ],

  // Cache configuration for faster rebuilds
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename]
    }
  },

  // Performance hints
  performance: {
    maxAssetSize: 512000,  // 500 KB
    maxEntrypointSize: 512000,  // 500 KB
    hints: isDevelopment ? false : 'warning'
  }
};

/*
 * Installation Instructions:
 *
 * npm install -D webpack webpack-cli webpack-dev-server
 * npm install -D babel-loader @babel/core @babel/preset-env core-js@3
 * npm install -D css-loader style-loader postcss-loader
 * npm install -D mini-css-extract-plugin css-minimizer-webpack-plugin
 * npm install -D terser-webpack-plugin
 * npm install -D html-webpack-plugin
 *
 * Usage:
 * - Development: npm run dev (or: webpack serve --mode development)
 * - Production: npm run build (or: webpack --mode production)
 */
