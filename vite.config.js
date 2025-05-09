import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist', // Output directly in dist
    emptyOutDir: true,
    rollupOptions: {
      input: {
        code: '/src/code.ts', // Main entry point
        ui: './src/ui.html'
      },
      output: {
        entryFileNames: '[name].js', // code.js
        assetFileNames: '[name][extname]' // ui.html
      }
    }
  }
});
