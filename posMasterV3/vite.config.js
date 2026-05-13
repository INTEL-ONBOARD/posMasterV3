import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { version } = require('./package.json')

// https://vite.dev/config/
export default defineConfig({
  base: './',   // Add this line to make assets load relatively
  plugins: [react()],
  define: {
    // Override VITE_VERSION_NUMBER with the version from package.json
    'import.meta.env.VITE_VERSION_NUMBER': JSON.stringify(version),
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
            return 'vendor-react';
          }
          if (id.includes('lucide-react') || id.includes('framer-motion')) {
            return 'vendor-ui';
          }
          if (id.includes('@react-pdf') || id.includes('jspdf') || id.includes('html2canvas')) {
            return 'vendor-docs';
          }
          return 'vendor';
        }
      }
    }
  },
})
