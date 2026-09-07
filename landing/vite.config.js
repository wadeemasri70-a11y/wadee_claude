import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Split the heavy 3D libraries into their own cacheable chunks so they never
// bloat the main bundle that gates first paint.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
});
