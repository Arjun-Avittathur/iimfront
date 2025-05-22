import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Put all node_modules packages into a separate chunk named 'vendor'
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        }
      }
    }
  }
})
