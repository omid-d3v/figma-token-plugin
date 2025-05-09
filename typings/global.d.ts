import { defineConfig } from 'vite';

export default defineConfig({
  root: './src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        code: 'src/code.ts',
        ui: 'src/ui.html'
      }
    }
  }
});