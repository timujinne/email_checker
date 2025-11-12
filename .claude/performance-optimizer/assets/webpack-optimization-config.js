/**
 * Optimized Webpack Configuration for Performance
 *
 * Includes code splitting, tree-shaking, minification, and compression.
 * Suitable for production builds with strict performance requirements.
 */

const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  mode: 'production',

  entry: {
    main: './src/index.js',
  },

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash:8].js',
    chunkFilename: '[name].[contenthash:8].chunk.js',
    clean: true, // Clean dist folder before build
  },

  optimization: {
    // Minification
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true, // Remove console.log in production
            drop_debugger: true,
            pure_funcs: ['console.log'], // Remove specific functions
          },
          format: {
            comments: false, // Remove all comments
          },
        },
        extractComments: false,
      }),
    ],

    // Code splitting
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor bundle (node_modules)
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },

        // Common code shared across routes
        common: {
          minChunks: 2,
          name: 'common',
          chunks: 'async',
          priority: 5,
          reuseExistingChunk: true,
          enforce: true,
        },

        // Admin features (split separately)
        admin: {
          test: /[\\/]src[\\/]admin[\\/]/,
          name: 'admin',
          chunks: 'async',
          priority: 7,
        },

        // Charts/visualization (heavy library)
        charts: {
          test: /chart|graph/i,
          name: 'charts',
          chunks: 'async',
          priority: 7,
        },
      },
    },

    // Runtime chunk for better caching
    runtimeChunk: 'single',

    // Module IDs for better caching
    moduleIds: 'deterministic',

    // Tree shaking
    usedExports: true,
    sideEffects: true,
  },

  module: {
    rules: [
      // JavaScript/JSX
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                modules: false, // Keep ES modules for tree-shaking
                useBuiltIns: 'usage',
                corejs: 3,
              }],
            ],
            // Cache for faster rebuilds
            cacheDirectory: true,
            cacheCompression: false,
          },
        },
      },

      // CSS
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
            },
          },
          'postcss-loader',
        ],
      },

      // Images
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // Inline images < 8KB
          },
        },
        generator: {
          filename: 'images/[name].[hash:8][ext]',
        },
      },

      // Fonts
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[hash:8][ext]',
        },
      },
    ],
  },

  plugins: [
    // Gzip compression
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240, // Only compress files > 10KB
      minRatio: 0.8,
    }),

    // Brotli compression (better than gzip)
    new CompressionPlugin({
      algorithm: 'brotliCompress',
      filename: '[path][base].br',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240,
      minRatio: 0.8,
    }),

    // Bundle analyzer (only in development or when ANALYZE=true)
    ...(process.env.ANALYZE ? [
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: false,
        reportFilename: 'bundle-report.html',
      }),
    ] : []),
  ],

  performance: {
    hints: 'warning',
    maxEntrypointSize: 200 * 1024, // 200KB
    maxAssetSize: 100 * 1024, // 100KB
  },

  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
};

/**
 * Email Checker Specific Configuration
 */

const emailCheckerConfig = {
  ...module.exports,

  entry: {
    main: './src/index.js',
  },

  optimization: {
    ...module.exports.optimization,
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor bundle
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },

        // Admin features
        admin: {
          test: /[\\/]src[\\/]admin[\\/]/,
          name: 'admin',
          chunks: 'async',
          priority: 8,
        },

        // Smart filter
        smartFilter: {
          test: /[\\/]src[\\/]smart-filter[\\/]/,
          name: 'smart-filter',
          chunks: 'async',
          priority: 8,
        },

        // Reports and charts
        reports: {
          test: /[\\/]src[\\/]reports[\\/]/,
          name: 'reports',
          chunks: 'async',
          priority: 7,
        },

        // Metadata viewer
        metadata: {
          test: /[\\/]src[\\/]metadata[\\/]/,
          name: 'metadata',
          chunks: 'async',
          priority: 7,
        },
      },
    },
  },

  performance: {
    hints: 'warning',
    maxEntrypointSize: 130 * 1024, // 130KB for email checker
    maxAssetSize: 80 * 1024, // 80KB
  },
};

// Development configuration
const developmentConfig = {
  mode: 'development',
  devtool: 'eval-source-map',

  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 8080,
    hot: true,
    open: true,
  },

  optimization: {
    runtimeChunk: 'single',
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },
      },
    },
  },
};

module.exports = process.env.NODE_ENV === 'production'
  ? emailCheckerConfig
  : developmentConfig;
