import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
 
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    // Tell Vite/rolldown to treat all @capacitor/* as external —
    // they exist only in native Android runtime, not on the web
    rollupOptions: {
      external: (id) => id.startsWith('@capacitor/'),
      output: {
        // Stub externals so the app doesn't crash when they're missing
        globals: (id) => {
          if (id.startsWith('@capacitor/')) return '{}';
          return id;
        }
      }
    },
    chunkSizeWarningLimit: 1500
  }
})
 
