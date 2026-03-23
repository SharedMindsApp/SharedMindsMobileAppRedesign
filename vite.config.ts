import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Read version from package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
const appVersion = packageJson.version || '1.0.0';

// Plugin to generate version.json during build
function generateVersionPlugin() {
  return {
    name: 'generate-version',
    generateBundle() {
      // Generate version.json content
      const versionData = {
        version: appVersion,
        timestamp: new Date().toISOString(),
        buildTime: Date.now(),
      };
      
      // Write to dist folder
      const distPath = join(process.cwd(), 'dist', 'version.json');
      writeFileSync(distPath, JSON.stringify(versionData, null, 2), 'utf-8');
      
      console.log(`[generate-version] Generated version.json with version: ${appVersion}`);
    },
  };
}

export default defineConfig({
  base: '/',

  plugins: [
    react({
      // Ensure React is properly transformed and available
      jsxRuntime: 'automatic',
      // Fast refresh for development
      fastRefresh: true,
    }),
    generateVersionPlugin(),
  ],
  
  define: {
    // Inject app version at build time
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Force deduplication of React to ensure single instance
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    // Ensure proper module resolution
    preserveSymlinks: false,
  },

  optimizeDeps: {
    // lucide-react must be pre-bundled — individual ESM icon files like
    // "fingerprint.js" get blocked by ad-blockers, breaking the entire app.
    include: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'lucide-react'],
    // Force pre-bundling of React dependencies
    esbuildOptions: {
      // Ensure React is treated as a single module
      target: 'es2018',
    },
  },

  server: {
    host: true,
    port: 5173,
    strictPort: true,
    hmr: {
      timeout: 30000,
      overlay: true,
    },
  },

  build: {
    target: 'es2018',
    sourcemap: false,
    minify: 'esbuild',
    cssCodeSplit: true,
    assetsInlineLimit: 0,
    // Better handling of circular dependencies and mixed modules
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
      // Resolve circular dependencies properly
      defaultIsModuleExports: 'auto',
    },
    // Chunk size warning limit (can be adjusted)
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        manualChunks(id, { getModuleInfo }) {
          // Don't split React - keep it in the main entry for guaranteed availability
          // This prevents "React is undefined" errors from chunk loading order
          if (id.includes('node_modules')) {
            // Keep recharts separate - it will import React as a dependency
            if (id.includes('recharts')) {
              return 'recharts-vendor';
            }
            // Don't manually chunk Supabase - let it bundle naturally to avoid circular dependencies
            // The supabase-vendor chunk was causing "Cannot access 'ce' before initialization" errors
            // By putting it in vendor, it will be bundled with proper dependency resolution
            if (id.includes('@dnd-kit')) return 'dnd-vendor';
            // Put everything else including React and Supabase in vendor chunk
            // This ensures proper initialization order and prevents circular dependency issues
            return 'vendor';
          }
        },
        // Ensure proper handling of circular dependencies
        interop: 'auto',
        // Use ES modules for better tree-shaking and dependency resolution
        format: 'es',
      },
      // Externalize nothing - bundle everything to ensure single React instance
      external: [],
    },
  },
});
