import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `vite build --mode preview` produces one self-contained HTML file (hash routing)
// for sharing a clickable demo. Normal builds are a standard SPA.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), ...(mode === 'preview' ? [viteSingleFile()] : [])],
  build: mode === 'preview' ? { outDir: 'dist-preview', assetsInlineLimit: 100000000 } : {},
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
  },
}))
