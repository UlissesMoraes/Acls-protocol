import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    // O visualizador 3D (three.js) é um chunk lazy, carregado só ao abrir um
    // procedimento — o tamanho maior é esperado e não afeta o load inicial.
    chunkSizeWarningLimit: 1000,
  },
})
