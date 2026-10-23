import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { strictPort: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/')) return 'three'
          if (id.includes('node_modules/@react-three/')) return 'react-three'
          if (id.includes('node_modules/chess.js/')) return 'chess-engine'
          if (id.includes('node_modules/react/')) return 'react-vendor'
        },
      },
    },
  },
})
