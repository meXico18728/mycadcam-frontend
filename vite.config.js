import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',  // CRITICAL for Capacitor Android — assets must use relative paths
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) return 'vendor';
            if (id.includes('recharts')) return 'charts';
            if (id.includes('i18next')) return 'i18n';
          }
        }
      }
    }
  }
})
