import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          // Core functionality
          'core': [
            './src/core/FingeringEngine.ts',
            './src/core/NoteParser.ts'
          ],
          // UI components
          'ui': [
            './src/ui/UIController.ts',
            './src/ui/StateManager.ts',
            './src/ui/InputManager.ts',
            './src/ui/RealTimeApp.ts'
          ],
          // Renderer and performance
          'renderer': [
            './src/renderer/ChartRenderer.ts',
            './src/renderer/PerformanceOptimizedRenderer.ts'
          ],
          // Utilities and performance monitoring
          'utils': [
            './src/utils/debounce.ts',
            './src/utils/MemoryMonitor.ts',
            './src/ui/LoadingManager.ts'
          ],
          // Example data and accessibility
          'features': [
            './src/data/exampleSongs.ts',
            './src/ui/AccessibilityManager.ts',
            './src/ui/ErrorHandlingManager.ts',
            './src/ui/NotificationSystem.ts',
            './src/ui/ErrorBoundary.ts'
          ]
        },
        // Optimize asset naming for better caching
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff2?|ttf|eot/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js'
      }
    },
    // Optimize bundle size
    chunkSizeWarningLimit: 500, // 500KB warning limit
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info'],
        passes: 2 // Multiple passes for better compression
      },
      mangle: {
        safari10: true,
        properties: {
          regex: /^_/ // Mangle private properties starting with _
        }
      },
      format: {
        comments: false // Remove comments
      }
    },
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize CSS
    cssMinify: true,
    // Report compressed file sizes
    reportCompressedSize: true,
    // Enable brotli compression analysis
    write: true
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  // Performance optimizations
  optimizeDeps: {
    include: [
      // Pre-bundle dependencies that are commonly used
    ],
    exclude: [
      // Exclude large dependencies from pre-bundling if not needed immediately
    ]
  },
  // Enable tree shaking and define environment variables
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __BUILD_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },
  // CSS preprocessing
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      // Add any CSS preprocessor options here if needed
    }
  },
  // Preview configuration for production testing
  preview: {
    port: 4173,
    open: true,
    cors: true
  },
  // Plugin configuration
  plugins: [
    // Add any additional plugins here
  ],
  // Experimental features
  experimental: {
    // Enable render built URL for better asset handling
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === 'js') {
        return { js: `/${filename}` };
      } else {
        return { relative: true };
      }
    }
  }
});