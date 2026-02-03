import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // CRITICAL for Electron and Android:
  // Using relative path './' ensures assets are loaded correctly
  // when served from the file system (file://) instead of a web server root.
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})