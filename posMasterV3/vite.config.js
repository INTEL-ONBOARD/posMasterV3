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
  // build: {
  //   outDir: 'dist-react',
  // },
})
